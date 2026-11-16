// ---------------------------------------------------------------------------
// BILLS  (app/bills.js)  -> route "/bills"
// ---------------------------------------------------------------------------
// Every bill, soonest first, split into "Due soon" (overdue or within a week)
// and "Later". Tap a bill to see its account number, mark it paid or edit it.
// Your phone reminds you a week before each due date and on the day itself.
// ---------------------------------------------------------------------------

import { useCallback, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import Button from '@/components/Button';
import Card from '@/components/Card';
import Screen from '@/components/Screen';
import BillRow from '@/features/bills/BillRow';
import { billStatus } from '@/services/bills';
import { formatCents } from '@/services/money';
import { todayISO } from '@/utils/date';
import { listBills } from '@/repositories/billRepo';
import { useTheme } from '@/theme/ThemeProvider';

export default function BillsScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const router = useRouter();
  const [bills, setBills] = useState(null);

  useFocusEffect(
    useCallback(() => {
      listBills()
        .then(setBills)
        .catch((err) => console.error('[bills] load failed:', err));
    }, []),
  );

  const today = todayISO();
  const soon = (bills ?? []).filter((b) => billStatus(b.due_date, today).tone !== 'later');
  const later = (bills ?? []).filter((b) => billStatus(b.due_date, today).tone === 'later');
  const soonTotal = soon.reduce((s, b) => s + (b.amount_cents ?? 0), 0);

  const group = (label, list) =>
    list.length ? (
      <>
        <Text style={[theme.typography.label, styles.groupLabel, { color: c.textMuted }]}>{label}</Text>
        <Card style={{ paddingVertical: theme.spacing.xs, marginBottom: theme.spacing.md }}>
          {list.map((b, i) => (
            <View key={b.id}>
              {i > 0 ? <View style={[styles.divider, { backgroundColor: c.border }]} /> : null}
              <BillRow bill={b} onPress={() => router.push(`/bill-edit?id=${b.id}`)} />
            </View>
          ))}
        </Card>
      </>
    ) : null;

  return (
    <Screen title="Bills">
      <Text style={[theme.typography.body, { color: c.textMuted, marginBottom: theme.spacing.md }]}>
        {Platform.OS === 'web'
          ? 'Bills due within a week show up here and on your dashboard.'
          : 'Your phone reminds you 1 week before each due date, and again on the day.'}
      </Text>

      <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.md }}>
        <Button title="Add bill" icon="add" onPress={() => router.push('/bill-edit')} style={{ flex: 2 }} />
        <Button title="Billers" icon="business-outline" variant="secondary" onPress={() => router.push('/billers')} style={{ flex: 1 }} />
      </View>

      {bills && bills.length === 0 ? (
        <Card>
          <Text style={[theme.typography.body, { color: c.textMuted }]}>
            No bills yet. Add your electricity, water or internet bill with its account number and due date.
          </Text>
        </Card>
      ) : null}

      {soon.length && soonTotal > 0 ? (
        <Text style={[theme.typography.caption, { color: c.textMuted, marginBottom: theme.spacing.sm, paddingHorizontal: 4 }]}>
          {formatCents(soonTotal)} due within the week (bills with an amount)
        </Text>
      ) : null}

      {group('DUE SOON', soon)}
      {group('LATER', later)}
    </Screen>
  );
}

const styles = StyleSheet.create({
  groupLabel: { marginBottom: 6, paddingHorizontal: 4 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 66 },
});
