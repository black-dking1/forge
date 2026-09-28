/**
 * Icons — copied path for path from your Claude Design export, so
 * they match the mockup exactly instead of "close enough" from an
 * icon pack.
 *
 * Each icon is a small SVG drawing. `viewBox` is the canvas it was
 * drawn on; the width you ask for scales it, and the height follows
 * so it never stretches.
 *
 * Use:  <Icon name="back" size={21} color={colors.text} />
 *
 * ON IPHONE the same names draw Apple's own SF Symbols instead — the
 * icons every iOS app uses — so buttons look native there. The
 * dot-matrix nav icons further down stay the same everywhere: they're
 * FORGE's own.
 */

import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { colors, ios } from '../theme';

type Drawing = {
  box: [number, number]; // viewBox width, height
  stroke?: number; //      line thickness; leave out for filled icons
  draw: (color: string) => React.ReactNode;
};

const ICONS = {
  back: { box: [22, 16], stroke: 2, draw: () => <Path d="M21 8H3M9 1.5 2 8l7 6.5" /> },
  arrow: { box: [22, 14], stroke: 2, draw: () => <Path d="M1 7h18M14 1.5 20 7l-6 5.5" /> },
  close: { box: [20, 20], stroke: 2, draw: () => <Path d="M4 4l12 12M16 4L4 16" /> },
  plus: { box: [20, 20], stroke: 2.2, draw: () => <Path d="M10 3.5v13M3.5 10h13" /> },
  trash: { box: [20, 22], stroke: 2, draw: () => <Path d="M2 5h16M7 5V2.5h6V5M4.5 5l1 14.5h9l1-14.5" /> },
  pencil: { box: [20, 20], stroke: 1.9, draw: () => <Path d="M13.5 3.5l3 3L7 16H4v-3z" /> },
  archive: { box: [22, 20], stroke: 1.9, draw: () => <Path d="M2 2h18v5H2zM4 7v11h14V7M8.5 11h5" /> },
  unarchive: { box: [22, 20], stroke: 1.9, draw: () => <Path d="M2 2h18v5H2zM4 7v11h14V7M11 16v-6M8.5 12.5 11 10l2.5 2.5" /> },
  refresh: { box: [22, 22], stroke: 2.2, draw: () => <Path d="M19 11a8 8 0 1 1-2.4-5.7M19 3v5h-5" /> },
  check: { box: [16, 16], stroke: 2.6, draw: () => <Path d="M3 8.4 L6.4 11.6 L13 4.8" /> },
  signOut: { box: [22, 20], stroke: 2, draw: () => <Path d="M9 2H3v16h6M14 6l4 4-4 4M18 10H8" /> },
  share: { box: [22, 22], stroke: 1.9, draw: () => <Path d="M11 14V2.5M6.5 7 11 2.5 15.5 7M4 11.5V19h14v-7.5" /> },
  template: { box: [22, 22], stroke: 1.9, draw: () => <Path d="M11 2.5 2.5 7 11 11.5 19.5 7zM2.5 11.5 11 16l8.5-4.5M2.5 15.5 11 20l8.5-4.5" /> },
  image: {
    box: [22, 20],
    stroke: 1.9,
    draw: () => (
      <>
        <Rect x={2} y={2} width={18} height={16} rx={2.5} />
        <Path d="M2.5 15l5-5 4 4 3-3 5 5" />
        <Circle cx={15} cy={7} r={1.6} />
      </>
    ),
  },
  text: { box: [22, 20], stroke: 1.9, draw: () => <Path d="M3 4h16M3 9h16M3 14h10" /> },
  search: {
    box: [24, 24],
    stroke: 1.9,
    draw: () => (
      <>
        <Circle cx={10.5} cy={10.5} r={6.5} />
        <Path d="M15.5 15.5 21 21" />
      </>
    ),
  },
  mail: {
    box: [24, 24],
    stroke: 1.9,
    draw: () => (
      <>
        <Rect x={2.5} y={5} width={19} height={14} rx={2.5} />
        <Path d="M3 7.5 12 13.5 21 7.5" />
      </>
    ),
  },
  lock: {
    box: [24, 24],
    stroke: 1.9,
    draw: () => (
      <>
        <Rect x={4} y={10.5} width={16} height={11} rx={2.5} />
        <Path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
      </>
    ),
  },
  user: {
    box: [24, 24],
    stroke: 1.9,
    draw: () => (
      <>
        <Circle cx={12} cy={8} r={4} />
        <Path d="M4 21c0-4.2 3.6-7 8-7s8 2.8 8 7" />
      </>
    ),
  },
  more: {
    box: [6, 22],
    draw: (color) => (
      <>
        <Circle cx={3} cy={3} r={2.2} fill={color} />
        <Circle cx={3} cy={11} r={2.2} fill={color} />
        <Circle cx={3} cy={19} r={2.2} fill={color} />
      </>
    ),
  },
} satisfies Record<string, Drawing>;

