// ---------------------------------------------------------------------------
// QUICK-ADD REPOSITORY
// ---------------------------------------------------------------------------
// All SQL for the quick_adds table (migration v4): one-tap favourites shown on
// the Log screen. Favourites whose category is hidden are left out.
// ---------------------------------------------------------------------------

import { getDb } from '@/db/database';

/**
 * @returns {Promise<{ id:number, category_id:number, bucket:'need'|'want', amount_cents:number,
 *   note:string|null, category_name:string|null, category_icon:string|null, category_color:string|null }[]>}
 */
export async function listQuickAdds() {
  return getDb().getAllAsync(
    `SELECT q.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color
       FROM quick_adds q
       JOIN categories c ON c.id = q.category_id
      WHERE c.is_hidden = 0
      ORDER BY q.sort_order ASC, q.id ASC;`,
  );
}

/**
 * Save a favourite. Duplicates (same category, amount and note) are ignored.
 * @param {{ categoryId:number, bucket:'need'|'want', amountCents:number, note:string|null }} q
 */
export async function createQuickAdd({ categoryId, bucket, amountCents, note }) {
  const db = getDb();
  const existing = await db.getFirstAsync(
    `SELECT id FROM quick_adds WHERE category_id = ? AND amount_cents = ? AND IFNULL(note, '') = IFNULL(?, '');`,
    [categoryId, amountCents, note ?? null],
  );
  if (existing) return existing.id;
  const row = await db.getFirstAsync('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM quick_adds;');
  const res = await db.runAsync(
    `INSERT INTO quick_adds (category_id, bucket, amount_cents, note, sort_order) VALUES (?, ?, ?, ?, ?);`,
    [categoryId, bucket, amountCents, note ?? null, row?.next ?? 1],
  );
  return res.lastInsertRowId;
}

export async function deleteQuickAdd(id) {
  await getDb().runAsync('DELETE FROM quick_adds WHERE id = ?;', [id]);
}
