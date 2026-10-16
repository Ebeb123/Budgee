// ---------------------------------------------------------------------------
// SplitEditor - edit the 50/30/20 percentages with a live peso preview.
// ---------------------------------------------------------------------------
// Shared by onboarding (confirm split) and the Edit Budget screen. It shows one
// row per bucket: color dot + label + a percent input + the peso amount that
// percentage works out to for the given income. It also surfaces the validation
// message from budget.js (percentages must be whole numbers summing to 100).
// ---------------------------------------------------------------------------

import { StyleSheet, Text, TextInput, View } from 'react-native';

import { computeSplit, validateSplit } from '@/services/budget';
import { formatCents } from '@/services/money';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * @param {object} props
 * @param {number} props.incomeCents
 * @param {{ needsPct: number, wantsPct: number, savingsPct: number }} props.value
 * @param {(next: { needsPct: number, wantsPct: number, savingsPct: number }) => void} props.onChange
 */
export default function SplitEditor({ incomeCents, value, onChange }) {
  const { theme } = useTheme();
  const { needsPct, wantsPct, savingsPct } = value;

  const error = validateSplit(needsPct, wantsPct, savingsPct);
  // Only compute peso amounts when the split is valid (otherwise it's meaningless).
  const split = error ? null : computeSplit(incomeCents, needsPct, wantsPct, savingsPct);
  const total = needsPct + wantsPct + savingsPct;

  // Update one bucket's percentage, clamped to 0-100.
  const setPct = (key, text) => {
    const n = text === '' ? 0 : parseInt(text, 10);
    if (Number.isNaN(n)) return;
    onChange({ ...value, [key]: Math.max(0, Math.min(100, n)) });
  };

  const rows = [
    { key: 'needsPct', label: 'Needs', color: theme.colors.needs, pct: needsPct, cents: split?.needsCents },
    { key: 'wantsPct', label: 'Wants', color: theme.colors.wants, pct: wantsPct, cents: split?.wantsCents },
    { key: 'savingsPct', label: 'Savings', color: theme.colors.savings, pct: savingsPct, cents: split?.savingsCents },
  ];

  return (
    <View>
      {rows.map((r) => (
        <View key={r.key} style={styles.row}>
          <View style={[styles.dot, { backgroundColor: r.color }]} />
          <Text style={[theme.typography.title, { color: theme.colors.text, flex: 1 }]}>{r.label}</Text>

          {/* peso amount for this bucket (only when the split is valid) */}
          <Text style={[theme.typography.body, { color: theme.colors.textMuted, marginRight: theme.spacing.md }]}>
            {r.cents != null ? formatCents(r.cents) : '—'}
          </Text>

          {/* the editable percentage */}
          <View style={[styles.pctBox, { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.sm }]}>
            <TextInput
              value={String(r.pct)}
              onChangeText={(t) => setPct(r.key, t)}
              keyboardType="number-pad"
              maxLength={3}
              selectTextOnFocus
              style={[theme.typography.title, { color: theme.colors.text, textAlign: 'right', minWidth: 34, padding: 0 }]}
            />
            <Text style={[theme.typography.title, { color: theme.colors.textMuted }]}>%</Text>
          </View>
        </View>
      ))}

      {/* Live total + validation feedback */}
      <Text
        style={[
          theme.typography.label,
          { marginTop: theme.spacing.sm, color: error ? theme.colors.alert : theme.colors.textMuted },
        ]}
      >
        {error ? error : `Total: ${total}% ✓`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  pctBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6 },
});