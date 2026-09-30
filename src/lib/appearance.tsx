/**
 * Light and dark — the theme switch (the Home v4 design).
 *
 * WHAT HAPPENS WHEN YOU TAP THE SUN / MOON ON HOME
 *   1. FORGE takes a picture of the screen as it is (react-native-view-shot).
 *   2. That picture is laid over everything, so nothing seems to change.
 *   3. Underneath it, every colour switches (applyTheme in theme.ts) and
 *      the screens redraw in the new theme.
 *   4. Then it rains: streams of falling dot-matrix characters wash the
 *      picture away from the top down over 2.1s, column by column, and
 *      the new theme appears behind them (details at THE WIPE below).
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
import { Image as Picture } from 'expo-image';
import { captureScreen } from 'react-native-view-shot';
import { applyTheme, fonts, theme, type ThemeMode } from '../theme';
import { haptic } from './haptics';

const STORAGE_KEY = 'forge.theme';

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
// THE WIPE — "matrix rain", straight from the advert stills
// ---------------------------------------------------------------
//
// HOW IT'S BUILT
// The screen is cut into columns one character wide (13px). Each
// column is its own window onto the old picture, and each window's
// top edge is pushed down by the rain in that column. The rain in
// each column reaches a slightly different depth and wobbles as it
// falls, so the new theme appears above a ragged, moving edge, as if
// the rain were washing the old screen away.
//
// Riding that edge, each column has one or two streams of dot-matrix
// characters: a bright white head, two peach characters behind it, and
// an orange tail that fades out. Streams step down one character at a
// time (they never slide), the characters flicker 14 times a second,
// and every column falls at its own pace, so it reads as rain.
//
// The picture is loaded once with expo-image and shared by every
// column, so 34 windows don't mean 34 copies of the screen in memory.

const CELL = 13; // one character of rain, in px (the design's grid)
const WIPE_MS = 2400; // a touch slower than the design's 2.1s, so you see it rain
const FADE_MS = 260; // the last drops fade once the screen is clear
const GLYPHS = '0123456789ABCDEFGHJKLMNPRSTUVXYZ<>=+*#%/';

/** A steady 0–1 number for each (a, b, c), the design's hash. */
function hash(a: number, b = 0, c = 0) {
  'worklet';
  let n = Math.imul(a + 1, 374761393) ^ Math.imul(b + 7, 668265263) ^ Math.imul(c + 13, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1103515245);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

/**
 * Soft at the start and end, steady in the middle, the way rain falls
 * (gentler than the design's ease-in-out-cubic, which rushed the middle).
 */
function easeInOut(x: number) {
  'worklet';
  return 0.5 - Math.cos(Math.PI * x) / 2;
}

/**
 * How far down the rain has reached in one column, in px.
 * `clock` runs 0 → 1 in a straight line over WIPE_MS.
 */
function edgeAt(clock: number, column: number, height: number) {
  'worklet';
  const front = -CELL * 4 + easeInOut(clock) * (height + CELL * 12);
  const seconds = (clock * WIPE_MS) / 1000;
  return (
    front +
    CELL * (0.9 * Math.sin(column * 0.5 + seconds * 6 + hash(column, 9) * 2) + 0.55 * Math.sin(column * 0.19 - seconds * 4))
  );
}

function RainWipe({ uri, onCovered, onDone }: { uri: string; onCovered: () => void; onDone: () => void }) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [loaded, setLoaded] = useState(false); // the picture is in memory
  const [started, setStarted] = useState(false);
  const once = useRef(false); // start() can be called by the last onLoad AND the fallback timer
  const shown = useRef(0); // how many columns have drawn their piece
  const clock = useSharedValue(0);
  const fade = useSharedValue(1);

  const columns = size ? Math.ceil(size.width / CELL) + 1 : 0;

  // Load the picture into memory once, so every column shares it.
  useEffect(() => {
    let alive = true;
    const ready = () => alive && setLoaded(true);
    Picture.prefetch(uri, 'memory').then(ready, ready);
    const fallback = setTimeout(ready, 400);
    return () => {
      alive = false;
      clearTimeout(fallback);
    };
  }, [uri]);

  const start = useCallback(() => {
    if (once.current) return;
    once.current = true;
    // One frame with every column showing the old picture, THEN switch
    // the theme underneath and let it rain.
    requestAnimationFrame(() => {
      onCovered();
      setStarted(true);
      clock.set(
        withTiming(1, { duration: WIPE_MS, easing: Easing.linear }, (finished) => {
          if (!finished) return;
          fade.set(
            withTiming(0, { duration: FADE_MS }, (done) => {
              if (done) runOnJS(onDone)();
            })
          );
        })
      );
    });
  }, [onCovered, onDone, clock, fade]);

  // Go once every column has drawn, or after a moment whatever happens.
  const onPiece = useCallback(() => {
    shown.current += 1;
    if (shown.current >= columns) start();
  }, [columns, start]);
  useEffect(() => {
    if (!loaded || !size) return;
    const fallback = setTimeout(start, 500);
    return () => clearTimeout(fallback);
  }, [loaded, size, start]);

  return (
    <View
      style={[StyleSheet.absoluteFill, { zIndex: 1000, elevation: 1000 }]}
      onLayout={(event) => setSize(event.nativeEvent.layout)}
    >
      {size ? (
        <>
          {/* Until the columns are ready, the whole old picture covers the screen. */}
          {!started ? (
            <Picture
              source={{ uri }}
              cachePolicy="memory"
              contentFit="fill"
              transition={0}
              style={{ position: 'absolute', top: 0, left: 0, width: size.width, height: size.height }}
            />
          ) : null}
          {loaded
            ? Array.from({ length: columns }, (_, column) => (
                <Strip
                  key={column}
                  column={column}
                  uri={uri}
                  width={size.width}
                  height={size.height}
                  clock={clock}
                  onLoad={onPiece}
                />
              ))
            : null}
          {started ? <Rain clock={clock} fade={fade} width={size.width} height={size.height} /> : null}
        </>
      ) : null}
    </View>
  );
}

