/**
 * Home — the list of builds.
 *
 * Reads the project_overview view, which gives name, percent, area
 * count, task count and last-updated in a single query. Building this
 * from the raw tables would take three round trips and the counts
 * would have to be worked out on the phone.
 */

import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { colors, radius, shared, space, type } from '../theme';
import { useAuth } from '../lib/auth';
import { listProjects, type ProjectOverview } from '../lib/projects';
import { DotProgress } from '../components/dots';
import { BottomNav } from '../components/bottom-nav';

export default function HomeScreen() {
  const router = useRouter();
  const { displayName } = useAuth();
  const [projects, setProjects] = useState<ProjectOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { projects, error } = await listProjects();
    setProjects(projects);
    setError(error);
    setLoading(false);
    setRefreshing(false);
  }, []);

  // useFocusEffect rather than useEffect: this runs every time the
  // screen comes back into view, not just the first time. So ticking
  // a task on another screen and coming back shows the new percentage
  // instead of a stale one.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openTasks = projects.reduce((n, p) => n + (p.total_tasks - p.done_tasks), 0);

  return (
    <SafeAreaView style={shared.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: space.xl, paddingBottom: space.xxxl }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.accent}
          />
        }
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: space.xl,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Text style={[type.label, { color: colors.text }]}>FORGE</Text>
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: colors.accent,
              }}
            />
          </View>
          <Pressable onPress={() => router.push('/settings')} hitSlop={10}>
            <Text style={[type.labelSm, { color: colors.textFaint }]}>SETTINGS</Text>
          </Pressable>
        </View>

        {/* Greeting */}
        <Text style={[type.title, { color: colors.text }]}>
          {greeting()},
        </Text>
        <Text style={[type.title, { color: colors.text, marginBottom: space.sm }]}>
          {displayName.toUpperCase()}
        </Text>
        <Text style={[type.bodySm, { color: colors.textDim, marginBottom: space.xl }]}>
          {projects.length} active {projects.length === 1 ? 'build' : 'builds'} · {openTasks} open{' '}
          {openTasks === 1 ? 'task' : 'tasks'}
        </Text>

        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: space.xxl }} />
        ) : error ? (
          <View style={shared.card}>
            <Text style={[type.bodySm, { color: colors.danger }]}>{error}</Text>
          </View>
        ) : projects.length === 0 ? (
          <EmptyState />
        ) : (
          projects.map((p, i) => (
            <Pressable
              key={p.id}
              onPress={() => router.push(`/project/${p.id}`)}
              style={({ pressed }) => [
                shared.card,
                { marginBottom: space.md, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: space.md,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flex: 1 }}>
                  <Text style={[type.labelSm, { color: colors.textFaint }]}>
                    {String(i + 1).padStart(2, '0')}
                  </Text>
                  <Text
                    style={[type.screen, { color: colors.text, flex: 1 }]}
                    numberOfLines={1}
                  >
                    {p.name.toUpperCase()}
                  </Text>
                </View>
                <Text style={[type.label, { color: colors.accent }]}>{p.percent}%</Text>
              </View>

              <DotProgress percent={p.percent} />

              <Text
                style={[
                  type.labelSm,
                  { color: colors.textFaint, marginTop: space.md },
                ]}
              >
                {p.area_count} AREAS   {p.total_tasks} TASKS   {timeAgo(p.updated_at)}
              </Text>
            </Pressable>
          ))
        )}

        {/* New project */}
        <Pressable
          onPress={() => router.push('/new-project')}
          style={({ pressed }) => ({
            borderWidth: 1,
            borderColor: colors.accent,
            borderRadius: radius.lg,
            paddingVertical: space.lg,
            alignItems: 'center',
            marginTop: space.md,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={[type.label, { color: colors.accent }]}>+  NEW PROJECT</Text>
        </Pressable>
      </ScrollView>

      <BottomNav active="home" />
    </SafeAreaView>
  );
}

function EmptyState() {
  return (
    <View style={[shared.card, { alignItems: 'center', paddingVertical: space.xxl }]}>
      <Text style={[type.screen, { color: colors.textDim, marginBottom: space.sm }]}>
        NO BUILDS YET
      </Text>
      <Text
        style={[
          type.bodySm,
          { color: colors.textFaint, textAlign: 'center' },
        ]}
      >
        Describe what you're making and FORGE breaks it into areas and tasks.
      </Text>
    </View>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'GOOD MORNING';
  if (h < 17) return 'GOOD AFTERNOON';
  return 'GOOD EVENING';
}

/** "2H AGO", "3D AGO" — matches the mockup's compact style. */
function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'JUST NOW';
  if (mins < 60) return `${mins}M AGO`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}H AGO`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'YESTERDAY';
  return `${days}D AGO`;
}
