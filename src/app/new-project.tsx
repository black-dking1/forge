/**
 * New project.
 *
 * Name, goal, pick your areas, done. One screen — your mockup showed
 * a 1-2-3 step indicator, but the flow is genuinely one step, and a
 * progress indicator that lies about how many steps remain is worse
 * than none.
 *
 * Hitting BUILD BLUEPRINT calls create_project, which makes the
 * project, its areas and starter tasks in a single transaction.
 */

import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, radius, shared, space, type } from '../theme';
import { createProject, countProjects } from '../lib/projects';

// These match the starter_tasks_for() function in the schema. Change
// one, change the other, or the area gets the generic fallback tasks.
const STARTER_AREAS = [
  'Hardware',
  'Software',
  'Power',
  'Testing',
  'Research',
  'Documentation',
];

const FREE_PROJECT_LIMIT = 3;

export default function NewProjectScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [picked, setPicked] = useState<string[]>([
    'Hardware',
    'Software',
    'Power',
    'Testing',
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(area: string) {
    setPicked((current) =>
      current.includes(area)
        ? current.filter((a) => a !== area)
        : [...current, area]
    );
  }

  async function build() {
    setError(null);

    if (!name.trim()) {
      return setError('Give the build a name.');
    }
    if (picked.length === 0) {
      return setError('Pick at least one area to start from.');
    }

    setBusy(true);

    // The free-tier gate. This is the moment that sells Pro, so it
    // deliberately fires here — after someone has typed a real name
    // and a real goal and has something to lose — rather than on
    // first launch.
    const { count } = await countProjects();
    if (count >= FREE_PROJECT_LIMIT) {
      setBusy(false);
      // TODO (Friday): router.push('/paywall')
      return setError(
        `Free builds are limited to ${FREE_PROJECT_LIMIT}. FORGE Pro removes the cap.`
      );
    }

    const { projectId, error } = await createProject(name, goal, picked);
    setBusy(false);

    if (error) return setError(error);
    if (!projectId) return setError('Something went wrong creating the build.');

    // replace, not push — so the back gesture from the project screen
    // goes home, not back into a form that's already been submitted.
    router.replace('/home');
  }

  return (
    <SafeAreaView style={shared.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: space.xl, paddingBottom: space.xxxl }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.xl }}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={[type.screen, { color: colors.text }]}>←</Text>
          </Pressable>
          <Text style={[type.label, { color: colors.textDim }]}>NEW PROJECT</Text>
        </View>

        <Text style={[type.title, { color: colors.text, marginBottom: space.xl }]}>
          WHAT ARE YOU{'\n'}BUILDING?
        </Text>

        <Text style={[type.labelSm, { color: colors.textFaint, marginBottom: space.sm }]}>
          PROJECT NAME
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Hexapod Mk II"
          placeholderTextColor={colors.todo}
          style={inputStyle}
        />

        <Text
          style={[
            type.labelSm,
            { color: colors.textFaint, marginTop: space.lg, marginBottom: space.sm },
          ]}
        >
          GOAL
        </Text>
        <TextInput
          value={goal}
          onChangeText={setGoal}
          placeholder="A six-legged walking robot that can cross rough terrain on its own."
          placeholderTextColor={colors.todo}
          multiline
          style={[inputStyle, { height: 96, textAlignVertical: 'top', paddingTop: space.md }]}
        />

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: space.xl,
            marginBottom: space.md,
          }}
        >
          <Text style={[type.labelSm, { color: colors.textFaint }]}>STARTER AREAS</Text>
          <Text style={[type.labelSm, { color: colors.accent }]}>
            {picked.length} PICKED
          </Text>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {STARTER_AREAS.map((area) => {
            const on = picked.includes(area);
            return (
              <Pressable
                key={area}
                onPress={() => toggle(area)}
                style={{
                  paddingHorizontal: space.lg,
                  paddingVertical: space.md,
                  borderRadius: radius.pill,
                  borderWidth: 1,
                  borderColor: on ? colors.accent : colors.border,
                  backgroundColor: on ? colors.accentDim : 'transparent',
                }}
              >
                <Text
                  style={[
                    type.labelSm,
                    { color: on ? colors.accent : colors.textFaint },
                  ]}
                >
                  {area.toUpperCase()}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text
          style={[
            type.bodySm,
            { color: colors.textDim, marginTop: space.lg },
          ]}
        >
          FORGE will draft tasks inside each area you keep. You can edit everything after.
        </Text>

        {error && (
          <Text style={[type.bodySm, { color: colors.danger, marginTop: space.lg }]}>
            {error}
          </Text>
        )}

        <Pressable
          onPress={build}
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
            <Text style={[type.label, { color: '#fff' }]}>BUILD BLUEPRINT  →</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const inputStyle = {
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: radius.md,
  paddingHorizontal: space.lg,
  paddingVertical: space.md,
  color: colors.text,
  fontSize: 15,
} as const;
