/**
 * Decorative dot art from the mockup:
 *
 *   Orb      — the dotted globe on the paywall
 *   DotField — the empty-state grid with one pulsing dot
 *   Wordmark — "FORGE" powering on letter by letter
 */

import { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { colors, ink, tint, type } from '../theme';
import { curve } from '../lib/motion';

function dot(x: number, y: number, r: number) {
  return `M${(x - r).toFixed(2)} ${y.toFixed(2)}a${r} ${r} 0 1 0 ${(r * 2).toFixed(2)} 0a${r} ${r} 0 1 0 ${(-r * 2).toFixed(2)} 0`;
}

// ---------------------------------------------------------------
// ORB
// ---------------------------------------------------------------
//
// A sphere drawn as dots: latitude rings plus meridians, tilted 16°
// towards you. Dots on the far side are drawn tiny and faint, which
// is what makes it read as 3D. Three orange "beacons" sit on the
// surface. Same maths as the mockup's dot-art file.
//
// The ~900 dots are worked out ONCE when the app loads and grouped
// by colour into a handful of SVG paths.

type Group = { color: string; opacity: number; path: string };

function buildOrb(): Group[] {
  const groups = new Map<string, Group>();
  const add = (x: number, y: number, r: number, color: string, opacity: number) => {
    const key = `${color}|${opacity}`;
    const group = groups.get(key) ?? { color, opacity, path: '' };
    group.path += dot(x, y, r);
    groups.set(key, group);
  };

  const cx = 150;
  const cy = 150;
  const R = 130;
  const tilt = (16 * Math.PI) / 180;
  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);

  const put = (x3: number, y3: number, z3: number, size: number) => {
    const y = y3 * ct - z3 * st;
    const z = y3 * st + z3 * ct;
    const front = z > 0;
    add(cx + R * x3, cy + R * y, front ? size : 1.1, colors.text, front ? 0.95 : 0.13);
  };

  // latitude rings
  for (let lat = -72; lat <= 72; lat += 18) {
    const pl = (lat * Math.PI) / 180;
    const steps = Math.max(10, Math.round(44 * Math.cos(pl)));
    for (let i = 0; i < steps; i++) {
      const lo = (i / steps) * Math.PI * 2;
      put(Math.cos(pl) * Math.cos(lo), Math.sin(pl), Math.cos(pl) * Math.sin(lo), 2);
    }
  }
  // meridians
  for (let m = 0; m < 8; m++) {
    const lo = (m * Math.PI) / 8;
    for (let i = 0; i < 60; i++) {
      const pl = -Math.PI / 2 + (i / 59) * Math.PI;
      put(Math.cos(pl) * Math.cos(lo), Math.sin(pl), Math.cos(pl) * Math.sin(lo), 1.7);
    }
  }
  // beacons
  [
    [18, 40],
    [-26, -35],
    [42, 118],
  ].forEach(([lat, lon]) => {
    const pl = (lat * Math.PI) / 180;
    const lo = (lon * Math.PI) / 180;
    const x = Math.cos(pl) * Math.cos(lo);
    const y = Math.sin(pl) * ct - Math.cos(pl) * Math.sin(lo) * st;
    add(cx + R * x, cy + R * y, 9, colors.accent, 0.2);
    add(cx + R * x, cy + R * y, 3.6, colors.accent, 1);
  });
  // outer ring
  for (let i = 0; i < 88; i++) {
    const a = -Math.PI / 2 + (i / 88) * Math.PI * 2;
    add(cx + Math.cos(a) * (R + 18), cy + Math.sin(a) * (R + 18), 1.3, colors.text, 0.18);
  }

  return [...groups.values()];
}

const ORB = buildOrb();

export function Orb({ size = 160 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 300 300">
      {ORB.map((group) => (
        <Path key={`${group.color}${group.opacity}`} d={group.path} fill={group.color} opacity={group.opacity} />
      ))}
    </Svg>
  );
}

// ---------------------------------------------------------------
// DOT FIELD — the empty state
// ---------------------------------------------------------------
//
// A quiet grid of dots, 14px apart, with one orange dot in the
// middle breathing slowly. "Waiting for your first build."

const EMPTY_PULSE = {
  '0%': { opacity: 0.35, transform: [{ scale: 0.8 }] },
  '50%': { opacity: 1, transform: [{ scale: 1.15 }] },
  '100%': { opacity: 0.35, transform: [{ scale: 0.8 }] },
};

export function DotField({ height = 280 }: { height?: number }) {
  const [width, setWidth] = useState(0);

  let path = '';
  for (let y = 7; y < height; y += 14) {
    for (let x = 7; x < width; x += 14) path += dot(x, y, 1.9);
  }

  // Snap the pulsing dot onto the grid, nearest the centre.
  const pulseX = 7 + 14 * Math.round((width / 2 - 7) / 14);
  const pulseY = 7 + 14 * Math.round((height / 2 - 7) / 14);

  return (
    <View style={{ height }} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 ? (
        <>
          <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
            <Path d={path} fill={colors.gridDot} />
          </Svg>
          <Animated.View
            style={{
              position: 'absolute',
              left: pulseX - 4,
              top: pulseY - 4,
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: colors.accent,
              boxShadow: `0 0 12px ${tint(0.8)}`,
              animationName: EMPTY_PULSE,
              animationDuration: 2400,
              animationIterationCount: 'infinite',
              animationTimingFunction: curve.pulse,
            }}
          />
        </>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------
// WORDMARK — "FORGE" powering on
// ---------------------------------------------------------------
//
// Each letter flickers on like an old display: 0 → 1 → 0.4 → 1 over
// 216ms, each letter 70ms after the one before. Plays once.

const FLICKER = {
  '0%': { opacity: 0 },
  '33%': { opacity: 1 },
  '66%': { opacity: 0.4 },
  '100%': { opacity: 1 },
};

export function Wordmark({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ flexDirection: 'row' }, style]} accessibilityRole="header" accessibilityLabel="FORGE">
      {'FORGE'.split('').map((letter, i) => (
        <Animated.Text
          key={i}
          style={[
            type.wordmark,
            {
              color: colors.white,
              textShadowColor: ink(0.14),
              textShadowRadius: 16,
              animationName: FLICKER,
              animationDuration: 216,
              animationDelay: 200 + i * 70,
              animationTimingFunction: 'linear',
              animationFillMode: 'both',
            },
          ]}
        >
          {letter}
        </Animated.Text>
      ))}
    </View>
  );
}
