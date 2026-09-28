/**
 * New build.
 *
 * Name, icon, goal, pick your areas, BUILD BLUEPRINT. On success you land
 * straight on the new build's BLUEPRINT tab and watch it assemble —
 * the payoff for filling in the form.
 *
 * The free-tier gate lives here too. It fires at the moment of
 * highest intent — after you've typed a real name and goal — and
 * the paywall carries your form with it, so buying Pro finishes
 * creating the build instead of making you type it all again.
 *
 * START FROM — where the plan comes from:
 *   ✦ AI PLAN      FORGE reads your name and goal and drafts areas and
 *                  tasks specific to THIS build (see lib/ai.ts). Default.
 *   STARTER AREAS  pick from six common areas; fixed starter tasks.
 *   a template     (Pro) copy a plan you saved from an earlier build.
 *
 * ICON — the picture on the build's folder on Home. Until you tap one
 * yourself, it follows the name: type "FPV drone" and the plane lights
 * up. Once you pick, your pick stays.
 */

import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useFocusEffect, useRouter } from 'expo-router';
import { colors, ios, radius, shared, space, type } from '../theme';
import { curve } from '../lib/motion';
import { haptic } from '../lib/haptics';
import {
  countProjects,
  createProject,
  createProjectFromTemplate,
  deleteTemplate,
  describeStructure,
  listTemplates,
  setInventory,
  DEFAULT_ICON,
  type Template,
} from '../lib/projects';
import { checkPro, FREE_BUILD_LIMIT, usePro } from '../lib/pro';
import { ConfirmForm, Sheet, Toast, type ToastData } from '../components/overlays';
import { guessIcon, IconPicker } from '../components/icon-picker';
import { Header, LedLoader, LinkButton, Press, PrimaryButton, Screen } from '../components/ui';
import { aiMessages, draftBuild, ideasFromParts, type BuildIdea } from '../lib/ai';
import type { TemplateStructure } from '../lib/projects';

// These match starter_tasks_for() in the schema. Change one, change
// the other, or the area gets the generic fallback tasks.
const STARTER_AREAS = ['Hardware', 'Software', 'Power', 'Testing', 'Research', 'Documentation'];

