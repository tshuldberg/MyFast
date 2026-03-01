'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { colors, spacing, typography, borderRadius } from '@myfast/ui';
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
} from '@myfast/shared';
import type { ActiveFast, TimerState, Goal } from '@myfast/shared';
import { TimerRing } from '../components/TimerRing';
import { useDatabase } from '../lib/database';

interface GoalProgressDisplay {
  label: string;
  current: number;
  target: number;
  completed: boolean;
}

function getRingState(timer: TimerState): RingState {
  if (timer.state === 'idle') return 'idle';
  if (timer.targetReached) return 'complete';
  return 'fasting';
}

function formatEndTime(startedAt: string, targetHours: number): string {
  const end = new Date(new Date(startedAt).getTime() + targetHours * 3600 * 1000);
  return end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatGoalValue(goal: Goal, value: number): number {
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
    label,
    current: formatGoalValue(preferred, progress.currentValue),
    target: formatGoalValue(preferred, progress.targetValue),
    completed: progress.completed,
  };
}

export default function TimerPage() {
  const db = useDatabase();
  const [activeFast, setActiveFast] = useState<ActiveFast | null>(() => getActiveFast(db));
  const [timer, setTimer] = useState<TimerState>(() => computeTimerState(null, new Date()));
  const [streakCount, setStreakCount] = useState(() => getStreaks(db).currentStreak);
  const [waterCount, setWaterCount] = useState(0);
  const [waterTarget, setWaterTarget] = useState(8);
  const [goalProgress, setGoalProgress] = useState<GoalProgressDisplay | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [defaultProtocol] = useState(() => {
    const row = db.get<{ value: string }>(`SELECT value FROM settings WHERE key = ?`, ['defaultProtocol']);
    const found = row?.value ? PRESET_PROTOCOLS.find((p) => p.id === row.value) : null;
    return found ?? PRESET_PROTOCOLS.find((p) => p.isDefault) ?? PRESET_PROTOCOLS[0];
  });

  const reloadDailyState = useCallback(() => {
    const water = getWaterIntake(db);
    setWaterCount(water.count);
    setWaterTarget(water.target);

    refreshGoalProgress(db);
    setGoalProgress(getPrimaryGoalProgress(db));
  }, [db]);

  useEffect(() => {
    reloadDailyState();
  }, [reloadDailyState]);

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

  const handleStart = useCallback(() => {
    const fast = startFast(db, defaultProtocol.id, defaultProtocol.fastingHours);
    setActiveFast({
      id: 'current',
      fastId: fast.id,
      protocol: fast.protocol,
      targetHours: fast.targetHours,
      startedAt: fast.startedAt,
    });
    refreshGoalProgress(db);
    setGoalProgress(getPrimaryGoalProgress(db));
  }, [db, defaultProtocol]);

  const handleEnd = useCallback(() => {
    endFast(db);
    refreshStreakCache(db);
    setStreakCount(getStreaks(db).currentStreak);
    setActiveFast(null);
    reloadDailyState();
  }, [db, reloadDailyState]);

  const handleLogWater = useCallback(() => {
    const water = incrementWaterIntake(db);
    setWaterCount(water.count);
    setWaterTarget(water.target);
  }, [db]);

  const ringState = getRingState(timer);
  const currentZone = getCurrentFastingZone(timer.elapsed);
  const currentZoneProgress = getCurrentZoneProgress(timer.elapsed);
  const waterProgress = waterTarget > 0 ? Math.min(1, waterCount / waterTarget) : 0;

  const timeColor =
    ringState === 'complete'
      ? colors.success
      : ringState === 'fasting'
        ? colors.fasting
        : colors.textTertiary;

  return (
    <main style={styles.container}>
      <div style={styles.ringContainer}>
        <TimerRing progress={timer.progress} state={ringState} size={280} strokeWidth={12} />
        <div style={styles.ringOverlay}>
          {timer.state === 'idle' ? (
            <>
              <div style={{ ...styles.idleText, color: colors.textTertiary }}>NOT FASTING</div>
              <div style={{ ...styles.idleHint, color: colors.textTertiary }}>Tap to start</div>
            </>
          ) : (
            <>
              <div style={{ ...styles.timerText, color: timeColor }}>{formatDuration(timer.elapsed)}</div>
              <div style={{ ...styles.timerLabel, color: timeColor }}>
                {timer.targetReached ? 'TARGET HIT' : 'FASTING'}
              </div>
            </>
          )}
        </div>
      </div>

      <div style={styles.infoSection}>
        {timer.state === 'idle' ? (
          <>
            <InfoRow label="Protocol" value={defaultProtocol.id} />
            <InfoRow label="Streak" value={streakCount > 0 ? `${streakCount} day${streakCount !== 1 ? 's' : ''}` : '--'} />
          </>
        ) : timer.targetReached ? (
          <>
            <InfoRow label="Protocol" value={activeFast!.protocol} />
            <InfoRow
              label="Over target by"
              value={formatDuration(timer.elapsed - activeFast!.targetHours * 3600)}
            />
            <InfoRow
              label="Started"
              value={new Date(activeFast!.startedAt).toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit',
              })}
            />
          </>
        ) : (
          <>
            <InfoRow label="Target" value={formatDuration(activeFast!.targetHours * 3600)} />
            <InfoRow label="Remaining" value={formatDuration(timer.remaining)} />
            <InfoRow label="Ends at" value={formatEndTime(activeFast!.startedAt, activeFast!.targetHours)} />
          </>
        )}
      </div>

      <section style={styles.zoneCard}>
        <div style={styles.sectionTitle}>Metabolic Zone</div>
        <div style={styles.zoneName}>{currentZone.name}</div>
        <div style={styles.zoneTitle}>{currentZone.title}</div>
        <p style={styles.zoneDescription}>{currentZone.description}</p>
        <div style={styles.progressTrack}>
          <div style={{ ...styles.progressFill, width: `${Math.max(6, currentZoneProgress * 100)}%` }} />
        </div>
        <div style={styles.zoneTicks}>
          {FASTING_ZONES.map((zone) => (
            <span key={zone.id} style={styles.zoneTickLabel}>{zone.startHour}h</span>
          ))}
        </div>
      </section>

      <section style={styles.waterCard}>
        <div style={styles.sectionHeaderRow}>
          <div style={styles.sectionTitle}>Hydration</div>
          <div style={styles.valueStrong}>{waterCount}/{waterTarget}</div>
        </div>
        <div style={styles.progressTrack}>
          <div style={{ ...styles.progressFill, width: `${Math.max(4, waterProgress * 100)}%` }} />
        </div>
        <div style={styles.sectionActionsRow}>
          <button style={styles.smallActionButton} onClick={handleLogWater}>Log Water</button>
          {waterCount >= waterTarget ? <span style={styles.goalBadge}>Hydration Goal Met</span> : null}
        </div>
      </section>

      {goalProgress ? (
        <section style={styles.goalCard}>
          <div style={styles.sectionHeaderRow}>
            <div style={styles.sectionTitle}>{goalProgress.label}</div>
            <div style={{ ...styles.valueStrong, color: goalProgress.completed ? colors.success : colors.fasting }}>
              {goalProgress.current}/{goalProgress.target}
            </div>
          </div>
          <div style={styles.progressTrack}>
            <div
              style={{
                ...styles.progressFill,
                width: `${Math.min(100, Math.round((goalProgress.current / Math.max(1, goalProgress.target)) * 100))}%`,
                backgroundColor: goalProgress.completed ? colors.success : colors.fasting,
              }}
            />
          </div>
        </section>
      ) : null}

      <div style={{ marginTop: spacing.xl }}>
        {timer.state === 'idle' ? (
          <button style={{ ...styles.button, backgroundColor: colors.fasting }} onClick={handleStart}>
            Start Fast
          </button>
        ) : (
          <button style={{ ...styles.button, backgroundColor: colors.eating }} onClick={handleEnd}>
            End Fast
          </button>
        )}
      </div>

      {timer.state === 'idle' && (
        <button style={styles.changeProtocol}>Change protocol</button>
      )}
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.infoRow}>
      <span style={{ color: colors.textSecondary, fontSize: typography.body.fontSize }}>{label}</span>
      <span style={{ color: colors.text, fontSize: typography.body.fontSize, fontWeight: 600 }}>
        {value}
      </span>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: spacing.lg,
  },
  ringContainer: {
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringOverlay: {
    position: 'absolute' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idleText: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 18,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: 1.5,
  },
  idleHint: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 14,
    marginTop: 4,
  },
  timerText: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: typography.timer.fontSize,
    fontWeight: 700,
    letterSpacing: -1,
  },
  timerLabel: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: typography.timerLabel.fontSize,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: 1.5,
    marginTop: 4,
  },
  infoSection: {
    width: '100%',
    maxWidth: 420,
    marginTop: spacing.lg,
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: `${spacing.sm}px 0`,
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  zoneCard: {
    width: '100%',
    maxWidth: 420,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    border: `1px solid ${colors.border}`,
    padding: spacing.md,
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  waterCard: {
    width: '100%',
    maxWidth: 420,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    border: `1px solid ${colors.border}`,
    padding: spacing.md,
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  goalCard: {
    width: '100%',
    maxWidth: 420,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    border: `1px solid ${colors.border}`,
    padding: spacing.md,
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: 600,
  },
  sectionHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  valueStrong: {
    color: colors.fasting,
    fontWeight: 700,
    fontSize: 14,
  },
  zoneName: {
    color: colors.fasting,
    fontWeight: 700,
    marginTop: 4,
    fontSize: 18,
  },
  zoneTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  zoneDescription: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 8,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.surfaceElevated,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.fasting,
  },
  zoneTicks: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  zoneTickLabel: {
    color: colors.textTertiary,
    fontSize: 10,
  },
  sectionActionsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  smallActionButton: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 11,
    fontWeight: 700,
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 999,
    padding: '8px 12px',
    backgroundColor: colors.fasting,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    cursor: 'pointer' as const,
  },
  goalBadge: {
    color: colors.success,
    border: `1px solid ${colors.success}`,
    borderRadius: 999,
    padding: '4px 8px',
    fontSize: 11,
    fontWeight: 600,
  },
  button: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: typography.subheading.fontSize,
    fontWeight: 700,
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 9999,
    padding: `${spacing.md}px ${spacing.xl}px`,
    minWidth: 200,
    cursor: 'pointer',
  },
  changeProtocol: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: typography.caption.fontSize,
    fontWeight: 500,
    color: colors.textSecondary,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    marginTop: spacing.md,
    padding: spacing.sm,
  },
} as const;
