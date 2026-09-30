/**
 * Things that float above a screen:
 *
 *   Sheet — slides up from the bottom (build menu, rename, confirm)
 *   Menu  — a small pop-up under the ⋮ button (area menu)
 *   Toast — a bar at the bottom with an UNDO button
 *
 * Each one is drawn INSIDE the screen that owns it (last, so it sits
 * on top) rather than as a separate native window. That keeps the
 * animations smooth on Android and lets the phone's back button
 * close them like you'd expect.
 */

import { useEffect, useState, type ReactNode } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutDown,
  LinearTransition,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, ink, ios, keyboard, radius, shade, shared, space, type } from '../theme';
import { curve, ease } from '../lib/motion';
import { NEXT_STEP_MAX } from '../lib/projects';
import { Icon, type IconName } from './icons';
import { LinkButton, PrimaryButton } from './ui';
import { Glass } from './glass';

/** Make the phone's back button close whatever is open. */
function useBackToClose(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true; // "handled" — don't also leave the screen
    });
    return () => listener.remove();
  }, [open, onClose]);
}

// ---------------------------------------------------------------
// SHEET
// ---------------------------------------------------------------

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** small label at the top of the sheet, e.g. the build's name */
  title?: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  useBackToClose(open, onClose);

  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end', pointerEvents: 'box-none', zIndex: 20 }]}
    >
      {open ? (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(160)}
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}
        >
          <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" />
        </Animated.View>
      ) : null}

      {open ? (
        <Animated.View
          entering={SlideInDown.duration(320).easing(ease.decelerate)}
          exiting={SlideOutDown.duration(200).easing(ease.accelerate)}
          layout={LinearTransition.duration(220).easing(ease.standard)}
          style={{
            paddingTop: 10,
            paddingHorizontal: space.xl,
            paddingBottom: space.xxl + insets.bottom,
            // iPhone sheets have bigger, smoother corners
            borderTopLeftRadius: ios ? 34 : radius.sheet,
            borderTopRightRadius: ios ? 34 : radius.sheet,
            borderCurve: 'continuous',
            backgroundColor: colors.sheet,
            borderTopWidth: 1,
            borderColor: colors.lineMid,
            boxShadow: `0 -20px 50px ${shade(0.5)}`,
          }}
        >
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.handle, alignSelf: 'center' }} />
          {title ? (
            <Text style={[type.label, { color: colors.label, marginTop: 18 }]} numberOfLines={1}>
              {title}
            </Text>
          ) : null}
          <View style={{ marginTop: 10 }}>{children}</View>
        </Animated.View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

