// ---------------------------------------------------------------------------
// CategoryPicker - choose a sub-category (which also fixes the Need/Want bucket).
// ---------------------------------------------------------------------------
// Categories are shown in two groups, Needs and Wants. Picking one tells the
// parent both the category id AND its bucket (each category knows its bucket),
// so the expense lands in the right 50/30/20 slice automatically.
//
// Every chip carries its OWN fixed color (from the category), so you can see at
// a glance which color maps to which category - the same colors used in the
// dashboard breakdown ring. When a chip is selected it fills with that color;
// otherwise the color shows on its icon and a small dot.
// ---------------------------------------------------------------------------

import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/theme/ThemeProvider';

/**
 * @param {object} props
 * @param {import('@/types').Category[]} props.categories
 * @param {number|null} props.selectedId
 * @param {(category: import('@/types').Category) => void} props.onSelect
 */
export default function CategoryPicker({ categories, selectedId, onSelect }) {
  const { theme } = useTheme();

  const groups = [
    { bucket: 'need', label: 'NEEDS' },
    { bucket: 'want', label: 'WANTS' },
  ];

  return (
    <View style={{ gap: theme.spacing.md }}>
      {groups.map((g) => {
        const items = categories.filter((c) => c.bucket === g.bucket);
        if (items.length === 0) return null;
        return (
          <View key={g.bucket}>
            <Text style={[theme.typography.label, { color: theme.colors.textMuted, marginBottom: theme.spacing.sm }]}>
              {g.label}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
              {items.map((c) => {
                const selected = c.id === selectedId;
                // Fall back to the bucket color if a category somehow has none.
                const color = c.color || (c.bucket === 'need' ? theme.colors.needs : theme.colors.wants);
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => onSelect(c)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: theme.radius.pill,
                      backgroundColor: selected ? color : theme.colors.surfaceAlt,
                      borderWidth: 1,
                      borderColor: selected ? color : theme.colors.border,
                    }}
                  >
                    {c.icon ? (
                      <Ionicons
                        name={c.icon}
                        size={16}
                        color={selected ? '#FFFFFF' : color}
                      />
                    ) : (
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
                    )}
                    <Text
                      style={[
                        theme.typography.label,
                        { color: selected ? '#FFFFFF' : theme.colors.text },
                      ]}
                    >
                      {c.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}
