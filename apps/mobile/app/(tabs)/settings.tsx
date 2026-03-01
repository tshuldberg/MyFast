import { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, Switch, Pressable, Alert, Share, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@myfast/ui';
import {
  PRESET_PROTOCOLS,
  exportFastsCSV,
  exportWeightCSV,
  initDatabase,
  getNotificationPreferences,
  setNotificationPreference,
  listGoals,
  listGoalProgress,
  createGoal,
  upsertGoal,
  refreshGoalProgress,
  setWaterTarget,
} from '@myfast/shared';
import type { Settings, Database, NotificationPreferences, Goal, GoalProgress } from '@myfast/shared';
import { useDatabase } from '@/lib/database';
import { useThemeMode } from '@/app/_layout';
import { getHealthSyncStatus, probeHealthSyncStatus, syncHealthData } from '@/lib/health-sync';

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
  const activeGoals = listGoals(db, true);
  const weekly = activeGoals.find((goal) => goal.type === 'fasts_per_week' && goal.isActive) ?? null;
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

export default function SettingsScreen() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const db = useDatabase();
  const { themeMode, setThemeMode } = useThemeMode();

  const [settings, setSettings] = useState<SettingsState>(() => loadSettings(db));
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>(() => getNotificationPreferences(db));
  const [waterTarget, setWaterTargetState] = useState<number>(() => {
    const row = db.get<{ value: string }>(`SELECT value FROM settings WHERE key = ?`, ['waterDailyTarget']);
    const parsed = Number(row?.value ?? 8);
    return Number.isFinite(parsed) ? Math.max(1, Math.round(parsed)) : 8;
  });
  const [weeklyGoal, setWeeklyGoal] = useState<WeeklyGoalState>(() => loadWeeklyGoal(db));
  const [healthStatus, setHealthStatus] = useState(() => getHealthSyncStatus());

  useEffect(() => {
    let mounted = true;
    void probeHealthSyncStatus().then((status) => {
      if (!mounted) return;
      setHealthStatus(status);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const updateSetting = useCallback(
    <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
      const strValue = typeof value === 'boolean' ? String(value) : String(value);
      persistSetting(db, key, strValue);
    },
    [db],
  );

  const updateNotification = useCallback(
    (key: keyof NotificationPreferences, value: boolean) => {
      setNotificationPrefs((prev) => ({ ...prev, [key]: value }));
      setNotificationPreference(db, key, value);
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
    Alert.alert('Saved', 'Weekly goal updated.');
  }, [db, weeklyGoal]);

  const handleExport = useCallback(() => {
    const fastsCSV = exportFastsCSV(db);
    const weightCSV = exportWeightCSV(db);
    const combined = `=== Fasts ===\n${fastsCSV}\n=== Weight Entries ===\n${weightCSV}`;
    Share.share({ message: combined, title: 'MyFast Export' });
  }, [db]);

  const handleSyncHealth = useCallback(async () => {
    if (!settings.healthSyncEnabled) {
      Alert.alert('Health Sync', 'Enable health sync first to run import/export.');
      return;
    }

    const result = await syncHealthData(db, {
      readWeight: settings.healthReadWeight,
      writeFasts: settings.healthWriteFasts,
    });

    Alert.alert('Health Sync', result.message);
  }, [db, settings.healthReadWeight, settings.healthSyncEnabled, settings.healthWriteFasts]);

  const handleEraseData = useCallback(() => {
    Alert.alert(
      'Erase All Data',
      'This will permanently delete all fasts, weight entries, water logs, goals, and settings. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Erase Everything',
          style: 'destructive',
          onPress: () => {
            db.run(`DELETE FROM fasts`);
            db.run(`DELETE FROM active_fast`);
            db.run(`DELETE FROM weight_entries`);
            db.run(`DELETE FROM water_intake`);
            db.run(`DELETE FROM goals`);
            db.run(`DELETE FROM goal_progress`);
            db.run(`DELETE FROM notifications_config`);
            db.run(`DELETE FROM streak_cache`);
            db.run(`DELETE FROM settings`);
            initDatabase(db);
            setSettings(loadSettings(db));
            setNotificationPrefs(getNotificationPreferences(db));
            setWeeklyGoal(loadWeeklyGoal(db));
            const row = db.get<{ value: string }>(`SELECT value FROM settings WHERE key = ?`, ['waterDailyTarget']);
            setWaterTargetState(Number(row?.value ?? 8));
          },
        },
      ],
    );
  }, [db]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: spacing.xxl }}
    >
      <Text
        style={[
          styles.screenTitle,
          {
            color: colors.text,
            fontSize: typography.heading.fontSize,
            paddingHorizontal: spacing.md,
            paddingTop: spacing.xxl,
            paddingBottom: spacing.lg,
          },
        ]}
      >
        Settings
      </Text>

      <SectionTitle title="Default Protocol" colors={colors} typography={typography} spacing={spacing} />
      <View style={{ paddingHorizontal: spacing.md }}>
        {PRESET_PROTOCOLS.map((protocol) => {
          const isSelected = settings.defaultProtocol === protocol.id;
          return (
            <Pressable
              key={protocol.id}
              style={[
                styles.protocolRow,
                {
                  backgroundColor: isSelected ? colors.surfaceElevated : colors.surface,
                  borderColor: isSelected ? colors.fasting : colors.border,
                  borderRadius: borderRadius.md,
                  padding: spacing.md,
                  marginBottom: spacing.xs,
                },
              ]}
              onPress={() => updateSetting('defaultProtocol', protocol.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${protocol.id}, ${protocol.name}`}
            >
              <View style={styles.protocolRowInner}>
                <Text style={[styles.protocolId, { color: colors.fasting, fontSize: typography.body.fontSize }]}>
                  {protocol.id}
                </Text>
                <Text style={[styles.protocolName, { color: colors.textSecondary, fontSize: typography.caption.fontSize }]}> 
                  {protocol.name}
                </Text>
              </View>
              {isSelected && <Ionicons name="checkmark" size={20} color={colors.fasting} />}
            </Pressable>
          );
        })}
      </View>

      <SectionTitle title="Notifications" colors={colors} typography={typography} spacing={spacing} />
      <View style={{ paddingHorizontal: spacing.md }}>
        <ToggleRow
          label="Fast started"
          value={notificationPrefs.fastStart}
          onToggle={(v) => updateNotification('fastStart', v)}
          colors={colors}
          typography={typography}
          spacing={spacing}
          borderRadius={borderRadius}
        />
        <ToggleRow
          label="25% progress"
          value={notificationPrefs.progress25}
          onToggle={(v) => updateNotification('progress25', v)}
          colors={colors}
          typography={typography}
          spacing={spacing}
          borderRadius={borderRadius}
        />
        <ToggleRow
          label="50% progress"
          value={notificationPrefs.progress50}
          onToggle={(v) => updateNotification('progress50', v)}
          colors={colors}
          typography={typography}
          spacing={spacing}
          borderRadius={borderRadius}
        />
        <ToggleRow
          label="75% progress"
          value={notificationPrefs.progress75}
          onToggle={(v) => updateNotification('progress75', v)}
          colors={colors}
          typography={typography}
          spacing={spacing}
          borderRadius={borderRadius}
        />
        <ToggleRow
          label="Fast complete"
          value={notificationPrefs.fastComplete}
          onToggle={(v) => updateNotification('fastComplete', v)}
          colors={colors}
          typography={typography}
          spacing={spacing}
          borderRadius={borderRadius}
        />
      </View>

      <SectionTitle title="Hydration" colors={colors} typography={typography} spacing={spacing} />
      <View style={{ paddingHorizontal: spacing.md }}>
        <View
          style={[
            styles.adjustRow,
            {
              backgroundColor: colors.surface,
              borderRadius: borderRadius.md,
              padding: spacing.md,
            },
          ]}
        >
          <Text style={{ color: colors.text, fontSize: typography.body.fontSize, fontFamily: 'Inter' }}>
            Daily target
          </Text>
          <View style={styles.adjustControls}>
            <Pressable
              style={[styles.adjustButton, { backgroundColor: colors.surfaceElevated }]}
              onPress={() => adjustWaterTarget(-1)}
            >
              <Text style={{ color: colors.text, fontWeight: '700' }}>-</Text>
            </Pressable>
            <Text style={{ color: colors.fasting, fontWeight: '700', minWidth: 36, textAlign: 'center' }}>
              {waterTarget}
            </Text>
            <Pressable
              style={[styles.adjustButton, { backgroundColor: colors.surfaceElevated }]}
              onPress={() => adjustWaterTarget(1)}
            >
              <Text style={{ color: colors.text, fontWeight: '700' }}>+</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <SectionTitle title="Goals" colors={colors} typography={typography} spacing={spacing} />
      <View style={{ paddingHorizontal: spacing.md }}>
        <View
          style={[
            styles.goalEditorCard,
            {
              backgroundColor: colors.surface,
              borderRadius: borderRadius.md,
              padding: spacing.md,
            },
          ]}
        >
          <Text style={{ color: colors.text, fontSize: typography.body.fontSize, fontFamily: 'Inter', fontWeight: '600' }}>
            Fasts per week
          </Text>
          <View style={[styles.adjustRowInline, { marginTop: spacing.sm }]}>
            <View style={styles.adjustControls}>
              <Pressable
                style={[styles.adjustButton, { backgroundColor: colors.surfaceElevated }]}
                onPress={() =>
                  setWeeklyGoal((prev) => ({
                    ...prev,
                    target: Math.max(1, prev.target - 1),
                  }))
                }
              >
                <Text style={{ color: colors.text, fontWeight: '700' }}>-</Text>
              </Pressable>
              <Text style={{ color: colors.fasting, fontWeight: '700', minWidth: 36, textAlign: 'center' }}>
                {weeklyGoal.target}
              </Text>
              <Pressable
                style={[styles.adjustButton, { backgroundColor: colors.surfaceElevated }]}
                onPress={() =>
                  setWeeklyGoal((prev) => ({
                    ...prev,
                    target: Math.min(14, prev.target + 1),
                  }))
                }
              >
                <Text style={{ color: colors.text, fontWeight: '700' }}>+</Text>
              </Pressable>
            </View>
            <Pressable
              style={[styles.saveGoalButton, { backgroundColor: colors.fasting }]}
              onPress={saveWeeklyGoal}
            >
              <Text style={styles.saveGoalLabel}>Save Goal</Text>
            </Pressable>
          </View>

          {weeklyGoal.history.length > 0 ? (
            <View style={{ marginTop: spacing.sm }}>
              <Text style={{ color: colors.textSecondary, fontSize: typography.caption.fontSize, fontFamily: 'Inter' }}>
                Recent progress
              </Text>
              {weeklyGoal.history.slice(0, 3).map((entry) => (
                <View key={entry.id} style={styles.goalHistoryRow}>
                  <Text style={{ color: colors.textSecondary, fontSize: typography.caption.fontSize }}>
                    {entry.periodStart} - {entry.periodEnd}
                  </Text>
                  <Text style={{ color: entry.completed ? colors.success : colors.text, fontSize: typography.caption.fontSize }}>
                    {entry.currentValue}/{entry.targetValue}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </View>

      <SectionTitle title="Health Integration" colors={colors} typography={typography} spacing={spacing} />
      <View style={{ paddingHorizontal: spacing.md }}>
        <ToggleRow
          label="Enable health sync"
          value={settings.healthSyncEnabled}
          onToggle={(v) => updateSetting('healthSyncEnabled', v)}
          colors={colors}
          typography={typography}
          spacing={spacing}
          borderRadius={borderRadius}
        />
        <ToggleRow
          label="Read weight entries"
          value={settings.healthReadWeight}
          onToggle={(v) => updateSetting('healthReadWeight', v)}
          colors={colors}
          typography={typography}
          spacing={spacing}
          borderRadius={borderRadius}
        />
        <ToggleRow
          label="Write fasting windows"
          value={settings.healthWriteFasts}
          onToggle={(v) => updateSetting('healthWriteFasts', v)}
          colors={colors}
          typography={typography}
          spacing={spacing}
          borderRadius={borderRadius}
        />

        <View style={[styles.healthNote, { borderColor: colors.border, borderRadius: borderRadius.md }]}> 
          <Text style={{ color: colors.textSecondary, fontSize: typography.caption.fontSize }}>
            {healthStatus.reason}
          </Text>
        </View>

        <Pressable
          style={[styles.actionRow, { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md }]}
          onPress={() => void handleSyncHealth()}
          accessibilityRole="button"
          accessibilityLabel="Sync health data"
        >
          <Ionicons name="sync-outline" size={20} color={colors.text} />
          <Text style={[styles.actionLabel, { color: colors.text, fontSize: typography.body.fontSize }]}>Sync Now</Text>
        </Pressable>
      </View>

      <SectionTitle title="Weight Tracking" colors={colors} typography={typography} spacing={spacing} />
      <View style={{ paddingHorizontal: spacing.md }}>
        <ToggleRow
          label="Enable weight log"
          value={settings.weightTrackingEnabled}
          onToggle={(v) => updateSetting('weightTrackingEnabled', v)}
          colors={colors}
          typography={typography}
          spacing={spacing}
          borderRadius={borderRadius}
        />
        {settings.weightTrackingEnabled && (
          <View style={[styles.unitRow, { marginTop: spacing.xs }]}>
            <UnitButton
              label="lbs"
              selected={settings.weightUnit === 'lbs'}
              onPress={() => updateSetting('weightUnit', 'lbs')}
              colors={colors}
              borderRadius={borderRadius}
            />
            <UnitButton
              label="kg"
              selected={settings.weightUnit === 'kg'}
              onPress={() => updateSetting('weightUnit', 'kg')}
              colors={colors}
              borderRadius={borderRadius}
            />
          </View>
        )}
      </View>

      <SectionTitle title="Appearance" colors={colors} typography={typography} spacing={spacing} />
      <View style={{ paddingHorizontal: spacing.md }}>
        <View style={[styles.unitRow]}>
          <UnitButton
            label="Dark"
            selected={themeMode === 'dark'}
            onPress={() => setThemeMode('dark')}
            colors={colors}
            borderRadius={borderRadius}
          />
          <UnitButton
            label="Light"
            selected={themeMode === 'light'}
            onPress={() => setThemeMode('light')}
            colors={colors}
            borderRadius={borderRadius}
          />
        </View>
      </View>

      <SectionTitle title="Data" colors={colors} typography={typography} spacing={spacing} />
      <View style={{ paddingHorizontal: spacing.md }}>
        <Pressable
          style={[styles.actionRow, { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.xs }]}
          onPress={handleExport}
          accessibilityRole="button"
          accessibilityLabel="Export as CSV"
        >
          <Ionicons name="download-outline" size={20} color={colors.text} />
          <Text style={[styles.actionLabel, { color: colors.text, fontSize: typography.body.fontSize }]}> 
            Export as CSV
          </Text>
        </Pressable>
        <Pressable
          style={[styles.actionRow, { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md }]}
          onPress={handleEraseData}
          accessibilityRole="button"
          accessibilityLabel="Erase all data"
          accessibilityHint="Double tap to erase all data"
        >
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
          <Text style={[styles.actionLabel, { color: colors.danger, fontSize: typography.body.fontSize }]}> 
            Erase all data
          </Text>
        </Pressable>
      </View>

      <SectionTitle title="About" colors={colors} typography={typography} spacing={spacing} />
      <View style={[styles.aboutSection, { paddingHorizontal: spacing.md }]}> 
        <Text style={[styles.aboutText, { color: colors.textSecondary, fontSize: typography.caption.fontSize }]}> 
          MyFast v0.0.1
        </Text>
        <Text style={[styles.aboutText, { color: colors.textSecondary, fontSize: typography.caption.fontSize }]}> 
          License: FSL-1.1-Apache-2.0
        </Text>
        <Text style={[styles.aboutText, { color: colors.textTertiary, fontSize: typography.caption.fontSize, marginTop: spacing.sm }]}> 
          All data stored locally on your device. No accounts, no servers, no tracking.
        </Text>
      </View>
    </ScrollView>
  );
}

interface SectionTitleProps {
  title: string;
  colors: ReturnType<typeof useTheme>['colors'];
  typography: ReturnType<typeof useTheme>['typography'];
  spacing: ReturnType<typeof useTheme>['spacing'];
}

function SectionTitle({ title, colors, typography, spacing }: SectionTitleProps) {
  return (
    <Text
      style={[
        styles.sectionTitle,
        {
          color: colors.textSecondary,
          fontSize: typography.label.fontSize,
          letterSpacing: typography.label.letterSpacing,
          paddingHorizontal: spacing.md,
          paddingTop: spacing.lg,
          paddingBottom: spacing.sm,
        },
      ]}
    >
      {title}
    </Text>
  );
}

interface ToggleRowProps {
  label: string;
  value: boolean;
  onToggle: (value: boolean) => void;
  colors: ReturnType<typeof useTheme>['colors'];
  typography: ReturnType<typeof useTheme>['typography'];
  spacing: ReturnType<typeof useTheme>['spacing'];
  borderRadius: ReturnType<typeof useTheme>['borderRadius'];
}

function ToggleRow({ label, value, onToggle, colors, typography, spacing, borderRadius }: ToggleRowProps) {
  return (
    <View
      style={[
        styles.toggleRow,
        {
          backgroundColor: colors.surface,
          borderRadius: borderRadius.md,
          padding: spacing.md,
          marginBottom: spacing.xs,
        },
      ]}
    >
      <Text style={{ color: colors.text, fontSize: typography.body.fontSize, fontFamily: 'Inter' }}>
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.border, true: colors.fasting }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

interface UnitButtonProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
  borderRadius: ReturnType<typeof useTheme>['borderRadius'];
}

function UnitButton({ label, selected, onPress, colors, borderRadius }: UnitButtonProps) {
  return (
    <Pressable
      style={[
        styles.unitButton,
        {
          backgroundColor: selected ? colors.fasting : colors.surface,
          borderRadius: borderRadius.sm,
        },
      ]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
    >
      <Text style={{ color: selected ? '#FFFFFF' : colors.textSecondary, fontWeight: '600', fontFamily: 'Inter' }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenTitle: {
    fontFamily: 'Inter',
    fontWeight: '700',
  },
  sectionTitle: {
    fontFamily: 'Inter',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  protocolRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
  },
  protocolRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  protocolId: {
    fontFamily: 'Inter',
    fontWeight: '700',
  },
  protocolName: {
    fontFamily: 'Inter',
    fontWeight: '400',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  adjustRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  adjustRowInline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  adjustControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adjustButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalEditorCard: {
    gap: 2,
  },
  saveGoalButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  saveGoalLabel: {
    color: '#FFFFFF',
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  goalHistoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  healthNote: {
    borderWidth: 1,
    padding: 10,
    marginBottom: 8,
  },
  unitRow: {
    flexDirection: 'row',
    gap: 8,
  },
  unitButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionLabel: {
    fontFamily: 'Inter',
    fontWeight: '500',
  },
  aboutSection: {
    paddingBottom: 24,
  },
  aboutText: {
    fontFamily: 'Inter',
    lineHeight: 18,
  },
});
