import { Stack, useRouter, useSegments } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from '@myfast/ui';
import type { ThemeMode } from '@myfast/ui';
import { DatabaseProvider, useDatabase } from '@/lib/database';

/** Context to let any screen change the app-wide theme */
const ThemeModeContext = createContext<{
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}>({ themeMode: 'dark', setThemeMode: () => {} });

export function useThemeMode() {
  return useContext(ThemeModeContext);
}

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

function ThemedApp() {
  const db = useDatabase();
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    const row = db.get<{ value: string }>(`SELECT value FROM settings WHERE key = ?`, ['theme']);
    return (row?.value as ThemeMode) ?? 'dark';
  });

  const setThemeMode = useCallback((mode: ThemeMode) => {
    db.run(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`, ['theme', mode]);
    setThemeModeState(mode);
  }, [db]);

  return (
    <ThemeModeContext.Provider value={{ themeMode, setThemeMode }}>
      <ThemeProvider mode={themeMode}>
        <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />
        <NavigationGuard>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: themeMode === 'dark' ? '#0D0B0F' : '#F5F2F8' },
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="onboarding" />
          </Stack>
        </NavigationGuard>
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}

export default function RootLayout() {
  return (
    <DatabaseProvider>
      <ThemedApp />
    </DatabaseProvider>
  );
}
