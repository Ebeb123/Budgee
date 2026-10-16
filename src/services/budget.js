// ---------------------------------------------------------------------------
// BUDGET  (the 50/30/20 rules)
// ---------------------------------------------------------------------------
// Pure functions that turn an income + percentages into concrete peso amounts,
// and summarize how much of a bucket has been used. No database, no UI - just
// numbers in, numbers out. That makes these the easiest, safest code to test.
// All amounts are in centavos (integers).
// ---------------------------------------------------------------------------

/**
 * Check that a set of percentages is usable. Returns an error MESSAGE string if
 * invalid, or null if valid. (Returning the message lets the UI show it.)
 *
 * @param {number} needsPct
 * @param {number} wantsPct
 * @param {number} savingsPct
 * @returns {string | null}
 */
export function validateSplit(needsPct, wantsPct, savingsPct) {
  const all = [needsPct, wantsPct, savingsPct];
  if (all.some((p) => !Number.isInteger(p) || p < 0 || p > 100)) {
    return 'Each percentage must be a whole number from 0 to 100.';
  }
  if (needsPct + wantsPct + savingsPct !== 100) {
    return 'The three percentages must add up to 100.';
  }
  return null;
}

/**
 * Split an income into the three buckets.
 *
 * WHY the savings line is subtraction, not another round(): if we rounded all
 * three independently they could sum to one centavo more or less than the
 * income. Instead we round needs and wants, then give savings whatever is left.
 * This guarantees needsCents + wantsCents + savingsCents === incomeCents,
 * exactly, every time - no lost or invented centavo.
 *
 * @param {number} incomeCents
 * @param {number} needsPct
 * @param {number} wantsPct
 * @param {number} savingsPct   (unused directly - savings takes the remainder)
 * @returns {{ needsCents: number, wantsCents: number, savingsCents: number }}
 */
export function computeSplit(incomeCents, needsPct, wantsPct, savingsPct) {
  const needsCents = Math.round((incomeCents * needsPct) / 100);
  const wantsCents = Math.round((incomeCents * wantsPct) / 100);
  const savingsCents = incomeCents - needsCents - wantsCents;
  return { needsCents, wantsCents, savingsCents };
}

/**
 * Summarize one spending bucket for the dashboard.
 *
 * @param {number} budgetCents  How much this bucket was allotted
 * @param {number} spentCents   How much has been spent from it
 * @returns {{
 *   budgetCents: number,
 *   spentCents: number,
 *   remainingCents: number,   // negative if overspent
 *   pctUsed: number,          // 0..1 normally, can exceed 1 when overspent
 *   overspent: boolean
 * }}
 */
export function bucketSummary(budgetCents, spentCents) {
  const remainingCents = budgetCents - spentCents;
  // Guard against divide-by-zero when a bucket's budget is 0.
  const pctUsed = budgetCents > 0 ? spentCents / budgetCents : spentCents > 0 ? 1 : 0;
  return {
    budgetCents,
    spentCents,
    remainingCents,
    pctUsed,
    overspent: remainingCents < 0,
  };
}