import { describe, it, expect, beforeEach } from 'vitest';
import type { Database } from '../db/database.js';
import { createTestDatabase } from '../db/test-helpers.js';
import { startFast, endFast } from '../db/fasts.js';
import {
  averageDuration,
  adherenceRate,
  weeklyRollup,
  monthlyRollup,
  durationTrend,
} from './aggregation.js';

let db: Database;

beforeEach(() => {
  db = createTestDatabase();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function completeFast(
  startISO: string,
  targetHours: number,
  hitTarget: boolean,
) {
  const started = new Date(startISO);
  startFast(db, '16:8', targetHours, started);
  const durationHours = hitTarget ? targetHours : targetHours - 2;
  const ended = new Date(started.getTime() + durationHours * 3600 * 1000);
  endFast(db, ended);
}

/** Create a completed fast with a specific duration in hours */
function completeFastWithDuration(
  startISO: string,
  targetHours: number,
  actualHours: number,
) {
  const started = new Date(startISO);
  startFast(db, '16:8', targetHours, started);
  const ended = new Date(started.getTime() + actualHours * 3600 * 1000);
  endFast(db, ended);
}

// ---------------------------------------------------------------------------
// averageDuration
// ---------------------------------------------------------------------------

describe('averageDuration', () => {
  it('returns 0 when no completed fasts exist', () => {
    expect(averageDuration(db)).toBe(0);
  });

  it('returns correct average for a single fast', () => {
    completeFastWithDuration('2025-06-10T08:00:00Z', 16, 16);
    // 16 hours = 57600 seconds
    expect(averageDuration(db)).toBe(57600);
  });

  it('returns correct average for multiple fasts', () => {
    // 10h, 14h, 18h => average = 14h = 50400 seconds
    completeFastWithDuration('2025-06-10T08:00:00Z', 16, 10);
    completeFastWithDuration('2025-06-11T08:00:00Z', 16, 14);
    completeFastWithDuration('2025-06-12T08:00:00Z', 16, 18);

    expect(averageDuration(db)).toBe(50400);
  });

  it('excludes active (non-completed) fasts from average', () => {
    completeFastWithDuration('2025-06-10T08:00:00Z', 16, 16);
    // Start but don't end a second fast
    startFast(db, '16:8', 16, new Date('2025-06-11T08:00:00Z'));

    // Average should still be just the one completed fast
    expect(averageDuration(db)).toBe(57600);
  });
});

// ---------------------------------------------------------------------------
// adherenceRate
// ---------------------------------------------------------------------------

describe('adherenceRate', () => {
  it('returns 0 when no completed fasts exist', () => {
    expect(adherenceRate(db)).toBe(0);
  });

  it('returns 100 when all fasts hit target', () => {
    completeFast('2025-06-10T08:00:00Z', 10, true);
    completeFast('2025-06-11T08:00:00Z', 10, true);
    completeFast('2025-06-12T08:00:00Z', 10, true);

    expect(adherenceRate(db)).toBe(100);
  });

  it('returns 0 when no fasts hit target', () => {
    completeFast('2025-06-10T08:00:00Z', 16, false);
    completeFast('2025-06-11T08:00:00Z', 16, false);

    expect(adherenceRate(db)).toBe(0);
  });

  it('returns correct percentage for mixed results', () => {
    // 2 out of 3 hit target = 66.7%
    completeFast('2025-06-10T08:00:00Z', 10, true);
    completeFast('2025-06-11T08:00:00Z', 16, false);
    completeFast('2025-06-12T08:00:00Z', 10, true);

    expect(adherenceRate(db)).toBe(66.7);
  });

  it('returns 50 for 1 out of 2', () => {
    completeFast('2025-06-10T08:00:00Z', 10, true);
    completeFast('2025-06-11T08:00:00Z', 16, false);

    expect(adherenceRate(db)).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// weeklyRollup
// ---------------------------------------------------------------------------

describe('weeklyRollup', () => {
  const today = new Date('2025-06-15T12:00:00Z'); // Sunday

  it('returns exactly 7 entries', () => {
    const result = weeklyRollup(db, today);
    expect(result).toHaveLength(7);
  });

  it('returns zeros for days with no fasts', () => {
    const result = weeklyRollup(db, today);
    for (const day of result) {
      expect(day.totalSeconds).toBe(0);
      expect(day.totalHours).toBe(0);
      expect(day.fastCount).toBe(0);
      expect(day.hitTarget).toBe(false);
    }
  });

  it('returns correct dates spanning 7 days ending at today', () => {
    const result = weeklyRollup(db, today);
    expect(result[0].date).toBe('2025-06-09'); // 6 days ago (Monday)
    expect(result[6].date).toBe('2025-06-15'); // today (Sunday)
  });

  it('shows correct hours and hit_target for days with fasts', () => {
    // Fast on June 12 (Thursday) — 16 hours, hit target
    completeFastWithDuration('2025-06-12T08:00:00Z', 16, 16);

    const result = weeklyRollup(db, today);
    const thursday = result.find((d) => d.date === '2025-06-12');

    expect(thursday).toBeDefined();
    expect(thursday!.totalSeconds).toBe(16 * 3600);
    expect(thursday!.totalHours).toBe(16);
    expect(thursday!.fastCount).toBe(1);
    expect(thursday!.hitTarget).toBe(true);
  });

  it('shows hitTarget false when fast did not hit target', () => {
    completeFast('2025-06-12T08:00:00Z', 16, false);

    const result = weeklyRollup(db, today);
    const thursday = result.find((d) => d.date === '2025-06-12');

    expect(thursday!.hitTarget).toBe(false);
    expect(thursday!.fastCount).toBe(1);
  });

  it('sums multiple fasts on the same day', () => {
    // Two fasts on June 12: 8h + 6h = 14h
    completeFastWithDuration('2025-06-12T06:00:00Z', 8, 8);
    completeFastWithDuration('2025-06-12T16:00:00Z', 6, 6);

    const result = weeklyRollup(db, today);
    const thursday = result.find((d) => d.date === '2025-06-12');

    expect(thursday!.totalSeconds).toBe(14 * 3600);
    expect(thursday!.fastCount).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// monthlyRollup
// ---------------------------------------------------------------------------

describe('monthlyRollup', () => {
  it('returns correct number of days for a given month', () => {
    // June has 30 days
    const result = monthlyRollup(db, 2025, 6);
    expect(result).toHaveLength(30);

    // February 2025 (non-leap) has 28 days
    const feb = monthlyRollup(db, 2025, 2);
    expect(feb).toHaveLength(28);

    // February 2024 (leap) has 29 days
    const febLeap = monthlyRollup(db, 2024, 2);
    expect(febLeap).toHaveLength(29);
  });

  it('returns all "none" when no fasts exist in the month', () => {
    const result = monthlyRollup(db, 2025, 6);
    for (const day of result) {
      expect(day.status).toBe('none');
    }
  });

  it('marks days with target-hit fasts as "hit_target"', () => {
    completeFast('2025-06-10T08:00:00Z', 10, true);

    const result = monthlyRollup(db, 2025, 6);
    const day10 = result.find((d) => d.date === '2025-06-10');
    expect(day10!.status).toBe('hit_target');
  });

  it('marks days with fasts that missed target as "fasted"', () => {
    completeFast('2025-06-10T08:00:00Z', 16, false);

    const result = monthlyRollup(db, 2025, 6);
    const day10 = result.find((d) => d.date === '2025-06-10');
    expect(day10!.status).toBe('fasted');
  });

  it('marks hit_target if any fast that day hit target (mixed)', () => {
    // Two fasts on same day: one miss, one hit
    completeFast('2025-06-10T06:00:00Z', 16, false);
    completeFast('2025-06-10T14:00:00Z', 6, true);

    const result = monthlyRollup(db, 2025, 6);
    const day10 = result.find((d) => d.date === '2025-06-10');
    expect(day10!.status).toBe('hit_target');
  });

  it('generates correct date strings with zero-padded days', () => {
    const result = monthlyRollup(db, 2025, 6);
    expect(result[0].date).toBe('2025-06-01');
    expect(result[8].date).toBe('2025-06-09');
    expect(result[29].date).toBe('2025-06-30');
  });
});

// ---------------------------------------------------------------------------
// durationTrend
// ---------------------------------------------------------------------------

describe('durationTrend', () => {
  const today = new Date('2025-06-15T12:00:00Z');

  it('returns correct number of data points', () => {
    const result = durationTrend(db, 30, today);
    expect(result).toHaveLength(30);
  });

  it('defaults to 30 days', () => {
    const result = durationTrend(db, undefined, today);
    expect(result).toHaveLength(30);
  });

  it('returns zeros for days with no fasts', () => {
    const result = durationTrend(db, 7, today);
    for (const point of result) {
      expect(point.durationSeconds).toBe(0);
      expect(point.durationHours).toBe(0);
    }
  });

  it('returns correct daily duration values', () => {
    completeFastWithDuration('2025-06-14T08:00:00Z', 16, 16);

    const result = durationTrend(db, 7, today);
    const june14 = result.find((p) => p.date === '2025-06-14');

    expect(june14!.durationSeconds).toBe(16 * 3600);
    expect(june14!.durationHours).toBe(16);
  });

  it('returns null movingAverage when fewer than 7 data points accumulated', () => {
    const result = durationTrend(db, 7, today);
    // First 6 entries should have null movingAverage
    for (let i = 0; i < 6; i++) {
      expect(result[i].movingAverage).toBeNull();
    }
  });

  it('computes 7-day moving average correctly', () => {
    // Create fasts on 7 consecutive days, each 10 hours
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      completeFastWithDuration(`${dateStr}T08:00:00Z`, 10, 10);
    }

    const result = durationTrend(db, 7, today);
    // Last entry should have moving average = 10.0 (all days are 10h)
    const last = result[result.length - 1];
    expect(last.movingAverage).toBe(10);
  });

  it('computes moving average with varying durations', () => {
    // 7 days: hours = [8, 10, 12, 14, 16, 18, 20]
    // Average = (8+10+12+14+16+18+20)/7 = 98/7 = 14.0
    const hours = [8, 10, 12, 14, 16, 18, 20];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().slice(0, 10);
      completeFastWithDuration(`${dateStr}T08:00:00Z`, hours[i], hours[i]);
    }

    const result = durationTrend(db, 7, today);
    const last = result[result.length - 1];
    expect(last.movingAverage).toBe(14);
  });

  it('returns dates from oldest to newest', () => {
    const result = durationTrend(db, 7, today);
    expect(result[0].date).toBe('2025-06-09');
    expect(result[6].date).toBe('2025-06-15');
  });
});
