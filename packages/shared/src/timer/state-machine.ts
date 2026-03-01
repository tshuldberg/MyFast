import type { ActiveFast, TimerState } from '../types/index';

/**
 * Compute the current timer state from an active fast and the current time.
 * Timer is derived from startedAt timestamp — NOT a foreground counter.
 * App can be killed and timer stays accurate.
 */
export function computeTimerState(activeFast: ActiveFast | null, now: Date): TimerState {
  if (!activeFast) {
    return {
      state: 'idle',
      activeFast: null,
      elapsed: 0,
      remaining: 0,
      progress: 0,
      targetReached: false,
    };
  }

  const elapsed = Math.floor((now.getTime() - new Date(activeFast.startedAt).getTime()) / 1000);
  const targetSeconds = activeFast.targetHours * 3600;
  const remaining = Math.max(0, targetSeconds - elapsed);
  const progress = targetSeconds > 0 ? elapsed / targetSeconds : 0;
  const targetReached = elapsed >= targetSeconds;

  return {
    state: 'fasting',
    activeFast,
    elapsed,
    remaining,
    progress: Math.min(progress, 1), // Cap at 1.0 for ring display
    targetReached,
  };
}

/** Format seconds as HH:MM:SS */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
