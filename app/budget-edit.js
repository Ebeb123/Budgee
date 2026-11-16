// ---------------------------------------------------------------------------
// EDIT MONEY  (app/budget-edit.js)  -> route "/budget-edit" (modal)
// ---------------------------------------------------------------------------
// Adjust your running total and/or your 50/30/20 split. This is the "change my
// money" screen for the ongoing account.
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
import Sheet from '@/components/Sheet';
import * as haptics from '@/lib/haptics';
import SplitEditor from '@/features/budget/SplitEditor';
import { validateSplit } from '@/services/budget';
import { toCents } from '@/services/money';
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

  const incomeCents = toCents(incomeText);
  const incomeValid = incomeCents != null && incomeCents >= 0;
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
          note: delta > 0 ? 'Added money' : 'Balance adjustment',
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
    <Sheet title="Edit money">
      <Card style={{ gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
        <Text style={[theme.typography.label, { color: theme.colors.textMuted }]}>TOTAL MONEY</Text>
        <AmountInput value={incomeText} onChangeText={setIncomeText} />
        <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
          This is your running total. Raise it whenever new money comes in — the change is added to
          your income history.
        </Text>
        {delta !== 0 ? (
          <Text style={[theme.typography.caption, { color: theme.colors.accent }]}>
            {delta > 0 ? 'Adds' : 'Removes'} {String(Math.abs(delta) / 100)} to your running total.
          </Text>
        ) : null}
      </Card>

      <Card style={{ marginBottom: theme.spacing.md }}>
        <Text style={[theme.typography.label, { color: theme.colors.textMuted, marginBottom: theme.spacing.sm }]}>
          SPLIT
        </Text>
        <SplitEditor incomeCents={incomeValid ? incomeCents : 0} value={split} onChange={setSplit} />
      </Card>

      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        <Button title="Cancel" variant="secondary" onPress={() => router.back()} style={{ flex: 1 }} disabled={saving} />
        <Button title={saving ? 'Saving…' : 'Save'} onPress={save} disabled={!canSave} style={{ flex: 2 }} />
      </View>
    </Sheet>
  );
}
