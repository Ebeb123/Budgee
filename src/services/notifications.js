// ---------------------------------------------------------------------------
// NOTIFICATIONS  (daily reminder + bill reminders, local only)
// ---------------------------------------------------------------------------
// Local notifications work in Expo Go and in real builds (only REMOTE push
// notifications need a development build, and this app doesn't use those).
// In the browser everything here is a safe no-op.
//
// Every notification gets an identifier, so the daily reminder and the bill
// reminders can be replaced independently without wiping each other out.
// ---------------------------------------------------------------------------

import { Platform } from 'react-native';

// Lazily require the module so the browser build never loads it.
let Notifications = null;
if (Platform.OS !== 'web') {
  try {
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
  } catch (err) {
    console.warn('[notifications] unavailable:', err);
    Notifications = null;
  }
}

/** true on phones (Expo Go included); false in the browser. */
export const notificationsSupported = Notifications != null;

const DAILY_ID = 'daily-reminder';

// Android needs a channel before it shows anything, and on Android 13+ the
// permission prompt won't appear until one exists. Importance can't change
// after creation, so bills get their own HIGH channel (banner + sound).
async function ensureChannel() {
  if (Notifications && Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Daily reminder',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    await Notifications.setNotificationChannelAsync('bills', {
      name: 'Bill due dates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
}

const channel = (id) => (Platform.OS === 'android' ? { channelId: id } : {});
const androidChannel = channel('reminders');

/** true if notifications are allowed (never prompts). */
export async function hasPermission() {
  if (!Notifications) return false;
  return (await Notifications.getPermissionsAsync()).status === 'granted';
}

/**
 * Ask for permission. Returns false in the browser or if denied.
 * @returns {Promise<boolean>}
 */
export async function ensurePermission() {
  if (!Notifications) return false;
  await ensureChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.status === 'granted';
}

/**
 * Replace any existing reminder with one repeating daily at hour:minute.
 * No-op in the browser.
 */
export async function scheduleDailyReminder({ hour, minute = 0, message }) {
  if (!Notifications) return;
  await ensureChannel();
  await Notifications.cancelScheduledNotificationAsync(DAILY_ID);
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_ID,
    content: { title: 'Budgee', body: message },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      ...androidChannel,
    },
  });
}

/** Cancel the daily reminder. No-op in the browser. */
export async function cancelReminder() {
  if (!Notifications) return;
  await Notifications.cancelScheduledNotificationAsync(DAILY_ID);
}

/**
 * Schedule one notification at an exact moment, replacing any with the same
 * identifier. Moments in the past are skipped. No-op in the browser.
 * @param {{ identifier: string, date: Date, title: string, body: string }} n
 */
export async function scheduleAt({ identifier, date, title, body, channelId = 'reminders' }) {
  if (!Notifications || date.getTime() <= Date.now()) return;
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: { title, body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, ...channel(channelId) },
  });
}

/** Cancel every scheduled notification whose identifier starts with `prefix`. */
export async function cancelByPrefix(prefix) {
  if (!Notifications) return;
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    all
      .filter((n) => n.identifier.startsWith(prefix))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

/**
 * Fire a one-off notification ~3s from now to verify it works.
 * Returns false in the browser or if permission was denied.
 * @returns {Promise<boolean>}
 */
export async function sendTestNotification(message) {
  if (!Notifications) return false;
  const ok = await ensurePermission();
  if (!ok) return false;
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Budgee',
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