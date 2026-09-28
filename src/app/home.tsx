/**
 * Home — your builds, as a shelf of folders (the Home v3 design).
 *
 * Top to bottom:
 *   GOOD EVENING, NAME   and "6 active builds · 59 open tasks"
 *   SEARCH               builds, areas and tasks, as you type
 *   NEXT UP              the pinned next step of the build you touched
 *                        last, so opening the app says what to do now
 *   MY BUILDS            two columns of folders; the right one sits
 *                        lower, which is what makes it look like a shelf
 *   ARCHIVED             folded away until you open it
 *
 * Four states, each designed rather than left to chance:
 *   loading — skeleton folders made of dim dots, breathing
 *   error   — SIGNAL LOST, with a RETRY that actually retries
 *   empty   — a dot grid with one pulsing dot, waiting for you
 *   ready   — the folders, fading in one after another
 *
 * New builds are started from the (+) in the bottom nav, so Home
 * doesn't need its own button for it (V2 of the design had two).
 */

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  BackHandler,
  Keyboard,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useFocusEffect, useRouter } from 'expo-router';
import { colors, fonts, shared, space, type } from '../theme';
import { curve, ease } from '../lib/motion';
import { useAuth } from '../lib/auth';
import {
  listProjects,
  searchAreasAndTasks,
  type AreaHit,
  type ProjectOverview,
  type TaskHit,
} from '../lib/projects';
import { timeAgo } from '../lib/time';
import { DotField } from '../components/art';
import { useNavSpace } from '../components/bottom-nav';
import { BuildIcon, Icon } from '../components/icons';
import { DashedButton, Press, PrimaryButton, Screen } from '../components/ui';

type Status = 'loading' | 'ready' | 'error';

/** How much lower the right-hand column of folders starts. */
const STAGGER = 56;
const DAY = 24 * 60 * 60 * 1000;

