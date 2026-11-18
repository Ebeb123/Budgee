// ---------------------------------------------------------------------------
// EDIT MONEY  (app/budget-edit.js)  -> route "/budget-edit" (modal)
// ---------------------------------------------------------------------------
// Add money to your running total (type just the extra amount - the app adds
// it for you), or set the total directly, and/or change your 50/30/20 split.
//
// HOW money changes are recorded: we never overwrite the running total behind
// its back. If you raise or lower the amount here, we log the DIFFERENCE as an
// income-ledger event (a top-up when money comes in, or a downward adjustment)
// via addIncomeEvent - which keeps the ledger and the running total in sync.
// The split percentages are a plain property of the account, so those are saved
// directly with updatePeriod.
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { Text, View } from 'react-native';
import { Alert } from '@/lib/alert';
import { useRouter } from 'expo-router';

import AmountInput from '@/components/AmountInput';
import Button from '@/components/Button';
import Card from '@/components/Card';
import Segmented from '@/components/Segmented';
import Sheet from '@/components/Sheet';
import TextField from '@/components/TextField';
import * as haptics from '@/lib/haptics';
import SplitEditor from '@/features/budget/SplitEditor';
import { validateSplit } from '@/services/budget';
import { formatCents, toCents } from '@/services/money';
import { todayISO } from '@/utils/date';
import { updatePeriod } from '@/repositories/budgetRepo';
import { addIncomeEvent } from '@/repositories/incomeRepo';
import { useBudget } from '@/state/BudgetProvider';
import { useTheme } from '@/theme/ThemeProvider';

export default function BudgetEdit() {
  const { theme } = useTheme();
  const router = useRouter();
  const { period, refresh } = useBudget();

  // Prefill from the ongoing account. Guard for the (unlikely) no-account case.
  // 'add' = type only the new money and we add it; 'set' = type the new total.
  const [mode, setMode] = useState('add');
  const [addText, setAddText] = useState('');
  const [addNote, setAddNote] = useState('');
  const [incomeText, setIncomeText] = useState(period ? String(period.income_cents / 100) : '');
  const [split, setSplit] = useState({
    needsPct: period?.needs_pct ?? 50,
    wantsPct: period?.wants_pct ?? 30,
    savingsPct: period?.savings_pct ?? 20,
  });
  const [saving, setSaving] = useState(false);

  if (!period) {
    return (
      <Sheet title="Edit money">
        <Card>
          <Text style={[theme.typography.body, { color: theme.colors.textMuted }]}>
            No account to edit yet.
          </Text>
        </Card>
        <Button title="Close" variant="secondary" onPress={() => router.back()} style={{ marginTop: theme.spacing.md }} />
      </Sheet>
    );
  }

  const addCents = addText.trim() ? toCents(addText) : 0;
  const addValid = addCents != null && addCents >= 0;
  const setCents = toCents(incomeText);
  const incomeCents = mode === 'add' ? (addValid ? period.income_cents + addCents : null) : setCents;
  const incomeValid = mode === 'add' ? addValid : setCents != null && setCents >= 0;
  const splitValid = validateSplit(split.needsPct, split.wantsPct, split.savingsPct) === null;
  const canSave = incomeValid && splitValid && !saving;

  // Preview of what will be logged if the amount changed.
  const delta = incomeValid ? incomeCents - period.income_cents : 0;

  async function save() {
    setSaving(true);
    try {
      // 1) Money change -> log the difference to the income ledger.
      if (delta !== 0) {
        await addIncomeEvent({
          amountCents: delta,
          occurredAt: todayISO(),
          note: mode === 'add' ? addNote.trim() || 'Added money' : delta > 0 ? 'Added money' : 'Balance adjustment',
        });
      }

      // 2) Split change -> save the percentages directly (only if changed).
      const splitChanged =
        split.needsPct !== period.needs_pct ||
        split.wantsPct !== period.wants_pct ||
        split.savingsPct !== period.savings_pct;
      if (splitChanged) {
        await updatePeriod(period.id, {
          needsPct: split.needsPct,
          wantsPct: split.wantsPct,
          savingsPct: split.savingsPct,
        });
      }

      haptics.success();
      await refresh();
      router.back();
    } catch (err) {
      console.error('[budget-edit] save failed:', err);
      Alert.alert('Could not save', 'Please try again.');
      setSaving(false);
    }
  }

  return (
    <Sheet title="Money">
      <Card style={{ gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
        <Segmented
          options={[
            { key: 'add', label: 'Add money' },
            { key: 'set', label: 'Set total' },
          ]}
          value={mode}
          onChange={setMode}
        />

        {mode === 'add' ? (
          <>
            <Text style={[theme.typography.label, { color: theme.colors.textMuted }]}>HOW MUCH TO ADD</Text>
            <AmountInput value={addText} onChangeText={setAddText} />
            <TextField label="NOTE (OPTIONAL)" value={addNote} onChangeText={setAddNote} placeholder="e.g. Allowance, Extra from work" maxLength={40} />
            <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
              Current total {formatCents(period.income_cents)}
              {addCents > 0 ? `  →  new total ${formatCents(period.income_cents + addCents)}` : ''}
            </Text>
          </>
        ) : (
          <>
            <Text style={[theme.typography.label, { color: theme.colors.textMuted }]}>TOTAL MONEY</Text>
            <AmountInput value={incomeText} onChangeText={setIncomeText} />
            <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
              Type your new running total. The difference is saved to your income history.
            </Text>
            {delta !== 0 ? (
              <Text style={[theme.typography.caption, { color: theme.colors.accent }]}>
                {delta > 0 ? 'Adds' : 'Removes'} {formatCents(Math.abs(delta))} {delta > 0 ? 'to' : 'from'} your running total.
              </Text>
            ) : null}
          </>
        )}
      </Card>

      <Card style={{ marginBottom: theme.spacing.md }}>
        <Text style={[theme.typography.label, { color: theme.colors.textMuted, marginBottom: theme.spacing.sm }]}>
          SPLIT
        </Text>
        <SplitEditor incomeCents={incomeValid ? incomeCents : period.income_cents} value={split} onChange={setSplit} />
      </Card>

      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        <Button title="Cancel" variant="secondary" onPress={() => router.back()} style={{ flex: 1 }} disabled={saving} />
        <Button title={saving ? 'Saving…' : 'Save'} onPress={save} disabled={!canSave} style={{ flex: 2 }} />
      </View>
    </Sheet>
  );
}