export default function NewProjectScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<string>(DEFAULT_ICON);
  const [iconPicked, setIconPicked] = useState(false); // true once they've tapped an icon themselves
  const [goal, setGoal] = useState('');
  const [have, setHave] = useState(''); // parts/tools already owned (AI plan only)
  const [picked, setPicked] = useState<string[]>(['Hardware', 'Software', 'Power', 'Testing']);
  const [focused, setFocused] = useState<'name' | 'goal' | 'have' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Where the plan comes from: 'ai', 'starter', or a template's id
  const pro = usePro();
  const [source, setSource] = useState<string>('ai');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [deleting, setDeleting] = useState<Template | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const template = templates.find((t) => t.id === source) ?? null;

  // The AI's draft, once it's been made
  const [draft, setDraft] = useState<TemplateStructure | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [aiLeft, setAiLeft] = useState<number | null>(null);

  // "What can I build with these parts?" — ideas, before there's a plan
  const [ideas, setIdeas] = useState<BuildIdea[] | null>(null);
  const [ideasBusy, setIdeasBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      listTemplates().then((result) => setTemplates(result.templates));
    }, [])
  );

  function pickSource(next: string) {
    const isTemplate = next !== 'ai' && next !== 'starter';
    if (isTemplate && !pro) {
      router.push({ pathname: '/paywall', params: { reason: 'template' } });
      return;
    }
    haptic.select();
    setSource(next);
    setError(null);
  }

  /** Ask the AI for a plan. It reads the name and the goal. */
  async function draftPlan() {
    setError(null);
    if (!name.trim()) {
      haptic.reject();
      return setError('Give the build a name first — the AI plans from it.');
    }
    setDrafting(true);
    const result = await draftBuild(name, goal, have);
    setDrafting(false);
    if (result.error || !result.structure) {
      haptic.reject();
      return setError(aiMessages[result.error ?? 'failed']);
    }
    haptic.confirm();
    setDraft(result.structure);
    setAiLeft(result.left);
  }

  /** Parts in, four things you could build out. */
  async function askForIdeas() {
    if (ideasBusy) return;
    setError(null);
    setIdeasBusy(true);
    const result = await ideasFromParts(have);
    setIdeasBusy(false);
    if (result.error) {
      haptic.reject();
      return setError(aiMessages[result.error]);
    }
    haptic.confirm();
    setIdeas(result.ideas);
    setAiLeft(result.left);
  }

  /** Tap an idea: it fills in the form, ready to draft. */
  function useIdea(idea: BuildIdea) {
    haptic.select();
    setName(idea.name);
    if (!iconPicked) setIcon(guessIcon(idea.name) ?? DEFAULT_ICON);
    setGoal(idea.blurb);
    setIdeas(null);
    setDraft(null);
  }

  function toggle(area: string) {
    haptic.select();
    setPicked((current) => (current.includes(area) ? current.filter((a) => a !== area) : [...current, area]));
  }

  async function build() {
    setError(null);
    if (!name.trim()) {
      haptic.reject();
      return setError('Give the build a name.');
    }
    if (source === 'ai' && !draft) {
      // First press drafts the plan; the second builds it.
      return draftPlan();
    }
    if (source === 'starter' && picked.length === 0) {
      haptic.reject();
      return setError('Pick at least one area to start from.');
    }
    const structure = source === 'ai' ? draft : template ? template.structure : null;

    setBusy(true);

    // Keep areas in the order they appear on screen, not tap order.
    const ordered = STARTER_AREAS.filter((a) => picked.includes(a));

    // The gate. Pro users skip it entirely.
    const [{ count }, isPro] = await Promise.all([countProjects(), checkPro()]);
    if (!isPro && count >= FREE_BUILD_LIMIT) {
      setBusy(false);
      router.push({
        pathname: '/paywall',
        params: {
          reason: 'limit',
          used: String(count),
          name: name.trim(),
          goal: goal.trim(),
          icon,
          areas: ordered.join('|'),
          structure: structure ? JSON.stringify(structure) : '',
        },
      });
      return;
    }

    const { projectId, error: createError } = structure
      ? await createProjectFromTemplate(name, goal, structure, icon)
      : await createProject(name, goal, ordered, icon);
    setBusy(false);

    if (createError || !projectId) {
      haptic.reject();
      return setError(createError ?? 'Something went wrong creating the build.');
    }

    // Remember what they said they already have, so the build's area
    // suggestions can plan around it later too. Best-effort — a build
    // is still fine without it.
    if (source === 'ai' && have.trim()) await setInventory(projectId, have);

    haptic.confirm();
    // Close this form first, then open the new build — so Back from
    // the build goes Home, not back into a form that's already used.
    router.dismissTo('/home');
    router.push({ pathname: '/project/[id]', params: { id: projectId, tab: 'blueprint' } });
  }

  return (
    // On iPhone this screen is a sheet that slides up below the status
    // bar, so it doesn't need the status-bar gap at the top.
    <Screen top={!ios}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: space.xl, paddingTop: 22, paddingBottom: space.huge }}
          keyboardShouldPersistTaps="handled"
        >
          <Header title="NEW PROJECT" onBack={() => router.back()} close={ios} />

          <Text style={[type.heading, { color: colors.heading, marginTop: space.xxl }]} accessibilityRole="header">
            WHAT ARE YOU{'\n'}BUILDING?
          </Text>

          <Text style={[type.label, { color: colors.dim, marginTop: space.xl, marginBottom: space.sm }]}>PROJECT NAME</Text>
          <View style={[field, focused === 'name' && shared.focusRing]}>
            <TextInput
              value={name}
              onChangeText={(t) => {
                setName(t);
                if (!iconPicked) setIcon(guessIcon(t) ?? DEFAULT_ICON);
                if (draft) setDraft(null); // the plan no longer matches — draft again
              }}
              onFocus={() => setFocused('name')}
              onBlur={() => setFocused(null)}
              placeholder="Hexapod Mk II"
              placeholderTextColor={colors.faint}
              cursorColor={colors.accent}
              selectionColor="rgba(244,60,20,0.45)"
              keyboardAppearance="dark"
              maxLength={60}
              returnKeyType="next"
              style={[type.input, { color: colors.heading, padding: 0 }]}
            />
          </View>

          <Text style={[type.label, { color: colors.dim, marginTop: 18, marginBottom: space.sm }]}>ICON</Text>
          <IconPicker
            value={icon}
            onChange={(next) => {
              setIcon(next);
              setIconPicked(true);
            }}
          />

          <Text style={[type.label, { color: colors.dim, marginTop: 18, marginBottom: space.sm }]}>GOAL</Text>
          <View style={[field, focused === 'goal' && shared.focusRing]}>
            <TextInput
              value={goal}
              onChangeText={(t) => {
                setGoal(t);
                if (draft) setDraft(null);
              }}
              onFocus={() => setFocused('goal')}
              onBlur={() => setFocused(null)}
              placeholder="A six-legged walking robot that can cross rough terrain on its own."
              placeholderTextColor={colors.faint}
              cursorColor={colors.accent}
              selectionColor="rgba(244,60,20,0.45)"
              keyboardAppearance="dark"
              multiline
              maxLength={280}
              style={[type.body, { color: colors.heading, padding: 0, minHeight: 64, textAlignVertical: 'top' }]}
            />
          </View>

          <Text style={[type.label, { color: colors.dim, marginTop: 22 }]}>START FROM</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md }}>
            <Chip label="✦ AI PLAN" on={source === 'ai'} onPress={() => pickSource('ai')} />
            <Chip label="STARTER AREAS" on={source === 'starter'} onPress={() => pickSource('starter')} />
            {templates.map((t) => (
              <Chip
                key={t.id}
                label={t.name.toUpperCase()}
                on={source === t.id}
                badge={pro ? undefined : 'PRO'}
                onPress={() => pickSource(t.id)}
                onLongPress={() => {
                  haptic.hold();
                  setDeleting(t);
                }}
              />
            ))}
          </View>

          {source === 'ai' ? (
            <>
              <Text style={[type.label, { color: colors.dim, marginTop: 22, marginBottom: space.sm }]}>
                WHAT I ALREADY HAVE  <Text style={{ color: colors.faint }}>· OPTIONAL</Text>
              </Text>
              <View style={[field, focused === 'have' && shared.focusRing]}>
                <TextInput
                  value={have}
                  onChangeText={(t) => {
                    setHave(t);
                    if (draft) setDraft(null);
                    if (ideas) setIdeas(null); // the ideas were for the old parts list
                  }}
                  onFocus={() => setFocused('have')}
                  onBlur={() => setFocused(null)}
                  placeholder="e.g. Arduino Uno, L298N motor driver, 2 DC motors, 4 wheels, an LED"
                  placeholderTextColor={colors.faint}
                  cursorColor={colors.accent}
                  selectionColor="rgba(244,60,20,0.45)"
                  keyboardAppearance="dark"
                  multiline
                  maxLength={400}
                  style={[type.body, { color: colors.heading, padding: 0, minHeight: 52, textAlignVertical: 'top' }]}
                />
              </View>
              <Text style={[type.foot, { color: colors.faint, marginTop: space.sm }]}>
                List the parts you own and FORGE builds the plan around them — and leaves them off the parts list.
              </Text>

              {/* Don't know what to make? Let the parts decide. */}
              {have.trim() && !draft ? (
                ideas ? (
                  <View style={[aiBox, { marginTop: space.md }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space.sm }}>
                      <Text style={[type.label, { color: colors.accent, flex: 1 }]}>✦ YOU COULD BUILD</Text>
                      <LinkButton label="HIDE" onPress={() => setIdeas(null)} />
                    </View>
                    {ideas.map((idea) => (
                      <Press
                        key={idea.name}
                        onPress={() => useIdea(idea)}
                        scaleTo={0.98}
                        accessibilityRole="button"
                        accessibilityLabel={`Use idea: ${idea.name}`}
                        style={{ paddingVertical: 9 }}
                      >
                        <Text style={[type.area, { fontSize: 13, color: colors.soft }]}>{idea.name.toUpperCase()}</Text>
                        <Text style={[type.bodySm, { color: colors.dim, marginTop: 3 }]}>{idea.blurb}</Text>
                      </Press>
                    ))}
                    <Text style={[type.foot, { color: colors.faint, marginTop: space.sm }]}>
                      Tap one to fill in the form, then draft its plan.
                    </Text>
                  </View>
                ) : (
                  <Press
                    onPress={askForIdeas}
                    disabled={ideasBusy}
                    accessibilityRole="button"
                    accessibilityLabel="What can I build with these parts?"
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: space.md,
                      paddingVertical: 13,
                      borderRadius: radius.md,
                      borderCurve: 'continuous',
                      borderWidth: 1,
                      borderColor: 'rgba(244,60,20,0.35)',
                      backgroundColor: 'rgba(244,60,20,0.05)',
                    }}
                  >
                    {ideasBusy ? (
                      <LedLoader size={7} />
                    ) : (
                      <Text style={[type.tab, { fontSize: 12, letterSpacing: 1.7, color: colors.accent }]}>
                        ✦ WHAT CAN I BUILD?
                      </Text>
                    )}
                  </Press>
                )
              ) : null}

              <AiPlan draft={draft} drafting={drafting} left={aiLeft} onRedraft={draftPlan} />
            </>
          ) : null}

          {template ? (
            <Text style={[type.bodySm, { color: colors.faint, marginTop: space.md }]}>
              {describeStructure(template.structure)} copied from {template.name}. Every task starts unticked.
            </Text>
          ) : null}

          {source === 'starter' ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 22 }}>
                <Text style={[type.label, { color: colors.dim, flex: 1 }]}>STARTER AREAS</Text>
                <Text style={[type.label, { letterSpacing: 1.1, color: colors.accent }]}>{picked.length} PICKED</Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md }}>
                {STARTER_AREAS.map((area) => (
                  <Chip key={area} label={area.toUpperCase()} on={picked.includes(area)} onPress={() => toggle(area)} />
                ))}
              </View>
              <Text style={[type.bodySm, { color: colors.faint, marginTop: space.md }]}>
                FORGE adds starter tasks inside each area you keep. You can edit everything after.
              </Text>
            </>
          ) : null}

          {error ? <Text style={[type.bodySm, { color: colors.danger, marginTop: space.lg }]}>{error}</Text> : null}

          <PrimaryButton
            label={source === 'ai' && !draft ? '✦ DRAFT MY PLAN' : 'BUILD BLUEPRINT'}
            icon={source === 'ai' && !draft ? undefined : 'arrow'}
            busy={busy || drafting}
            onPress={build}
            style={{ marginTop: 22 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Long-press a template to delete it */}
      <Sheet open={deleting !== null} onClose={() => setDeleting(null)} title={`DELETE ${deleting?.name.toUpperCase() ?? ''}?`}>
        {deleting ? (
          <ConfirmForm
            message="Builds you already made from it stay exactly as they are."
            confirmLabel="DELETE TEMPLATE"
            onCancel={() => setDeleting(null)}
            onConfirm={async () => {
              const { error: deleteError } = await deleteTemplate(deleting.id);
              if (deleteError) {
                haptic.reject();
                setToast({ message: "Couldn't delete it. Try again." });
              } else {
                haptic.confirm();
                setTemplates((current) => current.filter((t) => t.id !== deleting.id));
                if (source === deleting.id) setSource('ai');
              }
              setDeleting(null);
            }}
          />
        ) : null}
      </Sheet>
      <Toast toast={toast} onHide={() => setToast(null)} />
    </Screen>
  );
}

