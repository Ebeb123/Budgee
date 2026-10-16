// ---------------------------------------------------------------------------
// DATABASE: connection + migration runner
// ---------------------------------------------------------------------------
// This is the ONLY file that opens the SQLite connection. Everything else in
// the app talks to the database through the repositories, which call getDb().
//
// We keep a single shared connection ("singleton") in `dbInstance` so we don't
// open the database repeatedly. initDatabase() must be awaited once at startup
// (the root layout does this) before any repository is used.
// ---------------------------------------------------------------------------

import * as SQLite from './sqlite';

import { MIGRATIONS } from './migrations';

export const DB_NAME = 'budgetsplit.db';

/** @type {import('expo-sqlite').SQLiteDatabase | null} */
let dbInstance = null;

/**
 * Open the database (once), turn on the settings we need, and bring the schema
 * up to date by running any pending migrations. Safe to call multiple times -
 * it returns the already-open connection after the first call.
 *
 * @returns {Promise<import('expo-sqlite').SQLiteDatabase>}
 */
export async function initDatabase() {
  if (dbInstance) return dbInstance;

  const db = await SQLite.openDatabaseAsync(DB_NAME);

  // WAL mode = better read/write concurrency and durability.
  // foreign_keys = ON is important: SQLite does NOT enforce foreign keys by
  // default, so without this our ON DELETE CASCADE rules would be ignored.
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  await runMigrations(db);

  dbInstance = db;
  return db;
}

/**
 * Return the shared connection. Throws a clear error if the database hasn't
 * been initialized yet - that almost always means a repository was called
 * before initDatabase() finished at startup.
 *
 * @returns {import('expo-sqlite').SQLiteDatabase}
 */
export function getDb() {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDatabase() first (see app/_layout.js).');
  }
  return dbInstance;
}

/**
 * Apply any migrations whose version is newer than the database's current
 * user_version. Each migration runs inside a transaction together with the
 * version bump, so a failed migration rolls back cleanly and will be retried
 * next launch rather than leaving the schema half-applied.
 *
 * @param {import('expo-sqlite').SQLiteDatabase} db
 */
async function runMigrations(db) {
  const row = await db.getFirstAsync('PRAGMA user_version;');
  const current = row?.user_version ?? 0;

  const pending = MIGRATIONS.filter((m) => m.version > current).sort(
    (a, b) => a.version - b.version,
  );

  for (const migration of pending) {
    await db.withTransactionAsync(async () => {
      await migration.run(db);
      // PRAGMA cannot take a bound "?" parameter, so we inline the number.
      // This is safe: migration.version is a hardcoded integer in our source.
      await db.execAsync(`PRAGMA user_version = ${migration.version};`);
    });
  }
}