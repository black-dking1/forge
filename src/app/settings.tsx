/**
 * Settings — who you are, your plan, sign out.
 *
 * The plan card reads the real Pro status from RevenueCat every time
 * the screen opens, so buying (or restoring) Pro shows up here
 * straight away.
 */

import { useCallback, useState } from 'react';
import { BackHandler, ScrollView, Switch, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import Animated from 'react-native-reanimated';
import Constants from 'expo-constants';
import { useFocusEffect, useRouter } from 'expo-router';
import { colors, shared, space, type } from '../theme';
import { useAuth, signOut } from '../lib/auth';
import { countProjects } from '../lib/projects';
import { checkPro, FREE_BUILD_LIMIT, getDevPreview, setDevPreview } from '../lib/pro';
import { links } from '../lib/links';
import { Icon } from '../components/icons';
import { useNavSpace } from '../components/bottom-nav';
import { GhostButton, Press, PrimaryButton, Screen, SectionLabel, Tag } from '../components/ui';

const BLINK = { '0%': { opacity: 1 }, '49%': { opacity: 1 }, '50%': { opacity: 0 }, '100%': { opacity: 0 } };

export default function SettingsScreen() {
  const router = useRouter();
  const { session, displayName } = useAuth();
  const navSpace = useNavSpace();
  const [count, setCount] = useState(0);
  const [pro, setPro] = useState(false);
  const [preview, setPreview] = useState(false);

  useFocusEffect(
    useCallback(() => {
      countProjects().then((result) => setCount(result.count));
      checkPro().then(setPro);
      getDevPreview().then(setPreview);
    }, [])
  );

  // Settings is a tab, not a page stacked on Home — so the phone's
  // back button goes to Home rather than closing the app.
  useFocusEffect(
    useCallback(() => {
      const listener = BackHandler.addEventListener('hardwareBackPress', () => {
        router.replace('/home');
        return true;
      });
      return () => listener.remove();
    }, [router])
  );

  const name = displayName || 'Builder';
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.xl, paddingTop: 22, paddingBottom: navSpace }}>
        <Text style={[type.header, { color: colors.header }]} accessibilityRole="header">
          SETTINGS
        </Text>

        {/* You — tap for account details and Delete account */}
        <Press
          onPress={() => router.push('/account')}
          accessibilityRole="button"
          accessibilityLabel="Account"
          style={[shared.card, { flexDirection: 'row', alignItems: 'center', gap: 14, padding: space.lg, borderRadius: 15, marginTop: space.xxl }]}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: colors.node,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.09)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={[type.cardPercent, { fontSize: 18, color: colors.accent }]}>{name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[type.cardTitle, { fontSize: 16, color: colors.heading }]} numberOfLines={1}>
              {name.toUpperCase()}
            </Text>
            <Text style={[type.bodySm, { color: colors.faint, marginTop: 4 }]} numberOfLines={1}>
              {session?.user?.email ?? ''}
            </Text>
          </View>
          <View style={{ transform: [{ rotate: '180deg' }] }}>
            <Icon name="back" size={13} color={colors.label} />
          </View>
        </Press>

        {/* Plan */}
        <SectionLabel style={{ marginTop: 22 }}>SUBSCRIPTION</SectionLabel>
        <View
          style={{
            marginTop: space.md,
            padding: 18,
            borderRadius: 15,
            borderWidth: 1,
            borderColor: 'rgba(244,60,20,0.3)',
            experimental_backgroundImage: 'linear-gradient(150deg, #1D1512 0%, #120E0E 60%, #0D0C0C 100%)',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={[type.tab, { fontSize: 15, letterSpacing: 1.8, color: colors.heading, flex: 1 }]}>
              {pro ? 'FORGE PRO' : 'FREE PLAN'}
            </Text>
            <Tag label={pro ? 'ACTIVE' : `${count} / ${FREE_BUILD_LIMIT} BUILDS`} />
          </View>
          <Text style={[type.bodySm, { color: colors.dim, marginTop: 10 }]}>
            {pro
              ? 'Unlimited builds, blueprint export and templates are unlocked. Thank you for backing FORGE.'
              : 'Pro unlocks unlimited builds, blueprint export and reusable templates.'}
          </Text>
          {!pro ? (
            <PrimaryButton label="UPGRADE TO PRO" onPress={() => router.push('/paywall')} style={{ marginTop: 14, minHeight: 46 }} />
          ) : null}
        </View>

        {/* Development only: pretend to be Pro so the Pro features can be
            tried in Expo Go. __DEV__ is false in the store build, so this
            whole block disappears there. */}
        {__DEV__ ? (
          <View
            style={[
              shared.card,
              { flexDirection: 'row', alignItems: 'center', padding: space.lg, marginTop: space.md, borderStyle: 'dashed' },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[type.label, { color: colors.dim }]}>DEV · PRO PREVIEW</Text>
              <Text style={[type.bodySm, { color: colors.faint, marginTop: 4 }]}>Only in development. Never in the store app.</Text>
            </View>
            <Switch
              value={preview}
              onValueChange={async (on) => {
                setPreview(on);
                await setDevPreview(on);
                checkPro().then(setPro);
              }}
              trackColor={{ true: colors.accent, false: colors.dotOff }}
              thumbColor={colors.text}
            />
          </View>
        ) : null}

        <View style={{ marginTop: space.xl }}>
          <GhostButton
            label="SIGN OUT"
            icon="signOut"
            onPress={async () => {
              await signOut();
              router.replace('/sign-in');
            }}
          />
        </View>

        {/* About — an iOS-style grouped list */}
        <SectionLabel style={{ marginTop: space.xl }}>ABOUT</SectionLabel>
        <View style={[shared.card, { marginTop: space.md, paddingHorizontal: space.lg }]}>
          {links.privacy ? (
            <ListRow label="Privacy Policy" onPress={() => WebBrowser.openBrowserAsync(links.privacy)} />
          ) : null}
          <ListRow label="Terms of Use" onPress={() => WebBrowser.openBrowserAsync(links.terms)} />
          <ListRow label="Version" value={version} last />
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: space.lg }}>
          <Text style={[type.label, { fontFamily: type.greeting.fontFamily, fontSize: 12, color: colors.faint }]}>
            FORGE {version} · BUILD ANYTHING{' '}
          </Text>
          <Animated.Text
            style={[
              type.label,
              {
                fontSize: 12,
                color: colors.accent,
                animationName: BLINK,
                animationDuration: 1000,
                animationIterationCount: 'infinite',
                animationTimingFunction: 'linear',
              },
            ]}
          >
            _
          </Animated.Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

/** One row of a grouped list: label on the left, value or › on the right. */
function ListRow({ label, value, onPress, last = false }: { label: string; value?: string; onPress?: () => void; last?: boolean }) {
  return (
    <Press
      onPress={onPress}
      disabled={!onPress}
      scaleTo={onPress ? 0.98 : 1}
      accessibilityRole={onPress ? 'link' : 'text'}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 50,
        borderBottomWidth: last ? 0 : 1,
        borderColor: 'rgba(255,255,255,0.06)',
      }}
    >
      <Text style={[type.bodyBold, { color: colors.soft, flex: 1 }]}>{label}</Text>
      {value ? <Text style={[type.body, { color: colors.faint }]}>{value}</Text> : null}
      {onPress ? (
        <View style={{ transform: [{ rotate: '180deg' }] }}>
          <Icon name="back" size={12} color={colors.label} />
        </View>
      ) : null}
    </Press>
  );
}
