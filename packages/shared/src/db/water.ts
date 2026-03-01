import type { Database } from './database';
import type { WaterIntake } from '../types/index';

interface WaterIntakeRow {
  date: string;
  count: number;
  target: number;
  updated_at: string;
}

function toISODate(date?: Date): string {
  return (date ?? new Date()).toISOString().slice(0, 10);
}

function getDefaultTarget(db: Database): number {
  const row = db.get<{ value: string }>(`SELECT value FROM settings WHERE key = ?`, ['waterDailyTarget']);
  const parsed = Number(row?.value ?? 8);
  if (!Number.isFinite(parsed) || parsed < 1) return 8;
  return Math.round(parsed);
}

function rowToWaterIntake(row: WaterIntakeRow): WaterIntake {
  return {
    date: row.date,
    count: row.count,
    target: row.target,
    completed: row.count >= row.target,
    updatedAt: row.updated_at,
  };
}

/**
 * Get water intake for a specific date. If no row exists, returns a default zero row.
 */
export function getWaterIntake(db: Database, date?: Date): WaterIntake {
  const dateStr = toISODate(date);
  const row = db.get<WaterIntakeRow>(`SELECT * FROM water_intake WHERE date = ?`, [dateStr]);

  if (!row) {
    const target = getDefaultTarget(db);
    return {
      date: dateStr,
      count: 0,
      target,
      completed: false,
      updatedAt: new Date().toISOString(),
    };
  }

  return rowToWaterIntake(row);
}

/**
 * Increment today's water intake count by a positive amount (default: 1).
 */
export function incrementWaterIntake(db: Database, amount: number = 1, date?: Date): WaterIntake {
  const dateStr = toISODate(date);
  const increment = Math.max(1, Math.floor(amount));
  const current = getWaterIntake(db, date);
  const nextCount = current.count + increment;

  db.run(
    `INSERT OR REPLACE INTO water_intake (date, count, target, updated_at) VALUES (?, ?, ?, ?)`,
    [dateStr, nextCount, current.target, new Date().toISOString()],
  );

  return getWaterIntake(db, date);
}

/**
 * Set the target glasses/bottles for a given day.
 */
export function setWaterTarget(db: Database, target: number, date?: Date): WaterIntake {
  const dateStr = toISODate(date);
  const roundedTarget = Math.max(1, Math.round(target));
  const current = getWaterIntake(db, date);

  db.transaction(() => {
    db.run(
      `INSERT OR REPLACE INTO water_intake (date, count, target, updated_at) VALUES (?, ?, ?, ?)`,
      [dateStr, current.count, roundedTarget, new Date().toISOString()],
    );
    db.run(
      `INSERT OR REPLACE INTO settings (key, value) VALUES ('waterDailyTarget', ?)`,
      [String(roundedTarget)],
    );
  });

  return getWaterIntake(db, date);
}

/**
 * Set an explicit water intake count for a specific date.
 */
export function setWaterIntakeCount(db: Database, count: number, date?: Date): WaterIntake {
  const dateStr = toISODate(date);
  const safeCount = Math.max(0, Math.round(count));
  const current = getWaterIntake(db, date);

  db.run(
    `INSERT OR REPLACE INTO water_intake (date, count, target, updated_at) VALUES (?, ?, ?, ?)`,
    [dateStr, safeCount, current.target, new Date().toISOString()],
  );

  return getWaterIntake(db, date);
}

/**
 * Reset today's count to zero while preserving its target.
 */
export function resetWaterIntake(db: Database, date?: Date): WaterIntake {
  return setWaterIntakeCount(db, 0, date);
}
