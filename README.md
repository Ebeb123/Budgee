# Budgee — a local-only 50/30/20 expense tracker

A personal, offline expense tracker built with React Native + Expo. Your money is
split into **Needs (50%)**, **Wants (30%)** and **Savings (20%)**, and every
expense is logged against one of them. All data stays on your device in SQLite:
no backend, no login, no internet needed.

The UI uses a frosted-glass look: a deep navy background with soft lime, blue and
coral glows (the three bucket colours), see-through cards and a floating, blurred
tab bar. It comes in dark and light themes and follows your phone's setting.

## Features

- **Dashboard**: remaining balance, a Needs/Wants breakdown ring, a month-by-month pie, a 14-day trend, bucket progress, your savings goal and plain-language **insights** ("Food is up 24% vs this time last month").
- **Fast logging**: one-tap **quick-add** favourites, an **Undo** after every log or delete, a **logging streak**, and haptic feedback on phones.
- **Bills**: VECO, PLDT and MCWD come built in, and a searchable list of about 35 Philippine billers (Meralco, Globe, Converge, BDO, SSS, Pag-IBIG, PhilHealth, Sun Life…) adds any of them with its logo in one tap. Typing a known name picks up its logo automatically; anything else can use a logo picked from your photos. Each bill keeps its account number (tap to copy), an optional amount and a monthly due date. Your phone reminds you **1 week before** and on the due date, bills due within a week show on the dashboard, and **Mark as paid** moves the bill to next month and can log it as an expense.
- **Recurring expenses**: rent, bills and subscriptions log themselves on their due date, weekly or monthly. Missed days are caught up, and they can be paused.
- **History**: search by note, category or amount, and filter by Needs/Wants and time range.
- **Categories**: add, rename, recolour, change icon, or hide them.
- **Savings goals**: set a priority goal, move savings into it and see a finish-date forecast.
- **Hide amounts**: the eye button on the dashboard turns every amount into `₱••••`.
- **Daily reminder** (phones only).

## Try it in the browser

The app also runs in the browser, using the same SQLite schema through
[sql.js](https://sql.js.org) (SQLite compiled to WebAssembly, served from `public/`).
On phones it uses `expo-sqlite`.

- **Live version:** _add your Vercel link here_
- On the first screen in the browser, **Try with sample data** fills the app with two months of made-up spending so you can explore every screen. Phones never see that button.
- Browser data is saved only in that browser. **Settings → Erase data in this browser** starts over.

```bash
npm install
npx expo start --web           # run locally
npx expo export -p web         # production build -> dist/ (what Vercel runs, see vercel.json)
```

## Run it on your phone

Requirements: [Node.js](https://nodejs.org/) 22.13+ (Expo SDK 58), the **Expo Go** app, and a phone
on the same Wi-Fi as your computer.

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go. Everything works there, including the bill and
daily reminders (they are local notifications, which Expo Go supports).

## Project structure

```
app/                   Screens + navigation (Expo Router)
  _layout.js           Startup: DB init, providers, navigation, onboarding gate
  (tabs)/              Floating tab bar: Dashboard, Log, Goals, Settings
  budget-edit.js       "Edit money" glass sheet
  allocate.js          "Add to goal" glass sheet
  history.js           Search + filters
  categories.js        Manage categories (+ category-edit.js)
  recurring.js         Recurring expenses (+ recurring-edit.js)
  bills.js             Bills (+ bill-edit.js, billers.js, biller-edit.js)
src/
  components/          Reusable UI: Screen, Card, Sheet, Toast, GlassBackground, GlassProvider…
  theme/               Design tokens (colours, glass, spacing, type) + ThemeProvider
  db/                  SQLite connection, web adapter, versioned migrations
  repositories/        All SQL lives here (one file per table)
  services/            Pure logic: money, budget split, recurring schedules, insights, streak
  state/               BudgetProvider (shared budget numbers)
  features/            Screen-specific pieces (dashboard charts, expense form, onboarding…)
```

### How the glass works

- **Cards** use "fake" glass: a see-through fill, a thin bright edge and a brighter top edge over the background glows. Real blur on every card in a scrolling list makes Android stutter, and since the background doesn't move behind them it would look almost the same.
- **Real blur** (`expo-blur`) is used only where content moves behind the glass: the floating tab bar, the sheets and the dropdown menu. iOS and the browser blur natively. Android can only blur a `BlurTargetView`, so every `Screen` registers itself as the blur target while it is focused (`GlassProvider`). On Android 11 and older it falls back to a tinted glass layer.

## Money and data rules

- Money is always stored as whole **centavos** (integers), never decimals.
- The account is a **running total**: income is an append-only ledger (`income_events`), and so is goal progress (`savings_contributions`).
- Deleting an expense is a **soft delete**, which is what makes Undo possible.
- Biller logos (in `assets/billers/`) belong to their companies and are used here only to recognise each bill.
- Schema changes are **numbered migrations** (`src/db/migrations`), so updates never wipe your data.
