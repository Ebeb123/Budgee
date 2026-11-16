// ---------------------------------------------------------------------------
// TopCategories - top spending categories for a given month, with ‹ › nav.
// ---------------------------------------------------------------------------
// Right-hand panel of the dashboard hero. Shows up to 5 categories as
// horizontal fill bars so you can see WHERE your money actually went.
// ---------------------------------------------------------------------------

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { formatCents } from '@/services/money';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * @param {object} props
 * @param {string} props.label                       e.g. "November 2026"
 * @param {{ name:string, color:string, total:number }[]} props.rows  sorted desc
 * @param {boolean} props.canPrev
 * @param {boolean} props.canNext
 * @param {() => void} props.onPrev
 * @param {() => void} props.onNext
 */
export default function TopCategories({ label, rows, canPrev, canNext, onPrev, onNext }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const top5 = rows.slice(0, 5);
  const max = top5[0]?.total ?? 1;

  return (
    <View style={{ gap: theme.spacing.md, alignSelf: 'stretch' }}>
      {/* Month header */}
      <View style={styles.header}>
        <Pressable onPress={onPrev} disabled={!canPrev} hitSlop={8} style={{ opacity: canPrev ? 1 : 0.25 }}>
          <Ionicons name="chevron-back" size={18} color={c.text} />
        </Pressable>
        <Text style={[theme.typography.title, { color: c.text, flex: 1, textAlign: 'center' }]} numberOfLines={1}>
          {label}
        </Text>
        <Pressable onPress={onNext} disabled={!canNext} hitSlop={8} style={{ opacity: canNext ? 1 : 0.25 }}>
          <Ionicons name="chevron-forward" size={18} color={c.text} />
        </Pressable>
      </View>

      {top5.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 24 }}>
          <Text style={[theme.typography.caption, { color: c.textMuted, textAlign: 'center' }]}>
            No spending this month
          </Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {top5.map((row) => (
            <View key={row.name} style={{ gap: 3 }}>
              <View style={styles.rowBetween}>
                <View style={styles.nameRow}>
                  <View style={[styles.dot, { backgroundColor: row.color }]} />
                  <Text style={[theme.typography.caption, { color: c.text }]} numberOfLines={1}>
                    {row.name}
                  </Text>
                </View>
                <Text style={[theme.typography.caption, { color: c.textMuted }]}>
                  {formatCents(row.total)}
                </Text>
              </View>
              <View style={[styles.track, { backgroundColor: c.surfaceAlt }]}>
                <View
                  style={[
                    styles.fill,
                    { backgroundColor: row.color, width: `${Math.round((row.total / max) * 100)}%` },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
});
