/**
 * The dotted progress strip.
 *
 * This is FORGE's signature element — it appears on the home screen,
 * the project overview and the blueprint. It's also deliberately
 * cheap: a row of small filled Views. No SVG, no charting library,
 * no measuring text. That matters when you're building on a clock.
 */

import { View } from 'react-native';
import { colors, space } from '../theme';

type Props = {
  /** 0-100 */
  percent: number;
  /** how many dots to draw. More dots = finer resolution. */
  count?: number;
  size?: number;
  gap?: number;
  /** colour of filled dots; defaults to the accent */
  tint?: string;
};

export function DotProgress({
  percent,
  count = 28,
  size = 5,
  gap = 3,
  tint = colors.accent,
}: Props) {
  // How many dots should be lit. Math.round rather than Math.floor so
  // that 1 of 18 tasks done shows *something* rather than an empty bar
  // that makes the app look broken.
  const safe = Math.max(0, Math.min(100, percent || 0));
  const lit = Math.round((safe / 100) * count);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            marginRight: i === count - 1 ? 0 : gap,
            backgroundColor: i < lit ? tint : colors.todo,
          }}
        />
      ))}
    </View>
  );
}

/**
 * A squarer, chunkier variant used inside the blueprint, where each
 * dot stands for one actual task rather than a percentage.
 */
export function TaskDots({
  total,
  done,
  size = 7,
}: {
  total: number;
  done: number;
  size?: number;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: 1.5,
            backgroundColor: i < done ? colors.done : colors.todo,
          }}
        />
      ))}
    </View>
  );
}
