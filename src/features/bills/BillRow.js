// ---------------------------------------------------------------------------
// BillRow - one bill in a list (Bills screen + the dashboard's "Bills due").
// ---------------------------------------------------------------------------
//   [logo]  PLDT · Home                 ┌─NOV─┐
//           ACCT 0298 765 432           │ 29  │
//           Due in 3 days · ₱1,699.00   └─────┘
// The account number and the due date are the two things you need when
// paying, so they're the largest text in the row. The calendar badge is
// coloured by urgency (red = overdue/today, coral = this week).
// ---------------------------------------------------------------------------

import { Pressable, StyleSheet, Text, View } from 'react-native';

import BillerLogo, { billerOf } from '@/features/bills/BillerLogo';
import { billStatus, billTitle } from '@/services/bills';
import { formatCents } from '@/services/money';
import { fromISO, MONTHS, todayISO } from '@/utils/date';
import { useTheme } from '@/theme/ThemeProvider';

/** Colour for a bill's status. */
export function toneColor(tone, c) {
  if (tone === 'overdue' || tone === 'today') return c.alert;
  if (tone === 'soon') return c.wants;
  return c.textMuted;
}

/** Calendar-style due date badge: month on a coloured band, big day number. */
export function DueBadge({ dueISO, tone, size = 'normal' }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const d = fromISO(dueISO);
  const big = size === 'large';
  const band = tone === 'later' ? c.surfaceAlt : toneColor(tone, c);
  return (
    <View style={[styles.badge, { borderColor: tone === 'later' ? c.border : band, width: big ? 64 : 52 }]}>
      <View style={[styles.band, { backgroundColor: band }]}>
        <Text style={[styles.month, { color: tone === 'later' ? c.textMuted : '#FFFFFF' }]}>{MONTHS[d.getMonth()].toUpperCase()}</Text>
      </View>
      <Text style={[styles.day, { color: c.text, fontSize: big ? 28 : 22 }]}>{d.getDate()}</Text>
    </View>
  );
}

/**
 * @param {object} props
 * @param {import('@/repositories/billRepo').Bill} props.bill
 * @param {() => void} props.onPress
 */
export default function BillRow({ bill, onPress }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const status = billStatus(bill.due_date, todayISO());
  const color = toneColor(status.tone, c);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}>
      <BillerLogo biller={billerOf(bill)} size={40} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[theme.typography.title, { color: c.text }]} numberOfLines={1}>
          {billTitle(bill)}
        </Text>
        {bill.account_number ? (
          <Text style={{ color: c.text }} numberOfLines={1}>
            <Text style={[theme.typography.caption, { color: c.textMuted, fontWeight: '600' }]}>ACCT  </Text>
            <Text style={styles.account}>{bill.account_number}</Text>
          </Text>
        ) : null}
        <Text style={[theme.typography.caption, { color: c.textMuted }]} numberOfLines={1}>
          <Text style={{ color, fontWeight: status.tone === 'later' ? '400' : '700' }}>{status.label}</Text>
          {bill.amount_cents ? ` · ${formatCents(bill.amount_cents)}` : ''}
        </Text>
      </View>
      <DueBadge dueISO={bill.due_date} tone={status.tone} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  account: { fontSize: 16, fontWeight: '700', letterSpacing: 0.6 },
  badge: { borderWidth: 1, borderRadius: 12, overflow: 'hidden', alignItems: 'center' },
  band: { alignSelf: 'stretch', alignItems: 'center', paddingVertical: 2 },
  month: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  day: { fontWeight: '800', paddingVertical: 2 },
});
