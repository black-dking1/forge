/**
 * FORGE design system.
 *
 * Every colour, size and font in the app comes from this file.
 * Nothing else types a hex code. That rule is what makes ten
 * screens feel like one designed thing — which is exactly what the
 * Design Award is judged on.
 *
 * Every value below was read straight out of your Claude Design
 * export (FORGE_Screens + FORGE_Additions), not guessed.
 */

import { Platform } from 'react-native';

/** True on iPhone. A few things change there to feel native to iOS. */
export const ios = Platform.OS === 'ios';

// ---------------------------------------------------------------
// COLOURS — two palettes, dark (the original) and light
// ---------------------------------------------------------------
//
// HOW THE LIGHT THEME WORKS
// The Home v4 design makes light mode by putting a colour filter over
// the dark screen: invert(1) hue-rotate(180deg) saturate(1.9)
// contrast(1.06). Inverting flips dark to light; turning the hue half
// way round brings the orange back to orange. Every light colour below
// is exactly what that filter turns the matching dark colour into
// (measured in a browser), so light mode matches the design.
//
// It's done as real colours rather than a filter on the live screen
// because a filter would blur text and icons, costs the phone extra
// work every frame, and doesn't exist on iPhone.
//
// `colors` is ONE object that every screen reads from. Switching theme
// swaps its values in place (applyTheme, below) and the app redraws.
// That's why nothing outside this file should copy a colour into a
// constant when the app starts: it would keep the old theme's value.

const dark = {
  // Backgrounds, darkest to lightest.
  bg: '#0B0C0E', //       the app background
  sunk: '#0A0B0D', //     inside the pill tabs and the blueprint panel
  surface: '#0F1113', //  cards
  field: '#101214', //    text inputs and unticked checkboxes
  sheet: '#121417', //    bottom sheets
  raised: '#131619', //   cards inside the blueprint
  nav: '#15181B', //      the bottom nav bar
  menu: '#16191C', //     pop-up menus
  node: '#1B1E21', //     the root of the blueprint
  pill: '#1C1F22', //     the selected tab
  folder: '#111315', //   the build folders on Home

  // Hairlines.
  line: 'rgba(255,255,255,0.05)',
  lineMid: 'rgba(255,255,255,0.08)',
  lineDashed: 'rgba(255,255,255,0.14)',
  lineStrong: 'rgba(255,255,255,0.18)',
  folderLine: 'rgba(242,239,231,0.14)', // the outline of a build folder and the search bar
  tileLine: 'rgba(242,239,231,0.1)', //    an unpicked tile in the icon picker

  // The one accent. Action, progress, "this is live".
  accent: '#F43C14',
  accentTop: '#F5502A', //   top of the button gradient
  accentBottom: '#DD3510', // bottom of the button gradient
  onAccent: '#FFF8F4', //    text sitting on the accent
  accentSoft: 'rgba(244,60,20,0.10)',
  accentFaint: 'rgba(244,60,20,0.05)',
  accentLine: 'rgba(244,60,20,0.5)',
  accentFocus: 'rgba(244,60,20,0.75)',
  accentPicked: 'rgba(244,60,20,0.7)', //  the outline of a picked chip or icon
  iconTile: 'rgba(244,60,20,0.07)', //     behind the icon on a build folder
  iconTileLine: 'rgba(244,60,20,0.45)',
  chipText: '#F7674A',

  // Text, brightest to faintest. All pass 4.5:1 on the background.
  white: '#FBF7EC', //   the wordmark only
  heading: '#F2EFE7', // screen titles
  text: '#EAE7DF', //    default
  soft: '#DEDAD1', //    task titles, area names
  header: '#CBC8C0', //  the small build name at the top of a screen
  dim: '#9A9891', //     secondary text, icons
  faint: '#8D8B85', //   footnotes
  label: '#87857F', //   small caps labels
  off: '#7E7C77', //     ticked tasks, inactive nav

  // Dots and lines.
  dotOff: '#3F3D3A', //  an unlit dot
  spine: '#6A6762', //   the dashed lines in the blueprint
  nodeLine: '#8A8882', // the outline of an unfinished area node
  skeleton: '#2C2B29',
  skeletonDim: '#232321',
  gridDot: '#252523', // the empty-state dot field

  danger: '#FF5A45', //     destructive text
  dangerFill: '#E0301E', // the swipe-to-delete panel

  // Overlays and small pieces.
  scrim: 'rgba(4,5,6,0.68)', //   behind a sheet
  shadow: 'rgba(0,0,0,0.5)', //   drop shadows
  handle: '#3A3A38', //           the grab bar on a sheet
  skeletonCard: '#0E1012', //     a card that's still loading
};

