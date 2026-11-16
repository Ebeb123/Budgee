// ---------------------------------------------------------------------------
// DASHBOARD  (app/(tabs)/index.js)
// ---------------------------------------------------------------------------
// The home screen. It reads everything from the BudgetProvider (no direct DB
// calls except the two small breakdown/trend queries) and lays out: the balance
// card, a breakdown ring with a dropdown, today/all-time totals, the trend
// line, the Needs/Wants/Savings buckets, and the savings-goal summary.
//
// The dropdown above the ring switches what the ring shows:
//   - All   -> Needs / Wants / Savings overview
//   - Needs -> your Needs spending split by category (what you spent most on)
//   - Wants -> your Wants spending split by category
//
// This is a RUNNING TOTAL that never resets - no "days left" here. The trend
// line shows your last 14 days.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import Button from '@/components/Button';
import Card from '@/components/Card';
import Dropdown from '@/components/Dropdown';
import Screen from '@/components/Screen';
import ProgressBar from '@/components/ProgressBar';
import BalanceCard from '@/features/dashboard/BalanceCard';
import BillsDueCard from '@/features/dashboard/BillsDueCard';
import BreakdownRing from '@/features/dashboard/BreakdownRing';
import BucketCard from '@/features/dashboard/BucketCard';
import InsightsCard from '@/features/dashboard/InsightsCard';
import TopCategories from '@/features/dashboard/TopCategories';
import SavingsCard from '@/features/dashboard/SavingsCard';
import TrendChart from '@/features/dashboard/TrendChart';
import { formatCents } from '@/services/money';
import { estimateTimeToGoal } from '@/services/savings';
import { buildDailySeries } from '@/services/history';
import { buildInsights } from '@/services/insights';
import { addDays, currentYM, dayInMonth, monthLabel, shiftYM, todayISO, ymOf } from '@/utils/date';
import {
  biggestExpenseBetween,
  dailyTotalsForPeriod,
  sumByBucketForMonth,
  sumByCategory,
  sumByCategoryBetween,
  sumByCategoryForMonth,
} from '@/repositories/expenseRepo';
import { useBudget } from '@/state/BudgetProvider';
import { useTheme } from '@/theme/ThemeProvider';

const VIEW_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Needs', value: 'need' },
  { label: 'Wants', value: 'want' },
];

