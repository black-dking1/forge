/**
 * Light and dark — the theme switch (the Home v4 design).
 *
 * WHAT HAPPENS WHEN YOU TAP THE SUN / MOON ON HOME
 *   1. FORGE takes a picture of the screen as it is (react-native-view-shot).
 *   2. That picture is laid over everything, so nothing seems to change.
 *   3. Underneath it, every colour switches (applyTheme in theme.ts) and
 *      the screens redraw in the new theme.
 *   4. The picture is then wiped away from the top down over 1.9s, with
 *      streams of falling dot-matrix characters riding the edge — the
 *      "matrix rain" from the design — revealing the new theme.
 *
 * If the phone asks for reduced motion, or the picture can't be taken,
 * the theme simply switches with no animation.
 *
 * The choice is saved on the phone (AsyncStorage) and read back before
 * the splash screen lifts, so FORGE opens in the theme you left it in.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { captureScreen } from 'react-native-view-shot';
import { applyTheme, fonts, theme, type ThemeMode } from '../theme';
import { haptic } from './haptics';

const STORAGE_KEY = 'forge.theme';
const WIPE_MS = 1900; // the design's duration

type Appearance = {
  mode: ThemeMode;
  /** false until the saved theme has been read */
  ready: boolean;
  toggle: () => void;
};

const AppearanceContext = createContext<Appearance>({ mode: 'dark', ready: true, toggle: () => {} });

/** The current theme, and the switch. */
export function useAppearance() {
  return useContext(AppearanceContext);
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(theme.mode);
  const [ready, setReady] = useState(false);
  const [wipe, setWipe] = useState<{ uri: string; to: ThemeMode } | null>(null);
  const busy = useRef(false);

  // Read the saved theme once, before anything is shown.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'light' || saved === 'dark') {
          applyTheme(saved);
          setMode(saved);
        }
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const switchTo = useCallback((to: ThemeMode) => {
    applyTheme(to);
    setMode(to);
    AsyncStorage.setItem(STORAGE_KEY, to).catch(() => {});
  }, []);

  const toggle = useCallback(async () => {
    if (busy.current) return; // one switch at a time
    busy.current = true;
    haptic.select();
    const to: ThemeMode = theme.mode === 'dark' ? 'light' : 'dark';

    let uri: string | null = null;
    try {
      const calm = await AccessibilityInfo.isReduceMotionEnabled();
      if (!calm) uri = await captureScreen({ format: 'jpg', quality: 0.92, result: 'tmpfile' });
    } catch {
      uri = null;
    }

    if (!uri) {
      switchTo(to);
      busy.current = false;
      return;
    }
    setWipe({ uri, to });
  }, [switchTo]);

  const target = wipe?.to;
  const onCovered = useCallback(() => {
    if (target) switchTo(target);
  }, [target, switchTo]);
  const onDone = useCallback(() => {
    setWipe(null);
    busy.current = false;
  }, []);

  const value = useMemo(() => ({ mode, ready, toggle }), [mode, ready, toggle]);

  return (
    <AppearanceContext.Provider value={value}>
      {children}
      {wipe ? <RainWipe uri={wipe.uri} onCovered={onCovered} onDone={onDone} /> : null}
    </AppearanceContext.Provider>
  );
}

// ---------------------------------------------------------------
// THE WIPE
// ---------------------------------------------------------------

const CELL = 13; // one character of rain, in px (the design's grid)
const GLYPHS = '0123456789ABCDEFGHJKLMNPRSTUVXYZ<>=+*#%$&/|';

/** Where the edge is, in px from the top, at progress p (0 → 1). */
function edgeAt(p: number, height: number) {
  'worklet';
  return -60 + p * (height + 120);
}

/** The design's ease-in-out-cubic, so the wipe starts and ends softly. */
const EASE = Easing.bezier(0.65, 0, 0.35, 1);

