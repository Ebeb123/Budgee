// ---------------------------------------------------------------------------
// Segmented - a pill-style multiple-choice toggle (like Month/Year, Weekly/Monthly).
// ---------------------------------------------------------------------------
// Generic: pass options [{ key, label }], the current value, and onChange.
// This is the same control the Settings appearance toggle uses, now reusable.
// ---------------------------------------------------------------------------

import { Pressable, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

/**
 * @param {object} props
 * @param {{ key: string, label: string }[]} props.options
 * @param {string} props.value
 * @param {(key: string) => void} props.onChange
 * @param {object} [props.style]
 */
export default function Segmented({ options, value, onChange, style }) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          backgroundColor: theme.colors.surfaceAlt,
          borderRadius: theme.radius.pill,
          padding: 4,
        },
        style,
      ]}
    >
      {options.map((o) => {
        const selected = value === o.key;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: 10,
              borderRadius: theme.radius.pill,
              backgroundColor: selected ? theme.colors.accent : 'transparent',
            }}
          >
            <Text
              style={[
                theme.typography.label,
                { color: selected ? theme.colors.onAccent : theme.colors.textMuted },
              ]}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}