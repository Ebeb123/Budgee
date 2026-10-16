// ---------------------------------------------------------------------------
// BucketCard - one spending bucket (Needs or Wants) on the dashboard.
// ---------------------------------------------------------------------------
// Shows remaining money, a progress bar, and the spent/budget line. When the
// bucket is overspent it turns the bar red and shows an "Over by ₱x" warning,
// satisfying the "warn me if I overspend a category" requirement.
// ---------------------------------------------------------------------------

import { StyleSheet, Text, View } from 'react-native';

import Card from '@/components/Card';
import ProgressBar from '@/components/ProgressBar';
import { formatCents } from '@/services/money';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * @param {object} props
 * @param {string} props.label
 * @param {string} props.color
 * @param {ReturnType<import('@/services/budget').bucketSummary>} props.summary
 */
export default function BucketCard({ label, color, summary }) {
  const { theme } = useTheme();
  const { budgetCents, spentCents, remainingCents, pctUsed, overspent } = summary;
  const pctLabel = Math.round(pctUsed * 100);

  return (
    <Card style={{ gap: 10 }}>
      <View style={styles.rowBetween}>
        <View style={styles.rowCenter}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text style={[theme.typography.title, { color: theme.colors.text }]}>{label}</Text>
        </View>
        {overspent ? (
          <Text style={[theme.typography.label, { color: theme.colors.alert }]}>
            Over by {formatCents(-remainingCents)}
          </Text>
        ) : (
          <Text style={[theme.typography.label, { color: theme.colors.textMuted }]}>
            {formatCents(remainingCents)} left
          </Text>
        )}
      </View>

      <ProgressBar value={pctUsed} color={color} overspent={overspent} />

      <View style={styles.rowBetween}>
        <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
          {formatCents(spentCents)} of {formatCents(budgetCents)}
        </Text>
        <Text style={[theme.typography.caption, { color: overspent ? theme.colors.alert : theme.colors.textMuted }]}>
          {pctLabel}%
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
});