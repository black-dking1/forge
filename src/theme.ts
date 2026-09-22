/**
 * FORGE design system.
 *
 * Every colour, size and spacing value in the app comes from this
 * file. Nothing else hard-codes a hex code or a number.
 *
 * That rule is the whole point. It's what makes eight screens look
 * like one app instead of eight separate pages — and "does this feel
 * like one designed system" is exactly what the Design Award is
 * judged on.
 *
 * Colours below were sampled from your actual mockups, not guessed.
 */

// ---------------------------------------------------------------
// COLOURS
// ---------------------------------------------------------------

export const colors = {
  // Backgrounds, darkest to lightest.
  bg: '#0B0C0E',          // the app background
  surface: '#0F1113',     // cards and panels sitting on top of it
  surfaceHigh: '#16181B', // a panel on top of a panel (modals, pressed states)
  border: '#1C1F22',      // hairlines between things

  // The one accent. Used for action, progress and "this is active".
  // Deliberately only one — that restraint is what stops the app
  // looking like a toy.
  accent: '#F43C14',
  accentDim: '#5A1A08',   // accent at low opacity, for unfilled progress dots

  // Text, brightest to faintest.
  text: '#FCFCFC',        // 19.1:1 against bg
  textDim: '#8B8B8B',     // 5.7:1  — secondary labels
  textFaint: '#7C7E82',   // 4.8:1  — smallest labels

  // NOTE: your mockup used #48494B for the faintest tier. That is
  // 2.17:1 against the background — below the 3:1 minimum for even
  // large text. It looks fine on a bright monitor and vanishes on a
  // phone outdoors, and YouTube's compression eats it in the demo
  // video. #7C7E82 keeps the same "dim" feel and stays readable.

  done: '#F43C14',        // a completed task dot
  todo: '#2A2D31',        // an incomplete task dot

  danger: '#FF5A4D',      // destructive actions, error messages
} as const;

// ---------------------------------------------------------------
// TYPOGRAPHY
// ---------------------------------------------------------------
//
// Three roles, and the split matters:
//
//   display — MatrixType, the dotted cut. The identity of the app.
//             Big text only: the wordmark, screen titles, big numbers.
//
//   label   — MatrixTypeDisplay-Bold. Still unmistakably FORGE, but
//             solid rather than dotted, so it stays crisp at 11-13px
//             where the dotted cut turns to mush. Small technical
//             labels: "HARDWARE", "6 AREAS", "ACTIVE".
//
//   body    — the system sans. Anything a person actually reads word
//             by word: task titles, goals, notes, error messages,
//             form input.
//
// Using the dotted face everywhere is the single easiest way to make
// this design tiring to use. Don't.

export const fonts = {
  display: 'MatrixType-Bold',
  displayLight: 'MatrixType-Regular',
  label: 'MatrixTypeDisplay-Bold',
  labelLight: 'MatrixTypeDisplay-Regular',
  body: undefined as string | undefined, // undefined = system font
} as const;

// The font map expo-font loads at startup. Keys must match the
// strings above exactly, or text silently falls back to the system
// font and nothing tells you why.
export const fontAssets = {
  'MatrixType-Regular': require('../assets/fonts/MatrixType-Regular.ttf'),
  'MatrixType-Bold': require('../assets/fonts/MatrixType-Bold.ttf'),
  'MatrixTypeDisplay-Regular': require('../assets/fonts/MatrixTypeDisplay-Regular.ttf'),
  'MatrixTypeDisplay-Bold': require('../assets/fonts/MatrixTypeDisplay-Bold.ttf'),
};

export const type = {
  // Display — the dotted face. Wide letter spacing suits it.
  hero:      { fontFamily: fonts.display, fontSize: 44, letterSpacing: 4 },
  title:     { fontFamily: fonts.display, fontSize: 26, letterSpacing: 2 },
  screen:    { fontFamily: fonts.display, fontSize: 21, letterSpacing: 1.5 },
  number:    { fontFamily: fonts.display, fontSize: 34, letterSpacing: 1 },
  numberBig: { fontFamily: fonts.display, fontSize: 46, letterSpacing: 1 },

  // Labels — solid face, small, always uppercase in use.
  label:     { fontFamily: fonts.label, fontSize: 13, letterSpacing: 1.6 },
  labelSm:   { fontFamily: fonts.label, fontSize: 11, letterSpacing: 1.4 },

  // Body — system font, normal sentence case.
  body:      { fontFamily: fonts.body, fontSize: 15, lineHeight: 21 },
  bodySm:    { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
} as const;

// ---------------------------------------------------------------
// SPACING
// ---------------------------------------------------------------
//
// A 4px scale. Every margin and padding picks from here rather than
// being typed in by hand. This is what produces a consistent rhythm
// down a screen — and inconsistent spacing is the fastest way for an
// app to look amateur even when the colours are right.

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  pill: 999,
} as const;

// ---------------------------------------------------------------
// SHARED PIECES
// ---------------------------------------------------------------

export const shared = {
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
  },
  // The glow on primary buttons. Subtle — it should read as "this is
  // live", not as a neon sign.
  glow: {
    shadowColor: colors.accent,
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8, // Android needs this; shadowRadius alone does nothing
  },
} as const;
