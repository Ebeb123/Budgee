// ---------------------------------------------------------------------------
// ADD / EDIT RECURRING EXPENSE  (app/recurring-edit.js)  -> "/recurring-edit" or "?id=5"
// ---------------------------------------------------------------------------
// Amount, category, an optional name ("Rent"), and a schedule: weekly on a
// weekday, or monthly on a day of the month. The first one is due on the next
// matching day (today counts). Months shorter than the chosen day use their
// last day (the 31st becomes Apr 30).
// ---------------------------------------------------------------------------

import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import AmountInput from '@/components/AmountInput';
import Button from '@/components/Button';
import Card from '@/components/Card';
import Screen from '@/components/Screen';
import Segmented from '@/components/Segmented';
import TextField from '@/components/TextField';
import CategoryPicker from '@/features/expenses/CategoryPicker';
import { Alert } from '@/lib/alert';
import * as haptics from '@/lib/haptics';
import { toCents } from '@/services/money';
import { describeSchedule, firstDueDate } from '@/services/recurring';
import { dayOfWeek, formatDayHeading, ordinal, todayISO, WEEKDAYS_SHORT } from '@/utils/date';
import { listCategories } from '@/repositories/categoryRepo';
import { createRecurring, deleteRecurring, getRecurring, updateRecurring } from '@/repositories/recurringRepo';
import { useBudget } from '@/state/BudgetProvider';
import { useTheme } from '@/theme/ThemeProvider';

