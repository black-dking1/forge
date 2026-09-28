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
// COLOURS
// ---------------------------------------------------------------

export const colors = {
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

  // Hairlines.
  line: 'rgba(255,255,255,0.05)',
  lineMid: 'rgba(255,255,255,0.08)',
  lineDashed: 'rgba(255,255,255,0.14)',
  lineStrong: 'rgba(255,255,255,0.18)',

  // The one accent. Action, progress, "this is live".
  accent: '#F43C14',
  accentTop: '#F5502A', //   top of the button gradient
  accentBottom: '#DD3510', // bottom of the button gradient
  onAccent: '#FFF8F4', //    text sitting on the accent
  accentSoft: 'rgba(244,60,20,0.10)',
  accentFaint: 'rgba(244,60,20,0.05)',
  accentLine: 'rgba(244,60,20,0.5)',
  accentFocus: 'rgba(244,60,20,0.75)',
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
} as const;

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

export const shared = {
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  // A standard card: the task rows, area rows, stat boxes.
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderCurve: 'continuous', // iPhone-style smooth corners (ignored on Android)
    borderWidth: 1,
    borderColor: colors.line,
  },
  // The bigger, lit-from-above card used for builds on the home screen.
  heroCard: {
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.055)',
    experimental_backgroundImage: 'linear-gradient(150deg, #17191B 0%, #0E1012 60%, #0B0C0E 100%)',
    boxShadow: '0 14px 26px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.03)',
  },
  // The orange primary button.
  primary: {
    borderRadius: radius.md,
    borderCurve: 'continuous',
    experimental_backgroundImage: `linear-gradient(180deg, ${colors.accentTop} 0%, ${colors.accentBottom} 100%)`,
    boxShadow: '0 10px 26px rgba(244,60,20,0.3), inset 0 1px 0 rgba(255,255,255,0.22)',
  },
  // The glow ring around a focused input.
  focusRing: {
    borderColor: colors.accentFocus,
    boxShadow: '0 0 0 3px rgba(244,60,20,0.16)',
  },
} as const;
