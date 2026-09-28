/**
 * Haptics — the small taps you feel through the glass.
 *
 * Android and iPhone name their feedback differently, so each action
 * here picks the right one for the phone it's running on:
 *   Android — its own named patterns (Toggle_On, Segment_Tick…),
 *             tuned by the phone maker
 *   iPhone  — the Taptic Engine's impact / selection / notification
 *
 * Every call is fire-and-forget and can never throw: a phone with
 * haptics switched off should just stay quiet, not show an error.
 */

import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const ios = Platform.OS === 'ios';

function quietly(run: () => Promise<void>) {
  try {
    run().catch(() => {});
  } catch {
    // no haptics on this device — fine
  }
}

const android = (kind: Haptics.AndroidHaptics) => () => Haptics.performAndroidHapticsAsync(kind);

export const haptic = {
  /** a task ticked off */
  tick: () => quietly(ios ? () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) : android(Haptics.AndroidHaptics.Toggle_On)),
  /** a task unticked */
  untick: () => quietly(ios ? () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft) : android(Haptics.AndroidHaptics.Toggle_Off)),
  /** tabs, chips, nav */
  select: () => quietly(ios ? () => Haptics.selectionAsync() : android(Haptics.AndroidHaptics.Segment_Tick)),
  /** saved, created, bought */
  confirm: () =>
    quietly(ios ? () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) : android(Haptics.AndroidHaptics.Confirm)),
  /** something failed */
  reject: () =>
    quietly(ios ? () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error) : android(Haptics.AndroidHaptics.Reject)),
  /** a long-press opened a menu */
  hold: () => quietly(ios ? () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium) : android(Haptics.AndroidHaptics.Long_Press)),
  /** a swipe passed the delete point */
  swipe: () => quietly(ios ? () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid) : android(Haptics.AndroidHaptics.Gesture_Start)),
};
