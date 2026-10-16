// ---------------------------------------------------------------------------
// AllocationPie - a clean, filled "exploded" pie + a legend.
// ---------------------------------------------------------------------------
// The right-hand chart on the dashboard hero. It shows your 50/30/20 split
// (Needs / Wants / Savings) as solid wedges, each nudged out from the center a
// touch and separated by a thin gap stroked in the card color, with softly
// rounded corners - the tidy look you picked earlier. Pairs with the dropdown
// breakdown ring on the left.
// ---------------------------------------------------------------------------

import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';

function polar(cx, cy, r, a) {
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

/** The filled, slightly-exploded pie itself. */
function Pie({ segments, size, gapColor, gapWidth = 4, explode = 3 }) {
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - gapWidth / 2 - explode - 1;

  if (total <= 0) return <View style={{ width: size, height: size }} />;

  const nonZero = segments.filter((s) => s.value > 0);
  if (nonZero.length === 1) {
    return (
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} fill={nonZero[0].color} />
      </Svg>
    );
  }

  let start = -Math.PI / 2; // top
  const slices = segments
    .map((seg, i) => {
      const value = Math.max(0, seg.value);
      if (value <= 0) return null;
      const angle = (value / total) * 2 * Math.PI;
      const a0 = start;
      const a1 = start + angle;
      start = a1;
      const large = a1 - a0 > Math.PI ? 1 : 0;

      // Nudge each wedge outward along its middle angle -> the "exploded" look.
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
  );
}

/**
 * @param {object} props
 * @param {{ label:string, color:string, value:number }[]} props.segments
 * @param {string} [props.title]
 * @param {number} [props.size=116]
 */
export default function AllocationPie({ segments, title, size = 116 }) {
  const { theme } = useTheme();
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0);

  return (
    <View style={{ alignItems: 'center', gap: theme.spacing.md, alignSelf: 'stretch' }}>
      {title ? (
        <Text style={[theme.typography.title, { color: theme.colors.text }]}>{title}</Text>
      ) : null}

      <View style={{ width: size, height: size }}>
        <Pie segments={segments} size={size} gapColor={theme.colors.surface} gapWidth={4} explode={3} />
      </View>

      <View style={{ gap: 8, alignSelf: 'stretch' }}>
        {segments.map((s) => {
          const share = total > 0 ? Math.round((s.value / total) * 100) : 0;
          return (
            <View key={s.label} style={styles.legendRow}>
              <View style={[styles.dot, { backgroundColor: s.color }]} />
              <Text style={[theme.typography.caption, { color: theme.colors.textMuted, flex: 1 }]} numberOfLines={1}>
                {s.label}
              </Text>
              <Text style={[theme.typography.caption, { color: theme.colors.text }]}>{share}%</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legendRow: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
});
