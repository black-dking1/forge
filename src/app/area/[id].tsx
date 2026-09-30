/**
 * Area Detail — one area of a build, and every task in it.
 *
 * This is where the real work happens:
 *   tap a task           tick / untick it
 *   swipe a task left    reveal DELETE (with UNDO afterwards)
 *   long-press a task    rename or delete it
 *   + ADD TASK           type, press enter, type the next one —
 *                        the keyboard stays up for fast entry
 *   ⋮ (top right)        rename or delete the whole area
 *   ✦ SUGGEST TASKS      the AI proposes 5 tasks for this area;
 *                        tap + to keep the ones you want
 *
 * Progress on this screen is counted from the tasks on screen, so
 * the ring and bar react the instant you tick something — no
 * waiting for the database to answer.
 */

import { useCallback, useRef, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { colors, keyboard, radius, shared, space, tint, type } from '../../theme';
import { ease } from '../../lib/motion';
import { haptic } from '../../lib/haptics';
import {
  addTask,
  deleteArea,
  deleteTask,
  getArea,
  listAreaTasks,
  renameArea,
  renameTask,
  restoreTask,
  setTaskStatus,
  type Area,
  type Task,
} from '../../lib/projects';
import { DotBar } from '../../components/dots';
import { Icon } from '../../components/icons';
import { TaskRow } from '../../components/task-row';
import { ConfirmForm, Menu, RenameForm, Sheet, SheetRow, Toast, type ToastData } from '../../components/overlays';
import { Header, LedLoader, LinkButton, Press, PrimaryButton, Screen } from '../../components/ui';
import { aiMessages, suggestTasks } from '../../lib/ai';

// A task on screen. `key` keeps a row's identity steady while a new
// task swaps its temporary id for the real one from the database —
// otherwise the row would vanish and reappear.
type Row = Task & { key?: string };

type SheetKind = 'rename-area' | 'delete-area' | 'task' | 'rename-task' | null;
type Status = 'loading' | 'ready' | 'missing' | 'error';

const byOrder = (a: Row, b: Row) => a.order_index - b.order_index;

export default function AreaScreen() {
  const params = useLocalSearchParams<{ id: string; build?: string }>();
  const id = params.id;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const [area, setArea] = useState<Area | null>(null);
  const [tasks, setTasks] = useState<Row[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [selected, setSelected] = useState<Row | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const [suggesting, setSuggesting] = useState(false);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const closeSheet = useCallback(() => setSheet(null), []);
  const hideToast = useCallback(() => setToast(null), []);

  const load = useCallback(async () => {
    if (!id) return;
    const [a, t] = await Promise.all([getArea(id), listAreaTasks(id)]);
    if (a.error || t.error) {
      setStatus((current) => (current === 'ready' ? 'ready' : 'error'));
      return;
    }
    if (!a.area) {
      setStatus('missing');
      return;
    }
    setArea(a.area);
    setTasks(t.tasks);
    setStatus('ready');
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function back() {
    if (router.canGoBack()) router.back();
    else router.replace('/home');
  }

  // ---------- tasks ----------

  async function toggle(task: Row) {
    if (task.id.startsWith('temp-')) return; // still being saved
    const next = task.status === 'done' ? 'todo' : 'done';
    setTasks((current) => current.map((t) => (t.id === task.id ? { ...t, status: next } : t)));

    const { error } = await setTaskStatus(task.id, next === 'done');
    if (error) {
      setTasks((current) => current.map((t) => (t.id === task.id ? { ...t, status: task.status } : t)));
      haptic.reject();
      setToast({ message: "Couldn't save that. Check your connection." });
    }
  }

  async function submitDraft() {
    const title = draft.trim();
    if (!title || !area) {
      setAdding(false);
      return;
    }
    setDraft('');
    const saved = await insertTask(title);
    if (!saved) setDraft(title);
  }

  /** Add one task: on screen straight away, then saved. Returns true if it saved. */
  async function insertTask(title: string) {
    if (!area) return false;
    // Show it straight away with a temporary id…
    const tempId = `temp-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const lastOrder = tasks.reduce((max, t) => Math.max(max, t.order_index), 0);
    setTasks((current) => [
      ...current,
      { id: tempId, key: tempId, project_id: area.project_id, area_id: area.id, title, notes: '', status: 'todo', order_index: lastOrder + 1 },
    ]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);

    // …then swap in the real row once the database has it.
    const { task, error } = await addTask(area.id, title);
    if (error || !task) {
      setTasks((current) => current.filter((t) => t.id !== tempId));
      haptic.reject();
      setToast({ message: "Couldn't add that task. Try again." });
      return false;
    }
    setTasks((current) => current.map((t) => (t.id === tempId ? { ...task, key: tempId } : t)));
    return true;
  }

  // ---------- ✦ AI suggestions ----------

  async function askForSuggestions() {
    if (!area || suggesting) return;
    setSuggesting(true);
    setSuggestions(null);
    const result = await suggestTasks(area.id);
    setSuggesting(false);
    if (result.error) {
      haptic.reject();
      setToast({ message: aiMessages[result.error] });
      return;
    }
    haptic.confirm();
    setSuggestions(result.tasks);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
  }

  async function keepSuggestion(title: string) {
    haptic.tick();
    setSuggestions((current) => (current ?? []).filter((t) => t !== title));
    await insertTask(title);
  }

  async function keepAllSuggestions() {
    const all = suggestions ?? [];
    setSuggestions(null);
    haptic.confirm();
    for (const title of all) {
      // one at a time, so they keep the AI's order
      await insertTask(title);
    }
  }

  async function removeTask(task: Row) {
    if (task.id.startsWith('temp-')) return; // still being saved
    setTasks((current) => current.filter((t) => t.id !== task.id));
    const { error } = await deleteTask(task.id);
    if (error) {
      setTasks((current) => [...current, task].sort(byOrder));
      haptic.reject();
      setToast({ message: "Couldn't delete that task." });
      return;
    }
    haptic.confirm();
    setToast({
      message: 'Task deleted.',
      actionLabel: 'UNDO',
      onAction: async () => {
        const { task: restored, error: restoreError } = await restoreTask(task);
        if (restoreError || !restored) {
          setToast({ message: "Couldn't bring it back." });
          return;
        }
        setTasks((current) => [...current, { ...restored, key: task.key ?? task.id }].sort(byOrder));
      },
    });
  }

  // ---------- states before the area has loaded ----------

  if (status === 'loading') {
    return (
      <Screen style={{ justifyContent: 'center' }}>
        <LedLoader label="LOADING AREA" />
      </Screen>
    );
  }

  if (status !== 'ready' || !area) {
    const missing = status === 'missing';
    return (
      <Screen style={{ padding: space.xl, justifyContent: 'center' }}>
        <Text style={[type.heading, { color: colors.heading }]}>{missing ? 'AREA NOT\nFOUND' : 'SIGNAL\nLOST'}</Text>
        <Text style={[type.body, { color: colors.dim, marginTop: 14 }]}>
          {missing ? 'It may have been deleted.' : "Couldn't load this area. Nothing was lost."}
        </Text>
        <PrimaryButton
          label={missing ? 'GO BACK' : 'RETRY'}
          icon={missing ? undefined : 'refresh'}
          onPress={() => {
            if (missing) return back();
            setStatus('loading');
            load();
          }}
          style={{ marginTop: 28 }}
        />
      </Screen>
    );
  }

  const total = tasks.length;
  const done = tasks.filter((t) => t.status === 'done').length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <Screen>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: space.xl, paddingTop: 22, paddingBottom: space.huge * 2 }}
        >
          <Header
            title={(params.build || 'BUILD').toUpperCase()}
            onBack={back}
            onMenu={() => setMenuOpen(true)}
            menuOpen={menuOpen}
          />

          <Text style={[type.title, { color: colors.heading, marginTop: 22 }]} accessibilityRole="header">
            {area.name.toUpperCase()}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.md, marginTop: space.lg }}>
            <Text style={[type.percent, { color: colors.accent }]}>{percent}%</Text>
            <Text style={[type.label, { letterSpacing: 1.3, color: colors.label }]}>
              {done} OF {total} DONE
            </Text>
          </View>
          <View style={{ marginTop: space.md }}>
            <DotBar percent={percent} />
          </View>

          <View style={{ gap: 9, marginTop: 22 }}>
            {tasks.map((task) => (
              <Animated.View
                key={task.key ?? task.id}
                entering={FadeInDown.duration(220).easing(ease.decelerate)}
                exiting={FadeOut.duration(160)}
                layout={LinearTransition.duration(220).easing(ease.standard)}
              >
                <ReanimatedSwipeable
                  friction={1.6}
                  rightThreshold={52}
                  overshootRight={false}
                  containerStyle={{ borderRadius: radius.md, borderCurve: 'continuous', overflow: 'hidden' }}
                  onSwipeableWillOpen={() => haptic.swipe()}
                  renderRightActions={(_progress, _translation, swipe) => (
                    <Pressable
                      onPress={() => {
                        swipe.close();
                        removeTask(task);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${task.title}`}
                      style={{
                        width: 104,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: space.sm,
                        paddingRight: space.xl,
                        backgroundColor: colors.dangerFill,
                      }}
                    >
                      <Icon name="trash" size={15} color="#FFFFFF" />
                      <Text style={[type.tab, { fontSize: 12, color: '#FFFFFF' }]}>DELETE</Text>
                    </Pressable>
                  )}
                >
                  <TaskRow
                    title={task.title}
                    done={task.status === 'done'}
                    onToggle={() => toggle(task)}
                    onLongPress={() => {
                      setSelected(task);
                      setSheet('task');
                    }}
                  />
                </ReanimatedSwipeable>
              </Animated.View>
            ))}
          </View>

          {total === 0 && !adding ? (
            <Text style={[type.body, { color: colors.dim, marginTop: 4, marginBottom: space.sm }]}>
              Nothing here yet. Add the first task.
            </Text>
          ) : null}

          {/* + ADD TASK */}
          {adding ? (
            <View
              style={[
                {
                  marginTop: space.md,
                  paddingTop: space.md,
                  paddingBottom: 14,
                  paddingHorizontal: space.lg,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  backgroundColor: colors.field,
                },
                shared.focusRing,
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <Icon name="plus" size={12} color={colors.accent} />
                <Text style={[type.tab, { color: colors.accent, letterSpacing: 1.5 }]}>ADD TASK</Text>
              </View>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                autoFocus
                placeholder={`Add a task to ${area.name}`}
                placeholderTextColor={colors.faint}
                cursorColor={colors.accent}
                keyboardAppearance={keyboard()}
                selectionColor={tint(0.35)}
                returnKeyType="done"
                submitBehavior="submit"
                onSubmitEditing={submitDraft}
                onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 250)}
                onBlur={() => {
                  if (!draft.trim()) setAdding(false);
                }}
                maxLength={140}
                style={[type.task, { color: colors.heading, padding: 0, marginTop: space.sm }]}
              />
            </View>
          ) : (
            <Press
              onPress={() => setAdding(true)}
              accessibilityRole="button"
              accessibilityLabel="Add task"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.md,
                marginTop: space.md,
                paddingVertical: 15,
                paddingHorizontal: space.lg,
                borderRadius: radius.md,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: colors.lineDashed,
              }}
            >
              <Icon name="plus" size={17} color={colors.accent} />
              <Text style={[type.tab, { fontSize: 12, letterSpacing: 1.7, color: colors.dim }]}>ADD TASK</Text>
            </Press>
          )}

          {/* ✦ AI suggestions */}
          {suggestions && suggestions.length > 0 ? (
            <View
              style={{
                marginTop: space.lg,
                padding: space.lg,
                borderRadius: 13,
                borderCurve: 'continuous',
                borderWidth: 1,
                borderColor: tint(0.35),
                backgroundColor: tint(0.05),
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space.sm }}>
                <Text style={[type.label, { color: colors.accent, flex: 1 }]}>✦ SUGGESTED</Text>
                <LinkButton label="ADD ALL" onPress={keepAllSuggestions} />
              </View>
              {suggestions.map((title) => (
                <Press
                  key={title}
                  onPress={() => keepSuggestion(title)}
                  scaleTo={0.98}
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${title}`}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 10 }}
                >
                  <Icon name="plus" size={16} color={colors.accent} />
                  <Text style={[type.bodyBold, { color: colors.soft, flex: 1 }]}>{title}</Text>
                </Press>
              ))}
              <View style={{ marginTop: space.sm }}>
                <LinkButton label="DISMISS" onPress={() => setSuggestions(null)} />
              </View>
            </View>
          ) : (
            <Press
              onPress={askForSuggestions}
              disabled={suggesting}
              accessibilityRole="button"
              accessibilityLabel="Suggest tasks with AI"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: space.sm,
                marginTop: space.md,
                paddingVertical: 14,
                borderRadius: radius.md,
                borderCurve: 'continuous',
                borderWidth: 1,
                borderColor: tint(0.35),
                backgroundColor: tint(0.05),
              }}
            >
              {suggesting ? (
                <LedLoader size={7} />
              ) : (
                <Text style={[type.tab, { fontSize: 12, letterSpacing: 1.7, color: colors.accent }]}>✦ SUGGEST TASKS</Text>
              )}
            </Press>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ---------- ⋮ menu ---------- */}
      <Menu
        open={menuOpen}
        onClose={closeMenu}
        top={insets.top + 62}
        items={[
          { icon: 'pencil', label: 'Rename area', onPress: () => setSheet('rename-area') },
          { icon: 'trash', label: 'Delete area', danger: true, onPress: () => setSheet('delete-area') },
        ]}
      />

      {/* ---------- sheets ---------- */}
      <Sheet
        open={sheet !== null}
        onClose={closeSheet}
        title={
          sheet === 'rename-area'
            ? 'RENAME AREA'
            : sheet === 'delete-area'
              ? `DELETE ${area.name.toUpperCase()}?`
              : sheet === 'rename-task'
                ? 'RENAME TASK'
                : selected?.title.toUpperCase()
        }
      >
        {sheet === 'rename-area' ? (
          <RenameForm
            initial={area.name}
            placeholder="Area name"
            onCancel={closeSheet}
            onSave={async (name) => {
              const { error } = await renameArea(area.id, name);
              if (error) {
                haptic.reject();
                setToast({ message: "Couldn't rename it. Try again." });
                return;
              }
              haptic.confirm();
              setArea({ ...area, name });
              setSheet(null);
            }}
          />
        ) : null}

        {sheet === 'delete-area' ? (
          <ConfirmForm
            message={`This removes ${area.name} and its ${total} ${total === 1 ? 'task' : 'tasks'} for good. It can't be undone.`}
            confirmLabel="DELETE AREA"
            onCancel={closeSheet}
            onConfirm={async () => {
              const { error } = await deleteArea(area.id);
              if (error) {
                haptic.reject();
                setSheet(null);
                setToast({ message: "Couldn't delete it. Try again." });
                return;
              }
              haptic.confirm();
              setSheet(null);
              back();
            }}
          />
        ) : null}

        {sheet === 'task' && selected ? (
          <>
            <SheetRow icon="pencil" label="Rename task" onPress={() => setSheet('rename-task')} />
            <SheetRow
              icon="trash"
              label="Delete task"
              danger
              last
              onPress={() => {
                setSheet(null);
                removeTask(selected);
              }}
            />
          </>
        ) : null}

        {sheet === 'rename-task' && selected ? (
          <RenameForm
            initial={selected.title}
            placeholder="Task"
            onCancel={closeSheet}
            onSave={async (title) => {
              const { error } = await renameTask(selected.id, title);
              if (error) {
                haptic.reject();
                setToast({ message: "Couldn't rename it. Try again." });
                return;
              }
              haptic.confirm();
              setTasks((current) => current.map((t) => (t.id === selected.id ? { ...t, title } : t)));
              setSheet(null);
            }}
          />
        ) : null}
      </Sheet>

      <Toast toast={toast} onHide={hideToast} />
    </Screen>
  );
}
