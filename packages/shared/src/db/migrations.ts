import type { Database } from './database.js';
import { ALL_TABLES } from './schema.js';
import { seedProtocols, seedSettings } from './seed.js';

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
