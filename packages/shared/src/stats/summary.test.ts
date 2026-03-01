import { beforeEach, describe, expect, it } from 'vitest';
import type { Database } from '../db/database';
import { createTestDatabase } from '../db/test-helpers';
import { startFast, endFast } from '../db/fasts';
import { refreshStreakCache } from './streaks';
import { getMonthlySummary, getAnnualSummary, formatSummaryShareText } from './summary';

let db: Database;

beforeEach(() => {
  db = createTestDatabase();
});

function completeFast(startISO: string, durationHours: number, targetHours: number = 16) {
  const started = new Date(startISO);
  startFast(db, '16:8', targetHours, started);
  const ended = new Date(started.getTime() + durationHours * 3600 * 1000);
  endFast(db, ended);
}

describe('summary stats', () => {
  it('builds monthly summary metrics', () => {
    completeFast('2026-01-01T08:00:00.000Z', 16);
    completeFast('2026-01-03T08:00:00.000Z', 18);
    refreshStreakCache(db);

    const summary = getMonthlySummary(db, 2026, 1);
    expect(summary.totalFasts).toBe(2);
    expect(summary.totalHours).toBe(34);
    expect(summary.averageDurationHours).toBe(17);
    expect(summary.longestFastHours).toBe(18);
    expect(summary.adherenceRate).toBe(100);
    expect(summary.currentStreak).toBeGreaterThanOrEqual(0);
  });

  it('builds annual summary metrics', () => {
    completeFast('2026-01-01T08:00:00.000Z', 16);
    completeFast('2026-06-10T08:00:00.000Z', 14, 16); // missed target

    const summary = getAnnualSummary(db, 2026);
    expect(summary.totalFasts).toBe(2);
    expect(summary.totalHours).toBe(30);
    expect(summary.longestFastHours).toBe(16);
    expect(summary.adherenceRate).toBe(50);
  });

  it('formats share text', () => {
    const text = formatSummaryShareText(
      {
        totalFasts: 10,
        totalHours: 160,
        averageDurationHours: 16,
        longestFastHours: 24,
        adherenceRate: 90,
        currentStreak: 5,
      },
      'January 2026',
    );

    expect(text).toContain('January 2026 Summary');
    expect(text).toContain('Total fasts: 10');
    expect(text).toContain('Adherence: 90%');
  });
});
