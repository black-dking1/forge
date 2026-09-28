/**
 * FORGE Pro — who has it, and what free users get.
 *
 * The answer comes from RevenueCat, never from our own database.
 * RevenueCat talks to the App Store, so it knows about renewals,
 * refunds and cancellations our database would never hear of.
 * "pro" is the entitlement identifier set up in the RevenueCat
 * dashboard.
 *
 * RevenueCat is loaded with require() inside try/catch: in Expo Go
 * there's no store, and that must mean "not Pro", not "app crashes".
 */

import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Free users can have this many builds (archived ones included). */
export const FREE_BUILD_LIMIT = 3;

export const PRO_ENTITLEMENT = 'pro';

// ---------------------------------------------------------------
// DEV-ONLY PRO PREVIEW
// ---------------------------------------------------------------
//
// You can't buy anything inside Expo Go, so without this you could
// never see the Pro features while developing. In development builds
// only (__DEV__), Settings shows a switch that pretends you're Pro.
//
// __DEV__ is false in the store build, so this switch — and the
// pretend — simply don't exist there. Judges and customers can only
// get Pro by actually subscribing (or through the free trial).

const DEV_KEY = 'forge.devProPreview';
let devPreview: boolean | null = null;

export async function getDevPreview() {
  if (!__DEV__) return false;
  if (devPreview === null) {
    try {
      devPreview = (await AsyncStorage.getItem(DEV_KEY)) === 'on';
    } catch {
      devPreview = false;
    }
  }
  return devPreview;
}

export async function setDevPreview(on: boolean) {
  if (!__DEV__) return;
  devPreview = on;
  try {
    await AsyncStorage.setItem(DEV_KEY, on ? 'on' : 'off');
  } catch {
    // not worth bothering anyone about
  }
}

// ---------------------------------------------------------------
// THE REAL CHECK
// ---------------------------------------------------------------

async function askRevenueCat(): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Purchases = require('react-native-purchases').default;
    const info = await Purchases.getCustomerInfo();
    return Boolean(info?.entitlements?.active?.[PRO_ENTITLEMENT]);
  } catch {
    return false;
  }
}

/**
 * Is this person Pro right now?
 *
 * Gives up after 4 seconds and says "no" — a slow network must never
 * leave a button spinning forever. If they really are Pro, the next
 * check (or RESTORE PURCHASES) will find it.
 */
export async function checkPro(): Promise<boolean> {
  if (await getDevPreview()) return true;
  const giveUp = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 4000));
  return Promise.race([askRevenueCat(), giveUp]);
}

/** Pro status for a screen, re-checked every time the screen comes into view. */
export function usePro() {
  const [pro, setPro] = useState(false);
  useFocusEffect(
    useCallback(() => {
      let live = true;
      checkPro().then((value) => {
        if (live) setPro(value);
      });
      return () => {
        live = false;
      };
    }, [])
  );
  return pro;
}
