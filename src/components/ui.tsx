/**
 * The basic building blocks every screen is made of.
 *
 *   Screen        — the background with the warm glow
 *   Press         — anything tappable; shrinks slightly under your thumb
 *   PrimaryButton — the orange button
 *   DashedButton  — "+ NEW BUILD", "+ ADD TASK"
 *   GhostButton   — quiet secondary actions (sign out)
 *   LinkButton    — underlined text (restore purchases)
 *   LedLoader     — three pulsing LEDs instead of a spinner
 *   Header        — back arrow · build name · menu dots
 */

import { useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, glowFor, ink, ios, shared, space, tint, type } from '../theme';
import { curve, ease } from '../lib/motion';
import { Icon, type IconName } from './icons';
import { Glass } from './glass';

// ---------------------------------------------------------------
// SCREEN
// ---------------------------------------------------------------

export function Screen({
  children,
  top = true,
  style,
}: {
  children: ReactNode;
  /** leave room for the status bar (almost always yes) */
  top?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  // Worked out once when the screen opens, not on every re-render.
  const [glow] = useState(() => glowFor());

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View
        style={[
          StyleSheet.absoluteFill,
          { pointerEvents: 'none', experimental_backgroundImage: glow },
        ]}
      />
      <View style={[{ flex: 1, paddingTop: top ? insets.top : 0 }, style]}>{children}</View>
    </View>
  );
}

// ---------------------------------------------------------------
// PRESS — the 0.97 squeeze
// ---------------------------------------------------------------
//
// Every tappable thing shrinks to 97% while your thumb is on it and
// springs back when you let go. It's the cheapest way to make an app
// feel physical, and it confirms the tap before anything else has
// had time to happen.
//
// It runs on the UI thread (a "shared value"), so it stays smooth
// even while JavaScript is busy loading data.

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type PressProps = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  /** how small it gets while held — 1 means no squeeze */
  scaleTo?: number;
};

export function Press({ style, scaleTo = 0.97, onPressIn, onPressOut, children, ...rest }: PressProps) {
  const held = useSharedValue(0);

  const squeeze = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - (1 - scaleTo) * held.get() }],
  }));

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(event) => {
        held.set(withTiming(1, { duration: 90, easing: ease.standard }));
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        held.set(withTiming(0, { duration: 220, easing: ease.standard }));
        onPressOut?.(event);
      }}
      style={[style, squeeze]}
    >
      {children}
    </AnimatedPressable>
  );
}

// ---------------------------------------------------------------
// BUTTONS
// ---------------------------------------------------------------

export function PrimaryButton({
  label,
  onPress,
  busy = false,
  disabled = false,
  icon,
  tone = 'accent',
  style,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  icon?: IconName;
  /** 'danger' for delete confirmations */
  tone?: 'accent' | 'danger';
  style?: StyleProp<ViewStyle>;
}) {
  const danger = tone === 'danger';
  return (
    <Press
      onPress={onPress}
      disabled={busy || disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy, disabled }}
      style={[
        danger ? { backgroundColor: colors.dangerFill, borderRadius: 13, borderCurve: 'continuous' } : shared.primary,
        {
          minHeight: 54,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: space.md,
          paddingHorizontal: space.lg,
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      {busy ? (
        <LedLoader size={7} color={colors.onAccent} glow={false} />
      ) : (
        <>
          <Text style={[type.button, { color: colors.onAccent }]}>{label}</Text>
          {icon ? <Icon name={icon} size={icon === 'arrow' ? 19 : 17} color={colors.onAccent} /> : null}
        </>
      )}
    </Press>
  );
}

export function DashedButton({
  label,
  onPress,
  style,
}: {
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Press
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 11,
          paddingVertical: 17,
          borderRadius: 14,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: colors.accentLine,
          backgroundColor: colors.accentFaint,
        },
        style,
      ]}
    >
      <Icon name="plus" size={17} color={colors.accent} />
      <Text style={[type.button, { fontSize: 14, color: colors.accent }]}>{label}</Text>
    </Press>
  );
}

export function GhostButton({
  label,
  onPress,
  icon,
  color = colors.soft,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  color?: string;
}) {
  return (
    <Press
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 11,
        paddingVertical: space.lg,
        borderRadius: 13,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: ink(0.12),
        backgroundColor: colors.surface,
      }}
    >
      {icon ? <Icon name={icon} size={18} color={color} /> : null}
      <Text style={[type.buttonSm, { color }]}>{label}</Text>
    </Press>
  );
}

