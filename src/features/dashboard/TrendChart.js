// ---------------------------------------------------------------------------
// TrendChart - a smooth spending line with a soft fill (SVG).
// ---------------------------------------------------------------------------
// Plots one point per day of the current period. SVG needs a real pixel width,
// so we seed the width from the screen size (minus padding) for the very first
// paint, then correct it with onLayout once the card is measured - this way the
// line draws immediately instead of staying blank until layout finishes.
// If nothing has been logged this period, we show a friendly empty message
// instead of an invisible flat line.
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { Dimensions, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { formatCents } from '@/services/money';
import { fromISO } from '@/utils/date';
import { useTheme } from '@/theme/ThemeProvider';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function shortDate(iso) {
  const d = fromISO(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

// A sensible starting width so the chart isn't blank before onLayout runs.
// (screen width minus the screen padding + card padding, roughly.)
const INITIAL_WIDTH = Math.max(200, Dimensions.get('window').width - 64);

/**
 * @param {object} props
 * @param {{ day: string, totalCents: number }[]} props.data
 * @param {number} [props.height=130]
 */
export default function TrendChart({ data, height = 130 }) {
  const { theme } = useTheme();
  const [width, setWidth] = useState(INITIAL_WIDTH);

  const n = data.length;
  const color = theme.colors.accent;
  const total = data.reduce((s, d) => s + d.totalCents, 0);

  const header = (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.sm }}>
      <Text style={[theme.typography.label, { color: theme.colors.textMuted }]}>SPENDING THIS PERIOD</Text>
      <Text style={[theme.typography.label, { color: theme.colors.text }]}>{formatCents(total)}</Text>
    </View>
  );

  // No data at all, or nothing spent yet -> show a message, not a blank box.
  if (n === 0 || total === 0) {
    return (
      <View>
        {header}
        <View style={{ height, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={[theme.typography.body, { color: theme.colors.textMuted }]}>
            No spending logged yet this period.
          </Text>
        </View>
      </View>
    );
  }

  const padY = 12;
  const chartH = height - padY * 2;
  const max = Math.max(1, ...data.map((d) => d.totalCents));

  const points = data.map((d, i) => {
    const x = n === 1 ? width / 2 : (i / (n - 1)) * width;
    const y = padY + (1 - d.totalCents / max) * chartH;
    return { x, y };
  });

  // Catmull-Rom → cubic Bézier (tension 0.4): smooth curve through every point.
  function smoothPath(pts) {
    if (pts.length < 2) return `M${pts[0].x} ${pts[0].y}`;
    let d = `M${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const t = 0.4;
      const cp1x = p1.x + (p2.x - p0.x) * t;
      const cp1y = p1.y + (p2.y - p0.y) * t;
      const cp2x = p2.x - (p3.x - p1.x) * t;
      const cp2y = p2.y - (p3.y - p1.y) * t;
      d += ` C${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`;
    }
    return d;
  }

  const linePath = smoothPath(points);
  const areaPath = `${linePath} L${points[n - 1].x} ${height} L${points[0].x} ${height} Z`;
  const last = points[n - 1];

  return (
    <View>
      {header}
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
        <Svg width={width} height={height}>
          <Path d={areaPath} fill={color} fillOpacity={0.12} />
          <Path d={linePath} stroke={color} strokeWidth={3} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          <Circle cx={last.x} cy={last.y} r={4} fill={color} />
        </Svg>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>{shortDate(data[0].day)}</Text>
        {n > 2 ? (
          <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
            {shortDate(data[Math.floor(n / 2)].day)}
          </Text>
        ) : null}
        <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>{shortDate(data[n - 1].day)}</Text>
      </View>
    </View>
  );
}