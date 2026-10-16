// ---------------------------------------------------------------------------
// HISTORY  (app/history.js)  -> route "/history"
// ---------------------------------------------------------------------------
// The full expense history for the active period, grouped by day (newest
// first), each day showing its own total. Tapping a row opens the edit screen
// (where delete also lives). We reload on focus (useFocusEffect) so edits and
// deletes made on the edit screen show up when you come back.
// ---------------------------------------------------------------------------

import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import Card from '@/components/Card';
import Screen from '@/components/Screen';
import { groupByDay } from '@/services/history';
import { formatCents } from '@/services/money';
import { formatDayHeading } from '@/utils/date';
import { listExpensesForPeriod } from '@/repositories/expenseRepo';
import { useBudget } from '@/state/BudgetProvider';
import { useTheme } from '@/theme/ThemeProvider';

export default function HistoryScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { period } = useBudget();

  const [groups, setGroups] = useState([]);

  const load = useCallback(async () => {
    if (!period) {
      setGroups([]);
      return;
    }
    try {
      const rows = await listExpensesForPeriod(period.id);
      setGroups(groupByDay(rows));
    } catch (err) {
      console.error('[history] load failed:', err);
    }
  }, [period]);

  // Reload every time the screen comes into focus.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const isEmpty = groups.length === 0;

  return (
    <Screen title="History">
      {isEmpty ? (
        <Card>
          <Text style={[theme.typography.body, { color: theme.colors.textMuted }]}>
            No expenses logged yet. Add one from the Log tab.
          </Text>
        </Card>
      ) : (
        groups.map((group) => (
          <View key={group.day} style={{ marginBottom: theme.spacing.lg }}>
            {/* Day header with the day's total */}
            <View style={styles.dayHeader}>
              <Text style={[theme.typography.label, { color: theme.colors.textMuted }]}>
                {formatDayHeading(group.day)}
              </Text>
              <Text style={[theme.typography.label, { color: theme.colors.textMuted }]}>
                {formatCents(group.totalCents)}
              </Text>
            </View>

            <Card style={{ gap: 2 }}>
              {group.items.map((e) => {
                // Use the category's own color; fall back to the bucket color
                // for any expense whose category was removed.
                const color =
                  e.category_color || (e.bucket === 'need' ? theme.colors.needs : theme.colors.wants);
                return (
                  <Pressable
                    key={e.id}
                    onPress={() => router.push(`/expense/${e.id}`)}
                    style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
                  >
                    <View style={[styles.iconWrap, { backgroundColor: color + '22' }]}>
                      <Ionicons name={e.category_icon ?? 'pricetag-outline'} size={18} color={color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[theme.typography.title, { color: theme.colors.text }]}>
                        {e.category_name ?? 'Uncategorized'}
                      </Text>
                      {e.note ? (
                        <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]} numberOfLines={1}>
                          {e.note}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={[theme.typography.title, { color: theme.colors.text }]}>
                      {formatCents(e.amount_cents)}
                    </Text>
                  </Pressable>
                );
              })}
            </Card>
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  iconWrap: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
