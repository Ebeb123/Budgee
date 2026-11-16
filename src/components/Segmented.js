// ---------------------------------------------------------------------------
// Segmented - a pill-style multiple-choice toggle (like Month/Year, Weekly/Monthly).
// ---------------------------------------------------------------------------
// Generic: pass options [{ key, label }], the current value, and onChange.
// Glass track with a solid lime "thumb" on the selected option.
// ---------------------------------------------------------------------------

import { Pressable, Text, View } from 'react-native';

import * as haptics from '@/lib/haptics';
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
  const c = theme.colors;
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          backgroundColor: c.surfaceAlt,
          borderRadius: theme.radius.pill,
          borderWidth: 1,
          borderColor: c.border,
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
            onPress={() => {
              if (!selected) haptics.select();
              onChange(o.key);
            }}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: 10,
              borderRadius: theme.radius.pill,
              backgroundColor: selected ? c.accent : 'transparent',
            }}
          >
            <Text style={[theme.typography.label, { color: selected ? c.onAccent : c.textMuted }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
