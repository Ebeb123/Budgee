// ---------------------------------------------------------------------------
// DATE UTILITIES
// ---------------------------------------------------------------------------
// We store dates as plain ISO day strings, 'YYYY-MM-DD' (no time, no timezone).
// Two reasons: (1) a spending day is a calendar day, not an instant; (2) ISO
// day strings sort chronologically as plain text, so date comparisons and
// "between" checks are just string comparisons - simple and bug-resistant.
//
// All conversions use LOCAL time (the phone's clock), which is what a user
// means by "today".
// ---------------------------------------------------------------------------

/**
 * Format a Date object as a local 'YYYY-MM-DD' string.
 * @param {Date} date
 * @returns {string}
 */
export function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parse a 'YYYY-MM-DD' string into a Date at LOCAL noon. Using noon (not
 * midnight) avoids a subtle bug where daylight-saving shifts could roll the
 * date back a day. The Philippines has no DST, but this keeps the code correct
 * anywhere and is a good habit.
 * @param {string} iso
 * @returns {Date}
 */
export function fromISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

/** Today as an ISO day string. */
export function todayISO() {
  return toISO(new Date());
}

/** Add (or subtract, with a negative n) days to an ISO day string. */
export function addDays(iso, n) {
  const dt = fromISO(iso);
  dt.setDate(dt.getDate() + n);
  return toISO(dt);
}

/**
 * Add n months to an ISO day string, clamping the day if the target month is
 * shorter (e.g. Jan 31 + 1 month -> Feb 28/29, not March 3).
 */
export function addMonths(iso, n) {
  const dt = fromISO(iso);
  const day = dt.getDate();
  dt.setDate(1); // avoid overflow while changing the month
  dt.setMonth(dt.getMonth() + n);
  const lastDay = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
  dt.setDate(Math.min(day, lastDay));
  return toISO(dt);
}

/** Whole days from aISO to bISO (b - a). Negative if b is before a. */
export function daysBetween(aISO, bISO) {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((fromISO(bISO).getTime() - fromISO(aISO).getTime()) / MS_PER_DAY);
}

/**
 * How many months (as a fraction) have elapsed since startISO, at least 1.
 * Used to average things "per month" - e.g. savings set aside / months running.
 * We divide by the average days-in-a-month (30.436875) and floor at 1 so a brand
 * new account doesn't divide by zero or explode a monthly average.
 */
export function monthsElapsed(startISO, todayISO) {
  const days = Math.max(0, daysBetween(startISO, todayISO));
  return Math.max(1, days / 30.436875);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// --- Month helpers (for the dashboard's month-by-month pie) ----------------
// A "month key" is just the first 7 chars of an ISO date, 'YYYY-MM'. Like ISO
// days, these sort chronologically as plain strings, so comparing months is a
// plain string comparison.

/** The month key for a given ISO day, e.g. '2026-09-14' -> '2026-09'. */
export function ymOf(iso) {
  return iso.slice(0, 7);
}

/** This month as a key, e.g. '2026-09'. */
export function currentYM() {
  return ymOf(todayISO());
}

/** Shift a month key by n months (n may be negative), e.g. ('2026-09', 1) -> '2026-10'. */
export function shiftYM(ym, n) {
  return ymOf(addMonths(`${ym}-01`, n));
}

/** Human-friendly month, e.g. '2026-09' -> 'September 2026'. */
export function monthLabel(ym) {
  const [y, m] = ym.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

/** Human-friendly date, e.g. 'Sep 10, 2026'. */
export function formatDisplayDate(iso) {
  const dt = fromISO(iso);
  return `${MONTHS[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;
}

/**
 * Heading for a day group in the history list: 'Today', 'Yesterday', or the
 * formatted date.
 */
export function formatDayHeading(iso) {
  const today = todayISO();
  if (iso === today) return 'Today';
  if (iso === addDays(today, -1)) return 'Yesterday';
  return formatDisplayDate(iso);
}
