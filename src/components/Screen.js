// ---------------------------------------------------------------------------
// Screen - a themed page wrapper used by every screen.
// ---------------------------------------------------------------------------
// It handles the three things every screen needs: the correct background color,
// safe-area padding (so content doesn't sit under the notch / home indicator),
// and an optional scrollable body. Centralizing this means screens don't each
// re-implement it, and they all stay visually consistent.
// ---------------------------------------------------------------------------

import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';

/**
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.title]    Optional large screen title
 * @param {boolean} [props.scroll]  Wrap children in a ScrollView (default true)
 */
export default function Screen({ children, title, scroll = true }) {
  const { theme } = useTheme();
  const Body = scroll ? ScrollView : View;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.bg }]} edges={['top']}>
      <Body
        style={styles.flex}
        contentContainerStyle={{ padding: theme.spacing.md, paddingBottom: theme.spacing.xxl }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {title ? (
          <Text
            style={[
              theme.typography.h1,
              { color: theme.colors.text, marginBottom: theme.spacing.md },
            ]}
          >
            {title}
          </Text>
        ) : null}
        {children}
      </Body>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
});