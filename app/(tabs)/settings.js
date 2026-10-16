// ---------------------------------------------------------------------------
// SETTINGS  (app/(tabs)/settings.js)
// ---------------------------------------------------------------------------
// Budget (with Edit), the daily Reminder (Step 7 - hidden in Expo Go where it
// can't run), and the Appearance toggle.
// ---------------------------------------------------------------------------

import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View, Platform } from 'react-native';
import { Alert } from '@/lib/alert';
import { useRouter } from 'expo-router';

import Button from '@/components/Button';
import Card from '@/components/Card';
import Screen from '@/components/Screen';
import Segmented from '@/components/Segmented';
import { formatCents } from '@/services/money';
import {
  ensurePermission,
  scheduleDailyReminder,
  cancelReminder,
  sendTestNotification,
  notificationsSupported,
} from '@/services/notifications';
import { formatDisplayDate, todayISO } from '@/utils/date';
import { hasExpenseOnDay } from '@/repositories/expenseRepo';
import { getSettings, setSetting } from '@/repositories/settingsRepo';
import { useBudget } from '@/state/BudgetProvider';
import { useTheme } from '@/theme/ThemeProvider';

const MODES = [
  { key: 'system', label: 'System' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
];

const HOURS = [18, 19, 20, 21, 22];
function hourLabel(h) {
  const period = h < 12 ? 'AM' : 'PM';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr} ${period}`;
}

async function reminderMessage() {
  const logged = await hasExpenseOnDay(todayISO());
  return logged
    ? 'Nice, you logged today — check your summary.'
    : "Don't forget to log today's expenses!";
}

export default function SettingsScreen() {
  const { theme, mode, setMode } = useTheme();
  const { period } = useBudget();
  const router = useRouter();

  const [remindOn, setRemindOn] = useState(false);
  const [hour, setHour] = useState(20);

  useEffect(() => {
    getSettings(['notif_enabled', 'notif_hour'])
      .then((s) => {
        setRemindOn(s.notif_enabled === '1');
        if (s.notif_hour) setHour(Number(s.notif_hour));
      })
      .catch((err) => console.error('[settings] load failed:', err));
  }, []);

  async function toggleReminder(next) {
    if (next) {
      const ok = await ensurePermission();
      if (!ok) {
        Alert.alert('Notifications off', 'Enable notifications for this app in your phone settings to get reminders.');
        return;
      }
      await scheduleDailyReminder({ hour, minute: 0, message: await reminderMessage() });
    } else {
      await cancelReminder();
    }
    setRemindOn(next);
    await setSetting('notif_enabled', next ? '1' : '0');
  }

  async function changeHour(h) {
    setHour(h);
    await setSetting('notif_hour', String(h));
    if (remindOn) {
      await scheduleDailyReminder({ hour: h, minute: 0, message: await reminderMessage() });
    }
  }

  async function testNow() {
    const ok = await sendTestNotification(await reminderMessage());
    if (!ok) {
      Alert.alert('Notifications off', 'Enable notifications for this app in your phone settings first.');
    } else {
      Alert.alert('Test sent', 'A notification should appear in about 3 seconds.');
    }
  }

  return (
    <Screen title="Settings">
      {/* --- Budget --- */}
      <Card style={{ marginBottom: theme.spacing.md, gap: theme.spacing.sm }}>
        <Text style={[theme.typography.label, { color: theme.colors.textMuted }]}>BUDGET</Text>
        {period ? (
          <>
            <View style={styles.rowBetween}>
              <Text style={[theme.typography.body, { color: theme.colors.textMuted }]}>
                {period.period_type === 'weekly' ? 'Weekly allowance' : 'Monthly allowance'}
              </Text>
              <Text style={[theme.typography.title, { color: theme.colors.text }]}>
                {formatCents(period.income_cents)}
              </Text>
            </View>
            <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
              {formatDisplayDate(period.start_date)} – {formatDisplayDate(period.end_date)} · Split{' '}
              {period.needs_pct}/{period.wants_pct}/{period.savings_pct}
            </Text>
            <Button
              title="Edit budget"
              variant="secondary"
              onPress={() => router.push('/budget-edit')}
              style={{ marginTop: theme.spacing.sm }}
            />
          </>
        ) : (
          <Text style={[theme.typography.body, { color: theme.colors.textMuted }]}>No active budget.</Text>
        )}
      </Card>

      {/* --- Daily reminder --- */}
      <Card style={{ marginBottom: theme.spacing.md, gap: theme.spacing.sm }}>
        <View style={styles.rowBetween}>
          <Text style={[theme.typography.label, { color: theme.colors.textMuted }]}>DAILY REMINDER</Text>
          {notificationsSupported ? (
            <Switch
              value={remindOn}
              onValueChange={toggleReminder}
              trackColor={{ true: theme.colors.accent, false: theme.colors.surfaceAlt }}
              thumbColor={theme.colors.surface}
            />
          ) : null}
        </View>

        {notificationsSupported ? (
          <>
            <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
              A nudge to log your expenses each day.
            </Text>
            {remindOn ? (
              <Segmented
                options={HOURS.map((h) => ({ key: String(h), label: hourLabel(h) }))}
                value={String(hour)}
                onChange={(k) => changeHour(Number(k))}
                style={{ marginTop: theme.spacing.sm }}
              />
            ) : null}
            <Button
              title="Send test notification"
              variant="secondary"
              onPress={testNow}
              style={{ marginTop: theme.spacing.sm }}
            />
          </>
        ) : (
          <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
            {Platform.OS === 'web'
              ? 'Daily reminders are a phone feature, so they are turned off in this web demo. Everything else works normally.'
              : "Reminders need a development build — they don't run inside Expo Go. Everything else in the app works normally."}
          </Text>
        )}
      </Card>

      {/* --- Appearance --- */}
      <Card>
        <Text style={[theme.typography.label, { color: theme.colors.textMuted, marginBottom: theme.spacing.sm }]}>
          APPEARANCE
        </Text>
        <View style={[styles.segment, { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.pill }]}>
          {MODES.map((m) => {
            const selected = mode === m.key;
            return (
              <Pressable
                key={m.key}
                onPress={() => setMode(m.key)}
                style={[
                  styles.segmentItem,
                  { backgroundColor: selected ? theme.colors.accent : 'transparent', borderRadius: theme.radius.pill },
                ]}
              >
                <Text
                  style={[theme.typography.label, { color: selected ? theme.colors.onAccent : theme.colors.textMuted }]}
                >
                  {m.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: 'row', padding: 4 },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});