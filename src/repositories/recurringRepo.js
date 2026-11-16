// ---------------------------------------------------------------------------
// RECURRING EXPENSE REPOSITORY
// ---------------------------------------------------------------------------
// All SQL for the recurring_expenses table (added in migration v4).
// ---------------------------------------------------------------------------

import { getDb } from '@/db/database';

/**
 * @typedef {Object} Recurring
 * @property {number} id
 * @property {number|null} category_id
 * @property {'need'|'want'} bucket
 * @property {number} amount_cents
 * @property {string|null} note
 * @property {'weekly'|'monthly'} frequency
 * @property {number} day
 * @property {string} next_due
 * @property {number} is_active
 * @property {string} [category_name]
 * @property {string} [category_icon]
 * @property {string} [category_color]
 */

const SELECT = `
  SELECT r.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color
    FROM recurring_expenses r
    LEFT JOIN categories c ON c.id = r.category_id`;

/** All recurring expenses, active ones first, soonest first. @returns {Promise<Recurring[]>} */
export async function listRecurring() {
  return getDb().getAllAsync(`${SELECT} ORDER BY r.is_active DESC, r.next_due ASC, r.id ASC;`);
}

/** @returns {Promise<Recurring|null>} */
export async function getRecurring(id) {
  const row = await getDb().getFirstAsync(`${SELECT} WHERE r.id = ?;`, [id]);
  return row ?? null;
}

/** Active recurring expenses due on or before a day. @returns {Promise<Recurring[]>} */
export async function listDueRecurring(todayISO) {
  return getDb().getAllAsync(
    `SELECT * FROM recurring_expenses WHERE is_active = 1 AND next_due <= ? ORDER BY next_due ASC;`,
    [todayISO],
  );
}

/**
 * @param {{ categoryId:number, bucket:'need'|'want', amountCents:number, note:string|null,
 *           frequency:'weekly'|'monthly', day:number, nextDue:string }} r
 * @returns {Promise<number>} new id
 */
export async function createRecurring({ categoryId, bucket, amountCents, note, frequency, day, nextDue }) {
  const res = await getDb().runAsync(
    `INSERT INTO recurring_expenses (category_id, bucket, amount_cents, note, frequency, day, next_due)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [categoryId, bucket, amountCents, note ?? null, frequency, day, nextDue],
  );
  return res.lastInsertRowId;
}

/** Update the fields you pass. */
export async function updateRecurring(id, fields) {
  const map = {
    categoryId: 'category_id',
    bucket: 'bucket',
    amountCents: 'amount_cents',
    note: 'note',
    frequency: 'frequency',
    day: 'day',
    nextDue: 'next_due',
    isActive: 'is_active',
  };
  const sets = [];
  const values = [];
  for (const [key, column] of Object.entries(map)) {
    if (fields[key] !== undefined) {
      sets.push(`${column} = ?`);
      values.push(typeof fields[key] === 'boolean' ? (fields[key] ? 1 : 0) : fields[key]);
    }
  }
  if (sets.length === 0) return;
  values.push(id);
  await getDb().runAsync(`UPDATE recurring_expenses SET ${sets.join(', ')} WHERE id = ?;`, values);
}

/**
 * Move next_due forward ONLY if it still equals `fromISO`. Returns true when it
 * moved. This "compare and set" means the same due date can never be logged
 * twice, even if two refreshes overlap.
 */
export async function advanceRecurring(id, fromISO, toISO) {
  const res = await getDb().runAsync(
    `UPDATE recurring_expenses SET next_due = ? WHERE id = ? AND next_due = ?;`,
    [toISO, id, fromISO],
  );
  return res.changes === 1;
}

/** Delete a recurring expense. Expenses it already logged stay in your history. */
export async function deleteRecurring(id) {
  await getDb().runAsync('DELETE FROM recurring_expenses WHERE id = ?;', [id]);
}
