/**
 * FORGE PRO.
 *
 * Ways in:
 *   • From Settings — a plain "here's Pro" screen.
 *   • From a Pro feature (share, templates) — names what you tapped.
 *   • From the build limit — CONTEXTUAL. It shows "3 / 3 BUILDS USED"
 *     and names the build you were trying to make ("Room for
 *     HEXAPOD MK III."). Buy, and FORGE creates that build for you
 *     and drops you on its blueprint. No retyping.
 *
 * Every line on this screen is a feature that exists or will exist
 * by submission — the hackathon requires judges to be able to unlock
 * Pro and test every premium feature.
 *
 * Prices come from the store via RevenueCat, never from constants
 * in here. Hard-coded prices lie the moment pricing changes, and show
 * the wrong currency to everyone outside your own country. In Expo Go
 * there's no store, so prices show as "—" rather than fake numbers.
 */

import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import Animated from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, ios, space, type } from '../theme';
import { curve } from '../lib/motion';
import { haptic } from '../lib/haptics';
import { createProject, createProjectFromTemplate, type TemplateStructure } from '../lib/projects';
import { FREE_BUILD_LIMIT, PRO_ENTITLEMENT } from '../lib/pro';
import { links } from '../lib/links';
import { Icon } from '../components/icons';
import { Orb } from '../components/art';
import { LinkButton, PrimaryButton, Screen, Tag } from '../components/ui';

type Plan = 'annual' | 'monthly';

// What to say at the top, depending on which door they came through.
const HEADLINES: Record<string, string> = {
  export: 'Share the whole blueprint.',
  template: 'Reuse a plan that works.',
};

// "DAY" + 7 → "7-DAY"
function trialWord(unit: string, count: number) {
  const word = { DAY: 'DAY', WEEK: 'WEEK', MONTH: 'MONTH', YEAR: 'YEAR' }[unit] ?? unit;
  return `${count}-${word}`;
}

const FEATURES = ['Unlimited builds', 'Export a blueprint to share', 'Save any build as a reusable template'];

// Loaded lazily — see _layout for why.
function purchases() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('react-native-purchases').default;
}

