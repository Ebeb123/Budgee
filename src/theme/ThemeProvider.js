// ---------------------------------------------------------------------------
// THEME PROVIDER
// ---------------------------------------------------------------------------
// This component decides which palette is active and shares the resulting
// `theme` object with the whole app via React Context. Any screen can then call
// useTheme() to get colors/spacing/etc without prop-drilling.
//
// Mode logic (this satisfies your "auto-follow the phone, with a manual
// override" requirement):
//   - mode = 'system' -> follow the phone's appearance setting (the default)
//   - mode = 'light'  -> force light
//   - mode = 'dark'   -> force dark
// The chosen mode is persisted to the database so it survives app restarts.
// ---------------------------------------------------------------------------

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import { darkColors, lightColors } from './palettes';
import { makeTheme } from './tokens';
import { getSetting, setSetting } from '@/repositories/settingsRepo';

const SETTING_KEY = 'theme_mode';

/** @typedef {'system' | 'light' | 'dark'} ThemeMode */

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  // The phone's current appearance ('light' | 'dark' | null while unknown).
  const systemScheme = useColorScheme();

  // The user's chosen override. Defaults to 'system'.
  /** @type {[ThemeMode, Function]} */
  const [mode, setModeState] = useState('system');

  // On first mount, load the saved mode from the database (if any).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await getSetting(SETTING_KEY);
        if (!cancelled && (saved === 'light' || saved === 'dark' || saved === 'system')) {
          setModeState(saved);
        }
      } catch (err) {
        // If loading fails we simply keep the default 'system' mode.
        console.warn('[theme] failed to load saved mode:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Public setter: update state immediately, then persist in the background.
  const setMode = async (next) => {
    setModeState(next);
    try {
      await setSetting(SETTING_KEY, next);
    } catch (err) {
      console.warn('[theme] failed to save mode:', err);
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

  const value = useMemo(() => ({ theme, mode, setMode }), [theme, mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Hook to read the theme in any component.
 * @returns {{ theme: import('./tokens').Theme, mode: ThemeMode, setMode: (m: ThemeMode) => void }}
 */
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme() must be used inside a <ThemeProvider>.');
  }
  return ctx;
}