// ---------------------------------------------------------------------------
// Card - a frosted-glass surface for grouping content.
// ---------------------------------------------------------------------------
// This is the building block of the dashboard look. Every grouped block
// (balance, budget breakdown, a goal, ...) sits in a Card, so padding, corner
// radius and the glass treatment stay identical everywhere.
//
// The glass is "fake" on purpose: a see-through fill, a thin bright edge and a
// brighter top edge over the coloured background glows. Real blur on every card
// inside a scrolling list makes Android stutter, and since the background
// behind cards doesn't move, a real blur would look almost the same anyway.
//
// `tint` washes the card with a colour from the top-left corner (used by the
// hero balance card so it stays the focus of the dashboard).
// ---------------------------------------------------------------------------

import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';

/**
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {object} [props.style]  Extra style overrides (e.g. marginBottom)
 * @param {string} [props.tint]   Optional colour wash (e.g. theme.colors.accent)
 */
export default function Card({ children, style, tint }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');

  return (
    <View
      style={[
        {
          backgroundColor: c.glass,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.md,
          borderWidth: 1,
          borderColor: c.glassBorder,
          borderTopColor: c.glassHighlight,
        },
        theme.scheme === 'light' && styles.lightShadow,
        tint && styles.clip,
        style,
      ]}
    >
      {tint ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id={`${uid}tint`} x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={tint} stopOpacity={theme.scheme === 'dark' ? 0.2 : 0.16} />
                <Stop offset="0.7" stopColor={tint} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${uid}tint)`} />
          </Svg>
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  // Soft lift so white glass doesn't melt into the pale background.
  lightShadow: { boxShadow: '0 8px 24px rgba(15, 23, 42, 0.07)' },
  clip: { overflow: 'hidden' },
});
