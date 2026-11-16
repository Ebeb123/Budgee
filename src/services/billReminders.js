// ---------------------------------------------------------------------------
// BILL REMINDERS  (phone notifications)
// ---------------------------------------------------------------------------
// For every bill we schedule three local notifications at 9:00 AM:
//   - one week before the due date  ("PLDT is due in 1 week")
//   - the day before                 ("PLDT is due tomorrow")
//   - on the due date itself         ("PLDT is due today")
// syncBillReminders() throws the old ones away and schedules fresh ones from
// the database, so it's safe to call after any change (and on app start).
// In the browser it does nothing; the in-app "due soon" list still works there.
// ---------------------------------------------------------------------------

import { formatCents } from '@/services/money';
import { addDays, formatDisplayDate, fromISO } from '@/utils/date';
import { billTitle, REMIND_DAYS } from '@/services/bills';
import { cancelByPrefix, ensurePermission, hasPermission, notificationsSupported, scheduleAt } from '@/services/notifications';
import { listBills } from '@/repositories/billRepo';

const PREFIX = 'bill-';
const HOUR = 9;

function at9am(iso) {
  const d = fromISO(iso);
  d.setHours(HOUR, 0, 0, 0);
  return d;
}

let running = null; // overlapping calls share one run

export function syncBillReminders() {
  if (!notificationsSupported) return Promise.resolve();
  if (!running) {
    running = run()
      .catch((err) => console.error('[bills] reminder sync failed:', err))
      .finally(() => {
        running = null;
      });
  }
  return running;
}

async function run() {
  await cancelByPrefix(PREFIX);
  const bills = await listBills();
  // Ask once if there are bills but no permission yet (e.g. first launch).
  if (bills.length && !(await hasPermission()) && !(await ensurePermission())) return;
  for (const b of bills) {
    const title = billTitle(b);
    const details = [
      formatDisplayDate(b.due_date),
      b.account_number ? `Acct ${b.account_number}` : null,
      b.amount_cents ? formatCents(b.amount_cents) : null,
    ]
      .filter(Boolean)
      .join(' · ');

    await scheduleAt({
      identifier: `${PREFIX}${b.id}-week`,
      date: at9am(addDays(b.due_date, -REMIND_DAYS)),
      title: `${title} is due in 1 week`,
      body: details,
      channelId: 'bills',
    });
    await scheduleAt({
      identifier: `${PREFIX}${b.id}-day`,
      date: at9am(addDays(b.due_date, -1)),
      title: `${title} is due tomorrow`,
      body: details,
      channelId: 'bills',
    });
    await scheduleAt({
      identifier: `${PREFIX}${b.id}-due`,
      date: at9am(b.due_date),
      title: `${title} is due today`,
      body: details,
      channelId: 'bills',
    });
  }
}
