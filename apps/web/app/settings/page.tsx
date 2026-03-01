'use client';

import { useState, useCallback } from 'react';
import { colors, spacing, typography, borderRadius } from '@myfast/ui';
import {
  PRESET_PROTOCOLS,
  initDatabase,
  exportFastsCSV,
  exportWeightCSV,
  getNotificationPreferences,
  setNotificationPreference,
  listGoals,
  listGoalProgress,
  createGoal,
  upsertGoal,
  refreshGoalProgress,
  setWaterTarget,
} from '@myfast/shared';
import type {
  Settings,
  Database,
  NotificationPreferences,
  Goal,
  GoalProgress,
} from '@myfast/shared';
import { useDatabase } from '../../lib/database';

interface SettingsState extends Settings {
  healthSyncEnabled: boolean;
  healthReadWeight: boolean;
  healthWriteFasts: boolean;
}

interface WeeklyGoalState {
  goal: Goal | null;
  target: number;
  history: GoalProgress[];
}

function loadSettings(db: Database): SettingsState {
  const get = (key: string, fallback: string): string => {
    const row = db.get<{ value: string }>(`SELECT value FROM settings WHERE key = ?`, [key]);
    return row?.value ?? fallback;
  };
  return {
    defaultProtocol: get('defaultProtocol', '16:8'),
    notifyFastComplete: get('notifyFastComplete', 'true') === 'true',
    notifyEatingWindowClosing: get('notifyEatingWindowClosing', 'false') === 'true',
    weightTrackingEnabled: get('weightTrackingEnabled', 'false') === 'true',
    weightUnit: get('weightUnit', 'lbs') as 'lbs' | 'kg',
    theme: get('theme', 'dark') as 'dark' | 'light',
    healthSyncEnabled: get('healthSyncEnabled', 'false') === 'true',
    healthReadWeight: get('healthReadWeight', 'false') === 'true',
    healthWriteFasts: get('healthWriteFasts', 'false') === 'true',
  };
}

function loadWeeklyGoal(db: Database): WeeklyGoalState {
  const goals = listGoals(db, true);
  const weekly = goals.find((goal) => goal.type === 'fasts_per_week' && goal.isActive) ?? null;
  if (!weekly) {
    return { goal: null, target: 5, history: [] };
  }

  return {
    goal: weekly,
    target: Math.max(1, Math.round(weekly.targetValue)),
    history: listGoalProgress(db, weekly.id, 8),
  };
}

