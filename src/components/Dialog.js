// ---------------------------------------------------------------------------
// Dialog - a glass confirmation/alert dialog that matches the app's UI.
// ---------------------------------------------------------------------------
// Drop-in replacement for React Native's Alert.alert(). Called imperatively:
//
//   import { Alert } from '@/lib/alert';
//   Alert.alert('Delete item?', 'This cannot be undone.', [
//     { text: 'Cancel', style: 'cancel' },
//     { text: 'Delete', style: 'destructive', onPress: doDelete },
//   ]);
//
// Works by keeping a module-level `_show` reference that DialogProvider sets
// on mount, so any code (async functions, repos, etc.) can call it.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';

import { useTheme } from '@/theme/ThemeProvider';

// Module-level singleton — set by the provider, called by Alert.alert().
let _show = null;
export function _registerShow(fn) { _show = fn; }
export function _callShow(title, message, buttons) {
  if (_show) _show(title, message, buttons);
}

export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null); // { title, message, buttons }

  useEffect(() => {
    _registerShow((title, message, buttons) =>
      setDialog({ title, message: message ?? null, buttons: buttons ?? [{ text: 'OK' }] })
    );
    return () => { _show = null; };
  }, []);

  const dismiss = useCallback(() => setDialog(null), []);

  return (
    <>
      {children}
      {dialog ? (
        <DialogView
          key={`${dialog.title}-${Date.now()}`}
          title={dialog.title}
          message={dialog.message}
          buttons={dialog.buttons}
          onDismiss={dismiss}
        />
      ) : null}
    </>
  );
}

function DialogView({ title, message, buttons, onDismiss }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, tension: 200, friction: 18 }).start();
  }, [anim]);

  function press(btn) {
    Animated.timing(anim, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => {
      onDismiss();
      btn.onPress?.();
    });
  }

  // Tap backdrop = cancel (first cancel-style button, or last button)
  function backdropPress() {
    const cancel = buttons.find((b) => b.style === 'cancel') ?? buttons[buttons.length - 1];
    press(cancel);
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Blurred backdrop */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: anim }]}>
        <BlurView intensity={20} style={StyleSheet.absoluteFill} />
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: c.backdrop }]}
          onPress={backdropPress}
          accessibilityLabel="Dismiss"
        />
      </Animated.View>

      {/* Glass card */}
      <View style={styles.center} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: c.glassStrong,
              borderColor: c.glassBorder,
              borderTopColor: c.glassHighlight,
              opacity: anim,
              transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) }],
            },
          ]}
        >
          <Text style={[theme.typography.h2, { color: c.text, marginBottom: message ? 8 : 0 }]}>
            {title}
          </Text>
          {message ? (
            <Text style={[theme.typography.body, { color: c.textMuted, marginBottom: 4 }]}>
              {message}
            </Text>
          ) : null}

          <View style={[styles.divider, { backgroundColor: c.border, marginTop: 16, marginBottom: 4 }]} />

          <View style={[styles.buttons, buttons.length === 2 ? styles.buttonsRow : styles.buttonsCol]}>
            {buttons.map((btn, i) => {
              const isDestructive = btn.style === 'destructive';
              const isCancel = btn.style === 'cancel';
              const color = isDestructive ? c.alert : isCancel ? c.textMuted : c.accent;
              const weight = isCancel ? '400' : '700';
              return (
                <Pressable
                  key={i}
                  onPress={() => press(btn)}
                  style={({ pressed }) => [
                    styles.btn,
                    buttons.length !== 2 && i < buttons.length - 1
                      ? [styles.btnBorder, { borderBottomColor: c.border }]
                      : null,
                    buttons.length === 2 && i === 0
                      ? [styles.btnBorderRight, { borderRightColor: c.border }]
                      : null,
                    { opacity: pressed ? 0.5 : 1 },
                  ]}
                  accessibilityRole="button"
                >
                  <Text style={{ color, fontWeight: weight, fontSize: 16 }}>{btn.text}</Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  card: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    paddingBottom: 0,
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
  },
  divider: { height: StyleSheet.hairlineWidth },
  buttons: { overflow: 'hidden' },
  buttonsRow: { flexDirection: 'row' },
  buttonsCol: { flexDirection: 'column' },
  btn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  btnBorder: { borderBottomWidth: StyleSheet.hairlineWidth },
  btnBorderRight: { borderRightWidth: StyleSheet.hairlineWidth },
});
