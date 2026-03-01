import { describe, it, expect, beforeEach } from 'vitest';
import type { Database } from './database';
import { createTestDatabase } from './test-helpers';
import {
  startFast,
  endFast,
  getActiveFast,
  getFast,
  listFasts,
  countFasts,
  deleteFast,
} from './fasts';

let db: Database;

beforeEach(() => {
  db = createTestDatabase();
});

// ---------------------------------------------------------------------------
// startFast
// ---------------------------------------------------------------------------

describe('startFast', () => {
  it('creates a fast with correct fields', () => {
    const started = new Date('2025-06-01T08:00:00Z');
    const fast = startFast(db, '16:8', 16, started);

    expect(fast.id).toBeTruthy();
    expect(fast.protocol).toBe('16:8');
    expect(fast.targetHours).toBe(16);
    expect(fast.startedAt).toBe(started.toISOString());
    expect(fast.endedAt).toBeNull();
    expect(fast.durationSeconds).toBeNull();
    expect(fast.hitTarget).toBeNull();
    expect(fast.notes).toBeNull();
  });

  it('creates an active_fast singleton row', () => {
    const started = new Date('2025-06-01T08:00:00Z');
    startFast(db, '16:8', 16, started);

    const active = getActiveFast(db);
    expect(active).not.toBeNull();
    expect(active!.protocol).toBe('16:8');
    expect(active!.targetHours).toBe(16);
    expect(active!.startedAt).toBe(started.toISOString());
  });

  it('links active_fast.fastId to the fasts row', () => {
    const fast = startFast(db, '16:8', 16, new Date('2025-06-01T08:00:00Z'));
    const active = getActiveFast(db);

    expect(active!.fastId).toBe(fast.id);
  });

  it('throws when starting a fast while one is already active', () => {
    startFast(db, '16:8', 16, new Date('2025-06-01T08:00:00Z'));

    expect(() => {
      startFast(db, '18:6', 18, new Date('2025-06-01T10:00:00Z'));
    }).toThrow('A fast is already active');
  });

  it('generates unique IDs for each fast', () => {
    const fast1 = startFast(db, '16:8', 16, new Date('2025-06-01T08:00:00Z'));
    endFast(db, new Date('2025-06-02T00:00:00Z'));
    const fast2 = startFast(db, '18:6', 18, new Date('2025-06-02T08:00:00Z'));

    expect(fast1.id).not.toBe(fast2.id);
  });

  it('uses current time when startedAt is not provided', () => {
    const before = new Date();
    const fast = startFast(db, '16:8', 16);
    const after = new Date();

    const started = new Date(fast.startedAt);
    expect(started.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(started.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});

// ---------------------------------------------------------------------------
// endFast
// ---------------------------------------------------------------------------

describe('endFast', () => {
  it('returns null when no fast is active', () => {
    const result = endFast(db);
    expect(result).toBeNull();
  });

  it('sets ended_at, duration_seconds, and removes active_fast', () => {
    const started = new Date('2025-06-01T08:00:00Z');
    startFast(db, '16:8', 16, started);

    const ended = new Date('2025-06-02T00:00:00Z'); // 16 hours later
    const completed = endFast(db, ended);

    expect(completed).not.toBeNull();
    expect(completed!.endedAt).toBe(ended.toISOString());
    expect(completed!.durationSeconds).toBe(16 * 3600);
    expect(getActiveFast(db)).toBeNull();
  });

  it('sets hitTarget true when duration meets target', () => {
    startFast(db, '16:8', 16, new Date('2025-06-01T08:00:00Z'));
    const completed = endFast(db, new Date('2025-06-02T00:00:00Z')); // exactly 16h

    expect(completed!.hitTarget).toBe(true);
  });

  it('sets hitTarget true when duration exceeds target', () => {
    startFast(db, '16:8', 16, new Date('2025-06-01T08:00:00Z'));
    const completed = endFast(db, new Date('2025-06-02T04:00:00Z')); // 20h

    expect(completed!.hitTarget).toBe(true);
    expect(completed!.durationSeconds).toBe(20 * 3600);
  });

  it('sets hitTarget false when duration is short of target', () => {
    startFast(db, '16:8', 16, new Date('2025-06-01T08:00:00Z'));
    const completed = endFast(db, new Date('2025-06-01T18:00:00Z')); // 10h

    expect(completed!.hitTarget).toBe(false);
    expect(completed!.durationSeconds).toBe(10 * 3600);
  });

  it('stores notes when provided', () => {
    startFast(db, '16:8', 16, new Date('2025-06-01T08:00:00Z'));
    const completed = endFast(db, new Date('2025-06-02T00:00:00Z'), 'Felt great');

    expect(completed!.notes).toBe('Felt great');
  });

  it('stores null notes when not provided', () => {
    startFast(db, '16:8', 16, new Date('2025-06-01T08:00:00Z'));
    const completed = endFast(db, new Date('2025-06-02T00:00:00Z'));

    expect(completed!.notes).toBeNull();
  });

  it('allows starting a new fast after ending one', () => {
    startFast(db, '16:8', 16, new Date('2025-06-01T08:00:00Z'));
    endFast(db, new Date('2025-06-02T00:00:00Z'));

    expect(() => {
      startFast(db, '18:6', 18, new Date('2025-06-02T08:00:00Z'));
    }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// getActiveFast
// ---------------------------------------------------------------------------

describe('getActiveFast', () => {
  it('returns null when no fast is active', () => {
    expect(getActiveFast(db)).toBeNull();
  });

  it('returns the active fast with correct data', () => {
    const started = new Date('2025-06-01T08:00:00Z');
    const fast = startFast(db, '20:4', 20, started);

    const active = getActiveFast(db);
    expect(active).not.toBeNull();
    expect(active!.fastId).toBe(fast.id);
    expect(active!.protocol).toBe('20:4');
    expect(active!.targetHours).toBe(20);
    expect(active!.startedAt).toBe(started.toISOString());
  });

  it('returns null after the active fast is ended', () => {
    startFast(db, '16:8', 16, new Date('2025-06-01T08:00:00Z'));
    endFast(db, new Date('2025-06-02T00:00:00Z'));

    expect(getActiveFast(db)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getFast
// ---------------------------------------------------------------------------

describe('getFast', () => {
  it('returns a fast by ID', () => {
    const fast = startFast(db, '16:8', 16, new Date('2025-06-01T08:00:00Z'));
    const found = getFast(db, fast.id);

    expect(found).not.toBeNull();
    expect(found!.id).toBe(fast.id);
    expect(found!.protocol).toBe('16:8');
  });

  it('returns null for a non-existent ID', () => {
    const found = getFast(db, 'non-existent');
    expect(found).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// listFasts
// ---------------------------------------------------------------------------

describe('listFasts', () => {
  it('returns empty array when no completed fasts exist', () => {
    expect(listFasts(db)).toEqual([]);
  });

  it('excludes active (in-progress) fasts', () => {
    startFast(db, '16:8', 16, new Date('2025-06-01T08:00:00Z'));
    // Fast is started but not ended
    expect(listFasts(db)).toEqual([]);
  });

  it('returns completed fasts newest first', () => {
    // Create 3 fasts in order
    startFast(db, '16:8', 16, new Date('2025-06-01T08:00:00Z'));
    endFast(db, new Date('2025-06-02T00:00:00Z'));

    startFast(db, '18:6', 18, new Date('2025-06-03T08:00:00Z'));
    endFast(db, new Date('2025-06-04T02:00:00Z'));

    startFast(db, '20:4', 20, new Date('2025-06-05T08:00:00Z'));
    endFast(db, new Date('2025-06-06T04:00:00Z'));

    const fasts = listFasts(db);
    expect(fasts).toHaveLength(3);
    // Newest first
    expect(fasts[0].protocol).toBe('20:4');
    expect(fasts[1].protocol).toBe('18:6');
    expect(fasts[2].protocol).toBe('16:8');
  });

  it('respects limit option', () => {
    startFast(db, '16:8', 16, new Date('2025-06-01T08:00:00Z'));
    endFast(db, new Date('2025-06-02T00:00:00Z'));

    startFast(db, '18:6', 18, new Date('2025-06-03T08:00:00Z'));
    endFast(db, new Date('2025-06-04T02:00:00Z'));

    startFast(db, '20:4', 20, new Date('2025-06-05T08:00:00Z'));
    endFast(db, new Date('2025-06-06T04:00:00Z'));

    const fasts = listFasts(db, { limit: 2 });
    expect(fasts).toHaveLength(2);
    expect(fasts[0].protocol).toBe('20:4');
    expect(fasts[1].protocol).toBe('18:6');
  });

  it('respects offset option', () => {
    startFast(db, '16:8', 16, new Date('2025-06-01T08:00:00Z'));
    endFast(db, new Date('2025-06-02T00:00:00Z'));

    startFast(db, '18:6', 18, new Date('2025-06-03T08:00:00Z'));
    endFast(db, new Date('2025-06-04T02:00:00Z'));

    startFast(db, '20:4', 20, new Date('2025-06-05T08:00:00Z'));
    endFast(db, new Date('2025-06-06T04:00:00Z'));

    const fasts = listFasts(db, { offset: 1 });
    expect(fasts).toHaveLength(2);
    expect(fasts[0].protocol).toBe('18:6');
    expect(fasts[1].protocol).toBe('16:8');
  });

  it('respects limit + offset together', () => {
    startFast(db, '16:8', 16, new Date('2025-06-01T08:00:00Z'));
    endFast(db, new Date('2025-06-02T00:00:00Z'));

    startFast(db, '18:6', 18, new Date('2025-06-03T08:00:00Z'));
    endFast(db, new Date('2025-06-04T02:00:00Z'));

    startFast(db, '20:4', 20, new Date('2025-06-05T08:00:00Z'));
    endFast(db, new Date('2025-06-06T04:00:00Z'));

    const fasts = listFasts(db, { limit: 1, offset: 1 });
    expect(fasts).toHaveLength(1);
    expect(fasts[0].protocol).toBe('18:6');
  });

  it('defaults to limit 50 offset 0', () => {
    // Just verify it doesn't crash with defaults
    const fasts = listFasts(db);
    expect(fasts).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// countFasts
// ---------------------------------------------------------------------------

describe('countFasts', () => {
  it('returns 0 when no completed fasts exist', () => {
    expect(countFasts(db)).toBe(0);
  });

  it('counts only completed fasts', () => {
    startFast(db, '16:8', 16, new Date('2025-06-01T08:00:00Z'));
    endFast(db, new Date('2025-06-02T00:00:00Z'));

    // Start but don't end a second fast
    startFast(db, '18:6', 18, new Date('2025-06-03T08:00:00Z'));

    expect(countFasts(db)).toBe(1);
  });

  it('counts all completed fasts', () => {
    startFast(db, '16:8', 16, new Date('2025-06-01T08:00:00Z'));
    endFast(db, new Date('2025-06-02T00:00:00Z'));

    startFast(db, '18:6', 18, new Date('2025-06-03T08:00:00Z'));
    endFast(db, new Date('2025-06-04T02:00:00Z'));

    startFast(db, '20:4', 20, new Date('2025-06-05T08:00:00Z'));
    endFast(db, new Date('2025-06-06T04:00:00Z'));

    expect(countFasts(db)).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// deleteFast
// ---------------------------------------------------------------------------

describe('deleteFast', () => {
  it('removes a completed fast from the fasts table', () => {
    const fast = startFast(db, '16:8', 16, new Date('2025-06-01T08:00:00Z'));
    endFast(db, new Date('2025-06-02T00:00:00Z'));

    const deleted = deleteFast(db, fast.id);
    expect(deleted).toBe(true);
    expect(getFast(db, fast.id)).toBeNull();
  });

  it('removes active_fast row when deleting the active fast', () => {
    const fast = startFast(db, '16:8', 16, new Date('2025-06-01T08:00:00Z'));

    deleteFast(db, fast.id);
    expect(getActiveFast(db)).toBeNull();
  });

  it('returns true for a non-existent ID (nothing to delete)', () => {
    // deleteFast checks if the row is gone after delete — it will be gone
    // for a non-existent ID too
    const result = deleteFast(db, 'non-existent');
    expect(result).toBe(true);
  });

  it('does not affect other fasts when deleting one', () => {
    const fast1 = startFast(db, '16:8', 16, new Date('2025-06-01T08:00:00Z'));
    endFast(db, new Date('2025-06-02T00:00:00Z'));

    const fast2 = startFast(db, '18:6', 18, new Date('2025-06-03T08:00:00Z'));
    endFast(db, new Date('2025-06-04T02:00:00Z'));

    deleteFast(db, fast1.id);

    expect(getFast(db, fast1.id)).toBeNull();
    expect(getFast(db, fast2.id)).not.toBeNull();
    expect(countFasts(db)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Singleton constraint (only one active fast at a time)
// ---------------------------------------------------------------------------

describe('singleton active fast constraint', () => {
  it('enforces at-most-one active fast via startFast guard', () => {
    startFast(db, '16:8', 16, new Date('2025-06-01T08:00:00Z'));

    expect(() => {
      startFast(db, '20:4', 20, new Date('2025-06-01T10:00:00Z'));
    }).toThrow();

    // Only the first fast should be active
    const active = getActiveFast(db);
    expect(active!.protocol).toBe('16:8');
  });

  it('allows a new fast after ending and deleting the previous one', () => {
    const fast = startFast(db, '16:8', 16, new Date('2025-06-01T08:00:00Z'));
    endFast(db, new Date('2025-06-02T00:00:00Z'));
    deleteFast(db, fast.id);

    expect(() => {
      startFast(db, '20:4', 20, new Date('2025-06-03T08:00:00Z'));
    }).not.toThrow();
  });
});
