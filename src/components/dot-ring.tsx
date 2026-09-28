/**
 * The ring gauge on the build overview.
 *
 * 64 spokes around a circle, each spoke three dots deep. Lit spokes
 * are orange; the rest are faint. On open it fills clockwise while
 * the percentage in the middle counts up with it — both driven by
 * the same number, so they can never disagree.
 *
 * Geometry is the mockup's own (a 260×260 canvas, radii 96/104/112),
 * drawn as two SVG paths — one for lit dots, one for unlit — which
 * is far cheaper than 192 separate views.
 */

import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, type } from '../theme';
import { useCountUp } from '../lib/use-count-up';

const SPOKES = 64;
const CENTRE = 130;

function dot(x: number, y: number, r: number) {
  return `M${(x - r).toFixed(2)} ${y.toFixed(2)}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0`;
}

function ringPaths(lit: number) {
  let on = '';
  let off = '';
  for (let i = 0; i < SPOKES; i++) {
    const angle = ((-90 + (i / SPOKES) * 360) * Math.PI) / 180;
    for (let k = 0; k < 3; k++) {
      const radius = 96 + k * 8;
      const x = CENTRE + Math.cos(angle) * radius;
      const y = CENTRE + Math.sin(angle) * radius;
      if (i < lit) on += dot(x, y, 2.6);
      else off += dot(x, y, 2);
    }
  }
  return { on, off };
}

export function DotRing({ percent, size = 196 }: { percent: number; size?: number }) {
  const safe = Math.max(0, Math.min(100, percent || 0));
  const shown = useCountUp(safe);
  const lit = Math.round((shown / 100) * SPOKES);
  const paths = ringPaths(lit);

  return (
    <View
      style={{ width: size, height: size, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' }}
      accessibilityRole="progressbar"
      accessibilityLabel={`${Math.round(safe)} percent complete`}
    >
      <Svg width={size} height={size} viewBox="0 0 260 260" style={StyleSheet.absoluteFill}>
        <Path d={paths.off} fill={colors.text} opacity={0.2} />
        <Path d={paths.on} fill={colors.accent} />
      </Svg>
      <Text style={[type.hero, { color: colors.heading }]}>{Math.round(shown)}%</Text>
      <Text style={[type.labelSm, { color: colors.label, marginTop: 6, letterSpacing: 1.6 }]}>COMPLETE</Text>
    </View>
  );
}
