// ---------------------------------------------------------------------------
// ADD / EDIT CATEGORY  (app/category-edit.js)  -> "/category-edit" or "?id=5"
// ---------------------------------------------------------------------------
// Name, bucket (Needs / Wants), colour and icon. Changing a category's bucket
// only affects NEW expenses: every past expense keeps the bucket it was logged
// under, so your old totals never shift.
// ---------------------------------------------------------------------------

import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import Button from '@/components/Button';
import Card from '@/components/Card';
import Screen from '@/components/Screen';
import Segmented from '@/components/Segmented';
import TextField from '@/components/TextField';
import { Alert } from '@/lib/alert';
import * as haptics from '@/lib/haptics';
import { createCategory, getCategory, setCategoryHidden, updateCategory } from '@/repositories/categoryRepo';
import { useTheme } from '@/theme/ThemeProvider';

// Mid-tone colours that stay readable on both dark and light glass.
const COLORS = [
  '#D9A05B', '#6E8CA0', '#9B8AC4', '#C58C8C', '#6FA593', '#C08457',
  '#7E9CC0', '#B08AB0', '#8FA06E', '#9AA0A6', '#5AB4C8', '#D07A9B',
];

const ICONS = [
  'fast-food-outline', 'cafe-outline', 'restaurant-outline', 'basket-outline', 'bus-outline', 'car-outline',
  'bicycle-outline', 'airplane-outline', 'school-outline', 'book-outline', 'receipt-outline', 'flash-outline',
  'water-outline', 'wifi-outline', 'phone-portrait-outline', 'home-outline', 'medkit-outline', 'fitness-outline',
  'shirt-outline', 'cart-outline', 'bag-handle-outline', 'gift-outline', 'game-controller-outline', 'film-outline',
  'musical-notes-outline', 'tv-outline', 'paw-outline', 'heart-outline', 'people-outline', 'pricetag-outline',
];

export default function CategoryEdit() {
  const { theme } = useTheme();
  const c = theme.colors;
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const isEdit = id != null;
  const categoryId = Number(id);

  const [name, setName] = useState('');
  const [bucket, setBucket] = useState('need');
  const [color, setColor] = useState(COLORS[0]);
  const [icon, setIcon] = useState(ICONS[0]);
  const [hidden, setHidden] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const cat = await getCategory(categoryId);
        if (cat) {
          setName(cat.name);
          setBucket(cat.bucket);
          if (cat.color) setColor(cat.color);
          if (cat.icon) setIcon(cat.icon);
          setHidden(cat.is_hidden === 1);
        }
      } catch (err) {
        console.error('[category-edit] load failed:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [categoryId, isEdit]);

  const canSave = name.trim().length > 0 && !saving;

  async function save() {
    setSaving(true);
    try {
      const fields = { name: name.trim(), bucket, color, icon };
      if (isEdit) await updateCategory(categoryId, fields);
      else await createCategory(fields);
      haptics.success();
      router.back();
    } catch (err) {
      console.error('[category-edit] save failed:', err);
      Alert.alert('Could not save', 'Please try again.');
      setSaving(false);
    }
  }

  async function toggleHidden() {
    try {
      await setCategoryHidden(categoryId, !hidden);
      setHidden(!hidden);
      haptics.select();
    } catch (err) {
      console.error('[category-edit] hide failed:', err);
    }
  }

  if (loading) {
    return (
      <Screen title="Category">
        <ActivityIndicator color={c.accent} style={{ marginTop: theme.spacing.xl }} />
      </Screen>
    );
  }

  return (
    <Screen title={isEdit ? 'Edit category' : 'New category'}>
      {/* Live preview of the chip */}
      <View style={{ alignItems: 'center', marginBottom: theme.spacing.md }}>
        <View style={[styles.preview, { backgroundColor: color, borderColor: color }]}>
          <Ionicons name={icon} size={18} color="#FFFFFF" />
          <Text style={[theme.typography.title, { color: '#FFFFFF' }]}>{name.trim() || 'Category'}</Text>
        </View>
      </View>

      <Card style={{ gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
        <TextField label="NAME" value={name} onChangeText={setName} placeholder="e.g. Coffee" maxLength={24} autoFocus={!isEdit} />
        <View style={{ gap: 6 }}>
          <Text style={[theme.typography.label, { color: c.textMuted }]}>COUNTS AS</Text>
          <Segmented
            options={[
              { key: 'need', label: 'Needs' },
              { key: 'want', label: 'Wants' },
            ]}
            value={bucket}
            onChange={setBucket}
          />
          {isEdit ? (
            <Text style={[theme.typography.caption, { color: c.textMuted }]}>
              Changing this only affects new expenses. Past ones keep their bucket.
            </Text>
          ) : null}
        </View>
      </Card>

      <Card style={{ gap: theme.spacing.sm, marginBottom: theme.spacing.md }}>
        <Text style={[theme.typography.label, { color: c.textMuted }]}>COLOUR</Text>
        <View style={styles.grid}>
          {COLORS.map((col) => {
            const selected = col.toLowerCase() === color.toLowerCase();
            return (
              <Pressable
                key={col}
                onPress={() => {
                  haptics.select();
                  setColor(col);
                }}
                accessibilityLabel={`Colour ${col}`}
                style={[styles.swatch, { backgroundColor: col, borderColor: selected ? c.text : 'transparent' }]}
              >
                {selected ? <Ionicons name="checkmark" size={18} color="#FFFFFF" /> : null}
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card style={{ gap: theme.spacing.sm, marginBottom: theme.spacing.md }}>
        <Text style={[theme.typography.label, { color: c.textMuted }]}>ICON</Text>
        <View style={styles.grid}>
          {ICONS.map((ic) => {
            const selected = ic === icon;
            return (
              <Pressable
                key={ic}
                onPress={() => {
                  haptics.select();
                  setIcon(ic);
                }}
                accessibilityLabel={ic.replace('-outline', '')}
                style={[
                  styles.iconCell,
                  {
                    backgroundColor: selected ? color + '33' : c.surfaceAlt,
                    borderColor: selected ? color : c.border,
                  },
                ]}
              >
                <Ionicons name={ic} size={20} color={selected ? color : c.textMuted} />
              </Pressable>
            );
          })}
        </View>
      </Card>

      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        <Button title="Cancel" variant="secondary" onPress={() => router.back()} style={{ flex: 1 }} disabled={saving} />
        <Button title={saving ? 'Saving…' : 'Save'} onPress={save} disabled={!canSave} style={{ flex: 2 }} />
      </View>

      {isEdit ? (
        <Button
          title={hidden ? 'Show in picker' : 'Hide from picker'}
          icon={hidden ? 'eye-outline' : 'eye-off-outline'}
          variant="secondary"
          onPress={toggleHidden}
          disabled={saving}
          style={{ marginTop: theme.spacing.md }}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCell: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
