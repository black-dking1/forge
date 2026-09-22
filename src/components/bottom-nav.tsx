/**
 * The bottom navigation bar.
 *
 * Three destinations, matching the mockup: HOME, NEW, SETTINGS.
 *
 * Deliberately no icon library. Adding one would mean another
 * dependency and, for most of them, new native code — which means a
 * fresh build before you could see it. Labels in the FORGE display
 * face plus a lit dot for the active tab reads as more on-brand than
 * generic icons anyway, and it cannot fail to render.
 *
 * NEW is a push, not a tab — it opens a form you finish and leave,
 * so it gets the accent treatment rather than an active state.
 */

import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, space, type } from '../theme';

type Active = 'home' | 'settings' | null;

export function BottomNav({ active }: { active: Active }) {
  const router = useRouter();

  return (
    <View
      style={{
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.bg,
        paddingTop: space.md,
        paddingBottom: space.lg,
      }}
    >
      <Item
        label="HOME"
        active={active === 'home'}
        onPress={() => router.replace('/home')}
      />
      <Item
        label="+ NEW"
        accent
        onPress={() => router.push('/new-project')}
      />
      <Item
        label="SETTINGS"
        active={active === 'settings'}
        onPress={() => router.replace('/settings')}
      />
    </View>
  );
}

function Item({
  label,
  active,
  accent,
  onPress,
}: {
  label: string;
  active?: boolean;
  accent?: boolean;
  onPress: () => void;
}) {
  const colour = accent ? colors.accent : active ? colors.text : colors.textFaint;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        alignItems: 'center',
        opacity: pressed ? 0.6 : 1,
      })}
    >
      {/* The lit dot above the active tab */}
      <View
        style={{
          width: 4,
          height: 4,
          borderRadius: 2,
          marginBottom: space.sm,
          backgroundColor: active ? colors.accent : 'transparent',
        }}
      />
      <Text style={[type.labelSm, { color: colour }]}>{label}</Text>
    </Pressable>
  );
}
