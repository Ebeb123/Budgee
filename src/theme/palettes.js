// ---------------------------------------------------------------------------
// COLOR PALETTES (design tokens: color)
// ---------------------------------------------------------------------------
// We define TWO complete palettes - dark and light - by hand, so each one looks
// intentional (not a naive auto-invert). Screens never use raw hex codes; they
// read semantic names like colors.bg / colors.needs. That means if we want to
// retune a color later, we change it in ONE place and every screen updates.
//
// The three category colors are FIXED per category and reused everywhere
// (rings, donut slices, cards, legends) so a category always "reads" the same.
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} Palette
 * @property {string} bg          Screen background (near-black in dark)
 * @property {string} surface     Card background (slightly lighter than bg)
 * @property {string} surfaceAlt  Secondary surface (chips, inputs)
 * @property {string} border      Hairline borders / dividers
 * @property {string} text        Primary text
 * @property {string} textMuted   Secondary / dimmed text
 * @property {string} needs       Category color: Needs (50%)
 * @property {string} wants       Category color: Wants (30%)
 * @property {string} savings     Category color: Savings (20%) + hero accent
 * @property {string} accent      Same as savings; used for CTAs/active states
 * @property {string} alert       Overspend / danger (distinct from wants)
 * @property {string} onAccent    Text/icon color that sits on top of `accent`
 */

/** @type {Palette} */
export const darkColors = {
  bg: '#141416',
  surface: '#1F1F22',
  surfaceAlt: '#2A2A2E',
  border: '#2E2E33',
  text: '#FFFFFF',
  textMuted: '#8E8E93',

  needs: '#5AC8FA', // sky blue
  wants: '#FF6B6B', // coral
  savings: '#C6F432', // lime (hero accent)
  accent: '#C6F432',
  alert: '#FF453A',
  onAccent: '#141416', // dark text on the bright lime accent
};

/** @type {Palette} */
export const lightColors = {
  bg: '#F5F5F7',
  surface: '#FFFFFF',
  surfaceAlt: '#ECECEF',
  border: '#E2E2E6',
  text: '#1C1C1E',
  textMuted: '#6B6B70',

  needs: '#0A84C7', // deepened blue for contrast on white
  wants: '#E5484D',
  savings: '#5A9216', // deepened lime so it reads on white
  accent: '#5A9216',
  alert: '#D70015',
  onAccent: '#FFFFFF',
};