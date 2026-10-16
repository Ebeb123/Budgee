// ---------------------------------------------------------------------------
// ExpenseForm - the shared add/edit expense form.
// ---------------------------------------------------------------------------
// Used by BOTH the Log tab (add) and the edit screen (edit). Writing it once
// means the two stay in sync. It owns the form fields, validates them, and
// hands a clean values object to onSubmit - it does NOT touch the database
// itself, so the same form works for insert or update depending on the caller.
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { Text, View } from 'react-native';

import AmountInput from '@/components/AmountInput';
import Button from '@/components/Button';
import Card from '@/components/Card';
import DateStepper from '@/components/DateStepper';
import TextField from '@/components/TextField';
import CategoryPicker from '@/features/expenses/CategoryPicker';
import { toCents } from '@/services/money';
import { todayISO } from '@/utils/date';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * @param {object} props
 * @param {import('@/types').Category[]} props.categories
 * @param {object} [props.initial]   { amountText, categoryId, bucket, note, spentAt }
 * @param {(values: { amountCents: number, categoryId: number, bucket: 'need'|'want', note: string|null, spentAt: string }) => void} props.onSubmit
 * @param {string} [props.submitLabel='Add expense']
 * @param {boolean} [props.submitting]
 * @param {() => void} [props.onDelete]  when provided, shows a Delete button (edit mode)
 */
export default function ExpenseForm({
  categories,
  initial,
  onSubmit,
  submitLabel = 'Add expense',
  submitting = false,
  onDelete,
}) {
  const { theme } = useTheme();

  const [amountText, setAmountText] = useState(initial?.amountText ?? '');
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? null);
  const [bucket, setBucket] = useState(initial?.bucket ?? null);
  const [note, setNote] = useState(initial?.note ?? '');
  const [spentAt, setSpentAt] = useState(initial?.spentAt ?? todayISO());

  const amountCents = toCents(amountText);
  const canSubmit = amountCents != null && amountCents > 0 && categoryId != null && !submitting;

  const handleSelectCategory = (category) => {
    setCategoryId(category.id);
    setBucket(category.bucket); // the picked category fixes the bucket
  };

  const submit = () => {
    if (!canSubmit) return;
    onSubmit({
      amountCents,
      categoryId,
      bucket,
      note: note.trim() ? note.trim() : null,
      spentAt,
    });
  };

  return (
    <View style={{ gap: theme.spacing.md }}>
      <Card style={{ gap: theme.spacing.md }}>
        <Text style={[theme.typography.label, { color: theme.colors.textMuted }]}>AMOUNT</Text>
        <AmountInput value={amountText} onChangeText={setAmountText} autoFocus={!initial} />
      </Card>

      <Card>
        <CategoryPicker categories={categories} selectedId={categoryId} onSelect={handleSelectCategory} />
      </Card>

      <Card style={{ gap: theme.spacing.md }}>
        <TextField
          label="NOTE (OPTIONAL)"
          value={note}
          onChangeText={setNote}
          placeholder="e.g. lunch at the canteen"
          maxLength={80}
        />
        <View>
          <Text style={[theme.typography.label, { color: theme.colors.textMuted, marginBottom: 6 }]}>DATE</Text>
          <DateStepper value={spentAt} onChange={setSpentAt} />
        </View>
      </Card>

      <Button title={submitting ? 'Saving…' : submitLabel} onPress={submit} disabled={!canSubmit} />

      {onDelete ? (
        <Button title="Delete expense" variant="secondary" onPress={onDelete} disabled={submitting} />
      ) : null}
    </View>
  );
}