/** One tappable line in a sheet: icon + label. */
export function SheetRow({
  icon,
  label,
  onPress,
  danger = false,
  last = false,
  badge,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  danger?: boolean;
  last?: boolean;
  /** e.g. "PRO" on features a free user can't use yet */
  badge?: string;
}) {
  const color = danger ? colors.danger : colors.text;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        minHeight: 56,
        paddingHorizontal: 2,
        borderBottomWidth: last ? 0 : 1,
        borderColor: ink(0.06),
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Icon name={icon} size={18} color={danger ? colors.danger : colors.dim} />
      <Text style={[type.bodyBold, { fontSize: 15, color, flex: 1 }]}>{label}</Text>
      {badge ? (
        <View style={{ paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.accentLine }}>
          <Text style={[type.labelSm, { color: colors.accent }]}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * The inside of a "rename" sheet: one input, SAVE, CANCEL.
 * Opens with the keyboard already up and the old name selected.
 */
export function RenameForm({
  initial,
  placeholder,
  saveLabel = 'SAVE',
  onSave,
  onCancel,
}: {
  initial: string;
  placeholder: string;
  saveLabel?: string;
  onSave: (value: string) => Promise<void> | void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const trimmed = value.trim();

  async function save() {
    if (!trimmed || busy) return;
    setBusy(true);
    await onSave(trimmed);
    setBusy(false);
  }

  return (
    <View style={{ gap: space.lg, paddingTop: space.sm }}>
      <View
        style={[
          {
            paddingHorizontal: 15,
            paddingVertical: 13,
            borderRadius: 12,
            borderWidth: 1,
            backgroundColor: colors.field,
          },
          shared.focusRing,
        ]}
      >
        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder={placeholder}
          placeholderTextColor={colors.faint}
          keyboardAppearance={keyboard()}
          autoFocus
          selectTextOnFocus
          returnKeyType="done"
          onSubmitEditing={save}
          maxLength={80}
          style={[type.input, { color: colors.heading, padding: 0 }]}
        />
      </View>
      <PrimaryButton label={saveLabel} onPress={save} busy={busy} disabled={!trimmed} />
      <LinkButton label="CANCEL" onPress={onCancel} />
    </View>
  );
}

/**
 * The inside of the "Parts you have" sheet: a bigger, multi-line box.
 * Unlike RenameForm it may be saved EMPTY (that clears the list), so
 * the Save button is never disabled.
 */
export function InventoryForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: string;
  onSave: (value: string) => Promise<void> | void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (busy) return;
    setBusy(true);
    await onSave(value.trim());
    setBusy(false);
  }

  return (
    <View style={{ gap: space.lg, paddingTop: space.sm }}>
      <View
        style={[
          {
            paddingHorizontal: 15,
            paddingVertical: 13,
            borderRadius: 12,
            borderWidth: 1,
            backgroundColor: colors.field,
          },
          shared.focusRing,
        ]}
      >
        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder="e.g. Arduino Uno, L298N motor driver, 2 DC motors, 4 wheels, an LED"
          placeholderTextColor={colors.faint}
          keyboardAppearance={keyboard()}
          autoFocus
          multiline
          maxLength={400}
          style={[type.body, { color: colors.heading, padding: 0, minHeight: 88, textAlignVertical: 'top' }]}
        />
      </View>
      <PrimaryButton label="SAVE" onPress={save} busy={busy} />
      <LinkButton label="CANCEL" onPress={onCancel} />
    </View>
  );
}

/**
 * The inside of the "Next step" sheet: one short line saying what to
 * do next time you sit down to build.
 *
 * Emptying the box and saving clears the step, so the button says
 * CLEAR STEP in that case. Enter saves rather than starting a new
 * line, because it's a one-liner.
 */
export function NextStepForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: string;
  onSave: (value: string) => Promise<void> | void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const clean = value.replace(/\s+/g, ' ').trim();
  const clearing = clean === '' && initial.trim() !== '';
  const nothingToDo = clean === '' && !clearing;

  async function save() {
    if (busy || nothingToDo) return;
    setBusy(true);
    await onSave(clean);
    setBusy(false);
  }

  return (
    <View style={{ gap: space.lg, paddingTop: space.sm }}>
      <View
        style={[
          {
            paddingHorizontal: 15,
            paddingVertical: 13,
            borderRadius: 12,
            borderWidth: 1,
            backgroundColor: colors.field,
          },
          shared.focusRing,
        ]}
      >
        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder="e.g. Repeat the button input test"
          placeholderTextColor={colors.faint}
          keyboardAppearance={keyboard()}
          autoFocus
          selectTextOnFocus
          multiline
          submitBehavior="submit"
          returnKeyType="done"
          onSubmitEditing={save}
          maxLength={NEXT_STEP_MAX}
          style={[type.body, { color: colors.heading, padding: 0, minHeight: 44, textAlignVertical: 'top' }]}
        />
        <Text style={[type.labelSm, { color: colors.label, alignSelf: 'flex-end', marginTop: 6 }]}>
          {value.length}/{NEXT_STEP_MAX}
        </Text>
      </View>
      <PrimaryButton
        label={clearing ? 'CLEAR STEP' : 'PIN IT'}
        onPress={save}
        busy={busy}
        disabled={nothingToDo}
      />
      <LinkButton label="CANCEL" onPress={onCancel} />
    </View>
  );
}

/** The inside of a "are you sure?" sheet for deleting things. */
export function ConfirmForm({
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  message: string;
  confirmLabel: string;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <View style={{ gap: space.lg, paddingTop: space.xs }}>
      <Text style={[type.body, { color: colors.dim }]}>{message}</Text>
      <PrimaryButton
        label={confirmLabel}
        tone="danger"
        busy={busy}
        onPress={async () => {
          setBusy(true);
          await onConfirm();
          setBusy(false);
        }}
      />
      <LinkButton label="CANCEL" onPress={onCancel} />
    </View>
  );
}

// ---------------------------------------------------------------
// MENU — the small pop-up under ⋮
// ---------------------------------------------------------------

export type MenuItem = { icon: IconName; label: string; onPress: () => void; danger?: boolean };

// Grows out of the top-right corner, where the ⋮ button is.
// (No fade on iPhone: Liquid Glass doesn't draw at opacity 0.)
const MENU_IN = ios
  ? { from: { transform: [{ scale: 0.6 }] }, to: { transform: [{ scale: 1 }] } }
  : { from: { opacity: 0, transform: [{ scale: 0.92 }] }, to: { opacity: 1, transform: [{ scale: 1 }] } };

export function Menu({
  open,
  onClose,
  items,
  top,
}: {
  open: boolean;
  onClose: () => void;
  items: MenuItem[];
  /** distance from the top of the screen */
  top: number;
}) {
  useBackToClose(open, onClose);

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 20, pointerEvents: 'box-none' }]}>
      {open ? (
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close menu" />
      ) : null}
      {open ? (
        <Animated.View
          exiting={FadeOut.duration(100)}
          style={{
            position: 'absolute',
            top,
            right: space.lg,
            width: ios ? 230 : 204,
            borderRadius: ios ? 22 : 14,
            borderCurve: 'continuous',
            boxShadow: `0 18px 40px ${shade(0.55)}`,
            transformOrigin: 'top right',
            animationName: MENU_IN,
            animationDuration: 180,
            animationTimingFunction: curve.decelerate,
          }}
        >
          <Glass
            style={{ padding: 6, borderRadius: ios ? 22 : 14, borderCurve: 'continuous' }}
            fallback={{ backgroundColor: colors.menu, borderWidth: 1, borderColor: ink(0.09) }}
          >
          {items.map((item, i) => (
            <View key={item.label}>
              {i > 0 ? <View style={{ height: 1, marginHorizontal: 8, backgroundColor: ink(0.06) }} /> : null}
              <Pressable
                onPress={() => {
                  onClose();
                  item.onPress();
                }}
                accessibilityRole="menuitem"
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  minHeight: 48,
                  paddingHorizontal: 14,
                  borderRadius: 9,
                  backgroundColor: pressed ? ink(0.05) : 'transparent',
                })}
              >
                <Icon name={item.icon} size={item.icon === 'trash' ? 15 : 16} color={item.danger ? colors.danger : colors.dim} />
                <Text style={[type.bodyBold, { fontSize: 14.5, color: item.danger ? colors.danger : colors.text }]}>
                  {item.label}
                </Text>
              </Pressable>
            </View>
          ))}
          </Glass>
        </Animated.View>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------
