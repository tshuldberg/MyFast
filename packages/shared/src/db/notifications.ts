import type { Database } from './database';
import type { NotificationPreferences } from '../types/index';

const DEFAULT_PREFERENCES: NotificationPreferences = {
  fastStart: true,
  progress25: false,
  progress50: true,
  progress75: true,
  fastComplete: true,
};

const PREFERENCE_KEYS: (keyof NotificationPreferences)[] = [
  'fastStart',
  'progress25',
  'progress50',
  'progress75',
  'fastComplete',
];

/**
 * Read notification preferences from notifications_config.
 * Missing keys fall back to defaults.
 */
export function getNotificationPreferences(db: Database): NotificationPreferences {
  const rows = db.all<{ key: string; enabled: number }>(
    `SELECT key, enabled FROM notifications_config`,
  );

  if (rows.length === 0) {
    return { ...DEFAULT_PREFERENCES };
  }

  const next: NotificationPreferences = { ...DEFAULT_PREFERENCES };
  for (const row of rows) {
    if (PREFERENCE_KEYS.includes(row.key as keyof NotificationPreferences)) {
      (next as Record<string, boolean>)[row.key] = row.enabled === 1;
    }
  }

  return next;
}

/**
 * Update a single notification preference key.
 */
export function setNotificationPreference(
  db: Database,
  key: keyof NotificationPreferences,
  enabled: boolean,
): void {
  db.run(
    `INSERT OR REPLACE INTO notifications_config (key, enabled) VALUES (?, ?)`,
    [key, enabled ? 1 : 0],
  );
}
