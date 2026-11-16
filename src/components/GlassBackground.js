// ---------------------------------------------------------------------------
// GlassBackground - the soft colour glows behind every screen.
// ---------------------------------------------------------------------------
// Glass only looks like glass when there is something colourful behind it. This
// draws three large, very soft radial glows in the bucket colours (lime =
// Savings, blue = Needs, coral = Wants) over the navy background. Cards are
// see-through, so the glows tint them as you scroll - which is what sells the
// frosted-glass look without paying for a real blur on every card.
//
// Drawn with react-native-svg (already a dependency). Each instance gets unique
// gradient ids: on web several screens can be mounted at once, and duplicate
// SVG ids would make a hidden screen's gradient win.
// ---------------------------------------------------------------------------

import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';

// Where each glow sits, as a share of the screen (0..1) and how far it spreads.
const GLOWS = [
  { key: 'savings', cx: '8%', cy: '2%', rx: '75%', ry: '38%' },
  { key: 'needs', cx: '100%', cy: '48%', rx: '70%', ry: '34%' },
  { key: 'wants', cx: '5%', cy: '100%', rx: '80%', ry: '36%' },
];

export default function GlassBackground() {
  const { theme } = useTheme();
  const c = theme.colors;
  const opacity = Number(c.glowOpacity);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          {GLOWS.map((g) => (
            <RadialGradient key={g.key} id={`${uid}${g.key}`} cx={g.cx} cy={g.cy} rx={g.rx} ry={g.ry} fx={g.cx} fy={g.cy}>
              <Stop offset="0" stopColor={c[g.key]} stopOpacity={opacity} />
              <Stop offset="0.55" stopColor={c[g.key]} stopOpacity={opacity * 0.35} />
              <Stop offset="1" stopColor={c[g.key]} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        {GLOWS.map((g) => (
          <Rect key={g.key} x="0" y="0" width="100%" height="100%" fill={`url(#${uid}${g.key})`} />
        ))}
      </Svg>
    </View>
  );
}
