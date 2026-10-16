// ---------------------------------------------------------------------------
// SHARED TYPE DEFINITIONS  (JSDoc)
// ---------------------------------------------------------------------------
// This file has no runtime code - it only defines the SHAPES of our data using
// JSDoc @typedef. Because we import these types in comments elsewhere, your
// editor gives you autocomplete and warns about typos (e.g. row.amuont_cents),
// giving us most of TypeScript's safety with none of its build setup.
//
// Field names match the database columns exactly (snake_case) so a row read
// from SQLite already satisfies the type.
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} Period
 * @property {number} id
 * @property {'weekly'|'monthly'} period_type
 * @property {string} start_date        'YYYY-MM-DD'
 * @property {string} end_date          'YYYY-MM-DD'
 * @property {number} income_cents
 * @property {number} needs_pct
 * @property {number} wants_pct
 * @property {number} savings_pct
 * @property {'active'|'closed'} status
 * @property {string} created_at
 */

/**
 * @typedef {Object} Category
 * @property {number} id
 * @property {string} name
 * @property {'need'|'want'} bucket
 * @property {string|null} icon
 * @property {string|null} color
 * @property {number} is_default
 * @property {number} sort_order
 */

/**
 * @typedef {Object} Expense
 * @property {number} id
 * @property {number} period_id
 * @property {number|null} category_id
 * @property {'need'|'want'} bucket
 * @property {number} amount_cents
 * @property {string|null} note
 * @property {string} spent_at          'YYYY-MM-DD'
 * @property {string} created_at
 * @property {string|null} deleted_at
 * @property {string} [category_name]   present when joined with categories
 * @property {string} [category_icon]
 */

/**
 * @typedef {Object} Goal
 * @property {number} id
 * @property {string} name
 * @property {number} target_cents
 * @property {string|null} target_date
 * @property {number} is_active
 * @property {'active'|'reached'|'archived'} status
 * @property {string} created_at
 * @property {number} [saved_cents]     present when joined with contributions
 */

// This empty export makes the file a module so editors treat the typedefs as
// importable via: /** @type {import('@/types').Expense} */
export {};