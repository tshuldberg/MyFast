import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@myfast/ui';
import type { RingState } from '@myfast/ui';
import { formatDuration } from '@myfast/shared';

interface TimerDisplayProps {
  elapsed: number;
  state: RingState;
  label: string;
}

export function TimerDisplay({ elapsed, state, label }: TimerDisplayProps) {
  const { colors, typography } = useTheme();

  const timeColor =
    state === 'complete'
      ? colors.success
      : state === 'fasting' || state === 'overtime'
        ? colors.fasting
        : colors.textTertiary;

  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;
  const timeParts: string[] = [];
  if (hours > 0) timeParts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
  if (minutes > 0) timeParts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
  timeParts.push(`${seconds} ${seconds === 1 ? 'second' : 'seconds'}`);
  const a11yLabel = `${timeParts.join(', ')} elapsed, ${label}`;

  return (
    <View style={styles.container} accessible accessibilityLabel={a11yLabel} accessibilityRole="timer">
      <Text style={[styles.time, { color: timeColor, fontSize: typography.timer.fontSize }]}>
        {formatDuration(elapsed)}
      </Text>
      <Text
        style={[
          styles.label,
          {
            color: timeColor,
            fontSize: typography.timerLabel.fontSize,
            letterSpacing: typography.timerLabel.letterSpacing,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  time: {
    fontFamily: 'Inter',
    fontWeight: '700',
    letterSpacing: -1,
  },
  label: {
    fontFamily: 'Inter',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 4,
  },
});
