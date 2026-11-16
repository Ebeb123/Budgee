// ---------------------------------------------------------------------------
// ADD / EDIT BILLER  (app/biller-edit.js)  -> "/biller-edit" or "?id=4"
// ---------------------------------------------------------------------------
// New biller: search the built-in list of Philippine billers (electricity,
// water, internet, banks, government, insurance…) and tap one: it's added with
// its logo in one step. Not in the list? Type a name, pick a colour and,
// optionally, a logo from your photos. Typing a name that IS in the list (e.g.
// "Meralco" or "Globe at Home") picks up its logo automatically.
//
// Picked pictures are cropped square, shrunk, and saved inside the app's
// database, so they work offline and in the browser.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';

import Button from '@/components/Button';
import Card from '@/components/Card';
import Screen from '@/components/Screen';
import TextField from '@/components/TextField';
import BillerLogo from '@/features/bills/BillerLogo';
import { findCatalogMatch, searchCatalog } from '@/features/bills/catalog';
import { setNewBillerId } from '@/features/bills/newBiller';
import { Alert } from '@/lib/alert';
import * as haptics from '@/lib/haptics';
import { syncBillReminders } from '@/services/billReminders';
import { createBiller, deleteBiller, getBiller, listBillers, listBills, updateBiller } from '@/repositories/billRepo';
import { useTheme } from '@/theme/ThemeProvider';

const COLORS = ['#1E3A8A', '#1D7FD8', '#0E9F8E', '#2E9E4F', '#E0A800', '#E8590C', '#D7182A', '#C2185B', '#7B3FB8', '#455A64'];
const MAX_LOGO_CHARS = 700_000; // ~500 KB picture; keeps the database small

