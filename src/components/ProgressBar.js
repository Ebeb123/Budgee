// ---------------------------------------------------------------------------
// ProgressBar - a simple horizontal fill bar.
// ---------------------------------------------------------------------------
// value is 0..1 (share filled). We clamp the visible width to 100% so an
// overspent bucket doesn't overflow the track, and switch the fill to the alert
// color when `overspent` is true.
// ---------------------------------------------------------------------------

import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

/**
 * @param {object} props
 * @param {number} props.value       0..1 (values above 1 are clamped for width)
 * @param {string} props.color
 * @param {boolean} [props.overspent]
 * @param {number} [props.height=10]
 */
export default function ProgressBar({ value, color, overspent = false, height = 10 }) {
  const { theme } = useTheme();
  const pct = Math.max(0, Math.min(1, value));

  return (
    <View
      style={{
        height,
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: height / 2,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: `${pct * 100}%`,
          height: '100%',
          borderRadius: height / 2,
          backgroundColor: overspent ? theme.colors.alert : color,
        }}
      />
    </View>
  );
}