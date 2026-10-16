// ---------------------------------------------------------------------------
// CATEGORY REPOSITORY
// ---------------------------------------------------------------------------
// Read access to the categories table. `SELECT *` includes the `color` column
// added in migration v3, so callers get each category's fixed color for the
// chips, the expense list, and the breakdown ring. Hidden categories
// (is_hidden = 1) are filtered out so a category you've retired stops showing
// in the picker while its past expenses stay intact.
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
