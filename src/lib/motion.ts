/**
 * Motion — the timing and curves every animation in FORGE uses.
 *
 * These are Google's Material 3 motion tokens. Using one real system
 * instead of numbers picked by eye is why the animations feel like
 * they belong together.
 *
 * Two flavours of the same curves, because Reanimated has two ways
 * to animate:
 *   ease — for withTiming() and entering/exiting animations
 *   curve — for CSS-style animations and transitions in a style
 */

import { cubicBezier, Easing } from 'react-native-reanimated';

export const ease = {
  standard: Easing.bezier(0.2, 0, 0, 1), //       most things
  decelerate: Easing.bezier(0.05, 0.7, 0.1, 1), // things arriving
  accelerate: Easing.bezier(0.3, 0, 0.8, 0.15), // things leaving
};

export const curve = {
  standard: cubicBezier(0.2, 0, 0, 1),
  decelerate: cubicBezier(0.05, 0.7, 0.1, 1),
  accelerate: cubicBezier(0.3, 0, 0.8, 0.15),
  pulse: cubicBezier(0.4, 0, 0.2, 1), //           breathing loops
};

export const duration = {
  quick: 150,
  medium: 250,
  slow: 360,
};
