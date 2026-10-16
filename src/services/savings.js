// ---------------------------------------------------------------------------
// SAVINGS  (goal progress + milestones + time-to-goal forecast)
// ---------------------------------------------------------------------------
// Pure helpers for the savings-goal feature. Amounts are centavos.
// ---------------------------------------------------------------------------

import { addMonths } from '@/utils/date';

/**
 * Describe progress toward a goal.
 *
 * @param {number} targetCents
 * @param {number} savedCents
 * @returns {{
 *   targetCents: number,
 *   savedCents: number,
 *   remainingCents: number,  // never below 0
 *   pct: number,             // 0..1, capped at 1 for display
 *   reached: boolean
 * }}
 */
export function goalProgress(targetCents, savedCents) {
  const remainingCents = Math.max(0, targetCents - savedCents);
  const pct = targetCents > 0 ? Math.min(1, savedCents / targetCents) : 0;
  return {
    targetCents,
    savedCents,
    remainingCents,
    pct,
    reached: savedCents >= targetCents,
  };
}

/**
 * How much of your savings is still AVAILABLE to move into goals: the savings
 * budget (your 20% of the running total) minus everything already contributed.
 * Never negative. This is the base the 30% / 60% / 100% quick-add buttons act
 * on in Step 2.
 *
 * @param {number} savingsBudgetCents  20% of the running income
 * @param {number} contributedCents    total already put toward goals
 * @returns {number} centavos still available
 */
export function availableSavingsCents(savingsBudgetCents, contributedCents) {
  return Math.max(0, savingsBudgetCents - contributedCents);
}

// The quick-pick percentages for moving savings into a goal.
export const QUICK_ALLOCATION_PCTS = [30, 60, 100];

/**
 * Turn "how much savings is available" into the three quick-add choices, each
 * with its concrete peso amount. The 100% choice returns the exact available
 * amount (no rounding drift), so tapping it always allocates everything.
 *
 * @param {number} availableCents
 * @returns {{ pct: number, cents: number }[]}
 */
export function quickAllocations(availableCents) {
  const base = Math.max(0, availableCents);
  return QUICK_ALLOCATION_PCTS.map((pct) => ({
    pct,
    cents: pct === 100 ? base : Math.round((base * pct) / 100),
  }));
}

// The progress points we celebrate (as percentages of the target).
export const MILESTONES = [25, 50, 75, 100];

/**
 * Given how much was saved BEFORE and AFTER a new contribution, return which
 * milestone(s) were newly crossed. Used to show a congratulatory message when
 * savings ticks past 25% / 50% / 75% / 100%.
 *
 * @param {number} prevSavedCents
 * @param {number} newSavedCents
 * @param {number} targetCents
 * @returns {number[]}  e.g. [25] or [50, 75] if a big top-up skipped one
 */
export function crossedMilestones(prevSavedCents, newSavedCents, targetCents) {
  if (targetCents <= 0) return [];
  const before = (prevSavedCents / targetCents) * 100;
  const after = (newSavedCents / targetCents) * 100;
  return MILESTONES.filter((m) => before < m && after >= m);
}

/**
 * A short milestone message for the CURRENT progress, or null before 25%.
 * Used on the goal card so you get a little encouragement as you climb.
 *
 * @param {number} pct  0..1
 * @returns {string | null}
 */
export function milestoneMessage(pct) {
  if (pct >= 1) return 'Goal reached! 🎉';
  if (pct >= 0.75) return '75% — almost there!';
  if (pct >= 0.5) return 'Halfway there! 💪';
  if (pct >= 0.25) return "You're 25% in!";
  return null;
}

/**
 * Estimate how long until a goal is reached, on a MONTHLY basis.
 *
 * WHY monthly (and not "per period" anymore): the app is now one running total
 * with no fixed cycle, so there is no per-period savings amount. Instead the
 * dashboard works out your AVERAGE monthly savings so far (your savings budget
 * spread over how many months the account has been running) and passes it here.
 * The forecast then answers "at that average pace, when do I get there?".
 *
 * Returns a status so the UI can show the right thing:
 *   - 'reached'    already at/over target -> no countdown
 *   - 'no_savings' average monthly savings is 0 -> can't project yet
 *   - 'ok'         a real estimate (monthsNeeded + finish date + label)
 *
 * @param {object} p
 * @param {number} p.targetCents
 * @param {number} p.savedCents
 * @param {number} p.monthlySavingsCents  average savings set aside per month
 * @param {string} p.todayISO             anchor date for the finish estimate
 * @returns {{ status: 'reached' } | { status: 'no_savings' } |
 *   { status: 'ok', monthsNeeded: number, finishDateISO: string, durationLabel: string }}
 */
export function estimateTimeToGoal({ targetCents, savedCents, monthlySavingsCents, todayISO }) {
  const remaining = targetCents - savedCents;
  if (remaining <= 0) return { status: 'reached' };
  if (!monthlySavingsCents || monthlySavingsCents <= 0) return { status: 'no_savings' };

  // Round up - a partial month still means you haven't reached it yet.
  const monthsNeeded = Math.ceil(remaining / monthlySavingsCents);
  const finishDateISO = addMonths(todayISO, monthsNeeded);
  const durationLabel = `≈ ${monthsNeeded} month${monthsNeeded === 1 ? '' : 's'}`;

  return { status: 'ok', monthsNeeded, finishDateISO, durationLabel };
}
