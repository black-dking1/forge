/**
 * The root of the app. Everything renders inside this.
 *
 * Three jobs:
 *   1. Load the MatrixType fonts before showing anything
 *   2. Put the signed-in user in context for every screen
 *   3. Start RevenueCat
 */

import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';

import { AuthProvider } from '../lib/auth';
import { colors, fontAssets } from '../theme';

// NOTE: RevenueCat is deliberately NOT imported at the top of this
// file. Its native code exists only in a real build — in Expo Go
// there is nothing behind it. A top-level import is evaluated before
// any of our code runs, so a missing native module there takes the
// whole app down before a try/catch could ever catch it.
//
// Loading it inside the effect below, with require(), means a
// failure is caught and FORGE carries on without purchases instead
// of refusing to start.

// Hold the splash screen until the fonts are ready. Without this the
// app renders once in the system font and then jumps when MatrixType
// arrives — a visible flash that looks like a bug.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const [purchasesReady, setPurchasesReady] = useState(false);

  // ---- RevenueCat ------------------------------------------------
  //
  // Wrapped in try/catch on purpose. If this throws, the whole app
  // fails to start — and a monetisation SDK should never be able to
  // stop someone opening their projects.
  //
  // TWO THINGS TO FIX BEFORE THE STORE BUILD:
  //
  //   1. The key below starts with `test_`, which is a RevenueCat
  //      Test Store key. Galaxy Store keys start with `galx_`. For
  //      development without a Galaxy device the test key is actually
  //      the useful one — but the production build needs the real
  //      Galaxy key from your RevenueCat dashboard.
  //
  //   2. GALAXY_BILLING_MODE.TEST must become the production mode.
  //      Shipping a store build stuck in test mode fails silently:
  //      no error, no purchases, no revenue.
  useEffect(() => {
    if (Platform.OS !== 'android') {
      setPurchasesReady(true);
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const RC = require('react-native-purchases');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Galaxy = require('react-native-purchases-store-galaxy');

      const Purchases = RC.default;
      Purchases.setLogLevel(RC.LOG_LEVEL.VERBOSE);
      Purchases.configure({
        apiKey: process.env.EXPO_PUBLIC_REVENUECAT_KEY ?? 'test_umYsfeNmcyutWfLAaWrYnnOwuzy',
        store: 'GALAXY',
        galaxyBillingMode: Galaxy.GALAXY_BILLING_MODE.TEST,
      });
      console.log('[FORGE] RevenueCat ready');
    } catch (e) {
      // Expected in Expo Go, where there is no native code behind the
      // SDK. Everything except purchases still works.
      console.warn('[FORGE] purchases unavailable in this runtime:', e);
    } finally {
      setPurchasesReady(true);
    }
  }, []);

  // ---- Splash ----------------------------------------------------
  //
  // fontError is handled rather than ignored: if a font file is
  // missing or corrupt, carry on with the system font rather than
  // hanging on the splash screen forever with no explanation.
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
    <AuthProvider>
      {/* SDK 57 dropped backgroundColor here — the bar colour now comes
          from the screen behind it, which is already colors.bg. */}
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'fade',
        }}
      />
    </AuthProvider>
  );
}