export type IconName = keyof typeof ICONS;

// The SF Symbol for each icon on iPhone, and how big it should look
// next to the SVG version (symbols carry their own padding).
const SYMBOLS: Record<IconName, { name: SymbolViewProps['name'] & string; scale?: number; weight?: SymbolViewProps['weight'] }> = {
  back: { name: 'chevron.backward', scale: 0.9, weight: 'semibold' },
  arrow: { name: 'arrow.right', scale: 0.85, weight: 'semibold' },
  close: { name: 'xmark', scale: 0.85, weight: 'semibold' },
  plus: { name: 'plus', weight: 'semibold' },
  trash: { name: 'trash' },
  pencil: { name: 'pencil' },
  archive: { name: 'archivebox' },
  unarchive: { name: 'tray.and.arrow.up' },
  refresh: { name: 'arrow.clockwise', weight: 'semibold' },
  check: { name: 'checkmark', weight: 'bold' },
  signOut: { name: 'rectangle.portrait.and.arrow.right' },
  share: { name: 'square.and.arrow.up' },
  template: { name: 'square.stack.3d.up' },
  image: { name: 'photo' },
  text: { name: 'text.alignleft' },
  search: { name: 'magnifyingglass', scale: 0.9 },
  mail: { name: 'envelope' },
  lock: { name: 'lock' },
  user: { name: 'person' },
  more: { name: 'ellipsis', weight: 'bold' },
};

export function Icon({
  name,
  size = 20,
  color = colors.text,
}: {
  name: IconName;
  /** width in pixels; height is worked out from the drawing */
  size?: number;
  color?: string;
}) {
  if (ios) {
    const symbol = SYMBOLS[name];
    // "more" is drawn as a thin vertical strip in SVG (size ≈ 5), so
    // it needs a sensible size of its own as a symbol.
    const pointSize = name === 'more' ? 18 : Math.round(size * (symbol.scale ?? 1));
    return (
      <SymbolView
        name={symbol.name}
        size={pointSize}
        tintColor={color}
        weight={symbol.weight ?? 'medium'}
        style={{ width: pointSize + 2, height: pointSize + 2 }}
      />
    );
  }

  const icon: Drawing = ICONS[name];
  const [boxWidth, boxHeight] = icon.box;
  const height = (size * boxHeight) / boxWidth;

  return (
    <Svg width={size} height={height} viewBox={`0 0 ${boxWidth} ${boxHeight}`}>
      {icon.stroke ? (
        // Line icons: every shape inside inherits the same stroke.
        <StrokeGroup color={color} width={icon.stroke}>
          {icon.draw(color)}
        </StrokeGroup>
      ) : (
        icon.draw(color)
      )}
    </Svg>
  );
}

function StrokeGroup({
  color,
  width,
  children,
}: {
  color: string;
  width: number;
  children: React.ReactNode;
}) {
  return (
    <G fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </G>
  );
}

// ---------------------------------------------------------------
// DOT-MATRIX ICONS — the bottom nav, and the icon on each build
// ---------------------------------------------------------------
//
// Drawn as a grid of dots, one '#' per lit dot, so they belong to
// the same family as the Doto font. Straight from the mockup.