// TOAST — "Task deleted · UNDO"
// ---------------------------------------------------------------

export type ToastData = { message: string; actionLabel?: string; onAction?: () => void };

export function Toast({
  toast,
  onHide,
  bottom = space.xxl,
}: {
  toast: ToastData | null;
  onHide: () => void;
  bottom?: number;
}) {
  const insets = useSafeAreaInsets();

  // Disappear by itself after 4 seconds.
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onHide, 4000);
    return () => clearTimeout(timer);
  }, [toast, onHide]);

  return (
    <View
      style={{
        position: 'absolute',
        left: space.xl,
        right: space.xl,
        bottom: bottom + insets.bottom,
        pointerEvents: 'box-none',
        zIndex: 30,
      }}
    >
      {toast ? (
        <Animated.View
          entering={(ios ? SlideInDown : FadeInDown).duration(250).easing(ease.decelerate)}
          exiting={FadeOutDown.duration(180).easing(ease.accelerate)}
          accessibilityLiveRegion="polite"
          style={{ borderRadius: ios ? 22 : 14, boxShadow: `0 12px 30px ${shade(0.5)}` }}
        >
          <Glass
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.md,
              paddingVertical: 14,
              paddingHorizontal: space.lg,
              borderRadius: ios ? 22 : 14,
              borderCurve: 'continuous',
            }}
            fallback={{ backgroundColor: colors.node, borderWidth: 1, borderColor: ink(0.1) }}
          >
          <Text style={[type.bodyBold, { color: colors.text, flex: 1 }]} numberOfLines={2}>
            {toast.message}
          </Text>
          {toast.actionLabel && toast.onAction ? (
            <Pressable
              onPress={() => {
                toast.onAction?.();
                onHide();
              }}
              hitSlop={12}
              accessibilityRole="button"
            >
              <Text style={[type.buttonSm, { color: colors.accent }]}>{toast.actionLabel}</Text>
            </Pressable>
          ) : null}
          </Glass>
        </Animated.View>
      ) : null}
    </View>
  );
}
