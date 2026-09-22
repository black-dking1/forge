/**
 * The gate.
 *
 * This is the first screen the router loads. It renders nothing
 * itself — it just decides where you actually belong and sends you
 * there.
 *
 * Doing this in one place means no other screen has to think about
 * whether the user is signed in.
 */

import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { colors } from '../theme';

export default function Index() {
  const { session, loading } = useAuth();

  // Still checking stored credentials. Show a quiet spinner rather
  // than guessing — guessing means a flash of the wrong screen.
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return <Redirect href={session ? '/home' : '/sign-in'} />;
}