export function LinkButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      style={({ pressed }) => ({ alignSelf: 'center', opacity: pressed ? 0.6 : 1 })}
    >
      <Text
        style={[
          type.label,
          {
            fontSize: 12,
            color: colors.dim,
            textDecorationLine: 'underline',
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------
// LED LOADER
// ---------------------------------------------------------------
//
// Three LEDs pulsing one after another — 1200ms cycle, each 200ms
// behind the last. This is a CSS-style animation: the keyframes
// below are the same ones from your Claude Design file, and
// Reanimated plays them natively.

const LED_PULSE = {
  '0%': { opacity: 0.22, transform: [{ scale: 0.85 }] },
  '20%': { opacity: 1, transform: [{ scale: 1 }] },
  '45%': { opacity: 0.22, transform: [{ scale: 0.85 }] },
  '100%': { opacity: 0.22, transform: [{ scale: 0.85 }] },
};

export function LedLoader({
  size = 10,
  color = colors.accent,
  glow = true,
  label,
}: {
  size?: number;
  color?: string;
  glow?: boolean;
  label?: string;
}) {
  return (
    <View style={{ alignItems: 'center', gap: 22 }} accessibilityLabel={label ?? 'Loading'}>
      <View style={{ flexDirection: 'row', gap: size * 1.2 }}>
        {[0, 200, 400].map((delay) => (
          <Animated.View
            key={delay}
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: color,
              boxShadow: glow ? `0 0 ${size}px ${tint(0.7)}` : undefined,
              animationName: LED_PULSE,
              animationDuration: 1200,
              animationDelay: delay,
              animationIterationCount: 'infinite',
              animationTimingFunction: curve.pulse,
              animationFillMode: 'both',
            }}
          />
        ))}
      </View>
      {label ? <Text style={[type.label, { fontSize: 12, color: colors.label }]}>{label}</Text> : null}
    </View>
  );
}

// ---------------------------------------------------------------
// HEADER — back arrow, small title, optional menu dots
// ---------------------------------------------------------------

export function Header({
  title,
  onBack,
  onMenu,
  menuOpen = false,
  right,
  close = false,
}: {
  title: string;
  onBack?: () => void;
  onMenu?: () => void;
  menuOpen?: boolean;
  right?: ReactNode;
  /** show ✕ instead of ← (for screens that slide up, like New Project on iPhone) */
  close?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 22 }}>
      {onBack ? (
        <RoundButton icon={close ? 'close' : 'back'} label={close ? 'Close' : 'Back'} onPress={onBack} size={21} />
      ) : null}

      <Text style={[type.header, { color: colors.header, flex: 1 }]} numberOfLines={1}>
        {title}
      </Text>

      {right}

      {onMenu ? (
        <RoundButton icon="more" label="More options" onPress={onMenu} size={5} active={menuOpen} />
      ) : null}
    </View>
  );
}

/**
 * A round icon button for the top of a screen.
 *
 * iPhone: a Liquid Glass circle, like the buttons in Apple's own
 * iOS 26 apps. Android: just the icon, with a soft circle while open.
 * Either way it takes a 44×44 area — Apple's minimum touch size —
 * while only taking 22px of layout (the negative margin).
 */
function RoundButton({
  icon,
  label,
  onPress,
  size,
  active = false,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  size: number;
  active?: boolean;
}) {
  const color = active || icon !== 'more' ? colors.text : colors.dim;
  if (ios) {
    return (
      <Pressable onPress={onPress} hitSlop={6} accessibilityRole="button" accessibilityLabel={label} style={{ margin: -11 }}>
        <Glass
          interactive
          style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}
          fallback={{ backgroundColor: ink(0.08) }}
        >
          <Icon name={icon} size={size} color={colors.text} />
        </Glass>
      </Pressable>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        width: 44,
        height: 44,
        margin: -11,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: active ? ink(0.07) : 'transparent',
      }}
    >
      <Icon name={icon} size={size} color={color} />
    </Pressable>
  );
}

/** A small uppercase section label, e.g. "PROGRESS BY AREA". */
export function SectionLabel({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={style}>
      <Text style={[type.label, { color: colors.dim }]}>{children}</Text>
    </View>
  );
}

/** The outlined pill used for "ACTIVE", "3 / 3 BUILDS USED" and similar. */
export function Tag({ label, tone = 'accent' }: { label: string; tone?: 'accent' | 'quiet' }) {
  const accent = tone === 'accent';
  return (
    <View
      style={{
        paddingHorizontal: 11,
        paddingVertical: 5,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: accent ? colors.accentLine : colors.lineDashed,
      }}
    >
      <Text style={[type.labelSm, { color: accent ? colors.accent : colors.dim }]}>{label}</Text>
    </View>
  );
}
