// ---------------------------------------------------------------------------
// BillsDueCard - "Bills due" on the dashboard.
// ---------------------------------------------------------------------------
// Shows only bills that are overdue or due within a week, so it appears
// exactly when there's something to pay and disappears otherwise. Tap a bill
// to open it (copy the account number, mark it paid).
// ---------------------------------------------------------------------------

import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import Card from '@/components/Card';
import BillRow from '@/features/bills/BillRow';
import { billStatus } from '@/services/bills';
import { todayISO } from '@/utils/date';
import { listBills } from '@/repositories/billRepo';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * @param {object} props
 * @param {number} props.version  reloads when the shared budget refreshes
 * @param {object} [props.style]
 */
export default function BillsDueCard({ version, style }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const router = useRouter();
  const [due, setDue] = useState([]);

  useEffect(() => {
    let cancelled = false;
    listBills()
      .then((bills) => {
        if (cancelled) return;
        const today = todayISO();
        setDue(bills.filter((b) => billStatus(b.due_date, today).tone !== 'later'));
      })
      .catch((err) => console.error('[dashboard] bills failed:', err));
    return () => {
      cancelled = true;
    };
  }, [version]);

  if (due.length === 0) return null;
  const urgent = due.some((b) => billStatus(b.due_date, todayISO()).tone !== 'soon');

  return (
    <Card tint={urgent ? c.alert : c.wants} style={[{ paddingVertical: theme.spacing.sm }, style]}>
      <View style={styles.head}>
        <Text style={[theme.typography.label, { color: c.textMuted }]}>BILLS DUE</Text>
        <Pressable onPress={() => router.push('/bills')} hitSlop={10}>
          <Text style={[theme.typography.caption, { color: c.accent, fontWeight: '600' }]}>See all</Text>
        </Pressable>
      </View>
      {due.map((b, i) => (
        <View key={b.id}>
          {i > 0 ? <View style={[styles.divider, { backgroundColor: c.border }]} /> : null}
          <BillRow bill={b} onPress={() => router.push(`/bill-edit?id=${b.id}`)} />
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 66 },
});
