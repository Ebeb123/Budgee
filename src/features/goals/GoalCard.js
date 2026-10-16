// ---------------------------------------------------------------------------
// GoalCard - one savings goal in the Goals list.
// ---------------------------------------------------------------------------
// Shows the goal name, an "active" (priority) badge, a progress bar, the
// saved/target line, a milestone message, and - when it isn't the active goal -
// a "Set as priority" button. Tapping the card opens it for editing.
// ---------------------------------------------------------------------------

import { Pressable, StyleSheet, Text, View } from 'react-native';

import Button from '@/components/Button';
import Card from '@/components/Card';
import ProgressBar from '@/components/ProgressBar';
import { goalProgress, milestoneMessage } from '@/services/savings';
import { formatCents } from '@/services/money';
import { formatDisplayDate } from '@/utils/date';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Turn a forecast estimate (from estimateTimeToGoal) into a display string,
 * or null if there's nothing useful to show.
 */
function forecastText(forecast) {
  if (!forecast) return null;
  if (forecast.status === 'no_savings') return 'Set a savings % above 0 to project a finish date';
  if (forecast.status === 'ok') return `${forecast.durationLabel} · around ${formatDisplayDate(forecast.finishDateISO)}`;
  return null; // 'reached' - the milestone message already celebrates it
}

/**
 * @param {object} props
 * @param {import('@/types').Goal} props.goal   includes saved_cents
 * @param {() => void} props.onEdit
 * @param {() => void} props.onSetActive
 * @param {object} [props.forecast]  estimate from estimateTimeToGoal (active goal only)
 */
export default function GoalCard({ goal, onEdit, onSetActive, forecast }) {
  const { theme } = useTheme();
  const p = goalProgress(goal.target_cents, goal.saved_cents ?? 0);
  const message = milestoneMessage(p.pct);
  const isActive = goal.is_active === 1;
  const forecastLine = forecastText(forecast);

  return (
    <Card style={{ gap: 10 }}>
      <Pressable onPress={onEdit} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, gap: 10 })}>
        <View style={styles.rowBetween}>
          <Text style={[theme.typography.title, { color: theme.colors.text, flex: 1 }]} numberOfLines={1}>
            {goal.name}
          </Text>
          {isActive ? (
            <View style={[styles.badge, { backgroundColor: theme.colors.accent }]}>
              <Text style={[theme.typography.caption, { color: theme.colors.onAccent }]}>PRIORITY</Text>
            </View>
          ) : null}
        </View>

        <ProgressBar value={p.pct} color={theme.colors.savings} />

        <View style={styles.rowBetween}>
          <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
            {formatCents(p.savedCents)} of {formatCents(p.targetCents)}
          </Text>
          <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
            {Math.round(p.pct * 100)}%
          </Text>
        </View>

        {message ? (
          <Text style={[theme.typography.label, { color: theme.colors.savings }]}>{message}</Text>
        ) : null}

        {forecastLine ? (
          <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>{forecastLine}</Text>
        ) : null}

        {goal.target_date ? (
          <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
            Target: {formatDisplayDate(goal.target_date)}
          </Text>
        ) : null}
      </Pressable>

      {!isActive ? (
        <Button title="Set as priority" variant="secondary" onPress={onSetActive} />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
});