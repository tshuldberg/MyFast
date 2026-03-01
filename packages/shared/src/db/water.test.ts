import { beforeEach, describe, expect, it } from 'vitest';
import type { Database } from './database';
import { createTestDatabase } from './test-helpers';
import {
  getWaterIntake,
  incrementWaterIntake,
  setWaterTarget,
  setWaterIntakeCount,
  resetWaterIntake,
} from './water';

let db: Database;

beforeEach(() => {
  db = createTestDatabase();
});

describe('water intake', () => {
  it('returns default intake row when none exists', () => {
    const intake = getWaterIntake(db, new Date('2026-01-15T08:00:00.000Z'));
    expect(intake.count).toBe(0);
    expect(intake.target).toBe(8);
    expect(intake.completed).toBe(false);
  });

  it('increments intake count and completion flips at target', () => {
    const date = new Date('2026-01-15T08:00:00.000Z');

    incrementWaterIntake(db, 5, date);
    let intake = getWaterIntake(db, date);
    expect(intake.count).toBe(5);
    expect(intake.completed).toBe(false);

    incrementWaterIntake(db, 3, date);
    intake = getWaterIntake(db, date);
    expect(intake.count).toBe(8);
    expect(intake.completed).toBe(true);
  });

  it('supports changing target and explicit count', () => {
    const date = new Date('2026-01-15T08:00:00.000Z');

    setWaterTarget(db, 10, date);
    setWaterIntakeCount(db, 4, date);

    const intake = getWaterIntake(db, date);
    expect(intake.target).toBe(10);
    expect(intake.count).toBe(4);
    expect(intake.completed).toBe(false);
  });

  it('resets count but preserves target', () => {
    const date = new Date('2026-01-15T08:00:00.000Z');

    setWaterTarget(db, 12, date);
    incrementWaterIntake(db, 6, date);

    const reset = resetWaterIntake(db, date);
    expect(reset.count).toBe(0);
    expect(reset.target).toBe(12);
    expect(reset.completed).toBe(false);
  });
});
