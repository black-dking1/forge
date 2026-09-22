/**
 * The circular dot gauge on the project overview.
 *
 * Built from plain Views placed with trigonometry — no SVG library.
 * That is deliberate: adding react-native-svg would mean new native
 * code, which means a whole new 20-minute EAS build before you could
 * see it. This renders with what is already installed.
 *
 * Each dot's position on the circle:
 *   angle = (i / count) * 2π,  rotated a quarter turn so dot 0 sits
 *                              at the top instead of the right
 *   x = centre + radius * cos(angle)
 *   y = centre + radius * sin(angle)
 */

import { View, Text } from 'react-native';
import { colors, type } from '../theme';

type Props = {
  percent: number;
  size?: number;
  dotCount?: number;
  dotSize?: number;
  label?: string;
};

export function DotRing({
  percent,
  size = 190,
  dotCount = 60,
  dotSize = 4,
  label = 'COMPLETE',
}: Props) {
  const safe = Math.max(0, Math.min(100, percent || 0));
  const lit = Math.round((safe / 100) * dotCount);

  const centre = size / 2;
  const radius = centre - dotSize * 2;

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
      }}
    >
      {Array.from({ length: dotCount }).map((_, i) => {
        const angle = (i / dotCount) * 2 * Math.PI - Math.PI / 2;
        const x = centre + radius * Math.cos(angle) - dotSize / 2;
        const y = centre + radius * Math.sin(angle) - dotSize / 2;

        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: i < lit ? colors.accent : colors.todo,
            }}
          />
        );
      })}

      <Text style={[type.numberBig, { color: colors.text }]}>{safe}%</Text>
      <Text
        style={[
          type.labelSm,
          { color: colors.textFaint, marginTop: 2 },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}
