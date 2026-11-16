// ---------------------------------------------------------------------------
// HAPTICS  (small vibrations on key moments)
// ---------------------------------------------------------------------------
// Thin wrapper around expo-haptics so screens call one-word helpers and never
// worry about errors. Phones only: browsers either can't vibrate or do it
// clumsily, so on web these are no-ops.
// ---------------------------------------------------------------------------

import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const enabled = Platform.OS !== 'web';

function safe(fn) {
  if (!enabled) return;
  fn().catch(() => {}); // a missing vibration motor is never an error worth showing
}

/** Something was saved / logged. */
export const success = () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));

/** Something went wrong or needs attention. */
export const warning = () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));

/** A choice changed (tabs, chips, toggles). */
export const select = () => safe(() => Haptics.selectionAsync());

/** A light tap (quick-add buttons, opening things). */
export const tap = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
