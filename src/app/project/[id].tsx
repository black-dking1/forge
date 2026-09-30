/**
 * One build, three tabs.
 *
 * The [id] in the filename is Expo Router's way of saying "this part
 * of the address is a variable": /project/abc-123 opens this file
 * with id = "abc-123". An optional ?tab=blueprint picks the starting
 * tab — that's how a brand-new build lands on its blueprint.
 *
 *   OVERVIEW  — the ring, the numbers, your next step, progress per area
 *   BLUEPRINT — the tree, which assembles itself as it opens
 *   TASKS     — every task in one list; tap to tick
 *
 * The ⋮ menu (top right) holds share, save as template (both Pro),
 * rename, change icon, add area, archive and delete.
 */

import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { colors, shared, space, tint, type } from '../../theme';
import { haptic } from '../../lib/haptics';
import { usePro } from '../../lib/pro';
import {
  addArea,
  deleteProject,
  getInventory,
  getProject,
  listAreas,
  listTasks,
  renameProject,
  setProjectIcon,
  saveTemplate,
  setInventory,
  setNextStep,
  setProjectArchived,
  setTaskStatus,
  toStructure,
  type Area,
  type ProjectOverview,
  type Task,
} from '../../lib/projects';
import { Blueprint } from '../../components/blueprint';
import { DotBar } from '../../components/dots';
import { DotRing } from '../../components/dot-ring';
import { PillTabs } from '../../components/pill-tabs';
import { TaskRow } from '../../components/task-row';
import {
  ConfirmForm,
  InventoryForm,
  NextStepForm,
  RenameForm,
  Sheet,
  SheetRow,
  Toast,
  type ToastData,
} from '../../components/overlays';
import { Icon } from '../../components/icons';
import { IconForm } from '../../components/icon-picker';
import { Header, LedLoader, Press, PrimaryButton, Screen, SectionLabel, Tag } from '../../components/ui';
import { timeAgo } from '../../lib/time';

type Tab = 'overview' | 'blueprint' | 'tasks';
type SheetKind = 'menu' | 'rename' | 'icon' | 'add-area' | 'template' | 'inventory' | 'next-step' | 'delete' | null;
type Status = 'loading' | 'ready' | 'missing' | 'error';

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'OVERVIEW' },
  { key: 'blueprint', label: 'BLUEPRINT' },
  { key: 'tasks', label: 'TASKS' },
];