export default function HomeScreen() {
  const router = useRouter();
  const { displayName } = useAuth();
  const navSpace = useNavSpace();

  const [projects, setProjects] = useState<ProjectOverview[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    const result = await listProjects();
    setRefreshing(false);
    if (result.error) {
      // If we already have builds on screen, keep them rather than
      // replacing them with an error page over a hiccup.
      setStatus((current) => (current === 'ready' ? 'ready' : 'error'));
      return;
    }
    setProjects(result.projects);
    setStatus('ready');
  }, []);

  // Runs every time Home comes back into view, so ticking a task
  // elsewhere and coming back shows the new percentage.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // While you're searching, the phone's back button clears the search
  // instead of closing the app.
  useFocusEffect(
    useCallback(() => {
      if (!query) return;
      const listener = BackHandler.addEventListener('hardwareBackPress', () => {
        setQuery('');
        return true;
      });
      return () => listener.remove();
    }, [query])
  );

  const active = projects.filter((p) => p.status === 'active');
  const archived = projects.filter((p) => p.status === 'archived');
  const openTasks = active.reduce((sum, p) => sum + (p.total_tasks - p.done_tasks), 0);
  const name = (displayName || 'Builder').toUpperCase();
  const searching = query.trim().length > 0;

  // The list arrives newest activity first, so the first active build
  // with a pinned step is the one you were working on most recently.
  const nextUp = active.find((p) => p.next_step) ?? null;

  function openProject(id: string) {
    Keyboard.dismiss();
    router.push(`/project/${id}`);
  }

  function openArea(id: string, build: string) {
    Keyboard.dismiss();
    router.push({ pathname: '/area/[id]', params: { id, build } });
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: space.xl, paddingTop: 40, paddingBottom: navSpace }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.accent}
            colors={[colors.accent]}
            progressBackgroundColor={colors.nav}
          />
        }
      >
        <Text style={[type.greeting, { color: colors.heading }]} accessibilityRole="header">
          {greeting()},{'\n'}
          {name}
        </Text>

        {status === 'loading' ? <Loading /> : null}

        {status === 'error' ? (
          <SignalLost
            onRetry={() => {
              setStatus('loading');
              load();
            }}
          />
        ) : null}

        {status === 'ready' && active.length === 0 ? (
          <Empty onNew={() => router.push('/new-project')} />
        ) : null}

        {status === 'ready' && active.length > 0 ? (
          <>
            <Text style={[type.body, { color: colors.dim, marginTop: 10 }]}>
              {active.length} active {active.length === 1 ? 'build' : 'builds'} · {openTasks} open{' '}
              {openTasks === 1 ? 'task' : 'tasks'}
            </Text>

            <SearchField value={query} onChange={setQuery} />

            {searching ? (
              <SearchResults query={query} projects={projects} onOpenProject={openProject} onOpenArea={openArea} />
            ) : (
              <>
                {nextUp ? <NextUp project={nextUp} onPress={() => openProject(nextUp.id)} /> : null}

                <SectionTitle style={{ marginTop: 26 }}>MY BUILDS</SectionTitle>
                <FolderGrid projects={active} onOpen={openProject} />
              </>
            )}
          </>
        ) : null}

        {status === 'ready' && archived.length > 0 && !searching ? (
          <View style={{ marginTop: space.xxxl }}>
            <Press
              onPress={() => setShowArchived((open) => !open)}
              scaleTo={0.98}
              accessibilityRole="button"
              accessibilityState={{ expanded: showArchived }}
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: space.sm }}
            >
              <Text style={[type.label, { color: colors.label, flex: 1 }]}>ARCHIVED · {archived.length}</Text>
              <Text style={[type.label, { color: colors.label }]}>{showArchived ? 'HIDE' : 'SHOW'}</Text>
            </Press>
            {showArchived ? (
              <View style={{ opacity: 0.6 }}>
                <FolderGrid projects={archived} onOpen={openProject} />
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

// ---------------------------------------------------------------
// SEARCH
// ---------------------------------------------------------------

function SearchField({ value, onChange }: { value: string; onChange: (text: string) => void }) {
  const [focused, setFocused] = useState(false);
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          height: 52,
          marginTop: 22,
          paddingLeft: 14,
          paddingRight: value ? 2 : 14,
          borderRadius: 14,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: colors.folderLine,
          backgroundColor: colors.field,
        },
        focused && shared.focusRing,
      ]}
    >
      <Icon name="search" size={18} color={colors.nodeLine} />
      <TextInput
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Search builds, areas, tasks"
        placeholderTextColor={colors.off}
        cursorColor={colors.accent}
        selectionColor="rgba(244,60,20,0.45)"
        keyboardAppearance="dark"
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        maxLength={60}
        accessibilityLabel="Search builds, areas and tasks"
        style={[type.body, { flex: 1, fontSize: 15, lineHeight: undefined, color: colors.heading, padding: 0 }]}
      />
      {value ? (
        <Pressable
          onPress={() => onChange('')}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="close" size={14} color={colors.dim} />
        </Pressable>
      ) : null}
    </View>
  );
}

type Row = {
  key: string;
  kind: 'BUILD' | 'AREA' | 'TASK';
  title: string;
  sub: string;
  done?: boolean;
  onPress: () => void;
};

/**
 * Builds are matched straight away from the list already on screen.
 * Areas and tasks come from the database a quarter of a second after
 * you stop typing, from 2 letters up, so it doesn't send a request for
 * every key you press.
 */