function RainWipe({ uri, onCovered, onDone }: { uri: string; onCovered: () => void; onDone: () => void }) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [started, setStarted] = useState(false);
  const once = useRef(false); // start() can be called by onLoad AND the fallback timer
  const progress = useSharedValue(0);

  const start = useCallback(() => {
    if (once.current || !size) return;
    once.current = true;
    setStarted(true);
    // Give the old picture one frame on screen, THEN switch the theme
    // underneath it and start the wipe.
    requestAnimationFrame(() => {
      onCovered();
      progress.set(
        withTiming(1, { duration: WIPE_MS, easing: EASE }, (finished) => {
          if (finished) runOnJS(onDone)();
        })
      );
    });
  }, [size, onCovered, onDone, progress]);

  // If the picture never reports that it loaded, go anyway.
  useEffect(() => {
    if (!size) return;
    const fallback = setTimeout(start, 450);
    return () => clearTimeout(fallback);
  }, [size, start]);

  const height = size?.height ?? 0;
  // The old picture stays put while its visible part shrinks from the top.
  const window = useAnimatedStyle(() => ({ top: Math.max(0, edgeAt(progress.get(), height)) }));
  const picture = useAnimatedStyle(() => ({
    transform: [{ translateY: -Math.max(0, edgeAt(progress.get(), height)) }],
  }));

  return (
    <View
      style={[StyleSheet.absoluteFill, { zIndex: 1000, elevation: 1000 }]}
      onLayout={(event) => setSize(event.nativeEvent.layout)}
    >
      {size ? (
        <>
          <Animated.View style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, overflow: 'hidden' }, window]}>
            <Animated.Image
              source={{ uri }}
              onLoad={start}
              fadeDuration={0}
              style={[{ position: 'absolute', top: 0, left: 0, width: size.width, height: size.height }, picture]}
            />
          </Animated.View>
          {started ? <Rain progress={progress} width={size.width} height={size.height} /> : null}
        </>
      ) : null}
    </View>
  );
}

/** Streams of falling characters riding the edge of the wipe. */
function Rain({ progress, width, height }: { progress: SharedValue<number>; width: number; height: number }) {
  const columns = Math.ceil(width / CELL);
  const seeds = useMemo(() => Array.from({ length: columns }, () => Math.random()), [columns]);

  // The characters flicker: a new set ~11 times a second.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 90);
    return () => clearInterval(id);
  }, []);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {seeds.map((seed, column) =>
        seed < 0.12 ? null : ( // a few empty columns, as in the design
          <Stream key={column} column={column} seed={seed} tick={tick} progress={progress} height={height} />
        )
      )}
    </View>
  );
}

function Stream({
  column,
  seed,
  tick,
  progress,
  height,
}: {
  column: number;
  seed: number;
  tick: number;
  progress: SharedValue<number>;
  height: number;
}) {
  const length = 7 + Math.floor(((seed * 7919 + column * 31) % 1) * 12); // tail length, in characters
  const lead = seed * 70 - 20; // how far ahead of the edge this stream's head runs
  const speed = 1 + Math.floor(seed * 3);

  const style = useAnimatedStyle(() => {
    const p = progress.get();
    const edge = edgeAt(p, height);
    // the ragged, wavy edge from the design
    const wave = 12 * Math.sin(column * 0.5 + p * 11 + seed * 2) + 7 * Math.sin(column * 0.19 - p * 7);
    const head = edge + wave + lead;
    const fade = Math.min(1, p / 0.05, (1 - p) / 0.12 + 0.001);
    return { opacity: fade, transform: [{ translateY: head - length * CELL }] };
  });

  // Top of the stream (faint tail) down to its bright head.
  const glyphs: { ch: string; color: string; head: boolean }[] = [];
  for (let j = length; j >= 0; j -= 1) {
    const n = Math.abs(Math.imul(column * 374761393 + j * 668265263, Math.floor(tick / speed) + 1274126177) | 0);
    const ch = GLYPHS[n % GLYPHS.length];
    const fall = 1 - j / (length + 1);
    const color =
      j === 0 ? 'rgba(255,250,244,1)' : j < 3 ? 'rgba(255,196,160,0.95)' : `rgba(244,60,20,${(0.95 * fall * fall).toFixed(3)})`;
    glyphs.push({ ch, color, head: j === 0 });
  }

  return (
    <Animated.View style={[{ position: 'absolute', top: 0, left: column * CELL, width: CELL }, style]}>
      <Text
        style={{ fontFamily: fonts.displayBold, fontSize: CELL - 1, lineHeight: CELL, textAlign: 'center', includeFontPadding: false }}
      >
        {glyphs.map((g, i) => (
          <Text
            key={i}
            style={[
              { color: g.color },
              g.head && { textShadowColor: 'rgba(255,120,70,0.95)', textShadowRadius: 8, textShadowOffset: { width: 0, height: 0 } },
            ]}
          >
            {g.ch}
            {i < glyphs.length - 1 ? '\n' : ''}
          </Text>
        ))}
      </Text>
    </Animated.View>
  );
}
