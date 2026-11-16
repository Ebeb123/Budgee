// ---------------------------------------------------------------------------
// ADD / EDIT BILL  (app/bill-edit.js)  -> "/bill-edit" or "/bill-edit?id=3"
// ---------------------------------------------------------------------------
// Pick the biller (VECO, PLDT, MCWD, or one you added), then the account
// number, the amount (optional, since it changes every month) and the day of
// the month it's due.
//
// When editing, the top card shows the status, lets you copy the account
// number (handy when paying in GCash or a bank app) and has "Mark as paid",
// which moves the due date to next month and can log the amount as an expense
// under Bills. Every change re-schedules the phone reminders.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import AmountInput from '@/components/AmountInput';
import Button from '@/components/Button';
import Card from '@/components/Card';
import Screen from '@/components/Screen';
import Segmented from '@/components/Segmented';
import TextField from '@/components/TextField';
import { useToast } from '@/components/Toast';
import BillerLogo, { billerOf } from '@/features/bills/BillerLogo';
import { DueBadge, toneColor } from '@/features/bills/BillRow';
import { consumeNewBillerId } from '@/features/bills/newBiller';
import { Alert } from '@/lib/alert';
import * as haptics from '@/lib/haptics';
import { billStatus, billTitle, firstBillDue, nextBillDue, REMIND_DAYS } from '@/services/bills';
import { syncBillReminders } from '@/services/billReminders';
import { formatCents, toCents } from '@/services/money';
import { ensurePermission } from '@/services/notifications';
import { addDays, formatDisplayDate, ordinal, todayISO } from '@/utils/date';
import { createBill, deleteBill, getBill, listBillers, updateBill } from '@/repositories/billRepo';
import { listCategories } from '@/repositories/categoryRepo';
import { addExpense, softDeleteExpense } from '@/repositories/expenseRepo';
import { useBudget } from '@/state/BudgetProvider';
import { useTheme } from '@/theme/ThemeProvider';

