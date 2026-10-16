// ---------------------------------------------------------------------------
// BreakdownRing - one segmented ring + a legend underneath.
// ---------------------------------------------------------------------------
// A single reusable ring the dashboard feeds different data into depending on
// the dropdown: the Needs/Wants/Savings overview ("All"), or the per-category
// breakdown for Needs or Wants. Each segment is an arc in its own color, with a
// small gap between segments and a number in the middle. If there's nothing to
// show (e.g. no Wants spending yet), it renders a friendly empty state instead.
// ---------------------------------------------------------------------------

import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';

/**
 * @param {object} props
 * @param {{ label:string, color:string, value:number }[]} props.segments
 * @param {string} props.centerValue          big number in the middle (e.g. "42%")
 * @param {string} [props.centerLabel]        small caption under it
 * @param {string} [props.emptyText]          shown when every segment is 0
 * @param {number} [props.size=140]
 * @param {number} [props.strokeWidth=14]
 */
export default function BreakdownRing({
  segments,
  centerValue,
  centerLabel,
  emptyText = 'Nothing to show yet',
  size = 140,
  strokeWidth = 14,
}) {
  const { theme } = useTheme();

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0);

  if (total <= 0) {
    return (
      <View style={{ alignItems: 'center', gap: theme.spacing.sm }}>
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: theme.colors.surfaceAlt,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: theme.colors.textMuted, fontSize: 12, paddingHorizontal: 16, textAlign: 'center' }}>
            {emptyText}
          </Text>
        </View>
      </View>
    );
  }

  const visible = segments.filter((s) => s.value > 0).length;
  // Bigger gap = the clearly-spaced segments from the design you liked (photo 2),
  // rather than segments that almost touch.
  const gap = visible > 1 ? circumference * 0.06 : 0;

  let running = 0;
  const arcs = segments.map((seg, i) => {
    const value = Math.max(0, seg.value);
    const len = (value / total) * circumference;
    const dash = Math.max(0, len - gap);
    const arc = { key: i, color: seg.color, dash, rest: circumference - dash, offset: running };
    running += len;
    return arc;
  });

  return (
    <View style={{ alignItems: 'center', gap: theme.spacing.md, alignSelf: 'stretch' }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <G rotation="-90" origin={`${center}, ${center}`}>
            <Circle cx={center} cy={center} r={radius} stroke={theme.colors.surfaceAlt} strokeWidth={strokeWidth} fill="none" />
            {arcs.map((a) =>
              a.dash > 0 ? (
                <Circle
                  key={a.key}
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={a.color}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${a.dash} ${a.rest}`}
                  strokeDashoffset={-a.offset}
                />
              ) : null,
            )}
          </G>
        </Svg>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: theme.colors.text, fontSize: 26, fontWeight: '700' }}>{centerValue}</Text>
          {centerLabel ? <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>{centerLabel}</Text> : null}
        </View>
      </View>

      {/* Legend: dot + label + share % */}
      <View style={{ gap: 8, alignSelf: 'stretch' }}>
        {segments
          .filter((s) => s.value > 0)
          .map((s) => {
            const share = Math.round((s.value / total) * 100);
            return (
              <View key={s.label} style={styles.legendRow}>
                <View style={[styles.dot, { backgroundColor: s.color }]} />
                <Text style={[theme.typography.body, { color: theme.colors.text, flex: 1 }]} numberOfLines={1}>
                  {s.label}
                </Text>
                <Text style={[theme.typography.body, { color: theme.colors.textMuted }]}>{share}%</Text>
              </View>
            );
          })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legendRow: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
});
