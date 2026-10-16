// ---------------------------------------------------------------------------
// INCOME REPOSITORY
// ---------------------------------------------------------------------------
// All SQL for the income_events ledger (added in migration v2). This is the
// heart of the "running total, forever" model: money is never a single number
// we overwrite. Every time money comes in - or you adjust your balance - we
// append a row here, and the account's running total is the SUM of those rows.
//
// addIncomeEvent() also bumps the cached income_cents on the active account in
// the SAME transaction, so the two can never fall out of sync: either both the
// ledger row and the running total are written, or neither is.
// ---------------------------------------------------------------------------

import { getDb } from '@/db/database';

/**
 * Record money coming in (or a balance adjustment) and update the running
 * total. A positive amount is income; a negative amount is a downward
 * adjustment. Both are stored so the ledger stays a truthful history.
 *
 * @param {object} e
 * @param {number} e.amountCents        centavos (may be negative for an adjustment)
 * @param {string} e.occurredAt         'YYYY-MM-DD'
 * @param {string|null} [e.note]
 * @returns {Promise<number>} new income_event id
 */
export async function addIncomeEvent({ amountCents, occurredAt, note = null }) {
  const db = getDb();
  let newId = 0;
  await db.withTransactionAsync(async () => {
    const res = await db.runAsync(
      `INSERT INTO income_events (amount_cents, occurred_at, note) VALUES (?, ?, ?);`,
      [amountCents, occurredAt, note],
    );
    newId = res.lastInsertRowId;
    // Keep the account's cached running total in step with the ledger.
    await db.runAsync(
      `UPDATE budget_periods SET income_cents = income_cents + ? WHERE status = 'active';`,
      [amountCents],
    );
  });
  return newId;
}

/**
 * Every income event, newest first (for a future "income history" list).
 * @returns {Promise<{ id:number, amount_cents:number, occurred_at:string, note:string|null, created_at:string }[]>}
 */
export async function listIncomeEvents() {
  return getDb().getAllAsync(
    `SELECT * FROM income_events ORDER BY occurred_at DESC, id DESC;`,
  );
}

/** Running total straight from the ledger (a cross-check for income_cents). */
export async function sumIncomeCents() {
  const row = await getDb().getFirstAsync(
    `SELECT COALESCE(SUM(amount_cents), 0) AS total FROM income_events;`,
  );
  return row?.total ?? 0;
}

/**
 * The earliest income date, or null if there is none yet. Used to work out how
 * many months the account has been running, for the average-savings forecast.
 * @returns {Promise<string|null>}
 */
export async function firstIncomeDateISO() {
  const row = await getDb().getFirstAsync(
    `SELECT MIN(occurred_at) AS d FROM income_events;`,
  );
  return row?.d ?? null;
}
