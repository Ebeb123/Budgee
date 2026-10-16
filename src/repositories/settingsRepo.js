// ---------------------------------------------------------------------------
// SETTINGS REPOSITORY
// ---------------------------------------------------------------------------
// A repository is the ONLY place SQL for a given table lives. This one wraps the
// simple key/value `settings` table. Storing app preferences as key/value rows
// (rather than a rigid one-column-per-setting table) means we can add new
// settings later without a schema migration.
//
// All values are stored as TEXT. Callers that need a number/boolean convert it
// themselves (we keep the repo dumb and predictable).
// ---------------------------------------------------------------------------

import { getDb } from '@/db/database';

/**
 * Read a single setting value.
 * @param {string} key
 * @returns {Promise<string | null>} the stored value, or null if not set
 */
export async function getSetting(key) {
  const row = await getDb().getFirstAsync('SELECT value FROM settings WHERE key = ?;', [key]);
  return row ? row.value : null;
}

/**
 * Create or update a setting (an "upsert"). ON CONFLICT updates the existing
 * row instead of erroring, so callers never have to check if it exists first.
 * @param {string} key
 * @param {string} value
 */
export async function setSetting(key, value) {
  await getDb().runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
    [key, value],
  );
}

/**
 * Read several settings at once, returned as a plain object { key: value }.
 * Handy for loading a screen's worth of settings in one query.
 * @param {string[]} keys
 * @returns {Promise<Record<string, string>>}
 */
export async function getSettings(keys) {
  if (keys.length === 0) return {};
  const placeholders = keys.map(() => '?').join(', ');
  const rows = await getDb().getAllAsync(
    `SELECT key, value FROM settings WHERE key IN (${placeholders});`,
    keys,
  );
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}