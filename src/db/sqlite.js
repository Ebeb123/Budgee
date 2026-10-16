// Phones (Android/iOS): use the real expo-sqlite. The browser build uses sqlite.web.js instead
// (Metro picks the .web.js file automatically for the web build).
export * from 'expo-sqlite';

/** Nothing to load on phones. */
export function prepareDatabase() {
  return Promise.resolve();
}

/** The demo reset button only exists on the web build. */
export function resetDatabase() {}

export function saveDatabaseNow() {}
