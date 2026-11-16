// ---------------------------------------------------------------------------
// SETTINGS  (app/(tabs)/settings.js)
// ---------------------------------------------------------------------------
// Budget (with Edit), Manage (bills, categories, recurring expenses), the daily
// Reminder (phones only), Appearance (theme + hide
// amounts) and - in the browser only - erasing this browser's data.
// ---------------------------------------------------------------------------

import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Alert } from '@/lib/alert';
import { useRouter } from 'expo-router';

import Button from '@/components/Button';
import Card from '@/components/Card';
import Screen from '@/components/Screen';
import Segmented from '@/components/Segmented';
import { DB_NAME } from '@/db/database';
import { resetDatabase } from '@/db/sqlite';
import * as haptics from '@/lib/haptics';
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
  const { theme, mode, setMode, hideAmounts, setHideAmounts } = useTheme();
  const c = theme.colors;
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

  function eraseBrowserData() {
    Alert.alert(
      'Reset the demo?',
      'Any changes you made are thrown away and the sample data is loaded fresh.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetDatabase(DB_NAME);
            window.location.reload();
          },
        },
      ],
    );
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

      {/* --- Manage --- */}
      <Card style={{ marginBottom: theme.spacing.md, paddingVertical: theme.spacing.sm }}>
        <Text style={[theme.typography.label, { color: c.textMuted, marginTop: theme.spacing.xs, marginBottom: 4 }]}>
          MANAGE
        </Text>
        <NavRow icon="pricetags-outline" label="Categories" hint="Add, rename, recolour or hide" onPress={() => router.push('/categories')} />
        <View style={[styles.divider, { backgroundColor: c.border }]} />
        <NavRow icon="receipt-outline" label="Bills" hint="Due dates, account numbers, reminders" onPress={() => router.push('/bills')} />
        <View style={[styles.divider, { backgroundColor: c.border }]} />
        <NavRow icon="repeat" label="Recurring expenses" hint="Rent, bills, subscriptions" onPress={() => router.push('/recurring')} />
        <View style={[styles.divider, { backgroundColor: c.border }]} />
        <NavRow icon="time-outline" label="History" hint="Search and filter every expense" onPress={() => router.push('/history')} />
      </Card>

      {/* --- Daily reminder --- */}
      <Card style={{ marginBottom: theme.spacing.md, gap: theme.spacing.sm }}>
        <View style={styles.rowBetween}>
          <Text style={[theme.typography.label, { color: theme.colors.textMuted }]}>DAILY REMINDER</Text>
          {notificationsSupported ? (
            <Switch
              value={remindOn}
              onValueChange={toggleReminder}
              trackColor={{ true: c.accent, false: c.border }}
              thumbColor={theme.scheme === 'dark' ? '#FFFFFF' : c.surface}
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
            Daily reminders are a phone feature, so they are off in the browser. Everything else works normally.
          </Text>
        )}
      </Card>

      {/* --- Appearance --- */}
      <Card style={{ gap: theme.spacing.md, marginBottom: Platform.OS === 'web' ? theme.spacing.md : 0 }}>
        <Text style={[theme.typography.label, { color: c.textMuted }]}>APPEARANCE</Text>
        <Segmented options={MODES} value={mode} onChange={setMode} />
        <View style={styles.rowBetween}>
          <View style={{ flex: 1, paddingRight: theme.spacing.md }}>
            <Text style={[theme.typography.body, { color: c.text }]}>Hide amounts</Text>
            <Text style={[theme.typography.caption, { color: c.textMuted }]}>
              Shows ₱•••• instead of numbers. Also on the dashboard's eye button.
            </Text>
          </View>
          <Switch
            value={hideAmounts}
            onValueChange={(v) => {
              haptics.select();
              setHideAmounts(v);
            }}
            trackColor={{ true: c.accent, false: c.border }}
            thumbColor={theme.scheme === 'dark' ? '#FFFFFF' : c.surface}
          />
        </View>
      </Card>

      {/* --- Browser only: start over --- */}
      {Platform.OS === 'web' ? (
        <Card style={{ gap: theme.spacing.sm }}>
          <Text style={[theme.typography.label, { color: c.textMuted }]}>DEMO</Text>
          <Text style={[theme.typography.caption, { color: c.textMuted }]}>
            This is a demo with made-up data. Changes stay only in this browser.
          </Text>
          <Button title="Reset demo" variant="danger" icon="refresh-outline" onPress={eraseBrowserData} />
        </Card>
      ) : null}
    </Screen>
  );
}

/** A tappable row that opens another screen. */
function NavRow({ icon, label, hint, onPress }) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.navRow, { opacity: pressed ? 0.6 : 1 }]}>
      <View style={[styles.navIcon, { backgroundColor: c.surfaceAlt, borderColor: c.glassBorder }]}>
        <Ionicons name={icon} size={18} color={c.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[theme.typography.body, { color: c.text }]}>{label}</Text>
        <Text style={[theme.typography.caption, { color: c.textMuted }]}>{hint}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  navIcon: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 48 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});