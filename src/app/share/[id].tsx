/**
 * Share a blueprint (FORGE Pro).
 *
 * Shows a preview of the poster, then two ways out:
 *   SHARE IMAGE — takes a picture of the poster (react-native-view-shot)
 *                 and opens the phone's share sheet (expo-sharing), so
 *                 it can go straight to X, WhatsApp, Instagram…
 *   SHARE AS TEXT — the same tree as a text outline.
 *
 * Every shared image is signed "BUILT WITH FORGE #BUILDINPUBLIC" —
 * each one is a small advert for the app.
 */

import { useEffect, useRef, useState } from 'react';
import { ScrollView, Share, Text, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { colors, space, type } from '../../theme';
import { haptic } from '../../lib/haptics';
import { checkPro } from '../../lib/pro';
import { getProject, listAreas, listTasks, type Area, type ProjectOverview, type Task } from '../../lib/projects';
import { ShareCard, blueprintAsText } from '../../components/share-card';
import { Toast, type ToastData } from '../../components/overlays';
import { GhostButton, Header, LedLoader, PrimaryButton, Screen } from '../../components/ui';

type Loaded = { project: ProjectOverview; areas: Area[]; tasks: Task[] };

export default function ShareScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const cardRef = useRef<View>(null);

  const [data, setData] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [pro, setPro] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  useEffect(() => {
    checkPro().then(setPro);
    if (!id) return;
    Promise.all([getProject(id), listAreas(id), listTasks(id)]).then(([p, a, t]) => {
      if (p.error || a.error || t.error || !p.project) {
        setFailed(true);
        return;
      }
      setData({ project: p.project, areas: a.areas, tasks: t.tasks });
    });
  }, [id]);

  function back() {
    if (router.canGoBack()) router.back();
    else router.replace('/home');
  }

  async function shareImage() {
    if (!cardRef.current) return;
    setBusy(true);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
      if (!(await Sharing.isAvailableAsync())) {
        setToast({ message: 'Sharing isn’t available on this phone.' });
        return;
      }
      haptic.confirm();
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your blueprint', UTI: 'public.png' });
    } catch {
      haptic.reject();
      setToast({ message: 'Couldn’t make the image. Try again.' });
    } finally {
      setBusy(false);
    }
  }

  async function shareText() {
    if (!data) return;
    try {
      await Share.share({ message: blueprintAsText(data.project, data.areas, data.tasks) });
    } catch {
      setToast({ message: 'Couldn’t open sharing.' });
    }
  }

  // ---------- not Pro: point them at the paywall ----------
  if (pro === false) {
    return (
      <Screen style={{ padding: space.xl, justifyContent: 'center' }}>
        <Text style={[type.heading, { color: colors.heading }]}>SHARING IS{'\n'}PART OF PRO</Text>
        <Text style={[type.body, { color: colors.dim, marginTop: 14 }]}>
          Turn any build into a poster of its blueprint and post it anywhere.
        </Text>
        <PrimaryButton
          label="SEE FORGE PRO"
          onPress={() => router.replace({ pathname: '/paywall', params: { reason: 'export' } })}
          style={{ marginTop: 28 }}
        />
      </Screen>
    );
  }

  if (failed) {
    return (
      <Screen style={{ padding: space.xl, justifyContent: 'center' }}>
        <Text style={[type.heading, { color: colors.heading }]}>SIGNAL{'\n'}LOST</Text>
        <Text style={[type.body, { color: colors.dim, marginTop: 14 }]}>Couldn’t load this build. Nothing was lost.</Text>
        <PrimaryButton label="GO BACK" onPress={back} style={{ marginTop: 28 }} />
      </Screen>
    );
  }

  if (!data || pro === null) {
    return (
      <Screen style={{ justifyContent: 'center' }}>
        <LedLoader label="DRAWING BLUEPRINT" />
      </Screen>
    );
  }

  const cardWidth = Math.min(380, screenWidth - space.xl * 2);

  return (
    <Screen>
      <View style={{ paddingHorizontal: space.xl, paddingTop: 22 }}>
        <Header title="SHARE BLUEPRINT" onBack={back} />
      </View>

      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingTop: space.xl, paddingBottom: space.xl }}>
        <View
          style={{
            borderRadius: 18,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.lineMid,
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          }}
        >
          <ShareCard ref={cardRef} project={data.project} areas={data.areas} tasks={data.tasks} width={cardWidth} />
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: space.xl, paddingBottom: space.xxl, gap: space.md }}>
        <PrimaryButton label="SHARE IMAGE" icon="share" busy={busy} onPress={shareImage} />
        <GhostButton label="SHARE AS TEXT" icon="text" onPress={shareText} />
      </View>

      <Toast toast={toast} onHide={() => setToast(null)} />
    </Screen>
  );
}
