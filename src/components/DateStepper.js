// ---------------------------------------------------------------------------
// DateStepper - pick a day with ‹ / › arrows (no native date-picker needed).
// ---------------------------------------------------------------------------
// A lightweight day selector: shows "Today" / "Yesterday" / a date, with arrows
// to step one day at a time. Stepping forward is disabled at today, since you
// can't log a future expense. This avoids pulling in a native date-picker
// dependency for the Core MVP (we can add a full calendar later if you want).
// ---------------------------------------------------------------------------

import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { addDays, formatDayHeading, todayISO } from '@/utils/date';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * @param {object} props
 * @param {string} props.value      selected day 'YYYY-MM-DD'
 * @param {(iso: string) => void} props.onChange
 */
export default function DateStepper({ value, onChange }) {
  const { theme } = useTheme();
  const atToday = value >= todayISO(); // can't go into the future

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: theme.radius.md,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 6,
      }}
    >
      <Pressable onPress={() => onChange(addDays(value, -1))} hitSlop={10} style={{ padding: 8 }}>
        <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
      </Pressable>

      <Text style={[theme.typography.title, { color: theme.colors.text }]}>{formatDayHeading(value)}</Text>

      <Pressable
        onPress={() => !atToday && onChange(addDays(value, 1))}
        disabled={atToday}
        hitSlop={10}
        style={{ padding: 8, opacity: atToday ? 0.3 : 1 }}
      >
        <Ionicons name="chevron-forward" size={22} color={theme.colors.text} />
      </Pressable>
    </View>
  );
}