export default function ProjectScreen() {
  const params = useLocalSearchParams<{ id: string; tab?: string }>();
  const id = params.id;
  const router = useRouter();
  const pro = usePro();

  const [tab, setTab] = useState<Tab>(
    params.tab === 'blueprint' || params.tab === 'tasks' ? params.tab : 'overview'
  );
  const [project, setProject] = useState<ProjectOverview | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [inventory, setInventoryText] = useState(''); // "parts you have", loaded when the sheet opens
  const [toast, setToast] = useState<ToastData | null>(null);

  const closeSheet = useCallback(() => setSheet(null), []);
  const hideToast = useCallback(() => setToast(null), []);

  const load = useCallback(async () => {
    if (!id) return;
    // Three reads at once rather than one after another — they don't
    // depend on each other, so waiting for each in turn would make
    // the screen about three times slower to appear.
    const [p, a, t] = await Promise.all([getProject(id), listAreas(id), listTasks(id)]);

    if (p.error || a.error || t.error) {
      setStatus((current) => (current === 'ready' ? 'ready' : 'error'));
      return;
    }
    if (!p.project) {
      setStatus('missing');
      return;
    }
    setProject(p.project);
    setAreas(a.areas);
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

  /**
   * Ticking a task off.
   *
   * The change is drawn FIRST, then sent to the database. A checkbox
   * that waits for the network before it moves feels broken. If the
   * write fails we put it back and say so — an optimistic update
   * that silently keeps a lie is worse than none.
   */
  async function toggle(task: Task) {
    const next = task.status === 'done' ? 'todo' : 'done';
    setTasks((current) => current.map((t) => (t.id === task.id ? { ...t, status: next } : t)));

    const { error } = await setTaskStatus(task.id, next === 'done');
    if (error) {
      setTasks((current) => current.map((t) => (t.id === task.id ? { ...t, status: task.status } : t)));
      haptic.reject();
      setToast({ message: "Couldn't save that. Check your connection." });
      return;
    }
    // Percentages come back from the database's own count, so the
    // app never does the arithmetic twice and disagrees with itself.
    load();
  }

  function openArea(area: Area) {
    router.push({ pathname: '/area/[id]', params: { id: area.id, build: project?.name ?? '' } });
  }

  // ---------- states before the build has loaded ----------

  if (status === 'loading') {
    return (
      <Screen style={{ justifyContent: 'center' }}>
        <LedLoader label="LOADING BUILD" />
      </Screen>
    );
  }

  if (status === 'missing' || status === 'error' || !project) {
    const missing = status === 'missing';
    return (
      <Screen style={{ padding: space.xl, justifyContent: 'center' }}>
        <Text style={[type.heading, { color: colors.heading }]}>{missing ? 'BUILD NOT\nFOUND' : 'SIGNAL\nLOST'}</Text>
        <Text style={[type.body, { color: colors.dim, marginTop: 14 }]}>
          {missing ? 'It may have been deleted on another device.' : "Couldn't load this build. Nothing was lost."}
        </Text>
        {missing ? (
          <PrimaryButton label="BACK TO BUILDS" onPress={back} style={{ marginTop: 28 }} />
        ) : (
          <PrimaryButton
            label="RETRY"
            icon="refresh"
            onPress={() => {
              setStatus('loading');
              load();
            }}
            style={{ marginTop: 28 }}
          />
        )}
      </Screen>
    );
  }

  const archived = project.status === 'archived';

  // ---------- the build ----------

  return (
    <Screen>
      <View style={{ paddingHorizontal: space.xl, paddingTop: 22 }}>
        <Header
          title={project.name.toUpperCase()}
          onBack={back}
          onMenu={() => setSheet('menu')}
          menuOpen={sheet === 'menu'}
          right={archived ? <Tag label="ARCHIVED" tone="quiet" /> : null}
        />
        <View style={{ marginTop: space.xl }}>
          <PillTabs options={TABS} value={tab} onChange={setTab} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: space.xl, paddingTop: 14, paddingBottom: space.huge }}>
        {tab === 'overview' ? (
          <Overview
            project={project}
            areas={areas}
            onOpenArea={openArea}
            onEditNextStep={() => setSheet('next-step')}
          />
        ) : null}

        {tab === 'blueprint' ? (
          <View style={{ marginTop: 4 }}>
            <Blueprint name={project.name} areas={areas} tasks={tasks} onOpenArea={openArea} />
          </View>
        ) : null}

        {tab === 'tasks' ? (
          <View style={{ gap: 9, marginTop: 4 }}>
            {tasks.length === 0 ? (
              <Text style={[type.body, { color: colors.dim, textAlign: 'center', marginTop: space.xxl }]}>
                No tasks in this build yet. Open an area to add some.
              </Text>
            ) : (
              tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  title={task.title}
                  done={task.status === 'done'}
                  subtitle={(areas.find((a) => a.id === task.area_id)?.name ?? '').toUpperCase()}
                  onToggle={() => toggle(task)}
                />
              ))
            )}
          </View>
        ) : null}
      </ScrollView>

      {/* ---------- the ⋮ menu and what it opens ---------- */}

      <Sheet
        open={sheet !== null}
        onClose={closeSheet}
        title={
          sheet === 'rename'
            ? 'RENAME BUILD'
            : sheet === 'icon'
              ? 'BUILD ICON'
            : sheet === 'add-area'
              ? 'NEW AREA'
              : sheet === 'template'
                ? 'SAVE AS TEMPLATE'
              : sheet === 'inventory'
                ? 'PARTS YOU HAVE'
              : sheet === 'next-step'
                ? 'NEXT STEP'
              : sheet === 'delete'
                ? `DELETE ${project.name.toUpperCase()}?`
                : project.name.toUpperCase()
        }
      >
        {sheet === 'menu' ? (
          <>
            <SheetRow
              icon="share"
              label="Share blueprint"
              badge={pro ? undefined : 'PRO'}
              onPress={() => {
                setSheet(null);
                if (pro) router.push({ pathname: '/share/[id]', params: { id: project.id } });
                else router.push({ pathname: '/paywall', params: { reason: 'export' } });
              }}
            />
            <SheetRow
              icon="template"
              label="Save as template"
              badge={pro ? undefined : 'PRO'}
              onPress={() => {
                if (pro) setSheet('template');
                else {
                  setSheet(null);
                  router.push({ pathname: '/paywall', params: { reason: 'template' } });
                }
              }}
            />
            <SheetRow icon="pencil" label="Rename build" onPress={() => setSheet('rename')} />
            <SheetRow icon="image" label="Change icon" onPress={() => setSheet('icon')} />
            <SheetRow icon="plus" label="Add an area" onPress={() => setSheet('add-area')} />
            <SheetRow
              icon="text"
              label="Parts you have"
              onPress={async () => {
                const { inventory: saved } = await getInventory(project.id);
                setInventoryText(saved);
                setSheet('inventory');
              }}
            />
            <SheetRow
              icon={archived ? 'unarchive' : 'archive'}
              label={archived ? 'Restore build' : 'Archive build'}
              onPress={async () => {
                setSheet(null);
                const { error } = await setProjectArchived(project.id, !archived);
                if (error) {
                  haptic.reject();
                  setToast({ message: "Couldn't change that. Try again." });
                  return;
                }
                haptic.confirm();
                setToast(
                  archived
                    ? { message: 'Build restored.' }
                    : {
                        message: 'Archived. Find it under ARCHIVED on Home.',
                        actionLabel: 'UNDO',
                        onAction: async () => {
                          await setProjectArchived(project.id, false);
                          load();
                        },
                      }
                );
                load();
              }}
            />
            <SheetRow icon="trash" label="Delete build" danger last onPress={() => setSheet('delete')} />
          </>
        ) : null}

        {sheet === 'rename' ? (
          <RenameForm
            initial={project.name}
            placeholder="Build name"
            onCancel={closeSheet}
            onSave={async (name) => {
              const { error } = await renameProject(project.id, name);
              if (error) {
                haptic.reject();
                setToast({ message: "Couldn't rename it. Try again." });
                return;
              }
              haptic.confirm();
              setSheet(null);
              load();
            }}
          />
        ) : null}

        {sheet === 'icon' ? (
          <IconForm
            initial={project.icon}
            onCancel={closeSheet}
            onSave={async (icon) => {
              const { error } = await setProjectIcon(project.id, icon);
              if (error) {
                haptic.reject();
                setToast({ message: "Couldn't change the icon. Try again." });
                return;
              }
              haptic.confirm();
              setSheet(null);
              load();
            }}
          />
        ) : null}

        {sheet === 'add-area' ? (
          <RenameForm
            initial=""
            placeholder="e.g. Mechanics"
            saveLabel="ADD AREA"
            onCancel={closeSheet}
            onSave={async (name) => {
              const { error } = await addArea(project.id, name);
              if (error) {
                haptic.reject();
                setToast({ message: "Couldn't add that area. Try again." });
                return;
              }
              haptic.confirm();
              setSheet(null);
              load();
            }}
          />
        ) : null}

        {sheet === 'template' ? (
          <RenameForm
            initial={project.name}
            placeholder="Template name"
            saveLabel="SAVE TEMPLATE"
            onCancel={closeSheet}
            onSave={async (name) => {
              const { error } = await saveTemplate(name, toStructure(areas, tasks));
              if (error) {
                haptic.reject();
                setToast({ message: "Couldn't save the template. Try again." });
                return;
              }
              haptic.confirm();
              setSheet(null);
              setToast({ message: 'Template saved. Pick it when you start a new build.' });
            }}
          />
        ) : null}

        {sheet === 'inventory' ? (
          <InventoryForm
            initial={inventory}
            onCancel={closeSheet}
            onSave={async (text) => {
              const { error } = await setInventory(project.id, text);
              if (error) {
                haptic.reject();
                setToast({ message: "Couldn't save that. Try again." });
                return;
              }
              haptic.confirm();
              setSheet(null);
              setToast({ message: 'Saved. FORGE will plan around these parts.' });
            }}
          />
        ) : null}

        {sheet === 'next-step' ? (
          <NextStepForm
            initial={project.next_step}
            onCancel={closeSheet}
            onSave={async (text) => {
              const { error } = await setNextStep(project.id, text);
              if (error) {
                haptic.reject();
                setToast({ message: "Couldn't save that. Try again." });
                return;
              }
              haptic.confirm();
              setSheet(null);
              setToast({ message: text ? "Pinned. It'll be waiting on Home." : 'Next step cleared.' });
              load();
            }}
          />
        ) : null}

        {sheet === 'delete' ? (
          <ConfirmForm
            message={`This removes ${project.area_count} ${project.area_count === 1 ? 'area' : 'areas'} and ${project.total_tasks} ${project.total_tasks === 1 ? 'task' : 'tasks'} for good. It can't be undone.`}
            confirmLabel="DELETE BUILD"
            onCancel={closeSheet}
            onConfirm={async () => {
              const { error } = await deleteProject(project.id);
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
      </Sheet>

      <Toast toast={toast} onHide={hideToast} />
    </Screen>
  );
}

// ---------------------------------------------------------------
// OVERVIEW
// ---------------------------------------------------------------

function Overview({
  project,
  areas,
  onOpenArea,
  onEditNextStep,
}: {
  project: ProjectOverview;
  areas: Area[];
  onOpenArea: (area: Area) => void;
  onEditNextStep: () => void;
}) {
  const days = Math.max(1, Math.ceil((Date.now() - new Date(project.created_at).getTime()) / 86400000));

  return (
    <View>
      <DotRing percent={project.percent} />

      <View style={{ flexDirection: 'row', gap: 10, marginTop: space.sm }}>
        <Stat label="TASKS" value={`${project.done_tasks}/${project.total_tasks}`} />
        <Stat label="AREAS" value={String(project.area_count)} />
        <Stat label="DAYS" value={String(days)} />
      </View>

      <NextStep project={project} onEdit={onEditNextStep} />

      {project.goal ? (
        <View style={[shared.card, { padding: space.lg, marginTop: space.md }]}>
          <Text style={[type.labelSm, { color: colors.label }]}>GOAL</Text>
          <Text style={[type.body, { color: colors.soft, marginTop: 6 }]}>{project.goal}</Text>
        </View>
      ) : null}

      <SectionLabel style={{ marginTop: space.xl }}>PROGRESS BY AREA</SectionLabel>

      <View style={{ gap: 10, marginTop: space.md }}>
        {areas.length === 0 ? (
          <Text style={[type.body, { color: colors.dim }]}>No areas yet. Add one from the ⋮ menu.</Text>
        ) : (
          areas.map((area) => {
            const full = area.total_tasks > 0 && area.percent >= 100;
            return (
              <Press
                key={area.id}
                onPress={() => onOpenArea(area)}
                accessibilityRole="button"
                accessibilityLabel={`${area.name}, ${area.percent} percent. Open area`}
                style={[shared.card, { paddingVertical: 14, paddingHorizontal: space.lg }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: full ? colors.accent : colors.dotOff }} />
                  <Text style={[type.area, { color: colors.soft, flex: 1 }]} numberOfLines={1}>
                    {area.name.toUpperCase()}
                  </Text>
                  <Text style={[type.area, { letterSpacing: 0, color: full ? colors.accent : area.percent >= 50 ? colors.soft : colors.dim }]}>
                    {area.percent}%
                  </Text>
                </View>
                <View style={{ marginTop: 11 }}>
                  <DotBar percent={area.percent} />
                </View>
              </Press>
            );
          })
        )}
      </View>
    </View>
  );
}

/**
 * The pinned next step: what to do the next time you sit down to
 * build. Tap it to change it.
 *
 * With no step set, a quiet dashed prompt sits in its place, so there
 * is always something to tap.
 */
function NextStep({ project, onEdit }: { project: ProjectOverview; onEdit: () => void }) {
  if (!project.next_step) {
    return (
      <Press
        onPress={onEdit}
        accessibilityRole="button"
        accessibilityLabel="Pin your next step"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          marginTop: space.md,
          paddingVertical: 14,
          paddingHorizontal: space.lg,
          borderRadius: 13,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: colors.lineDashed,
        }}
      >
        <Icon name="plus" size={14} color={colors.dim} />
        <Text style={[type.label, { color: colors.dim }]}>PIN YOUR NEXT STEP</Text>
      </Press>
    );
  }

  return (
    <Press
      onPress={onEdit}
      accessibilityRole="button"
      accessibilityLabel={`Next step: ${project.next_step}. Tap to change it`}
      style={[
        shared.card,
        { marginTop: space.md, padding: space.lg, borderColor: colors.accentLine, backgroundColor: colors.accentFaint },
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View
          style={{
            width: 7,
            height: 7,
            borderRadius: 3.5,
            backgroundColor: colors.accent,
            boxShadow: `0 0 8px ${tint(0.8)}`,
          }}
        />
        <Text style={[type.labelSm, { color: colors.accent, flex: 1 }]}>NEXT STEP</Text>
        {project.next_step_at ? (
          <Text style={[type.labelSm, { color: colors.label }]}>SET {timeAgo(project.next_step_at)}</Text>
        ) : null}
        <Icon name="pencil" size={13} color={colors.dim} />
      </View>
      <Text style={[type.bodyBold, { color: colors.text, marginTop: 8 }]}>{project.next_step}</Text>
    </Press>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={[shared.card, { flex: 1, padding: 13, borderRadius: 12 }]}>
      <Text style={[type.labelSm, { color: colors.label }]}>{label}</Text>
      <Text style={[type.stat, { color: colors.soft, marginTop: 5 }]}>{value}</Text>
    </View>
  );
}
