// ---------------------------------------------------------------------------
// BILLERS  (app/billers.js)  -> route "/billers"
// ---------------------------------------------------------------------------
// Who you pay. VECO, PLDT and MCWD come built in with their logos; add any
// other biller (internet, school, rent, insurance…) with its own name, colour
// and, if you like, a logo picture from your phone.
// ---------------------------------------------------------------------------

import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import Button from '@/components/Button';
import Card from '@/components/Card';
import Screen from '@/components/Screen';
import BillerLogo from '@/features/bills/BillerLogo';
import { listBillers } from '@/repositories/billRepo';
import { useTheme } from '@/theme/ThemeProvider';

export default function BillersScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const router = useRouter();
  const [billers, setBillers] = useState([]);

  useFocusEffect(
    useCallback(() => {
      listBillers()
        .then(setBillers)
        .catch((err) => console.error('[billers] load failed:', err));
    }, []),
  );

  return (
    <Screen title="Billers">
      <Button title="New biller" icon="add" onPress={() => router.push('/biller-edit')} style={{ marginBottom: theme.spacing.md }} />
      <Card style={{ paddingVertical: theme.spacing.xs }}>
        {billers.map((b, i) => (
          <View key={b.id}>
            {i > 0 ? <View style={[styles.divider, { backgroundColor: c.border }]} /> : null}
            <Pressable
              onPress={() => router.push(`/biller-edit?id=${b.id}`)}
              style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
            >
              <BillerLogo biller={b} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={[theme.typography.title, { color: c.text }]} numberOfLines={1}>
                  {b.name}
                </Text>
                <Text style={[theme.typography.caption, { color: c.textMuted }]}>
                  {b.bill_count ? `${b.bill_count} bill${b.bill_count === 1 ? '' : 's'}` : 'No bills yet'}
                  {b.is_default ? ' · built in' : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
            </Pressable>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 66 },
});
