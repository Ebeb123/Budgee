// ---------------------------------------------------------------------------
// PERIOD  (weekly / monthly budgeting window)
// ---------------------------------------------------------------------------
// A "period" is one allowance window. We model it as starting on the day you
// enter your balance and running forward - matching how a student actually
// thinks ("I got money today, this is my budget for the week/month").
//
//   weekly  -> 7 days total: start .. start+6
//   monthly -> start .. (one month later, minus a day)
//
// Kept as pure functions so period math is testable on its own.
// ---------------------------------------------------------------------------

import { addDays, addMonths } from '@/utils/date';

/**
 * Compute the start/end day strings for a period.
 * @param {'weekly' | 'monthly'} type
 * @param {string} startISO  first day of the period ('YYYY-MM-DD')
 * @returns {{ startDate: string, endDate: string }}
 */
export function computePeriodBounds(type, startISO) {
  if (type === 'weekly') {
    return { startDate: startISO, endDate: addDays(startISO, 6) };
  }
  if (type === 'monthly') {
    // e.g. start Sep 10 -> end Oct 9 (Oct 10 minus one day).
    return { startDate: startISO, endDate: addDays(addMonths(startISO, 1), -1) };
  }
  throw new Error(`Unknown period type: ${type}`);
}

/**
 * Is an ISO day inside a period? Works as a plain string comparison because ISO
 * day strings sort chronologically.
 * @param {string} iso
 * @param {{ start_date: string, end_date: string }} period
 * @returns {boolean}
 */
export function isDateInPeriod(iso, period) {
  return iso >= period.start_date && iso <= period.end_date;
}

/**
 * Whole days remaining in the period, counting today (0 if already past the end).
 * @param {string} todayISO
 * @param {{ end_date: string }} period
 * @returns {number}
 */
export function daysLeftInPeriod(todayISO, period) {
  if (todayISO > period.end_date) return 0;
  const start = todayISO < period.end_date ? todayISO : period.end_date;
  let count = 0;
  let cursor = start;
  while (cursor <= period.end_date) {
    count += 1;
    cursor = addDays(cursor, 1);
  }
  return count;
}