import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from '@myfast/ui';
import { DatabaseProvider, useDatabase } from '@/lib/database';

function NavigationGuard({ children }: { children: React.ReactNode }) {
  const db = useDatabase();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const row = db.get<{ value: string }>(`SELECT value FROM settings WHERE key = ?`, ['onboarding_complete']);
    const isOnboarded = row?.value === 'true';
    const inOnboarding = segments[0] === 'onboarding';

    if (!isOnboarded && !inOnboarding) {
      router.replace('/onboarding');
    } else if (isOnboarded && inOnboarding) {
      router.replace('/(tabs)');
    }
  }, [segments]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <DatabaseProvider>
      <ThemeProvider mode="dark">
        <StatusBar style="light" />
        <NavigationGuard>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#0D0B0F' },
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="onboarding" />
          </Stack>
        </NavigationGuard>
      </ThemeProvider>
    </DatabaseProvider>
  );
}
