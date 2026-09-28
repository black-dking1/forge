/**
 * One task: a checkbox and a title.
 *
 * Ticking it plays the mockup's 200ms "task tick":
 *   0–100ms   the box fills orange from its centre
 *   60–200ms  the tick draws itself, left to right
 *   0–200ms   a line strikes through the title and the text dims
 * …and the phone gives a short Toggle_On tap (Toggle_Off to untick).
 *
 * All of it is driven by one number, `progress`, that slides from
 * 0 (not done) to 1 (done). Each part just reads a different slice
 * of it — so the pieces can never fall out of step.
 */

import { useEffect, useState } from 'react';
import { Text, View, type TextLayoutEvent } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { colors, radius, type } from '../theme';
import { ease } from '../lib/motion';
import { haptic } from '../lib/haptics';
import { Press } from './ui';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Plain strings, so the animation code can read them on the UI thread.
const TEXT_TODO = colors.soft;
const TEXT_DONE = colors.off;

export function TaskRow({
  title,
  done,
  subtitle,
  onToggle,
  onLongPress,
}: {
  title: string;
  done: boolean;
  /** e.g. the area name, shown under the title in the TASKS tab */
  subtitle?: string;
  onToggle: () => void;
  onLongPress?: () => void;
}) {
  const progress = useSharedValue(done ? 1 : 0);

  useEffect(() => {
    progress.set(withTiming(done ? 1 : 0, { duration: 200, easing: ease.standard }));
  }, [done, progress]);

  const fill = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(progress.get(), [0, 0.5], [0, 1], Extrapolation.CLAMP) }],
  }));

  // The tick is drawn by sliding a dash along its own path: at 16 the
  // dash is entirely "before" the line (invisible); at 0 it covers it.
  const tick = useAnimatedProps(() => ({
    strokeDashoffset: interpolate(progress.get(), [0.3, 1], [16, 0], Extrapolation.CLAMP),
  }));

  const textColor = useAnimatedStyle(() => ({
    color: interpolateColor(progress.get(), [0, 1], [TEXT_TODO, TEXT_DONE]),
  }));

  const strike = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.get() }],
  }));

  // The drawn strike line only works for one-line titles. Longer
  // titles fall back to the font's own line-through, which wraps
  // properly across lines.
  const [line, setLine] = useState({ count: 1, width: 0 });
  function measure(event: TextLayoutEvent) {
    const lines = event.nativeEvent.lines;
    const next = { count: lines.length, width: lines[0]?.width ?? 0 };
    if (next.count !== line.count || Math.abs(next.width - line.width) > 0.5) setLine(next);
  }
  const oneLine = line.count === 1;

  return (
    <Press
      onPress={() => {
        if (done) haptic.untick();
        else haptic.tick();
        onToggle();
      }}
      onLongPress={
        onLongPress
          ? () => {
              haptic.hold();
              onLongPress();
            }
          : undefined
      }
      delayLongPress={350}
      scaleTo={0.985}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={title}
      accessibilityHint={onLongPress ? 'Long press for more options' : undefined}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 13,
        paddingVertical: 15,
        paddingHorizontal: 16,
        borderRadius: radius.md,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.surface,
      }}
    >
      {/* The checkbox */}
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: radius.sm,
          borderWidth: 1,
          borderColor: colors.lineStrong,
          backgroundColor: colors.field,
        }}
      >
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: -1,
              left: -1,
              right: -1,
              bottom: -1,
              borderRadius: radius.sm,
              backgroundColor: colors.accent,
              boxShadow: '0 0 10px rgba(244,60,20,0.35)',
            },
            fill,
          ]}
        />
        <Svg width={15} height={15} viewBox="0 0 16 16" style={{ position: 'absolute', left: 2.5, top: 2.5 }}>
          <AnimatedPath
            d="M3 8.4 L6.4 11.6 L13 4.8"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={[16, 16]}
            animatedProps={tick}
          />
        </Svg>
      </View>

      {/* The title (and optional area name) */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View>
          <Animated.Text
            onTextLayout={measure}
            style={[
              type.task,
              textColor,
              { textDecorationLine: !oneLine && done ? 'line-through' : 'none' },
            ]}
          >
            {title}
          </Animated.Text>
          {oneLine && line.width > 0 ? (
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  left: 0,
                  top: 10.5,
                  width: line.width,
                  height: 1.5,
                  backgroundColor: TEXT_DONE,
                  transformOrigin: 'left',
                },
                strike,
              ]}
            />
          ) : null}
        </View>
        {subtitle ? (
          <Text style={[type.labelSm, { color: colors.label, marginTop: 4 }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Press>
  );
}
