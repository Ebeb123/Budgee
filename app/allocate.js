// ---------------------------------------------------------------------------
// ADD TO GOAL  (app/allocate.js)  -> route "/allocate" (modal)
// ---------------------------------------------------------------------------
// Move some of your AVAILABLE savings into your priority goal. Instead of the
// old automatic 20%, you choose how much: quick 30% / 60% / 100% buttons (each
// showing the peso amount), or a custom amount.
//
// Two safety rails:
//   - you can never allocate more than is available (your 20% pool minus what's
//     already committed to goals), and
//   - you can never overshoot the goal - if your pick is more than the goal
//     still needs, it's capped to exactly finish it.
// Each allocation is recorded as a contribution (the append-only ledger), so
// progress is always SUM(contributions) and can't drift.
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Alert } from '@/lib/alert';
import { useRouter } from 'expo-router';

import AmountInput from '@/components/AmountInput';
import Button from '@/components/Button';
import Card from '@/components/Card';
import Screen from '@/components/Screen';
import { formatCents, toCents } from '@/services/money';
import { crossedMilestones, quickAllocations } from '@/services/savings';
import { addContribution } from '@/repositories/goalRepo';
import { useBudget } from '@/state/BudgetProvider';
import { useTheme } from '@/theme/ThemeProvider';

export default function Allocate() {
  const { theme } = useTheme();
  const router = useRouter();
  const { period, derived, activeGoal, activeGoalSavedCents, refresh } = useBudget();

  const [amountText, setAmountText] = useState('');
  const [saving, setSaving] = useState(false);

  // No priority goal yet -> send them to create one instead.
  if (!activeGoal) {
    return (
      <Screen title="Add to goal">
        <Card style={{ gap: theme.spacing.md }}>
          <Text style={[theme.typography.body, { color: theme.colors.textMuted }]}>
            You don't have a priority goal yet. Create one, then come back to move savings into it.
          </Text>
          <Button title="Create a goal" onPress={() => router.replace('/goal-edit')} />
          <Button title="Close" variant="secondary" onPress={() => router.back()} />
        </Card>
      </Screen>
    );
  }

  const available = derived?.availableSavingsCents ?? 0;
  const goalRemaining = Math.max(0, activeGoal.target_cents - activeGoalSavedCents);
  // The most you can move right now: limited by both your pool and the goal.
  const maxAllocatable = Math.min(available, goalRemaining);

  const quick = quickAllocations(available);
  const typed = toCents(amountText); // null until valid

  // The amount we'd actually apply (capped so it never overshoots either limit).
  const requested = typed ?? 0;
  const applyCents = Math.min(requested, maxAllocatable);
  const canApply = applyCents > 0 && !saving;
  const willComplete = applyCents >= goalRemaining && goalRemaining > 0;

  async function apply() {
    if (!canApply) return;
    setSaving(true);
    try {
      const prevSaved = activeGoalSavedCents;
      await addContribution({
        goalId: activeGoal.id,
        periodId: period?.id ?? null,
        amountCents: applyCents,
      });
      await refresh();

      const crossed = crossedMilestones(prevSaved, prevSaved + applyCents, activeGoal.target_cents);
      const reached = prevSaved + applyCents >= activeGoal.target_cents;
      const message = reached
        ? `You reached "${activeGoal.name}"! 🎉`
        : crossed.length
          ? `Nice — you passed ${crossed[crossed.length - 1]}% of "${activeGoal.name}".`
          : `${formatCents(applyCents)} moved into "${activeGoal.name}".`;

      Alert.alert('Savings added', message, [{ text: 'OK', onPress: () => router.back() }]);
    } catch (err) {
      console.error('[allocate] apply failed:', err);
      Alert.alert('Could not save', 'Please try again.');
      setSaving(false);
    }
  }

  return (
    <Screen title="Add to goal">
      {/* Context: what we're funding and how much is free to move */}
      <Card style={{ gap: 6, marginBottom: theme.spacing.md }}>
        <Text style={[theme.typography.label, { color: theme.colors.textMuted }]}>PRIORITY GOAL</Text>
        <Text style={[theme.typography.title, { color: theme.colors.text }]}>{activeGoal.name}</Text>
        <View style={styles.rowBetween}>
          <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>Available to save</Text>
          <Text style={[theme.typography.caption, { color: theme.colors.savings }]}>{formatCents(available)}</Text>
        </View>
        <View style={styles.rowBetween}>
          <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>Goal still needs</Text>
          <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>{formatCents(goalRemaining)}</Text>
        </View>
      </Card>

      {maxAllocatable <= 0 ? (
        <Card style={{ gap: theme.spacing.md }}>
          <Text style={[theme.typography.body, { color: theme.colors.textMuted }]}>
            {goalRemaining <= 0
              ? 'This goal is already fully funded. 🎉'
              : "You've allocated all your available savings for now. Add money or lower what's committed to free some up."}
          </Text>
          <Button title="Close" variant="secondary" onPress={() => router.back()} />
        </Card>
      ) : (
        <>
          {/* Quick picks: % of available, each showing its peso value */}
          <Card style={{ gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
            <Text style={[theme.typography.label, { color: theme.colors.textMuted }]}>QUICK ADD</Text>
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              {quick.map((q) => {
                const selected = typed != null && typed === q.cents;
                return (
                  <Pressable
                    key={q.pct}
                    onPress={() => setAmountText(String(q.cents / 100))}
                    style={[
                      styles.quick,
                      {
                        backgroundColor: selected ? theme.colors.accent : theme.colors.surfaceAlt,
                        borderColor: selected ? theme.colors.accent : theme.colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        theme.typography.title,
                        { color: selected ? theme.colors.onAccent : theme.colors.text },
                      ]}
                    >
                      {q.pct}%
                    </Text>
                    <Text
                      style={[
                        theme.typography.caption,
                        { color: selected ? theme.colors.onAccent : theme.colors.textMuted },
                      ]}
                    >
                      {formatCents(q.cents)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          {/* Or a custom amount */}
          <Card style={{ gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
            <Text style={[theme.typography.label, { color: theme.colors.textMuted }]}>OR ENTER AN AMOUNT</Text>
            <AmountInput value={amountText} onChangeText={setAmountText} />
            {requested > maxAllocatable ? (
              <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
                That's more than you can move now — it'll be capped to {formatCents(maxAllocatable)}.
              </Text>
            ) : null}
            {willComplete ? (
              <Text style={[theme.typography.caption, { color: theme.colors.savings }]}>
                This completes your goal. 🎉
              </Text>
            ) : null}
          </Card>

          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <Button title="Cancel" variant="secondary" onPress={() => router.back()} style={{ flex: 1 }} disabled={saving} />
            <Button
              title={saving ? 'Saving…' : applyCents > 0 ? `Add ${formatCents(applyCents)}` : 'Add to goal'}
              onPress={apply}
              disabled={!canApply}
              style={{ flex: 2 }}
            />
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  quick: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
});
