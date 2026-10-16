// ---------------------------------------------------------------------------
// BUDGET PROVIDER  (global app state)
// ---------------------------------------------------------------------------
// The single source of truth for "what's my current budget situation right
// now". It loads the ongoing account, how much has been spent per bucket, how
// much has been contributed to goals, and the active goal - then shares them
// through Context so any screen can read them via useBudget() and re-render
// when they change.
//
// Screens NEVER query repositories directly for this shared state - they read
// it here and call refresh() after they change something. That keeps every
// screen showing the same, consistent numbers.
// ---------------------------------------------------------------------------

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { bucketSummary, computeSplit } from '@/services/budget';
import { availableSavingsCents } from '@/services/savings';
import { monthsElapsed, todayISO } from '@/utils/date';
import { getActivePeriod } from '@/repositories/budgetRepo';
import { sumByBucket, sumForDay } from '@/repositories/expenseRepo';
import { getActiveGoal, getGoalSavedCents, totalContributedCents } from '@/repositories/goalRepo';

const BudgetContext = createContext(null);

export function BudgetProvider({ children }) {
  const [loading, setLoading] = useState(true);
  /** @type {[import('@/types').Period | null, Function]} */
  const [period, setPeriod] = useState(null);
  const [spent, setSpent] = useState({ need: 0, want: 0 });
  const [todaySpentCents, setTodaySpentCents] = useState(0);
  /** @type {[import('@/types').Goal | null, Function]} */
  const [activeGoal, setActiveGoal] = useState(null);
  const [activeGoalSavedCents, setActiveGoalSavedCents] = useState(0);
  const [contributedCents, setContributedCents] = useState(0);

  /**
   * Re-read everything from the database. Called on mount and by screens after
   * they add/edit/delete data. Wrapped in try/catch so a read failure leaves
   * the app in a defined (empty) state rather than crashing.
   */
  const refresh = useCallback(async () => {
    try {
      const p = await getActivePeriod();
      if (!p) {
        setPeriod(null);
        setSpent({ need: 0, want: 0 });
        setTodaySpentCents(0);
        setActiveGoal(null);
        setActiveGoalSavedCents(0);
        setContributedCents(0);
        return;
      }
      const [buckets, goal, today, contributed] = await Promise.all([
        sumByBucket(p.id),
        getActiveGoal(),
        sumForDay(p.id, todayISO()),
        totalContributedCents(),
      ]);
      const saved = goal ? await getGoalSavedCents(goal.id) : 0;

      setPeriod(p);
      setSpent(buckets);
      setActiveGoal(goal);
      setActiveGoalSavedCents(saved);
      setContributedCents(contributed);
      setTodaySpentCents(today);
    } catch (err) {
      console.error('[budget] refresh failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Derived numbers computed from the raw state above. useMemo means we only
  // recompute when the inputs actually change, not on every render.
  const derived = useMemo(() => {
    if (!period) return null;
    const split = computeSplit(
      period.income_cents,
      period.needs_pct,
      period.wants_pct,
      period.savings_pct,
    );

    // Average savings set aside per month = savings budget spread over how many
    // months the account has been running. Feeds the goal finish-date forecast.
    const months = monthsElapsed(period.start_date, todayISO());
    const monthlySavingsCents = Math.round(split.savingsCents / months);

    return {
      split,
      needs: bucketSummary(split.needsCents, spent.need),
      wants: bucketSummary(split.wantsCents, spent.want),
      savingsBudgetCents: split.savingsCents,
      // How much of the savings pool is still free to move into goals.
      availableSavingsCents: availableSavingsCents(split.savingsCents, contributedCents),
      contributedCents,
      monthlySavingsCents,
      periodSpentCents: spent.need + spent.want,
    };
  }, [period, spent, contributedCents]);

  const value = useMemo(
    () => ({
      loading,
      period, // the raw ongoing account row, or null before onboarding
      derived, // computed split + per-bucket summaries + savings figures, or null
      todaySpentCents,
      activeGoal,
      activeGoalSavedCents,
      refresh,
    }),
    [loading, period, derived, todaySpentCents, activeGoal, activeGoalSavedCents, refresh],
  );

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
}

export function useBudget() {
  const ctx = useContext(BudgetContext);
  if (!ctx) throw new Error('useBudget() must be used inside a <BudgetProvider>.');
  return ctx;
}
