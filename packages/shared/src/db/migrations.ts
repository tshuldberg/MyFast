import type { Database } from './database';
import {
  ALL_TABLES,
  CREATE_GOALS,
  CREATE_GOALS_INDEXES,
  CREATE_GOAL_PROGRESS,
  CREATE_GOAL_PROGRESS_INDEXES,
  CREATE_NOTIFICATIONS_CONFIG,
  CREATE_WATER_INTAKE,
  CREATE_WATER_INTAKE_INDEXES,
} from './schema';
import { seedProtocols, seedSettings, seedNotificationConfig } from './seed';

/** A single migration step */
export interface Migration {
  version: number;
  description: string;
  up: (db: Database) => void;
}

/** All migrations in order. Add new migrations at the end. */
export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: 'Initial schema — fasts, weight_entries, protocols, streak_cache, active_fast, settings, schema_version',
    up: (db: Database) => {
      for (const sql of ALL_TABLES) {
        db.run(sql);
      }
      seedProtocols(db);
      seedSettings(db);
      seedNotificationConfig(db);
    },
  },
  {
    version: 2,
    description: 'Feature set 1 schema - water intake, goals, goal progress, notifications config',
    up: (db: Database) => {
      db.run(CREATE_WATER_INTAKE);
      for (const sql of CREATE_WATER_INTAKE_INDEXES) {
        db.run(sql);
      }
      db.run(CREATE_GOALS);
      for (const sql of CREATE_GOALS_INDEXES) {
        db.run(sql);
      }
      db.run(CREATE_GOAL_PROGRESS);
      for (const sql of CREATE_GOAL_PROGRESS_INDEXES) {
        db.run(sql);
      }
      db.run(CREATE_NOTIFICATIONS_CONFIG);
      seedSettings(db);
      seedNotificationConfig(db);
    },
  },
];

/** Get the current schema version (0 if no version table exists) */
function getCurrentVersion(db: Database): number {
  try {
    const row = db.get<{ version: number }>(
      `SELECT MAX(version) as version FROM schema_version`,
    );
    return row?.version ?? 0;
  } catch {
    // Table doesn't exist yet
    return 0;
  }
}

/**
 * Run all pending migrations inside a transaction.
 * Returns the version after migration.
 */
export function migrate(db: Database): number {
  const current = getCurrentVersion(db);
  const pending = MIGRATIONS.filter((m) => m.version > current);

  if (pending.length === 0) {
    return current;
  }

  db.transaction(() => {
    for (const migration of pending) {
      migration.up(db);
      db.run(
        `INSERT INTO schema_version (version) VALUES (?)`,
        [migration.version],
      );
    }
  });

  return pending[pending.length - 1].version;
}

/**
 * Initialize the database: run all pending migrations.
 * Safe to call on every app launch — skips already-applied migrations.
 */
export function initDatabase(db: Database): number {
  return migrate(db);
}