const DOT_GRIDS = {
  home: ['....#....', '...#.#...', '..#...#..', '.#.....#.', '#.......#', '.#.....#.', '.#.###.#.', '.#.#.#.#.', '.###.###.'],
  gear: ['..#.#.#..', '.#######.', '##.....##', '.#.###.#.', '##.#.#.##', '.#.###.#.', '##.....##', '.#######.', '..#.#.#..'],
  plus: ['...#...', '...#...', '...#...', '#######', '...#...', '...#...', '...#...'],
} as const;

export type DotIconName = keyof typeof DOT_GRIDS;

/** Turns the '#' grid into one SVG path made of little circles. */
function dotPath(rows: readonly string[]) {
  let path = '';
  rows.forEach((row, y) => {
    row.split('').forEach((cell, x) => {
      if (cell === '#') {
        path += `M${x + 0.12} ${y + 0.5}a0.38 0.38 0 1 0 0.76 0a0.38 0.38 0 1 0 -0.76 0`;
      }
    });
  });
  return path;
}

// ---------------------------------------------------------------
// BUILD ICONS — the picture on each build's folder on Home
// ---------------------------------------------------------------
//
// Straight from the Home v3 mockup. The database stores the NAME
// ('hexapod'), and migration 07 only checks that it looks like a name,
// so adding a ninth icon here needs no database change. Anything this
// list doesn't know is drawn as the bolt.

const BUILD_GRIDS = {
  hexapod: ['.#.....#.', '..#...#..', '...###...', '#.#####.#', '.#######.', '#.#####.#', '.#######.', '#.#####.#', '...#.#...'],
  sun: ['....#....', '.#.....#.', '...###...', '..#####..', '#.#####.#', '..#####..', '...###...', '.#.....#.', '....#....'],
  gear: ['..#.#.#..', '.#######.', '##.....##', '.#.###.#.', '##.#.#.##', '.#.###.#.', '##.....##', '.#######.', '..#.#.#..'],
  bolt: ['.....##..', '....##...', '...##....', '..#####..', '....##...', '...##....', '..##.....', '.##......', '.........'],
  wave: ['.........', '.##......', '#..#.....', '#..#...#.', '....#..#.', '....#.#..', '.....#...', '.........', '#########'],
  cloud: ['.........', '...###...', '..#...#..', '.#.....##', '#.......#', '#.......#', '.#######.', '..#.#.#..', '.#.#.#...'],
  plane: ['....#....', '....#....', '...###...', '.#######.', '#########', '....#....', '....#....', '...###...', '..#####..'],
  heart: ['.##...##.', '#########', '#########', '#########', '.#######.', '..#####..', '...###...', '....#....', '.........'],
} as const;

export type BuildIconName = keyof typeof BUILD_GRIDS;

/** Every build icon, in the order the picker shows them. */
export const BUILD_ICONS = Object.keys(BUILD_GRIDS) as BuildIconName[];

// Each icon's path is worked out once, not every time a card draws.
const BUILD_PATHS = Object.fromEntries(
  BUILD_ICONS.map((name) => [name, dotPath(BUILD_GRIDS[name])])
) as Record<BuildIconName, string>;

export function isBuildIcon(name: string): name is BuildIconName {
  // hasOwn, not "in": "in" would also say yes to built-in names like
  // "constructor", which pass the database's letters-only rule.
  return Object.prototype.hasOwnProperty.call(BUILD_GRIDS, name);
}

/** A build's icon. `name` comes from the database, so anything unknown becomes the bolt. */
export function BuildIcon({ name, size = 22, color = colors.accent }: { name: string; size?: number; color?: string }) {
  const known = isBuildIcon(name) ? name : 'bolt';
  return (
    <Svg width={size} height={size} viewBox="0 0 9 9" style={{ overflow: 'visible' }}>
      <Path d={BUILD_PATHS[known]} fill={color} />
    </Svg>
  );
}

export function DotIcon({
  name,
  size = 22,
  color = colors.text,
}: {
  name: DotIconName;
  size?: number;
  color?: string;
}) {
  const rows = DOT_GRIDS[name];
  const cells = rows[0].length;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${cells} ${cells}`} style={{ overflow: 'visible' }}>
      <Path d={dotPath(rows)} fill={color} />
    </Svg>
  );
}