export type Palette = typeof dark;

const light: Palette = {
  bg: '#F8FAFE',
  sunk: '#F9FBFF',
  surface: '#F1F5FA',
  field: '#F0F4F8',
  sheet: '#EEF2F8',
  raised: '#EBF1F7',
  nav: '#E8EFF5',
  menu: '#E7EDF3',
  node: '#E2E8EE',
  pill: '#E1E7ED',
  folder: '#EFF3F7',

  line: 'rgba(0,0,0,0.05)',
  lineMid: 'rgba(0,0,0,0.08)',
  lineDashed: 'rgba(0,0,0,0.14)',
  lineStrong: 'rgba(0,0,0,0.18)',
  folderLine: 'rgba(15,9,0,0.14)',
  tileLine: 'rgba(15,9,0,0.1)',

  accent: '#FF6211',
  accentTop: '#FF5206',
  accentBottom: '#FF7328',
  onAccent: '#170700', // the filter turns white-on-orange into dark-on-orange
  accentSoft: 'rgba(255,98,17,0.10)',
  accentFaint: 'rgba(255,98,17,0.05)',
  accentLine: 'rgba(255,98,17,0.5)',
  accentFocus: 'rgba(255,98,17,0.75)',
  accentPicked: 'rgba(255,98,17,0.7)',
  iconTile: 'rgba(255,98,17,0.07)',
  iconTileLine: 'rgba(255,98,17,0.45)',
  chipText: '#E4400A',

  white: '#080000',
  heading: '#0F0900',
  text: '#181201',
  soft: '#271F0D',
  header: '#383222',
  dim: '#6A6658',
  faint: '#777367',
  label: '#7E7A6E',
  off: '#878379',

  dotOff: '#C9C5BF',
  spine: '#9F998F',
  nodeLine: '#7B776A',
  skeleton: '#DBD9D5',
  skeletonDim: '#E2E2DE',
  gridDot: '#E0E0DC',

  danger: '#E5341F',
  dangerFill: '#E5341F', // kept strong so white text on it stays readable

  scrim: 'rgba(20,22,26,0.32)',
  shadow: 'rgba(20,24,32,0.14)',
  handle: '#CACAC6',
  skeletonCard: '#F3F7FB',
};

export type ThemeMode = 'dark' | 'light';

/** Which theme is showing right now. Read it; change it with applyTheme. */
export const theme = { mode: 'dark' as ThemeMode };

/** Every colour in the app. The values change when the theme does. */
export const colors: Palette = { ...dark };

/** Swap every colour to the other palette. The app then redraws (lib/appearance.tsx). */
export function applyTheme(mode: ThemeMode) {
  theme.mode = mode;
  Object.assign(colors, mode === 'light' ? light : dark);
}

