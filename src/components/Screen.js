// ---------------------------------------------------------------------------
// Screen - a themed page wrapper used by every full-page screen.
// ---------------------------------------------------------------------------
// It handles what every screen needs: the navy background with its colour
// glows, safe-area padding (so content doesn't sit under the notch), an
// optional scrollable body, a title row (with an optional right-side action
// and an automatic back button on pushed screens), and room at the bottom for
// the floating tab bar.
//
// It also registers itself as the "blur target" while it is in focus, so the
// floating tab bar and sheets can blur it on Android (see GlassProvider).
// ---------------------------------------------------------------------------

import { createContext, useCallback, useContext, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurTargetView } from 'expo-blur';

import GlassBackground from '@/components/GlassBackground';
import { useGlass } from '@/components/GlassProvider';
import { useTheme } from '@/theme/ThemeProvider';

/** Size of the floating tab bar (shared with app/(tabs)/_layout.js). */
export const TAB_BAR = { height: 64, gap: 12, side: 20 };

/** true for screens rendered inside the tab navigator (set by the tabs layout). */
export const InTabsContext = createContext(false);

/**
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.title]          Optional large screen title
 * @param {React.ReactNode} [props.headerRight]  Optional element at the right of the title
 * @param {boolean} [props.scroll]        Wrap children in a ScrollView (default true)
 */
export default function Screen({ children, title, headerRight, scroll = true }) {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const inTabs = useContext(InTabsContext);
  const { registerTarget } = useGlass();
  const targetRef = useRef(null);

  // While this screen is on top, it's what the glass layers should blur.
  useFocusEffect(
    useCallback(() => {
      registerTarget(targetRef);
    }, [registerTarget]),
  );

  const Body = scroll ? ScrollView : View;
  const showBack = !inTabs && router.canGoBack();
  const bottomPad = inTabs
    ? TAB_BAR.height + TAB_BAR.gap + insets.bottom + theme.spacing.lg
    : theme.spacing.xxl + insets.bottom;

  return (
    <BlurTargetView ref={targetRef} style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <GlassBackground />
      <SafeAreaView style={styles.flex} edges={['top']}>
        <Body
          style={styles.flex}
          contentContainerStyle={[
            { padding: theme.spacing.md, paddingBottom: bottomPad },
            !scroll && styles.flex,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {title || showBack ? (
            <View style={[styles.header, { marginBottom: theme.spacing.md }]}>
              {showBack ? (
                <Pressable
                  onPress={() => router.back()}
                  hitSlop={10}
                  accessibilityLabel="Go back"
                  style={({ pressed }) => [
                    styles.back,
                    {
                      backgroundColor: theme.colors.surfaceAlt,
                      borderColor: theme.colors.glassBorder,
                      opacity: pressed ? 0.6 : 1,
                    },
                  ]}
                >
                  <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
                </Pressable>
              ) : null}
              {title ? (
                <Text style={[theme.typography.h1, { color: theme.colors.text, flex: 1 }]} numberOfLines={1}>
                  {title}
                </Text>
              ) : (
                <View style={styles.flex} />
              )}
              {headerRight}
            </View>
          ) : null}
          {children}
        </Body>
      </SafeAreaView>
    </BlurTargetView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
