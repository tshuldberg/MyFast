import type { Database } from './database';

/** Seed the 6 preset fasting protocols. Skips rows that already exist. */
export function seedProtocols(db: Database): void {
  const presets = [
    { id: '16:8', name: 'Lean Gains (16:8)', fastingHours: 16, eatingHours: 8, description: 'Fast 16 hours, eat within an 8-hour window. Most popular protocol for beginners.', sortOrder: 1, isDefault: 1 },
    { id: '18:6', name: 'Daily 18:6', fastingHours: 18, eatingHours: 6, description: 'Fast 18 hours, eat within a 6-hour window. Moderate intensity.', sortOrder: 2, isDefault: 0 },
    { id: '20:4', name: 'Warrior (20:4)', fastingHours: 20, eatingHours: 4, description: 'Fast 20 hours, eat within a 4-hour window. One main meal with snacks.', sortOrder: 3, isDefault: 0 },
    { id: '23:1', name: 'OMAD (23:1)', fastingHours: 23, eatingHours: 1, description: 'One Meal A Day. Fast 23 hours, single eating hour.', sortOrder: 4, isDefault: 0 },
    { id: '36:0', name: 'Alternate Day (36h)', fastingHours: 36, eatingHours: 0, description: 'Full 36-hour fast. Skip an entire day of eating.', sortOrder: 5, isDefault: 0 },
    { id: '48:0', name: 'Extended (48h)', fastingHours: 48, eatingHours: 0, description: 'Full 48-hour fast. Two days without eating.', sortOrder: 6, isDefault: 0 },
  ];

  for (const p of presets) {
    db.run(
      `INSERT OR IGNORE INTO protocols (id, name, fasting_hours, eating_hours, description, sort_order, is_default) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [p.id, p.name, p.fastingHours, p.eatingHours, p.description, p.sortOrder, p.isDefault],
    );
  }
}

/** Seed default settings. Skips keys that already exist. */
export function seedSettings(db: Database): void {
  const defaults: [string, string][] = [
    ['defaultProtocol', '16:8'],
    ['notifyFastComplete', 'true'],
    ['notifyEatingWindowClosing', 'false'],
    ['weightTrackingEnabled', 'false'],
    ['weightUnit', 'lbs'],
    ['theme', 'dark'],
    ['waterDailyTarget', '8'],
    ['healthSyncEnabled', 'false'],
    ['healthReadWeight', 'false'],
    ['healthWriteFasts', 'false'],
  ];

  for (const [key, value] of defaults) {
    db.run(
      `INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`,
      [key, value],
    );
  }
}

/** Seed default notification preferences. Skips keys that already exist. */
export function seedNotificationConfig(db: Database): void {
  const defaults: [string, number][] = [
    ['fastStart', 1],
    ['progress25', 0],
    ['progress50', 1],
    ['progress75', 1],
    ['fastComplete', 1],
  ];

  for (const [key, enabled] of defaults) {
    db.run(
      `INSERT OR IGNORE INTO notifications_config (key, enabled) VALUES (?, ?)`,
      [key, enabled],
    );
  }
}
