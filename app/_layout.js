// ---------------------------------------------------------------------------
// ROOT LAYOUT  (app/_layout.js)
// ---------------------------------------------------------------------------
// Startup + global providers + navigation shell + the onboarding gate.
//
// Order of wrapping matters:
//   DB init  ->  ThemeProvider  ->  BudgetProvider  ->  navigation
// The database must be ready before the providers read from it; the theme wraps
// everything visual; the budget state is read by the gate to decide whether to
// send a first-run user into onboarding.
// ---------------------------------------------------------------------------

import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter, useSegments } from 'expo-router';

import { initDatabase } from '@/db/database';
import { darkColors } from '@/theme/palettes';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { BudgetProvider, useBudget } from '@/state/BudgetProvider';
import { seedDemoIfEmpty } from '@/demo/seedDemo';
import DemoShell from '@/demo/DemoShell';

export default function RootLayout() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await initDatabase();
        // Web demo only: start visitors with sample data instead of an empty app.
        if (Platform.OS === 'web') await seedDemoIfEmpty();
        if (!cancelled) setStatus('ready');
      } catch (err) {
        console.error('[startup] database init failed:', err);
        if (!cancelled) {
          setError(err);
          setStatus('error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === 'loading') return <BootSplash />;
  if (status === 'error') return <FatalError error={error} />;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <BudgetProvider>
          <DemoShell>
            <RootNavigator />
          </DemoShell>
        </BudgetProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

/** Navigation shell + gate. Waits for the budget state to load before routing. */
function RootNavigator() {
  const { theme } = useTheme();
  const { loading } = useBudget();

  // Don't render navigation until we know whether a budget exists - this avoids
  // a flash of the dashboard before redirecting a first-run user to onboarding.
  if (loading) return <BootSplash />;

  return (
    <>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="budget-edit" options={{ presentation: 'modal' }} />
        <Stack.Screen name="allocate" options={{ presentation: 'modal' }} />
      </Stack>
      <OnboardingGate />
    </>
  );
}

/**
 * Watches the active period and the current route, and redirects:
 *   - no budget yet + not already onboarding  -> go to onboarding
 *   - budget exists    + stuck on onboarding   -> go to the app
 * Rendered as an invisible component so it can use navigation hooks.
 */
function OnboardingGate() {
  const { period } = useBudget();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const inOnboarding = segments[0] === 'onboarding';
    if (!period && !inOnboarding) {
      router.replace('/onboarding');
    } else if (period && inOnboarding) {
      router.replace('/(tabs)');
    }
  }, [period, segments, router]);

  return null;
}

function BootSplash() {
  return (
    <View style={[styles.center, { backgroundColor: darkColors.bg }]}>
      <ActivityIndicator color={darkColors.accent} size="large" />
    </View>
  );
}

function FatalError({ error }) {
  return (
    <View style={[styles.center, { backgroundColor: darkColors.bg, padding: 24 }]}>
      <Text style={{ color: darkColors.alert, fontSize: 18, fontWeight: '600', marginBottom: 8 }}>
        Something went wrong starting the app
      </Text>
      <Text style={{ color: darkColors.textMuted, textAlign: 'center' }}>
        {String(error?.message ?? error)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
