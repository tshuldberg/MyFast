/**
 * Test helper: in-memory SQLite backed by better-sqlite3,
 * implementing the Database interface from database.ts.
 */
import BetterSqlite3 from 'better-sqlite3';
import type { Database } from './database';
import { initDatabase } from './migrations';

/** Create an in-memory Database, with schema already migrated. */
export function createTestDatabase(): Database {
  const raw = new BetterSqlite3(':memory:');
  raw.pragma('journal_mode = WAL');
  raw.pragma('foreign_keys = ON');

  const db: Database = {
    run(sql: string, params: unknown[] = []) {
      raw.prepare(sql).run(...params);
    },
    get<T>(sql: string, params: unknown[] = []): T | undefined {
      return raw.prepare(sql).get(...params) as T | undefined;
    },
    all<T>(sql: string, params: unknown[] = []): T[] {
      return raw.prepare(sql).all(...params) as T[];
    },
    transaction(fn: () => void) {
      raw.transaction(fn)();
    },
  };

  initDatabase(db);
  return db;
}
