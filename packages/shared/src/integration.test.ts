import { describe, it, expect, afterEach, vi } from 'vitest';
import { createTestDatabase } from './db/test-helpers.js';
import {
  startFast,
  endFast,
  getActiveFast,
  listFasts,
  countFasts,
} from './db/fasts.js';
import { computeTimerState, formatDuration } from './timer/state-machine.js';
import { computeStreaks, refreshStreakCache } from './stats/streaks.js';
import { averageDuration, adherenceRate } from './stats/aggregation.js';

afterEach(() => {
  vi.useRealTimers();
});

describe('full fast lifecycle integration', () => {
  it('start → time passes → target reached → end → streak + history updated', () => {
    const db = createTestDatabase();
    vi.useFakeTimers();

    // ---------------------------------------------------------------
    // Step 1: Start a fast
    // ---------------------------------------------------------------
    const startTime = new Date('2025-06-15T08:00:00Z');
    vi.setSystemTime(startTime);

    const fast = startFast(db, '16:8', 16, startTime);

    // Verify: active_fast row created
    const active = getActiveFast(db);
    expect(active).not.toBeNull();
    expect(active!.fastId).toBe(fast.id);
    expect(active!.protocol).toBe('16:8');
    expect(active!.targetHours).toBe(16);

    // Verify: timer state shows fasting
    const timerAtStart = computeTimerState(active, startTime);
    expect(timerAtStart.state).toBe('fasting');
    expect(timerAtStart.elapsed).toBe(0);
    expect(timerAtStart.remaining).toBe(16 * 3600);
    expect(timerAtStart.progress).toBe(0);
    expect(timerAtStart.targetReached).toBe(false);

    // ---------------------------------------------------------------
    // Step 2: Simulate time passing (8 hours in — halfway)
    // ---------------------------------------------------------------
    const midTime = new Date('2025-06-15T16:00:00Z');
    vi.setSystemTime(midTime);

    const timerAtMid = computeTimerState(active, midTime);
    expect(timerAtMid.state).toBe('fasting');
    expect(timerAtMid.elapsed).toBe(8 * 3600);
    expect(timerAtMid.remaining).toBe(8 * 3600);
    expect(timerAtMid.progress).toBeCloseTo(0.5);
    expect(timerAtMid.targetReached).toBe(false);
    expect(formatDuration(timerAtMid.elapsed)).toBe('08:00:00');

    // ---------------------------------------------------------------
    // Step 3: Reach the target (16 hours in)
    // ---------------------------------------------------------------
    const targetTime = new Date('2025-06-16T00:00:00Z');
    vi.setSystemTime(targetTime);

    const timerAtTarget = computeTimerState(active, targetTime);
    expect(timerAtTarget.state).toBe('fasting');
    expect(timerAtTarget.elapsed).toBe(16 * 3600);
    expect(timerAtTarget.remaining).toBe(0);
    expect(timerAtTarget.progress).toBe(1);
    expect(timerAtTarget.targetReached).toBe(true);
    expect(formatDuration(timerAtTarget.elapsed)).toBe('16:00:00');

    // ---------------------------------------------------------------
    // Step 4: End the fast (18 hours — user kept going 2h past target)
    // ---------------------------------------------------------------
    const endTime = new Date('2025-06-16T02:00:00Z');
    vi.setSystemTime(endTime);

    const completed = endFast(db, endTime, 'Felt great, went 2h over');

    // Verify: fast saved with correct fields
    expect(completed).not.toBeNull();
    expect(completed!.id).toBe(fast.id);
    expect(completed!.endedAt).toBe(endTime.toISOString());
    expect(completed!.durationSeconds).toBe(18 * 3600);
    expect(completed!.hitTarget).toBe(true);
    expect(completed!.notes).toBe('Felt great, went 2h over');

    // Verify: active_fast removed
    expect(getActiveFast(db)).toBeNull();

    // Verify: timer state is now idle
    const timerAfterEnd = computeTimerState(null, endTime);
    expect(timerAfterEnd.state).toBe('idle');

    // ---------------------------------------------------------------
    // Step 5: Verify history and stats
    // ---------------------------------------------------------------
    // Appears in history list
    const history = listFasts(db);
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe(fast.id);
    expect(history[0].durationSeconds).toBe(18 * 3600);
    expect(history[0].hitTarget).toBe(true);

    // Count
    expect(countFasts(db)).toBe(1);

    // Streak updated
    const streaks = refreshStreakCache(db);
    expect(streaks.currentStreak).toBe(1);
    expect(streaks.longestStreak).toBe(1);
    expect(streaks.totalFasts).toBe(1);

    // Stats
    expect(averageDuration(db)).toBe(18 * 3600);
    expect(adherenceRate(db)).toBe(100);
  });

  it('multi-day streak: 3 consecutive fasts then one broken', () => {
    const db = createTestDatabase();
    vi.useFakeTimers();

    // Day 1: hit target
    vi.setSystemTime(new Date('2025-06-10T08:00:00Z'));
    startFast(db, '16:8', 16, new Date('2025-06-10T08:00:00Z'));
    endFast(db, new Date('2025-06-11T00:00:00Z'));

    // Day 2: hit target
    vi.setSystemTime(new Date('2025-06-11T08:00:00Z'));
    startFast(db, '16:8', 16, new Date('2025-06-11T08:00:00Z'));
    endFast(db, new Date('2025-06-12T00:00:00Z'));

    // Day 3: hit target
    vi.setSystemTime(new Date('2025-06-12T08:00:00Z'));
    startFast(db, '16:8', 16, new Date('2025-06-12T08:00:00Z'));
    endFast(db, new Date('2025-06-13T00:00:00Z'));

    // Check streak mid-run
    vi.setSystemTime(new Date('2025-06-12T23:00:00Z'));
    const midStreaks = computeStreaks(db);
    expect(midStreaks.currentStreak).toBe(3);
    expect(midStreaks.longestStreak).toBe(3);

    // Day 4: skip

    // Day 5: hit target (streak resets)
    vi.setSystemTime(new Date('2025-06-14T08:00:00Z'));
    startFast(db, '16:8', 16, new Date('2025-06-14T08:00:00Z'));
    endFast(db, new Date('2025-06-15T00:00:00Z'));

    vi.setSystemTime(new Date('2025-06-14T23:00:00Z'));
    const afterBreak = computeStreaks(db);
    expect(afterBreak.currentStreak).toBe(1);
    expect(afterBreak.longestStreak).toBe(3); // preserved from days 1-3

    // Verify history
    const history = listFasts(db);
    expect(history).toHaveLength(4);
    expect(countFasts(db)).toBe(4);

    // Adherence: 4/4 = 100%
    expect(adherenceRate(db)).toBe(100);
  });

  it('failed fast does not count toward streak or adherence', () => {
    const db = createTestDatabase();
    vi.useFakeTimers();

    // Day 1: hit target
    vi.setSystemTime(new Date('2025-06-10T08:00:00Z'));
    startFast(db, '16:8', 16, new Date('2025-06-10T08:00:00Z'));
    endFast(db, new Date('2025-06-11T00:00:00Z')); // 16h, hit

    // Day 2: ended early (10h out of 16h target)
    vi.setSystemTime(new Date('2025-06-11T08:00:00Z'));
    startFast(db, '16:8', 16, new Date('2025-06-11T08:00:00Z'));
    endFast(db, new Date('2025-06-11T18:00:00Z'), 'Had to eat early'); // 10h, missed

    vi.setSystemTime(new Date('2025-06-11T20:00:00Z'));

    // Streak: day 10 hit, day 11 missed => current streak = 0 (no consecutive hit days ending at today/yesterday)
    // Actually day 10 is yesterday relative to now, but day 11 (today) missed,
    // so the most recent hit day is day 10. todayDayNumber - mostRecentDay = 1, so streak starts.
    // But day 11 is today and has no hit, so streak = 1 (just day 10)
    const streaks = computeStreaks(db);
    expect(streaks.currentStreak).toBe(1);
    expect(streaks.totalFasts).toBe(2);

    // Adherence: 1 out of 2 = 50%
    expect(adherenceRate(db)).toBe(50);

    // Average duration: (16h + 10h) / 2 = 13h = 46800s
    expect(averageDuration(db)).toBe(46800);
  });
});
