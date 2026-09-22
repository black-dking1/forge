/**
 * Settings — account, plan, sign out.
 *
 * The plan row currently always reads FREE. Wiring it to the real
 * RevenueCat entitlement happens when the paywall goes in; doing it
 * now would mean a status that can't be changed from anywhere, which
 * is worse than one that's honestly still a stub.
 */

import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { colors, radius, shared, space, type } from '../theme';
import { useAuth, signOut } from '../lib/auth';
import { countProjects } from '../lib/projects';
import { BottomNav } from '../components/bottom-nav';

const FREE_PROJECT_LIMIT = 3;

export default function SettingsScreen() {
  const router = useRouter();
  const { session, displayName } = useAuth();
  const [projectCount, setProjectCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      countProjects().then(({ count }) => setProjectCount(count));
    }, [])
  );

  return (
    <SafeAreaView style={shared.screen} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: space.xl }}>
        <Text style={[type.title, { color: colors.text, marginBottom: space.xl }]}>
          SETTINGS
        </Text>

        <Text style={[type.labelSm, { color: colors.textFaint, marginBottom: space.md }]}>
          ACCOUNT
        </Text>
        <View style={[shared.card, { marginBottom: space.xl }]}>
          <Row label="NAME" value={displayName} />
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: space.md }} />
          <Row label="EMAIL" value={session?.user?.email ?? '—'} />
        </View>

        <Text style={[type.labelSm, { color: colors.textFaint, marginBottom: space.md }]}>
          PLAN
        </Text>
        <View style={[shared.card, { marginBottom: space.xl }]}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text style={[type.screen, { color: colors.text }]}>FREE</Text>
            <View
              style={{
                paddingHorizontal: space.md,
                paddingVertical: space.xs,
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={[type.labelSm, { color: colors.textFaint }]}>
                {projectCount}/{FREE_PROJECT_LIMIT} BUILDS
              </Text>
            </View>
          </View>
          <Text style={[type.bodySm, { color: colors.textDim, marginTop: space.md }]}>
            FORGE Pro removes the build limit, adds blueprint export, and lets you
            save a build as a reusable template.
          </Text>
          <Pressable
            onPress={() => router.push('/paywall')}
            style={({ pressed }) => [
              {
                borderWidth: 1,
                borderColor: colors.accent,
                borderRadius: radius.md,
                paddingVertical: space.md,
                alignItems: 'center',
                marginTop: space.lg,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Text style={[type.label, { color: colors.accent }]}>SEE FORGE PRO</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={async () => {
            await signOut();
            router.replace('/sign-in');
          }}
          style={({ pressed }) => [
            shared.card,
            { alignItems: 'center', opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[type.label, { color: colors.danger }]}>SIGN OUT</Text>
        </Pressable>

        <Text
          style={[
            type.labelSm,
            { color: colors.textFaint, textAlign: 'center', marginTop: space.xl },
          ]}
        >
          FORGE · HOUSE OF PRIME
        </Text>
      </ScrollView>

      <BottomNav active="settings" />
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={[type.labelSm, { color: colors.textFaint }]}>{label}</Text>
      <Text style={[type.bodySm, { color: colors.text, flex: 1, textAlign: 'right' }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}
