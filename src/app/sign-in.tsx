/**
 * Sign in / sign up.
 *
 * One screen, two modes, switched by the pill at the top. The FORGE
 * wordmark powers on letter by letter as the screen opens.
 */

import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, ink, keyboard, shared, space, tint, type } from '../theme';
import { haptic } from '../lib/haptics';
import { signIn, signUp } from '../lib/auth';
import { Wordmark } from '../components/art';
import { Icon, type IconName } from '../components/icons';
import { PillTabs } from '../components/pill-tabs';
import { PrimaryButton, Screen } from '../components/ui';

type Mode = 'in' | 'up';

const MODES: { key: Mode; label: string }[] = [
  { key: 'in', label: 'SIGN IN' },
  { key: 'up', label: 'SIGN UP' },
];

export default function SignInScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
  }

  async function submit() {
    setError(null);
    setNotice(null);

    // Catch the obvious mistakes here instead of making someone wait
    // for a round trip to be told their password is too short.
    if (!email.includes('@')) {
      haptic.reject();
      return setError('That email address doesn’t look right.');
    }
    if (password.length < 6) {
      haptic.reject();
      return setError('Password must be at least 6 characters.');
    }

    setBusy(true);
    const result = mode === 'in' ? await signIn(email.trim(), password) : await signUp(email.trim(), password, name.trim());
    setBusy(false);

    if (result.error) {
      haptic.reject();
      setError(result.error);
      return;
    }

    if (mode === 'up') {
      // If "Confirm email" is still on in Supabase there's no session
      // yet, and sending them to Home would bounce straight back here.
      setNotice('Account created. If you were sent a confirmation email, open it, then sign in.');
      setMode('in');
      return;
    }

    haptic.confirm();
    router.replace('/home');
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 26, paddingVertical: space.xxxl }}
          keyboardShouldPersistTaps="handled"
        >
          <Wordmark />
          <Text style={[type.header, { color: colors.dim, marginTop: space.sm }]}>PROJECT MISSION CONTROL</Text>

          <View style={{ marginTop: 22 }}>
            <PillTabs options={MODES} value={mode} onChange={switchMode} />
          </View>

          <View style={{ gap: 14, marginTop: 22 }}>
            {mode === 'up' ? (
              <Field
                label="NAME"
                icon="user"
                value={name}
                onChange={setName}
                placeholder="Prime"
                autoCapitalize="words"
                autoComplete="name"
              />
            ) : null}
            <Field
              label="EMAIL"
              icon="mail"
              value={email}
              onChange={setEmail}
              placeholder="you@forge.build"
              keyboardType="email-address"
              autoComplete="email"
            />
            <Field
              label="PASSWORD"
              icon="lock"
              value={password}
              onChange={setPassword}
              placeholder="••••••••••"
              secure={!showPassword}
              autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
              onSubmit={submit}
              trailing={
                <Pressable onPress={() => setShowPassword((shown) => !shown)} hitSlop={12} accessibilityRole="button">
                  <Text style={[type.label, { color: colors.dim }]}>{showPassword ? 'HIDE' : 'SHOW'}</Text>
                </Pressable>
              }
            />
          </View>

          {error ? <Text style={[type.bodySm, { color: colors.danger, marginTop: space.md }]}>{error}</Text> : null}
          {notice ? <Text style={[type.bodySm, { color: colors.dim, marginTop: space.md }]}>{notice}</Text> : null}

          <PrimaryButton
            label={mode === 'in' ? 'SIGN IN' : 'START BUILDING'}
            icon="arrow"
            busy={busy}
            onPress={submit}
            style={{ marginTop: 22 }}
          />

          <Pressable onPress={() => switchMode(mode === 'in' ? 'up' : 'in')} hitSlop={8} style={{ marginTop: 22, alignItems: 'center' }}>
            <Text style={[type.bodySm, { color: colors.faint }]}>
              {mode === 'in' ? 'First build? ' : 'Already building? '}
              <Text style={[type.tab, { fontSize: 13, letterSpacing: 1, color: colors.accent }]}>
                {mode === 'in' ? 'SIGN UP' : 'SIGN IN'}
              </Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

/** A labelled input with an icon, which lights up orange while you type in it. */
function Field({
  label,
  icon,
  value,
  onChange,
  placeholder,
  secure,
  keyboardType,
  autoCapitalize = 'none',
  autoComplete,
  onSubmit,
  trailing,
}: {
  label: string;
  icon: IconName;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  secure?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'words';
  autoComplete?: 'email' | 'name' | 'current-password' | 'new-password';
  onSubmit?: () => void;
  trailing?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View>
      <Text style={[type.label, { color: colors.dim, marginBottom: space.sm }]}>{label}</Text>
      <View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 11,
            paddingHorizontal: 15,
            paddingVertical: 13,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: ink(0.09),
            backgroundColor: colors.field,
          },
          focused && shared.focusRing,
        ]}
      >
        <Icon name={icon} size={17} color={colors.nodeLine} />
        <TextInput
          value={value}
          onChangeText={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          placeholderTextColor={colors.faint}
          cursorColor={colors.accent}
          selectionColor={tint(0.45)}
          keyboardAppearance={keyboard()}
          secureTextEntry={secure}
          keyboardType={keyboardType ?? 'default'}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          autoCorrect={false}
          onSubmitEditing={onSubmit}
          accessibilityLabel={label}
          style={[type.input, { flex: 1, color: colors.heading, padding: 0 }]}
        />
        {trailing}
      </View>
    </View>
  );
}
