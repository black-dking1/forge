/**
 * The dotted progress bar — FORGE's signature element.
 *
 * It "charges": when it first appears, the dots light up one after
 * another from the left, 15ms apart. When progress changes later
 * (you tick a task), only the new dots sweep on, starting from where
 * the bar already was. Untick, and they sweep off right-to-left.
 *
 * How many dots? As many as fit. The bar measures its own width
 * (onLayout) and fits one dot every 10px — the mockup's spacing —
 * so it looks the same on every phone size.
 */

import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { colors } from '../theme';

const DOT = 5.2; //  dot diameter (the mockup's 2.6px radius)
const STEP = 10; //  one dot every 10px
const SWEEP = 15; // ms between neighbouring dots lighting up

export function DotBar({
  percent,
  charge = true,
  tint = colors.accent,
}: {
  /** 0–100 */
  percent: number;
  /** play the left-to-right charge when it first appears */
  charge?: boolean;
  tint?: string;
}) {
  const [width, setWidth] = useState(0);

  // "awake" flips on one frame after the bar knows its width. The
  // dots are drawn unlit first, then lit — and the change between
  // the two is what the transition animates.
  const [awake, setAwake] = useState(!charge);
  useEffect(() => {
    if (awake || width === 0) return;
    const frame = requestAnimationFrame(() => setAwake(true));
    return () => cancelAnimationFrame(frame);
  }, [awake, width]);

  const count = width > 0 ? Math.max(1, Math.floor((width - DOT) / STEP) + 1) : 0;
  const safe = Math.max(0, Math.min(100, percent || 0));
  const lit = awake ? Math.round((safe / 100) * count) : 0;

  // Remember where the last change started, so a sweep begins at
  // the edge of the lit part instead of at the far left every time.
  // (Setting state while rendering is React's own pattern for
  // "react to a prop changing" — it re-renders once, straight away.)
  const [sweep, setSweep] = useState({ lit: 0, from: 0 });
  if (sweep.lit !== lit) setSweep({ lit, from: sweep.lit });

  return (
    <View
      onLayout={(event) => setWidth(Math.floor(event.nativeEvent.layout.width))}
      style={{ height: 9, flexDirection: 'row', alignItems: 'center' }}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(safe) }}
    >
      {Array.from({ length: count }, (_, i) => {
        const on = i < lit;
        const delay = on
          ? Math.max(0, i - sweep.from) * SWEEP //          lighting: left to right
          : Math.max(0, sweep.from - 1 - i) * SWEEP; //     dimming: right to left
        return (
          <Animated.View
            key={i}
            style={{
              width: DOT,
              height: DOT,
              borderRadius: DOT / 2,
              marginRight: STEP - DOT,
              backgroundColor: on ? tint : colors.dotOff,
              transitionProperty: 'backgroundColor',
              transitionDuration: 30,
              transitionDelay: delay,
              transitionTimingFunction: 'linear',
            }}
          />
        );
      })}
    </View>
  );
}

/**
 * One small square per task, lit if it's done. Used in the blueprint
 * — the "leaves" of the tree.
 */
export function TaskDots({ statuses }: { statuses: boolean[] }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
      {statuses.map((done, i) => (
        <View
          key={i}
          style={{
            width: 9,
            height: 9,
            borderRadius: 2,
            backgroundColor: done ? colors.accent : colors.dotOff,
          }}
        />
      ))}
    </View>
  );
}
