// ---------------------------------------------------------------------------
// SAMPLE DATA  (browser only, opt-in)
// ---------------------------------------------------------------------------
// Nothing loads this automatically. The first onboarding screen in the browser
// build shows a "Try with sample data" button, so portfolio visitors can see a
// working dashboard in one tap, while real use starts clean.
//
// It fills an empty database with two months of made-up student spending,
// using the app's own repositories/services, so the data is exactly what a
// real user would create. Nothing here is a real person's data.
// ---------------------------------------------------------------------------

import { getActivePeriod } from '@/repositories/budgetRepo';
import { listCategories } from '@/repositories/categoryRepo';
import { addExpense } from '@/repositories/expenseRepo';
import { addContribution, createGoal } from '@/repositories/goalRepo';
import { addIncomeEvent } from '@/repositories/incomeRepo';
import { createBill, listBillers } from '@/repositories/billRepo';
import { createQuickAdd } from '@/repositories/quickAddRepo';
import { createRecurring } from '@/repositories/recurringRepo';
import { setSetting } from '@/repositories/settingsRepo';
import { openAccount } from '@/services/periodService';
import { firstDueDate } from '@/services/recurring';
import { addDays, addMonths, todayISO } from '@/utils/date';

// [category name, note, min ₱, max ₱, how often]
const SPENDING = [
  ['Food', 'Canteen lunch', 60, 110, 8],
  ['Food', 'Groceries', 250, 500, 2],
  ['Transport', 'Jeepney fare', 13, 30, 8],
  ['Transport', 'Grab ride', 120, 220, 1],
  ['School', 'Printing & photocopy', 20, 90, 3],
  ['School', 'Project materials', 150, 400, 1],
  ['Bills', 'Mobile load', 99, 199, 2],
  ['Health', 'Vitamins', 120, 250, 1],
  ['Dining Out', 'Milk tea', 95, 150, 3],
  ['Dining Out', 'Weekend dinner', 250, 400, 1],
  ['Entertainment', 'Movie ticket', 280, 350, 1],
  ['Shopping', 'New shirt', 300, 650, 1],
  ['Subscriptions', 'Music streaming', 149, 149, 1],
  ['Other', 'Gift for a friend', 200, 400, 1],
];

/** Small seeded random generator so every visitor gets the same sample data. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Loads sample data only when no account exists yet. Returns true if it loaded. */
export async function loadSampleData() {
  if (await getActivePeriod()) return false;

  const R = rng(2026);
  const today = todayISO();
  const start = addMonths(today, -2);

  const { periodId } = await openAccount({
    periodType: 'monthly',
    startDate: start,
    incomeCents: 8000_00,
    needsPct: 50,
    wantsPct: 30,
    savingsPct: 20,
  });

  await addIncomeEvent({ amountCents: 6000_00, occurredAt: addMonths(start, 1), note: 'Monthly allowance' });
  await addIncomeEvent({ amountCents: 1500_00, occurredAt: addDays(today, -9), note: 'Part-time tutoring' });

  const earbuds = await createGoal({ name: 'Wireless Earbuds', targetCents: 3500_00, targetDate: addMonths(today, 2), isActive: true });
  const laptop = await createGoal({ name: 'Laptop Fund', targetCents: 25000_00, targetDate: addMonths(today, 10) });
  await addContribution({ goalId: earbuds, periodId, amountCents: 1200_00 });
  await addContribution({ goalId: earbuds, periodId, amountCents: 800_00 });
  await addContribution({ goalId: laptop, periodId, amountCents: 1500_00 });

  const categories = await listCategories();
  const byName = Object.fromEntries(categories.map((c) => [c.name, c]));

  const spanDays = Math.max(1, Math.round((Date.parse(today) - Date.parse(start)) / 86400000));
  const rows = [];
  for (const [catName, note, min, max, perMonth] of SPENDING) {
    const cat = byName[catName];
    if (!cat) continue;
    const count = Math.max(1, Math.round((perMonth * spanDays) / 30));
    for (let i = 0; i < count; i++) {
      const pesos = min === max ? min : min + Math.round(R() * (max - min));
      rows.push({ cat, note, cents: pesos * 100, day: addDays(start, Math.floor(R() * (spanDays + 1))) });
    }
  }
  // A couple of entries today so the "today" totals aren't empty.
  if (byName.Food) rows.push({ cat: byName.Food, note: 'Canteen lunch', cents: 85_00, day: today });
  if (byName.Transport) rows.push({ cat: byName.Transport, note: 'Jeepney fare', cents: 26_00, day: today });

  rows.sort((a, b) => a.day.localeCompare(b.day));
  for (const r of rows) {
    await addExpense({
      periodId,
      categoryId: r.cat.id,
      bucket: r.cat.bucket,
      amountCents: r.cents,
      note: r.note,
      spentAt: r.day > today ? today : r.day,
    });
  }

  // A few one-tap favourites for the Log screen.
  const quick = [
    ['Food', 'Canteen lunch', 85_00],
    ['Transport', 'Jeepney fare', 13_00],
    ['Dining Out', 'Milk tea', 120_00],
  ];
  for (const [catName, note, cents] of quick) {
    const cat = byName[catName];
    if (cat) await createQuickAdd({ categoryId: cat.id, bucket: cat.bucket, amountCents: cents, note });
  }

  // Two recurring expenses, first due AFTER today so nothing doubles up with
  // the sample history above.
  const tomorrow = addDays(today, 1);
  const recurring = [
    ['Subscriptions', 'Music streaming', 149_00, 'monthly', 5],
    ['Bills', 'Mobile load', 199_00, 'monthly', 20],
  ];
  for (const [catName, note, cents, frequency, day] of recurring) {
    const cat = byName[catName];
    if (!cat) continue;
    await createRecurring({
      categoryId: cat.id,
      bucket: cat.bucket,
      amountCents: cents,
      note,
      frequency,
      day,
      nextDue: firstDueDate(frequency, day, tomorrow),
    });
  }

  // Bills: one due in a few days (shows on the dashboard), the others later.
  // Account numbers are made up.
  const billers = Object.fromEntries((await listBillers()).map((b) => [b.name, b]));
  const sampleBills = [
    ['VECO', 'Home', '0000-1234-5678', 1850_00, 3],
    ['PLDT', 'Fibr', '0298765432', 1699_00, 12],
    ['MCWD', null, '12-345-678', 420_00, 20],
  ];
  for (const [billerName, nickname, accountNumber, amountCents, inDays] of sampleBills) {
    const biller = billers[billerName];
    if (!biller) continue;
    const dueDate = addDays(today, inDays);
    const dueDay = Number(dueDate.slice(8, 10));
    await createBill({ billerId: biller.id, nickname, accountNumber, amountCents, dueDay, dueDate });
  }

  await setSetting('onboarded', '1');
  return true;
}
