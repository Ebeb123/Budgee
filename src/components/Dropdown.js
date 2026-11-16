// ---------------------------------------------------------------------------
// Dropdown - a small glass pill that opens a menu of options.
// ---------------------------------------------------------------------------
// React Native has no built-in dropdown, so this is a tiny reusable one: a
// pressable pill (current label + chevron) that opens a Modal with the options.
// Using a Modal (instead of an absolutely-positioned View) means the menu always
// floats above everything and closes cleanly when you tap outside it.
//
// The screen behind the menu is blurred (real blur on iOS / web; a tinted
// glass layer on Android, which can't blur across a Modal window).
//
// It's "controlled": the parent owns the selected `value` and updates it in
// `onChange`. That keeps this component dumb and reusable.
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { GlassBlur } from '@/components/GlassProvider';
import * as haptics from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * @param {object} props
 * @param {string} props.value                         currently selected value
 * @param {{ label: string, value: string }[]} props.options
 * @param {(value: string) => void} props.onChange
 */
export default function Dropdown({ value, options, onChange }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [open, setOpen] = useState(false);

  const current = options.find((o) => o.value === value) ?? options[0];

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.pill, { backgroundColor: c.surfaceAlt, borderColor: c.glassBorder }]}
      >
        <Text style={[theme.typography.label, { color: c.text }]}>{current?.label}</Text>
        <Ionicons name="chevron-down" size={14} color={c.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <GlassBlur intensity={25} inModal style={StyleSheet.absoluteFill} />
        {/* Tapping the dimmed backdrop closes the menu. */}
        <Pressable style={[styles.backdrop, { backgroundColor: c.backdrop }]} onPress={() => setOpen(false)}>
          <View
            style={[
              styles.menu,
              { backgroundColor: c.glassStrong, borderColor: c.glassBorder, borderTopColor: c.glassHighlight },
            ]}
          >
            {options.map((o) => {
              const active = o.value === value;
              return (
                <Pressable
                  key={o.value}
                  onPress={() => {
                    if (!active) haptics.select();
                    onChange(o.value);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.item,
                    { backgroundColor: active ? c.surfaceAlt : 'transparent', opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Text style={[theme.typography.body, { color: active ? c.accent : c.text }]}>{o.label}</Text>
                  {active ? <Ionicons name="checkmark" size={16} color={c.accent} /> : null}
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  menu: {
    minWidth: 220,
    borderRadius: 20,
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
    marginHorizontal: 6,
    borderRadius: 12,
  },
});
