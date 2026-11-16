// ---------------------------------------------------------------------------
// BILL REPOSITORY
// ---------------------------------------------------------------------------
// All SQL for the billers and bills tables (added in migration v5).
// ---------------------------------------------------------------------------

import { getDb } from '@/db/database';

/**
 * @typedef {Object} Biller
 * @property {number} id
 * @property {string} name
 * @property {string} color
 * @property {string|null} logo_key   bundled logo (built-ins)
 * @property {string|null} logo_uri   picture you picked (data: URI)
 * @property {number} is_default
 * @property {number} [bill_count]
 */

/**
 * @typedef {Object} Bill
 * @property {number} id
 * @property {number} biller_id
 * @property {string|null} nickname
 * @property {string|null} account_number
 * @property {number|null} amount_cents
 * @property {number} due_day
 * @property {string} due_date
 * @property {string|null} last_paid_at
 * @property {string} biller_name
 * @property {string} biller_color
 * @property {string|null} biller_logo_key
 * @property {string|null} biller_logo_uri
 */

// ---- Billers ---------------------------------------------------------------

/** Built-ins first, then the ones you added. @returns {Promise<Biller[]>} */
export async function listBillers() {
  return getDb().getAllAsync(
    `SELECT b.*, (SELECT COUNT(*) FROM bills WHERE biller_id = b.id) AS bill_count
       FROM billers b
      ORDER BY b.is_default DESC, b.name COLLATE NOCASE ASC;`,
  );
}

/** @returns {Promise<Biller|null>} */
export async function getBiller(id) {
  return (await getDb().getFirstAsync('SELECT * FROM billers WHERE id = ?;', [id])) ?? null;
}

/** @returns {Promise<number>} new id */
export async function createBiller({ name, color, logoKey = null, logoUri = null }) {
  const res = await getDb().runAsync('INSERT INTO billers (name, color, logo_key, logo_uri) VALUES (?, ?, ?, ?);', [
    name,
    color,
    logoKey,
    logoUri,
  ]);
  return res.lastInsertRowId;
}

/** Update name / colour / logos (pass null to remove a logo). */
export async function updateBiller(id, { name, color, logoKey, logoUri }) {
  await getDb().runAsync('UPDATE billers SET name = ?, color = ?, logo_key = ?, logo_uri = ? WHERE id = ?;', [
    name,
    color,
    logoKey ?? null,
    logoUri ?? null,
    id,
  ]);
}

/** Delete a biller and every bill under it. */
export async function deleteBiller(id) {
  const db = getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM bills WHERE biller_id = ?;', [id]);
    await db.runAsync('DELETE FROM billers WHERE id = ?;', [id]);
  });
}

// ---- Bills -----------------------------------------------------------------

const SELECT_BILL = `
  SELECT b.*, r.name AS biller_name, r.color AS biller_color,
         r.logo_key AS biller_logo_key, r.logo_uri AS biller_logo_uri
    FROM bills b
    JOIN billers r ON r.id = b.biller_id`;

/** Every bill, soonest due first. @returns {Promise<Bill[]>} */
export async function listBills() {
  return getDb().getAllAsync(`${SELECT_BILL} ORDER BY b.due_date ASC, b.id ASC;`);
}

/** @returns {Promise<Bill|null>} */
export async function getBill(id) {
  return (await getDb().getFirstAsync(`${SELECT_BILL} WHERE b.id = ?;`, [id])) ?? null;
}

/**
 * @param {{ billerId:number, nickname:string|null, accountNumber:string|null,
 *           amountCents:number|null, dueDay:number, dueDate:string }} b
 * @returns {Promise<number>} new id
 */
export async function createBill({ billerId, nickname, accountNumber, amountCents, dueDay, dueDate }) {
  const res = await getDb().runAsync(
    `INSERT INTO bills (biller_id, nickname, account_number, amount_cents, due_day, due_date)
     VALUES (?, ?, ?, ?, ?, ?);`,
    [billerId, nickname ?? null, accountNumber ?? null, amountCents ?? null, dueDay, dueDate],
  );
  return res.lastInsertRowId;
}

/** Update the fields you pass. */
export async function updateBill(id, fields) {
  const map = {
    billerId: 'biller_id',
    nickname: 'nickname',
    accountNumber: 'account_number',
    amountCents: 'amount_cents',
    dueDay: 'due_day',
    dueDate: 'due_date',
    lastPaidAt: 'last_paid_at',
  };
  const sets = [];
  const values = [];
  for (const [key, column] of Object.entries(map)) {
    if (fields[key] !== undefined) {
      sets.push(`${column} = ?`);
      values.push(fields[key]);
    }
  }
  if (sets.length === 0) return;
  values.push(id);
  await getDb().runAsync(`UPDATE bills SET ${sets.join(', ')} WHERE id = ?;`, values);
}

export async function deleteBill(id) {
  await getDb().runAsync('DELETE FROM bills WHERE id = ?;', [id]);
}
