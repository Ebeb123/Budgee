// ---------------------------------------------------------------------------
// GOAL REPOSITORY
// ---------------------------------------------------------------------------
// All SQL for the goals and savings_contributions tables.
//
// KEY IDEA: a goal's "saved" amount is never stored as a single number that we
// mutate. Instead every time savings is applied we INSERT a contribution row,
// and the saved amount is SUM(amount_cents) of those rows. This gives an
// audit trail (you can see each top-up) and makes the number impossible to
// drift out of sync.
//
// Only ONE goal is the active/priority goal at a time.
// ---------------------------------------------------------------------------

import { getDb } from '@/db/database';

/**
 * Create a goal. If isActive, it becomes THE active goal (others are cleared).
 * @param {object} g
 * @param {string} g.name
 * @param {number} g.targetCents
 * @param {string|null} [g.targetDate]
 * @param {boolean} [g.isActive=false]
 * @returns {Promise<number>} new goal id
 */
export async function createGoal({ name, targetCents, targetDate = null, isActive = false }) {
  const db = getDb();
  let newId = 0;
  await db.withTransactionAsync(async () => {
    if (isActive) {
      await db.runAsync('UPDATE goals SET is_active = 0;');
    }
    const res = await db.runAsync(
      `INSERT INTO goals (name, target_cents, target_date, is_active)
       VALUES (?, ?, ?, ?);`,
      [name, targetCents, targetDate, isActive ? 1 : 0],
    );
    newId = res.lastInsertRowId;
  });
  return newId;
}

/** Make one goal the active/priority goal, clearing the flag on all others. */
export async function setActiveGoal(id) {
  const db = getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE goals SET is_active = 0;');
    await db.runAsync('UPDATE goals SET is_active = 1 WHERE id = ?;', [id]);
  });
}

/**
 * The active goal, or null. Only returns one that is still 'active' status.
 * @returns {Promise<import('@/types').Goal | null>}
 */
export async function getActiveGoal() {
  const row = await getDb().getFirstAsync(
    `SELECT * FROM goals WHERE is_active = 1 AND status = 'active' ORDER BY id DESC LIMIT 1;`,
  );
  return row ?? null;
}

/**
 * @param {number} id
 * @returns {Promise<import('@/types').Goal | null>}
 */
export async function getGoalById(id) {
  const row = await getDb().getFirstAsync('SELECT * FROM goals WHERE id = ?;', [id]);
  return row ?? null;
}

/** Total saved toward a goal (sum of its contributions), in centavos. */
export async function getGoalSavedCents(goalId) {
  const row = await getDb().getFirstAsync(
    `SELECT COALESCE(SUM(amount_cents), 0) AS total
       FROM savings_contributions WHERE goal_id = ?;`,
    [goalId],
  );
  return row?.total ?? 0;
}

/**
 * How many savings contributions exist for a period (across all goals). Used to
 * decide whether this period's savings has already been applied somewhere.
 * @param {number} periodId
 * @returns {Promise<number>}
 */
export async function countContributionsForPeriod(periodId) {
  const row = await getDb().getFirstAsync(
    `SELECT COUNT(*) AS n FROM savings_contributions WHERE period_id = ?;`,
    [periodId],
  );
  return row?.n ?? 0;
}

/**
 * Total savings contributed in one calendar month (across all goals). The month
 * is taken from created_at ('YYYY-MM-DD HH:MM:SS' -> first 7 chars). Used by the
 * dashboard's monthly pie to show how much you saved that month.
 *
 * @param {string} ym  'YYYY-MM'
 * @returns {Promise<number>} centavos
 */
export async function sumContributionsForMonth(ym) {
  const row = await getDb().getFirstAsync(
    `SELECT COALESCE(SUM(amount_cents), 0) AS total
       FROM savings_contributions
      WHERE substr(created_at, 1, 7) = ?;`,
    [ym],
  );
  return row?.total ?? 0;
}

/**
 * Record a savings contribution to a goal. This is how the automatic 20% gets
 * applied (called when a new period's balance is added, in Step 3/6).
 * @param {object} c
 * @param {number} c.goalId
 * @param {number|null} c.periodId
 * @param {number} c.amountCents
 * @returns {Promise<number>} new contribution id
 */
export async function addContribution({ goalId, periodId, amountCents }) {
  const res = await getDb().runAsync(
    `INSERT INTO savings_contributions (goal_id, period_id, amount_cents)
     VALUES (?, ?, ?);`,
    [goalId, periodId ?? null, amountCents],
  );
  return res.lastInsertRowId;
}

/**
 * Total saved across ALL goals (the sum of every contribution ever made).
 * Savings is one shared pool, so "how much of my savings is already committed
 * to goals" is this number - which the dashboard subtracts from the savings
 * budget to get how much is still AVAILABLE to allocate.
 *
 * @returns {Promise<number>} centavos
 */
export async function totalContributedCents() {
  const row = await getDb().getFirstAsync(
    `SELECT COALESCE(SUM(amount_cents), 0) AS total FROM savings_contributions;`,
  );
  return row?.total ?? 0;
}

/**
 * All non-archived goals, each with a computed saved_cents column, active goal
 * first. Uses a correlated subquery so we get the running total per goal in one
 * round-trip. Ready for the goals screen + progress bars.
 *
 * @returns {Promise<import('@/types').Goal[]>}
 */
export async function listGoalsWithProgress() {
  return getDb().getAllAsync(
    `SELECT g.*,
            COALESCE(
              (SELECT SUM(sc.amount_cents)
                 FROM savings_contributions sc
                WHERE sc.goal_id = g.id),
              0
            ) AS saved_cents
       FROM goals g
      WHERE g.status != 'archived'
      ORDER BY g.is_active DESC, g.id DESC;`,
  );
}

/**
 * Edit a goal's basic fields. Only provided fields change.
 * @param {number} id
 * @param {{ name?: string, targetCents?: number, targetDate?: string|null }} fields
 */
export async function updateGoal(id, fields) {
  const map = { name: 'name', targetCents: 'target_cents', targetDate: 'target_date' };
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
  await getDb().runAsync(`UPDATE goals SET ${sets.join(', ')} WHERE id = ?;`, values);
}

/** Mark a goal as reached (kept in the list, shown as complete). */
export async function markGoalReached(id) {
  await getDb().runAsync(`UPDATE goals SET status = 'reached' WHERE id = ?;`, [id]);
}

/** Archive a goal (hidden from the main list but not destroyed). */
export async function archiveGoal(id) {
  await getDb().runAsync(`UPDATE goals SET status = 'archived', is_active = 0 WHERE id = ?;`, [id]);
}
