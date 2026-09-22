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
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    // Then listen for changes: signing in, signing out, token refresh.
    // This fires for the life of the app.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => sub.subscription.unsubscribe();
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
}
