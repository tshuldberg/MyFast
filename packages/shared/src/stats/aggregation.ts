import type { Database } from '../db/database';

/** Average fasting duration in seconds across all completed fasts */
export function averageDuration(db: Database): number {
  const row = db.get<{ avg_duration: number | null }>(
    `SELECT AVG(duration_seconds) as avg_duration FROM fasts WHERE ended_at IS NOT NULL AND duration_seconds IS NOT NULL`,
  );
  return row?.avg_duration ?? 0;
}

/** Adherence rate: % of completed fasts that hit their target (0-100) */
export function adherenceRate(db: Database): number {
  const row = db.get<{ total: number; hits: number }>(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN hit_target = 1 THEN 1 ELSE 0 END) as hits
     FROM fasts
     WHERE ended_at IS NOT NULL`,
  );
  if (!row || row.total === 0) return 0;
  return Math.round((row.hits / row.total) * 100 * 10) / 10;
}

/** A single day's fasting summary */
export interface DaySummary {
  date: string; // YYYY-MM-DD
  totalSeconds: number;
  totalHours: number;
  fastCount: number;
  hitTarget: boolean; // at least one fast hit target that day
}

/**
 * Weekly rollup: fasting hours per day for the past 7 days.
 * Returns exactly 7 entries (including days with no fasts).
 */
export function weeklyRollup(db: Database, today?: Date): DaySummary[] {
  const ref = today ?? new Date();
  const results: DaySummary[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(ref);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);

    const row = db.get<{ total_seconds: number | null; fast_count: number; hits: number }>(
      `SELECT
         COALESCE(SUM(duration_seconds), 0) as total_seconds,
         COUNT(*) as fast_count,
         SUM(CASE WHEN hit_target = 1 THEN 1 ELSE 0 END) as hits
       FROM fasts
       WHERE date(started_at) = ? AND ended_at IS NOT NULL`,
      [dateStr],
    );

    results.push({
      date: dateStr,
      totalSeconds: row?.total_seconds ?? 0,
      totalHours: Math.round(((row?.total_seconds ?? 0) / 3600) * 10) / 10,
      fastCount: row?.fast_count ?? 0,
      hitTarget: (row?.hits ?? 0) > 0,
    });
  }

  return results;
}

/** A single day's status for the monthly heatmap */
export interface MonthDay {
  date: string; // YYYY-MM-DD
  status: 'none' | 'fasted' | 'hit_target';
}

/**
 * Monthly rollup for heatmap display.
 * Returns one entry per day of the given month.
 */
export function monthlyRollup(db: Database, year: number, month: number): MonthDay[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const results: MonthDay[] = [];

  // Fetch all days with fasts in a single query
  const rows = db.all<{ fast_date: string; hits: number; total: number }>(
    `SELECT
       date(started_at) as fast_date,
       SUM(CASE WHEN hit_target = 1 THEN 1 ELSE 0 END) as hits,
       COUNT(*) as total
     FROM fasts
     WHERE date(started_at) LIKE ? AND ended_at IS NOT NULL
     GROUP BY date(started_at)`,
    [`${monthStr}-%`],
  );

  const dayMap = new Map<string, { hits: number; total: number }>();
  for (const row of rows) {
    dayMap.set(row.fast_date, { hits: row.hits, total: row.total });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${monthStr}-${String(d).padStart(2, '0')}`;
    const data = dayMap.get(dateStr);

    let status: MonthDay['status'] = 'none';
    if (data && data.total > 0) {
      status = data.hits > 0 ? 'hit_target' : 'fasted';
    }

    results.push({ date: dateStr, status });
  }

  return results;
}

/** A single day's duration data point for trend charts */
export interface DurationPoint {
  date: string; // YYYY-MM-DD
  durationSeconds: number;
  durationHours: number;
  movingAverage: number | null; // 7-day moving average in hours (null if <7 data points)
}

/**
 * Duration trend: daily total fasting durations for the past N days
 * with a 7-day moving average.
 */
export function durationTrend(db: Database, days: number = 30, today?: Date): DurationPoint[] {
  const ref = today ?? new Date();
  const results: DurationPoint[] = [];
  const hourValues: number[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(ref);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);

    const row = db.get<{ total_seconds: number | null }>(
      `SELECT COALESCE(SUM(duration_seconds), 0) as total_seconds
       FROM fasts
       WHERE date(started_at) = ? AND ended_at IS NOT NULL`,
      [dateStr],
    );

    const totalSeconds = row?.total_seconds ?? 0;
    const totalHours = Math.round((totalSeconds / 3600) * 10) / 10;
    hourValues.push(totalHours);

    // Compute 7-day moving average
    let movingAverage: number | null = null;
    if (hourValues.length >= 7) {
      const window = hourValues.slice(-7);
      const sum = window.reduce((a, b) => a + b, 0);
      movingAverage = Math.round((sum / 7) * 10) / 10;
    }

    results.push({
      date: dateStr,
      durationSeconds: totalSeconds,
      durationHours: totalHours,
      movingAverage,
    });
  }

  return results;
}
