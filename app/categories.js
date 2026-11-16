// ---------------------------------------------------------------------------
// MANAGE CATEGORIES  (app/categories.js)  -> route "/categories"
// ---------------------------------------------------------------------------
// Every category, grouped into Needs and Wants. Tap one to edit it (name,
// bucket, colour, icon); tap the eye to hide/show it in the Log picker. Hidden
// categories keep all their past expenses - they just stop being offered.
// ---------------------------------------------------------------------------

import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import Button from '@/components/Button';
import Card from '@/components/Card';
import Screen from '@/components/Screen';
import * as haptics from '@/lib/haptics';
import { listAllCategories, setCategoryHidden } from '@/repositories/categoryRepo';
import { useTheme } from '@/theme/ThemeProvider';

const GROUPS = [
  { bucket: 'need', label: 'NEEDS' },
  { bucket: 'want', label: 'WANTS' },
];

export default function CategoriesScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const router = useRouter();
  const [categories, setCategories] = useState([]);

  const load = useCallback(async () => {
    try {
      setCategories(await listAllCategories());
    } catch (err) {
      console.error('[categories] load failed:', err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function toggleHidden(cat) {
    haptics.select();
    // Update on screen right away, then save.
    setCategories((list) => list.map((x) => (x.id === cat.id ? { ...x, is_hidden: cat.is_hidden ? 0 : 1 } : x)));
    try {
      await setCategoryHidden(cat.id, !cat.is_hidden);
    } catch (err) {
      console.error('[categories] hide failed:', err);
      load();
    }
  }

  return (
    <Screen title="Categories">
      <Button
        title="New category"
        icon="add"
        onPress={() => router.push('/category-edit')}
        style={{ marginBottom: theme.spacing.md }}
      />

      {GROUPS.map((g) => {
        const items = categories.filter((x) => x.bucket === g.bucket);
        return (
          <View key={g.bucket} style={{ marginBottom: theme.spacing.lg }}>
            <Text style={[theme.typography.label, styles.groupLabel, { color: c.textMuted }]}>{g.label}</Text>
            <Card style={{ paddingVertical: theme.spacing.xs }}>
              {items.length === 0 ? (
                <Text style={[theme.typography.body, { color: c.textMuted, paddingVertical: 12 }]}>No categories yet.</Text>
              ) : (
                items.map((cat, i) => {
                  const color = cat.color || (cat.bucket === 'need' ? c.needs : c.wants);
                  const hidden = cat.is_hidden === 1;
                  return (
                    <View key={cat.id}>
                      {i > 0 ? <View style={[styles.divider, { backgroundColor: c.border }]} /> : null}
                      <View style={styles.row}>
                        <Pressable
                          onPress={() => router.push(`/category-edit?id=${cat.id}`)}
                          style={({ pressed }) => [styles.main, { opacity: pressed ? 0.6 : hidden ? 0.45 : 1 }]}
                        >
                          <View style={[styles.icon, { backgroundColor: color + '22' }]}>
                            <Ionicons name={cat.icon ?? 'pricetag-outline'} size={18} color={color} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[theme.typography.title, { color: c.text }]} numberOfLines={1}>
                              {cat.name}
                            </Text>
                            {hidden ? (
                              <Text style={[theme.typography.caption, { color: c.textMuted }]}>Hidden from the picker</Text>
                            ) : null}
                          </View>
                        </Pressable>
                        <Pressable
                          onPress={() => toggleHidden(cat)}
                          hitSlop={10}
                          accessibilityLabel={hidden ? `Show ${cat.name}` : `Hide ${cat.name}`}
                          style={({ pressed }) => [styles.eye, { opacity: pressed ? 0.5 : 1 }]}
                        >
                          <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={20} color={c.textMuted} />
                        </Pressable>
                      </View>
                    </View>
                  );
                })
              )}
            </Card>
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  groupLabel: { marginBottom: 8, paddingHorizontal: 4 },
  row: { flexDirection: 'row', alignItems: 'center' },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  icon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  eye: { padding: 8 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 50 },
});
