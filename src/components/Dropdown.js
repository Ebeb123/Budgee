// ---------------------------------------------------------------------------
// Dropdown - a small pill that opens a menu of options.
// ---------------------------------------------------------------------------
// React Native has no built-in dropdown, so this is a tiny reusable one: a
// pressable pill (current label + chevron) that opens a Modal with the options.
// Using a Modal (instead of an absolutely-positioned View) means the menu always
// floats above everything and closes cleanly when you tap outside it.
//
// It's "controlled": the parent owns the selected `value` and updates it in
// `onChange`. That keeps this component dumb and reusable.
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/theme/ThemeProvider';

/**
 * @param {object} props
 * @param {string} props.value                         currently selected value
 * @param {{ label: string, value: string }[]} props.options
 * @param {(value: string) => void} props.onChange
 */
export default function Dropdown({ value, options, onChange }) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);

  const current = options.find((o) => o.value === value) ?? options[0];

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[
          styles.pill,
          { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border },
        ]}
      >
        <Text style={[theme.typography.label, { color: theme.colors.text }]}>{current?.label}</Text>
        <Ionicons name="chevron-down" size={14} color={theme.colors.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        {/* Tapping the dimmed backdrop closes the menu. */}
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={[styles.menu, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            {options.map((o) => {
              const active = o.value === value;
              return (
                <Pressable
                  key={o.value}
                  onPress={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.item,
                    { backgroundColor: active ? theme.colors.surfaceAlt : 'transparent', opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Text style={[theme.typography.body, { color: active ? theme.colors.accent : theme.colors.text }]}>
                    {o.label}
                  </Text>
                  {active ? <Ionicons name="checkmark" size={16} color={theme.colors.accent} /> : null}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  menu: {
    minWidth: 200,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 6,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
});
