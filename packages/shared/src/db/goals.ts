import { v4 as uuidv4 } from 'uuid';
import type { Database } from './database';
import type { Goal, GoalDirection, GoalProgress, GoalType } from '../types/index';

interface GoalRow {
  id: string;
  type: GoalType;
  target_value: number;
  period: Goal['period'];
  direction: GoalDirection;
  label: string | null;
  unit: string | null;
  start_date: string;
  end_date: string | null;
  is_active: number;
  created_at: string;
}

interface GoalProgressRow {
  id: string;
  goal_id: string;
  period_start: string;
  period_end: string;
  current_value: number;
  target_value: number;
  completed: number;
  created_at: string;
}

interface DateRange {
  start: string;
  end: string;
}

export interface CreateGoalInput {
  type: GoalType;
  targetValue: number;
  period?: Goal['period'];
  direction?: GoalDirection;
  label?: string | null;
  unit?: string | null;
  startDate?: string;
  endDate?: string | null;
  isActive?: boolean;
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseISODate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function defaultPeriod(type: GoalType): Goal['period'] {
  if (type === 'hours_per_month') return 'monthly';
  if (type === 'weight_milestone') return 'milestone';
  return 'weekly';
}

function defaultDirection(type: GoalType): GoalDirection {
  return type === 'weight_milestone' ? 'at_most' : 'at_least';
}

function defaultUnit(type: GoalType): string {
  switch (type) {
    case 'fasts_per_week':
      return 'fasts';
    case 'hours_per_week':
    case 'hours_per_month':
      return 'hours';
    case 'weight_milestone':
      return 'weight';
    default:
      return '';
  }
}

function rowToGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    type: row.type,
    targetValue: row.target_value,
    period: row.period,
    direction: row.direction,
    label: row.label,
    unit: row.unit,
    startDate: row.start_date,
    endDate: row.end_date,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
  };
}

function rowToGoalProgress(row: GoalProgressRow): GoalProgress {
  return {
    id: row.id,
    goalId: row.goal_id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    currentValue: row.current_value,
    targetValue: row.target_value,
    completed: row.completed === 1,
    createdAt: row.created_at,
  };
}

function getWeekRange(date: Date): DateRange {
  const day = date.getUTCDay();
  const offsetToMonday = day === 0 ? 6 : day - 1;
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - offsetToMonday));
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 6));
  return { start: toISODate(start), end: toISODate(end) };
}

function getMonthRange(date: Date): DateRange {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  return { start: toISODate(start), end: toISODate(end) };
}

function countCompletedFastsInRange(db: Database, range: DateRange): number {
  const row = db.get<{ count: number }>(
    `SELECT COUNT(*) as count
     FROM fasts
     WHERE ended_at IS NOT NULL AND date(started_at) BETWEEN ? AND ?`,
    [range.start, range.end],
  );
  return row?.count ?? 0;
}

function completedHoursInRange(db: Database, range: DateRange): number {
  const row = db.get<{ seconds: number | null }>(
    `SELECT COALESCE(SUM(duration_seconds), 0) as seconds
     FROM fasts
     WHERE ended_at IS NOT NULL AND date(started_at) BETWEEN ? AND ?`,
    [range.start, range.end],
  );
  return Math.round((((row?.seconds ?? 0) / 3600) + Number.EPSILON) * 10) / 10;
}

function latestWeightEntry(db: Database): { weight: number; date: string } | null {
  const row = db.get<{ weight_value: number; date: string }>(
    `SELECT weight_value, date
     FROM weight_entries
     ORDER BY date DESC, created_at DESC
     LIMIT 1`,
  );

  if (!row) return null;
  return { weight: row.weight_value, date: row.date };
}

function isGoalCompleted(goal: Goal, currentValue: number): boolean {
  if (goal.direction === 'at_most') {
    return currentValue <= goal.targetValue;
  }
  return currentValue >= goal.targetValue;
}

function getRangeForGoal(goal: Goal, asOf: Date): DateRange {
  if (goal.period === 'monthly' || goal.type === 'hours_per_month') {
    return getMonthRange(asOf);
  }

  if (goal.period === 'weekly' || goal.type === 'fasts_per_week' || goal.type === 'hours_per_week') {
    return getWeekRange(asOf);
  }

  return {
    start: goal.startDate,
    end: toISODate(asOf),
  };
}

function computeGoalCurrentValue(db: Database, goal: Goal, range: DateRange): number {
  switch (goal.type) {
    case 'fasts_per_week':
      return countCompletedFastsInRange(db, range);
    case 'hours_per_week':
    case 'hours_per_month':
      return completedHoursInRange(db, range);
    case 'weight_milestone': {
      const latest = latestWeightEntry(db);
      return latest?.weight ?? 0;
    }
    default:
      return 0;
  }
}

