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

  {
    // -----------------------------------------------------------------------
    // v4: recurring expenses + quick-add favourites
    // -----------------------------------------------------------------------
    // recurring_expenses: rent, bills, subscriptions. Each row knows when it is
    //   next due; on refresh the app logs every due one as a normal expense and
    //   moves next_due forward (see services/recurringService.js).
    // quick_adds: one-tap favourites on the Log screen ("Lunch ₱85").
    // expenses.recurring_id: marks expenses that were logged automatically, so
    //   History can show a small "repeat" icon next to them.
    // -----------------------------------------------------------------------
    version: 4,
    name: 'recurring expenses + quick adds',
    async run(db) {
      await db.execAsync(`
        CREATE TABLE recurring_expenses (
          id           INTEGER PRIMARY KEY AUTOINCREMENT,
          category_id  INTEGER REFERENCES categories(id) ON DELETE SET NULL,
          bucket       TEXT    NOT NULL CHECK (bucket IN ('need','want')),
          amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
          note         TEXT,
          frequency    TEXT    NOT NULL CHECK (frequency IN ('weekly','monthly')),
          day          INTEGER NOT NULL,               -- weekly: 0-6 (Sun-Sat); monthly: 1-31
          next_due     TEXT    NOT NULL,               -- 'YYYY-MM-DD'
          is_active    INTEGER NOT NULL DEFAULT 1,     -- 0 = paused
          created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE quick_adds (
          id           INTEGER PRIMARY KEY AUTOINCREMENT,
          category_id  INTEGER REFERENCES categories(id) ON DELETE CASCADE,
          bucket       TEXT    NOT NULL CHECK (bucket IN ('need','want')),
          amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
          note         TEXT,
          sort_order   INTEGER NOT NULL DEFAULT 0,
          created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        ALTER TABLE expenses ADD COLUMN recurring_id INTEGER;
      `);
    },
  },

  {
    // -----------------------------------------------------------------------
    // v5: bills + billers (due-date reminders)
    // -----------------------------------------------------------------------
    // billers: who you pay (VECO, PLDT, MCWD come built in; you can add more).
    //   logo_key -> one of the logos bundled in assets/billers (built-ins)
    //   logo_uri -> a picture you picked yourself, stored as a data: URI
    //   Neither -> the app draws a coloured initial instead.
    // bills: one account with a biller. Bills repeat monthly on due_day; due_date
    //   is the NEXT unpaid due date and moves forward a month when you mark it
    //   paid. amount_cents is optional because bill amounts change every month.
    // -----------------------------------------------------------------------
    version: 5,
    name: 'bills + billers',
    async run(db) {
      await db.execAsync(`
        CREATE TABLE billers (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          name       TEXT    NOT NULL,
          color      TEXT    NOT NULL,
          logo_key   TEXT,
          logo_uri   TEXT,
          is_default INTEGER NOT NULL DEFAULT 0,
          created_at TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE bills (
          id             INTEGER PRIMARY KEY AUTOINCREMENT,
          biller_id      INTEGER NOT NULL REFERENCES billers(id) ON DELETE CASCADE,
          nickname       TEXT,                         -- e.g. "Home", "Boarding house"
          account_number TEXT,
          amount_cents   INTEGER,                      -- optional
          due_day        INTEGER NOT NULL,             -- 1-31
          due_date       TEXT    NOT NULL,             -- next unpaid due date 'YYYY-MM-DD'
          last_paid_at   TEXT,
          created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX idx_bills_due ON bills(due_date);

        INSERT INTO billers (name, color, logo_key, is_default) VALUES
          ('VECO',  '#1E3A8A', 'veco', 1),
          ('PLDT',  '#D7182A', 'pldt', 1),
          ('MCWD',  '#1D7FD8', 'mcwd', 1);
      `);
    },
  },
];
