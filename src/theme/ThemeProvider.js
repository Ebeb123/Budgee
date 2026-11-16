// ---------------------------------------------------------------------------
// THEME PROVIDER
// ---------------------------------------------------------------------------
// This component decides which palette is active and shares the resulting
// `theme` object with the whole app via React Context. Any screen can then call
// useTheme() to get colors/spacing/etc without prop-drilling.
//
// Mode logic ("auto-follow the phone, with a manual override"):
//   - mode = 'system' -> follow the phone's appearance setting (the default)
//   - mode = 'light'  -> force light
//   - mode = 'dark'   -> force dark
// The chosen mode is persisted to the database so it survives app restarts.
//
// It also owns the "hide amounts" privacy toggle. That is a display preference
// like the theme, and because nearly every component reads useTheme(), changing
// it here re-renders every visible amount at once.
// ---------------------------------------------------------------------------

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import { darkColors, lightColors } from './palettes';
import { makeTheme } from './tokens';
import { setAmountsHidden } from '@/services/money';
import { getSettings, setSetting } from '@/repositories/settingsRepo';

const MODE_KEY = 'theme_mode';
const HIDE_KEY = 'hide_amounts';

/** @typedef {'system' | 'light' | 'dark'} ThemeMode */

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  // The phone's current appearance ('light' | 'dark' | null while unknown).
  const systemScheme = useColorScheme();

  /** @type {[ThemeMode, Function]} */
  const [mode, setModeState] = useState('system');
  const [hideAmounts, setHideState] = useState(false);

  // On first mount, load the saved preferences from the database (if any).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await getSettings([MODE_KEY, HIDE_KEY]);
        if (cancelled) return;
        const saved = s[MODE_KEY];
        if (saved === 'light' || saved === 'dark' || saved === 'system') setModeState(saved);
        if (s[HIDE_KEY] === '1') {
          setAmountsHidden(true);
          setHideState(true);
        }
      } catch (err) {
        // If loading fails we simply keep the defaults.
        console.warn('[theme] failed to load saved preferences:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Public setters: update state immediately, then persist in the background.
  const setMode = async (next) => {
    setModeState(next);
    try {
      await setSetting(MODE_KEY, next);
    } catch (err) {
      console.warn('[theme] failed to save mode:', err);
    }
  };

  const setHideAmounts = async (next) => {
    setAmountsHidden(next); // flip the formatter BEFORE the re-render
    setHideState(next);
    try {
      await setSetting(HIDE_KEY, next ? '1' : '0');
    } catch (err) {
      console.warn('[theme] failed to save hide-amounts:', err);
    }
  };

  // Resolve the ACTIVE scheme: if the user picked 'system', fall back to the
  // phone setting (and to 'dark' if the phone hasn't reported one yet).
  const activeScheme = mode === 'system' ? systemScheme ?? 'dark' : mode;

  // Rebuild the theme object only when the active scheme actually changes.
  const theme = useMemo(
    () => makeTheme(activeScheme === 'light' ? lightColors : darkColors, activeScheme),
    [activeScheme],
  );

  const value = useMemo(
    () => ({ theme, mode, setMode, hideAmounts, setHideAmounts }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theme, mode, hideAmounts],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Hook to read the theme in any component.
 * @returns {{ theme: import('./tokens').Theme, mode: ThemeMode, setMode: (m: ThemeMode) => void, hideAmounts: boolean, setHideAmounts: (v: boolean) => void }}
 */
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme() must be used inside a <ThemeProvider>.');
  }
  return ctx;
}
