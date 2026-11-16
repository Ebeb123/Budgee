// ---------------------------------------------------------------------------
// TABS LAYOUT  (app/(tabs)/_layout.js)
// ---------------------------------------------------------------------------
// The "(tabs)" folder is a route GROUP - the parentheses mean it doesn't show
// up in the URL, it just groups the screens that share this bottom tab bar.
// Each .js file in this folder becomes one tab.
//
// The tab bar FLOATS: a rounded glass pill above the bottom edge, with a real
// background blur (GlassBlur), so the screen scrolls visibly underneath it.
// The active icon is lime with a soft glow. Because the bar floats over the
// content, <Screen> adds matching bottom padding (InTabsContext tells it to).
// ---------------------------------------------------------------------------

import { StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassBlur } from '@/components/GlassProvider';
import { InTabsContext, TAB_BAR } from '@/components/Screen';
import * as haptics from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';

const TABS = [
  { name: 'index', icon: 'grid', label: 'Dashboard' },
  { name: 'log', icon: 'add-circle', label: 'Log expense' },
  { name: 'goals', icon: 'flag', label: 'Goals' },
  { name: 'settings', icon: 'settings', label: 'Settings' },
];

export default function TabsLayout() {
  const { theme } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();

  return (
    <InTabsContext.Provider value={true}>
      <Tabs
        screenListeners={{ tabPress: () => haptics.select() }}
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarActiveTintColor: c.accent,
          tabBarInactiveTintColor: c.textMuted,
          sceneStyle: { backgroundColor: c.bg },
          tabBarStyle: {
            position: 'absolute',
            start: TAB_BAR.side,
            end: TAB_BAR.side,
            bottom: insets.bottom + TAB_BAR.gap,
            height: TAB_BAR.height,
            paddingBottom: 0,
            paddingTop: 0,
            paddingHorizontal: 8,
            borderRadius: TAB_BAR.height / 2,
            borderWidth: 1,
            borderTopWidth: 1,
            borderColor: c.glassBorder,
            borderTopColor: c.glassHighlight,
            backgroundColor: 'transparent',
            overflow: 'hidden',
            elevation: 0,
            boxShadow: theme.scheme === 'dark' ? '0 12px 32px rgba(0, 0, 0, 0.35)' : '0 12px 32px rgba(15, 23, 42, 0.12)',
          },
          tabBarItemStyle: { height: TAB_BAR.height - 2, justifyContent: 'center', alignItems: 'center' },
          tabBarIconStyle: { flex: 1 },
          tabBarBackground: () => (
            <GlassBlur intensity={50} style={StyleSheet.absoluteFill}>
              <View style={[StyleSheet.absoluteFill, { backgroundColor: c.glassStrong, opacity: 0.55 }]} />
            </GlassBlur>
          ),
        }}
      >
        {TABS.map((t) => (
          <Tabs.Screen
            key={t.name}
            name={t.name}
            options={{
              tabBarAccessibilityLabel: t.label,
              tabBarIcon: ({ color, focused }) => (
                <View
                  style={[
                    styles.iconWrap,
                    focused && {
                      backgroundColor: c.accent + (theme.scheme === 'dark' ? '1F' : '1A'),
                      boxShadow: `0 0 18px ${c.accent}${theme.scheme === 'dark' ? '55' : '33'}`,
                    },
                  ]}
                >
                  <Ionicons name={focused ? t.icon : `${t.icon}-outline`} size={22} color={color} />
                </View>
              ),
            }}
          />
        ))}
      </Tabs>
    </InTabsContext.Provider>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 48,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
