import { Platform, NativeModules } from 'react-native';

/**
 * Widget state JSON written to App Group UserDefaults.
 * The iOS widget reads this to display fasting progress.
 */
interface WidgetState {
  state: 'fasting' | 'idle';
  startedAt: string | null;
  targetHours: number | null;
  protocol: string | null;
  streakCount: number | null;
}

const APP_GROUP = 'group.com.myfast.app';
const DEFAULTS_KEY = 'widgetState';

/**
 * Write fasting state to App Group UserDefaults for the widget to read.
 * Uses the SharedGroupPreferences native module if available,
 * otherwise falls back to RNWidgetCenter or is a no-op on Android.
 */
export function updateWidgetState(params: {
  state: 'fasting' | 'idle';
  startedAt?: string | null;
  targetHours?: number | null;
  protocol?: string | null;
  streakCount?: number | null;
}): void {
  if (Platform.OS !== 'ios') return;

  const widgetState: WidgetState = {
    state: params.state,
    startedAt: params.startedAt ?? null,
    targetHours: params.targetHours ?? null,
    protocol: params.protocol ?? null,
    streakCount: params.streakCount ?? null,
  };

  try {
    // Use the native SharedGroupPreferences module to write to App Group UserDefaults
    const { SharedGroupPreferences } = NativeModules;
    if (SharedGroupPreferences) {
      SharedGroupPreferences.setItem(DEFAULTS_KEY, JSON.stringify(widgetState), APP_GROUP);
    }
  } catch {
    // Silently fail — widget update is best-effort
    console.warn('[widget-bridge] Failed to write widget state');
  }

  // Request WidgetKit to reload timelines
  reloadWidgetTimelines();
}

/**
 * Clear widget state (set to idle) and reload timelines.
 */
export function clearWidgetState(streakCount?: number): void {
  updateWidgetState({ state: 'idle', streakCount: streakCount ?? null });
}

/**
 * Ask WidgetKit to reload all timelines.
 * Uses the RNWidgetCenter native module if available.
 */
function reloadWidgetTimelines(): void {
  if (Platform.OS !== 'ios') return;

  try {
    const { RNWidgetCenter } = NativeModules;
    if (RNWidgetCenter) {
      RNWidgetCenter.reloadAllTimelines();
    }
  } catch {
    // Widget reload is best-effort
    console.warn('[widget-bridge] Failed to reload widget timelines');
  }
}
