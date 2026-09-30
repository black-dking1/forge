/**
 * The bottom nav — HOME · (+) · SETTINGS — with the sliding bubble.
 *
 * The active tab's icon lifts out of the bar into a round "bubble"
 * that sits in a notch. Switch tabs and the bubble slides across
 * (360ms), the icon crossfades, and the phone ticks.
 *
 * WHY IT LIVES IN _layout INSTEAD OF ON EACH SCREEN
 * For the bubble to slide, the nav has to survive the switch from
 * Home to Settings. If each screen drew its own nav, switching would
 * throw one away and build a new one — nothing to animate. So there
 * is exactly one nav, drawn once in _layout on top of every screen.
 * It watches the current address (usePathname) and shows itself
 * only on /home and /settings. Everywhere else it slides away —
 * which is also how it hides itself inside a build.
 *
 * The same design on iPhone and Android. (iPhone used to get a Liquid
 * Glass capsule here; it now matches the FORGE design everywhere.)
 */

import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, tint, type, withAlpha } from '../theme';
import { curve } from '../lib/motion';
import { haptic } from '../lib/haptics';
import { DotIcon, type DotIconName } from './icons';
import { Press } from './ui';

type Tab = 'home' | 'settings';

const BUBBLE = 58;
const BAR_HEIGHT = 68;

/** How much space a screen should leave at the bottom for the nav. */
export function useNavSpace() {
  const insets = useSafeAreaInsets();
  return 30 + BAR_HEIGHT + 10 + insets.bottom + 16;
}

export function BottomNav() {
  return <BubbleNav />;
}

/** Which tab we're on, and a way to switch. */
function useTabs() {
  const pathname = usePathname();
  const router = useRouter();
  const current: Tab | null = pathname === '/home' ? 'home' : pathname === '/settings' ? 'settings' : null;

  const [lastTab, setLastTab] = useState<Tab>('home');
  if (current && current !== lastTab) setLastTab(current);

  function go(target: Tab) {
    if (target === current) return;
    haptic.select();
    router.replace(target === 'home' ? '/home' : '/settings');
  }
  function newBuild() {
    haptic.select();
    router.push('/new-project');
  }
  return { visible: current !== null, tab: current ?? lastTab, go, newBuild };
}

// ---------------------------------------------------------------
// The bubble in the notch (the mockup's design), on every phone
// ---------------------------------------------------------------

function BubbleNav() {
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);

  // (useTabs keeps the last tab while hidden, so the bubble doesn't
  // jump around behind your back while you're inside a build.)
  const { visible, tab, go, newBuild } = useTabs();

  // The bubble's centre sits over the middle of its column:
  // 1/6 of the way across for HOME, 5/6 for SETTINGS.
  const bubbleX = (tab === 'home' ? barWidth / 6 : (barWidth * 5) / 6) - BUBBLE / 2;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingTop: 30,
        paddingHorizontal: 12,
        paddingBottom: 10 + insets.bottom,
        // Content scrolling underneath fades out instead of colliding
        // with the bar.
        experimental_backgroundImage:
          `linear-gradient(180deg, ${withAlpha(colors.bg, 0)} 0%, ${withAlpha(colors.bg, 0.9)} 40%, ${colors.bg} 62%)`,
        transform: [{ translateY: visible ? 0 : 150 + insets.bottom }],
        opacity: visible ? 1 : 0,
        transitionProperty: ['transform', 'opacity'],
        transitionDuration: visible ? 320 : 220,
        transitionTimingFunction: visible ? curve.decelerate : curve.accelerate,
        pointerEvents: visible ? 'box-none' : 'none',
      }}
    >
      <View
        onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
        style={{
          height: BAR_HEIGHT,
          borderRadius: 22,
          backgroundColor: colors.nav,
          flexDirection: 'row',
        }}
      >
        {/* The bubble. The 7px ring in the background colour is what
            cuts the "notch" out of the bar. */}
        {barWidth > 0 ? (
          <Animated.View
            style={{
              position: 'absolute',
              top: -29,
              left: 0,
              width: BUBBLE,
              height: BUBBLE,
              borderRadius: BUBBLE / 2,
              backgroundColor: colors.nav,
              boxShadow: `0 0 0 7px ${colors.bg}`,
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ translateX: bubbleX }],
              transitionProperty: 'transform',
              transitionDuration: 360,
              transitionTimingFunction: curve.standard,
            }}
          >
            <View style={{ filter: `drop-shadow(0 0 4px ${tint(0.75)})` }}>
              <BubbleIcon name="home" shown={tab === 'home'} />
              <View style={{ position: 'absolute' }}>
                <BubbleIcon name="gear" shown={tab === 'settings'} />
              </View>
            </View>
          </Animated.View>
        ) : null}

        <NavItem label="HOME" icon="home" active={tab === 'home'} onPress={() => go('home')} />

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Press
            onPress={newBuild}
            scaleTo={0.9}
            accessibilityRole="button"
            accessibilityLabel="New build"
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.accent,
              experimental_backgroundImage: `linear-gradient(180deg, ${colors.accentTop} 0%, ${colors.accentBottom} 100%)`,
              boxShadow:
                `0 6px 20px ${tint(0.4)}, 0 0 32px ${tint(0.22)}, inset 0 1px 0 rgba(255,255,255,0.25)`,
            }}
          >
            <DotIcon name="plus" size={20} color={colors.onAccent} />
          </Press>
        </View>

        <NavItem label="SETTINGS" icon="gear" active={tab === 'settings'} onPress={() => go('settings')} />
      </View>
    </Animated.View>
  );
}

function BubbleIcon({ name, shown }: { name: DotIconName; shown: boolean }) {
  return (
    <Animated.View
      style={{
        opacity: shown ? 1 : 0,
        transform: [{ scale: shown ? 1 : 0.6 }],
        transitionProperty: ['opacity', 'transform'],
        transitionDuration: 240,
        transitionTimingFunction: curve.standard,
      }}
    >
      <DotIcon name={name} size={26} color={colors.accent} />
    </Animated.View>
  );
}

function NavItem({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: DotIconName;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 7, paddingBottom: 12 }}
    >
      {/* The icon steps aside while it's up in the bubble. */}
      <Animated.View
        style={{
          opacity: active ? 0 : 1,
          transitionProperty: 'opacity',
          transitionDuration: 180,
          transitionTimingFunction: curve.standard,
        }}
      >
        <DotIcon name={icon} size={22} color={colors.off} />
      </Animated.View>
      <Animated.Text
        style={[
          type.tab,
          {
            letterSpacing: 1.5,
            color: active ? colors.heading : colors.off,
            transitionProperty: 'color',
            transitionDuration: 240,
          },
        ]}
      >
        {label}
      </Animated.Text>
    </Pressable>
  );
}
