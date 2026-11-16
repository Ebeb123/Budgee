// ---------------------------------------------------------------------------
// CATEGORY REPOSITORY
// ---------------------------------------------------------------------------
// All SQL for the categories table. `SELECT *` includes the `color` column
// added in migration v3, so callers get each category's fixed color for the
// chips, the expense list, and the breakdown ring.
//
// Categories are never deleted, only HIDDEN (is_hidden = 1): a hidden category
// stops showing in the picker while its past expenses keep their name, icon
// and colour in History and the charts.
// ---------------------------------------------------------------------------

import { getDb } from '@/db/database';

/**
 * All visible categories, ordered by bucket then their display order.
 * @returns {Promise<import('@/types').Category[]>}
 */
export async function listCategories() {
  return getDb().getAllAsync(
    `SELECT * FROM categories
      WHERE is_hidden = 0
      ORDER BY bucket ASC, sort_order ASC, name ASC;`,
  );
}

/**
 * Every category, hidden ones included (for the Manage categories screen).
 * @returns {Promise<import('@/types').Category[]>}
 */
export async function listAllCategories() {
  return getDb().getAllAsync(
    `SELECT * FROM categories ORDER BY bucket ASC, is_hidden ASC, sort_order ASC, name ASC;`,
  );
}

/** @returns {Promise<import('@/types').Category | null>} */
export async function getCategory(id) {
  const row = await getDb().getFirstAsync('SELECT * FROM categories WHERE id = ?;', [id]);
  return row ?? null;
}

/**
 * @param {{ name:string, bucket:'need'|'want', icon:string, color:string }} c
 * @returns {Promise<number>} new id
 */
export async function createCategory({ name, bucket, icon, color }) {
  const db = getDb();
  const row = await db.getFirstAsync(
    'SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM categories WHERE bucket = ?;',
    [bucket],
  );
  const res = await db.runAsync(
    `INSERT INTO categories (name, bucket, icon, color, is_default, sort_order) VALUES (?, ?, ?, ?, 0, ?);`,
    [name, bucket, icon, color, row?.next ?? 1],
  );
  return res.lastInsertRowId;
}

/**
 * Edit a category. Changing the bucket only affects NEW expenses - each past
 * expense keeps the bucket it was logged under, so old totals never shift.
 * @param {number} id
 * @param {{ name?:string, bucket?:'need'|'want', icon?:string, color?:string }} fields
 */
export async function updateCategory(id, fields) {
  const allowed = ['name', 'bucket', 'icon', 'color'];
  const sets = [];
  const values = [];
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      sets.push(`${key} = ?`);
      values.push(fields[key]);
    }
  }
  if (sets.length === 0) return;
  values.push(id);
  await getDb().runAsync(`UPDATE categories SET ${sets.join(', ')} WHERE id = ?;`, values);
}

/** Hide or show a category in the picker. */
export async function setCategoryHidden(id, hidden) {
  await getDb().runAsync('UPDATE categories SET is_hidden = ? WHERE id = ?;', [hidden ? 1 : 0, id]);
}
