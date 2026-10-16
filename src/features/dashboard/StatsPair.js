// ---------------------------------------------------------------------------
// StatsPair - a usage RING (left) + a filled exploded PIE (right), each + legend.
// ---------------------------------------------------------------------------

import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';

function polar(cx, cy, r, a) {
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

function Ring({ segments, size, strokeWidth, trackColor, centerValue, centerLabel, textColor, mutedColor }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0);
  const visible = segments.filter((s) => s.value > 0).length;
  const gap = visible > 1 ? circumference * 0.045 : 0;

  let running = 0;
  const arcs = segments.map((seg, i) => {
    const value = Math.max(0, seg.value);
    const len = (total > 0 ? value / total : 0) * circumference;
    const dash = Math.max(0, len - gap);
    const arc = { key: i, color: seg.color, dash, rest: circumference - dash, offset: running };
    running += len;
    return arc;
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <G rotation="-90" origin={`${center}, ${center}`}>
          <Circle cx={center} cy={center} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
          {total > 0 &&
            arcs.map((a) =>
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
      {centerValue ? (
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: textColor, fontSize: 24, fontWeight: '700' }}>{centerValue}</Text>
          {centerLabel ? <Text style={{ color: mutedColor, fontSize: 11 }}>{centerLabel}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

function Pie({ segments, size, gapColor, gapWidth = 4, explode = 3 }) {
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - gapWidth / 2 - explode - 1;

  if (total <= 0) return <View style={{ width: size, height: size }} />;

  const nonZero = segments.filter((s) => s.value > 0);

  if (nonZero.length === 1) {
    return (
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle cx={cx} cy={cy} r={r} fill={nonZero[0].color} />
        </Svg>
      </View>
    );
  }

  let start = -Math.PI / 2;
  const slices = segments
    .map((seg, i) => {
      const value = Math.max(0, seg.value);
      if (value <= 0) return null;
      const angle = (value / total) * 2 * Math.PI;
      const a0 = start;
      const a1 = start + angle;
      start = a1;
      const large = a1 - a0 > Math.PI ? 1 : 0;

      const mid = (a0 + a1) / 2;
      const ccx = cx + Math.cos(mid) * explode;
      const ccy = cy + Math.sin(mid) * explode;

      const [x0, y0] = polar(ccx, ccy, r, a0);
      const [x1, y1] = polar(ccx, ccy, r, a1);
      const d = `M${ccx} ${ccy} L${x0} ${y0} A${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
      return { key: i, d, color: seg.color };
    })
    .filter(Boolean);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {slices.map((s) => (
          <Path
            key={s.key}
            d={s.d}
            fill={s.color}
            stroke={gapColor}
            strokeWidth={gapWidth}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
      </Svg>
    </View>
  );
}

function Legend({ segments, theme }) {
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0);
  return (
    <View style={{ marginTop: theme.spacing.sm, gap: 6, alignSelf: 'stretch' }}>
      {segments.map((s) => {
        const share = total > 0 ? Math.round((s.value / total) * 100) : 0;
        return (
          <View key={s.label} style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: s.color }]} />
            <Text style={[theme.typography.caption, { color: theme.colors.textMuted, flex: 1 }]}>{s.label}</Text>
            <Text style={[theme.typography.caption, { color: theme.colors.text }]}>{share}%</Text>
          </View>
        );
      })}
    </View>
  );
}

export default function StatsPair({ leftCenter, leftLabel, leftSegments, rightTitle, rightSegments }) {
  const { theme } = useTheme();
  const size = 128;

  return (
    <View style={styles.row}>
      <View style={styles.col}>
        <Ring
          segments={leftSegments}
          size={size}
          strokeWidth={13}
          trackColor={theme.colors.surfaceAlt}
          centerValue={leftCenter}
          centerLabel={leftLabel}
          textColor={theme.colors.text}
          mutedColor={theme.colors.textMuted}
        />
        <Legend segments={leftSegments} theme={theme} />
      </View>

      <View style={styles.col}>
        {rightTitle ? (
          <Text style={[theme.typography.title, { color: theme.colors.text, marginBottom: theme.spacing.sm }]}>
            {rightTitle}
          </Text>
        ) : null}
        <Pie segments={rightSegments} size={size} gapColor={theme.colors.surface} gapWidth={4} explode={3} />
        <Legend segments={rightSegments} theme={theme} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1, alignItems: 'center' },
  legendRow: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
});
