// ---------------------------------------------------------------------------
// MONEY  (integer-centavo math + formatting)
// ---------------------------------------------------------------------------
// The golden rule of this app: money is ALWAYS an integer number of centavos.
// ₱40.00 is 4000. We never store or do arithmetic on decimals like 40.0,
// because binary floating point can't represent them exactly (the classic
// 0.1 + 0.2 !== 0.3 bug), which slowly corrupts totals in a money app.
//
// These functions are pure (no side effects), so they're easy to test.
// ---------------------------------------------------------------------------

/**
 * Convert a user-typed amount (string like "40", "40.50", "1,200" or a number)
 * into whole centavos. Returns null if the input isn't a valid, non-negative
 * amount - the caller (validation layer) decides what to do with null.
 *
 * @param {string | number} input
 * @returns {number | null} centavos, or null if invalid
 */
export function toCents(input) {
  let value;
  if (typeof input === 'number') {
    value = input;
  } else if (typeof input === 'string') {
    // Strip the peso sign, thousands commas and spaces before parsing.
    const cleaned = input.replace(/[₱,\s]/g, '');
    if (cleaned === '') return null;
    value = Number(cleaned);
  } else {
    return null;
  }

  if (!Number.isFinite(value) || value < 0) return null;
  // Round to the nearest centavo. Rounding here (not truncating) is the
  // sensible behavior for the 2-decimal amounts users actually type.
  return Math.round(value * 100);
}

/** Insert thousands separators into a plain integer string ("12345" -> "12,345"). */
function groupThousands(intStr) {
  return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Format centavos for display, e.g. 123456 -> "₱1,234.56".
 * We format manually instead of relying on Number.toLocaleString because the
 * JS engine on Android (Hermes) has inconsistent locale support - doing it by
 * hand guarantees the same output on every device.
 *
 * @param {number} cents
 * @param {object} [opts]
 * @param {boolean} [opts.symbol=true]   Prefix with "₱"
 * @param {boolean} [opts.showSign=false] Show a leading "+" for positives
 * @returns {string}
 */
export function formatCents(cents, opts = {}) {
  const { symbol = true, showSign = false } = opts;
  const negative = cents < 0;
  const abs = Math.abs(Math.round(cents));

  const pesos = Math.floor(abs / 100);
  const centavos = abs % 100;
  const body = `${groupThousands(String(pesos))}.${String(centavos).padStart(2, '0')}`;

  const sign = negative ? '-' : showSign ? '+' : '';
  return `${sign}${symbol ? '₱' : ''}${body}`;
}

/** Convert centavos to a plain peso number (e.g. for chart math). Avoid for storage. */
export function centsToPesos(cents) {
  return cents / 100;
}