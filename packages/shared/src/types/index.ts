/** A completed or in-progress fasting session */
export interface Fast {
  id: string;
  protocol: string;
  targetHours: number;
  startedAt: string; // ISO 8601
  endedAt: string | null;
  durationSeconds: number | null;
  hitTarget: boolean | null;
  notes: string | null;
  createdAt: string;
}

/** An active fast (singleton — at most one at a time) */
export interface ActiveFast {
  id: string;
  fastId: string;
  protocol: string;
  targetHours: number;
  startedAt: string; // ISO 8601
}

/** A fasting protocol preset or custom */
export interface Protocol {
  id: string;
  name: string;
  fastingHours: number;
  eatingHours: number;
  description: string | null;
  isCustom: boolean;
  isDefault: boolean;
  sortOrder: number;
}

/** An optional weight log entry */
export interface WeightEntry {
  id: string;
  weightValue: number;
  unit: 'lbs' | 'kg';
  date: string; // ISO date YYYY-MM-DD
  notes: string | null;
  createdAt: string;
}

/** Streak cache values */
export interface StreakCache {
  currentStreak: number;
  longestStreak: number;
  totalFasts: number;
}

/** App settings stored as key-value pairs */
export interface Settings {
  defaultProtocol: string;
  notifyFastComplete: boolean;
  notifyEatingWindowClosing: boolean;
  weightTrackingEnabled: boolean;
  weightUnit: 'lbs' | 'kg';
  theme: 'dark' | 'light';
}

/** Timer state computed from an active fast */
export type FastState = 'idle' | 'fasting' | 'eating_window';

export interface TimerState {
  state: FastState;
  activeFast: ActiveFast | null;
  elapsed: number; // Seconds since fast started
  remaining: number; // Seconds until target (0 if passed)
  progress: number; // 0.0 to 1.0 (capped for ring display)
  targetReached: boolean;
}
