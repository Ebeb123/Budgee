// ---------------------------------------------------------------------------
// GOALS  (app/(tabs)/goals.js)
// ---------------------------------------------------------------------------
// Lists all your savings goals with progress, lets you add a new one, and set
// which one is the priority (active) goal. Savings is moved into goals manually
// (Step 2) - setting a goal as priority just marks where the "Add to goal"
// action defaults to. Reloads on focus so it reflects edits from the editor.
// ---------------------------------------------------------------------------

import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { Alert } from '@/lib/alert';
import { useFocusEffect, useRouter } from 'expo-router';

import Button from '@/components/Button';
import Card from '@/components/Card';
import Screen from '@/components/Screen';
import GoalCard from '@/features/goals/GoalCard';
import { estimateTimeToGoal } from '@/services/savings';
import { todayISO } from '@/utils/date';
import { listGoalsWithProgress, setActiveGoal } from '@/repositories/goalRepo';
import { useBudget } from '@/state/BudgetProvider';
import { useTheme } from '@/theme/ThemeProvider';

export default function GoalsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { derived, refresh } = useBudget();

  const [goals, setGoals] = useState([]);

  const load = useCallback(async () => {
    try {
      setGoals(await listGoalsWithProgress());
    } catch (err) {
      console.error('[goals] load failed:', err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function handleSetActive(id) {
    try {
      await setActiveGoal(id);
      await refresh(); // dashboard savings card reflects the new priority goal
      await load();
    } catch (err) {
      console.error('[goals] set active failed:', err);
      Alert.alert('Could not update', 'Please try again.');
    }
  }

  return (
    <Screen title="Savings Goals">
      <Button
        title="+ New goal"
        onPress={() => router.push('/goal-edit')}
        style={{ marginBottom: theme.spacing.md }}
      />

      {goals.length === 0 ? (
        <Card>
          <Text style={[theme.typography.body, { color: theme.colors.textMuted }]}>
            No goals yet. Create one, then move your savings into it whenever you like.
          </Text>
        </Card>
      ) : (
        <View style={{ gap: theme.spacing.md }}>
          {goals.map((g) => {
            // A forecast only makes sense for the priority goal. It's based on
            // your average monthly savings so far (from the dashboard).
            const forecast =
              g.is_active === 1 && derived
                ? estimateTimeToGoal({
                    targetCents: g.target_cents,
                    savedCents: g.saved_cents ?? 0,
                    monthlySavingsCents: derived.monthlySavingsCents,
                    todayISO: todayISO(),
                  })
                : undefined;
            return (
              <GoalCard
                key={g.id}
                goal={g}
                forecast={forecast}
                onEdit={() => router.push(`/goal-edit?id=${g.id}`)}
                onSetActive={() => handleSetActive(g.id)}
              />
            );
          })}
        </View>
      )}
    </Screen>
  );
}
