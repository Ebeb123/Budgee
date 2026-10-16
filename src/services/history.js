// ---------------------------------------------------------------------------
// HISTORY  (pure grouping helpers)
// ---------------------------------------------------------------------------
// Turns a flat, date-sorted list of expenses into day groups for the history
// screen, and builds a continuous day-by-day series for the trend chart.
// Pure functions -> unit-testable.
// ---------------------------------------------------------------------------

import { addDays } from '@/utils/date';

/**
 * Group expenses by their spent_at day, preserving input order (we expect the
 * repository to return them newest-first, so the groups come out newest-first
 * too). Each group carries its own total.
 *
 * @param {import('@/types').Expense[]} expenses
 * @returns {{ day: string, items: import('@/types').Expense[], totalCents: number }[]}
 */
export function groupByDay(expenses) {
  const map = new Map(); // preserves insertion order
  for (const e of expenses) {
    if (!map.has(e.spent_at)) map.set(e.spent_at, []);
    map.get(e.spent_at).push(e);
  }
  return [...map.entries()].map(([day, items]) => ({
    day,
    items,
    totalCents: items.reduce((sum, i) => sum + i.amount_cents, 0),
  }));
}

/**
 * Build a continuous per-day series from start to end (inclusive), filling days
 * with no spending as 0. This gives the trend chart an even x-axis so gaps show
 * as dips instead of being skipped.
 *
 * @param {string} startISO
 * @param {string} endISO
 * @param {Record<string, number>} totalsByDay  { 'YYYY-MM-DD': cents }
 * @returns {{ day: string, totalCents: number }[]}
 */
export function buildDailySeries(startISO, endISO, totalsByDay) {
  const series = [];
  let cursor = startISO;
  let guard = 0; // safety stop so a bad range can never loop forever
  while (cursor <= endISO && guard < 400) {
    series.push({ day: cursor, totalCents: totalsByDay[cursor] ?? 0 });
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return series;
}