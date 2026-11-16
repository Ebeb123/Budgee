// ---------------------------------------------------------------------------
// ADD / EDIT GOAL  (app/goal-edit.js)  -> "/goal-edit" (create) or "?id=5" (edit)
// ---------------------------------------------------------------------------
// One screen handles both cases. With no id it creates a goal; with ?id=5 it
// loads that goal and edits it. Creating your FIRST goal makes it the priority
// automatically. Savings is moved into goals manually from the Savings/Goals
// screen (Step 2) - creating a goal never auto-pulls money into it.
// Delete archives the goal (kept in the database, hidden from the list).
// ---------------------------------------------------------------------------

import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Alert } from '@/lib/alert';
import { useLocalSearchParams, useRouter } from 'expo-router';

import AmountInput from '@/components/AmountInput';
import Button from '@/components/Button';
import Card from '@/components/Card';
import Screen from '@/components/Screen';
import TextField from '@/components/TextField';
import * as haptics from '@/lib/haptics';
import DeadlinePicker from '@/features/goals/DeadlinePicker';
import { toCents } from '@/services/money';
import {
  createGoal,
  updateGoal,
  getGoalById,
  archiveGoal,
} from '@/repositories/goalRepo';
import { useBudget } from '@/state/BudgetProvider';
import { useTheme } from '@/theme/ThemeProvider';

export default function GoalEdit() {
  const { theme } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const isEdit = id != null;
  const goalId = Number(id);

  const { activeGoal, refresh } = useBudget();

  const [name, setName] = useState('');
  const [targetText, setTargetText] = useState('');
  const [targetDate, setTargetDate] = useState(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  // In edit mode, load the existing goal to prefill the form.
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const g = await getGoalById(goalId);
        if (g) {
          setName(g.name);
          setTargetText(String(g.target_cents / 100));
          setTargetDate(g.target_date);
        }
      } catch (err) {
        console.error('[goal-edit] load failed:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [goalId, isEdit]);

  const targetCents = toCents(targetText);
  const canSave = name.trim().length > 0 && targetCents != null && targetCents > 0 && !saving;

  async function save() {
    setSaving(true);
    try {
      if (isEdit) {
        await updateGoal(goalId, { name: name.trim(), targetCents, targetDate });
      } else {
        // First goal becomes the priority automatically. No money is moved
        // into it here - you do that from the Savings/Goals screen.
        const makeActive = !activeGoal;
        await createGoal({
          name: name.trim(),
          targetCents,
          targetDate,
          isActive: makeActive,
        });
      }
      haptics.success();
      await refresh();
      router.back();
    } catch (err) {
      console.error('[goal-edit] save failed:', err);
      Alert.alert('Could not save', 'Please try again.');
      setSaving(false);
    }
  }

  function confirmDelete() {
    Alert.alert('Delete goal?', 'It will be removed from your list.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setSaving(true);
          try {
            await archiveGoal(goalId);
            await refresh();
            router.back();
          } catch (err) {
            console.error('[goal-edit] delete failed:', err);
            Alert.alert('Could not delete', 'Please try again.');
            setSaving(false);
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <Screen title="Goal">
        <ActivityIndicator color={theme.colors.accent} style={{ marginTop: theme.spacing.xl }} />
      </Screen>
    );
  }

  return (
    <Screen title={isEdit ? 'Edit goal' : 'New goal'}>
      <Card style={{ gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
        <TextField
          label="WHAT ARE YOU SAVING FOR?"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Wireless Earbuds"
          maxLength={40}
          autoFocus={!isEdit}
        />
        <View>
          <Text style={[theme.typography.label, { color: theme.colors.textMuted, marginBottom: 6 }]}>
            TARGET PRICE
          </Text>
          <AmountInput value={targetText} onChangeText={setTargetText} size="normal" />
        </View>
        <View>
          <Text style={[theme.typography.label, { color: theme.colors.textMuted, marginBottom: 6 }]}>
            TARGET DATE (OPTIONAL)
          </Text>
          <DeadlinePicker value={targetDate} onChange={setTargetDate} />
        </View>
      </Card>

      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        <Button title="Cancel" variant="secondary" onPress={() => router.back()} style={{ flex: 1 }} disabled={saving} />
        <Button title={saving ? 'Saving…' : 'Save'} onPress={save} disabled={!canSave} style={{ flex: 2 }} />
      </View>

      {isEdit ? (
        <Button
          title="Delete goal"
          icon="trash-outline"
          variant="danger"
          onPress={confirmDelete}
          disabled={saving}
          style={{ marginTop: theme.spacing.md }}
        />
      ) : null}
    </Screen>
  );
}