export default function RecurringEdit() {
  const { theme } = useTheme();
  const c = theme.colors;
  const router = useRouter();
  const { refresh } = useBudget();
  const { id } = useLocalSearchParams();
  const isEdit = id != null;
  const recurringId = Number(id);

  const today = todayISO();
  const [categories, setCategories] = useState([]);
  const [amountText, setAmountText] = useState('');
  const [category, setCategory] = useState(null); // { id, bucket }
  const [note, setNote] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [weekday, setWeekday] = useState(dayOfWeek(today));
  const [monthDay, setMonthDay] = useState(Number(today.slice(8, 10)));
  const [active, setActive] = useState(true);
  const [original, setOriginal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [cats, r] = await Promise.all([listCategories(), isEdit ? getRecurring(recurringId) : null]);
        setCategories(cats);
        if (r) {
          setOriginal(r);
          setAmountText(String(r.amount_cents / 100));
          if (r.category_id != null) setCategory({ id: r.category_id, bucket: r.bucket });
          setNote(r.note ?? '');
          setFrequency(r.frequency);
          if (r.frequency === 'weekly') setWeekday(r.day);
          else setMonthDay(r.day);
          setActive(r.is_active === 1);
        }
      } catch (err) {
        console.error('[recurring-edit] load failed:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [isEdit, recurringId]);

  const day = frequency === 'weekly' ? weekday : monthDay;
  const amountCents = toCents(amountText);
  const canSave = amountCents != null && amountCents > 0 && category != null && !saving;

  // Keep the existing next date if the schedule didn't change; otherwise start
  // again from the next matching day.
  const scheduleChanged = !original || original.frequency !== frequency || original.day !== day;
  const nextDue = scheduleChanged || !original ? firstDueDate(frequency, day, today) : original.next_due;

  async function save() {
    setSaving(true);
    try {
      const fields = {
        categoryId: category.id,
        bucket: category.bucket,
        amountCents,
        note: note.trim() || null,
        frequency,
        day,
        nextDue: nextDue < today && active ? firstDueDate(frequency, day, today) : nextDue,
      };
      if (isEdit) await updateRecurring(recurringId, { ...fields, isActive: active });
      else await createRecurring(fields);
      haptics.success();
      await refresh(); // logs it right away if it's due today
      router.back();
    } catch (err) {
      console.error('[recurring-edit] save failed:', err);
      Alert.alert('Could not save', 'Please try again.');
      setSaving(false);
    }
  }

  // Pause / resume takes effect immediately. Resuming restarts from the next
  // matching day, so the weeks it was paused are NOT logged after the fact.
  async function togglePaused() {
    const next = !active;
    try {
      const fields = { isActive: next };
      if (next && original && original.next_due < today) {
        fields.nextDue = firstDueDate(original.frequency, original.day, today);
      }
      await updateRecurring(recurringId, fields);
      setActive(next);
      setOriginal((o) => (o ? { ...o, is_active: next ? 1 : 0, next_due: fields.nextDue ?? o.next_due } : o));
      haptics.select();
      if (next) await refresh();
    } catch (err) {
      console.error('[recurring-edit] pause failed:', err);
      Alert.alert('Could not update', 'Please try again.');
    }
  }

  function confirmDelete() {
    Alert.alert('Delete recurring expense?', 'Expenses it already logged stay in your history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setSaving(true);
          try {
            await deleteRecurring(recurringId);
            haptics.warning();
            router.back();
          } catch (err) {
            console.error('[recurring-edit] delete failed:', err);
            Alert.alert('Could not delete', 'Please try again.');
            setSaving(false);
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <Screen title="Recurring">
        <ActivityIndicator color={c.accent} style={{ marginTop: theme.spacing.xl }} />
      </Screen>
    );
  }

  return (
    <Screen title={isEdit ? 'Edit recurring' : 'New recurring'}>
      <View style={{ gap: theme.spacing.md }}>
        <Card style={{ gap: theme.spacing.md }}>
          <Text style={[theme.typography.label, { color: c.textMuted }]}>AMOUNT</Text>
          <AmountInput value={amountText} onChangeText={setAmountText} autoFocus={!isEdit} />
          <TextField label="NAME (OPTIONAL)" value={note} onChangeText={setNote} placeholder="e.g. Rent, Netflix" maxLength={40} />
        </Card>

        <Card>
          <CategoryPicker
            categories={categories}
            selectedId={category?.id ?? null}
            onSelect={(cat) => setCategory({ id: cat.id, bucket: cat.bucket })}
          />
        </Card>

        <Card style={{ gap: theme.spacing.md }}>
          <Text style={[theme.typography.label, { color: c.textMuted }]}>REPEATS</Text>
          <Segmented
            options={[
              { key: 'monthly', label: 'Monthly' },
              { key: 'weekly', label: 'Weekly' },
            ]}
            value={frequency}
            onChange={setFrequency}
          />

          {frequency === 'weekly' ? (
            <View style={styles.weekRow}>
              {WEEKDAYS_SHORT.map((w, i) => {
                const selected = i === weekday;
                return (
                  <Pressable
                    key={w}
                    onPress={() => {
                      haptics.select();
                      setWeekday(i);
                    }}
                    style={[
                      styles.weekDay,
                      {
                        backgroundColor: selected ? c.accent : c.surfaceAlt,
                        borderColor: selected ? c.accent : c.border,
                      },
                    ]}
                  >
                    <Text style={[theme.typography.caption, { color: selected ? c.onAccent : c.text, fontWeight: '600' }]}>
                      {w}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={[styles.stepper, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
              <Pressable onPress={() => setMonthDay((d) => (d <= 1 ? 31 : d - 1))} hitSlop={10} style={{ padding: 8 }}>
                <Ionicons name="remove" size={22} color={c.text} />
              </Pressable>
              <Text style={[theme.typography.title, { color: c.text }]}>On the {ordinal(monthDay)}</Text>
              <Pressable onPress={() => setMonthDay((d) => (d >= 31 ? 1 : d + 1))} hitSlop={10} style={{ padding: 8 }}>
                <Ionicons name="add" size={22} color={c.text} />
              </Pressable>
            </View>
          )}

          <Text style={[theme.typography.caption, { color: c.textMuted }]}>
            {describeSchedule(frequency, day)}
            {active ? ` · next one ${formatDayHeading(nextDue).toLowerCase() === 'today' ? 'today' : `on ${formatDayHeading(nextDue)}`}` : ' · paused'}
            {frequency === 'monthly' && monthDay > 28 ? '. Shorter months use their last day.' : ''}
          </Text>
        </Card>

        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <Button title="Cancel" variant="secondary" onPress={() => router.back()} style={{ flex: 1 }} disabled={saving} />
          <Button title={saving ? 'Saving…' : 'Save'} onPress={save} disabled={!canSave} style={{ flex: 2 }} />
        </View>

        {isEdit ? (
          <>
            <Button
              title={active ? 'Pause' : 'Resume'}
              icon={active ? 'pause' : 'play'}
              variant="secondary"
              onPress={togglePaused}
              disabled={saving}
            />
            <Button title="Delete" icon="trash-outline" variant="danger" onPress={confirmDelete} disabled={saving} />
          </>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  weekDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
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
