/**
 * The blueprint — FORGE's signature moment.
 *
 * The build at the top, a dashed spine running down, and each area
 * hanging off it as a node + card, with one small square per task
 * underneath (lit = done). Tap an area to open it.
 *
 * When it appears, it ASSEMBLES ITSELF — the timing is exactly the
 * mockup's:
 *   0–160ms    the build's name flickers on
 *   160ms →    the spine grows downward, 80ms per area
 *   200ms →    each area's node and card fade in, 80ms apart
 *   +60ms →    that area's task squares pop in, 20ms apart
 * all on the emphasized-decelerate curve (fast start, soft landing).
 */

import { Text, View, type ViewStyle } from 'react-native';
import Animated, {
  type CSSAnimationKeyframes,
  type CSSAnimationProperties,
  type CSSAnimationTimingFunction,
} from 'react-native-reanimated';
import { colors, space, type } from '../theme';
import { curve } from '../lib/motion';
import type { Area, Task } from '../lib/projects';
import { Press } from './ui';

const ROOT_FLICKER = { '0%': { opacity: 0 }, '30%': { opacity: 1 }, '60%': { opacity: 0.3 }, '100%': { opacity: 1 } };
const GROW_DOWN = { from: { transform: [{ scaleY: 0 }] }, to: { transform: [{ scaleY: 1 }] } };
const NODE_IN = {
  from: { opacity: 0.12, transform: [{ scale: 0.6 }] },
  to: { opacity: 1, transform: [{ scale: 1 }] },
};
const FADE_IN = { from: { opacity: 0 }, to: { opacity: 1 } };
const LEAF_IN = {
  from: { opacity: 0, transform: [{ scale: 0.3 }] },
  to: { opacity: 1, transform: [{ scale: 1 }] },
};

/** CSS animation settings, or nothing at all when animate is off. */
function play(
  animate: boolean,
  name: CSSAnimationKeyframes<ViewStyle>,
  durationMs: number,
  delayMs: number,
  timing: CSSAnimationTimingFunction = curve.decelerate
): Partial<CSSAnimationProperties<ViewStyle>> {
  if (!animate) return {};
  return {
    animationName: name,
    animationDuration: durationMs,
    animationDelay: delayMs,
    animationTimingFunction: timing,
    animationFillMode: 'both',
  };
}

/** Percent colour rule from the mockup: done = orange, past half = bright, else dim. */
function percentColor(percent: number) {
  if (percent >= 100) return colors.accent;
  if (percent >= 50) return colors.soft;
  return colors.dim;
}