export default function BillEdit() {
  const { theme } = useTheme();
  const c = theme.colors;
  const router = useRouter();
  const toast = useToast();
  const { period, refresh } = useBudget();
  const { id } = useLocalSearchParams();
  const isEdit = id != null;
  const billId = Number(id);

  const today = todayISO();
  const [billers, setBillers] = useState([]);
  const [billerId, setBillerId] = useState(null);
  const [nickname, setNickname] = useState('');
  const [account, setAccount] = useState('');
  const [amountText, setAmountText] = useState('');
  const [dueDay, setDueDay] = useState(Number(today.slice(8, 10)));
  const [skipMonth, setSkipMonth] = useState('0'); // '1' = first due is the month after
  const [logExpense, setLogExpense] = useState(true);
  const [original, setOriginal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Billers reload every time this screen comes back into focus, so a biller
  // you just added shows up (and gets selected).
  useFocusEffect(
    useCallback(() => {
      listBillers()
        .then((list) => {
          setBillers(list);
          const created = consumeNewBillerId();
          if (created) setBillerId(created);
        })
        .catch((err) => console.error('[bill-edit] billers failed:', err));
    }, []),
  );

  useEffect(() => {
    if (!isEdit) {
      setLoading(false);
      return;
    }
    getBill(billId)
      .then((b) => {
        if (b) {
          setOriginal(b);
          setBillerId(b.biller_id);
          setNickname(b.nickname ?? '');
          setAccount(b.account_number ?? '');
          setAmountText(b.amount_cents ? String(b.amount_cents / 100) : '');
          setDueDay(b.due_day);
        }
      })
      .catch((err) => console.error('[bill-edit] load failed:', err))
      .finally(() => setLoading(false));
  }, [isEdit, billId]);

  const amountCents = amountText.trim() ? toCents(amountText) : null;
  const amountValid = !amountText.trim() || (amountCents != null && amountCents > 0);
  const canSave = billerId != null && amountValid && !saving;

  // Next due date: keep the saved one unless the due day changed.
  const dayChanged = !original || original.due_day !== dueDay;
  const base = firstBillDue(dueDay, today);
  const options = [base, nextBillDue(dueDay, base)];
  const dueDate = dayChanged ? options[Number(skipMonth)] : original.due_date;

  async function save() {
    setSaving(true);
    try {
      const fields = {
        billerId,
        nickname: nickname.trim() || null,
        accountNumber: account.trim() || null,
        amountCents,
        dueDay,
        dueDate,
      };
      if (isEdit) await updateBill(billId, fields);
      else await createBill(fields);
      haptics.success();
      // Ask for notification permission the first time (no-op in the browser).
      await ensurePermission().catch(() => false);
      syncBillReminders();
      router.back();
    } catch (err) {
      console.error('[bill-edit] save failed:', err);
      Alert.alert('Could not save', 'Please try again.');
      setSaving(false);
    }
  }

  async function markPaid() {
    if (!original) return;
    setSaving(true);
    try {
      const prev = { dueDate: original.due_date, lastPaidAt: original.last_paid_at };
      const next = nextBillDue(original.due_day, original.due_date);
      let expenseId = null;

      if (logExpense && amountCents && period) {
        const cats = await listCategories();
        const cat = cats.find((x) => x.name === 'Bills') ?? cats.find((x) => x.bucket === 'need') ?? null;
        expenseId = await addExpense({
          periodId: period.id,
          categoryId: cat?.id ?? null,
          bucket: cat?.bucket ?? 'need',
          amountCents,
          note: billTitle(original),
          spentAt: today,
        });
      }
      await updateBill(billId, { dueDate: next, lastPaidAt: today, amountCents });
      haptics.success();
      await refresh();
      syncBillReminders();
      router.back();

      toast.show({
        message: `${original.biller_name} paid · next due ${formatDisplayDate(next)}`,
        actionLabel: 'Undo',
        duration: 6000,
        onAction: async () => {
          try {
            await updateBill(billId, prev);
            if (expenseId) await softDeleteExpense(expenseId);
            await refresh();
            syncBillReminders();
          } catch (err) {
            console.error('[bill-edit] undo failed:', err);
          }
        },
      });
    } catch (err) {
      console.error('[bill-edit] mark paid failed:', err);
      Alert.alert('Could not update', 'Please try again.');
      setSaving(false);
    }
  }

  async function copyAccount() {
    if (!original?.account_number) return;
    await Clipboard.setStringAsync(original.account_number);
    haptics.tap();
    toast.show({ message: 'Account number copied', duration: 2000 });
  }

  function confirmDelete() {
    Alert.alert('Delete this bill?', 'Its reminders are cancelled too. Expenses you already logged stay.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setSaving(true);
          try {
            await deleteBill(billId);
            haptics.warning();
            syncBillReminders();
            router.back();
          } catch (err) {
            console.error('[bill-edit] delete failed:', err);
            Alert.alert('Could not delete', 'Please try again.');
            setSaving(false);
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <Screen title="Bill">
        <ActivityIndicator color={c.accent} style={{ marginTop: theme.spacing.xl }} />
      </Screen>
    );
  }

  const status = original ? billStatus(original.due_date, today) : null;

  return (
    <Screen title={isEdit ? 'Bill' : 'New bill'}>
      <View style={{ gap: theme.spacing.md }}>
        {/* --- Status + pay (edit only) --- */}
        {original ? (
          <Card tint={status.tone === 'later' ? undefined : toneColor(status.tone, c)} style={{ gap: theme.spacing.md }}>
            <View style={styles.headRow}>
              <BillerLogo biller={billerOf(original)} size={44} />
              <Text style={[theme.typography.h2, { color: c.text, flex: 1 }]} numberOfLines={1}>
                {billTitle(original)}
              </Text>
            </View>

            {/* Due date: calendar badge + full date + how long until it */}
            <View style={styles.headRow}>
              <DueBadge dueISO={original.due_date} tone={status.tone} size="large" />
              <View style={{ flex: 1 }}>
                <Text style={[theme.typography.label, { color: c.textMuted }]}>DUE DATE</Text>
                <Text style={[theme.typography.h2, { color: c.text }]}>{formatDisplayDate(original.due_date)}</Text>
                <Text style={[theme.typography.body, { color: toneColor(status.tone, c), fontWeight: '700' }]}>
                  {status.label}
                </Text>
              </View>
            </View>

            {original.account_number ? (
              <Pressable
                onPress={copyAccount}
                style={({ pressed }) => [
                  styles.copyRow,
                  { backgroundColor: c.surfaceAlt, borderColor: c.border, opacity: pressed ? 0.6 : 1 },
                ]}
                accessibilityLabel="Copy account number"
              >
                <View style={{ flex: 1 }}>
                  <Text style={[theme.typography.label, { color: c.textMuted }]}>ACCOUNT NUMBER · TAP TO COPY</Text>
                  <Text style={[styles.accountBig, { color: c.text }]} selectable adjustsFontSizeToFit numberOfLines={1}>
                    {original.account_number}
                  </Text>
                </View>
                <Ionicons name="copy-outline" size={22} color={c.accent} />
              </Pressable>
            ) : null}

            {amountCents ? (
              <View style={styles.rowBetween}>
                <View style={{ flex: 1, paddingRight: theme.spacing.md }}>
                  <Text style={[theme.typography.body, { color: c.text }]}>Log {formatCents(amountCents)} as an expense</Text>
                  <Text style={[theme.typography.caption, { color: c.textMuted }]}>Under Bills, dated today</Text>
                </View>
                <Switch
                  value={logExpense}
                  onValueChange={setLogExpense}
                  trackColor={{ true: c.accent, false: c.border }}
                  thumbColor={theme.scheme === 'dark' ? '#FFFFFF' : c.surface}
                />
              </View>
            ) : null}

            <Button title="Mark as paid" icon="checkmark-circle-outline" onPress={markPaid} disabled={saving || !amountValid} />
          </Card>
        ) : null}

        {/* --- Biller --- */}
        <Card style={{ gap: theme.spacing.sm }}>
          <Text style={[theme.typography.label, { color: c.textMuted }]}>BILLER</Text>
          <View style={styles.billerGrid}>
            {billers.map((b) => {
              const selected = b.id === billerId;
              return (
                <Pressable
                  key={b.id}
                  onPress={() => {
                    haptics.select();
                    setBillerId(b.id);
                  }}
                  style={[
                    styles.billerTile,
                    {
                      backgroundColor: selected ? c.surfaceAlt : 'transparent',
                      borderColor: selected ? c.accent : c.border,
                    },
                  ]}
                >
                  <BillerLogo biller={b} size={38} />
                  <Text style={[theme.typography.caption, { color: c.text }]} numberOfLines={1}>
                    {b.name}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => router.push('/biller-edit?from=bill')}
              style={[styles.billerTile, { borderColor: c.border, borderStyle: 'dashed' }]}
            >
              <View style={[styles.addTile, { backgroundColor: c.surfaceAlt }]}>
                <Ionicons name="add" size={22} color={c.accent} />
              </View>
              <Text style={[theme.typography.caption, { color: c.textMuted }]}>New biller</Text>
            </Pressable>
          </View>
        </Card>

        {/* --- Account + amount --- */}
        <Card style={{ gap: theme.spacing.md }}>
          <TextField
            label="ACCOUNT NUMBER"
            value={account}
            onChangeText={setAccount}
            placeholder="As printed on your bill"
            maxLength={40}
          />
          <TextField label="NAME (OPTIONAL)" value={nickname} onChangeText={setNickname} placeholder="e.g. Home, Boarding house" maxLength={30} />
          <View>
            <Text style={[theme.typography.label, { color: c.textMuted, marginBottom: 6 }]}>AMOUNT (OPTIONAL)</Text>
            <AmountInput value={amountText} onChangeText={setAmountText} size="normal" />
          </View>
        </Card>

        {/* --- Due date --- */}
        <Card style={{ gap: theme.spacing.md }}>
          <Text style={[theme.typography.label, { color: c.textMuted }]}>DUE EVERY MONTH</Text>
          <View style={[styles.stepper, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
            <Pressable onPress={() => setDueDay((d) => (d <= 1 ? 31 : d - 1))} hitSlop={10} style={{ padding: 8 }} accessibilityLabel="Earlier day">
              <Ionicons name="remove" size={22} color={c.text} />
            </Pressable>
            <Text style={[theme.typography.title, { color: c.text }]}>On the {ordinal(dueDay)}</Text>
            <Pressable onPress={() => setDueDay((d) => (d >= 31 ? 1 : d + 1))} hitSlop={10} style={{ padding: 8 }} accessibilityLabel="Later day">
              <Ionicons name="add" size={22} color={c.text} />
            </Pressable>
          </View>

          {dayChanged ? (
            <>
              <Text style={[theme.typography.caption, { color: c.textMuted }]}>Next one to pay</Text>
              <Segmented
                options={options.map((d, i) => ({ key: String(i), label: formatDisplayDate(d) }))}
                value={skipMonth}
                onChange={setSkipMonth}
              />
            </>
          ) : null}

          <Text style={[theme.typography.caption, { color: c.textMuted }]}>
            Next due {formatDisplayDate(dueDate)}.{' '}
            {addDays(dueDate, -REMIND_DAYS) > today
              ? `1-week reminder on ${formatDisplayDate(addDays(dueDate, -REMIND_DAYS))}.`
              : 'Less than a week away, so you get only the due-day reminder this time.'}
            {dueDay > 28 ? ' Shorter months use their last day.' : ''}
          </Text>
        </Card>

        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <Button title="Cancel" variant="secondary" onPress={() => router.back()} style={{ flex: 1 }} disabled={saving} />
          <Button title={saving ? 'Saving…' : 'Save'} onPress={save} disabled={!canSave} style={{ flex: 2 }} />
        </View>

        {isEdit ? <Button title="Delete bill" icon="trash-outline" variant="danger" onPress={confirmDelete} disabled={saving} /> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  copyRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  accountBig: { fontSize: 24, fontWeight: '800', letterSpacing: 1.2, marginTop: 2 },
  billerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  billerTile: { width: 84, alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 4, borderRadius: 16, borderWidth: 1 },
  addTile: { width: 51, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
