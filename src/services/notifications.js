// ---------------------------------------------------------------------------
// NOTIFICATIONS  (local daily reminder)
// ---------------------------------------------------------------------------
// IMPORTANT: since SDK 53, importing expo-notifications inside Expo Go throws
// (the module auto-registers a push-token listener that Expo Go no longer
// supports). So we detect Expo Go FIRST and only load the module when we're
// NOT in Expo Go - i.e. in a real development/standalone build. In Expo Go the
// functions below become safe no-ops, and the app runs fine without reminders.
//
// To actually use reminders, build a development build:
//   https://docs.expo.dev/develop/development-builds/introduction/
// ---------------------------------------------------------------------------

import { Platform } from 'react-native';
import Constants from 'expo-constants';

// true only when NOT running inside Expo Go.
// Also false in the browser (web demo): daily reminders are a phone feature.
export const notificationsSupported =
  Platform.OS !== 'web' &&
  Constants.appOwnership !== 'expo' &&
  Constants.executionEnvironment !== 'storeClient';

// Lazily require the module so its side effects never execute in Expo Go.
let Notifications = null;
if (notificationsSupported) {
  Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** Android needs a channel before it will display any notification. */
async function ensureChannel() {
  if (Notifications && Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

const androidChannel = Platform.OS === 'android' ? { channelId: 'reminders' } : {};

/**
 * Ask for permission. Returns false in Expo Go (unsupported) or if denied.
 * @returns {Promise<boolean>}
 */
export async function ensurePermission() {
  if (!Notifications) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.status === 'granted';
}

/**
 * Replace any existing reminder with one repeating daily at hour:minute.
 * No-op in Expo Go.
 */
export async function scheduleDailyReminder({ hour, minute = 0, message }) {
  if (!Notifications) return;
  await ensureChannel();
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Budget Split', body: message },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      ...androidChannel,
    },
  });
}

/** Cancel the daily reminder. No-op in Expo Go. */
export async function cancelReminder() {
  if (!Notifications) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Fire a one-off notification ~3s from now to verify it works.
 * Returns false in Expo Go (unsupported) or if permission denied.
 * @returns {Promise<boolean>}
 */
export async function sendTestNotification(message) {
  if (!Notifications) return false;
  const ok = await ensurePermission();
  if (!ok) return false;
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Budget Split',
      body: message || 'Test reminder — notifications are working! 🎉',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 3,
      ...androidChannel,
    },
  });
  return true;
}