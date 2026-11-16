// ---------------------------------------------------------------------------
// LOG EXPENSE  (app/(tabs)/log.js)
// ---------------------------------------------------------------------------
// The add-expense screen:
//   - "Spent today" + your logging streak, with links to History / Recurring
//   - QUICK ADD: one-tap favourites ("Lunch ₱85"). Tap = logged for today.
//     Long-press a favourite to remove it.
//   - the shared ExpenseForm, with a "Save as quick-add" option
// Every add shows a "Logged ₱120 · Undo" toast for a few seconds, and calls
// refresh() so the dashboard's totals update immediately.
// ---------------------------------------------------------------------------

import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import Button from '@/components/Button';
import Card from '@/components/Card';
import Screen from '@/components/Screen';
import { useToast } from '@/components/Toast';
import ExpenseForm from '@/features/expenses/ExpenseForm';
import { Alert } from '@/lib/alert';
import * as haptics from '@/lib/haptics';
import { computeStreak } from '@/services/insights';
import { formatCents } from '@/services/money';
import { todayISO } from '@/utils/date';
import { listCategories } from '@/repositories/categoryRepo';
import { addExpense, recentExpenseDays, softDeleteExpense } from '@/repositories/expenseRepo';
import { createQuickAdd, deleteQuickAdd, listQuickAdds } from '@/repositories/quickAddRepo';
import { useBudget } from '@/state/BudgetProvider';
import { useTheme } from '@/theme/ThemeProvider';

export default function LogScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const router = useRouter();
  const toast = useToast();
  const { period, refresh, todaySpentCents } = useBudget();

  const [categories, setCategories] = useState([]);
  const [quickAdds, setQuickAdds] = useState([]);
  const [streak, setStreak] = useState({ count: 0, loggedToday: false });
  const [formKey, setFormKey] = useState(0);
  const [saving, setSaving] = useState(false);

  const loadStreak = useCallback(async () => {
    try {
      setStreak(computeStreak(await recentExpenseDays(), todayISO()));
    } catch (err) {
      console.error('[log] streak failed:', err);
    }
  }, []);

  // Reload on focus: categories / favourites may have changed elsewhere.
  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const [cats, quick] = await Promise.all([listCategories(), listQuickAdds()]);
          setCategories(cats);
          setQuickAdds(quick);
        } catch (err) {
          console.error('[log] load failed:', err);
        }
      })();
      loadStreak();
    }, [loadStreak]),
  );

  /** Insert an expense, then offer Undo. */
  async function log(values) {
    const id = await addExpense({ periodId: period.id, ...values });
    haptics.success();
    await refresh();
    loadStreak();
    toast.show({
      message: `Logged ${formatCents(values.amountCents)}`,
      actionLabel: 'Undo',
      onAction: async () => {
        try {
          await softDeleteExpense(id);
          await refresh();
          loadStreak();
        } catch (err) {
          console.error('[log] undo failed:', err);
        }
      },
    });
  }

  async function handleAdd({ saveAsQuickAdd, ...values }) {
    if (!period) return;
    setSaving(true);
    try {
      await log(values);
      if (saveAsQuickAdd) {
        await createQuickAdd(values);
        setQuickAdds(await listQuickAdds());
      }
      setFormKey((k) => k + 1); // reset the form for the next entry
    } catch (err) {
      console.error('[log] add expense failed:', err);
      haptics.warning();
      Alert.alert('Could not save', 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleQuickAdd(q) {
    if (!period || saving) return;
    setSaving(true);
    try {
      await log({
        categoryId: q.category_id,
        bucket: q.bucket,
        amountCents: q.amount_cents,
        note: q.note,
        spentAt: todayISO(),
      });
    } catch (err) {
      console.error('[log] quick add failed:', err);
      Alert.alert('Could not save', 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function confirmRemoveQuickAdd(q) {
    haptics.tap();
    Alert.alert('Remove quick-add?', `"${q.note || q.category_name}" will be removed from your quick-adds.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deleteQuickAdd(q.id);
          setQuickAdds(await listQuickAdds());
        },
      },
    ]);
  }

  const streakText =
    streak.count === 0
      ? 'Log something today to start a streak'
      : streak.loggedToday
        ? `${streak.count}-day streak`
        : `${streak.count}-day streak · log today to keep it`;

  return (
    <Screen title="Log Expense">
      <Card style={{ marginBottom: theme.spacing.md, gap: theme.spacing.sm }}>
        <View style={styles.rowBetween}>
          <Text style={[theme.typography.body, { color: c.textMuted }]}>Spent today</Text>
          <Text style={[theme.typography.title, { color: c.text }]}>{formatCents(todaySpentCents)}</Text>
        </View>
        <View style={styles.row}>
          <Ionicons name="flame" size={16} color={streak.count > 0 ? c.wants : c.textMuted} />
          <Text style={[theme.typography.caption, { color: streak.count > 0 ? c.text : c.textMuted }]}>{streakText}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
          <Button
            title="History"
            icon="time-outline"
            variant="secondary"
            onPress={() => router.push('/history')}
            style={{ flex: 1, paddingHorizontal: theme.spacing.sm }}
          />
          <Button
            title="Recurring"
            icon="repeat"
            variant="secondary"
            onPress={() => router.push('/recurring')}
            style={{ flex: 1, paddingHorizontal: theme.spacing.sm }}
          />
        </View>
      </Card>

      {quickAdds.length > 0 ? (
        <Card style={{ marginBottom: theme.spacing.md, gap: theme.spacing.sm }}>
          <View style={styles.rowBetween}>
            <Text style={[theme.typography.label, { color: c.textMuted }]}>QUICK ADD</Text>
            <Text style={[theme.typography.caption, { color: c.textMuted }]}>Hold to remove</Text>
          </View>
          <View style={styles.chips}>
            {quickAdds.map((q) => {
              const color = q.category_color || (q.bucket === 'need' ? c.needs : c.wants);
              return (
                <Pressable
                  key={q.id}
                  onPress={() => handleQuickAdd(q)}
                  onLongPress={() => confirmRemoveQuickAdd(q)}
                  disabled={saving}
                  style={({ pressed }) => [
                    styles.chip,
                    {
                      backgroundColor: c.surfaceAlt,
                      borderColor: c.glassBorder,
                      opacity: pressed ? 0.6 : 1,
                      transform: [{ scale: pressed ? 0.97 : 1 }],
                    },
                  ]}
                >
                  <View style={[styles.chipIcon, { backgroundColor: color + '26' }]}>
                    <Ionicons name={q.category_icon ?? 'pricetag-outline'} size={14} color={color} />
                  </View>
                  <View>
                    <Text style={[theme.typography.label, { color: c.text }]} numberOfLines={1}>
                      {q.note || q.category_name}
                    </Text>
                    <Text style={[theme.typography.caption, { color: c.textMuted }]}>{formatCents(q.amount_cents)}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Card>
      ) : null}

      {/* key forces a fresh form after each successful add */}
      <ExpenseForm key={formKey} categories={categories} onSubmit={handleAdd} submitting={saving} allowQuickAdd />
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 14,
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: '100%',
  },
  chipIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