function persistSetting(db: Database, key: string, value: string): void {
  db.run(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`, [key, value]);
}

export default function SettingsPage() {
  const db = useDatabase();

  const [settings, setSettings] = useState<SettingsState>(() => loadSettings(db));
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>(() => getNotificationPreferences(db));
  const [waterTarget, setWaterTargetState] = useState<number>(() => {
    const row = db.get<{ value: string }>(`SELECT value FROM settings WHERE key = ?`, ['waterDailyTarget']);
    const parsed = Number(row?.value ?? 8);
    return Number.isFinite(parsed) ? Math.max(1, Math.round(parsed)) : 8;
  });
  const [weeklyGoal, setWeeklyGoal] = useState<WeeklyGoalState>(() => loadWeeklyGoal(db));

  const updateSetting = useCallback(
    <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
      persistSetting(db, key, String(value));
    },
    [db],
  );

  const updateNotification = useCallback(
    (key: keyof NotificationPreferences, enabled: boolean) => {
      setNotificationPrefs((prev) => ({ ...prev, [key]: enabled }));
      setNotificationPreference(db, key, enabled);
    },
    [db],
  );

  const adjustWaterTarget = useCallback(
    (delta: number) => {
      const next = Math.max(1, waterTarget + delta);
      const updated = setWaterTarget(db, next);
      setWaterTargetState(updated.target);
    },
    [db, waterTarget],
  );

  const saveWeeklyGoal = useCallback(() => {
    if (weeklyGoal.goal) {
      upsertGoal(db, {
        ...weeklyGoal.goal,
        targetValue: weeklyGoal.target,
      });
    } else {
      createGoal(db, {
        type: 'fasts_per_week',
        targetValue: weeklyGoal.target,
        label: 'Weekly fasting goal',
        unit: 'fasts',
      });
    }

    refreshGoalProgress(db);
    setWeeklyGoal(loadWeeklyGoal(db));
    alert('Weekly goal saved');
  }, [db, weeklyGoal]);

  const handleExport = useCallback(() => {
    const fastsCSV = exportFastsCSV(db);
    const weightCSV = exportWeightCSV(db);
    const combined = `=== Fasts ===\n${fastsCSV}\n=== Weight Entries ===\n${weightCSV}`;
    const blob = new Blob([combined], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'myfast-export.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [db]);

  const handleEraseData = useCallback(() => {
    if (!confirm('Erase all data? This cannot be undone.')) return;

    db.run('DELETE FROM fasts');
    db.run('DELETE FROM active_fast');
    db.run('DELETE FROM weight_entries');
    db.run('DELETE FROM water_intake');
    db.run('DELETE FROM goals');
    db.run('DELETE FROM goal_progress');
    db.run('DELETE FROM notifications_config');
    db.run('DELETE FROM streak_cache');
    db.run('DELETE FROM settings');
    initDatabase(db);
    setSettings(loadSettings(db));
    setNotificationPrefs(getNotificationPreferences(db));
    setWeeklyGoal(loadWeeklyGoal(db));
    const row = db.get<{ value: string }>(`SELECT value FROM settings WHERE key = ?`, ['waterDailyTarget']);
    setWaterTargetState(Number(row?.value ?? 8));
  }, [db]);

  return (
    <main style={styles.container}>
      <h1 style={{ fontSize: typography.heading.fontSize, fontWeight: 700, color: colors.text, marginBottom: spacing.lg }}>
        Settings
      </h1>

      <SectionTitle>Default Protocol</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
        {PRESET_PROTOCOLS.map((protocol) => {
          const isSelected = settings.defaultProtocol === protocol.id;
          return (
            <button
              key={protocol.id}
              style={{
                ...styles.protocolRow,
                backgroundColor: isSelected ? colors.surfaceElevated : colors.surface,
                borderColor: isSelected ? colors.fasting : colors.border,
              }}
              onClick={() => updateSetting('defaultProtocol', protocol.id)}
            >
              <div>
                <span style={{ color: colors.fasting, fontWeight: 700, marginRight: 8 }}>{protocol.id}</span>
                <span style={{ color: colors.textSecondary, fontSize: typography.caption.fontSize }}>{protocol.name}</span>
              </div>
              {isSelected && <span style={{ color: colors.fasting }}>&#10003;</span>}
            </button>
          );
        })}
      </div>

      <SectionTitle>Notifications</SectionTitle>
      <ToggleRow
        label="Fast started"
        checked={notificationPrefs.fastStart}
        onChange={(value) => updateNotification('fastStart', value)}
      />
      <ToggleRow
        label="25% progress"
        checked={notificationPrefs.progress25}
        onChange={(value) => updateNotification('progress25', value)}
      />
      <ToggleRow
        label="50% progress"
        checked={notificationPrefs.progress50}
        onChange={(value) => updateNotification('progress50', value)}
      />
      <ToggleRow
        label="75% progress"
        checked={notificationPrefs.progress75}
        onChange={(value) => updateNotification('progress75', value)}
      />
      <ToggleRow
        label="Fast complete"
        checked={notificationPrefs.fastComplete}
        onChange={(value) => updateNotification('fastComplete', value)}
      />

      <SectionTitle>Hydration</SectionTitle>
      <div style={styles.cardRow}>
        <span>Daily target</span>
        <div style={styles.adjustControls}>
          <button style={styles.adjustButton} onClick={() => adjustWaterTarget(-1)}>-</button>
          <span style={{ minWidth: 30, textAlign: 'center', color: colors.fasting, fontWeight: 700 }}>{waterTarget}</span>
          <button style={styles.adjustButton} onClick={() => adjustWaterTarget(1)}>+</button>
        </div>
      </div>

      <SectionTitle>Goals</SectionTitle>
      <div style={styles.goalCard}>
        <div style={styles.cardRowInline}>
          <span style={{ fontWeight: 600 }}>Fasts per week</span>
          <div style={styles.adjustControls}>
            <button
              style={styles.adjustButton}
              onClick={() => setWeeklyGoal((prev) => ({ ...prev, target: Math.max(1, prev.target - 1) }))}
            >
              -
            </button>
            <span style={{ minWidth: 30, textAlign: 'center', color: colors.fasting, fontWeight: 700 }}>{weeklyGoal.target}</span>
            <button
              style={styles.adjustButton}
              onClick={() => setWeeklyGoal((prev) => ({ ...prev, target: Math.min(14, prev.target + 1) }))}
            >
              +
            </button>
          </div>
        </div>
        <button style={styles.saveGoalButton} onClick={saveWeeklyGoal}>Save Goal</button>

        {weeklyGoal.history.slice(0, 3).map((entry) => (
          <div key={entry.id} style={styles.historyRow}>
            <span style={{ color: colors.textSecondary, fontSize: typography.caption.fontSize }}>
              {entry.periodStart} - {entry.periodEnd}
            </span>
            <span style={{ color: entry.completed ? colors.success : colors.text, fontSize: typography.caption.fontSize }}>
              {entry.currentValue}/{entry.targetValue}
            </span>
          </div>
        ))}
      </div>

      <SectionTitle>Health Integration</SectionTitle>
      <ToggleRow
        label="Enable health sync"
        checked={settings.healthSyncEnabled}
        onChange={(value) => updateSetting('healthSyncEnabled', value)}
      />
      <ToggleRow
        label="Read weight entries"
        checked={settings.healthReadWeight}
        onChange={(value) => updateSetting('healthReadWeight', value)}
      />
      <ToggleRow
        label="Write fasting windows"
        checked={settings.healthWriteFasts}
        onChange={(value) => updateSetting('healthWriteFasts', value)}
      />
      <p style={styles.healthNote}>
        Browser runtime does not expose Apple HealthKit or Google Health Connect. Use a mobile custom build for health sync.
      </p>

      <SectionTitle>Weight Tracking</SectionTitle>
      <ToggleRow
        label="Enable weight log"
        checked={settings.weightTrackingEnabled}
        onChange={(v) => updateSetting('weightTrackingEnabled', v)}
      />
      {settings.weightTrackingEnabled && (
        <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.xs }}>
          {(['lbs', 'kg'] as const).map((unit) => (
            <button
              key={unit}
              style={{
                ...styles.unitButton,
                backgroundColor: settings.weightUnit === unit ? colors.fasting : colors.surface,
                color: settings.weightUnit === unit ? '#FFFFFF' : colors.textSecondary,
              }}
              onClick={() => updateSetting('weightUnit', unit)}
            >
              {unit}
            </button>
          ))}
        </div>
      )}

      <SectionTitle>Data</SectionTitle>
      <button style={styles.actionButton} onClick={handleExport}>Export as CSV</button>
      <button style={{ ...styles.actionButton, color: colors.danger, marginTop: spacing.xs }} onClick={handleEraseData}>
        Erase all data
      </button>

      <SectionTitle>About</SectionTitle>
      <p style={{ color: colors.textSecondary, fontSize: typography.caption.fontSize, margin: 0 }}>
        MyFast v0.0.1
      </p>
      <p style={{ color: colors.textSecondary, fontSize: typography.caption.fontSize, margin: `${spacing.xs}px 0 0` }}>
        License: FSL-1.1-Apache-2.0
      </p>
      <p style={{ color: colors.textTertiary, fontSize: typography.caption.fontSize, margin: `${spacing.sm}px 0 0` }}>
        All data stored locally. No accounts, no servers, no tracking.
      </p>
    </main>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        color: colors.textSecondary,
        fontSize: typography.label.fontSize,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: typography.label.letterSpacing,
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
      }}
    >
      {children}
    </h2>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.xs,
        cursor: 'pointer',
      }}
    >
      <span style={{ color: colors.text, fontSize: typography.body.fontSize }}>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: colors.fasting, width: 20, height: 20 }}
      />
    </label>
  );
}

const styles = {
  container: {
    maxWidth: 560,
    margin: '0 auto',
    padding: `${spacing.xxl}px ${spacing.lg}px`,
    minHeight: '100vh',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  protocolRow: {
    display: 'flex' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    border: '1px solid',
    cursor: 'pointer' as const,
    background: 'none',
    width: '100%' as const,
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: typography.body.fontSize,
  },
  cardRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  cardRowInline: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  adjustControls: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  adjustButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    border: 'none',
    backgroundColor: colors.surfaceElevated,
    color: colors.text,
    fontWeight: 700,
    cursor: 'pointer' as const,
  },
  goalCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  saveGoalButton: {
    border: 'none',
    borderRadius: 999,
    padding: '8px 12px',
    backgroundColor: colors.fasting,
    color: '#FFFFFF',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    cursor: 'pointer' as const,
    width: 'fit-content' as const,
  },
  historyRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  healthNote: {
    color: colors.textSecondary,
    fontSize: typography.caption.fontSize,
    lineHeight: 18,
  },
  unitButton: {
    padding: `${10}px ${24}px`,
    borderRadius: borderRadius.sm,
    border: 'none',
    cursor: 'pointer' as const,
    fontFamily: 'Inter, system-ui, sans-serif',
    fontWeight: 600,
    fontSize: typography.body.fontSize,
  },
  actionButton: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 12,
    width: '100%' as const,
    backgroundColor: colors.surface,
    color: colors.text,
    border: 'none',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    cursor: 'pointer' as const,
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: typography.body.fontSize,
    fontWeight: 500,
  },
} as const;
