// ---------------------------------------------------------------------------
// Onboarding Step 3 - optional savings goal.
// ---------------------------------------------------------------------------
// Optional: the user can enter a goal and finish, or skip. If they type a name
// OR a target, we require BOTH before finishing (a half-filled goal is a
// mistake); if both are empty, "Finish" just skips the goal.
// ---------------------------------------------------------------------------

import { Text, View } from 'react-native';

import AmountInput from '@/components/AmountInput';
import Button from '@/components/Button';
import Card from '@/components/Card';
import TextField from '@/components/TextField';
import { toCents } from '@/services/money';
import { useTheme } from '@/theme/ThemeProvider';

export default function StepGoal({ data, update, onFinish, onBack, submitting }) {
  const { theme } = useTheme();

  const nameEntered = data.goalName.trim().length > 0;
  const targetCents = toCents(data.goalTargetText);
  const targetEntered = data.goalTargetText.trim().length > 0;

  // A goal is "started" if either field has content.
  const started = nameEntered || targetEntered;
  // If started, both must be valid before we can finish.
  const goalComplete = nameEntered && targetCents != null && targetCents > 0;
  const canFinish = !started || goalComplete;

  return (
    <View style={{ gap: theme.spacing.lg }}>
      <View>
        <Text style={[theme.typography.h1, { color: theme.colors.text }]}>Savings goal</Text>
        <Text style={[theme.typography.body, { color: theme.colors.textMuted, marginTop: 6 }]}>
          Optional. Set something you're saving toward — your 20% savings will go here
          automatically. You can add or change this later.
        </Text>
      </View>

      <Card style={{ gap: theme.spacing.md }}>
        <TextField
          label="WHAT ARE YOU SAVING FOR?"
          value={data.goalName}
          onChangeText={(t) => update({ goalName: t })}
          placeholder="e.g. Wireless Earbuds"
          maxLength={40}
        />
        <View>
          <Text style={[theme.typography.label, { color: theme.colors.textMuted, marginBottom: 6 }]}>
            TARGET PRICE
          </Text>
          <AmountInput
            value={data.goalTargetText}
            onChangeText={(t) => update({ goalTargetText: t })}
            size="normal"
          />
        </View>
        {started && !goalComplete ? (
          <Text style={[theme.typography.label, { color: theme.colors.alert }]}>
            Enter both a name and a target price, or clear both to skip.
          </Text>
        ) : null}
      </Card>

      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        <Button title="Back" variant="secondary" onPress={onBack} style={{ flex: 1 }} disabled={submitting} />
        <Button
          title={submitting ? 'Setting up…' : started ? 'Finish' : 'Skip & finish'}
          onPress={onFinish}
          disabled={!canFinish || submitting}
          style={{ flex: 2 }}
        />
      </View>
    </View>
  );
}