export default function DashboardScreen() {
  const { theme, hideAmounts, setHideAmounts } = useTheme();
  const router = useRouter();
  const { period, derived, todaySpentCents, activeGoal, activeGoalSavedCents, refresh, version } = useBudget();
  const periodId = period?.id ?? null;

  const [trend, setTrend] = useState([]);
  const [needCats, setNeedCats] = useState([]);
  const [wantCats, setWantCats] = useState([]);
  const [view, setView] = useState('all'); // which breakdown the ring shows

  // The month shown by the right-hand pie. Defaults to the current month, so
  // when the calendar rolls into a new month the pie starts there automatically.
  // The ‹ › arrows step to other months.
  const [ym, setYm] = useState(currentYM());
  const [monthCats, setMonthCats] = useState([]);
  const [insights, setInsights] = useState([]);

  // 1) Re-read the shared numbers every time the dashboard comes into focus.
  //    (Kept separate from step 2 on purpose: if this effect also depended on
  //    `period`, each refresh would hand back a new period object, re-run the
  //    effect, refresh again... forever.)
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  // 2) Rebuild the 14-day trend, the per-category ring data, the month pie and
  //    the insights whenever the shared numbers change (`version` ticks on every
  //    refresh) or you step to another month.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!periodId) {
        setTrend([]);
        setNeedCats([]);
        setWantCats([]);
        setMonthCats([]);
        setInsights([]);
        return;
      }
      try {
        const end = todayISO();
        const start = addDays(end, -13);
        // Insights compare this month so far with the SAME days of last month.
        const thisYM = ymOf(end);
        const lastYM = shiftYM(thisYM, -1);
        const lastEnd = dayInMonth(lastYM, Number(end.slice(8, 10)));
        const [rows, needRows, wantRows, monthlyCatRows, thisCats, lastCats, biggest] = await Promise.all([
          dailyTotalsForPeriod(periodId),
          sumByCategory(periodId, 'need'),
          sumByCategory(periodId, 'want'),
          sumByCategoryForMonth(ym),
          sumByCategoryBetween(`${thisYM}-01`, end),
          sumByCategoryBetween(`${lastYM}-01`, lastEnd),
          biggestExpenseBetween(`${thisYM}-01`, end),
        ]);
        if (cancelled) return;
        setInsights(buildInsights({ thisMonth: thisCats, lastMonth: lastCats, biggest }));
        const totalsByDay = Object.fromEntries(rows.map((r) => [r.day, r.total]));
        setTrend(buildDailySeries(start, end, totalsByDay));
        setNeedCats(needRows);
        setWantCats(wantRows);
        setMonthCats(monthlyCatRows);
      } catch (err) {
        console.error('[dashboard] data load failed:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [periodId, ym, version]);

  if (!period || !derived) {
    return (
      <Screen title="Dashboard">
        <Card>
          <Text style={[theme.typography.body, { color: theme.colors.textMuted }]}>
            No account yet.
          </Text>
        </Card>
      </Screen>
    );
  }

  const { needs, wants, savingsBudgetCents, periodSpentCents, monthlySavingsCents } = derived;

  const spendableSpent = needs.spentCents + wants.spentCents;

  // ---- Build the ring's segments + center number for the selected view ------
  const pctOf = (spent, budget) => (budget > 0 ? Math.round((spent / budget) * 100) : 0);

  const catSegments = (rows, fallbackColor) =>
    rows.map((r) => ({
      label: r.name ?? 'Uncategorized',
      color: r.color || fallbackColor,
      value: r.total,
    }));

  let ringSegments;
  let ringCenter;
  let ringLabel;
  let ringEmpty;

  if (view === 'need') {
    ringSegments = catSegments(needCats, theme.colors.needs);
    ringCenter = `${pctOf(needs.spentCents, needs.budgetCents)}%`;
    ringLabel = 'of Needs';
    ringEmpty = 'No Needs spending yet';
  } else if (view === 'want') {
    ringSegments = catSegments(wantCats, theme.colors.wants);
    ringCenter = `${pctOf(wants.spentCents, wants.budgetCents)}%`;
    ringLabel = 'of Wants';
    ringEmpty = 'No Wants spending yet';
  } else {
    // "All": Needs / Wants / Savings overview.
    ringSegments = [
      { label: 'Needs', color: theme.colors.needs, value: needs.spentCents },
      { label: 'Wants', color: theme.colors.wants, value: wants.spentCents },
      { label: 'Savings', color: theme.colors.savings, value: savingsBudgetCents },
    ];
    const spendableBudget = needs.budgetCents + wants.budgetCents;
    ringCenter = `${pctOf(spendableSpent, spendableBudget)}%`;
    ringLabel = 'used';
    ringEmpty = 'Nothing yet';
  }

  const accountStartYM = ymOf(period.start_date);
  const canPrev = ym > accountStartYM; // don't go before the account existed
  const canNext = ym < currentYM(); // don't browse into the future

  // Forecast for the active goal (how long until it's reached at this savings rate).
  const goalForecast = activeGoal
    ? estimateTimeToGoal({
        targetCents: activeGoal.target_cents,
        savedCents: activeGoalSavedCents,
        monthlySavingsCents,
        todayISO: todayISO(),
      })
    : undefined;

  return (
    <Screen title="Dashboard">
      {/* Running-total summary line: your split, no countdown */}
      <Text style={[theme.typography.caption, { color: theme.colors.textMuted, marginBottom: theme.spacing.md }]}>
        Running total · {period.needs_pct}% Needs · {period.wants_pct}% Wants · {period.savings_pct}% Savings
      </Text>

      {/* Hero remaining-balance card */}
      <View style={{ marginBottom: theme.spacing.sm }}>
        <BalanceCard
          incomeCents={period.income_cents}
          spentCents={spendableSpent}
          periodType={period.period_type}
          hideAmounts={hideAmounts}
          onToggleHide={() => setHideAmounts(!hideAmounts)}
        />
      </View>

      {/* Add / edit money (running total) */}
      <Button
        title="+ Add / edit money"
        variant="secondary"
        onPress={() => router.push('/budget-edit')}
        style={{ marginBottom: theme.spacing.md }}
      />

      {/* Bills overdue or due within a week (hidden when there are none) */}
      <BillsDueCard version={version} style={{ marginBottom: theme.spacing.md }} />

      {/* Hero: breakdown ring (with dropdown) on the left, monthly pie right */}
      <Card style={{ marginBottom: theme.spacing.md }}>
        <View style={styles.heroRow}>
          {/* Left: dropdown + breakdown ring */}
          <View style={styles.heroCol}>
            <Dropdown value={view} options={VIEW_OPTIONS} onChange={setView} />
            <BreakdownRing
              segments={ringSegments}
              centerValue={ringCenter}
              centerLabel={ringLabel}
              emptyText={ringEmpty}
              size={116}
              strokeWidth={13}
            />
          </View>

          {/* Right: top spending categories this month */}
          <View style={styles.heroCol}>
            <TopCategories
              label={monthLabel(ym)}
              rows={monthCats}
              canPrev={canPrev}
              canNext={canNext}
              onPrev={() => setYm(shiftYM(ym, -1))}
              onNext={() => setYm(shiftYM(ym, 1))}
            />
          </View>
        </View>
      </Card>

      {/* Today / All-time totals */}
      <View style={{ flexDirection: 'row', gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
        <Card style={{ flex: 1, gap: 4 }}>
          <Text style={[theme.typography.label, { color: theme.colors.textMuted }]}>TODAY</Text>
          <Text style={[theme.typography.h2, { color: theme.colors.text }]}>{formatCents(todaySpentCents)}</Text>
        </Card>
        <Card style={{ flex: 1, gap: 4 }}>
          <Text style={[theme.typography.label, { color: theme.colors.textMuted }]}>SPENT SO FAR</Text>
          <Text style={[theme.typography.h2, { color: theme.colors.text }]}>{formatCents(periodSpentCents)}</Text>
        </Card>
      </View>

      {/* Plain-language insights about this month */}
      <InsightsCard insights={insights} style={{ marginBottom: theme.spacing.md }} />

      {/* Spending trend line (last 14 days) */}
      <Card style={{ marginBottom: theme.spacing.md }}>
        <TrendChart data={trend} />
      </Card>

      {/* Buckets */}
      <View style={{ gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
        <BucketCard label="Needs" color={theme.colors.needs} summary={needs} />
        <BucketCard label="Wants" color={theme.colors.wants} summary={wants} />

        {/* Savings: how much of your running total is set aside (your 20%).
            Not "spent" - it's money to save, so the bar is full. */}
        <Card style={{ gap: 10 }}>
          <View style={styles.rowBetween}>
            <View style={styles.rowCenter}>
              <View style={[styles.bucketDot, { backgroundColor: theme.colors.savings }]} />
              <Text style={[theme.typography.title, { color: theme.colors.text }]}>Savings</Text>
            </View>
            <Text style={[theme.typography.label, { color: theme.colors.savings }]}>
              {formatCents(savingsBudgetCents)} to save
            </Text>
          </View>
          <ProgressBar value={1} color={theme.colors.savings} />
          <View style={styles.rowBetween}>
            <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
              Set aside from your total
            </Text>
            <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
              {period.savings_pct}% of your money
            </Text>
          </View>
        </Card>
      </View>

      {/* Savings goal */}
      <SavingsCard
        savingsBudgetCents={savingsBudgetCents}
        availableSavingsCents={derived.availableSavingsCents}
        activeGoal={activeGoal}
        savedCents={activeGoalSavedCents}
        forecast={goalForecast}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  bucketDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  heroRow: { flexDirection: 'row', gap: 12 },
  heroCol: { flex: 1, alignItems: 'center', gap: 12 },
});
