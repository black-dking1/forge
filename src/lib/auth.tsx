/**
 * Who is signed in, available anywhere in the app.
 *
 * React Context is the mechanism: you wrap the whole app in
 * <AuthProvider> once, and then any screen can call useAuth() to ask
 * "is someone signed in, and who?" without that information being
 * passed down through every component in between.
 *
 * The alternative — each screen asking Supabase itself — means every
 * screen does its own network call on mount, and they can disagree
 * with each other. One source of truth is simpler and faster.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

type AuthValue = {
  session: Session | null;
  /** true until we've checked stored credentials — see note below */
  loading: boolean;
  displayName: string;
};

const AuthContext = createContext<AuthValue>({
  session: null,
  loading: true,
  displayName: 'Builder',
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('Builder');

  useEffect(() => {
    // On launch, check whether there's a saved session on the device.
    // This reads from storage, so it is fast, but it is not instant —
    // and that gap is exactly why `loading` exists. Without it the app
    // shows the sign-in screen for a split second before realising the
    // user was already signed in, which looks broken.
    //
    // If the saved sign-in has expired, getSession() has to go to the
    // internet to renew it. On a slow connection that can take ages or
    // fail outright — and if we only stopped "loading" on success, the
    // app would sit on the loading dots forever. So loading ends in
    // every case: success, failure, or after 8 seconds at most.
    let finished = false;
    const finish = () => {
      if (!finished) {
        finished = true;
        setLoading(false);
      }
    };

    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch((e) => console.warn('[FORGE] could not read saved session:', e))
      .finally(finish);

    const safety = setTimeout(() => {
      console.warn('[FORGE] session check took over 8s — continuing without it');
      finish();
    }, 8000);

    // Then listen for changes: signing in, signing out, token refresh.
    // This fires for the life of the app — including once at start-up
    // with the saved session, which also counts as "done loading".
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      finish();
    });

    return () => {
      clearTimeout(safety);
      sub.subscription.unsubscribe();
    };
  }, []);

  // Pull the display name out of the profiles table whenever the
  // signed-in user changes. The signup trigger in the schema created
  // this row automatically.
  useEffect(() => {
    if (!session?.user) {
      setDisplayName('Builder');
      return;
    }
    let cancelled = false;
    supabase
      .from('profiles')
      .select('display_name')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        // `cancelled` guards against a late reply landing after the
        // user has already signed out — otherwise their name flashes
        // back onto the sign-in screen.
        if (!cancelled && data?.display_name) setDisplayName(data.display_name);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  // Tell RevenueCat who this is, using the same id as Supabase.
  // Without this, a purchase belongs to "this phone" instead of
  // "this account" — so signing in on a new phone would lose Pro.
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Purchases = require('react-native-purchases').default;
      Purchases.logIn(userId).catch(() => {});
    } catch {
      // no purchases in this runtime (Expo Go) — fine
    }
  }, [session?.user?.id]);

  return (
    <AuthContext.Provider value={{ session, loading, displayName }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

// ---------------------------------------------------------------
// Actions
// ---------------------------------------------------------------
//
// These return a plain { error } rather than throwing, so screens can
// show a message in the UI instead of wrapping everything in
// try/catch.

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  return { error: error?.message ?? null };
}

export async function signUp(email: string, password: string, name: string) {
  const { error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    // This lands in raw_user_meta_data, which the handle_new_user
    // trigger in your schema reads to fill in profiles.display_name.
    options: { data: { display_name: name.trim() || 'Builder' } },
  });
  return { error: error?.message ?? null };
}

export async function signOut() {
  await supabase.auth.signOut();
  forgetPurchaser();
}

/** RevenueCat: stop linking purchases to the account that just left. */
function forgetPurchaser() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Purchases = require('react-native-purchases').default;
    Purchases.logOut().catch(() => {});
  } catch {
    // no purchases in this runtime — fine
  }
}

/**
 * Delete the account and everything in it.
 *
 * Calls delete_my_account() in the database (migration 03). That
 * function can only ever delete the signed-in user's own row, and
 * every table cascades from it: profile → builds → areas → tasks,
 * plus templates. Then we clear the now-useless session from the
 * phone ("local" — the server session is already gone with the user).
 *
 * A store subscription is NOT cancelled by this — Apple only lets
 * the customer do that — which is why the confirm screen says so.
 */
export async function deleteAccount() {
  const { error } = await supabase.rpc('delete_my_account');
  if (error) return { error: error.message };
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
  forgetPurchaser();
  return { error: null };
}
