// ---------------------------------------------------------------------------
// INSIGHTS + STREAK  (pure)
// ---------------------------------------------------------------------------
// buildInsights() turns this month's and last month's numbers into up to three
// short, plain-language lines for the dashboard ("Food is up 24%...").
//
// The comparison is FAIR: this month so far (the 1st to today) against the
// SAME days of last month - not against all of last month, which would make
// every month look cheap until the very end.
//
// computeStreak() counts how many days in a row you've logged something.
// ---------------------------------------------------------------------------

import { formatCents } from '@/services/money';
import { addDays } from '@/utils/date';

const MIN_CATEGORY_CHANGE_CENTS = 50_00; // ignore tiny wobbles (under ₱50)
const MIN_CATEGORY_CHANGE_PCT = 15;
const SAME_PCT = 5; // within ±5% counts as "about the same"

/**
 * @typedef {{ name:string|null, total:number }} CatTotal
 * @typedef {{ icon:string, tone:'good'|'bad'|'neutral', text:string }} Insight
 */

/**
 * @param {object} p
 * @param {CatTotal[]} p.thisMonth   per category, this month so far
 * @param {CatTotal[]} p.lastMonth   per category, same days of last month
 * @param {{ amount_cents:number, note:string|null, category_name:string|null } | null} p.biggest
 * @returns {Insight[]}
 */
export function buildInsights({ thisMonth, lastMonth, biggest }) {
  const out = [];
  const sum = (rows) => rows.reduce((s, r) => s + r.total, 0);
  const thisTotal = sum(thisMonth);
  const lastTotal = sum(lastMonth);
  const label = (name) => name ?? 'Uncategorized';

  if (thisTotal <= 0 && lastTotal <= 0) return out;

  // 1) Overall pace vs this time last month.
  if (lastTotal > 0) {
    const pct = Math.round(((thisTotal - lastTotal) / lastTotal) * 100);
    if (Math.abs(pct) < SAME_PCT) {
      out.push({ icon: 'swap-horizontal', tone: 'neutral', text: 'Spending is about the same as this time last month.' });
    } else if (pct < 0) {
      out.push({ icon: 'trending-down', tone: 'good', text: `You've spent ${Math.abs(pct)}% less than this time last month.` });
    } else {
      out.push({ icon: 'trending-up', tone: 'bad', text: `You've spent ${pct}% more than this time last month.` });
    }
  }

  // 2) The category that changed the most.
  const lastByName = new Map(lastMonth.map((r) => [label(r.name), r.total]));
  let up = null;
  let down = null;
  for (const r of thisMonth) {
    const before = lastByName.get(label(r.name)) ?? 0;
    if (before <= 0) continue;
    const delta = r.total - before;
    const pct = Math.round((delta / before) * 100);
    if (Math.abs(delta) < MIN_CATEGORY_CHANGE_CENTS || Math.abs(pct) < MIN_CATEGORY_CHANGE_PCT) continue;
    if (delta > 0 && (!up || delta > up.delta)) up = { name: label(r.name), delta, pct };
    if (delta < 0 && (!down || delta < down.delta)) down = { name: label(r.name), delta, pct };
  }
  if (up) {
    out.push({ icon: 'arrow-up-circle', tone: 'bad', text: `${up.name} is up ${up.pct}% (${formatCents(up.delta)} more).` });
  } else if (down) {
    out.push({ icon: 'arrow-down-circle', tone: 'good', text: `${down.name} is down ${Math.abs(down.pct)}% vs last month.` });
  }

  // 3) Where most of the money went, or the single biggest expense.
  if (thisTotal > 0 && thisMonth[0]) {
    const share = Math.round((thisMonth[0].total / thisTotal) * 100);
    out.push({ icon: 'pie-chart', tone: 'neutral', text: `Most of this month went to ${label(thisMonth[0].name)} (${share}%).` });
  }
  if (biggest && out.length < 3) {
    const what = biggest.note || label(biggest.category_name);
    out.push({ icon: 'receipt', tone: 'neutral', text: `Biggest expense: ${what} · ${formatCents(biggest.amount_cents)}.` });
  }

  return out.slice(0, 3);
}

/**
 * Days in a row with at least one expense, ending today - or yesterday, so the
 * streak doesn't look broken in the morning before you've logged anything.
 *
 * @param {string[]} days   distinct ISO days with expenses (any order)
 * @param {string} today    ISO day
 * @returns {{ count:number, loggedToday:boolean }}
 */
export function computeStreak(days, today) {
  const set = new Set(days);
  const loggedToday = set.has(today);
  let cursor = loggedToday ? today : addDays(today, -1);
  let count = 0;
  while (set.has(cursor) && count < 3650) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return { count, loggedToday };
}
