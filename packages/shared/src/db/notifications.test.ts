import { beforeEach, describe, expect, it } from 'vitest';
import type { Database } from './database';
import { createTestDatabase } from './test-helpers';
import { getNotificationPreferences, setNotificationPreference } from './notifications';

let db: Database;

beforeEach(() => {
  db = createTestDatabase();
});

describe('notification preferences', () => {
  it('loads seeded defaults', () => {
    const prefs = getNotificationPreferences(db);
    expect(prefs.fastStart).toBe(true);
    expect(prefs.progress25).toBe(false);
    expect(prefs.progress50).toBe(true);
    expect(prefs.progress75).toBe(true);
    expect(prefs.fastComplete).toBe(true);
  });

  it('updates a single preference', () => {
    setNotificationPreference(db, 'progress25', true);
    const prefs = getNotificationPreferences(db);
    expect(prefs.progress25).toBe(true);
  });
});
