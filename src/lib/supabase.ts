/**
 * The Supabase client.
 *
 * This is the single place the app talks to your database. Every
 * screen imports `supabase` from here.
 *
 * Three settings below matter and none of them are defaults:
 *
 *   storage: AsyncStorage
 *     Supabase defaults to browser localStorage, which does not exist
 *     on a phone. Without this, the session is forgotten the moment
 *     the app closes and users are asked to sign in every single time.
 *
 *   detectSessionInUrl: false
 *     That's a web feature — reading an auth token out of the page
 *     URL after a redirect. There are no URLs here. Leaving it on
 *     causes errors on startup.
 *
 *   autoRefreshToken: true
 *     Access tokens expire after about an hour. This quietly renews
 *     them in the background so a user who leaves the app open
 *     doesn't suddenly start getting permission errors.
 */

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Fail loudly and early. Without this you get a vague "Invalid URL"
// deep inside the library and spend twenty minutes hunting for it.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase config.\n\n' +
      'Create a file called .env in the project root with:\n' +
      '  EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co\n' +
      '  EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...\n\n' +
      'Then stop the dev server and start it again — .env is only ' +
      'read at startup.'
  );
}

// AsyncStorage on anything other than a real device reaches for
// `window`, which does not exist when code runs outside a browser.
// Guarding here means the app can never be killed at startup by an
// environment it was never meant to run in.
const isNative = Platform.OS === 'android' || Platform.OS === 'ios';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: isNative ? AsyncStorage : undefined,
    autoRefreshToken: isNative,
    persistSession: isNative,
    detectSessionInUrl: false,
  },
});

// Only refresh tokens while the app is actually on screen. Left
// running in the background it wakes the phone up for nothing and
// drains battery.
if (isNative) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
