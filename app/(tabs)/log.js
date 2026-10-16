// ---------------------------------------------------------------------------
// LOG EXPENSE  (app/(tabs)/log.js)
// ---------------------------------------------------------------------------
// The add-expense screen. It loads the categories, shows the shared
// ExpenseForm, and on submit writes the row then calls refresh() so the
// dashboard's bucket totals update immediately. After a successful add we bump
// `formKey` to reset the form for the next entry.
// ---------------------------------------------------------------------------

import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Alert } from '@/lib/alert';
import { useRouter } from 'expo-router';

import Button from '@/components/Button';
import Card from '@/components/Card';
import Screen from '@/components/Screen';
import ExpenseForm from '@/features/expenses/ExpenseForm';
import { formatCents } from '@/services/money';
import { listCategories } from '@/repositories/categoryRepo';
import { addExpense } from '@/repositories/expenseRepo';
import { useBudget } from '@/state/BudgetProvider';
import { useTheme } from '@/theme/ThemeProvider';

export default function LogScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { period, refresh, todaySpentCents } = useBudget();

  const [categories, setCategories] = useState([]);
  const [formKey, setFormKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  // Load the category list once. Categories are static in the MVP.
  useEffect(() => {
    listCategories()
      .then(setCategories)
      .catch((err) => console.error('[log] load categories failed:', err));
  }, []);

  async function handleAdd(values) {
    if (!period) return;
    setSaving(true);
    try {
      await addExpense({ periodId: period.id, ...values });
      await refresh(); // keep dashboard/buckets in sync
      setFormKey((k) => k + 1); // reset the form for the next entry
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2000);
    } catch (err) {
      console.error('[log] add expense failed:', err);
      Alert.alert('Could not save', 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen title="Log Expense">
      <Card style={{ marginBottom: theme.spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={[theme.typography.body, { color: theme.colors.textMuted }]}>Spent today</Text>
          <Text style={[theme.typography.title, { color: theme.colors.text }]}>
            {formatCents(todaySpentCents)}
          </Text>
        </View>
        {justAdded ? (
          <Text style={[theme.typography.label, { color: theme.colors.savings, marginTop: 6 }]}>Logged ✓</Text>
        ) : null}
        <Button
          title="View history"
          variant="secondary"
          onPress={() => router.push('/history')}
          style={{ marginTop: theme.spacing.md }}
        />
      </Card>

      {/* key forces a fresh form after each successful add */}
      <ExpenseForm key={formKey} categories={categories} onSubmit={handleAdd} submitting={saving} />
    </Screen>
  );
}