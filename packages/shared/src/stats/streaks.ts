import type { Database } from '../db/database';
import type { StreakCache } from '../types/index';

/**
 * Compute streak data from the fasts table.
 *
 * Rules:
 * - A fast "counts" for the day it was STARTED (not ended).
 * - A day is a "streak day" if at least one fast started on that day hit its target.
 * - Current streak = consecutive days (ending at today or yesterday) with at least one target-hit fast.
 * - Longest streak = all-time max consecutive target-hit days.
 */
export function computeStreaks(db: Database): StreakCache {
  // Get all distinct dates (YYYY-MM-DD, based on started_at local date) that had a target-hit fast
  // Using date() extracts the date portion of the ISO timestamp in SQLite
  const rows = db.all<{ fast_date: string }>(
    `SELECT DISTINCT date(started_at) as fast_date
     FROM fasts
     WHERE hit_target = 1 AND ended_at IS NOT NULL
     ORDER BY fast_date DESC`,
  );

  const totalRow = db.get<{ count: number }>(
    `SELECT COUNT(*) as count FROM fasts WHERE ended_at IS NOT NULL`,
  );
  const totalFasts = totalRow?.count ?? 0;

  if (rows.length === 0) {
    return { currentStreak: 0, longestStreak: 0, totalFasts };
  }

  // Convert to date strings sorted newest first (already from query)
  const dates = rows.map((r) => r.fast_date);

  // Parse a YYYY-MM-DD string into a day-only timestamp for comparison
  function toDayNumber(dateStr: string): number {
    const [y, m, d] = dateStr.split('-').map(Number);
    // Use UTC to avoid timezone issues in the math
    return Date.UTC(y, m - 1, d) / 86_400_000;
  }

  const dayNumbers = dates.map(toDayNumber);

  // Today's day number for checking if current streak is active
  const now = new Date();
  const todayDayNumber = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000);

  // Compute current streak: consecutive days starting from the most recent,
  // but only if the most recent day is today or yesterday
  let currentStreak = 0;
  const mostRecentDay = dayNumbers[0];

  if (todayDayNumber - mostRecentDay <= 1) {
    // Streak is active (last hit day is today or yesterday)
    currentStreak = 1;
    for (let i = 1; i < dayNumbers.length; i++) {
      if (dayNumbers[i - 1] - dayNumbers[i] === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // Compute longest streak: scan all dates for max consecutive run
  let longestStreak = 1;
  let runLength = 1;
  for (let i = 1; i < dayNumbers.length; i++) {
    if (dayNumbers[i - 1] - dayNumbers[i] === 1) {
      runLength++;
      if (runLength > longestStreak) {
        longestStreak = runLength;
      }
    } else {
      runLength = 1;
    }
  }

  return { currentStreak, longestStreak, totalFasts };
}

/** Recompute streaks and write to the streak_cache table */
export function refreshStreakCache(db: Database): StreakCache {
  const streaks = computeStreaks(db);

  db.transaction(() => {
    const now = new Date().toISOString();
    const entries: [string, number][] = [
      ['current_streak', streaks.currentStreak],
      ['longest_streak', streaks.longestStreak],
      ['total_fasts', streaks.totalFasts],
    ];

    for (const [key, value] of entries) {
      db.run(
        `INSERT OR REPLACE INTO streak_cache (key, value, updated_at) VALUES (?, ?, ?)`,
        [key, value, now],
      );
    }
  });

  return streaks;
}

/** Read cached streak values. Falls back to computing if cache is empty. */
export function getStreaks(db: Database): StreakCache {
  const currentRow = db.get<{ value: number }>(`SELECT value FROM streak_cache WHERE key = 'current_streak'`);
  const longestRow = db.get<{ value: number }>(`SELECT value FROM streak_cache WHERE key = 'longest_streak'`);
  const totalRow = db.get<{ value: number }>(`SELECT value FROM streak_cache WHERE key = 'total_fasts'`);

  if (currentRow !== undefined && longestRow !== undefined && totalRow !== undefined) {
    return {
      currentStreak: currentRow.value,
      longestStreak: longestRow.value,
      totalFasts: totalRow.value,
    };
  }

  // Cache is empty or incomplete — compute fresh
  return refreshStreakCache(db);
}
