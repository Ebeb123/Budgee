// ---------------------------------------------------------------------------
// RECURRING SERVICE  (logs due recurring expenses)
// ---------------------------------------------------------------------------
// Called by BudgetProvider.refresh() - so every time the app refreshes its
// numbers, any recurring expense that has come due is logged as a normal
// expense dated on its due day, and its next_due moves forward. If the app
// wasn't opened for a while, every missed occurrence is caught up (capped, so
// a bad date can never loop forever).
// ---------------------------------------------------------------------------

import { getDb } from '@/db/database';
import { nextDueAfter } from '@/services/recurring';
import { todayISO } from '@/utils/date';
import { addExpense } from '@/repositories/expenseRepo';
import { advanceRecurring, listDueRecurring } from '@/repositories/recurringRepo';

const MAX_CATCH_UP = 60; // per item, per run

let running = null; // one run at a time: overlapping refreshes share it

/**
 * Log every due recurring expense into the given account.
 * @param {number} periodId
 * @returns {Promise<number>} how many expenses were logged
 */
export function postDueRecurring(periodId) {
  if (!running) {
    running = run(periodId).finally(() => {
      running = null;
    });
  }
  return running;
}

async function run(periodId) {
  const today = todayISO();
  const due = await listDueRecurring(today);
  let logged = 0;

  for (const r of due) {
    let dueDate = r.next_due;
    for (let i = 0; i < MAX_CATCH_UP && dueDate <= today; i++) {
      const next = nextDueAfter(r.frequency, r.day, dueDate);
      const spentAt = dueDate;
      let claimed = false;
      // Claim this occurrence and log it together: both happen or neither does.
      await getDb().withTransactionAsync(async () => {
        claimed = await advanceRecurring(r.id, spentAt, next);
        if (!claimed) return; // someone else already logged it
        await addExpense({
          periodId,
          categoryId: r.category_id,
          bucket: r.bucket,
          amountCents: r.amount_cents,
          note: r.note,
          spentAt,
          recurringId: r.id,
        });
      });
      if (!claimed) break;
      logged += 1;
      dueDate = next;
    }
  }
  return logged;
}
