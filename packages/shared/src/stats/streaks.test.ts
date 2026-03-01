import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Database } from '../db/database';
import { createTestDatabase } from '../db/test-helpers';
import { startFast, endFast } from '../db/fasts';
import { computeStreaks, refreshStreakCache, getStreaks } from './streaks';

let db: Database;

beforeEach(() => {
  db = createTestDatabase();
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a completed fast on a given day that hit its target */
function completeFast(
  startISO: string,
  targetHours: number,
  hitTarget: boolean,
) {
  const started = new Date(startISO);
  startFast(db, '16:8', targetHours, started);
  // End the fast — if hitTarget, end at or past target; otherwise end short
  const durationHours = hitTarget ? targetHours : targetHours - 2;
  const ended = new Date(started.getTime() + durationHours * 3600 * 1000);
  endFast(db, ended);
}

/** Set the fake system clock to a specific ISO date/time */
function setNow(iso: string) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(iso));
}

// ---------------------------------------------------------------------------
// computeStreaks
// ---------------------------------------------------------------------------

describe('computeStreaks', () => {
  it('returns all zeros when no fasts exist', () => {
    setNow('2025-06-10T12:00:00Z');
    const result = computeStreaks(db);

    expect(result).toEqual({
      currentStreak: 0,
      longestStreak: 0,
      totalFasts: 0,
    });
  });

  it('returns streak of 1 for a single target-hit fast today', () => {
    setNow('2025-06-10T20:00:00Z');
    completeFast('2025-06-10T08:00:00Z', 10, true);

    const result = computeStreaks(db);
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
    expect(result.totalFasts).toBe(1);
  });

  it('counts consecutive days with target-hit fasts', () => {
    setNow('2025-06-13T20:00:00Z');
    // 4 consecutive days: June 10, 11, 12, 13
    completeFast('2025-06-10T08:00:00Z', 10, true);
    completeFast('2025-06-11T08:00:00Z', 10, true);
    completeFast('2025-06-12T08:00:00Z', 10, true);
    completeFast('2025-06-13T08:00:00Z', 10, true);

    const result = computeStreaks(db);
    expect(result.currentStreak).toBe(4);
    expect(result.longestStreak).toBe(4);
  });

  it('resets current streak when there is a gap', () => {
    setNow('2025-06-13T20:00:00Z');
    // Day 10, 11 (streak of 2), gap on 12, then day 13 (streak of 1)
    completeFast('2025-06-10T08:00:00Z', 10, true);
    completeFast('2025-06-11T08:00:00Z', 10, true);
    // Skip June 12
    completeFast('2025-06-13T08:00:00Z', 10, true);

    const result = computeStreaks(db);
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(2);
  });

  it('preserves longest streak across breaks', () => {
    setNow('2025-06-20T20:00:00Z');
    // First streak: 5 days (June 1-5)
    completeFast('2025-06-01T08:00:00Z', 10, true);
    completeFast('2025-06-02T08:00:00Z', 10, true);
    completeFast('2025-06-03T08:00:00Z', 10, true);
    completeFast('2025-06-04T08:00:00Z', 10, true);
    completeFast('2025-06-05T08:00:00Z', 10, true);
    // Gap
    // Second streak: 2 days (June 19-20)
    completeFast('2025-06-19T08:00:00Z', 10, true);
    completeFast('2025-06-20T08:00:00Z', 10, true);

    const result = computeStreaks(db);
    expect(result.currentStreak).toBe(2);
    expect(result.longestStreak).toBe(5);
  });

  it('does not count fasts that missed their target', () => {
    setNow('2025-06-11T20:00:00Z');
    // Day 10: hit target, Day 11: missed target
    completeFast('2025-06-10T08:00:00Z', 10, true);
    completeFast('2025-06-11T08:00:00Z', 16, false); // ended short

    const result = computeStreaks(db);
    // Current streak is 0 because today's fast didn't hit target,
    // and yesterday is the only hit day (but need today or yesterday to have a hit)
    expect(result.currentStreak).toBe(1); // yesterday counts as within range
    expect(result.longestStreak).toBe(1);
    expect(result.totalFasts).toBe(2);
  });

  it('counts multiple fasts on the same day as 1 streak day', () => {
    setNow('2025-06-10T23:00:00Z');
    // Two fasts on June 10 — should still count as 1 day streak
    completeFast('2025-06-10T06:00:00Z', 6, true);
    completeFast('2025-06-10T14:00:00Z', 6, true);

    const result = computeStreaks(db);
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
    expect(result.totalFasts).toBe(2);
  });

  it('counts a midnight-spanning fast for the day it was started', () => {
    setNow('2025-06-11T20:00:00Z');
    // Fast started June 10 at 10 PM, ended June 11 at 2 PM (16h)
    completeFast('2025-06-10T22:00:00Z', 16, true);
    // Separate fast started June 11
    completeFast('2025-06-11T08:00:00Z', 10, true);

    const result = computeStreaks(db);
    // Both days have a target-hit fast: June 10 (the overnight one) and June 11
    expect(result.currentStreak).toBe(2);
  });

  it('considers streak active if last hit day was yesterday', () => {
    setNow('2025-06-11T08:00:00Z');
    // Fast was yesterday, today no fast yet
    completeFast('2025-06-10T08:00:00Z', 10, true);

    const result = computeStreaks(db);
    expect(result.currentStreak).toBe(1);
  });

  it('considers streak broken if last hit day was 2+ days ago', () => {
    setNow('2025-06-12T08:00:00Z');
    // Fast was June 10 — 2 days ago
    completeFast('2025-06-10T08:00:00Z', 10, true);

    const result = computeStreaks(db);
    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(1);
  });

  it('returns correct totalFasts including non-target-hit fasts', () => {
    setNow('2025-06-12T20:00:00Z');
    completeFast('2025-06-10T08:00:00Z', 10, true);
    completeFast('2025-06-11T08:00:00Z', 16, false);
    completeFast('2025-06-12T08:00:00Z', 10, true);

    const result = computeStreaks(db);
    expect(result.totalFasts).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// refreshStreakCache + getStreaks
// ---------------------------------------------------------------------------

describe('refreshStreakCache', () => {
  it('writes computed streaks to the streak_cache table', () => {
    setNow('2025-06-10T20:00:00Z');
    completeFast('2025-06-10T08:00:00Z', 10, true);

    const result = refreshStreakCache(db);
    expect(result.currentStreak).toBe(1);

    // Verify it's in the cache table
    const cached = getStreaks(db);
    expect(cached.currentStreak).toBe(1);
  });
});

describe('getStreaks', () => {
  it('falls back to computing when cache is empty', () => {
    setNow('2025-06-10T20:00:00Z');
    completeFast('2025-06-10T08:00:00Z', 10, true);

    // Don't call refreshStreakCache — getStreaks should compute on its own
    const result = getStreaks(db);
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
    expect(result.totalFasts).toBe(1);
  });

  it('returns cached values when cache is populated', () => {
    setNow('2025-06-10T20:00:00Z');
    completeFast('2025-06-10T08:00:00Z', 10, true);
    refreshStreakCache(db);

    // Add another fast but don't refresh cache
    completeFast('2025-06-11T08:00:00Z', 10, true);
    vi.setSystemTime(new Date('2025-06-11T20:00:00Z'));

    // getStreaks should return stale cached values (totalFasts=1, not 2)
    const result = getStreaks(db);
    expect(result.totalFasts).toBe(1);
  });
});
