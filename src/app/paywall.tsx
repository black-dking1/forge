/**
 * FORGE PRO.
 *
 * Every line on this screen is a feature that exists or will exist
 * by submission. That is not a style preference — the hackathon
 * rules require judges to unlock Pro and test every premium feature,
 * so a bullet describing something unbuilt is a failed submission.
 *
 * Your original mockup listed four: unlimited projects, deeper
 * AI-generated blueprints, export to Markdown/CSV/PDF, and progress
 * history with burndown. Three of those went beyond the plan — AI
 * decomposition was cut, three export formats became one, and
 * burndown is a whole charting feature. What's below is what FORGE
 * actually ships.
 *
 * The purchase itself runs through RevenueCat, loaded lazily for the
 * same reason as in _layout: in Expo Go there is no native code
 * behind it, and a missing module should produce a clear message
 * rather than a crash.
 */

import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, radius, shared, space, type } from '../theme';

type Plan = 'annual' | 'monthly';

const FEATURES = [
  'Unlimited builds',
  'Export a blueprint to share',
  'Save any build as a reusable template',
];

export default function PaywallScreen() {
  const router = useRouter();
  const [plan, setPlan] = useState<Plan>('annual');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [offerings, setOfferings] = useState<any>(null);

  // Ask RevenueCat what's actually for sale. Prices come from the
  // store, not from constants in here — hard-coding them means the
  // paywall lies the moment you change pricing in the dashboard, and
  // shows the wrong currency to everyone outside your own country.
  useEffect(() => {
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Purchases = require('react-native-purchases').default;
        const result = await Purchases.getOfferings();
        setOfferings(result.current);
      } catch {
        // Expo Go, or offerings not configured yet.
        setOfferings(null);
      }
    })();
  }, []);

  function priceFor(p: Plan): string | null {
    const pkg = offerings?.availablePackages?.find((x: any) =>
      p === 'annual'
        ? x.packageType === 'ANNUAL' || x.identifier === 'yearly'
        : x.packageType === 'MONTHLY' || x.identifier === 'monthly'
    );
    return pkg?.product?.priceString ?? null;
  }

  async function purchase() {
    setMessage(null);
    setBusy(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Purchases = require('react-native-purchases').default;

      const pkg = offerings?.availablePackages?.find((x: any) =>
        plan === 'annual'
          ? x.packageType === 'ANNUAL' || x.identifier === 'yearly'
          : x.packageType === 'MONTHLY' || x.identifier === 'monthly'
      );

      if (!pkg) {
        setMessage('That plan is not available right now.');
        return;
      }

      const { customerInfo } = await Purchases.purchasePackage(pkg);

      if (customerInfo.entitlements.active['pro']) {
        router.back();
        return;
      }
      setMessage('The purchase went through but Pro is not active yet. Try Restore.');
    } catch (e: any) {
      if (e?.userCancelled) {
        // Backing out of a purchase is not an error. Say nothing.
        return;
      }
      setMessage(
        'Purchases are unavailable in this build. A real device build is needed to buy Pro.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function restore() {
    setMessage(null);
    setBusy(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Purchases = require('react-native-purchases').default;
      const info = await Purchases.restorePurchases();
      if (info.entitlements.active['pro']) {
        router.back();
        return;
      }
      setMessage('No previous purchase found for this account.');
    } catch {
      setMessage('Restore is unavailable in this build.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={shared.screen} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: space.xl, paddingBottom: space.xxxl }}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ marginBottom: space.xl }}>
          <Text style={[type.screen, { color: colors.textDim }]}>✕</Text>
        </Pressable>

        <Text style={[type.title, { color: colors.text, textAlign: 'center' }]}>
          FORGE PRO
        </Text>
        <Text
          style={[
            type.bodySm,
            { color: colors.textDim, textAlign: 'center', marginTop: space.sm, marginBottom: space.xxl },
          ]}
        >
          Unlimited builds and the full blueprint.
        </Text>

        {FEATURES.map((f) => (
          <View
            key={f}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.md,
              marginBottom: space.md,
            }}
          >
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: colors.accent,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>✓</Text>
            </View>
            <Text style={[type.body, { color: colors.text, flex: 1 }]}>{f}</Text>
          </View>
        ))}

        <View style={{ marginTop: space.xl }}>
          <PlanCard
            title="ANNUAL"
            price={priceFor('annual')}
            note="best value"
            selected={plan === 'annual'}
            onPress={() => setPlan('annual')}
          />
          <PlanCard
            title="MONTHLY"
            price={priceFor('monthly')}
            note="cancel anytime"
            selected={plan === 'monthly'}
            onPress={() => setPlan('monthly')}
          />
        </View>

        {message && (
          <Text style={[type.bodySm, { color: colors.danger, marginTop: space.lg }]}>
            {message}
          </Text>
        )}

        <Pressable
          onPress={purchase}
          disabled={busy}
          style={({ pressed }) => [
            {
              backgroundColor: colors.accent,
              borderRadius: radius.md,
              paddingVertical: space.lg,
              alignItems: 'center',
              marginTop: space.xl,
              opacity: busy ? 0.6 : pressed ? 0.85 : 1,
            },
            shared.glow,
          ]}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={[type.label, { color: '#fff' }]}>START PRO</Text>
          )}
        </Pressable>

        <Pressable onPress={restore} disabled={busy} style={{ marginTop: space.lg, alignItems: 'center' }}>
          <Text style={[type.labelSm, { color: colors.textFaint }]}>RESTORE PURCHASES</Text>
        </Pressable>

        <Text
          style={[
            type.bodySm,
            { color: colors.textFaint, textAlign: 'center', marginTop: space.lg },
          ]}
        >
          Billed through the Galaxy Store. Renews automatically until cancelled.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function PlanCard({
  title,
  price,
  note,
  selected,
  onPress,
}: {
  title: string;
  price: string | null;
  note: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderWidth: 1,
        borderColor: selected ? colors.accent : colors.border,
        backgroundColor: selected ? colors.accentDim : colors.surface,
        borderRadius: radius.md,
        padding: space.lg,
        marginBottom: space.md,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={[type.labelSm, { color: selected ? colors.accent : colors.textDim }]}>
          {title}
        </Text>
        <Text style={[type.labelSm, { color: colors.textFaint }]}>{note}</Text>
      </View>
      <Text style={[type.screen, { color: colors.text, marginTop: space.sm }]}>
        {price ?? '—'}
      </Text>
    </Pressable>
  );
}