/** One column's window onto the old picture. Its top is where the rain has reached. */
function Strip({
  column,
  uri,
  width,
  height,
  clock,
  onLoad,
}: {
  column: number;
  uri: string;
  width: number;
  height: number;
  clock: SharedValue<number>;
  onLoad: () => void;
}) {
  // The window moves down; the picture inside moves up by the same
  // amount, so it stays exactly where it was on screen.
  const frame = useAnimatedStyle(() => ({
    transform: [{ translateY: Math.min(height, Math.max(0, edgeAt(clock.get(), column, height))) }],
  }));
  const still = useAnimatedStyle(() => ({
    transform: [{ translateY: -Math.min(height, Math.max(0, edgeAt(clock.get(), column, height))) }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', top: 0, left: column * CELL, width: CELL + 1, height, overflow: 'hidden' }, frame]}
    >
      <Animated.View style={[{ position: 'absolute', top: 0, left: -column * CELL, width, height }, still]}>
        <Picture
          source={{ uri }}
          cachePolicy="memory"
          contentFit="fill"
          transition={0}
          onLoad={onLoad}
          style={{ width, height }}
        />
      </Animated.View>
    </Animated.View>
  );
}

type StreamPlan = { key: string; column: number; lead: number; speed: number; length: number; second: boolean };

/** Every column's streams: which columns rain, how long each stream is, how fast it falls. */
function planStreams(columns: number) {
  const plan: StreamPlan[] = [];
  for (let column = 0; column < columns; column += 1) {
    if (hash(column, 11) < 0.1) continue; // a few dry columns, as in the design
    // The main drop runs up to 8 characters ahead of the edge, and
    // some fall faster than others as they go.
    plan.push({
      key: `${column}a`,
      column,
      lead: hash(column, 1) * CELL * 8,
      speed: hash(column, 6) * CELL * 11,
      length: 8 + Math.floor(hash(column, 2) * 12),
      second: false,
    });
    // Most columns get a shorter second drop trailing behind the edge.
    if (hash(column, 5) >= 0.4) {
      plan.push({
        key: `${column}b`,
        column,
        lead: -CELL * 3 - hash(column, 3) * CELL * 7,
        speed: 0,
        length: 5 + Math.floor(hash(column, 4) * 7),
        second: true,
      });
    }
  }
  return plan;
}

function Rain({
  clock,
  fade,
  width,
  height,
}: {
  clock: SharedValue<number>;
  fade: SharedValue<number>;
  width: number;
  height: number;
}) {
  const streams = useMemo(() => planStreams(Math.ceil(width / CELL)), [width]);

  // The characters flicker: a new set 14 times a second, as in the design.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000 / 14);
    return () => clearInterval(id);
  }, []);

  // Fades in over the first moment, out once the screen is clear.
  const visible = useAnimatedStyle(() => ({ opacity: Math.min(1, clock.get() / 0.04) * fade.get() }));

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, visible]}>
      {streams.map((stream) => (
        <Stream key={stream.key} stream={stream} tick={tick} clock={clock} height={height} />
      ))}
    </Animated.View>
  );
}

function Stream({
  stream,
  tick,
  clock,
  height,
}: {
  stream: StreamPlan;
  tick: number;
  clock: SharedValue<number>;
  height: number;
}) {
  const { column, lead, speed, length, second } = stream;

  // The head snaps to the character grid, so the stream steps down one
  // character at a time instead of sliding: that's what makes it rain.
  const style = useAnimatedStyle(() => {
    const c = clock.get();
    const head = edgeAt(c, column, height) + lead + speed * c;
    const row = Math.round(head / CELL);
    return { transform: [{ translateY: (row - (length - 1)) * CELL }] };
  });

  // Top of the stream (faint tail) down to its bright head (j = 0).
  const glyphs: ReactNode[] = [];
  for (let i = 0; i < length; i += 1) {
    const j = length - 1 - i;
    const ch = GLYPHS[Math.floor(hash(column, j + (second ? 91 : 0), tick) * GLYPHS.length)];
    const a = Math.pow(1 - j / length, 1.2);
    const color =
      j === 0
        ? `rgba(255,250,244,${a.toFixed(3)})`
        : j < 3
          ? `rgba(255,196,160,${a.toFixed(3)})`
          : `rgba(244,60,20,${(a * a).toFixed(3)})`;
    glyphs.push(
      <Text
        key={i}
        style={[
          { color },
          j === 0 && { textShadowColor: 'rgba(255,120,70,0.95)', textShadowRadius: 5, textShadowOffset: { width: 0, height: 0 } },
        ]}
      >
        {ch}
        {i < length - 1 ? '\n' : ''}
      </Text>
    );
  }

  return (
    <Animated.View style={[{ position: 'absolute', top: 0, left: column * CELL, width: CELL }, style]}>
      <Text
        style={{
          fontFamily: fonts.displayBold,
          fontSize: CELL * 0.95,
          lineHeight: CELL,
          textAlign: 'center',
          includeFontPadding: false,
        }}
      >
        {glyphs}
      </Text>
    </Animated.View>
  );
}
