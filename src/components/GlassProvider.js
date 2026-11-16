// ---------------------------------------------------------------------------
// GlassProvider + GlassBlur - real background blur that works on every platform.
// ---------------------------------------------------------------------------
// expo-blur blurs whatever is behind a <BlurView>. iOS and the browser do this
// on their own. Android is different: it can only blur the contents of a
// <BlurTargetView> that you point it at (via a ref).
//
// So every <Screen> wraps itself in a BlurTargetView and, when it comes into
// focus, registers its ref here. The floating tab bar, sheets and menus then
// render <GlassBlur>, which hands that ref to BlurView on Android. If there is
// no target (or the phone is older than Android 12), BlurView falls back to a
// plain see-through tint - it still looks like glass, just without the blur.
// ---------------------------------------------------------------------------

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { BlurView } from 'expo-blur';

import { useTheme } from '@/theme/ThemeProvider';

const GlassContext = createContext({ target: null, registerTarget: () => {} });

export function GlassProvider({ children }) {
  // { ref, id } of the screen currently in focus. `id` changes on every
  // registration so blur views can remount when the target switches.
  const [target, setTarget] = useState(null);
  const counter = useRef(0);

  const registerTarget = useCallback((ref) => {
    setTarget((prev) => (prev?.ref === ref ? prev : { ref, id: ++counter.current }));
  }, []);

  const value = useMemo(() => ({ target, registerTarget }), [target, registerTarget]);
  return <GlassContext.Provider value={value}>{children}</GlassContext.Provider>;
}

export function useGlass() {
  return useContext(GlassContext);
}

/**
 * A blurred, tinted layer. Use it as the background of floating glass (tab bar,
 * sheet backdrop, menus). Children render on top of the blur.
 *
 * @param {object} props
 * @param {number} [props.intensity=40]  1..100
 * @param {object} [props.style]
 * @param {boolean} [props.inModal=false]  true inside a React Native <Modal>: that is a
 *   separate Android window, so it can't blur the screen behind it - use the tint only.
 * @param {React.ReactNode} [props.children]
 */
export function GlassBlur({ intensity = 40, style, inModal = false, children }) {
  const { theme } = useTheme();
  const { target } = useGlass();
  const tint = theme.scheme === 'dark' ? 'dark' : 'light';

  if (Platform.OS === 'android') {
    const hasTarget = !inModal && !!target?.ref;
    return (
      <BlurView
        key={hasTarget ? target.id : 'none'}
        intensity={intensity}
        tint={tint}
        blurTarget={hasTarget ? target.ref : undefined}
        blurMethod={hasTarget ? 'dimezisBlurViewSdk31Plus' : 'none'}
        style={style}
      >
        {children}
      </BlurView>
    );
  }

  return (
    <BlurView intensity={intensity} tint={tint} style={style}>
      {children}
    </BlurView>
  );
}
