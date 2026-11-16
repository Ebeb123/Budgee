// ---------------------------------------------------------------------------
// COLOR PALETTES (design tokens: color)
// ---------------------------------------------------------------------------
// We define TWO complete palettes - dark and light - by hand, so each one looks
// intentional (not a naive auto-invert). Screens never use raw hex codes; they
// read semantic names like colors.bg / colors.needs. That means if we want to
// retune a color later, we change it in ONE place and every screen updates.
//
// GLASS LOOK: the screen background is the deep navy from the app icon with
// three soft colour glows behind it (see GlassBackground). Cards are NOT solid:
// they are a see-through `glass` fill with a thin bright edge (`glassBorder`)
// and a brighter top edge (`glassHighlight`), so the glows show through them.
//
// The three category colors are FIXED per category and reused everywhere
// (rings, donut slices, cards, legends, background glows) so a category always
// "reads" the same.
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} Palette
 * @property {string} bg             Screen background (deep navy in dark)
 * @property {string} surface        SOLID card colour (used where see-through won't work, e.g. switch thumb)
 * @property {string} surfaceAlt     See-through fill for inputs, chips, tracks
 * @property {string} border         Hairline borders / dividers
 * @property {string} glass          See-through card fill
 * @property {string} glassStrong    Thicker glass (sheets, menus, tab bar)
 * @property {string} glassBorder    Thin bright card edge
 * @property {string} glassHighlight Brighter top edge (the "light catching the glass" line)
 * @property {string} glowOpacity    How strong the background glows are (0..1, as a string)
 * @property {string} backdrop       Dim layer behind sheets and menus
 * @property {string} text           Primary text
 * @property {string} textMuted      Secondary / dimmed text
 * @property {string} needs          Category color: Needs (50%)
 * @property {string} wants          Category color: Wants (30%)
 * @property {string} savings        Category color: Savings (20%) + hero accent
 * @property {string} accent         Same as savings; used for CTAs/active states
 * @property {string} alert          Overspend / danger (distinct from wants)
 * @property {string} onAccent       Text/icon color that sits on top of `accent`
 */

/** @type {Palette} */
export const darkColors = {
  bg: '#0E121C', // navy from the app icon
  surface: '#1B2130',
  surfaceAlt: 'rgba(255,255,255,0.07)',
  border: 'rgba(255,255,255,0.10)',
  glass: 'rgba(255,255,255,0.06)',
  glassStrong: 'rgba(22,28,42,0.72)',
  glassBorder: 'rgba(255,255,255,0.10)',
  glassHighlight: 'rgba(255,255,255,0.22)',
  glowOpacity: '0.32',
  backdrop: 'rgba(5,8,15,0.45)',
  text: '#FFFFFF',
  textMuted: '#9BA3B4',

  needs: '#5AC8FA', // sky blue
  wants: '#FF6B6B', // coral
  savings: '#C6F432', // lime (hero accent)
  accent: '#C6F432',
  alert: '#FF453A',
  onAccent: '#0E121C', // dark text on the bright lime accent
};

/** @type {Palette} */
export const lightColors = {
  bg: '#EEF2F8',
  surface: '#FFFFFF',
  surfaceAlt: 'rgba(16,24,40,0.05)',
  border: 'rgba(16,24,40,0.08)',
  glass: 'rgba(255,255,255,0.58)',
  glassStrong: 'rgba(255,255,255,0.80)',
  glassBorder: 'rgba(255,255,255,0.75)',
  glassHighlight: 'rgba(255,255,255,1)',
  glowOpacity: '0.28',
  backdrop: 'rgba(15,23,42,0.18)',
  text: '#141A26',
  textMuted: '#5F6778',

  needs: '#0A84C7', // deepened blue for contrast on white
  wants: '#E5484D',
  savings: '#5A9216', // deepened lime so it reads on white
  accent: '#5A9216',
  alert: '#D70015',
  onAccent: '#FFFFFF',
};
