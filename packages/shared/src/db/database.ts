/**
 * Thin database abstraction layer.
 * Consumers provide an implementation backed by expo-sqlite (mobile)
 * or better-sqlite3 (web/Node).
 */

/** Database interface that any SQLite driver must implement */
export interface Database {
  /** Execute a write statement (INSERT, UPDATE, DELETE, CREATE, etc.) */
  run(sql: string, params?: unknown[]): void;

  /** Get a single row (or undefined if no match) */
  get<T = Record<string, unknown>>(sql: string, params?: unknown[]): T | undefined;

  /** Get all matching rows */
  all<T = Record<string, unknown>>(sql: string, params?: unknown[]): T[];

  /** Execute multiple statements inside a transaction. Rolls back on error. */
  transaction(fn: () => void): void;
}