export default function BillerEdit() {
  const { theme } = useTheme();
  const c = theme.colors;
  const router = useRouter();
  const { id, from } = useLocalSearchParams();
  const isEdit = id != null;
  const billerId = Number(id);

  const [query, setQuery] = useState('');
  const [existing, setExisting] = useState([]); // billers you already have
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [logoUri, setLogoUri] = useState(null);
  const [original, setOriginal] = useState(null);
  const [billCount, setBillCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (isEdit) {
          const [b, bills] = await Promise.all([getBiller(billerId), listBills()]);
          if (b) {
            setOriginal(b);
            setName(b.name);
            setColor(b.color);
            setLogoUri(b.logo_uri);
            setBillCount(bills.filter((x) => x.biller_id === b.id).length);
          }
        } else {
          setExisting(await listBillers());
        }
      } catch (err) {
        console.error('[biller-edit] load failed:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [isEdit, billerId]);

  const builtIn = original?.is_default === 1;
  const match = findCatalogMatch(name);
  // A bundled logo wins unless you picked your own picture.
  const logoKey = builtIn ? original.logo_key : logoUri ? null : (match?.key ?? null);
  const canSave = name.trim().length > 0 && !saving;

  // Catalog search results, grouped by type. Billers you already added are marked.
  const groups = useMemo(() => {
    const have = new Set(existing.map((b) => (findCatalogMatch(b.name)?.key ?? b.logo_key) || ''));
    const out = [];
    for (const item of searchCatalog(query)) {
      let g = out.find((x) => x.type === item.type);
      if (!g) out.push((g = { type: item.type, items: [] }));
      g.items.push({ ...item, added: have.has(item.key) });
    }
    return out;
  }, [query, existing]);

  function onChangeName(t) {
    setName(t);
    const m = findCatalogMatch(t);
    if (m) setColor(m.color);
  }

  async function addFromCatalog(item) {
    if (saving) return;
    setSaving(true);
    try {
      const newId = await createBiller({ name: item.name, color: item.color, logoKey: item.key });
      if (from === 'bill') setNewBillerId(newId);
      haptics.success();
      router.back();
    } catch (err) {
      console.error('[biller-edit] add failed:', err);
      Alert.alert('Could not add', 'Please try again.');
      setSaving(false);
    }
  }

  async function pickLogo() {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.4,
        base64: true,
      });
      if (res.canceled || !res.assets?.length) return;
      const a = res.assets[0];
      const uri = a.base64 ? `data:${a.mimeType || 'image/jpeg'};base64,${a.base64}` : a.uri;
      if (!uri.startsWith('data:')) {
        Alert.alert('Could not use that picture', 'Please try a different one.');
        return;
      }
      if (uri.length > MAX_LOGO_CHARS) {
        Alert.alert('Picture too big', 'Crop it smaller or use a screenshot of the logo.');
        return;
      }
      haptics.select();
      setLogoUri(uri);
    } catch (err) {
      console.error('[biller-edit] pick failed:', err);
      Alert.alert('Could not open your photos', 'Please try again.');
    }
  }

  async function save() {
    setSaving(true);
    try {
      const fields = { name: name.trim(), color, logoKey, logoUri: builtIn ? null : logoUri };
      if (isEdit) {
        await updateBiller(billerId, fields);
        syncBillReminders(); // reminder titles use the biller's name
      } else {
        const newId = await createBiller(fields);
        if (from === 'bill') setNewBillerId(newId);
      }
      haptics.success();
      router.back();
    } catch (err) {
      console.error('[biller-edit] save failed:', err);
      Alert.alert('Could not save', 'Please try again.');
      setSaving(false);
    }
  }

  function confirmDelete() {
    const extra = billCount ? ` Its ${billCount} bill${billCount === 1 ? '' : 's'} will be deleted too.` : '';
    Alert.alert(`Delete ${original?.name}?`, `Expenses you already logged stay.${extra}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setSaving(true);
          try {
            await deleteBiller(billerId);
            haptics.warning();
            syncBillReminders();
            router.back();
          } catch (err) {
            console.error('[biller-edit] delete failed:', err);
            Alert.alert('Could not delete', 'Please try again.');
            setSaving(false);
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <Screen title="Biller">
        <ActivityIndicator color={c.accent} style={{ marginTop: theme.spacing.xl }} />
      </Screen>
    );
  }

  const preview = { name: name || '?', color, logo_key: logoKey, logo_uri: builtIn ? null : logoUri };
  const hasBundledLogo = !!logoKey;

  // The "your own biller" form (also the whole screen when editing).
  const form = (
    <>
      <Card style={{ alignItems: 'center', gap: theme.spacing.sm }}>
        <BillerLogo biller={preview} size={72} />
        <Text style={[theme.typography.title, { color: c.text }]}>{name || 'Biller name'}</Text>
        {builtIn ? (
          <Text style={[theme.typography.caption, { color: c.textMuted }]}>Built-in logo</Text>
        ) : hasBundledLogo ? (
          <Text style={[theme.typography.caption, { color: c.textMuted }]}>Logo found automatically</Text>
        ) : (
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <Button title={logoUri ? 'Change logo' : 'Add logo'} icon="image-outline" variant="secondary" onPress={pickLogo} />
            {logoUri ? <Button title="Remove" variant="secondary" onPress={() => setLogoUri(null)} /> : null}
          </View>
        )}
      </Card>

      <Card style={{ gap: theme.spacing.md }}>
        <TextField label="NAME" value={name} onChangeText={onChangeName} placeholder="e.g. Boarding house, School" maxLength={30} />
        {!builtIn ? (
          <>
            <Text style={[theme.typography.label, { color: c.textMuted }]}>
              COLOUR{hasBundledLogo || logoUri ? ' (USED WHEN THERE IS NO LOGO)' : ''}
            </Text>
            <View style={styles.swatches}>
              {COLORS.map((col) => (
                <Pressable
                  key={col}
                  onPress={() => {
                    haptics.select();
                    setColor(col);
                  }}
                  style={[styles.swatch, { backgroundColor: col, borderColor: col === color ? c.text : 'transparent' }]}
                  accessibilityLabel={`Colour ${col}`}
                >
                  {col === color ? <Ionicons name="checkmark" size={18} color="#FFFFFF" /> : null}
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
      </Card>

      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        <Button title="Cancel" variant="secondary" onPress={() => router.back()} style={{ flex: 1 }} disabled={saving} />
        <Button title={saving ? 'Saving…' : 'Save'} onPress={save} disabled={!canSave} style={{ flex: 2 }} />
      </View>
    </>
  );

  if (isEdit) {
    return (
      <Screen title="Edit biller">
        <View style={{ gap: theme.spacing.md }}>
          {form}
          {!builtIn ? <Button title="Delete biller" icon="trash-outline" variant="danger" onPress={confirmDelete} disabled={saving} /> : null}
        </View>
      </Screen>
    );
  }

  return (
    <Screen title="New biller">
      <View style={{ gap: theme.spacing.md }}>
        {/* --- Search the built-in list --- */}
        <View style={[styles.search, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
          <Ionicons name="search" size={18} color={c.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search billers (Meralco, Globe, SSS…)"
            placeholderTextColor={c.textMuted}
            style={[styles.searchInput, { color: c.text }, Platform.OS === 'web' ? { outlineStyle: 'none' } : null]}
            autoCorrect={false}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={18} color={c.textMuted} />
            </Pressable>
          ) : null}
        </View>

        {groups.length === 0 ? (
          <Text style={[theme.typography.body, { color: c.textMuted, paddingHorizontal: 4 }]}>
            Not in the list. Add it as your own biller below.
          </Text>
        ) : (
          groups.map((g) => (
            <View key={g.type}>
              <Text style={[theme.typography.label, { color: c.textMuted, marginBottom: 6, paddingHorizontal: 4 }]}>
                {g.type.toUpperCase()}
              </Text>
              <Card style={{ paddingVertical: theme.spacing.xs }}>
                {g.items.map((item, i) => (
                  <View key={item.key}>
                    {i > 0 ? <View style={[styles.divider, { backgroundColor: c.border }]} /> : null}
                    <Pressable
                      onPress={() => addFromCatalog(item)}
                      disabled={saving}
                      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
                    >
                      <BillerLogo biller={{ name: item.name, color: item.color, logo_key: item.key }} size={36} />
                      <Text style={[theme.typography.title, { color: c.text, flex: 1 }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {item.added ? (
                        <Text style={[theme.typography.caption, { color: c.textMuted }]}>Added</Text>
                      ) : (
                        <Ionicons name="add-circle-outline" size={22} color={c.accent} />
                      )}
                    </Pressable>
                  </View>
                ))}
              </Card>
            </View>
          ))
        )}

        {/* --- Your own biller --- */}
        <Text style={[theme.typography.label, { color: c.textMuted, marginTop: theme.spacing.sm, paddingHorizontal: 4 }]}>
          NOT IN THE LIST? ADD YOUR OWN
        </Text>
        {form}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 16, paddingHorizontal: 14 },
  searchInput: { flex: 1, paddingVertical: 14, fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 61 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
