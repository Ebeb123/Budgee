// ---------------------------------------------------------------------------
// ACCOUNT SERVICE  (application service)
// ---------------------------------------------------------------------------
// This is a different LAYER from the pure calculators in budget.js/period.js.
// A "service" here composes repositories + pure functions into one meaningful
// action the app performs, so the logic lives in one place instead of being
// scattered across screens.
//
// The app is a single, ongoing account (a "running total" that never resets).
// openAccount() sets that account up once, during onboarding. New money is
// added later through the income ledger (addIncomeEvent) - NOT by starting a
// new period - and savings is moved to goals manually (Step 2), never
// automatically.
// ---------------------------------------------------------------------------

import { computePeriodBounds } from '@/services/period';
import { createPeriod } from '@/repositories/budgetRepo';
import { addIncomeEvent } from '@/repositories/incomeRepo';

/**
 * Create the single ongoing account and record the starting balance as the
 * first income-ledger event.
 *
 * WHY create the account with income 0 and then log an event (instead of
 * writing the balance straight onto the account row): it keeps ONE rule for
 * money - every centavo of income exists as a ledger entry. That means the
 * running total is always exactly SUM(income_events), with no special first
 * value that lives only on the account row.
 *
 * @param {object} p
 * @param {'weekly'|'monthly'} p.periodType   kept for label/legacy reasons
 * @param {string} p.startDate                'YYYY-MM-DD' (usually today)
 * @param {number} p.incomeCents              starting balance
 * @param {number} p.needsPct
 * @param {number} p.wantsPct
 * @param {number} p.savingsPct
 * @returns {Promise<{ periodId: number }>}
 */
export async function openAccount({
  periodType,
  startDate,
  incomeCents,
  needsPct,
  wantsPct,
  savingsPct,
}) {
  // We still compute bounds so start_date is stored (the account's "opened on"
  // date, which powers the monthly-average forecast). end_date is no longer
  // used for a countdown, but the column exists so we fill it harmlessly.
  const { startDate: start, endDate } = computePeriodBounds(periodType, startDate);

  const periodId = await createPeriod({
    periodType,
    startDate: start,
    endDate,
    incomeCents: 0, // real balance is written below, as a ledger event
    needsPct,
    wantsPct,
    savingsPct,
  });

  if (incomeCents > 0) {
    await addIncomeEvent({ amountCents: incomeCents, occurredAt: start, note: 'Starting balance' });
  }

  return { periodId };
}
