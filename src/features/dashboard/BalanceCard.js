// ---------------------------------------------------------------------------
// BalanceCard - the hero "remaining balance" card at the top of the dashboard.
// ---------------------------------------------------------------------------
// Same top-of-screen format as the reference (a big headline number in a soft
// rounded card), but built from YOUR real budget: the money left this period,
// with the allowance and amount spent underneath. Pure presentation.
// ---------------------------------------------------------------------------

import { StyleSheet, Text, View } from 'react-native';

import Card from '@/components/Card';
import { formatCents } from '@/services/money';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * @param {object} props
 * @param {number} props.incomeCents
 * @param {number} props.spentCents   spent so far this period (needs + wants)
 * @param {'weekly'|'monthly'} props.periodType
 */
export default function BalanceCard({ incomeCents, spentCents, periodType }) {
  const { theme } = useTheme();
  const remaining = incomeCents - spentCents;
  const negative = remaining < 0;

  return (
    <Card style={{ gap: 6 }}>
      <View style={styles.rowBetween}>
        <Text style={[theme.typography.label, { color: theme.colors.textMuted }]}>REMAINING BALANCE</Text>
        <Text style={[theme.typography.label, { color: theme.colors.textMuted }]}>
          {periodType === 'weekly' ? 'This week' : 'This month'}
        </Text>
      </View>

      <Text style={[theme.typography.display, { color: negative ? theme.colors.alert : theme.colors.text }]}>
        {formatCents(remaining)}
      </Text>

      <View style={[styles.rowBetween, { marginTop: 4 }]}>
        <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
          Allowance {formatCents(incomeCents)}
        </Text>
        <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
          Spent {formatCents(spentCents)}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});