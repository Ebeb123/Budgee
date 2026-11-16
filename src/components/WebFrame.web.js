// ---------------------------------------------------------------------------
// WEB FRAME  (browser build only)
// ---------------------------------------------------------------------------
// On a wide desktop screen a phone app stretched edge to edge looks broken, so
// the browser build shows the app in a centred, phone-width glass column with
// the colour glows filling the page around it. On a phone-sized browser the
// column simply fills the screen.
// ---------------------------------------------------------------------------
import { StyleSheet, View } from 'react-native';

import GlassBackground from '@/components/GlassBackground';
import { useTheme } from '@/theme/ThemeProvider';

export default function WebFrame({ children }) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <View style={[styles.page, { backgroundColor: c.bg }]}>
      <GlassBackground />
      <View style={[styles.phone, { backgroundColor: c.bg, borderColor: c.glassBorder }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: 'center' },
  phone: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    overflow: 'hidden',
    boxShadow: '0 0 60px rgba(0, 0, 0, 0.25)',
  },
});
