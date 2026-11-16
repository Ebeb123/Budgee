// ---------------------------------------------------------------------------
// Toast - a small glass message that floats above the tab bar for a few seconds.
// ---------------------------------------------------------------------------
// Used for "Logged ₱120 · Undo" after adding an expense (and "Expense deleted ·
// Undo"). Any screen calls:
//
//   const toast = useToast();
//   toast.show({ message: 'Logged ₱120', actionLabel: 'Undo', onAction: undo });
//
// Only one toast shows at a time; a new one replaces the old one.
// ---------------------------------------------------------------------------

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_BAR } from '@/components/Screen';
import { useTheme } from '@/theme/ThemeProvider';

const ToastContext = createContext({ show: () => {}, hide: () => {} });

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null); // { id, message, actionLabel?, onAction?, duration }
  const counter = useRef(0);

  const show = useCallback((t) => {
    setToast({ duration: 4000, ...t, id: ++counter.current });
  }, []);
  const hide = useCallback(() => setToast(null), []);

  const value = useMemo(() => ({ show, hide }), [show, hide]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? <ToastView key={toast.id} toast={toast} onDone={hide} /> : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

function ToastView({ toast, onDone }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => onDone());
    }, toast.duration);
    return () => clearTimeout(timer);
  }, [anim, onDone, toast.duration]);

  const runAction = () => {
    onDone();
    toast.onAction?.();
  };

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: insets.bottom + TAB_BAR.height + TAB_BAR.gap + 12 }]}
    >
      <Animated.View
        style={[
          styles.toast,
          {
            backgroundColor: c.glassStrong,
            borderColor: c.glassBorder,
            borderTopColor: c.glassHighlight,
            opacity: anim,
            transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
          },
        ]}
      >
        <Text style={[theme.typography.body, { color: c.text, flex: 1 }]} numberOfLines={2}>
          {toast.message}
        </Text>
        {toast.actionLabel ? (
          <Pressable onPress={runAction} hitSlop={10} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
            <Text style={[theme.typography.title, { color: c.accent }]}>{toast.actionLabel}</Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: 20 },
  toast: {
    width: '100%',
    maxWidth: 440,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
  },
});
