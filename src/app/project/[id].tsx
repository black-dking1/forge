/**
 * One project, three tabs.
 *
 * The [id] in the filename is Expo Router's way of saying "this part
 * of the URL is a variable". /project/abc-123 loads this file with
 * id = "abc-123".
 *
 *   OVERVIEW  — the gauge, the numbers, progress per area
 *   BLUEPRINT — the tree: project, areas, tasks
 *   TASKS     — one flat list, tick things off
 *
 * All three read the same data, loaded once here and passed down.
 * Loading it per-tab would mean three round trips and a visible
 * flicker every time you switch.
 */

import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { colors, radius, shared, space, type } from '../../theme';
import {
  getProject,
  listAreas,
  listTasks,
  setTaskStatus,
  type Area,
  type ProjectOverview,
  type Task,
} from '../../lib/projects';
import { DotProgress, TaskDots } from '../../components/dots';
import { DotRing } from '../../components/dot-ring';

type Tab = 'overview' | 'blueprint' | 'tasks';

export default function ProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>('overview');
  const [project, setProject] = useState<ProjectOverview | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    // Three reads at once rather than one after another. They don't
    // depend on each other, so waiting for each in turn would make
    // the screen roughly three times slower to appear.
    const [p, a, t] = await Promise.all([
      getProject(id),
      listAreas(id),
      listTasks(id),
    ]);
    setProject(p.project);
    setAreas(a.areas);
    setTasks(t.tasks);
    setError(p.error ?? a.error ?? t.error);
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  /**
   * Ticking a task off.
   *
   * The change is drawn on screen FIRST, then sent to the database.
   * A checkbox that waits for a network round trip before it moves
   * feels broken, even when it's only 200ms.
   *
   * If the write fails we put it back and say so — an optimistic
   * update that silently keeps a lie is worse than no update at all.
   */
  async function toggle(task: Task) {
    const next = task.status === 'done' ? 'todo' : 'done';

    setTasks((current) =>
      current.map((t) => (t.id === task.id ? { ...t, status: next } : t))
    );

    const { error } = await setTaskStatus(task.id, next === 'done');

    if (error) {
      setTasks((current) =>
        current.map((t) => (t.id === task.id ? { ...t, status: task.status } : t))
      );
      setError(error);
      return;
    }

    // Reload so the percentages come from the database's own
    // calculation rather than us doing the arithmetic twice and
    // risking the two disagreeing.
    load();
  }

  if (loading) {
    return (
      <SafeAreaView style={[shared.screen, { justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  if (!project) {
    return (
      <SafeAreaView style={[shared.screen, { padding: space.xl, justifyContent: 'center' }]}>
        <Text style={[type.screen, { color: colors.textDim, textAlign: 'center' }]}>
          BUILD NOT FOUND
        </Text>
        <Pressable onPress={() => router.replace('/home')} style={{ marginTop: space.xl }}>
          <Text style={[type.label, { color: colors.accent, textAlign: 'center' }]}>
            ← BACK TO BUILDS
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={shared.screen} edges={['top']}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: space.xl,
          paddingBottom: space.lg,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, flex: 1 }}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={[type.screen, { color: colors.text }]}>←</Text>
          </Pressable>
          <Text style={[type.label, { color: colors.text, flex: 1 }]} numberOfLines={1}>
            {project.name.toUpperCase()}
          </Text>
        </View>
        <View
          style={{
            paddingHorizontal: space.md,
            paddingVertical: space.xs,
            borderRadius: radius.pill,
            borderWidth: 1,
            borderColor: colors.accent,
          }}
        >
          <Text style={[type.labelSm, { color: colors.accent }]}>
            {project.status.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View
        style={{
          flexDirection: 'row',
          marginHorizontal: space.xl,
          backgroundColor: colors.surface,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: colors.border,
          padding: space.xs,
        }}
      >
        {(['overview', 'blueprint', 'tasks'] as Tab[]).map((t) => {
          const active = tab === t;
          return (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
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
                  type.labelSm,
                  { color: active ? colors.text : colors.textFaint },
                ]}
              >
                {t.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: space.xl, paddingBottom: space.xxxl }}
      >
        {error && (
          <Text style={[type.bodySm, { color: colors.danger, marginBottom: space.lg }]}>
            {error}
          </Text>
        )}

        {tab === 'overview' && <Overview project={project} areas={areas} />}
        {tab === 'blueprint' && <Blueprint project={project} areas={areas} tasks={tasks} onToggle={toggle} />}
        {tab === 'tasks' && <Tasks areas={areas} tasks={tasks} onToggle={toggle} />}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------
// OVERVIEW
// ---------------------------------------------------------------

function Overview({ project, areas }: { project: ProjectOverview; areas: Area[] }) {
  const days = Math.max(
    1,
    Math.ceil((Date.now() - new Date(project.created_at).getTime()) / 86400000)
  );

  return (
    <View>
      <DotRing percent={project.percent} />

      <View style={{ flexDirection: 'row', gap: space.md, marginTop: space.xl }}>
        <Stat label="TASKS" value={`${project.done_tasks}/${project.total_tasks}`} />
        <Stat label="AREAS" value={String(project.area_count)} />
        <Stat label="DAYS" value={String(days)} />
      </View>

      {project.goal ? (
        <View style={[shared.card, { marginTop: space.lg }]}>
          <Text style={[type.labelSm, { color: colors.textFaint, marginBottom: space.sm }]}>
            GOAL
          </Text>
          <Text style={[type.body, { color: colors.textDim }]}>{project.goal}</Text>
        </View>
      ) : null}

      <Text
        style={[
          type.labelSm,
          { color: colors.textFaint, marginTop: space.xl, marginBottom: space.md },
        ]}
      >
        PROGRESS BY AREA
      </Text>

      {areas.map((a) => (
        <View key={a.id} style={[shared.card, { marginBottom: space.sm }]}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: space.md,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <View
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 1.5,
                  backgroundColor: a.percent === 100 ? colors.accent : colors.todo,
                }}
              />
              <Text style={[type.labelSm, { color: colors.text }]}>
                {a.name.toUpperCase()}
              </Text>
            </View>
            <Text style={[type.labelSm, { color: colors.accent }]}>{a.percent}%</Text>
          </View>
          <DotProgress percent={a.percent} count={24} />
        </View>
      ))}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={[shared.card, { flex: 1, paddingVertical: space.md }]}>
      <Text style={[type.labelSm, { color: colors.textFaint, marginBottom: space.xs }]}>
        {label}
      </Text>
      <Text style={[type.screen, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

// ---------------------------------------------------------------
// BLUEPRINT
// ---------------------------------------------------------------
//
// The tree. Project at the top, areas hanging off a spine, and
// tapping an area opens its tasks in place.
//
// That last part is what stops this being a prettier copy of the
// Overview tab: expanded, it shows all three levels of FORGE's
// structure at once, which is the whole idea of the app.

function Blueprint({
  project,
  areas,
  tasks,
  onToggle,
}: {
  project: ProjectOverview;
  areas: Area[];
  tasks: Task[];
  onToggle: (t: Task) => void;
}) {
  const [open, setOpen] = useState<string | null>(areas[0]?.id ?? null);

  return (
    <View style={shared.card}>
      {/* Root node */}
      <View
        style={{
          alignSelf: 'center',
          paddingHorizontal: space.lg,
          paddingVertical: space.md,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.accent,
          backgroundColor: colors.accentDim,
          marginBottom: space.md,
        }}
      >
        <Text style={[type.labelSm, { color: colors.accent }]}>
          {project.name.toUpperCase()}
        </Text>
      </View>

      {areas.map((a, i) => {
        const isOpen = open === a.id;
        const areaTasks = tasks.filter((t) => t.area_id === a.id);
        const last = i === areas.length - 1;

        return (
          <View key={a.id} style={{ flexDirection: 'row' }}>
            {/* The spine running down the left */}
            <View style={{ width: 22, alignItems: 'center' }}>
              <View
                style={{
                  width: 1,
                  flex: 1,
                  backgroundColor: last ? 'transparent' : colors.border,
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  top: 18,
                  width: 9,
                  height: 9,
                  borderRadius: 2,
                  backgroundColor: a.percent === 100 ? colors.accent : colors.todo,
                }}
              />
            </View>

            <View style={{ flex: 1, paddingBottom: space.md }}>
              <Pressable
                onPress={() => setOpen(isOpen ? null : a.id)}
                style={{
                  borderWidth: 1,
                  borderColor: isOpen ? colors.accent : colors.border,
                  borderRadius: radius.md,
                  paddingHorizontal: space.md,
                  paddingVertical: space.md,
                  backgroundColor: colors.surfaceHigh,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Text style={[type.labelSm, { color: colors.text }]}>
                    {a.name.toUpperCase()}
                  </Text>
                  <Text style={[type.labelSm, { color: colors.accent }]}>{a.percent}%</Text>
                </View>
              </Pressable>

              <View style={{ marginTop: space.sm }}>
                <TaskDots total={a.total_tasks} done={a.done_tasks} />
              </View>

              {/* Level three: the tasks themselves */}
              {isOpen &&
                areaTasks.map((t) => (
                  <Pressable
                    key={t.id}
                    onPress={() => onToggle(t)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: space.sm,
                      paddingVertical: space.sm,
                      paddingLeft: space.md,
                      marginTop: space.xs,
                    }}
                  >
                    <Checkbox done={t.status === 'done'} small />
                    <Text
                      style={[
                        type.bodySm,
                        {
                          color: t.status === 'done' ? colors.textFaint : colors.textDim,
                          textDecorationLine: t.status === 'done' ? 'line-through' : 'none',
                          flex: 1,
                        },
                      ]}
                    >
                      {t.title}
                    </Text>
                  </Pressable>
                ))}
            </View>
          </View>
        );
      })}

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          gap: space.lg,
          marginTop: space.md,
        }}
      >
        <Legend colour={colors.accent} label="DONE" />
        <Legend colour={colors.todo} label="OPEN" />
      </View>
    </View>
  );
}

function Legend({ colour, label }: { colour: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
      <View style={{ width: 7, height: 7, borderRadius: 1.5, backgroundColor: colour }} />
      <Text style={[type.labelSm, { color: colors.textFaint }]}>{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------
// TASKS
// ---------------------------------------------------------------

function Tasks({
  areas,
  tasks,
  onToggle,
}: {
  areas: Area[];
  tasks: Task[];
  onToggle: (t: Task) => void;
}) {
  // Look up an area's name without searching the list for every
  // single task row.
  const areaName = new Map(areas.map((a) => [a.id, a.name]));

  if (tasks.length === 0) {
    return (
      <View style={[shared.card, { alignItems: 'center', paddingVertical: space.xxl }]}>
        <Text style={[type.bodySm, { color: colors.textFaint }]}>
          No tasks in this build yet.
        </Text>
      </View>
    );
  }

  return (
    <View>
      {tasks.map((t) => (
        <Pressable
          key={t.id}
          onPress={() => onToggle(t)}
          style={({ pressed }) => [
            shared.card,
            {
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.md,
              marginBottom: space.sm,
              paddingVertical: space.md,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Checkbox done={t.status === 'done'} />
          <View style={{ flex: 1 }}>
            <Text
              style={[
                type.body,
                {
                  color: t.status === 'done' ? colors.textFaint : colors.text,
                  textDecorationLine: t.status === 'done' ? 'line-through' : 'none',
                },
              ]}
            >
              {t.title}
            </Text>
            <Text style={[type.labelSm, { color: colors.textFaint, marginTop: 2 }]}>
              {(areaName.get(t.area_id) ?? '').toUpperCase()}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function Checkbox({ done, small }: { done: boolean; small?: boolean }) {
  const size = small ? 16 : 22;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.sm,
        borderWidth: 1.5,
        borderColor: done ? colors.accent : colors.todo,
        backgroundColor: done ? colors.accent : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {done && (
        <Text style={{ color: '#fff', fontSize: small ? 10 : 13, fontWeight: '700' }}>
          ✓
        </Text>
      )}
    </View>
  );
}
