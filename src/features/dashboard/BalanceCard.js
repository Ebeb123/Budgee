// ---------------------------------------------------------------------------
// BalanceCard - the hero "remaining balance" card at the top of the dashboard.
// ---------------------------------------------------------------------------
// Same top-of-screen format as the reference (a big headline number in a soft
// rounded card), but built from YOUR real budget: the money left this period,
// with the allowance and amount spent underneath. Pure presentation.
// ---------------------------------------------------------------------------

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Card from '@/components/Card';
import { formatCents } from '@/services/money';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * @param {object} props
 * @param {number} props.incomeCents
 * @param {number} props.spentCents   spent so far this period (needs + wants)
 * @param {'weekly'|'monthly'} props.periodType
 * @param {boolean} [props.hideAmounts]
 * @param {() => void} [props.onToggleHide]
 */
export default function BalanceCard({ incomeCents, spentCents, periodType, hideAmounts, onToggleHide }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const remaining = incomeCents - spentCents;
  const negative = remaining < 0;

  return (
    <Card style={{ gap: 6 }} tint={negative ? c.alert : c.accent}>
      <View style={styles.rowBetween}>
        <Text style={[theme.typography.label, { color: c.textMuted }]}>REMAINING BALANCE</Text>
        <View style={styles.rightHeader}>
          <Text style={[theme.typography.label, { color: c.textMuted }]}>
            {periodType === 'weekly' ? 'This week' : 'This month'}
          </Text>
          {onToggleHide != null ? (
            <Pressable onPress={onToggleHide} hitSlop={10} accessibilityLabel={hideAmounts ? 'Show amounts' : 'Hide amounts'}>
              <Ionicons name={hideAmounts ? 'eye-off-outline' : 'eye-outline'} size={18} color={c.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <Text style={[theme.typography.display, { color: negative ? c.alert : c.text }]}>
        {formatCents(remaining)}
      </Text>

      <View style={[styles.rowBetween, { marginTop: 4 }]}>
        <Text style={[theme.typography.caption, { color: c.textMuted }]}>
          Allowance {formatCents(incomeCents)}
        </Text>
        <Text style={[theme.typography.caption, { color: c.textMuted }]}>
          Spent {formatCents(spentCents)}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rightHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});