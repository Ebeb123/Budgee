# Budget Split — a local-only 50/30/20 expense tracker

A personal, offline expense tracker (React Native + Expo). All data stays on your
device via SQLite. No backend, no login, no internet permission needed.

## Web demo (portfolio)

This app also runs in the browser, so people can try it without installing anything.

- **Live demo:** _add your Vercel link here_
- In the browser, the app uses the same SQLite schema through [sql.js](https://sql.js.org) (SQLite compiled to WebAssembly, served from `public/`). On phones it still uses `expo-sqlite`, so the mobile app is unchanged.
- Visitors start with **fictional sample data**. Their changes are saved only in their own browser, and the **Reset** button in the demo bar restores the sample data.

Run the web version locally:

```bash
npm install
npx expo start --web
```

Build it the way Vercel does:

```bash
npx expo export -p web   # output goes to dist/
```

The `vercel.json` in this folder tells Vercel to run that command and serve `dist/`.

## Requirements

- [Node.js](https://nodejs.org/) 18 or newer
- The **Expo Go** app on your Android phone (from the Play Store)
- Your phone and computer on the **same Wi-Fi network**

## Run it

```bash
npm install
npx expo start
```

Then scan the QR code with **Expo Go** on your Android phone.

> If Expo Go says the SDK version doesn't match, run:
> `npx expo install expo@latest && npx expo install --fix`
> then `npx expo start` again.

## Project structure

```
app/                 Screens + navigation (Expo Router)
  _layout.js         App startup: DB init, theme, navigation shell
  (tabs)/            Bottom tab bar: Dashboard, Log, Goals, Settings
src/
  theme/             Design tokens (colors, spacing, type) + ThemeProvider
  db/                SQLite connection + versioned migrations
  repositories/      All SQL lives here (one file per table)
  components/        Reusable UI (Screen, Card, ...)
  constants/         Seed data (default categories)
```

## Build progress

- [x] **Step 1** — Scaffold, theme system, database + migrations
- [ ] Step 2 — Data model (repositories, services, money math)
- [ ] Step 3 — Onboarding + budget setup
- [ ] Step 4 — Expense logging + history
- [ ] Step 5 — Dashboard
- [ ] Step 6 — Savings goals
- [ ] Step 7 — End-of-day notification
