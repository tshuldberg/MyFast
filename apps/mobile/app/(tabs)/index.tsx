import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@myfast/ui';
import type { RingState } from '@myfast/ui';
import { computeTimerState, formatDuration, PRESET_PROTOCOLS } from '@myfast/shared';
import type { ActiveFast, TimerState } from '@myfast/shared';
import { TimerRing } from '@/components/timer/TimerRing';
import { TimerDisplay } from '@/components/timer/TimerDisplay';
import { TimerButton } from '@/components/timer/TimerButton';

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

export default function TimerScreen() {
  const { colors, spacing, typography, borderRadius } = useTheme();

  // In-memory active fast state — will be backed by SQLite once DB wiring is added
  const [activeFast, setActiveFast] = useState<ActiveFast | null>(null);
  const [timer, setTimer] = useState<TimerState>(() => computeTimerState(null, new Date()));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Default protocol
  const defaultProtocol = PRESET_PROTOCOLS.find((p) => p.isDefault) ?? PRESET_PROTOCOLS[0];

  // Update timer state every second when fasting
  useEffect(() => {
    if (activeFast) {
      const tick = () => setTimer(computeTimerState(activeFast, new Date()));
      tick(); // immediate
      intervalRef.current = setInterval(tick, 1000);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    } else {
      setTimer(computeTimerState(null, new Date()));
    }
  }, [activeFast]);

  const handleStart = useCallback(() => {
    const now = new Date().toISOString();
    const fast: ActiveFast = {
      id: 'current',
      fastId: `fast-${Date.now()}`,
      protocol: defaultProtocol.id,
      targetHours: defaultProtocol.fastingHours,
      startedAt: now,
    };
    setActiveFast(fast);
  }, [defaultProtocol]);

  const handleEnd = useCallback(() => {
    setActiveFast(null);
  }, []);

  const ringState = getRingState(timer);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Timer ring with overlay display */}
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

      {/* Info section */}
      <View style={[styles.infoSection, { marginTop: spacing.lg }]}>
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
              value="--"
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

      {/* Action button */}
      <View style={[styles.buttonContainer, { marginTop: spacing.xl }]}>
        {timer.state === 'idle' ? (
          <TimerButton label="Start Fast" color={colors.fasting} onPress={handleStart} />
        ) : (
          <TimerButton label="End Fast" color={colors.eating} onPress={handleEnd} />
        )}
      </View>

      {/* Change protocol link (idle only) */}
      {timer.state === 'idle' && (
        <Pressable style={[styles.changeProtocol, { marginTop: spacing.md }]}>
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
