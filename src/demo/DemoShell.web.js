// ---------------------------------------------------------------------------
// DEMO SHELL  (browser build only)
// ---------------------------------------------------------------------------
// Shows the app in a phone-width column and adds a small bar that explains
// the sample data and lets visitors reset it back to the original demo.
// ---------------------------------------------------------------------------
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DB_NAME } from '@/db/database';
import { resetDatabase } from '@/db/sqlite';
import { Alert } from '@/lib/alert';
import { useTheme } from '@/theme/ThemeProvider';

export default function DemoShell({ children }) {
  const { theme } = useTheme();
  const c = theme.colors;

  const reset = () => {
    Alert.alert('Reset demo?', 'This restores the sample budget, expenses and goals. Your changes in this browser will be cleared.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          resetDatabase(DB_NAME);
          window.location.reload();
        },
      },
    ]);
  };

  return (
    <View style={[styles.page, { backgroundColor: c.bg }]}>
      <View style={[styles.phone, { backgroundColor: c.bg, borderColor: c.border }]}>
        <View style={[styles.bar, { backgroundColor: c.surfaceAlt, borderBottomColor: c.border }]}>
          <Text style={[styles.text, { color: c.textMuted }]} numberOfLines={2}>
            <Text style={{ color: c.text, fontWeight: '800' }}>Demo</Text> · sample data, saved only in your browser
          </Text>
          <Pressable onPress={reset} style={({ pressed }) => [styles.btn, { borderColor: c.border, opacity: pressed ? 0.6 : 1 }]}>
            <Text style={{ color: c.text, fontSize: 12, fontWeight: '700' }}>Reset</Text>
          </Pressable>
        </View>
        <View style={{ flex: 1 }}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: 'center' },
  phone: { flex: 1, width: '100%', maxWidth: 480, borderLeftWidth: StyleSheet.hairlineWidth, borderRightWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  text: { flex: 1, fontSize: 12 },
  btn: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
});
