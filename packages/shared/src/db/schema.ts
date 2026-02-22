/**
 * SQLite schema definitions for MyFast.
 * Pure SQL strings — no driver dependency.
 */

export const CREATE_FASTS = `
CREATE TABLE IF NOT EXISTS fasts (
    id TEXT PRIMARY KEY,
    protocol TEXT NOT NULL,
    target_hours REAL NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    duration_seconds INTEGER,
    hit_target INTEGER,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`;

export const CREATE_FASTS_INDEXES = [
  `CREATE INDEX IF NOT EXISTS fasts_started_idx ON fasts(started_at)`,
  `CREATE INDEX IF NOT EXISTS fasts_protocol_idx ON fasts(protocol)`,
  `CREATE INDEX IF NOT EXISTS fasts_hit_target_idx ON fasts(hit_target)`,
];

export const CREATE_WEIGHT_ENTRIES = `
CREATE TABLE IF NOT EXISTS weight_entries (
    id TEXT PRIMARY KEY,
    weight_value REAL NOT NULL,
    unit TEXT NOT NULL DEFAULT 'lbs',
    date TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`;

export const CREATE_WEIGHT_ENTRIES_INDEXES = [
  `CREATE INDEX IF NOT EXISTS weight_date_idx ON weight_entries(date)`,
];

export const CREATE_PROTOCOLS = `
CREATE TABLE IF NOT EXISTS protocols (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    fasting_hours REAL NOT NULL,
    eating_hours REAL NOT NULL,
    description TEXT,
    is_custom INTEGER NOT NULL DEFAULT 0,
    is_default INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0
)`;

export const CREATE_STREAK_CACHE = `
CREATE TABLE IF NOT EXISTS streak_cache (
    key TEXT PRIMARY KEY,
    value INTEGER NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)`;

export const CREATE_ACTIVE_FAST = `
CREATE TABLE IF NOT EXISTS active_fast (
    id TEXT PRIMARY KEY DEFAULT 'current',
    fast_id TEXT NOT NULL REFERENCES fasts(id) ON DELETE CASCADE,
    protocol TEXT NOT NULL,
    target_hours REAL NOT NULL,
    started_at TEXT NOT NULL
)`;

export const CREATE_SETTINGS = `
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
)`;

export const CREATE_SCHEMA_VERSION = `
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
)`;

/** All table creation statements in dependency order */
export const ALL_TABLES = [
  CREATE_SCHEMA_VERSION,
  CREATE_FASTS,
  ...CREATE_FASTS_INDEXES,
  CREATE_WEIGHT_ENTRIES,
  ...CREATE_WEIGHT_ENTRIES_INDEXES,
  CREATE_PROTOCOLS,
  CREATE_STREAK_CACHE,
  CREATE_ACTIVE_FAST,
  CREATE_SETTINGS,
];