/**
 * The AI's plan, shown before you commit to it: every area and its
 * tasks. Nothing is saved until you press BUILD BLUEPRINT.
 */
function AiPlan({
  draft,
  drafting,
  left,
  onRedraft,
}: {
  draft: TemplateStructure | null;
  drafting: boolean;
  left: number | null;
  onRedraft: () => void;
}) {
  if (drafting) {
    return (
      <View style={[aiBox, { alignItems: 'center', paddingVertical: space.xxl }]}>
        <LedLoader size={8} label="FORGE IS PLANNING YOUR BUILD" />
      </View>
    );
  }
  if (!draft) {
    return (
      <View style={aiBox}>
        <Text style={[type.bodySm, { color: colors.dim }]}>
          FORGE reads your name and goal and drafts the areas and tasks for this exact build. The more detail in the
          goal, the sharper the plan.
        </Text>
      </View>
    );
  }
  return (
    <View style={aiBox}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space.md }}>
        <Text style={[type.label, { color: colors.accent, flex: 1 }]}>✦ {describeStructure(draft)}</Text>
        <LinkButton label="REDRAFT" onPress={onRedraft} />
      </View>
      {draft.areas.map((area) => (
        <View key={area.name} style={{ marginBottom: space.md }}>
          <Text style={[type.area, { fontSize: 13, color: colors.soft }]}>{area.name.toUpperCase()}</Text>
          {area.tasks.map((task, i) => (
            <Text key={i} style={[type.bodySm, { color: colors.dim, marginTop: 3 }]}>
              ○  {task}
            </Text>
          ))}
        </View>
      ))}
      <Text style={[type.foot, { color: colors.faint }]}>
        Nothing is saved yet. You can edit every task after you build.{left !== null ? ` ${left} AI uses left today.` : ''}
      </Text>
    </View>
  );
}

