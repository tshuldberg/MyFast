import { beforeEach, describe, expect, it } from 'vitest';
import type { Database } from './database';
import { createTestDatabase } from './test-helpers';
import { startFast, endFast } from './fasts';
import { createGoal, getGoalProgress, refreshGoalProgress, listGoalProgress } from './goals';

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

describe('goals', () => {
  it('computes weekly fast count goal progress', () => {
    const goal = createGoal(db, {
      type: 'fasts_per_week',
      targetValue: 5,
      label: 'Weekly consistency',
    });

    completeFast('2026-01-05T08:00:00.000Z', 16);
    completeFast('2026-01-06T08:00:00.000Z', 16);
    completeFast('2026-01-07T08:00:00.000Z', 16);

    const progress = getGoalProgress(db, goal.id, new Date('2026-01-07T20:00:00.000Z'));
    expect(progress).not.toBeNull();
    expect(progress!.currentValue).toBe(3);
    expect(progress!.targetValue).toBe(5);
    expect(progress!.completed).toBe(false);
  });

  it('computes weekly hours goal progress', () => {
    const goal = createGoal(db, {
      type: 'hours_per_week',
      targetValue: 40,
      label: 'Weekly fasting hours',
    });

    completeFast('2026-01-05T08:00:00.000Z', 16);
    completeFast('2026-01-06T08:00:00.000Z', 18);

    const progress = getGoalProgress(db, goal.id, new Date('2026-01-06T20:00:00.000Z'));
    expect(progress).not.toBeNull();
    expect(progress!.currentValue).toBe(34);
    expect(progress!.completed).toBe(false);
  });

  it('computes monthly hours goal as completed when target reached', () => {
    const goal = createGoal(db, {
      type: 'hours_per_month',
      targetValue: 30,
      label: 'Monthly hours',
    });

    completeFast('2026-01-01T08:00:00.000Z', 16);
    completeFast('2026-01-03T08:00:00.000Z', 16);

    const progress = getGoalProgress(db, goal.id, new Date('2026-01-15T00:00:00.000Z'));
    expect(progress).not.toBeNull();
    expect(progress!.currentValue).toBe(32);
    expect(progress!.completed).toBe(true);
  });

  it('refreshGoalProgress writes a single updatable row per period', () => {
    const goal = createGoal(db, {
      type: 'fasts_per_week',
      targetValue: 2,
      startDate: '2026-01-01',
    });

    completeFast('2026-01-05T08:00:00.000Z', 16);

    refreshGoalProgress(db, new Date('2026-01-05T20:00:00.000Z'));
    refreshGoalProgress(db, new Date('2026-01-06T20:00:00.000Z'));

    const rows = listGoalProgress(db, goal.id, 10);
    expect(rows).toHaveLength(1);
    expect(rows[0].currentValue).toBe(1);
    expect(rows[0].completed).toBe(false);
  });
});
