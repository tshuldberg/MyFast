import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, AccessibilityInfo, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '@myfast/ui';
import type { RingState } from '@myfast/ui';
import {
  computeTimerState,
  formatDuration,
  PRESET_PROTOCOLS,
  getActiveFast,
  startFast,
  endFast,
  getStreaks,
  refreshStreakCache,
  getCurrentFastingZone,
  getCurrentZoneProgress,
  FASTING_ZONES,
  getWaterIntake,
  incrementWaterIntake,
  listGoals,
  getGoalProgress,
  refreshGoalProgress,
  getNotificationPreferences,
} from '@myfast/shared';
import type { ActiveFast, TimerState, Goal } from '@myfast/shared';
import { useDatabase } from '@/lib/database';
import { updateWidgetState, clearWidgetState } from '@/lib/widget-bridge';
import { TimerRing } from '@/components/timer/TimerRing';
import { TimerDisplay } from '@/components/timer/TimerDisplay';
import { TimerButton } from '@/components/timer/TimerButton';
import {
  requestNotificationPermissions,
  scheduleFastMilestoneNotifications,
  cancelFastMilestoneNotifications,
} from '@/components/timer/notifications';

interface GoalProgressDisplay {
  goalId: string;
  label: string;
  current: number;
  target: number;
  completed: boolean;
  unit: string;
}

/** Derive the visual ring state from timer state */
function getRingState(timer: TimerState): RingState {
  if (timer.state === 'idle') return 'idle';
  if (timer.targetReached) return 'complete';
  return 'fasting';
}

