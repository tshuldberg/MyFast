import { v4 as uuidv4 } from 'uuid';
import type { Database } from './database';
import type { ActiveFast, Fast } from '../types/index';

/** Row shape from the fasts table */
interface FastRow {
  id: string;
  protocol: string;
  target_hours: number;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  hit_target: number | null;
  notes: string | null;
  created_at: string;
}

/** Row shape from the active_fast table */
interface ActiveFastRow {
  id: string;
  fast_id: string;
  protocol: string;
  target_hours: number;
  started_at: string;
}

function rowToFast(row: FastRow): Fast {
  return {
    id: row.id,
    protocol: row.protocol,
    targetHours: row.target_hours,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationSeconds: row.duration_seconds,
    hitTarget: row.hit_target === null ? null : row.hit_target === 1,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

function rowToActiveFast(row: ActiveFastRow): ActiveFast {
  return {
    id: row.id,
    fastId: row.fast_id,
    protocol: row.protocol,
    targetHours: row.target_hours,
    startedAt: row.started_at,
  };
}

/**
 * Start a new fast. Creates a row in `fasts` and a singleton row in `active_fast`.
 * Throws if a fast is already active.
 */
export function startFast(
  db: Database,
  protocol: string,
  targetHours: number,
  startedAt?: Date,
): Fast {
  const existing = getActiveFast(db);
  if (existing) {
    throw new Error('A fast is already active. End the current fast before starting a new one.');
  }

  const id = uuidv4();
  const started = (startedAt ?? new Date()).toISOString();

  db.transaction(() => {
    db.run(
      `INSERT INTO fasts (id, protocol, target_hours, started_at) VALUES (?, ?, ?, ?)`,
      [id, protocol, targetHours, started],
    );
    db.run(
      `INSERT INTO active_fast (id, fast_id, protocol, target_hours, started_at) VALUES ('current', ?, ?, ?, ?)`,
      [id, protocol, targetHours, started],
    );
  });

  return {
    id,
    protocol,
    targetHours,
    startedAt: started,
    endedAt: null,
    durationSeconds: null,
    hitTarget: null,
    notes: null,
    createdAt: started,
  };
}

/**
 * End the currently active fast.
 * Computes duration and hit_target, removes the active_fast row.
 * Returns the completed fast, or null if no fast is active.
 */
export function endFast(
  db: Database,
  endedAt?: Date,
  notes?: string,
): Fast | null {
  const active = getActiveFast(db);
  if (!active) {
    return null;
  }

  const ended = (endedAt ?? new Date()).toISOString();
  const startMs = new Date(active.startedAt).getTime();
  const endMs = new Date(ended).getTime();
  const durationSeconds = Math.floor((endMs - startMs) / 1000);
  const hitTarget = durationSeconds >= active.targetHours * 3600 ? 1 : 0;

  db.transaction(() => {
    db.run(
      `UPDATE fasts SET ended_at = ?, duration_seconds = ?, hit_target = ?, notes = ? WHERE id = ?`,
      [ended, durationSeconds, hitTarget, notes ?? null, active.fastId],
    );
    db.run(`DELETE FROM active_fast WHERE id = 'current'`);
  });

  const row = db.get<FastRow>(`SELECT * FROM fasts WHERE id = ?`, [active.fastId]);
  return row ? rowToFast(row) : null;
}

/** Get the currently active fast, or null if none */
export function getActiveFast(db: Database): ActiveFast | null {
  const row = db.get<ActiveFastRow>(
    `SELECT * FROM active_fast WHERE id = 'current'`,
  );
  return row ? rowToActiveFast(row) : null;
}

/** Get a single fast by ID */
export function getFast(db: Database, id: string): Fast | null {
  const row = db.get<FastRow>(`SELECT * FROM fasts WHERE id = ?`, [id]);
  return row ? rowToFast(row) : null;
}

/** Options for listing fasts */
export interface ListFastsOptions {
  limit?: number;
  offset?: number;
}

/** List completed fasts, newest first. Paginated. */
export function listFasts(
  db: Database,
  options: ListFastsOptions = {},
): Fast[] {
  const { limit = 50, offset = 0 } = options;
  const rows = db.all<FastRow>(
    `SELECT * FROM fasts WHERE ended_at IS NOT NULL ORDER BY started_at DESC LIMIT ? OFFSET ?`,
    [limit, offset],
  );
  return rows.map(rowToFast);
}

/** Count total completed fasts */
export function countFasts(db: Database): number {
  const row = db.get<{ count: number }>(
    `SELECT COUNT(*) as count FROM fasts WHERE ended_at IS NOT NULL`,
  );
  return row?.count ?? 0;
}

/** Delete a fast by ID. Also removes active_fast if it was the active one. */
export function deleteFast(db: Database, id: string): boolean {
  db.transaction(() => {
    db.run(`DELETE FROM active_fast WHERE fast_id = ?`, [id]);
    db.run(`DELETE FROM fasts WHERE id = ?`, [id]);
  });

  // Check if it was actually deleted
  const row = db.get<FastRow>(`SELECT * FROM fasts WHERE id = ?`, [id]);
  return row === undefined;
}