/** White lines and washes in dark mode are black ones in light mode. `a` = opacity. */
export function ink(a: number) {
  return theme.mode === 'light' ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a})`;
}

/** The accent colour at opacity `a`, for tints, glows and outlines. */
export function tint(a: number) {
  return theme.mode === 'light' ? `rgba(255,98,17,${a})` : `rgba(244,60,20,${a})`;
}

/** A drop shadow's colour. Light mode's shadows are much softer, as on paper. */
export function shade(a: number) {
  return theme.mode === 'light' ? `rgba(20,24,32,${Math.round(a * 30) / 100})` : `rgba(0,0,0,${a})`;
}

/** Any theme colour ('#RRGGBB') at opacity `a`, e.g. withAlpha(colors.bg, 0.9). */
export function withAlpha(hex: string, a: number) {
  const n = parseInt(hex.slice(1, 7), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** For text inputs: the keyboard follows the theme on iPhone. */
export function keyboard() {
  return theme.mode === 'light' ? ('light' as const) : ('dark' as const);
}

// ---------------------------------------------------------------
// THE WARM GLOW
// ---------------------------------------------------------------
//
// Every screen in the mockup has a soft warm light leaking in from
// the top-left corner. That's what stops a near-black UI feeling
// cold and dead.
//
// It shifts with the time of day, matching the greeting on the home
// screen: bright peach in the morning, the mockup's own amber in the
// afternoon, a deeper sunset in the evening, cool moonlight at night.
// Subtle on purpose — most people will feel it rather than see it.

export function glowFor(hour: number = new Date().getHours()) {
  // Light mode: the design's glow is a soft warm shade in the corner
  // (measured from the Home v4 design) rather than a warm light.
  if (theme.mode === 'light') {
    return 'radial-gradient(140% 42% at 18% -8%, rgba(150,80,30,0.11) 0%, rgba(150,80,30,0.045) 38%, transparent 70%)';
  }

  let inner = 'rgba(243,201,157,0.17)'; // afternoon — the mockup value
  let outer = 'rgba(201,161,131,0.07)';

  if (hour >= 5 && hour < 12) {
    inner = 'rgba(253,226,190,0.19)';
    outer = 'rgba(214,176,140,0.07)';
  } else if (hour >= 17 && hour < 21) {
    inner = 'rgba(246,160,112,0.16)';
    outer = 'rgba(196,112,78,0.07)';
  } else if (hour >= 21 || hour < 5) {
    inner = 'rgba(170,180,210,0.10)';
    outer = 'rgba(120,130,160,0.05)';
  }

  return `radial-gradient(140% 42% at 18% -8%, ${inner} 0%, ${outer} 38%, transparent 70%)`;
}

// ---------------------------------------------------------------
// FONTS
// ---------------------------------------------------------------
//
//   Doto (rounded) — the dot-matrix face. Headings, labels, numbers,
//                    buttons. This is the exact cut your mockup uses
//                    (Doto with its "ROND" setting at 100). Phones
//                    can't load that setting directly, so it was cut
//                    into three fixed weights.
//   Quicksand      — anything read word by word: task titles, goals,
//                    notes, messages. ON IPHONE this is Apple's own
//                    San Francisco instead — the single biggest thing
//                    that makes an app feel native on iOS. Doto stays
//                    on both, because Doto IS FORGE.
//
// Both are SIL Open Font License — free for commercial apps. The
// licence files sit next to the fonts in assets/fonts.
//
// To go back to MatrixType: point display/displayMedium/displayBold
// at the MatrixType files instead. Nothing else changes.

export const fonts = {
  display: 'Doto-Regular',
  displayMedium: 'Doto-Medium',
  displayBold: 'Doto-SemiBold',
  body: 'Quicksand-Medium',
  bodyBold: 'Quicksand-SemiBold',
} as const;

// Keys must match the names above exactly, or the text silently
// falls back to the system font.
export const fontAssets = {
  'Doto-Regular': require('../assets/fonts/Doto-Regular.ttf'),
  'Doto-Medium': require('../assets/fonts/Doto-Medium.ttf'),
  'Doto-SemiBold': require('../assets/fonts/Doto-SemiBold.ttf'),
  'Quicksand-Medium': require('../assets/fonts/Quicksand-Medium.ttf'),
  'Quicksand-SemiBold': require('../assets/fonts/Quicksand-SemiBold.ttf'),
};

// Letter spacing in the mockup is in "em" (a fraction of the font
// size). React Native wants pixels, so: size × em.
const em = (size: number, amount: number) => Math.round(size * amount * 10) / 10;

// includeFontPadding: false stops Android adding extra space above
// and below text, which would push everything off the mockup's grid.
const tight = { includeFontPadding: false } as const;

// iPhone: the system font (leave fontFamily out) at a real weight.
// Android: Quicksand, where the weight lives in the font file.
function reading(weight: '400' | '600') {
  if (ios) return { fontWeight: weight } as const;
  return { fontFamily: weight === '600' ? fonts.bodyBold : fonts.body } as const;
}

export const type = {
  // --- Doto, big ---
  wordmark: { fontFamily: fonts.display, fontSize: 46, lineHeight: 50, letterSpacing: em(46, 0.12), ...tight },
  hero: { fontFamily: fonts.display, fontSize: 42, lineHeight: 46, ...tight }, //        the % in the ring
  title: { fontFamily: fonts.display, fontSize: 33, lineHeight: 36, letterSpacing: em(33, 0.07), ...tight }, // area name
  greeting: { fontFamily: fonts.display, fontSize: 30, lineHeight: 35, letterSpacing: em(30, 0.05), ...tight },
  heading: { fontFamily: fonts.display, fontSize: 27, lineHeight: 31, letterSpacing: em(27, 0.05), ...tight },
  percent: { fontFamily: fonts.display, fontSize: 26, lineHeight: 30, ...tight },
  price: { fontFamily: fonts.display, fontSize: 25, lineHeight: 29, ...tight },
  stat: { fontFamily: fonts.display, fontSize: 21, lineHeight: 25, ...tight },

  // --- Doto, medium ---
  cardTitle: { fontFamily: fonts.displayMedium, fontSize: 17, lineHeight: 21, letterSpacing: em(17, 0.08), ...tight },
  cardPercent: { fontFamily: fonts.displayBold, fontSize: 20, lineHeight: 24, ...tight },
  area: { fontFamily: fonts.displayMedium, fontSize: 14, lineHeight: 18, letterSpacing: em(14, 0.1), ...tight },
  header: { fontFamily: fonts.displayMedium, fontSize: 13, lineHeight: 17, letterSpacing: em(13, 0.16), ...tight },
  input: { fontFamily: fonts.displayMedium, fontSize: 15, letterSpacing: em(15, 0.04), ...tight },

  // --- Doto, small caps labels ---
  button: { fontFamily: fonts.displayBold, fontSize: 15, lineHeight: 19, letterSpacing: em(15, 0.16), ...tight },
  buttonSm: { fontFamily: fonts.displayBold, fontSize: 13, lineHeight: 17, letterSpacing: em(13, 0.16), ...tight },
  chip: { fontFamily: fonts.displayMedium, fontSize: 12, lineHeight: 16, letterSpacing: em(12, 0.1), ...tight },
  tab: { fontFamily: fonts.displayBold, fontSize: 11, lineHeight: 14, letterSpacing: em(11, 0.12), ...tight },
  label: { fontFamily: fonts.displayMedium, fontSize: 11, lineHeight: 14, letterSpacing: em(11, 0.14), ...tight },
  labelSm: { fontFamily: fonts.displayMedium, fontSize: 10, lineHeight: 13, letterSpacing: em(10, 0.12), ...tight },

  // --- Reading text: San Francisco on iPhone, Quicksand on Android ---
  task: { ...reading('600'), fontSize: ios ? 15 : 14.5, lineHeight: 20, letterSpacing: ios ? -0.2 : 0 },
  bodyBold: { ...reading('600'), fontSize: ios ? 15 : 14, lineHeight: 20, letterSpacing: ios ? -0.2 : 0 },
  body: { ...reading('400'), fontSize: ios ? 15 : 14, lineHeight: 21, letterSpacing: ios ? -0.2 : 0 },
  bodySm: { ...reading('400'), fontSize: 13, lineHeight: 19, letterSpacing: ios ? -0.08 : 0 },
  foot: { ...reading('400'), fontSize: ios ? 12 : 11.5, lineHeight: 18 },
} as const;

// ---------------------------------------------------------------
// SPACING AND CORNERS
// ---------------------------------------------------------------
//
// A 4px scale. Every margin and padding picks from here, which is
// what gives each screen the same rhythm top to bottom.

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20, // the mockup's screen edge
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const radius = {
  sm: 6, //   checkboxes
  md: 13, //  task rows, buttons
  lg: 16, //  cards
  sheet: 24,
  pill: 999,
} as const;

// (Animation curves and timings live in src/lib/motion.ts.)

// ---------------------------------------------------------------
// SHARED PIECES
// ---------------------------------------------------------------

// Getters, not plain values: each one is worked out when a screen
// draws, so it always uses the current theme's colours.
export const shared = {
  get screen() {
    return { flex: 1, backgroundColor: colors.bg } as const;
  },
  // A standard card: the task rows, area rows, stat boxes.
  get card() {
    return {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderCurve: 'continuous', // iPhone-style smooth corners (ignored on Android)
      borderWidth: 1,
      borderColor: colors.line,
    } as const;
  },
  // The bigger, lit-from-above card used for builds.
  get heroCard() {
    const lit = theme.mode === 'light';
    return {
      borderRadius: radius.lg,
      borderCurve: 'continuous',
      borderWidth: 1,
      borderColor: ink(0.055),
      experimental_backgroundImage: lit
        ? 'linear-gradient(150deg, #EAF0F6 0%, #F3F7FB 60%, #F8FAFE 100%)'
        : 'linear-gradient(150deg, #17191B 0%, #0E1012 60%, #0B0C0E 100%)',
      boxShadow: lit
        ? '0 14px 26px rgba(20,24,32,0.08), inset 0 1px 0 rgba(255,255,255,0.6)'
        : '0 14px 26px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.03)',
    } as const;
  },
  // The orange primary button.
  get primary() {
    return {
      borderRadius: radius.md,
      borderCurve: 'continuous',
      backgroundColor: colors.accent, // under the gradient, in case it can't draw
      experimental_backgroundImage: `linear-gradient(180deg, ${colors.accentTop} 0%, ${colors.accentBottom} 100%)`,
      boxShadow: `0 10px 26px ${tint(0.3)}, inset 0 1px 0 rgba(255,255,255,0.22)`,
    } as const;
  },
  // The glow ring around a focused input.
  get focusRing() {
    return { borderColor: colors.accentFocus, boxShadow: `0 0 0 3px ${tint(0.16)}` } as const;
  },
};
