// ---------------------------------------------------------------------------
// EDIT EXPENSE  (app/expense/[id].js)  -> route "/expense/123"
// ---------------------------------------------------------------------------
// The "[id]" filename is a DYNAMIC route: whatever number is in the URL is
// available via useLocalSearchParams(). We load that expense + the categories,
// prefill the shared ExpenseForm, and save with updateExpense. Delete uses a
// confirmation dialog and the soft-delete in the repository.
// ---------------------------------------------------------------------------

import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Alert } from '@/lib/alert';
import { useLocalSearchParams, useRouter } from 'expo-router';

import Card from '@/components/Card';
import Screen from '@/components/Screen';
import ExpenseForm from '@/features/expenses/ExpenseForm';
import { listCategories } from '@/repositories/categoryRepo';
import { getExpenseById, updateExpense, softDeleteExpense } from '@/repositories/expenseRepo';
import { useBudget } from '@/state/BudgetProvider';
import { useTheme } from '@/theme/ThemeProvider';

export default function EditExpense() {
  const { theme } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const expenseId = Number(id);
  const { refresh } = useBudget();

  const [categories, setCategories] = useState([]);
  const [initial, setInitial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load the expense and the category list together.
  useEffect(() => {
    (async () => {
      try {
        const [cats, expense] = await Promise.all([listCategories(), getExpenseById(expenseId)]);
        setCategories(cats);
        if (expense) {
          setInitial({
            amountText: String(expense.amount_cents / 100),
            categoryId: expense.category_id,
            bucket: expense.bucket,
            note: expense.note ?? '',
            spentAt: expense.spent_at,
          });
        }
      } catch (err) {
        console.error('[edit] load failed:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [expenseId]);

  async function handleSave(values) {
    setSaving(true);
    try {
      await updateExpense(expenseId, values);
      await refresh();
      router.back();
    } catch (err) {
      console.error('[edit] save failed:', err);
      Alert.alert('Could not save', 'Please try again.');
      setSaving(false);
    }
  }

  function confirmDelete() {
    Alert.alert('Delete expense?', 'This removes it from your history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setSaving(true);
          try {
            await softDeleteExpense(expenseId);
            await refresh();
            router.back();
          } catch (err) {
            console.error('[edit] delete failed:', err);
            Alert.alert('Could not delete', 'Please try again.');
            setSaving(false);
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <Screen title="Edit expense">
        <ActivityIndicator color={theme.colors.accent} style={{ marginTop: theme.spacing.xl }} />
      </Screen>
    );
  }

  if (!initial) {
    return (
      <Screen title="Edit expense">
        <Card>
          <Text style={[theme.typography.body, { color: theme.colors.textMuted }]}>
            This expense could not be found.
          </Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen title="Edit expense">
      <ExpenseForm
        categories={categories}
        initial={initial}
        onSubmit={handleSave}
        submitLabel="Save changes"
        submitting={saving}
        onDelete={confirmDelete}
      />
    </Screen>
  );
}