// ---------------------------------------------------------------------------
// Sheet - a frosted-glass bottom sheet for modal screens.
// ---------------------------------------------------------------------------
// Used by "Edit money" and "Add to goal". The screen behind stays visible but
// blurred, and a glass panel slides up from the bottom. Tap the blurred area
// (or press Back) to close.
//
// The route must be registered with presentation: 'transparentModal' in
// app/_layout.js so the screen underneath keeps rendering.
// ---------------------------------------------------------------------------

import { useEffect, useRef } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { GlassBlur } from '@/components/GlassProvider';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * @param {object} props
 * @param {string} [props.title]
 * @param {React.ReactNode} props.children
 */
export default function Sheet({ title, children }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Slide + fade the panel in once on mount.
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 260, useNativeDriver: true }).start();
  }, [enter]);

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  return (
    <View style={styles.flex}>
      <GlassBlur intensity={30} style={StyleSheet.absoluteFill} />
      <Pressable
        style={[StyleSheet.absoluteFill, { backgroundColor: c.backdrop }]}
        onPress={close}
        accessibilityLabel="Close"
      />

      <KeyboardAvoidingView behavior="padding" style={styles.anchor} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.panel,
            {
              backgroundColor: c.glassStrong,
              borderColor: c.glassBorder,
              borderTopColor: c.glassHighlight,
              marginTop: insets.top + 24,
              opacity: enter,
              transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [48, 0] }) }],
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: c.textMuted }]} />
          <ScrollView
            contentContainerStyle={{
              padding: theme.spacing.md,
              paddingBottom: theme.spacing.lg + insets.bottom,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {title ? (
              <Text style={[theme.typography.h2, { color: c.text, marginBottom: theme.spacing.md }]}>{title}</Text>
            ) : null}
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  anchor: { flex: 1, justifyContent: 'flex-end' },
  panel: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    flexShrink: 1,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, opacity: 0.4 },
});
