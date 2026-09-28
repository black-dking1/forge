/**
 * Account — your details, and Delete account.
 *
 * Apple requires any app that lets you sign up to also let you delete
 * your account from inside the app. Deleting removes the sign-in and
 * everything attached to it (see deleteAccount in lib/auth.tsx).
 *
 * The one thing it can't do is cancel a store subscription — only
 * the customer can, in their Apple ID settings — so the confirmation
 * says so plainly instead of leaving someone paying by surprise.
 */

import { useState } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, shared, space, type } from '../theme';
import { haptic } from '../lib/haptics';
import { deleteAccount, useAuth } from '../lib/auth';
import { ConfirmForm, Sheet, Toast, type ToastData } from '../components/overlays';
import { GhostButton, Header, Screen, SectionLabel } from '../components/ui';

export default function AccountScreen() {
  const router = useRouter();
  const { session, displayName } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  const joined = session?.user?.created_at ? new Date(session.user.created_at).toLocaleDateString() : '—';

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.xl, paddingTop: 22, paddingBottom: space.huge }}>
        <Header title="ACCOUNT" onBack={() => router.back()} />

        <View style={[shared.card, { padding: space.lg, marginTop: space.xxl, gap: space.lg }]}>
          <Row label="NAME" value={displayName || 'Builder'} />
          <Row label="EMAIL" value={session?.user?.email ?? '—'} />
          <Row label="JOINED" value={joined} />
        </View>

        <SectionLabel style={{ marginTop: space.xxl }}>DANGER ZONE</SectionLabel>
        <Text style={[type.bodySm, { color: colors.faint, marginTop: space.sm, marginBottom: space.md }]}>
          Deleting your account removes every build, task and template for good.
        </Text>
        <GhostButton label="DELETE ACCOUNT" icon="trash" color={colors.danger} onPress={() => setConfirming(true)} />
      </ScrollView>

      <Sheet open={confirming} onClose={() => setConfirming(false)} title="DELETE YOUR ACCOUNT?">
        {confirming ? (
          <ConfirmForm
            message={
              'This deletes your sign-in, all your builds, tasks and templates. It can’t be undone.' +
              (Platform.OS === 'ios'
                ? '\n\nIf you subscribe to FORGE Pro, cancel it separately in Settings → Apple ID → Subscriptions — deleting your account doesn’t stop billing.'
                : '\n\nIf you subscribe to FORGE Pro, cancel it separately in your store account — deleting your account doesn’t stop billing.')
            }
            confirmLabel="DELETE FOREVER"
            onCancel={() => setConfirming(false)}
            onConfirm={async () => {
              const { error } = await deleteAccount();
              if (error) {
                haptic.reject();
                setConfirming(false);
                setToast({ message: "Couldn't delete the account. Check your connection and try again." });
                return;
              }
              haptic.confirm();
              setConfirming(false);
              router.replace('/sign-in');
            }}
          />
        ) : null}
      </Sheet>

      <Toast toast={toast} onHide={() => setToast(null)} />
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
      <Text style={[type.labelSm, { color: colors.label, width: 64 }]}>{label}</Text>
      <Text style={[type.bodyBold, { color: colors.soft, flex: 1, textAlign: 'right' }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}
