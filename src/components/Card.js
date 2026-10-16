// ---------------------------------------------------------------------------
// Card - a soft, rounded surface for grouping content.
// ---------------------------------------------------------------------------
// This is the building block of the card-based dashboard look. Every grouped
// block (balance, budget breakdown, a goal, ...) sits in a Card, so padding and
// corner radius stay identical everywhere.
// ---------------------------------------------------------------------------

import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

/**
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {object} [props.style]  Extra style overrides (e.g. marginBottom)
 */
export default function Card({ children, style }) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.md,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}