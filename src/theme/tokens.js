// ---------------------------------------------------------------------------
// NON-COLOR DESIGN TOKENS: spacing, radius, typography
// ---------------------------------------------------------------------------
// These do not change between light and dark mode, so they live on their own.
// Using a fixed scale (instead of random numbers like 7, 13, 22 in each screen)
// is what makes spacing feel consistent across the whole app.

// A 4-point spacing scale. Use spacing.md instead of a magic "16".
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Corner radii. Cards use `lg` to match the soft rounded look in the reference.
export const radius = {
  sm: 8,
  md: 12,
  lg: 24,
  xl: 30,
  pill: 999, // fully rounded (for pills / toggles)
};

// Typography scale. `weight` values are strings because React Native expects
// fontWeight as a string like '600'. We rely on the clean system sans-serif
// font, which looks native and needs no extra font files to bundle.
export const typography = {
  display: { fontSize: 40, fontWeight: '700' }, // the big balance number
  h1: { fontSize: 28, fontWeight: '700' },
  h2: { fontSize: 22, fontWeight: '600' },
  title: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 15, fontWeight: '400' },
  label: { fontSize: 13, fontWeight: '500' },
  caption: { fontSize: 12, fontWeight: '400' },
};

/**
 * Build a full theme object from a color palette. A "theme" is simply the
 * chosen palette bundled together with the shared spacing/radius/typography
 * tokens, so a screen can pull everything it needs from one `theme`.
 *
 * @param {import('./palettes').Palette} colors
 * @param {'light' | 'dark'} scheme
 */
export function makeTheme(colors, scheme) {
  return {
    scheme, // 'light' | 'dark' - handy for status bar + shadows
    colors,
    spacing,
    radius,
    typography,
  };
}

/** @typedef {ReturnType<typeof makeTheme>} Theme */