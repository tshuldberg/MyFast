import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Line } from 'react-native-svg';
import { useTheme } from '@myfast/ui';
import type { DaySummary } from '@myfast/shared';

interface WeeklyChartProps {
  data: DaySummary[];
  targetHours: number;
}

const CHART_WIDTH = 320;
const CHART_HEIGHT = 160;
const BAR_GAP = 8;
const LABEL_HEIGHT = 20;

export function WeeklyChart({ data, targetHours }: WeeklyChartProps) {
  const { colors, spacing, typography, borderRadius } = useTheme();

  const maxHours = Math.max(targetHours, ...data.map((d) => d.totalHours), 1);
  const barWidth = (CHART_WIDTH - BAR_GAP * (data.length - 1)) / data.length;
  const chartInnerHeight = CHART_HEIGHT - LABEL_HEIGHT;

  const targetY = chartInnerHeight - (targetHours / maxHours) * chartInnerHeight;

  const daysWithData = data.filter((d) => d.totalHours > 0);
  const hitCount = data.filter((d) => d.hitTarget).length;
  const chartSummary = `Weekly fasting chart. ${daysWithData.length} of ${data.length} days with fasts, ${hitCount} targets hit. Target: ${targetHours} hours.`;

  return (
    <View
      style={[styles.container, { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md }]}
      accessible
      accessibilityLabel={chartSummary}
      accessibilityRole="summary"
    >
      <Text style={[styles.title, { color: colors.textSecondary, fontSize: typography.label.fontSize, letterSpacing: typography.label.letterSpacing }]}>
        THIS WEEK
      </Text>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT} style={{ marginTop: spacing.sm }}>
        {/* Target line */}
        <Line
          x1={0}
          y1={targetY}
          x2={CHART_WIDTH}
          y2={targetY}
          stroke={colors.textTertiary}
          strokeWidth={1}
          strokeDasharray="4,4"
        />
        {/* Bars */}
        {data.map((day, i) => {
          const barHeight = (day.totalHours / maxHours) * chartInnerHeight;
          const x = i * (barWidth + BAR_GAP);
          const y = chartInnerHeight - barHeight;
          const fill = day.hitTarget ? colors.success : day.totalHours > 0 ? colors.accent : colors.ring.track;

          return (
            <Rect
              key={day.date}
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(barHeight, 2)}
              rx={4}
              fill={fill}
            />
          );
        })}
      </Svg>
      {/* Day labels */}
      <View style={styles.labels}>
        {data.map((day) => {
          const label = new Date(day.date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'narrow' });
          return (
            <Text key={day.date} style={[styles.dayLabel, { color: colors.textTertiary, width: barWidth + BAR_GAP }]}>
              {label}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  title: {
    fontFamily: 'Inter',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  labels: {
    flexDirection: 'row',
    marginTop: 4,
  },
  dayLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
});
