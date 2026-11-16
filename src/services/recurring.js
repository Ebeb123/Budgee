// ---------------------------------------------------------------------------
// RECURRING  (pure schedule math)
// ---------------------------------------------------------------------------
// A recurring expense repeats either weekly (on a weekday, 0 = Sunday) or
// monthly (on a day of the month, 1-31). These pure functions answer "when is
// it due first?", "when is it due next?" and "how do I describe it?".
// Months shorter than the chosen day use their last day (the 31st -> Apr 30)
// without losing the original day for later months.
// ---------------------------------------------------------------------------

import { addDays, dayInMonth, dayOfWeek, ordinal, shiftYM, WEEKDAYS, ymOf } from '@/utils/date';

/**
 * The first due date on or after `fromISO`.
 * @param {'weekly'|'monthly'} frequency
 * @param {number} day   weekday 0-6, or day of month 1-31
 * @param {string} fromISO
 * @returns {string}
 */
export function firstDueDate(frequency, day, fromISO) {
  if (frequency === 'weekly') {
    const diff = (day - dayOfWeek(fromISO) + 7) % 7;
    return addDays(fromISO, diff);
  }
  const thisMonth = dayInMonth(ymOf(fromISO), day);
  return thisMonth >= fromISO ? thisMonth : dayInMonth(shiftYM(ymOf(fromISO), 1), day);
}

/**
 * The due date after `dueISO`.
 * @param {'weekly'|'monthly'} frequency
 * @param {number} day
 * @param {string} dueISO
 * @returns {string}
 */
export function nextDueAfter(frequency, day, dueISO) {
  if (frequency === 'weekly') return addDays(dueISO, 7);
  return dayInMonth(shiftYM(ymOf(dueISO), 1), day);
}

/** 'Every Monday' / 'Every month on the 15th'. */
export function describeSchedule(frequency, day) {
  return frequency === 'weekly' ? `Every ${WEEKDAYS[day]}` : `Every month on the ${ordinal(day)}`;
}