export function createGoal(db: Database, input: CreateGoalInput): Goal {
  const id = uuidv4();
  const now = new Date();
  const startDate = input.startDate ?? toISODate(now);
  const goal: Goal = {
    id,
    type: input.type,
    targetValue: Math.max(0, input.targetValue),
    period: input.period ?? defaultPeriod(input.type),
    direction: input.direction ?? defaultDirection(input.type),
    label: input.label ?? null,
    unit: input.unit ?? defaultUnit(input.type),
    startDate,
    endDate: input.endDate ?? null,
    isActive: input.isActive ?? true,
    createdAt: now.toISOString(),
  };

  upsertGoal(db, goal);
  return goal;
}

export function upsertGoal(db: Database, goal: Goal): void {
  db.run(
    `INSERT OR REPLACE INTO goals (
      id,
      type,
      target_value,
      period,
      direction,
      label,
      unit,
      start_date,
      end_date,
      is_active,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      goal.id,
      goal.type,
      goal.targetValue,
      goal.period,
      goal.direction,
      goal.label,
      goal.unit,
      goal.startDate,
      goal.endDate,
      goal.isActive ? 1 : 0,
      goal.createdAt,
    ],
  );
}

export function listGoals(db: Database, includeInactive: boolean = false): Goal[] {
  const rows = db.all<GoalRow>(
    includeInactive
      ? `SELECT * FROM goals ORDER BY created_at DESC`
      : `SELECT * FROM goals WHERE is_active = 1 ORDER BY created_at DESC`,
  );
  return rows.map(rowToGoal);
}

export function getGoal(db: Database, goalId: string): Goal | null {
  const row = db.get<GoalRow>(`SELECT * FROM goals WHERE id = ?`, [goalId]);
  return row ? rowToGoal(row) : null;
}

export function archiveGoal(db: Database, goalId: string, endDate?: string): boolean {
  const goal = getGoal(db, goalId);
  if (!goal) return false;

  db.run(
    `UPDATE goals SET is_active = 0, end_date = ? WHERE id = ?`,
    [endDate ?? toISODate(new Date()), goalId],
  );
  return true;
}

export function deleteGoal(db: Database, goalId: string): boolean {
  db.run(`DELETE FROM goal_progress WHERE goal_id = ?`, [goalId]);
  db.run(`DELETE FROM goals WHERE id = ?`, [goalId]);

  const row = db.get<{ count: number }>(`SELECT COUNT(*) as count FROM goals WHERE id = ?`, [goalId]);
  return (row?.count ?? 0) === 0;
}

export function getGoalProgress(db: Database, goalId: string, asOf?: Date): GoalProgress | null {
  const goal = getGoal(db, goalId);
  if (!goal) return null;

  const now = asOf ?? new Date();
  const range = getRangeForGoal(goal, now);
  const currentValue = computeGoalCurrentValue(db, goal, range);

  return {
    id: uuidv4(),
    goalId: goal.id,
    periodStart: range.start,
    periodEnd: range.end,
    currentValue,
    targetValue: goal.targetValue,
    completed: isGoalCompleted(goal, currentValue),
    createdAt: now.toISOString(),
  };
}

export function refreshGoalProgress(db: Database, asOf?: Date): GoalProgress[] {
  const now = asOf ?? new Date();
  const goals = listGoals(db, false);
  const snapshots: GoalProgress[] = [];

  for (const goal of goals) {
    if (!goal.isActive) continue;

    const range = getRangeForGoal(goal, now);
    if (parseISODate(range.start).getTime() < parseISODate(goal.startDate).getTime()) {
      continue;
    }

    if (goal.endDate && parseISODate(range.start).getTime() > parseISODate(goal.endDate).getTime()) {
      continue;
    }

    const currentValue = computeGoalCurrentValue(db, goal, range);
    const completed = isGoalCompleted(goal, currentValue);

    const existing = db.get<{ id: string }>(
      `SELECT id FROM goal_progress WHERE goal_id = ? AND period_start = ? AND period_end = ?`,
      [goal.id, range.start, range.end],
    );

    const id = existing?.id ?? uuidv4();
    const createdAt = now.toISOString();

    db.run(
      `INSERT OR REPLACE INTO goal_progress (
        id,
        goal_id,
        period_start,
        period_end,
        current_value,
        target_value,
        completed,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, goal.id, range.start, range.end, currentValue, goal.targetValue, completed ? 1 : 0, createdAt],
    );

    snapshots.push({
      id,
      goalId: goal.id,
      periodStart: range.start,
      periodEnd: range.end,
      currentValue,
      targetValue: goal.targetValue,
      completed,
      createdAt,
    });
  }

  return snapshots;
}

export function listGoalProgress(db: Database, goalId: string, limit: number = 26): GoalProgress[] {
  const rows = db.all<GoalProgressRow>(
    `SELECT * FROM goal_progress WHERE goal_id = ? ORDER BY period_start DESC LIMIT ?`,
    [goalId, limit],
  );
  return rows.map(rowToGoalProgress);
}
