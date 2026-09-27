/**
 * Home — your builds.
 *
 * Four states, each designed rather than left to chance:
 *   loading — skeleton cards made of dim dots, breathing
 *   error   — SIGNAL LOST, with a RETRY that actually retries
 *   empty   — a dot grid with one pulsing dot, waiting for you
 *   ready   — the build cards, fading in one after another
 *
 * Data comes from the project_overview view: name, percent, area
 * count, task count and last activity in a single query. Each card
 * also shows the build's pinned next step, if it has one.
 */

import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useFocusEffect, useRouter } from 'expo-router';
import { colors, shared, space, type } from '../theme';
import { curve, ease } from '../lib/motion';
import { useAuth } from '../lib/auth';
import { listProjects, type ProjectOverview } from '../lib/projects';
import { timeAgo } from '../lib/time';
import { DotBar } from '../components/dots';
import { DotField } from '../components/art';
import { useNavSpace } from '../components/bottom-nav';
import { DashedButton, Press, PrimaryButton, Screen } from '../components/ui';

type Status = 'loading' | 'ready' | 'error';

export default function HomeScreen() {
  const router = useRouter();
  const { displayName } = useAuth();
  const navSpace = useNavSpace();

  const [projects, setProjects] = useState<ProjectOverview[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

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

  const active = projects.filter((p) => p.status === 'active');
  const archived = projects.filter((p) => p.status === 'archived');
  const openTasks = active.reduce((sum, p) => sum + (p.total_tasks - p.done_tasks), 0);
  const name = (displayName || 'Builder').toUpperCase();

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: space.xl, paddingTop: 40, paddingBottom: navSpace }}
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

            <View style={{ gap: space.md, marginTop: space.xxl }}>
              {active.map((project, i) => (
                <Animated.View
                  key={project.id}
                  entering={FadeInDown.delay(i * 60).duration(360).easing(ease.decelerate)}
                >
                  <BuildCard
                    project={project}
                    number={i + 1}
                    onPress={() => router.push(`/project/${project.id}`)}
                  />
                </Animated.View>
              ))}
            </View>

            <DashedButton label="NEW PROJECT" onPress={() => router.push('/new-project')} style={{ marginTop: 18 }} />
          </>
        ) : null}

        {status === 'ready' && archived.length > 0 ? (
          <View style={{ marginTop: space.xxl }}>
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
              <View style={{ gap: space.md, marginTop: space.sm, opacity: 0.6 }}>
                {archived.map((project, i) => (
                  <BuildCard
                    key={project.id}
                    project={project}
                    number={i + 1}
                    onPress={() => router.push(`/project/${project.id}`)}
                  />
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function BuildCard({
  project,
  number,
  onPress,
}: {
  project: ProjectOverview;
  number: number;
  onPress: () => void;
}) {
  return (
    <Press
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        `${project.name}, ${project.percent} percent complete` +
        (project.next_step ? `. Next step: ${project.next_step}` : '')
      }
      style={[shared.heroCard, { padding: 18 }]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
        <Text style={[type.label, { color: colors.label }]}>{String(number).padStart(2, '0')}</Text>
        <Text style={[type.cardTitle, { color: colors.heading, flex: 1 }]} numberOfLines={1}>
          {project.name.toUpperCase()}
        </Text>
        <Text style={[type.cardPercent, { color: colors.accent }]}>{project.percent}%</Text>
      </View>
      <View style={{ marginTop: 14 }}>
        <DotBar percent={project.percent} />
      </View>
      <View style={{ flexDirection: 'row', gap: space.lg, marginTop: space.md }}>
        <Text style={[type.label, { letterSpacing: 1.1, color: colors.label }]}>{project.area_count} AREAS</Text>
        <Text style={[type.label, { letterSpacing: 1.1, color: colors.label }]}>{project.total_tasks} TASKS</Text>
        <Text style={[type.label, { letterSpacing: 1.1, color: colors.label }]}>{timeAgo(project.updated_at)}</Text>
      </View>
      {project.next_step ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.sm,
            marginTop: space.md,
            paddingTop: space.md,
            borderTopWidth: 1,
            borderColor: colors.line,
          }}
        >
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent }} />
          <Text style={[type.labelSm, { color: colors.accent }]}>NEXT</Text>
          <Text style={[type.bodySm, { color: colors.soft, flex: 1 }]} numberOfLines={1}>
            {project.next_step}
          </Text>
        </View>
      ) : null}
    </Press>
  );
}

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

function Loading() {
  return (
    <View accessibilityLabel="Loading your builds">
      <Animated.View style={[{ marginTop: 14 }, breathe(0)]}>
        <DotLine width={190} color={colors.skeleton} />
      </Animated.View>
      <View style={{ gap: space.md, marginTop: 26 }}>
        {[0, 1, 2].map((i) => (
          <Animated.View
            key={i}
            style={[
              {
                padding: 18,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.04)',
                backgroundColor: '#0E1012',
              },
              breathe(i * 160),
            ]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <DotLine width={150} color={colors.skeleton} r={2.8} step={11} />
              <DotLine width={44} color="#3A2019" r={2.8} step={11} />
            </View>
            <View style={{ marginTop: 16 }}>
              <DotLine width={280} color={colors.skeletonDim} r={2.6} />
            </View>
            <View style={{ marginTop: 14 }}>
              <DotLine width={200} color={colors.gridDot} r={2} step={9} />
            </View>
          </Animated.View>
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

// timeAgo ("2H AGO", "3D AGO") now lives in lib/time.ts, shared with
// the next-step card on the Overview tab.
