// ---------------------------------------------------------------------------
// DEFAULT CATEGORIES (seed data)
// ---------------------------------------------------------------------------
// Sub-categories give you a more detailed breakdown (Food, Transport, ...),
// but each one ALWAYS rolls up into one of the two spending buckets:
//   - 'need'  -> counts against the 50% Needs budget
//   - 'want'  -> counts against the 30% Wants budget
// (Savings is the 20% - it is not a spending category, so it isn't listed here.)
//
// `icon`  values are Ionicons names (from @expo/vector-icons, bundled with Expo).
// `color` is a FIXED per-category color, used on the category chip, in the
//         expense list, and in the dashboard Needs/Wants breakdown ring - so a
//         category always "reads" as the same color everywhere. The palette is
//         intentionally muted/neutral (not bright), and every category has a
//         DISTINCT color so the breakdown makes it obvious what you spent most
//         on. These hues are mid-tone on purpose so they stay legible on both
//         the dark and the light theme.
//
// These rows are inserted once by migration v1; migration v3 stamps the colors
// onto them (and onto anyone upgrading from an earlier version).
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} SeedCategory
 * @property {string} name
 * @property {'need' | 'want'} bucket
 * @property {string} icon      Ionicons glyph name
 * @property {string} color     Fixed hex color for this category
 * @property {number} sortOrder Display order within its bucket
 */

/** @type {SeedCategory[]} */
export const DEFAULT_CATEGORIES = [
  // --- Needs (50%) ---
  { name: 'Food', bucket: 'need', icon: 'fast-food-outline', color: '#D9A05B', sortOrder: 1 }, // muted ochre
  { name: 'Transport', bucket: 'need', icon: 'bus-outline', color: '#6E8CA0', sortOrder: 2 }, // slate blue
  { name: 'School', bucket: 'need', icon: 'school-outline', color: '#9B8AC4', sortOrder: 3 }, // muted lavender
  { name: 'Bills', bucket: 'need', icon: 'receipt-outline', color: '#C58C8C', sortOrder: 4 }, // dusty rose
  { name: 'Health', bucket: 'need', icon: 'medkit-outline', color: '#6FA593', sortOrder: 5 }, // sage

  // --- Wants (30%) ---
  { name: 'Dining Out', bucket: 'want', icon: 'restaurant-outline', color: '#C08457', sortOrder: 1 }, // terracotta
  { name: 'Entertainment', bucket: 'want', icon: 'game-controller-outline', color: '#7E9CC0', sortOrder: 2 }, // steel blue
  { name: 'Shopping', bucket: 'want', icon: 'cart-outline', color: '#B08AB0', sortOrder: 3 }, // mauve
  { name: 'Subscriptions', bucket: 'want', icon: 'tv-outline', color: '#8FA06E', sortOrder: 4 }, // olive
  { name: 'Other', bucket: 'want', icon: 'ellipsis-horizontal-outline', color: '#9AA0A6', sortOrder: 5 }, // neutral grey
];
