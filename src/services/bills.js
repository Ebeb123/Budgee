// ---------------------------------------------------------------------------
// BILLS  (pure due-date logic)
// ---------------------------------------------------------------------------
// Bills repeat monthly on a day of the month. Months shorter than that day use
// their last day (the 31st -> Apr 30) without losing the 31st for later months.
// You're reminded REMIND_DAYS before the due date.
// ---------------------------------------------------------------------------

import { daysBetween } from '@/utils/date';
import { firstDueDate, nextDueAfter } from '@/services/recurring';

export const REMIND_DAYS = 7;

/** First due date on or after `fromISO` for a bill due on `day`. */
export function firstBillDue(day, fromISO) {
  return firstDueDate('monthly', day, fromISO);
}

/** The due date one month after `dueISO`. */
export function nextBillDue(day, dueISO) {
  return nextDueAfter('monthly', day, dueISO);
}

/**
 * How urgent a bill is.
 *   overdue -> past the due date and not marked paid
 *   today   -> due today
 *   soon    -> within REMIND_DAYS
 *   later   -> further away
 * @param {string} dueISO
 * @param {string} todayISO
 * @returns {{ days:number, tone:'overdue'|'today'|'soon'|'later', label:string }}
 */
export function billStatus(dueISO, todayISO) {
  const days = daysBetween(todayISO, dueISO);
  if (days < 0) {
    const n = -days;
    return { days, tone: 'overdue', label: `Overdue by ${n} day${n === 1 ? '' : 's'}` };
  }
  if (days === 0) return { days, tone: 'today', label: 'Due today' };
  if (days === 1) return { days, tone: 'soon', label: 'Due tomorrow' };
  if (days <= REMIND_DAYS) return { days, tone: 'soon', label: `Due in ${days} days` };
  return { days, tone: 'later', label: `Due in ${days} days` };
}

/** Display name: "PLDT" or "PLDT · Home". */
export function billTitle(bill) {
  return bill.nickname ? `${bill.biller_name} · ${bill.nickname}` : bill.biller_name;
}
