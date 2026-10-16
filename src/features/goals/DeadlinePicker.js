// ---------------------------------------------------------------------------
// DeadlinePicker - optional target date via quick "+N months" buttons.
// ---------------------------------------------------------------------------
// A target date is optional and always in the future, so a day-by-day stepper
// or a full calendar would be awkward. Instead we offer quick presets computed
// from today (No date / +1 / +3 / +6 months / +1 year) and just show the
// resulting date. Dependency-free and fast to tap.
// ---------------------------------------------------------------------------

import { Pressable, ScrollView, Text, View } from 'react-native';

import { addMonths, formatDisplayDate, todayISO } from '@/utils/date';
import { useTheme } from '@/theme/ThemeProvider';

const PRESETS = [
  { label: 'No date', months: null },
  { label: '+1 mo', months: 1 },
  { label: '+3 mo', months: 3 },
  { label: '+6 mo', months: 6 },
  { label: '+1 yr', months: 12 },
];

/**
 * @param {object} props
 * @param {string|null} props.value        current target date ISO, or null
 * @param {(iso: string|null) => void} props.onChange
 */
export default function DeadlinePicker({ value, onChange }) {
  const { theme } = useTheme();

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Text style={[theme.typography.body, { color: theme.colors.text }]}>
        {value ? `Target date: ${formatDisplayDate(value)}` : 'No target date'}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: theme.spacing.sm }}>
        {PRESETS.map((p) => (
          <Pressable
            key={p.label}
            onPress={() => onChange(p.months == null ? null : addMonths(todayISO(), p.months))}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 14,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.surfaceAlt,
            }}
          >
            <Text style={[theme.typography.label, { color: theme.colors.text }]}>{p.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}