const aiBox = {
  marginTop: space.md,
  padding: space.lg,
  borderRadius: 13,
  borderCurve: 'continuous',
  borderWidth: 1,
  borderColor: 'rgba(244,60,20,0.35)',
  backgroundColor: 'rgba(244,60,20,0.05)',
} as const;

/** An area chip. Colours cross-fade (180ms) and it squeezes under your thumb. */
function Chip({
  label,
  on,
  onPress,
  onLongPress,
  badge,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  badge?: string;
}) {
  return (
    <Press
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      scaleTo={0.94}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
    >
      <Animated.View
        style={{
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: on ? 'rgba(244,60,20,0.7)' : 'rgba(255,255,255,0.1)',
          backgroundColor: on ? 'rgba(244,60,20,0.14)' : colors.field,
          transitionProperty: ['borderColor', 'backgroundColor'],
          transitionDuration: 180,
          transitionTimingFunction: curve.standard,
        }}
      >
        <Animated.Text
          style={[
            type.chip,
            { color: on ? colors.chipText : colors.dim, transitionProperty: 'color', transitionDuration: 180 },
          ]}
        >
          {label}
          {badge ? <Animated.Text style={{ color: colors.accent }}>{`  ${badge}`}</Animated.Text> : null}
        </Animated.Text>
      </Animated.View>
    </Press>
  );
}

const field = {
  paddingHorizontal: 15,
  paddingVertical: 13,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.09)',
  backgroundColor: colors.field,
} as const;