/** Format a predicted end time from startedAt + targetHours */
function formatEndTime(startedAt: string, targetHours: number): string {
  const end = new Date(new Date(startedAt).getTime() + targetHours * 3600 * 1000);
  return end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatGoalCurrentValue(goal: Goal, value: number): number {
  if (goal.type === 'hours_per_week' || goal.type === 'hours_per_month') {
    return Math.round(value * 10) / 10;
  }
  return Math.round(value);
}

function getPrimaryGoalProgress(db: ReturnType<typeof useDatabase>): GoalProgressDisplay | null {
  const goals = listGoals(db, false);
  if (goals.length === 0) return null;

  const preferred = goals.find((goal) => goal.type === 'fasts_per_week') ?? goals[0];
  const progress = getGoalProgress(db, preferred.id);
  if (!progress) return null;

  const label = preferred.label ?? (() => {
    switch (preferred.type) {
      case 'fasts_per_week':
        return 'Weekly Fasts Goal';
      case 'hours_per_week':
        return 'Weekly Hours Goal';
      case 'hours_per_month':
        return 'Monthly Hours Goal';
      case 'weight_milestone':
        return 'Weight Milestone';
      default:
        return 'Goal';
    }
  })();

  return {
    goalId: preferred.id,
    label,
    current: formatGoalCurrentValue(preferred, progress.currentValue),
    target: formatGoalCurrentValue(preferred, progress.targetValue),
    completed: progress.completed,
    unit: preferred.unit ?? '',
  };
}

export default function TimerScreen() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const db = useDatabase();

  const [activeFast, setActiveFast] = useState<ActiveFast | null>(null);
  const [timer, setTimer] = useState<TimerState>(() => computeTimerState(null, new Date()));
  const [streakCount, setStreakCount] = useState(0);
  const [waterCount, setWaterCount] = useState(0);
  const [waterTarget, setWaterTarget] = useState(8);
  const [goalProgress, setGoalProgress] = useState<GoalProgressDisplay | null>(null);
  const [defaultProtocol, setDefaultProtocol] = useState(
    () => PRESET_PROTOCOLS.find((p) => p.isDefault) ?? PRESET_PROTOCOLS[0],
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reloadDailyState = useCallback(() => {
    const water = getWaterIntake(db);
    setWaterCount(water.count);
    setWaterTarget(water.target);

    refreshGoalProgress(db);
    setGoalProgress(getPrimaryGoalProgress(db));
  }, [db]);

  // Restore active fast from DB on mount and tab focus, and read default protocol
  useFocusEffect(
    useCallback(() => {
      const active = getActiveFast(db);
      setActiveFast(active);
      const streaks = getStreaks(db);
      setStreakCount(streaks.currentStreak);

      const row = db.get<{ value: string }>(`SELECT value FROM settings WHERE key = ?`, ['defaultProtocol']);
      if (row?.value) {
        const found = PRESET_PROTOCOLS.find((p) => p.id === row.value);
        if (found) setDefaultProtocol(found);
      }

      reloadDailyState();
    }, [db, reloadDailyState]),
  );

  // Update timer state every second when fasting
  useEffect(() => {
    if (activeFast) {
      const tick = () => setTimer(computeTimerState(activeFast, new Date()));
      tick();
      intervalRef.current = setInterval(tick, 1000);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }

    setTimer(computeTimerState(null, new Date()));
    return undefined;
  }, [activeFast]);

  const handleStart = useCallback(async () => {
    const fast = startFast(db, defaultProtocol.id, defaultProtocol.fastingHours);
    setActiveFast({
      id: 'current',
      fastId: fast.id,
      protocol: fast.protocol,
      targetHours: fast.targetHours,
      startedAt: fast.startedAt,
    });

    updateWidgetState({
      state: 'fasting',
      startedAt: fast.startedAt,
      targetHours: fast.targetHours,
      protocol: fast.protocol,
      streakCount,
    });

    refreshGoalProgress(db);
    setGoalProgress(getPrimaryGoalProgress(db));

    const preferences = getNotificationPreferences(db);
    const hasEnabled = Object.values(preferences).some(Boolean);
    if (!hasEnabled) {
      return;
    }

    const granted = await requestNotificationPermissions();
    if (!granted) {
      return;
    }

    await scheduleFastMilestoneNotifications(
      fast.startedAt,
      fast.targetHours,
      fast.protocol,
      preferences,
    );
  }, [db, defaultProtocol, streakCount]);

  const handleEnd = useCallback(() => {
    const completed = endFast(db);
    refreshStreakCache(db);
    const streaks = getStreaks(db);
    setStreakCount(streaks.currentStreak);
    setActiveFast(null);
    clearWidgetState(streaks.currentStreak, completed?.endedAt ?? null);
    reloadDailyState();
    void cancelFastMilestoneNotifications();
  }, [db, reloadDailyState]);

  const handleLogWater = useCallback(() => {
    const updated = incrementWaterIntake(db);
    setWaterCount(updated.count);
    setWaterTarget(updated.target);
  }, [db]);

  const ringState = getRingState(timer);
  const currentZone = getCurrentFastingZone(timer.elapsed);
  const currentZoneProgress = getCurrentZoneProgress(timer.elapsed);
  const waterProgress = waterTarget > 0 ? Math.min(1, waterCount / waterTarget) : 0;

  // Announce state transitions for screen readers
  const prevStateRef = useRef<'idle' | 'fasting' | 'complete'>('idle');
  useEffect(() => {
    const currentState = timer.state === 'idle' ? 'idle' : timer.targetReached ? 'complete' : 'fasting';
    if (currentState !== prevStateRef.current) {
      prevStateRef.current = currentState;
      if (currentState === 'fasting') {
        AccessibilityInfo.announceForAccessibility('Fasting started');
      } else if (currentState === 'complete') {
        AccessibilityInfo.announceForAccessibility('Target reached! You can end your fast now.');
      }
    }
  }, [timer.state, timer.targetReached]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <View style={styles.ringContainer}>
        <TimerRing progress={timer.progress} state={ringState} size={280} strokeWidth={12} />
        <View style={styles.ringOverlay}>
          {timer.state === 'idle' ? (
            <>
              <Text style={[styles.idleText, { color: colors.textTertiary }]}>NOT FASTING</Text>
              <Text style={[styles.idleHint, { color: colors.textTertiary }]}>Tap to start</Text>
            </>
          ) : (
            <TimerDisplay
              elapsed={timer.elapsed}
              state={ringState}
              label={timer.targetReached ? 'TARGET HIT' : 'FASTING'}
            />
          )}
        </View>
      </View>

      <View
        style={[styles.infoSection, { marginTop: spacing.lg }]}
        {...(Platform.OS === 'android' ? { accessibilityLiveRegion: 'polite' as const } : {})}
      >
        {timer.state === 'idle' ? (
          <>
            <InfoRow
              label="Protocol"
              value={defaultProtocol.id}
              colors={colors}
              typography={typography}
            />
            <InfoRow
              label="Streak"
              value={streakCount > 0 ? `${streakCount} day${streakCount !== 1 ? 's' : ''}` : '--'}
              colors={colors}
              typography={typography}
            />
          </>
        ) : timer.targetReached ? (
          <>
            <InfoRow
              label="Protocol"
              value={activeFast!.protocol}
              colors={colors}
              typography={typography}
            />
            <InfoRow
              label="Over target by"
              value={formatDuration(timer.elapsed - activeFast!.targetHours * 3600)}
              colors={colors}
              typography={typography}
            />
            <InfoRow
              label="Started"
              value={new Date(activeFast!.startedAt).toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit',
              })}
              colors={colors}
              typography={typography}
            />
          </>
        ) : (
          <>
            <InfoRow
              label="Target"
              value={formatDuration(activeFast!.targetHours * 3600)}
              colors={colors}
              typography={typography}
            />
            <InfoRow
              label="Remaining"
              value={formatDuration(timer.remaining)}
              colors={colors}
              typography={typography}
            />
            <InfoRow
              label="Ends at"
              value={formatEndTime(activeFast!.startedAt, activeFast!.targetHours)}
              colors={colors}
              typography={typography}
            />
          </>
        )}
      </View>

      <View
        style={[
          styles.zoneCard,
          {
            marginTop: spacing.md,
            backgroundColor: colors.surface,
            borderRadius: borderRadius.md,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.zoneTitle, { color: colors.text, fontSize: typography.body.fontSize }]}>Metabolic Zone</Text>
        <Text style={[styles.zoneName, { color: colors.fasting, fontSize: typography.subheading.fontSize }]}> 
          {currentZone.name}
        </Text>
        <Text style={[styles.zoneHeadline, { color: colors.textSecondary, fontSize: typography.caption.fontSize }]}> 
          {currentZone.title}
        </Text>
        <Text style={[styles.zoneDescription, { color: colors.textSecondary, fontSize: typography.caption.fontSize }]}> 
          {currentZone.description}
        </Text>

        <View style={[styles.zoneTrack, { backgroundColor: colors.surfaceElevated }]}> 
          <View
            style={[
              styles.zoneFill,
              {
                backgroundColor: colors.fasting,
                width: `${Math.max(6, currentZoneProgress * 100)}%`,
              },
            ]}
          />
        </View>

        <View style={styles.zoneTicks}>
          {FASTING_ZONES.map((zone) => (
            <Text key={zone.id} style={[styles.zoneTickText, { color: colors.textTertiary }]}> 
              {zone.startHour}h
            </Text>
          ))}
        </View>
      </View>

      <View
        style={[
          styles.waterCard,
          {
            marginTop: spacing.md,
            backgroundColor: colors.surface,
            borderRadius: borderRadius.md,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.waterHeaderRow}>
          <Text style={[styles.waterTitle, { color: colors.text, fontSize: typography.body.fontSize }]}>Hydration</Text>
          <Text style={[styles.waterValue, { color: colors.fasting }]}> 
            {waterCount}/{waterTarget}
          </Text>
        </View>

        <View style={[styles.waterTrack, { backgroundColor: colors.surfaceElevated }]}> 
          <View
            style={[
              styles.waterFill,
              {
                width: `${Math.max(4, waterProgress * 100)}%`,
                backgroundColor: colors.fasting,
              },
            ]}
          />
        </View>

        <View style={styles.waterActionsRow}>
          <Pressable
            style={[styles.logWaterButton, { backgroundColor: colors.fasting }]}
            onPress={handleLogWater}
            accessibilityRole="button"
            accessibilityLabel="Log water"
          >
            <Text style={styles.logWaterLabel}>Log Water</Text>
          </Pressable>
          {waterCount >= waterTarget ? (
            <View style={[styles.goalMetBadge, { borderColor: colors.success }]}> 
              <Text style={[styles.goalMetText, { color: colors.success }]}>Hydration Goal Met</Text>
            </View>
          ) : null}
        </View>
      </View>

      {goalProgress ? (
        <View
          style={[
            styles.goalCard,
            {
              marginTop: spacing.md,
              backgroundColor: colors.surface,
              borderRadius: borderRadius.md,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.goalHeaderRow}>
            <Text style={[styles.goalTitle, { color: colors.text }]}>{goalProgress.label}</Text>
            <Text style={[styles.goalValue, { color: goalProgress.completed ? colors.success : colors.fasting }]}> 
              {goalProgress.current}/{goalProgress.target}
            </Text>
          </View>
          <View style={[styles.goalTrack, { backgroundColor: colors.surfaceElevated }]}> 
            <View
              style={[
                styles.goalFill,
                {
                  width: `${Math.min(100, Math.round((goalProgress.current / Math.max(1, goalProgress.target)) * 100))}%`,
                  backgroundColor: goalProgress.completed ? colors.success : colors.fasting,
                },
              ]}
            />
          </View>
        </View>
      ) : null}

      <View style={[styles.buttonContainer, { marginTop: spacing.xl }]}> 
        {timer.state === 'idle' ? (
          <TimerButton label="Start Fast" color={colors.fasting} onPress={() => void handleStart()} />
        ) : (
          <TimerButton label="End Fast" color={colors.eating} onPress={handleEnd} />
        )}
      </View>

      {timer.state === 'idle' && (
        <Pressable
          style={[styles.changeProtocol, { marginTop: spacing.md }]}
          accessibilityRole="button"
          accessibilityLabel="Change protocol"
        >
          <Text
            style={[
              styles.changeProtocolText,
              {
                color: colors.textSecondary,
                fontSize: typography.caption.fontSize,
              },
            ]}
          >
            Change protocol
          </Text>
        </Pressable>
      )}
    </View>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
  colors: ReturnType<typeof useTheme>['colors'];
  typography: ReturnType<typeof useTheme>['typography'];
}

function InfoRow({ label, value, colors, typography }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.textSecondary, fontSize: typography.body.fontSize }]}> 
        {label}
      </Text>
      <Text style={[styles.infoValue, { color: colors.text, fontSize: typography.body.fontSize }]}> 
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  ringContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  idleText: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  idleHint: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '400',
    marginTop: 4,
  },
  infoSection: {
    width: '100%',
    paddingHorizontal: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  infoLabel: {
    fontFamily: 'Inter',
    fontWeight: '400',
  },
  infoValue: {
    fontFamily: 'Inter',
    fontWeight: '600',
  },
  zoneCard: {
    width: '100%',
    borderWidth: 1,
    padding: 14,
  },
  zoneTitle: {
    fontFamily: 'Inter',
    fontWeight: '600',
  },
  zoneName: {
    fontFamily: 'Inter',
    fontWeight: '700',
    marginTop: 4,
  },
  zoneHeadline: {
    fontFamily: 'Inter',
    fontWeight: '500',
    marginTop: 2,
  },
  zoneDescription: {
    fontFamily: 'Inter',
    marginTop: 6,
    lineHeight: 18,
  },
  zoneTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 10,
  },
  zoneFill: {
    height: '100%',
    borderRadius: 999,
  },
  zoneTicks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  zoneTickText: {
    fontFamily: 'Inter',
    fontSize: 10,
  },
  waterCard: {
    width: '100%',
    borderWidth: 1,
    padding: 14,
  },
  waterHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  waterTitle: {
    fontFamily: 'Inter',
    fontWeight: '600',
  },
  waterValue: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 16,
  },
  waterTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 10,
  },
  waterFill: {
    height: '100%',
    borderRadius: 999,
  },
  waterActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  logWaterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  logWaterLabel: {
    color: '#FFFFFF',
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  goalMetBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  goalMetText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 11,
  },
  goalCard: {
    width: '100%',
    borderWidth: 1,
    padding: 14,
  },
  goalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalTitle: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 14,
  },
  goalValue: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 14,
  },
  goalTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 8,
  },
  goalFill: {
    height: '100%',
    borderRadius: 999,
  },
  buttonContainer: {
    alignItems: 'center',
  },
  changeProtocol: {
    paddingVertical: 8,
  },
  changeProtocolText: {
    fontFamily: 'Inter',
    fontWeight: '500',
  },
});
