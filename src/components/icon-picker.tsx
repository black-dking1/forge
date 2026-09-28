/**
 * Picking a build's icon.
 *
 *   IconPicker — the 4 × 2 grid of dot-matrix icons (New Build screen)
 *   IconForm   — the same grid in a sheet, with SAVE (the build's ⋮ menu)
 *   guessIcon  — picks an icon from the build's name while you type
 *
 * The grid is the one from the Home v3 mockup's NEW BUILD sheet: the
 * picked tile lights up orange, the rest stay grey. The colours
 * cross-fade (200ms) like the chips do.
 */

import { useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { colors, space } from '../theme';
import { curve } from '../lib/motion';
import { haptic } from '../lib/haptics';
import { BUILD_ICONS, BuildIcon, type BuildIconName } from './icons';
import { LinkButton, Press, PrimaryButton } from './ui';

// Words in a build's name that suggest an icon. The first icon with a
// matching word wins, so "Solar charger" gets the sun, not the bolt.
const HINTS: [BuildIconName, string[]][] = [
  ['hexapod', ['hexapod', 'robot', 'bot', 'spider', 'walker', 'rover', 'crawler', 'legged', 'arm']],
  ['plane', ['drone', 'fpv', 'quad', 'quadcopter', 'plane', 'rocket', 'glider', 'rc', 'flight']],
  ['cloud', ['weather', 'cloud', 'rain', 'climate', 'humidity', 'air', 'greenhouse']],
  ['sun', ['solar', 'sun', 'lamp', 'light', 'lights', 'led', 'leds', 'lighting']],
  ['wave', ['synth', 'audio', 'sound', 'music', 'radio', 'speaker', 'amp', 'amplifier', 'guitar', 'pedal', 'signal']],
  ['gear', ['cnc', 'gear', 'gears', 'motor', 'printer', '3d', 'lathe', 'mill', 'machine', 'router', 'engine', 'clock']],
  ['heart', ['heart', 'gift', 'love', 'pulse', 'health', 'pet']],
  ['bolt', ['power', 'battery', 'charger', 'volt', 'electric', 'ebike', 'supply']],
];

/** The icon a build's name suggests, or null if nothing matches. */
export function guessIcon(name: string): BuildIconName | null {
  const words = new Set(name.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
  for (const [icon, hints] of HINTS) {
    if (hints.some((hint) => words.has(hint))) return icon;
  }
  return null;
}

export function IconPicker({ value, onChange }: { value: string; onChange: (icon: BuildIconName) => void }) {
  const rows = [BUILD_ICONS.slice(0, 4), BUILD_ICONS.slice(4, 8)];
  return (
    <View style={{ gap: 10 }} accessibilityRole="radiogroup" accessibilityLabel="Build icon">
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', gap: 10 }}>
          {row.map((icon) => {
            const on = icon === value;
            return (
              <Press
                key={icon}
                onPress={() => {
                  if (!on) haptic.select();
                  onChange(icon);
                }}
                scaleTo={0.94}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={icon}
                style={{ flex: 1 }}
              >
                <Animated.View
                  style={{
                    height: 60,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 12,
                    borderCurve: 'continuous',
                    borderWidth: 1,
                    borderColor: on ? colors.accentPicked : colors.tileLine,
                    backgroundColor: on ? colors.accentSoft : colors.bg,
                    transitionProperty: ['borderColor', 'backgroundColor'],
                    transitionDuration: 200,
                    transitionTimingFunction: curve.standard,
                  }}
                >
                  <BuildIcon name={icon} size={26} color={on ? colors.accent : colors.nodeLine} />
                </Animated.View>
              </Press>
            );
          })}
        </View>
      ))}
    </View>
  );
}

/** The inside of the "Build icon" sheet on a build's ⋮ menu. */
export function IconForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: string;
  onSave: (icon: BuildIconName) => Promise<void> | void;
  onCancel: () => void;
}) {
  const [icon, setIcon] = useState<string>(initial);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (busy || icon === initial) return;
    setBusy(true);
    await onSave(icon as BuildIconName);
    setBusy(false);
  }

  return (
    <View style={{ gap: space.lg, paddingTop: space.sm }}>
      <IconPicker value={icon} onChange={setIcon} />
      <PrimaryButton label="SAVE ICON" onPress={save} busy={busy} disabled={icon === initial} />
      <LinkButton label="CANCEL" onPress={onCancel} />
    </View>
  );
}
