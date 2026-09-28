/**
 * The pill switch: OVERVIEW / BLUEPRINT / TASKS, or SIGN IN / SIGN UP.
 *
 * The lighter pill behind the selected option SLIDES to its new spot
 * (250ms, standard curve) instead of jumping, and the phone gives a
 * Segment_Tick — the same tick One UI uses for its own switches.
 */

import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { colors, type } from '../theme';
import { curve } from '../lib/motion';
import { haptic } from '../lib/haptics';

const PAD = 4; // space around the options, and between them

export function PillTabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
}) {
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.key === value));

  // width includes the 1px border on each side
  const inner = width - 2 - PAD * 2;
  const segment = (inner - PAD * (options.length - 1)) / options.length;

  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        gap: PAD,
        padding: PAD,
        borderRadius: 999,
        backgroundColor: colors.sunk,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.07)',
      }}
    >
      {width > 0 ? (
        <Animated.View
          style={{
            position: 'absolute',
            top: PAD,
            bottom: PAD,
            left: PAD,
            width: segment,
            borderRadius: 999,
            backgroundColor: colors.pill,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)',
            transform: [{ translateX: index * (segment + PAD) }],
            transitionProperty: 'transform',
            transitionDuration: 250,
            transitionTimingFunction: curve.standard,
          }}
        />
      ) : null}

      {options.map((option) => {
        const active = option.key === value;
        return (
          <Pressable
            key={option.key}
            onPress={() => {
              if (active) return;
              haptic.select();
              onChange(option.key);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={{ flex: 1, paddingVertical: 14, alignItems: 'center' }}
          >
            <Animated.Text
              style={[
                type.tab,
                {
                  color: active ? colors.heading : colors.off,
                  transitionProperty: 'color',
                  transitionDuration: 200,
                },
              ]}
            >
              {option.label}
            </Animated.Text>
          </Pressable>
        );
      })}
    </View>
  );
}
