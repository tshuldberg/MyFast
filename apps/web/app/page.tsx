'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { colors, spacing, typography } from '@myfast/ui';
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
} from '@myfast/shared';
import type { ActiveFast, TimerState } from '@myfast/shared';
import { TimerRing } from '@/components/TimerRing';
import { useDatabase } from '@/lib/database';

function getRingState(timer: TimerState): RingState {
  if (timer.state === 'idle') return 'idle';
  if (timer.targetReached) return 'complete';
  return 'fasting';
}

function formatEndTime(startedAt: string, targetHours: number): string {
  const end = new Date(new Date(startedAt).getTime() + targetHours * 3600 * 1000);
  return end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function TimerPage() {
  const db = useDatabase();
  const [activeFast, setActiveFast] = useState<ActiveFast | null>(() => getActiveFast(db));
  const [timer, setTimer] = useState<TimerState>(() => computeTimerState(null, new Date()));
  const [streakCount, setStreakCount] = useState(() => getStreaks(db).currentStreak);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [defaultProtocol] = useState(() => {
    const row = db.get<{ value: string }>(`SELECT value FROM settings WHERE key = ?`, ['defaultProtocol']);
    const found = row?.value ? PRESET_PROTOCOLS.find((p) => p.id === row.value) : null;
    return found ?? PRESET_PROTOCOLS.find((p) => p.isDefault) ?? PRESET_PROTOCOLS[0];
  });

  useEffect(() => {
    if (activeFast) {
      const tick = () => setTimer(computeTimerState(activeFast, new Date()));
      tick();
      intervalRef.current = setInterval(tick, 1000);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    } else {
      setTimer(computeTimerState(null, new Date()));
    }
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
  }, [db, defaultProtocol]);

  const handleEnd = useCallback(() => {
    endFast(db);
    refreshStreakCache(db);
    setStreakCount(getStreaks(db).currentStreak);
    setActiveFast(null);
  }, [db]);

  const ringState = getRingState(timer);

  const timeColor =
    ringState === 'complete'
      ? colors.success
      : ringState === 'fasting'
        ? colors.fasting
        : colors.textTertiary;

  return (
    <main style={styles.container}>
      {/* Timer ring with overlay */}
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
              <div style={{ ...styles.timerText, color: timeColor }}>
                {formatDuration(timer.elapsed)}
              </div>
              <div style={{ ...styles.timerLabel, color: timeColor }}>
                {timer.targetReached ? 'TARGET HIT' : 'FASTING'}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Info rows */}
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
            <InfoRow
              label="Ends at"
              value={formatEndTime(activeFast!.startedAt, activeFast!.targetHours)}
            />
          </>
        )}
      </div>

      {/* Action button */}
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

      {/* Change protocol link */}
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
    maxWidth: 360,
    marginTop: spacing.lg,
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: `${spacing.sm}px 0`,
    fontFamily: 'Inter, system-ui, sans-serif',
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
