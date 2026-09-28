/**
 * The gate.
 *
 * The first screen the router loads. It draws nothing of its own —
 * it decides where you belong and sends you there. Doing this in one
 * place means no other screen has to wonder whether you're signed in.
 */

import { Redirect } from 'expo-router';
import { useAuth } from '../lib/auth';
import { LedLoader, Screen } from '../components/ui';

export default function Index() {
  const { session, loading } = useAuth();

  // Still reading the saved sign-in from the phone. Show the LEDs
  // rather than guessing — a guess means a flash of the wrong screen.
  if (loading) {
    return (
      <Screen style={{ justifyContent: 'center' }}>
        <LedLoader />
      </Screen>
    );
  }

  return <Redirect href={session ? '/home' : '/sign-in'} />;
}
