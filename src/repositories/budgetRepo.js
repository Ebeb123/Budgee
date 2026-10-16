// ---------------------------------------------------------------------------
// BUDGET (PERIOD) REPOSITORY
// ---------------------------------------------------------------------------
// All SQL for the budget_periods table. The rest of the app never writes this
// SQL itself - it calls these functions. There is at most ONE active period at
// a time; creating a new one closes the previous active one.
// ---------------------------------------------------------------------------

import { getDb } from '@/db/database';

/**
 * The current active period, or null if none exists yet (fresh install).
 * @returns {Promise<import('@/types').Period | null>}
 */
export async function getActivePeriod() {
  const row = await getDb().getFirstAsync(
    `SELECT * FROM budget_periods WHERE status = 'active' ORDER BY id DESC LIMIT 1;`,
  );
  return row ?? null;
}

/**
 * @param {number} id
 * @returns {Promise<import('@/types').Period | null>}
 */
export async function getPeriodById(id) {
  const row = await getDb().getFirstAsync('SELECT * FROM budget_periods WHERE id = ?;', [id]);
  return row ?? null;
}

/**
 * Create a new active period, closing any previous active one. Wrapped in a
 * transaction so we can never end up with two active periods (or none) if
 * something fails halfway.
 *
 * @param {object} p
 * @param {'weekly'|'monthly'} p.periodType
 * @param {string} p.startDate
 * @param {string} p.endDate
 * @param {number} p.incomeCents
 * @param {number} [p.needsPct=50]
 * @param {number} [p.wantsPct=30]
 * @param {number} [p.savingsPct=20]
 * @returns {Promise<number>} the new period's id
 */
export async function createPeriod({
  periodType,
  startDate,
  endDate,
  incomeCents,
  needsPct = 50,
  wantsPct = 30,
  savingsPct = 20,
}) {
  const db = getDb();
  let newId = 0;
  await db.withTransactionAsync(async () => {
    await db.runAsync(`UPDATE budget_periods SET status = 'closed' WHERE status = 'active';`);
    const res = await db.runAsync(
      `INSERT INTO budget_periods
         (period_type, start_date, end_date, income_cents, needs_pct, wants_pct, savings_pct)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [periodType, startDate, endDate, incomeCents, needsPct, wantsPct, savingsPct],
    );
    newId = res.lastInsertRowId;
  });
  return newId;
}

/**
 * Edit the income and/or split of an existing period (the "let me edit later"
 * requirement). Only the fields you pass are changed.
 *
 * @param {number} id
 * @param {{ incomeCents?: number, needsPct?: number, wantsPct?: number, savingsPct?: number }} fields
 */
export async function updatePeriod(id, fields) {
  const map = {
    incomeCents: 'income_cents',
    needsPct: 'needs_pct',
    wantsPct: 'wants_pct',
    savingsPct: 'savings_pct',
  };
  const sets = [];
  const values = [];
  for (const [key, column] of Object.entries(map)) {
    if (fields[key] !== undefined) {
      sets.push(`${column} = ?`);
      values.push(fields[key]);
    }
  }
  if (sets.length === 0) return; // nothing to update
  values.push(id);
  await getDb().runAsync(`UPDATE budget_periods SET ${sets.join(', ')} WHERE id = ?;`, values);
}

/**
 * All periods newest-first (for a future history/summary screen).
 * @returns {Promise<import('@/types').Period[]>}
 */
export async function listPeriods() {
  return getDb().getAllAsync('SELECT * FROM budget_periods ORDER BY id DESC;');
}