/**
 * Sign in / sign up.
 *
 * One screen, two modes, toggled at the top — the same shape as your
 * mockup. Keeping both in one file means the layout, spacing and
 * error handling can't drift apart between them.
 */

import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, radius, shared, space, type } from '../theme';
import { signIn, signUp } from '../lib/auth';

type Mode = 'in' | 'up';

export default function SignInScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setNotice(null);

    // Check the obvious things here rather than making the user wait
    // for a round trip to be told their password is too short.
    if (!email.includes('@')) return setError('That email address does not look right.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');

    setBusy(true);
    const result =
      mode === 'in'
        ? await signIn(email, password)
        : await signUp(email, password, name);
    setBusy(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (mode === 'up') {
      // Supabase may require email confirmation depending on your
      // project settings. If it does, there's no session yet and
      // redirecting would bounce straight back here.
      setNotice('Account created. If FORGE asks you to confirm your email, check your inbox, then sign in.');
      setMode('in');
      return;
    }

    router.replace('/home');
  }

  return (
    <KeyboardAvoidingView
      style={shared.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          padding: space.xl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Wordmark */}
        <Text style={[type.hero, { color: colors.text }]}>FORGE</Text>
        <Text
          style={[
            type.label,
            { color: colors.accent, marginTop: space.sm, marginBottom: space.xxl },
          ]}
        >
          PROJECT MISSION CONTROL
        </Text>

        {/* Mode toggle */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: colors.surface,
            borderRadius: radius.pill,
            borderWidth: 1,
            borderColor: colors.border,
            padding: space.xs,
            marginBottom: space.xl,
          }}
        >
          {(['in', 'up'] as Mode[]).map((m) => {
            const active = mode === m;
            return (
              <Pressable
                key={m}
                onPress={() => {
                  setMode(m);
                  setError(null);
                  setNotice(null);
                }}
                style={{
                  flex: 1,
                  paddingVertical: space.md,
                  alignItems: 'center',
                  borderRadius: radius.pill,
                  backgroundColor: active ? colors.surfaceHigh : 'transparent',
                }}
              >
                <Text
                  style={[
                    type.label,
                    { color: active ? colors.text : colors.textFaint },
                  ]}
                >
                  {m === 'in' ? 'SIGN IN' : 'SIGN UP'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {mode === 'up' && (
          <Field
            label="NAME"
            value={name}
            onChange={setName}
            placeholder="Prime"
            autoCapitalize="words"
          />
        )}

        <Field
          label="EMAIL"
          value={email}
          onChange={setEmail}
          placeholder="you@forge.build"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <View>
          <Field
            label="PASSWORD"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            secure={!showPassword}
            autoCapitalize="none"
          />
          <Pressable
            onPress={() => setShowPassword((s) => !s)}
            hitSlop={10}
            style={{ position: 'absolute', right: space.lg, top: 34 }}
          >
            <Text style={[type.labelSm, { color: colors.textFaint }]}>
              {showPassword ? 'HIDE' : 'SHOW'}
            </Text>
          </Pressable>
        </View>

        {error && (
          <Text
            style={[
              type.bodySm,
              { color: colors.danger, marginTop: space.md },
            ]}
          >
            {error}
          </Text>
        )}

        {notice && (
          <Text
            style={[
              type.bodySm,
              { color: colors.textDim, marginTop: space.md },
            ]}
          >
            {notice}
          </Text>
        )}

        {/* Primary action */}
        <Pressable
          onPress={submit}
          disabled={busy}
          style={({ pressed }) => [
            {
              backgroundColor: colors.accent,
              borderRadius: radius.md,
              paddingVertical: space.lg,
              alignItems: 'center',
              marginTop: space.xl,
              opacity: busy ? 0.6 : pressed ? 0.85 : 1,
            },
            shared.glow,
          ]}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={[type.label, { color: '#fff' }]}>
              {mode === 'in' ? 'SIGN IN  →' : 'START BUILDING  →'}
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => {
            setMode(mode === 'in' ? 'up' : 'in');
            setError(null);
            setNotice(null);
          }}
          style={{ marginTop: space.xl, alignItems: 'center' }}
        >
          <Text style={[type.bodySm, { color: colors.textDim }]}>
            {mode === 'in' ? 'First build? ' : 'Already building? '}
            <Text style={{ color: colors.accent }}>
              {mode === 'in' ? 'SIGN UP' : 'SIGN IN'}
            </Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** One labelled input. Defined here because only this screen uses it. */
function Field({
  label,
  value,
  onChange,
  placeholder,
  secure,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  secure?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'words';
}) {
  return (
    <View style={{ marginBottom: space.lg }}>
      <Text style={[type.labelSm, { color: colors.textFaint, marginBottom: space.sm }]}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.todo}
        secureTextEntry={secure}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={autoCapitalize ?? 'none'}
        autoCorrect={false}
        style={{
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.md,
          paddingHorizontal: space.lg,
          paddingVertical: space.md,
          color: colors.text,
          fontSize: 15,
        }}
      />
    </View>
  );
}