function SearchResults({
  query,
  projects,
  onOpenProject,
  onOpenArea,
}: {
  query: string;
  projects: ProjectOverview[];
  onOpenProject: (id: string) => void;
  onOpenArea: (id: string, build: string) => void;
}) {
  const text = query.trim();
  const needle = text.toLowerCase();
  const [hits, setHits] = useState<{ areas: AreaHit[]; tasks: TaskHit[] }>({ areas: [], tasks: [] });
  const [state, setState] = useState<'waiting' | 'searching' | 'done' | 'failed'>('waiting');

  useEffect(() => {
    if (text.length < 2) {
      setHits({ areas: [], tasks: [] });
      setState('waiting');
      return;
    }
    let current = true; // false once a newer search has started
    setState('searching');
    const timer = setTimeout(async () => {
      const result = await searchAreasAndTasks(text);
      if (!current) return;
      setHits({ areas: result.areas, tasks: result.tasks });
      setState(result.error ? 'failed' : 'done');
    }, 250);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [text]);

  const buildName = new Map(projects.map((p) => [p.id, p.name]));
  const matches = (value: string) => value.toLowerCase().includes(needle);

  // The hits from the last search are filtered again by what's typed
  // NOW, so nothing that no longer matches lingers while you type.
  const rows: Row[] = [
    ...projects
      .filter((p) => matches(p.name))
      .map((p) => ({
        key: `b${p.id}`,
        kind: 'BUILD' as const,
        title: p.name,
        sub: `${plural(p.area_count, 'area')} · ${plural(p.total_tasks, 'task')}${p.status === 'archived' ? ' · archived' : ''}`,
        onPress: () => onOpenProject(p.id),
      })),
    ...hits.areas
      .filter((a) => matches(a.name))
      .map((a) => ({
        key: `a${a.id}`,
        kind: 'AREA' as const,
        title: a.name,
        sub: `${buildName.get(a.project_id) ?? ''} · ${plural(a.total_tasks, 'task')}`,
        onPress: () => onOpenArea(a.id, buildName.get(a.project_id) ?? ''),
      })),
    ...hits.tasks
      .filter((t) => matches(t.title))
      .map((t) => ({
        key: `t${t.id}`,
        kind: 'TASK' as const,
        title: t.title,
        sub: `${buildName.get(t.project_id) ?? ''} · ${t.area_name}`,
        done: t.status === 'done',
        onPress: () => onOpenArea(t.area_id, buildName.get(t.project_id) ?? ''),
      })),
  ];

  const label =
    rows.length > 0
      ? `${rows.length} ${rows.length === 1 ? 'RESULT' : 'RESULTS'}`
      : state === 'searching'
        ? 'SEARCHING'
        : 'NO MATCHES';

  return (
    <View>
      <SectionTitle style={{ marginTop: 26 }}>{label}</SectionTitle>
      {state === 'failed' ? (
        <Text style={[type.bodySm, { color: colors.danger, marginTop: space.sm }]}>
          Couldn&apos;t search areas and tasks. Check your connection.
        </Text>
      ) : null}
      <View style={{ gap: space.sm, marginTop: 14 }}>
        {rows.map((row) => (
          <Animated.View key={row.key} entering={FadeIn.duration(180)}>
            <ResultRow row={row} />
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

function ResultRow({ row }: { row: Row }) {
  return (
    <Press
      onPress={row.onPress}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={`${row.kind.toLowerCase()}: ${row.title}${row.done ? ', done' : ''}. ${row.sub}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        minHeight: 56,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: colors.tileLine,
        backgroundColor: colors.folder,
      }}
    >
      <Text style={[type.labelSm, { width: 46, fontFamily: fonts.displayBold, letterSpacing: 1.4, color: colors.accent }]}>
        {row.kind}
      </Text>
      <View style={{ flex: 1, gap: 3 }}>
        <Text
          style={[
            type.bodyBold,
            { color: row.done ? colors.off : colors.heading, textDecorationLine: row.done ? 'line-through' : 'none' },
          ]}
          numberOfLines={2}
        >
          {row.title}
        </Text>
        <Text style={[type.bodySm, { fontSize: 12, lineHeight: 16, color: colors.label }]} numberOfLines={1}>
          {row.sub}
        </Text>
      </View>
    </Press>
  );
}

// ---------------------------------------------------------------
// NEXT UP
// ---------------------------------------------------------------

/** The pinned next step of the build you touched last. Tap to open that build. */
function NextUp({ project, onPress }: { project: ProjectOverview; onPress: () => void }) {
  return (
    <Animated.View entering={FadeInDown.duration(360).easing(ease.decelerate)}>
      <Press
        onPress={onPress}
        scaleTo={0.98}
        accessibilityRole="button"
        accessibilityLabel={`Next up on ${project.name}: ${project.next_step}`}
        style={{
          marginTop: 18,
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderRadius: 14,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: colors.iconTileLine,
          backgroundColor: colors.accentFaint,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <View
            style={{
              width: 7,
              height: 7,
              borderRadius: 3.5,
              backgroundColor: colors.accent,
              boxShadow: '0 0 8px rgba(244,60,20,0.8)',
            }}
          />
          <Text style={[type.labelSm, { fontFamily: fonts.displayBold, color: colors.accent }]}>NEXT UP</Text>
          <Text style={[type.labelSm, { color: colors.label, flex: 1 }]} numberOfLines={1}>
            · {project.name.toUpperCase()}
          </Text>
          {project.next_step_at ? (
            <Text style={[type.labelSm, { color: colors.label }]}>{timeAgo(project.next_step_at)}</Text>
          ) : null}
        </View>
        <Text style={[type.bodyBold, { color: colors.heading, marginTop: space.sm }]} numberOfLines={2}>
          {project.next_step}
        </Text>
      </Press>
    </Animated.View>
  );
}

// ---------------------------------------------------------------
// THE FOLDERS
// ---------------------------------------------------------------

/**
 * Two columns: 1st, 3rd, 5th… builds on the left, 2nd, 4th… on the
 * right, which starts STAGGER lower. Reading left, right, left keeps
 * the newest activity first, as before.
 *
 * Two real columns rather than one grid with the right side nudged
 * down: if a long name makes one folder taller, only its own column
 * moves, and nothing ever overlaps.
 */
function FolderGrid({ projects, onOpen }: { projects: ProjectOverview[]; onOpen: (id: string) => void }) {
  const columns = [0, 1].map((side) => projects.filter((_, i) => i % 2 === side));
  return (
    <View style={{ flexDirection: 'row', gap: space.md, marginTop: 14 }}>
      {columns.map((column, side) => (
        <View key={side} style={{ flex: 1, gap: 18, paddingTop: side === 1 && column.length > 0 ? STAGGER : 0 }}>
          {column.map((project, row) => (
            <Animated.View
              key={project.id}
              // Fade in in reading order: left, right, left, right…
              entering={FadeInDown.delay((row * 2 + side) * 60)
                .duration(360)
                .easing(ease.decelerate)}
            >
              <Folder project={project} onPress={() => onOpen(project.id)} />
            </Animated.View>
          ))}
        </View>
      ))}
    </View>
  );
}

function Folder({ project, onPress }: { project: ProjectOverview; onPress: () => void }) {
  const isNew = Date.now() - new Date(project.created_at).getTime() < DAY;
  return (
    <Press
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        `${project.name}, ${project.percent} percent complete, ` +
        `${plural(project.area_count, 'area')}, ${plural(project.total_tasks, 'task')}` +
        (project.next_step ? `. Next step: ${project.next_step}` : '')
      }
    >
      <FolderTab />
      <View
        style={{
          minHeight: 132,
          padding: space.md,
          justifyContent: 'space-between',
          gap: 18,
          borderTopRightRadius: 14,
          borderBottomLeftRadius: 14,
          borderBottomRightRadius: 14,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: colors.folderLine,
          backgroundColor: colors.folder,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <View
            style={{
              width: 40,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 10,
              borderCurve: 'continuous',
              borderWidth: 1,
              borderColor: colors.iconTileLine,
              backgroundColor: colors.iconTile,
            }}
          >
            <BuildIcon name={project.icon} size={22} />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={[type.bodySm, folderMeta]}>{plural(project.area_count, 'area')}</Text>
            <Text style={[type.bodySm, folderMeta]}>{plural(project.total_tasks, 'task')}</Text>
          </View>
          {isNew ? <NewBadge /> : null}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.sm }}>
          <Text style={[folderName, { flex: 1, color: colors.heading }]} numberOfLines={3}>
            {project.name.toUpperCase()}
          </Text>
          <Text style={[folderName, { letterSpacing: 0, color: colors.accent }]}>{project.percent}%</Text>
        </View>
      </View>
    </Press>
  );
}

/**
 * The orange tab on top of each folder: a strip with a rounded
 * top-left corner and a slanted right edge. The flat part and the
 * slant are drawn separately so the corner never stretches, whatever
 * width the folder ends up.
 */
function FolderTab({ color = colors.accent }: { color?: string }) {
  return (
    <View style={{ width: '48%', height: 11, flexDirection: 'row' }}>
      <View style={{ flex: 82, backgroundColor: color, borderTopLeftRadius: 6 }} />
      <View style={{ flex: 18, marginLeft: -0.5 }}>
        <Svg width="100%" height="100%" viewBox="0 0 18 11" preserveAspectRatio="none">
          <Path d="M0 0 L18 11 L0 11 Z" fill={color} />
        </Svg>
      </View>
    </View>
  );
}

function NewBadge() {
  return (
    <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, backgroundColor: colors.accent }}>
      <Text style={[type.labelSm, { fontFamily: fonts.displayBold, fontSize: 9, lineHeight: 12, letterSpacing: 1.1, color: colors.onAccent }]}>
        NEW
      </Text>
    </View>
  );
}

function SectionTitle({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return (
    <Text
      style={[type.label, { fontFamily: fonts.displayBold, fontSize: 12, lineHeight: 15, letterSpacing: 1.9, color: colors.dim }, style]}
    >
      {children}
    </Text>
  );
}

const folderMeta = { fontSize: 12, lineHeight: 15, color: colors.dim } as const;
const folderName = { fontFamily: fonts.displayBold, fontSize: 14, lineHeight: 17, letterSpacing: 0.8, includeFontPadding: false } as const;

// ---------------------------------------------------------------
// STATES
// ---------------------------------------------------------------

const BREATHE = { '0%': { opacity: 0.55 }, '50%': { opacity: 1 }, '100%': { opacity: 0.55 } };

function breathe(delay: number) {
  return {
    animationName: BREATHE,
    animationDuration: 1600,
    animationDelay: delay,
    animationIterationCount: 'infinite' as const,
    animationTimingFunction: curve.pulse,
    animationFillMode: 'both' as const,
  };
}

/** A row of dim dots standing in for text that hasn't loaded. */
function DotLine({ width, color, r = 2.4, step = 10 }: { width: number; color: string; r?: number; step?: number }) {
  let path = '';
  for (let x = step / 2; x < width; x += step) {
    path += `M${x - r} ${r + 1}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0`;
  }
  return (
    <Svg width={width} height={r * 2 + 2}>
      <Path d={path} fill={color} />
    </Svg>
  );
}

/** Skeleton folders in the same staggered shelf, so nothing jumps when the real ones arrive. */
function Loading() {
  return (
    <View accessibilityLabel="Loading your builds">
      <Animated.View style={[{ marginTop: 14 }, breathe(0)]}>
        <DotLine width={190} color={colors.skeleton} />
      </Animated.View>
      <Animated.View
        style={[
          {
            height: 52,
            marginTop: 22,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.04)',
            backgroundColor: '#0E1012',
          },
          breathe(80),
        ]}
      />
      <View style={{ flexDirection: 'row', gap: space.md, marginTop: 55 }}>
        {[0, 1].map((side) => (
          <View key={side} style={{ flex: 1, gap: 18, paddingTop: side === 1 ? STAGGER : 0 }}>
            {[0, 1].map((row) => (
              <Animated.View key={row} style={breathe((row * 2 + side) * 160)}>
                <FolderTab color={colors.skeletonDim} />
                <View
                  style={{
                    minHeight: 132,
                    padding: space.md,
                    justifyContent: 'space-between',
                    borderTopRightRadius: 14,
                    borderBottomLeftRadius: 14,
                    borderBottomRightRadius: 14,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.04)',
                    backgroundColor: '#0E1012',
                  }}
                >
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: colors.skeletonDim }} />
                    <View style={{ gap: 9, paddingTop: 4 }}>
                      <DotLine width={48} color={colors.skeleton} r={2} step={8} />
                      <DotLine width={56} color={colors.skeleton} r={2} step={8} />
                    </View>
                  </View>
                  <DotLine width={100} color={colors.skeleton} />
                </View>
              </Animated.View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

function SignalLost({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', paddingVertical: space.huge }}>
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: colors.accent,
          boxShadow: '0 0 12px rgba(244,60,20,0.8)',
        }}
      />
      <Text
        style={[type.title, { fontSize: 34, lineHeight: 38, letterSpacing: 2, color: colors.heading, marginTop: 20 }]}
        accessibilityRole="header"
      >
        SIGNAL{'\n'}LOST
      </Text>
      <Text style={[type.body, { color: colors.dim, marginTop: 14 }]}>
        Couldn&apos;t load your builds. Nothing was lost.
      </Text>
      <PrimaryButton label="RETRY" icon="refresh" onPress={onRetry} style={{ marginTop: 28 }} />
    </View>
  );
}

function Empty({ onNew }: { onNew: () => void }) {
  return (
    <View style={{ flex: 1 }}>
      <View style={{ marginTop: 30 }}>
        <DotField height={280} />
      </View>
      <Text style={[type.area, { color: colors.dim, textAlign: 'center', marginTop: 22 }]}>
        waiting for your first build
      </Text>
      <DashedButton label="NEW BUILD" onPress={onNew} style={{ marginTop: 'auto', marginBottom: space.sm }} />
    </View>
  );
}

// ---------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'GOOD MORNING';
  if (hour < 17) return 'GOOD AFTERNOON';
  return 'GOOD EVENING';
}

/** "1 area", "6 areas" */
function plural(count: number, word: string) {
  return `${count} ${count === 1 ? word : `${word}s`}`;
}
