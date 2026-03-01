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
    const key = row.key as keyof NotificationPreferences;
    if (!PREFERENCE_KEYS.includes(key)) continue;

    switch (key) {
      case 'fastStart':
        next.fastStart = row.enabled === 1;
        break;
      case 'progress25':
        next.progress25 = row.enabled === 1;
        break;
      case 'progress50':
        next.progress50 = row.enabled === 1;
        break;
      case 'progress75':
        next.progress75 = row.enabled === 1;
        break;
      case 'fastComplete':
        next.fastComplete = row.enabled === 1;
        break;
      default:
        break;
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
