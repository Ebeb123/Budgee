// ---------------------------------------------------------------------------
// SavingsCard - savings summary on the dashboard.
// ---------------------------------------------------------------------------
// If there's an active goal, shows progress toward it (bar + saved/target),
// how much is still available to move into it, and an "Add to goal" button that
// opens the allocate screen (the manual 30/60/100 flow). If there's no goal, it
// nudges you to create one.
// ---------------------------------------------------------------------------

import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import Button from '@/components/Button';
import Card from '@/components/Card';
import ProgressBar from '@/components/ProgressBar';
import { goalProgress } from '@/services/savings';
import { formatCents } from '@/services/money';
import { formatDisplayDate } from '@/utils/date';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * @param {object} props
 * @param {number} props.savingsBudgetCents     the 20% set aside from your total
 * @param {number} props.availableSavingsCents   still free to move into goals
 * @param {import('@/types').Goal | null} props.activeGoal
 * @param {number} props.savedCents             total saved toward the active goal
 * @param {object} [props.forecast]             estimate from estimateTimeToGoal
 */
export default function SavingsCard({
  savingsBudgetCents,
  availableSavingsCents = 0,
  activeGoal,
  savedCents,
  forecast,
}) {
  const { theme } = useTheme();
  const router = useRouter();

  if (!activeGoal) {
    return (
      <Card style={{ gap: theme.spacing.md }}>
        <View style={styles.rowCenter}>
          <View style={[styles.dot, { backgroundColor: theme.colors.savings }]} />
          <Text style={[theme.typography.title, { color: theme.colors.text }]}>Savings</Text>
        </View>
        <Text style={[theme.typography.body, { color: theme.colors.textMuted }]}>
          {formatCents(savingsBudgetCents)} set aside from your total. Add a goal to start moving it
          somewhere.
        </Text>
        <Button title="Create a goal" onPress={() => router.push('/goal-edit')} />
      </Card>
    );
  }

  const p = goalProgress(activeGoal.target_cents, savedCents);

  return (
    <Card style={{ gap: 10 }}>
      <View style={styles.rowBetween}>
        <View style={styles.rowCenter}>
          <View style={[styles.dot, { backgroundColor: theme.colors.savings }]} />
          <Text style={[theme.typography.title, { color: theme.colors.text }]}>{activeGoal.name}</Text>
        </View>
        <Text style={[theme.typography.label, { color: theme.colors.textMuted }]}>
          {Math.round(p.pct * 100)}%
        </Text>
      </View>

      <ProgressBar value={p.pct} color={theme.colors.savings} />

      <View style={styles.rowBetween}>
        <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
          {formatCents(p.savedCents)} of {formatCents(p.targetCents)}
        </Text>
        <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
          {p.reached ? 'Reached! 🎉' : `${formatCents(p.remainingCents)} to go`}
        </Text>
      </View>

      {forecast && forecast.status === 'ok' ? (
        <Text style={[theme.typography.caption, { color: theme.colors.savings }]}>
          {forecast.durationLabel} · around {formatDisplayDate(forecast.finishDateISO)}
        </Text>
      ) : null}

      {!p.reached ? (
        <>
          <View style={[styles.rowBetween, { marginTop: 2 }]}>
            <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>Available to save</Text>
            <Text style={[theme.typography.caption, { color: theme.colors.savings }]}>
              {formatCents(availableSavingsCents)}
            </Text>
          </View>
          <Button
            title="Add to goal"
            onPress={() => router.push('/allocate')}
            disabled={availableSavingsCents <= 0}
          />
        </>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
});
