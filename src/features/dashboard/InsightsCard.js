// ---------------------------------------------------------------------------
// InsightsCard - up to three plain-language lines about this month.
// ---------------------------------------------------------------------------
// Pure presentation: the dashboard builds the lines with buildInsights() and
// passes them in. Each line gets an icon tinted by tone (good = lime,
// bad = coral, neutral = muted).
// ---------------------------------------------------------------------------

import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Card from '@/components/Card';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * @param {object} props
 * @param {import('@/services/insights').Insight[]} props.insights
 * @param {object} [props.style]
 */
export default function InsightsCard({ insights, style }) {
  const { theme } = useTheme();
  const c = theme.colors;
  if (!insights || insights.length === 0) return null;

  const toneColor = { good: c.savings, bad: c.wants, neutral: c.needs };

  return (
    <Card style={[{ gap: theme.spacing.sm + 4 }, style]}>
      <Text style={[theme.typography.label, { color: c.textMuted }]}>THIS MONTH</Text>
      {insights.map((i) => (
        <View key={i.text} style={styles.row}>
          <View style={[styles.icon, { backgroundColor: toneColor[i.tone] + '22' }]}>
            <Ionicons name={i.icon} size={16} color={toneColor[i.tone]} />
          </View>
          <Text style={[theme.typography.body, { color: c.text, flex: 1 }]}>{i.text}</Text>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