export default function PaywallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    reason?: string;
    used?: string;
    name?: string;
    goal?: string;
    icon?: string;
    areas?: string;
    structure?: string;
  }>();
  const fromLimit = params.reason === 'limit' && Boolean(params.name);

  const [plan, setPlan] = useState<Plan>('annual');
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [offering, setOffering] = useState<any>(null);
  // product id → may this person still use the free trial?
  const [eligible, setEligible] = useState<Record<string, boolean>>({});

  // Ask RevenueCat what's actually for sale.
  useEffect(() => {
    (async () => {
      try {
        const result = await purchases().getOfferings();
        const current = result.current ?? null;
        setOffering(current);

        // Apple gives each person ONE free trial per subscription.
        // Ask whether they've used it, so we never promise a trial
        // Apple won't give them. (Android handles this in the store.)
        if (current && Platform.OS === 'ios') {
          const ids = current.availablePackages.map((p: any) => p.product.identifier);
          const answers = await purchases().checkTrialOrIntroductoryPriceEligibility(ids);
          const map: Record<string, boolean> = {};
          for (const productId of ids) map[productId] = answers[productId]?.status !== 1; // 1 = not eligible
          setEligible(map);
        }
      } catch {
        setOffering(null); // Expo Go, or offerings not set up yet
      }
    })();
  }, []);

  function packageFor(which: Plan) {
    return offering?.availablePackages?.find((p: any) =>
      which === 'annual'
        ? p.packageType === 'ANNUAL' || p.identifier === '$rc_annual' || p.identifier === 'yearly'
        : p.packageType === 'MONTHLY' || p.identifier === '$rc_monthly' || p.identifier === 'monthly'
    );
  }

  const annual = packageFor('annual')?.product;
  const monthly = packageFor('monthly')?.product;
  const saving =
    annual && monthly && monthly.price > 0 ? Math.round((1 - annual.price / (monthly.price * 12)) * 100) : 0;
  const chosen = plan === 'annual' ? annual : monthly;

  /** "7-DAY FREE TRIAL", or null if this product has no trial for this person. */
  function trialFor(product: any): string | null {
    const intro = product?.introPrice;
    if (!intro || intro.price !== 0) return null;
    if (eligible[product.identifier] === false) return null;
    return `${trialWord(intro.periodUnit, intro.periodNumberOfUnits)} FREE TRIAL`;
  }
  const chosenTrial = trialFor(chosen);
  const headline = fromLimit
    ? `Room for ${(params.name ?? '').toUpperCase()}.`
    : HEADLINES[params.reason ?? ''] ?? 'FORGE PRO';

  /** What happens once Pro is active. */
  async function unlocked() {
    haptic.confirm();
    if (!fromLimit) {
      router.back();
      return;
    }
    // Finish what they started: create the build they were blocked on.
    // (An AI plan or template arrives as JSON; starter areas as a list.)
    let structure: TemplateStructure | null = null;
    try {
      structure = params.structure ? (JSON.parse(params.structure) as TemplateStructure) : null;
    } catch {
      structure = null;
    }
    const areas = (params.areas ?? '').split('|').filter(Boolean);
    const { projectId, error } = structure
      ? await createProjectFromTemplate(params.name ?? '', params.goal ?? '', structure, params.icon)
      : await createProject(params.name ?? '', params.goal ?? '', areas, params.icon);
    if (error || !projectId) {
      setMessage('Pro is active. Go back and press BUILD BLUEPRINT again.');
      return;
    }
    router.dismissTo('/home');
    router.push({ pathname: '/project/[id]', params: { id: projectId, tab: 'blueprint' } });
  }

  async function buy() {
    setMessage(null);
    const pkg = packageFor(plan);
    if (!pkg) {
      setMessage('Purchases need the store build of FORGE. They don’t work inside Expo Go.');
      return;
    }
    setBusy('buy');
    try {
      const { customerInfo } = await purchases().purchasePackage(pkg);
      if (customerInfo.entitlements.active[PRO_ENTITLEMENT]) {
        await unlocked();
        return;
      }
      setMessage('The purchase went through but Pro isn’t active yet. Try RESTORE PURCHASES.');
    } catch (e: any) {
      // Backing out of the store sheet isn't an error. Say nothing.
      if (!e?.userCancelled) {
        haptic.reject();
        setMessage('The purchase didn’t go through. You haven’t been charged.');
      }
    } finally {
      setBusy(null);
    }
  }

  async function restore() {
    setMessage(null);
    setBusy('restore');
    try {
      const info = await purchases().restorePurchases();
      if (info.entitlements.active[PRO_ENTITLEMENT]) {
        await unlocked();
        return;
      }
      setMessage('No earlier purchase found for this account.');
    } catch {
      setMessage('Restore needs the store build of FORGE.');
    } finally {
      setBusy(null);
    }
  }

  return (
    // On iPhone the paywall is a sheet that starts below the status bar.
    <Screen top={!ios}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.xl, paddingTop: 22, paddingBottom: space.xxxl }}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={{ width: 44, height: 44, margin: -11, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="close" size={19} color={colors.dim} />
          </Pressable>
        </View>

        <View style={{ alignItems: 'center', marginTop: 2 }}>
          <Orb size={160} />
        </View>

        {fromLimit ? (
          <View style={{ alignItems: 'center', marginTop: 10 }}>
            <Tag label={`${params.used ?? FREE_BUILD_LIMIT} / ${FREE_BUILD_LIMIT} BUILDS USED`} />
          </View>
        ) : null}

        <Text
          style={[type.heading, { color: colors.heading, textAlign: 'center', marginTop: 14, letterSpacing: 1.6 }]}
          accessibilityRole="header"
        >
          {headline}
        </Text>
        {!fromLimit ? (
          <Text style={[type.body, { color: colors.dim, textAlign: 'center', marginTop: 10 }]}>
            Unlimited builds and the full blueprint.
          </Text>
        ) : null}

        <View style={{ gap: 11, marginTop: 22 }}>
          {FEATURES.map((feature) => (
            <View key={feature} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <View
                style={{
                  width: 19,
                  height: 19,
                  borderRadius: 10,
                  backgroundColor: colors.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 10px rgba(244,60,20,0.35)',
                }}
              >
                <Icon name="check" size={12} color="#FFFFFF" />
              </View>
              <Text style={[type.bodyBold, { color: colors.soft }]}>{feature}</Text>
            </View>
          ))}
        </View>

        <View style={{ gap: 10, marginTop: 22 }}>
          <PlanCard
            title="ANNUAL"
            price={annual?.priceString}
            note={annual?.pricePerMonthString ? `/ year · ${annual.pricePerMonthString} a month` : '/ year'}
            badge={saving > 0 ? `SAVE ${saving}%` : undefined}
            trial={trialFor(annual)}
            selected={plan === 'annual'}
            onPress={() => setPlan('annual')}
          />
          <PlanCard
            title="MONTHLY"
            price={monthly?.priceString}
            note="/ month · cancel anytime"
            trial={trialFor(monthly)}
            selected={plan === 'monthly'}
            onPress={() => setPlan('monthly')}
          />
        </View>

        {message ? (
          <Text style={[type.bodySm, { color: colors.danger, marginTop: space.lg, textAlign: 'center' }]}>{message}</Text>
        ) : null}

        <PrimaryButton
          label={
            chosenTrial
              ? `START ${chosenTrial}`
              : chosen?.priceString
                ? `START PRO — ${chosen.priceString} / ${plan === 'annual' ? 'YR' : 'MO'}`
                : 'START PRO'
          }
          onPress={buy}
          busy={busy === 'buy'}
          disabled={busy === 'restore'}
          style={{ marginTop: 18 }}
        />

        <View style={{ marginTop: 14 }}>
          <LinkButton label={busy === 'restore' ? 'RESTORING…' : 'RESTORE PURCHASES'} onPress={restore} />
        </View>

        {/* Apple requires the price, the length and the renewal terms
            to be spelled out right here, plus links to the terms. */}
        <Text style={[type.foot, { color: colors.faint, textAlign: 'center', marginTop: space.md }]}>
          {chosenTrial && chosen?.priceString
            ? `Free for the trial, then ${chosen.priceString} per ${plan === 'annual' ? 'year' : 'month'}. `
            : ''}
          {Platform.OS === 'ios'
            ? 'Charged to your Apple ID. Renews automatically unless cancelled at least 24 hours before the period ends. Manage it in Settings → Apple ID → Subscriptions.'
            : 'Renews automatically until cancelled in your store account.'}
        </Text>

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space.xl, marginTop: space.md }}>
          <LinkButton label="TERMS OF USE" onPress={() => WebBrowser.openBrowserAsync(links.terms)} />
          {links.privacy ? (
            <LinkButton label="PRIVACY POLICY" onPress={() => WebBrowser.openBrowserAsync(links.privacy)} />
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

function PlanCard({
  title,
  price,
  note,
  badge,
  trial,
  selected,
  onPress,
}: {
  title: string;
  price?: string;
  note: string;
  badge?: string;
  trial?: string | null;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        if (!selected) haptic.select();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${title} ${price ?? ''}`}
    >
      <Animated.View
        style={{
          paddingVertical: 15,
          paddingHorizontal: space.lg,
          borderRadius: 14,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: selected ? colors.accentFocus : colors.lineMid,
          backgroundColor: selected ? colors.accentSoft : colors.surface,
          boxShadow: selected ? '0 0 0 3px rgba(244,60,20,0.12)' : '0 0 0 0 rgba(244,60,20,0)',
          transitionProperty: ['borderColor', 'backgroundColor'],
          transitionDuration: 180,
          transitionTimingFunction: curve.standard,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={[type.tab, { fontSize: 14, letterSpacing: 1.7, color: colors.heading, flex: 1 }]}>{title}</Text>
          {badge ? (
            <View style={{ paddingVertical: 4, paddingHorizontal: 9, borderRadius: 999, backgroundColor: colors.accent }}>
              <Text style={[type.tab, { fontSize: 10, letterSpacing: 1, color: '#FFFFFF' }]}>{badge}</Text>
            </View>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.sm, marginTop: space.sm }}>
          <Text style={[type.price, { color: colors.heading }]}>{price ?? '—'}</Text>
          <Text style={[type.bodySm, { color: colors.faint }]}>{note}</Text>
        </View>
        {trial ? (
          <Text style={[type.labelSm, { color: colors.chipText, marginTop: space.sm }]}>{trial}, then this price</Text>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}
