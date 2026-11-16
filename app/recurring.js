// ---------------------------------------------------------------------------
// RECURRING EXPENSES  (app/recurring.js)  -> route "/recurring"
// ---------------------------------------------------------------------------
// Rent, bills, subscriptions: each one is logged automatically on its due date
// (the next time the app refreshes), so you don't have to remember them.
// Tap one to edit, pause or delete it.
// ---------------------------------------------------------------------------

import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import Button from '@/components/Button';
import Card from '@/components/Card';
import Screen from '@/components/Screen';
import { formatCents } from '@/services/money';
import { describeSchedule } from '@/services/recurring';
import { formatDayHeading } from '@/utils/date';
import { listRecurring } from '@/repositories/recurringRepo';
import { useTheme } from '@/theme/ThemeProvider';

export default function RecurringScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const router = useRouter();
  const [items, setItems] = useState([]);

  useFocusEffect(
    useCallback(() => {
      listRecurring()
        .then(setItems)
        .catch((err) => console.error('[recurring] load failed:', err));
    }, []),
  );

  const monthlyTotal = items
    .filter((r) => r.is_active)
    .reduce((s, r) => s + (r.frequency === 'weekly' ? Math.round((r.amount_cents * 52) / 12) : r.amount_cents), 0);

  return (
    <Screen title="Recurring">
      <Text style={[theme.typography.body, { color: c.textMuted, marginBottom: theme.spacing.md }]}>
        These are logged for you automatically on their due date.
      </Text>

      <Button
        title="New recurring expense"
        icon="add"
        onPress={() => router.push('/recurring-edit')}
        style={{ marginBottom: theme.spacing.md }}
      />

      {items.length === 0 ? (
        <Card>
          <Text style={[theme.typography.body, { color: c.textMuted }]}>
            Nothing yet. Add rent, bills or subscriptions so you never have to log them by hand.
          </Text>
        </Card>
      ) : (
        <>
          <View style={[styles.summary, { marginBottom: theme.spacing.sm }]}>
            <Text style={[theme.typography.label, { color: c.textMuted }]}>ABOUT {formatCents(monthlyTotal)} / MONTH</Text>
          </View>
          <Card style={{ paddingVertical: theme.spacing.xs }}>
            {items.map((r, i) => {
              const color = r.category_color || (r.bucket === 'need' ? c.needs : c.wants);
              const paused = !r.is_active;
              return (
                <View key={r.id}>
                  {i > 0 ? <View style={[styles.divider, { backgroundColor: c.border }]} /> : null}
                  <Pressable
                    onPress={() => router.push(`/recurring-edit?id=${r.id}`)}
                    style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : paused ? 0.5 : 1 }]}
                  >
                    <View style={[styles.icon, { backgroundColor: color + '22' }]}>
                      <Ionicons name={r.category_icon ?? 'repeat'} size={18} color={color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[theme.typography.title, { color: c.text }]} numberOfLines={1}>
                        {r.note || r.category_name || 'Recurring expense'}
                      </Text>
                      <Text style={[theme.typography.caption, { color: c.textMuted }]} numberOfLines={2}>
                        {describeSchedule(r.frequency, r.day)} ·{' '}
                        {paused ? 'Paused' : `Next: ${formatDayHeading(r.next_due)}`}
                      </Text>
                    </View>
                    <Text style={[theme.typography.title, { color: c.text }]}>{formatCents(r.amount_cents)}</Text>
                  </Pressable>
                </View>
              );
            })}
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { paddingHorizontal: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  icon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 50 },
});
