// ---------------------------------------------------------------------------
// BudgetRing - the segmented donut centerpiece (SVG).
// ---------------------------------------------------------------------------
// HOW IT WORKS: a donut is just a circle whose stroke we draw only part of the
// way around. react-native-svg lets us do that with two props:
//   - strokeDasharray = "<visible length> <gap length>"  -> draws one arc
//   - strokeDashoffset = where that arc starts around the circle
// We stack one <Circle> per segment, each starting where the previous ended, so
// together they form a multi-color ring. The whole thing is rotated -90° so the
// first segment starts at the top (12 o'clock). A faint full circle sits behind
// them as the "track". The center number is plain text laid over the SVG.
// ---------------------------------------------------------------------------

import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';

/**
 * @param {object} props
 * @param {{ value: number, color: string }[]} props.segments  values in any unit (e.g. centavos)
 * @param {string} props.centerValue   big text in the middle (e.g. "36%")
 * @param {string} props.centerLabel   small text under it (e.g. "budget used")
 * @param {number} [props.size=210]
 * @param {number} [props.strokeWidth=20]
 */
export default function BudgetRing({ segments, centerValue, centerLabel, size = 210, strokeWidth = 20 }) {
  const { theme } = useTheme();

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const total = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0);
  // A small gap between segments, but only when more than one is visible.
  const visibleCount = segments.filter((s) => s.value > 0).length;
  const gap = visibleCount > 1 ? circumference * 0.015 : 0;

  // Turn each segment into an arc: its visible dash length + where it starts.
  let running = 0;
  const arcs = segments.map((seg, i) => {
    const value = Math.max(0, seg.value);
    const frac = total > 0 ? value / total : 0;
    const len = frac * circumference;
    const dash = Math.max(0, len - gap);
    const arc = { key: i, color: seg.color, dash, rest: circumference - dash, offset: running };
    running += len;
    return arc;
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <G rotation="-90" origin={`${center}, ${center}`}>
          {/* Track */}
          <Circle cx={center} cy={center} r={radius} stroke={theme.colors.surfaceAlt} strokeWidth={strokeWidth} fill="none" />
          {/* Segments */}
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

      {/* Center label overlaid on the SVG */}
      <View style={{ alignItems: 'center' }}>
        <Text style={[theme.typography.display, { color: theme.colors.text }]}>{centerValue}</Text>
        <Text style={[theme.typography.label, { color: theme.colors.textMuted }]}>{centerLabel}</Text>
      </View>
    </View>
  );
}