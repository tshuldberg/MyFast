import { describe, it, expect } from 'vitest';
import { computeTimerState, formatDuration } from './state-machine';
import type { ActiveFast } from '../types/index';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeActiveFast(overrides: Partial<ActiveFast> = {}): ActiveFast {
  return {
    id: 'af-1',
    fastId: 'f-1',
    protocol: '16:8',
    targetHours: 16,
    startedAt: new Date('2025-01-15T08:00:00Z').toISOString(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// computeTimerState
// ---------------------------------------------------------------------------

describe('computeTimerState', () => {
  // --- Idle state (no active fast) ---

  it('returns idle state when activeFast is null', () => {
    const result = computeTimerState(null, new Date());
    expect(result).toEqual({
      state: 'idle',
      activeFast: null,
      elapsed: 0,
      remaining: 0,
      progress: 0,
      targetReached: false,
    });
  });

  // --- Fasting state ---

  it('returns fasting state with correct elapsed/remaining mid-fast', () => {
    const activeFast = makeActiveFast();
    // 4 hours into a 16-hour fast
    const now = new Date('2025-01-15T12:00:00Z');
    const result = computeTimerState(activeFast, now);

    expect(result.state).toBe('fasting');
    expect(result.activeFast).toBe(activeFast);
    expect(result.elapsed).toBe(4 * 3600);
    expect(result.remaining).toBe(12 * 3600);
    expect(result.progress).toBeCloseTo(0.25);
    expect(result.targetReached).toBe(false);
  });

  it('returns correct values right at fast start (0 elapsed)', () => {
    const activeFast = makeActiveFast();
    const now = new Date('2025-01-15T08:00:00Z');
    const result = computeTimerState(activeFast, now);

    expect(result.elapsed).toBe(0);
    expect(result.remaining).toBe(16 * 3600);
    expect(result.progress).toBe(0);
    expect(result.targetReached).toBe(false);
  });

  it('returns targetReached when elapsed equals target', () => {
    const activeFast = makeActiveFast();
    // Exactly 16 hours later
    const now = new Date('2025-01-16T00:00:00Z');
    const result = computeTimerState(activeFast, now);

    expect(result.elapsed).toBe(16 * 3600);
    expect(result.remaining).toBe(0);
    expect(result.progress).toBe(1);
    expect(result.targetReached).toBe(true);
  });

  it('caps progress at 1.0 when elapsed exceeds target', () => {
    const activeFast = makeActiveFast();
    // 20 hours into a 16-hour fast
    const now = new Date('2025-01-16T04:00:00Z');
    const result = computeTimerState(activeFast, now);

    expect(result.elapsed).toBe(20 * 3600);
    expect(result.remaining).toBe(0);
    expect(result.progress).toBe(1);
    expect(result.targetReached).toBe(true);
  });

  it('handles fractional elapsed time (floors to whole seconds)', () => {
    const startedAt = new Date('2025-01-15T08:00:00Z');
    const activeFast = makeActiveFast({ startedAt: startedAt.toISOString() });
    // 1.5 seconds later
    const now = new Date(startedAt.getTime() + 1500);
    const result = computeTimerState(activeFast, now);

    expect(result.elapsed).toBe(1);
  });

  // --- Different protocols ---

  it('works with a short protocol (e.g., 12:12)', () => {
    const activeFast = makeActiveFast({ targetHours: 12 });
    // 6 hours in
    const now = new Date('2025-01-15T14:00:00Z');
    const result = computeTimerState(activeFast, now);

    expect(result.elapsed).toBe(6 * 3600);
    expect(result.remaining).toBe(6 * 3600);
    expect(result.progress).toBeCloseTo(0.5);
    expect(result.targetReached).toBe(false);
  });

  it('works with a long protocol (e.g., 36h extended fast)', () => {
    const activeFast = makeActiveFast({ targetHours: 36 });
    // 36 hours later
    const now = new Date('2025-01-16T20:00:00Z');
    const result = computeTimerState(activeFast, now);

    expect(result.elapsed).toBe(36 * 3600);
    expect(result.remaining).toBe(0);
    expect(result.progress).toBe(1);
    expect(result.targetReached).toBe(true);
  });

  // --- Edge cases ---

  it('handles targetHours of 0 (progress defaults to 0)', () => {
    const activeFast = makeActiveFast({ targetHours: 0 });
    const now = new Date('2025-01-15T08:00:00Z');
    const result = computeTimerState(activeFast, now);

    // When targetHours is 0, targetSeconds is 0, so elapsed / 0 = Infinity
    // but the code uses: progress = targetSeconds > 0 ? ... : 0
    expect(result.progress).toBe(0);
    expect(result.remaining).toBe(0);
    expect(result.targetReached).toBe(true);
  });

  it('preserves activeFast reference in returned state', () => {
    const activeFast = makeActiveFast();
    const now = new Date('2025-01-15T12:00:00Z');
    const result = computeTimerState(activeFast, now);

    expect(result.activeFast).toBe(activeFast);
  });

  it('handles sub-second elapsed without negative remaining', () => {
    const activeFast = makeActiveFast({ targetHours: 16 });
    // 100 ms into the fast
    const now = new Date(new Date('2025-01-15T08:00:00Z').getTime() + 100);
    const result = computeTimerState(activeFast, now);

    expect(result.elapsed).toBe(0);
    expect(result.remaining).toBe(16 * 3600);
    expect(result.progress).toBe(0);
  });

  // --- Midnight crossing ---

  it('correctly computes elapsed across midnight boundary', () => {
    // Start at 10 PM, check at 2 AM next day (4 hours elapsed)
    const activeFast = makeActiveFast({
      startedAt: new Date('2025-01-15T22:00:00Z').toISOString(),
    });
    const now = new Date('2025-01-16T02:00:00Z');
    const result = computeTimerState(activeFast, now);

    expect(result.elapsed).toBe(4 * 3600);
    expect(result.remaining).toBe(12 * 3600);
    expect(result.targetReached).toBe(false);
  });

  it('handles fast started at exact midnight', () => {
    const activeFast = makeActiveFast({
      startedAt: new Date('2025-01-15T00:00:00Z').toISOString(),
    });
    // 8 hours in
    const now = new Date('2025-01-15T08:00:00Z');
    const result = computeTimerState(activeFast, now);

    expect(result.elapsed).toBe(8 * 3600);
    expect(result.remaining).toBe(8 * 3600);
    expect(result.progress).toBeCloseTo(0.5);
  });

  it('handles fast completing exactly at midnight', () => {
    // Start at 8 AM, 16-hour fast completes at midnight
    const activeFast = makeActiveFast({
      startedAt: new Date('2025-01-15T08:00:00Z').toISOString(),
      targetHours: 16,
    });
    const now = new Date('2025-01-16T00:00:00Z');
    const result = computeTimerState(activeFast, now);

    expect(result.elapsed).toBe(16 * 3600);
    expect(result.remaining).toBe(0);
    expect(result.targetReached).toBe(true);
    expect(result.progress).toBe(1);
  });

  // --- DST transitions ---
  // The timer uses UTC ISO timestamps (Date objects), so DST doesn't affect
  // the underlying math. These tests verify that UTC-based computation
  // remains correct during wall-clock DST transitions.

  it('computes correctly across spring-forward DST transition (UTC-based)', () => {
    // US spring forward 2025: March 9, 2:00 AM -> 3:00 AM (local)
    // In UTC, this is just normal passage of time
    // Start at March 8, 11 PM UTC, check 5 hours later
    const activeFast = makeActiveFast({
      startedAt: new Date('2025-03-08T23:00:00Z').toISOString(),
      targetHours: 16,
    });
    const now = new Date('2025-03-09T04:00:00Z'); // 5 hours later
    const result = computeTimerState(activeFast, now);

    expect(result.elapsed).toBe(5 * 3600);
    expect(result.remaining).toBe(11 * 3600);
    expect(result.targetReached).toBe(false);
  });

  it('computes correctly across fall-back DST transition (UTC-based)', () => {
    // US fall back 2025: November 2, 2:00 AM -> 1:00 AM (local)
    // In UTC, still just normal passage of time
    // Start at Nov 1, 10 PM UTC, check 10 hours later
    const activeFast = makeActiveFast({
      startedAt: new Date('2025-11-01T22:00:00Z').toISOString(),
      targetHours: 16,
    });
    const now = new Date('2025-11-02T08:00:00Z'); // 10 hours later
    const result = computeTimerState(activeFast, now);

    expect(result.elapsed).toBe(10 * 3600);
    expect(result.remaining).toBe(6 * 3600);
    expect(result.targetReached).toBe(false);
  });

  // --- 48h+ extended fasts ---

  it('handles 48-hour extended fast mid-way', () => {
    const activeFast = makeActiveFast({ targetHours: 48 });
    // 24 hours in (50% of a 48h fast)
    const now = new Date('2025-01-16T08:00:00Z');
    const result = computeTimerState(activeFast, now);

    expect(result.elapsed).toBe(24 * 3600);
    expect(result.remaining).toBe(24 * 3600);
    expect(result.progress).toBeCloseTo(0.5);
    expect(result.targetReached).toBe(false);
  });

  it('handles 72-hour fast well past target', () => {
    const activeFast = makeActiveFast({ targetHours: 72 });
    // 96 hours in (33% over target)
    const now = new Date('2025-01-19T08:00:00Z');
    const result = computeTimerState(activeFast, now);

    expect(result.elapsed).toBe(96 * 3600);
    expect(result.remaining).toBe(0);
    expect(result.progress).toBe(1); // capped at 1
    expect(result.targetReached).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// formatDuration
// ---------------------------------------------------------------------------

describe('formatDuration', () => {
  it('formats zero seconds', () => {
    expect(formatDuration(0)).toBe('00:00:00');
  });

  it('formats seconds only', () => {
    expect(formatDuration(45)).toBe('00:00:45');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(125)).toBe('00:02:05');
  });

  it('formats hours, minutes, and seconds', () => {
    expect(formatDuration(3661)).toBe('01:01:01');
  });

  it('formats exactly one hour', () => {
    expect(formatDuration(3600)).toBe('01:00:00');
  });

  it('formats large hour values (>24h)', () => {
    // 48 hours
    expect(formatDuration(48 * 3600)).toBe('48:00:00');
  });

  it('formats 16 hours exactly (common fasting target)', () => {
    expect(formatDuration(16 * 3600)).toBe('16:00:00');
  });

  it('pads single-digit values with leading zeros', () => {
    expect(formatDuration(3723)).toBe('01:02:03');
  });

  it('handles large second counts (100+ hours)', () => {
    // 100 hours + 5 min + 30 sec
    expect(formatDuration(100 * 3600 + 5 * 60 + 30)).toBe('100:05:30');
  });

  it('formats exactly 86400 seconds (24 hours)', () => {
    expect(formatDuration(86400)).toBe('24:00:00');
  });

  it('formats 86400+ seconds (over 24 hours)', () => {
    // 25 hours, 30 min, 15 sec = 91815 seconds
    expect(formatDuration(91815)).toBe('25:30:15');
  });

  it('formats 59 seconds', () => {
    expect(formatDuration(59)).toBe('00:00:59');
  });
});
