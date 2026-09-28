/**
 * The root of the app. Everything renders inside this.
 *
 * Jobs:
 *   1. Load the fonts before showing anything
 *   2. Put the signed-in user in context for every screen
 *   3. Start RevenueCat
 *   4. Set how each screen animates in
 *   5. Draw the ONE bottom nav that floats over Home and Settings
 */

import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider } from '../lib/auth';
import { colors, fontAssets } from '../theme';
import { BottomNav } from '../components/bottom-nav';

// NOTE: RevenueCat is deliberately NOT imported at the top of this
// file. Its native code exists only in a real build — in Expo Go
// there is nothing behind it, and a top-level import would take the
// whole app down before a try/catch could catch it. Loading it with
// require() inside the effect below keeps FORGE running without it.

// Hold the splash screen until the fonts are ready, so the app never
// flashes up in the system font first.
SplashScreen.preventAutoHideAsync().catch(() => {});

const ios = Platform.OS === 'ios';

const drillIn = ios
  ? ({ animation: 'default', gestureEnabled: true, fullScreenGestureEnabled: true } as const)
  : ({ animation: 'slide_from_right' } as const);

const sheet = ios
  ? ({ presentation: 'modal', animation: 'default', gestureEnabled: true } as const)
  : ({ animation: 'slide_from_bottom' } as const);

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const [purchasesReady, setPurchasesReady] = useState(false);

  // ---- RevenueCat ------------------------------------------------
  //
  // Each store has its own RevenueCat key:
  //   iPhone  → EXPO_PUBLIC_REVENUECAT_IOS_KEY     (starts appl_)
  //   Android → EXPO_PUBLIC_REVENUECAT_ANDROID_KEY
  // Both live in .env. Until they're set, the test_ key is used —
  // RevenueCat's Test Store, which fakes purchases for development.
  //
  // BEFORE THE STORE BUILD: put the real appl_ key in .env. A store
  // build on the test key can't take real payments.
  useEffect(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const RC = require('react-native-purchases');
      const Purchases = RC.default;

      // Quiet by default — the chatty VERBOSE setting flooded the
      // terminal with those e.revenue.cat lines.
      Purchases.setLogLevel(__DEV__ ? RC.LOG_LEVEL.WARN : RC.LOG_LEVEL.ERROR);

      const testKey = 'test_umYsfeNmcyutWfLAaWrYnnOwuzy';
      const apiKey =
        Platform.OS === 'ios'
          ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? testKey
          : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? testKey;

      Purchases.configure({ apiKey });
      console.log('[FORGE] RevenueCat ready');
    } catch (e) {
      console.warn('[FORGE] purchases unavailable in this runtime:', e);
    } finally {
      setPurchasesReady(true);
    }
  }, []);

  // ---- Splash ----------------------------------------------------
  // If a font file is missing, carry on with the system font rather
  // than hanging on the splash screen forever.
  useEffect(() => {
    if ((fontsLoaded || fontError) && purchasesReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError, purchasesReady]);

  if (!fontsLoaded && !fontError) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }
  if (fontError) {
    console.warn('[FORGE] fonts failed to load, using system font:', fontError);
  }

  return (
    // Swipe-to-delete needs this wrapper around the whole app.
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <AuthProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
            animation: 'fade',
          }}
        >
          {/* Drilling in slides from the right; things you fill in and
              leave (new build, Pro) rise from the bottom.

              On iPhone these are the real iOS versions: a native push
              you can swipe back from the left edge, and native "page
              sheet" cards that you can pull down to dismiss, with the
              screen behind shrinking back like in Apple's own apps. */}
          <Stack.Screen name="project/[id]" options={drillIn} />
          <Stack.Screen name="area/[id]" options={drillIn} />
          <Stack.Screen name="share/[id]" options={drillIn} />
          <Stack.Screen name="account" options={drillIn} />
          <Stack.Screen name="new-project" options={sheet} />
          <Stack.Screen name="paywall" options={sheet} />
        </Stack>
        <BottomNav />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
