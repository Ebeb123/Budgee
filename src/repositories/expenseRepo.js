// ---------------------------------------------------------------------------
// EXPENSE REPOSITORY
// ---------------------------------------------------------------------------
// All SQL for the expenses table. Note the SOFT DELETE approach: "deleting" an
// expense just stamps deleted_at with the current time; every read filters out
// rows where deleted_at IS NOT NULL. This is what makes the future "Undo"
// feature possible - the row is still there to restore.
// ---------------------------------------------------------------------------

import { getDb } from '@/db/database';

/**
 * Insert a new expense.
 * @param {object} e
 * @param {number} e.periodId
 * @param {number|null} e.categoryId
 * @param {'need'|'want'} e.bucket
 * @param {number} e.amountCents
 * @param {string|null} e.note
 * @param {string} e.spentAt      'YYYY-MM-DD'
 * @param {number|null} [e.recurringId]  set when logged automatically by a recurring expense
 * @returns {Promise<number>} new expense id
 */
export async function addExpense({ periodId, categoryId, bucket, amountCents, note, spentAt, recurringId = null }) {
  const res = await getDb().runAsync(
    `INSERT INTO expenses (period_id, category_id, bucket, amount_cents, note, spent_at, recurring_id)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [periodId, categoryId ?? null, bucket, amountCents, note ?? null, spentAt, recurringId],
  );
  return res.lastInsertRowId;
}

/**
 * Update an existing expense. Only provided fields change.
 * @param {number} id
 * @param {{ categoryId?: number|null, bucket?: 'need'|'want', amountCents?: number, note?: string|null, spentAt?: string }} fields
 */
export async function updateExpense(id, fields) {
  const map = {
    categoryId: 'category_id',
    bucket: 'bucket',
    amountCents: 'amount_cents',
    note: 'note',
    spentAt: 'spent_at',
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
  await getDb().runAsync(`UPDATE expenses SET ${sets.join(', ')} WHERE id = ?;`, values);
}

/** Soft-delete: mark as deleted but keep the row so it can be restored (Undo). */
export async function softDeleteExpense(id) {
  await getDb().runAsync(`UPDATE expenses SET deleted_at = datetime('now') WHERE id = ?;`, [id]);
}

/** Reverse a soft delete. */
export async function restoreExpense(id) {
  await getDb().runAsync('UPDATE expenses SET deleted_at = NULL WHERE id = ?;', [id]);
}

/**
 * @param {number} id
 * @returns {Promise<import('@/types').Expense | null>}
 */
export async function getExpenseById(id) {
  const row = await getDb().getFirstAsync('SELECT * FROM expenses WHERE id = ?;', [id]);
  return row ?? null;
}

/**
 * All active expenses in a period, newest day first, each joined with its
 * category name/icon for display. The LEFT JOIN keeps expenses whose category
 * was deleted (category_id becomes NULL).
 *
 * @param {number} periodId
 * @returns {Promise<import('@/types').Expense[]>}
 */
export async function listExpensesForPeriod(periodId) {
  return getDb().getAllAsync(
    `SELECT e.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color
       FROM expenses e
       LEFT JOIN categories c ON c.id = e.category_id
      WHERE e.period_id = ? AND e.deleted_at IS NULL
      ORDER BY e.spent_at DESC, e.id DESC;`,
    [periodId],
  );
}

/**
 * Total spent per bucket within one calendar month, e.g. { need: 125000, want: 40000 }.
 * The month is matched on the first 7 chars of spent_at ('YYYY-MM'). Always
 * returns both keys (0 when nothing spent) so callers need no null checks.
 * Not limited to a period - the running-total account spans months.
 *
 * @param {string} ym  'YYYY-MM'
 * @returns {Promise<{ need: number, want: number }>}
 */
export async function sumByBucketForMonth(ym) {
  const rows = await getDb().getAllAsync(
    `SELECT bucket, COALESCE(SUM(amount_cents), 0) AS total
       FROM expenses
      WHERE substr(spent_at, 1, 7) = ? AND deleted_at IS NULL
      GROUP BY bucket;`,
    [ym],
  );
  const out = { need: 0, want: 0 };
  for (const r of rows) out[r.bucket] = r.total;
  return out;
}

/**
 * Total spent per CATEGORY within one bucket, biggest first. Powers the
 * dashboard's Needs / Wants breakdown ring: each row is one slice, already
 * carrying the category's name, color and icon so the chart needs no extra
 * lookups. Categories with nothing spent are naturally omitted (nothing to
 * show for them).
 *
 * @param {number} periodId
 * @param {'need'|'want'} bucket
 * @returns {Promise<{ category_id:number|null, name:string|null, color:string|null, icon:string|null, total:number }[]>}
 */
export async function sumByCategory(periodId, bucket) {
  return getDb().getAllAsync(
    `SELECT e.category_id                 AS category_id,
            c.name                        AS name,
            c.color                       AS color,
            c.icon                        AS icon,
            COALESCE(SUM(e.amount_cents), 0) AS total
       FROM expenses e
       LEFT JOIN categories c ON c.id = e.category_id
      WHERE e.period_id = ? AND e.bucket = ? AND e.deleted_at IS NULL
      GROUP BY e.category_id
      ORDER BY total DESC;`,
    [periodId, bucket],
  );
}

/**
 * Total spent per bucket in a period, e.g. { need: 125000, want: 40000 }.
 * Always returns both keys (0 when nothing spent), so the dashboard can rely on
 * them without extra null checks.
 *
 * @param {number} periodId
 * @returns {Promise<{ need: number, want: number }>}
 */
export async function sumByBucket(periodId) {
  const rows = await getDb().getAllAsync(
    `SELECT bucket, COALESCE(SUM(amount_cents), 0) AS total
       FROM expenses
      WHERE period_id = ? AND deleted_at IS NULL
      GROUP BY bucket;`,
    [periodId],
  );
  const out = { need: 0, want: 0 };
  for (const r of rows) out[r.bucket] = r.total;
  return out;
}

/**
 * Total spent on a specific day within a period (for "today's spend").
 * @param {number} periodId
 * @param {string} dayISO
 * @returns {Promise<number>} centavos
 */
export async function sumForDay(periodId, dayISO) {
  const row = await getDb().getFirstAsync(
    `SELECT COALESCE(SUM(amount_cents), 0) AS total
       FROM expenses
      WHERE period_id = ? AND spent_at = ? AND deleted_at IS NULL;`,
    [periodId, dayISO],
  );
  return row?.total ?? 0;
}

/**
 * Whether any expense was logged on a given day (used by the notification logic
 * in Step 7 to decide whether to remind you).
 * @param {string} dayISO
 * @returns {Promise<boolean>}
 */
export async function hasExpenseOnDay(dayISO) {
  const row = await getDb().getFirstAsync(
    `SELECT 1 FROM expenses WHERE spent_at = ? AND deleted_at IS NULL LIMIT 1;`,
    [dayISO],
  );
  return !!row;
}

/**
 * Total spent per day within a period (only days that have expenses). The
 * trend chart fills in the missing days as 0 via buildDailySeries().
 * @param {number} periodId
 * @returns {Promise<{ day: string, total: number }[]>}
 */
export async function dailyTotalsForPeriod(periodId) {
  return getDb().getAllAsync(
    `SELECT spent_at AS day, COALESCE(SUM(amount_cents), 0) AS total
       FROM expenses
      WHERE period_id = ? AND deleted_at IS NULL
      GROUP BY spent_at
      ORDER BY spent_at ASC;`,
    [periodId],
  );
}

// --- Insights + streak queries ----------------------------------------------

/**
 * Total spent per category between two days (inclusive), biggest first.
 * @param {string} startISO
 * @param {string} endISO
 * @returns {Promise<{ category_id:number|null, name:string|null, total:number }[]>}
 */
export async function sumByCategoryBetween(startISO, endISO) {
  return getDb().getAllAsync(
    `SELECT e.category_id AS category_id, c.name AS name, COALESCE(c.color, '#888888') AS color, COALESCE(SUM(e.amount_cents), 0) AS total
       FROM expenses e
       LEFT JOIN categories c ON c.id = e.category_id
      WHERE e.spent_at BETWEEN ? AND ? AND e.deleted_at IS NULL
      GROUP BY e.category_id
      ORDER BY total DESC;`,
    [startISO, endISO],
  );
}

/**
 * Top categories for a given YYYY-MM month, sorted by total desc.
 * @param {string} ym  e.g. "2026-11"
 * @returns {Promise<{ name:string, color:string, total:number }[]>}
 */
export async function sumByCategoryForMonth(ym) {
  const start = `${ym}-01`;
  const end = `${ym}-31`;
  return getDb().getAllAsync(
    `SELECT COALESCE(c.name, 'Uncategorized') AS name, COALESCE(c.color, '#888888') AS color,
            COALESCE(SUM(e.amount_cents), 0) AS total
       FROM expenses e
       LEFT JOIN categories c ON c.id = e.category_id
      WHERE e.spent_at BETWEEN ? AND ? AND e.deleted_at IS NULL
      GROUP BY e.category_id
      ORDER BY total DESC;`,
    [start, end],
  );
}

/**
 * The single biggest expense between two days (inclusive), or null.
 * @returns {Promise<{ amount_cents:number, note:string|null, spent_at:string, category_name:string|null } | null>}
 */
export async function biggestExpenseBetween(startISO, endISO) {
  const row = await getDb().getFirstAsync(
    `SELECT e.amount_cents, e.note, e.spent_at, c.name AS category_name
       FROM expenses e
       LEFT JOIN categories c ON c.id = e.category_id
      WHERE e.spent_at BETWEEN ? AND ? AND e.deleted_at IS NULL
      ORDER BY e.amount_cents DESC, e.id DESC
      LIMIT 1;`,
    [startISO, endISO],
  );
  return row ?? null;
}

/**
 * The most recent distinct days that have at least one expense, newest first.
 * Feeds the logging streak.
 * @param {number} [limit=400]
 * @returns {Promise<string[]>}
 */
export async function recentExpenseDays(limit = 400) {
  const rows = await getDb().getAllAsync(
    `SELECT DISTINCT spent_at AS day
       FROM expenses
      WHERE deleted_at IS NULL
      ORDER BY spent_at DESC
      LIMIT ?;`,
    [limit],
  );
  return rows.map((r) => r.day);
}
