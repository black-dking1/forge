/**
 * The shareable blueprint — a poster of one build.
 *
 * This is what "Export a blueprint to share" (FORGE Pro) turns into
 * a picture: the build's name, how far along it is, and the whole
 * tree of areas and tasks, signed "BUILT WITH FORGE".
 *
 * It's drawn with the same pieces as the app (DotBar, Blueprint) but
 * with every animation switched off — a photo taken halfway through
 * a charging bar would look broken.
 *
 * `collapsable={false}` matters on Android: without it, Android may
 * optimise this outer view away, and there'd be nothing to photograph.
 */

import type { Ref } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, glowFor, space, type } from '../theme';
import type { Area, ProjectOverview, Task } from '../lib/projects';
import { Blueprint } from './blueprint';
import { DotBar } from './dots';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function ShareCard({
  project,
  areas,
  tasks,
  width,
  ref,
}: {
  project: ProjectOverview;
  areas: Area[];
  tasks: Task[];
  width: number;
  ref?: Ref<View>;
}) {
  const today = new Date();
  const date = `${today.getDate()} ${MONTHS[today.getMonth()]} ${today.getFullYear()}`;

  return (
    <View ref={ref} collapsable={false} style={{ width, backgroundColor: colors.bg, overflow: 'hidden' }}>
      {/* the warm afternoon glow, always — it's the brand look */}
      <View style={[StyleSheet.absoluteFill, { experimental_backgroundImage: glowFor(15) }]} />

      <View style={{ padding: space.xxl }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Text style={[type.button, { fontFamily: type.wordmark.fontFamily, fontSize: 16, color: colors.white }]}>FORGE</Text>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent }} />
          <Text style={[type.labelSm, { color: colors.label, marginLeft: 'auto' }]}>{date}</Text>
        </View>

        <Text style={[type.greeting, { fontSize: 28, lineHeight: 32, color: colors.heading, marginTop: 22 }]}>
          {project.name.toUpperCase()}
        </Text>
        {project.goal ? (
          <Text style={[type.bodySm, { color: colors.dim, marginTop: space.sm }]} numberOfLines={3}>
            {project.goal}
          </Text>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 14, marginTop: 20 }}>
          <Text style={[type.hero, { fontSize: 56, lineHeight: 58, color: colors.accent }]}>{project.percent}%</Text>
          <View style={{ paddingBottom: 8 }}>
            <Text style={[type.label, { color: colors.heading }]}>COMPLETE</Text>
            <Text style={[type.labelSm, { color: colors.label, marginTop: 4 }]}>
              {project.done_tasks}/{project.total_tasks} TASKS · {project.area_count} AREAS
            </Text>
          </View>
        </View>

        <View style={{ marginTop: 14 }}>
          <DotBar percent={project.percent} charge={false} />
        </View>

        <View style={{ marginTop: 20 }}>
          <Blueprint name={project.name} areas={areas} tasks={tasks} onOpenArea={() => {}} animate={false} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: 18 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent }} />
          <Text style={[type.labelSm, { color: colors.dim }]}>BUILT WITH FORGE</Text>
          <Text style={[type.labelSm, { color: colors.accent, marginLeft: 'auto' }]}>#BUILDINPUBLIC</Text>
        </View>
      </View>
    </View>
  );
}

/** The same blueprint as plain text, for pasting into a post or a note. */
export function blueprintAsText(project: ProjectOverview, areas: Area[], tasks: Task[]) {
  const lines = [`${project.name.toUpperCase()} — ${project.percent}% complete`];
  if (project.goal) lines.push(project.goal);
  for (const area of areas) {
    lines.push('', `■ ${area.name.toUpperCase()} · ${area.percent}%`);
    for (const task of tasks.filter((t) => t.area_id === area.id)) {
      lines.push(`  ${task.status === 'done' ? '✓' : '○'} ${task.title}`);
    }
  }
  lines.push('', 'Built with FORGE #BuildInPublic');
  return lines.join('\n');
}
