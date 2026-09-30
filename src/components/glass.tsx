/**
 * Liquid Glass — iOS 26's see-through material.
 *
 * On an iPhone running iOS 26 or later, anything wrapped in <Glass>
 * becomes real Apple glass: it bends and blurs whatever scrolls behind
 * it, and catches light at its edges, exactly like the system's own
 * tab bars and buttons.
 *
 * Everywhere else — Android, older iPhones — it quietly becomes a
 * normal view with the `fallback` style (a dark translucent panel),
 * so nothing breaks and the layout stays identical.
 *
 * One rule from Expo's docs: never fade glass (or anything containing
 * it) with opacity — at 0 the glass stops rendering. Slide it instead.
 */

import type { ReactNode } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { theme } from '../theme';

function check(test: () => boolean) {
  try {
    return test();
  } catch {
    return false;
  }
}

/** True only where real Liquid Glass can be drawn. */
export const hasGlass =
  Platform.OS === 'ios' && check(isLiquidGlassAvailable) && check(isGlassEffectAPIAvailable);

export function Glass({
  children,
  style,
  fallback,
  tint,
  interactive = false,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** extra style used only when glass isn't available */
  fallback?: StyleProp<ViewStyle>;
  /** a colour mixed into the glass, e.g. a faint orange */
  tint?: string;
  /** glass that reacts to touch (the shimmer on press) */
  interactive?: boolean;
}) {
  if (!hasGlass) return <View style={[style, fallback]}>{children}</View>;
  return (
    <GlassView
      style={style}
      glassEffectStyle="regular"
      colorScheme={theme.mode} // light glass in light mode
      tintColor={tint}
      isInteractive={interactive}
    >
      {children}
    </GlassView>
  );
}
