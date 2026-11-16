// ---------------------------------------------------------------------------
// HISTORY  (app/history.js)  -> route "/history"
// ---------------------------------------------------------------------------
// The full expense history, grouped by day (newest first), each day showing
// its own total. Tapping a row opens the edit screen (where delete also lives).
//
// Search + filters (all applied on the phone, no extra queries):
//   - search box: matches the note, the category name, or an amount ("85")
//   - Needs / Wants
//   - time range: all time, this month, last month, last 7 / 30 days
// When anything is filtered, a summary line shows how many expenses match and
// their total. Expenses logged automatically by a recurring expense show a
// small repeat icon.
// ---------------------------------------------------------------------------

import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import Card from '@/components/Card';
import Dropdown from '@/components/Dropdown';
import Screen from '@/components/Screen';
import Segmented from '@/components/Segmented';
import { groupByDay } from '@/services/history';
import { formatCents } from '@/services/money';
import { addDays, currentYM, formatDayHeading, shiftYM, todayISO } from '@/utils/date';
import { listExpensesForPeriod } from '@/repositories/expenseRepo';
import { useBudget } from '@/state/BudgetProvider';
import { useTheme } from '@/theme/ThemeProvider';

const BUCKETS = [
  { key: 'all', label: 'All' },
  { key: 'need', label: 'Needs' },
  { key: 'want', label: 'Wants' },
];

const RANGES = [
  { value: 'all', label: 'All time' },
  { value: 'month', label: 'This month' },
  { value: 'lastMonth', label: 'Last month' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
];

/** Does an expense fall inside the chosen time range? */
function inRange(day, range) {
  const today = todayISO();
  switch (range) {
    case 'month':
      return day.startsWith(currentYM());
    case 'lastMonth':
      return day.startsWith(shiftYM(currentYM(), -1));
    case '7':
      return day >= addDays(today, -6);
    case '30':
      return day >= addDays(today, -29);
    default:
      return true;
  }
}

/** Does an expense match the search text (note, category, or amount)? */
function matchesQuery(e, q) {
  if (!q) return true;
  const text = `${e.note ?? ''} ${e.category_name ?? 'Uncategorized'}`.toLowerCase();
  if (text.includes(q)) return true;
  const digits = q.replace(/[₱,\s]/g, '');
  if (/^\d+(\.\d{0,2})?$/.test(digits)) {
    const pesos = (e.amount_cents / 100).toFixed(2);
    return pesos.startsWith(digits) || String(Math.floor(e.amount_cents / 100)) === digits;
  }
  return false;
}

export default function HistoryScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const router = useRouter();
  const { period } = useBudget();

  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState('');
  const [bucket, setBucket] = useState('all');
  const [range, setRange] = useState('all');

  const load = useCallback(async () => {
    if (!period) {
      setRows([]);
      return;
    }
    try {
      setRows(await listExpensesForPeriod(period.id));
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

  const q = query.trim().toLowerCase();
  const filtering = q !== '' || bucket !== 'all' || range !== 'all';

  const filtered = useMemo(
    () => rows.filter((e) => (bucket === 'all' || e.bucket === bucket) && inRange(e.spent_at, range) && matchesQuery(e, q)),
    [rows, bucket, range, q],
  );
  const groups = useMemo(() => groupByDay(filtered), [filtered]);
  const totalCents = filtered.reduce((s, e) => s + e.amount_cents, 0);

  return (
    <Screen title="History">
      {/* --- Search + filters --- */}
      <View style={{ gap: theme.spacing.sm, marginBottom: theme.spacing.md }}>
        <View style={[styles.search, { backgroundColor: c.surfaceAlt, borderColor: c.glassBorder }]}>
          <Ionicons name="search" size={18} color={c.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search notes, categories or amounts"
            placeholderTextColor={c.textMuted}
            style={[
              theme.typography.body,
              { flex: 1, color: c.text, paddingVertical: 12 },
              Platform.OS === 'web' && { outlineStyle: 'none' },
            ]}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={18} color={c.textMuted} />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.filterRow}>
          <Segmented options={BUCKETS} value={bucket} onChange={setBucket} style={{ flex: 1 }} />
          <Dropdown value={range} options={RANGES} onChange={setRange} />
        </View>
        {filtering ? (
          <View style={styles.summary}>
            <Text style={[theme.typography.caption, { color: c.textMuted }]}>
              {filtered.length} {filtered.length === 1 ? 'expense' : 'expenses'} · {formatCents(totalCents)}
            </Text>
            <Pressable
              onPress={() => {
                setQuery('');
                setBucket('all');
                setRange('all');
              }}
              hitSlop={8}
            >
              <Text style={[theme.typography.caption, { color: c.accent }]}>Clear filters</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {groups.length === 0 ? (
        <Card>
          <Text style={[theme.typography.body, { color: c.textMuted }]}>
            {rows.length === 0 ? 'No expenses logged yet. Add one from the Log tab.' : 'Nothing matches these filters.'}
          </Text>
        </Card>
      ) : (
        groups.map((group) => (
          <View key={group.day} style={{ marginBottom: theme.spacing.lg }}>
            {/* Day header with the day's total */}
            <View style={styles.dayHeader}>
              <Text style={[theme.typography.label, { color: c.textMuted }]}>{formatDayHeading(group.day)}</Text>
              <Text style={[theme.typography.label, { color: c.textMuted }]}>{formatCents(group.totalCents)}</Text>
            </View>

            <Card style={{ gap: 2, paddingVertical: theme.spacing.sm }}>
              {group.items.map((e) => {
                // Use the category's own color; fall back to the bucket color
                // for any expense whose category was removed.
                const color = e.category_color || (e.bucket === 'need' ? c.needs : c.wants);
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
                      <View style={styles.nameRow}>
                        <Text style={[theme.typography.title, { color: c.text, flexShrink: 1 }]} numberOfLines={1}>
                          {e.category_name ?? 'Uncategorized'}
                        </Text>
                        {e.recurring_id ? <Ionicons name="repeat" size={14} color={c.textMuted} /> : null}
                      </View>
                      {e.note ? (
                        <Text style={[theme.typography.caption, { color: c.textMuted }]} numberOfLines={1}>
                          {e.note}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={[theme.typography.title, { color: c.text }]}>{formatCents(e.amount_cents)}</Text>
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
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconWrap: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
