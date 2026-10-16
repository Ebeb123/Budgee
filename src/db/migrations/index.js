// ---------------------------------------------------------------------------
// MIGRATIONS
// ---------------------------------------------------------------------------
// A "migration" is one numbered, one-time change to the database structure.
// The migration RUNNER (in database.js) keeps track of which version the
// database is on (using SQLite's built-in PRAGMA user_version) and only runs
// migrations that haven't been applied yet.
//
// WHY this matters: it is exactly what lets us ship a schema now and extend it
// later WITHOUT wiping your data. To change the schema in the future, you add a
// NEW migration object with the next version number - you never edit an old one.
//
// Each migration is { version, name, run(db) }. `run` receives the open
// database and does its work; the runner wraps it in a transaction.
// ---------------------------------------------------------------------------

import { DEFAULT_CATEGORIES } from '@/constants/categories';

/** @type {{ version: number, name: string, run: (db: import('expo-sqlite').SQLiteDatabase) => Promise<void> }[]} */
export const MIGRATIONS = [
  {
    version: 1,
    name: 'initial schema',
    async run(db) {
      // execAsync runs several statements at once. We create every table for
      // v1 up front (per the approved schema), including columns we don't use
      // in the Core MVP yet - like expenses.deleted_at, which lets the future
      // "Undo delete" feature work without another migration.
      await db.execAsync(`
        -- One row per budgeting period (a week or a month of allowance).
        CREATE TABLE budget_periods (
          id           INTEGER PRIMARY KEY AUTOINCREMENT,
          period_type  TEXT    NOT NULL CHECK (period_type IN ('weekly','monthly')),
          start_date   TEXT    NOT NULL,               -- ISO 'YYYY-MM-DD'
          end_date     TEXT    NOT NULL,               -- ISO 'YYYY-MM-DD'
          income_cents INTEGER NOT NULL,               -- money stored as whole centavos
          needs_pct    INTEGER NOT NULL DEFAULT 50,
          wants_pct    INTEGER NOT NULL DEFAULT 30,
          savings_pct  INTEGER NOT NULL DEFAULT 20,
          status       TEXT    NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed')),
          created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        -- Sub-categories. Each rolls up into a 'need' or 'want' bucket.
        CREATE TABLE categories (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          name       TEXT    NOT NULL,
          bucket     TEXT    NOT NULL CHECK (bucket IN ('need','want')),
          icon       TEXT,                             -- Ionicons name
          color      TEXT,                             -- optional; NULL = use bucket color
          is_default INTEGER NOT NULL DEFAULT 0,       -- 1 for seeded rows
          sort_order INTEGER NOT NULL DEFAULT 0
        );

        -- Individual expenses. Soft-deleted via deleted_at (NULL = active).
        CREATE TABLE expenses (
          id           INTEGER PRIMARY KEY AUTOINCREMENT,
          period_id    INTEGER NOT NULL REFERENCES budget_periods(id) ON DELETE CASCADE,
          category_id  INTEGER REFERENCES categories(id) ON DELETE SET NULL,
          bucket       TEXT    NOT NULL CHECK (bucket IN ('need','want')),
          amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
          note         TEXT,
          spent_at     TEXT    NOT NULL,               -- 'YYYY-MM-DD'
          created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
          deleted_at   TEXT                            -- NULL = not deleted
        );
        CREATE INDEX idx_expenses_period   ON expenses(period_id);
        CREATE INDEX idx_expenses_spent_at ON expenses(spent_at);

        -- Savings goals (e.g. "Wireless Earbuds", target 3000).
        CREATE TABLE goals (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          name        TEXT    NOT NULL,
          target_cents INTEGER NOT NULL CHECK (target_cents > 0),
          target_date TEXT,                            -- optional 'YYYY-MM-DD'
          is_active   INTEGER NOT NULL DEFAULT 0,       -- 1 = the priority goal
          status      TEXT    NOT NULL DEFAULT 'active' CHECK (status IN ('active','reached','archived')),
          created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        -- Each time savings is applied to a goal we record a contribution.
        -- Goal progress = SUM(amount_cents) - never a single mutable number.
        CREATE TABLE savings_contributions (
          id           INTEGER PRIMARY KEY AUTOINCREMENT,
          goal_id      INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
          period_id    INTEGER REFERENCES budget_periods(id) ON DELETE SET NULL,
          amount_cents INTEGER NOT NULL,
          created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX idx_contrib_goal ON savings_contributions(goal_id);

        -- Simple key/value store for app settings (theme mode, notif time, ...).
        CREATE TABLE settings (
          key   TEXT PRIMARY KEY,
          value TEXT
        );
      `);

      // Seed the default categories. We use a parameterized statement (the "?"
      // placeholders) rather than string concatenation - this is the safe way
      // to insert values and avoids SQL-injection-style bugs, even locally.
      for (const c of DEFAULT_CATEGORIES) {
        await db.runAsync(
          `INSERT INTO categories (name, bucket, icon, color, is_default, sort_order)
           VALUES (?, ?, ?, ?, 1, ?);`,
          [c.name, c.bucket, c.icon, null, c.sortOrder],
        );
      }
    },
  },

  {
    // -----------------------------------------------------------------------
    // v2: income ledger (for the "running total, forever" model)
    // -----------------------------------------------------------------------
    // Instead of overwriting a single income number, every time money comes in
    // (or you adjust your balance) we INSERT a row here. The account's running
    // total is the SUM of these rows. This mirrors how goal progress already
    // works via savings_contributions: an append-only ledger that can't drift
    // and gives you a history of top-ups. `amount_cents` may be negative, which
    // is how a downward balance adjustment is recorded.
    // -----------------------------------------------------------------------
    version: 2,
    name: 'income ledger',
    async run(db) {
      await db.execAsync(`
        CREATE TABLE income_events (
          id           INTEGER PRIMARY KEY AUTOINCREMENT,
          amount_cents INTEGER NOT NULL,               -- may be negative (adjustment)
          occurred_at  TEXT    NOT NULL,               -- 'YYYY-MM-DD'
          note         TEXT,
          created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX idx_income_occurred ON income_events(occurred_at);
      `);

      // Backfill for anyone upgrading with an existing balance: seed one
      // "Starting balance" event equal to their current income so the ledger
      // equals the running total from the very first launch after the update.
      // (Fresh installs have no active period here, so this inserts nothing;
      // onboarding logs the starting balance instead.)
      await db.runAsync(
        `INSERT INTO income_events (amount_cents, occurred_at, note)
           SELECT income_cents, start_date, 'Starting balance'
             FROM budget_periods
            WHERE status = 'active' AND income_cents > 0;`,
      );
    },
  },

  {
    // -----------------------------------------------------------------------
    // v3: category colors + a hide flag (for the colored breakdown)
    // -----------------------------------------------------------------------
    // Every default category gets a fixed, distinct color so the dashboard's
    // Needs/Wants breakdown ring, the category chips, and the expense list all
    // colour-match. We also add an `is_hidden` flag now (defaulting to visible)
    // so the "edit your categories" feature can hide one later without another
    // migration. Colors are stamped by name+bucket, which also upgrades anyone
    // who already had the default categories seeded with no color.
    // -----------------------------------------------------------------------
    version: 3,
    name: 'category colors',
    async run(db) {
      await db.execAsync(
        `ALTER TABLE categories ADD COLUMN is_hidden INTEGER NOT NULL DEFAULT 0;`,
      );

      for (const c of DEFAULT_CATEGORIES) {
        await db.runAsync(
          `UPDATE categories SET color = ?
             WHERE name = ? AND bucket = ? AND is_default = 1;`,
          [c.color, c.name, c.bucket],
        );
      }
    },
  },
];
