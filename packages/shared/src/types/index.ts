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

/** Daily water intake row */
export interface WaterIntake {
  date: string; // ISO date YYYY-MM-DD
  count: number;
  target: number;
  completed: boolean;
  updatedAt: string;
}

/** Notification preferences stored in notifications_config */
export interface NotificationPreferences {
  fastStart: boolean;
  progress25: boolean;
  progress50: boolean;
  progress75: boolean;
  fastComplete: boolean;
}

export type GoalType =
  | 'fasts_per_week'
  | 'hours_per_week'
  | 'hours_per_month'
  | 'weight_milestone';

export type GoalDirection = 'at_least' | 'at_most';

/** User-defined goal */
export interface Goal {
  id: string;
  type: GoalType;
  targetValue: number;
  period: 'weekly' | 'monthly' | 'milestone';
  direction: GoalDirection;
  label: string | null;
  unit: string | null;
  startDate: string; // ISO date YYYY-MM-DD
  endDate: string | null; // ISO date YYYY-MM-DD
  isActive: boolean;
  createdAt: string;
}

/** Computed progress snapshot for a goal */
export interface GoalProgress {
  id: string;
  goalId: string;
  periodStart: string; // ISO date YYYY-MM-DD
  periodEnd: string; // ISO date YYYY-MM-DD
  currentValue: number;
  targetValue: number;
  completed: boolean;
  createdAt: string;
}

/** Aggregate summary used for monthly and annual recaps */
export interface SummaryStats {
  totalFasts: number;
  totalHours: number;
  averageDurationHours: number;
  longestFastHours: number;
  adherenceRate: number;
  currentStreak: number;
}

/** Configurable fasting zone card model */
export interface FastingZone {
  id: string;
  name: string;
  startHour: number;
  endHour: number | null; // null = open-ended
  title: string;
  description: string;
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