export function Blueprint({
  name,
  areas,
  tasks,
  onOpenArea,
  animate = true,
}: {
  name: string;
  areas: Area[];
  tasks: Task[];
  onOpenArea: (area: Area) => void;
  animate?: boolean;
}) {
  return (
    <View
      style={{
        paddingTop: 18,
        paddingHorizontal: space.lg,
        paddingBottom: space.sm,
        borderRadius: 16,
        backgroundColor: colors.sunk,
        borderWidth: 1,
        borderColor: colors.line,
      }}
    >
      {/* The build itself — the root of the tree */}
      <Animated.View
        style={{
          alignSelf: 'flex-start',
          paddingVertical: 9,
          paddingHorizontal: 16,
          borderRadius: 999,
          backgroundColor: colors.node,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)',
          maxWidth: '100%',
          ...play(animate, ROOT_FLICKER, 160, 0, 'linear'),
        }}
      >
        <Text style={[type.area, { fontFamily: type.tab.fontFamily, fontSize: 13, color: colors.heading }]} numberOfLines={1}>
          {name.toUpperCase()}
        </Text>
      </Animated.View>

      <View style={{ paddingTop: 14 }}>
        {areas.map((area, i) => {
          const start = 200 + i * 80; // when this area appears
          const last = i === areas.length - 1;
          const full = area.total_tasks > 0 && area.percent >= 100;
          const statuses = tasks.filter((t) => t.area_id === area.id).map((t) => t.status === 'done');

          return (
            <View key={area.id} style={{ flexDirection: 'row', gap: 12 }}>
              {/* Left gutter: spine, branch and node */}
              <View style={{ width: 26 }}>
                <Animated.View
                  style={{
                    position: 'absolute',
                    left: 11,
                    top: i === 0 ? -14 : 0, // the first piece reaches up to the root
                    height: last ? (i === 0 ? 34 : 20) : undefined,
                    bottom: last ? undefined : 0,
                    transformOrigin: 'top',
                    ...play(animate, GROW_DOWN, 80, 160 + i * 80, 'linear'),
                  }}
                >
                  <Dashes direction="down" />
                </Animated.View>
                <Animated.View
                  style={{ position: 'absolute', left: 11, top: 19, ...play(animate, FADE_IN, 128, start) }}
                >
                  <Dashes direction="right" length={15} />
                </Animated.View>
                <Animated.View
                  style={{
                    position: 'absolute',
                    left: 5,
                    top: 14,
                    width: 13,
                    height: 13,
                    borderRadius: 4,
                    borderWidth: 1.5,
                    borderColor: full ? colors.accent : colors.nodeLine,
                    backgroundColor: full ? colors.accent : colors.nav,
                    boxShadow: full ? '0 0 10px rgba(244,60,20,0.55)' : undefined,
                    ...play(animate, NODE_IN, 128, start),
                  }}
                />
              </View>

              {/* The area card and its task squares */}
              <View style={{ flex: 1, minWidth: 0, paddingBottom: 14 }}>
                <Animated.View style={play(animate, FADE_IN, 128, start)}>
                  <Press
                    onPress={() => onOpenArea(area)}
                    accessibilityRole="button"
                    accessibilityLabel={`${area.name}, ${area.percent} percent. Open area`}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      paddingVertical: 9,
                      paddingHorizontal: 13,
                      borderRadius: 11,
                      borderCurve: 'continuous',
                      backgroundColor: colors.raised,
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.07)',
                    }}
                  >
                    <Text style={[type.area, { fontSize: 13, color: colors.soft, flex: 1 }]} numberOfLines={1}>
                      {area.name.toUpperCase()}
                    </Text>
                    <Text style={[type.area, { fontSize: 12, letterSpacing: 0, color: percentColor(area.percent) }]}>
                      {area.percent}%
                    </Text>
                  </Press>
                </Animated.View>

                {statuses.length > 0 ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 8, paddingLeft: 4 }}>
                    {statuses.map((done, j) => (
                      <Animated.View
                        key={j}
                        style={{
                          width: 9,
                          height: 9,
                          borderRadius: 2,
                          backgroundColor: done ? colors.accent : colors.dotOff,
                          ...play(animate, LEAF_IN, 96, start + 60 + j * 20),
                        }}
                      />
                    ))}
                  </View>
                ) : (
                  <Text style={[type.labelSm, { color: colors.off, marginTop: 8, paddingLeft: 4 }]}>NO TASKS YET</Text>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Legend */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 6, marginBottom: 6 }}>
        <Legend color={colors.accent} label="DONE" />
        <Legend color={colors.dotOff} label="OPEN" />
      </View>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color }} />
      <Text style={[type.labelSm, { color: colors.label }]}>{label}</Text>
    </View>
  );
}

/**
 * A dashed line: 3px dash, 4px gap — the mockup's pattern.
 * Drawn as little bars clipped to the space available, which is
 * more reliable on Android than a dashed border.
 */
function Dashes({ direction, length }: { direction: 'down' | 'right'; length?: number }) {
  const down = direction === 'down';
  const count = down ? 40 : Math.ceil((length ?? 15) / 7);
  return (
    <View
      style={{
        overflow: 'hidden',
        flexDirection: down ? 'column' : 'row',
        width: down ? 2 : length,
        height: down ? '100%' : 2,
      }}
    >
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={{
            width: down ? 2 : 3,
            height: down ? 3 : 2,
            marginBottom: down ? 4 : 0,
            marginRight: down ? 0 : 4,
            backgroundColor: colors.spine,
          }}
        />
      ))}
    </View>
  );
}
