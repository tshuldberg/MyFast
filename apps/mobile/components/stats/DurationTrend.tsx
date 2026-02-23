import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Line } from 'react-native-svg';
import { useTheme } from '@myfast/ui';
import type { DurationPoint } from '@myfast/shared';

interface DurationTrendProps {
  data: DurationPoint[];
}

const CHART_WIDTH = 320;
const CHART_HEIGHT = 160;
const PADDING_LEFT = 32;
const PADDING_RIGHT = 8;
const PADDING_TOP = 8;
const PADDING_BOTTOM = 24;

const INNER_WIDTH = CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT;
const INNER_HEIGHT = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

function buildPath(
  points: { x: number; y: number }[],
): string {
  if (points.length === 0) return '';
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`)
    .join(' ');
}

export function DurationTrend({ data }: DurationTrendProps) {
  const { colors, spacing, typography, borderRadius } = useTheme();

  const maxHours = Math.max(...data.map((d) => d.durationHours), ...data.filter((d) => d.movingAverage !== null).map((d) => d.movingAverage!), 1);

  // Scale points
  const dailyPoints = data.map((d, i) => ({
    x: PADDING_LEFT + (i / Math.max(data.length - 1, 1)) * INNER_WIDTH,
    y: PADDING_TOP + INNER_HEIGHT - (d.durationHours / maxHours) * INNER_HEIGHT,
  }));

  const maPoints = data
    .map((d, i) => {
      if (d.movingAverage === null) return null;
      return {
        x: PADDING_LEFT + (i / Math.max(data.length - 1, 1)) * INNER_WIDTH,
        y: PADDING_TOP + INNER_HEIGHT - (d.movingAverage / maxHours) * INNER_HEIGHT,
      };
    })
    .filter(Boolean) as { x: number; y: number }[];

  const dailyPath = buildPath(dailyPoints);
  const maPath = buildPath(maPoints);

  // Y-axis labels: 0 and max
  const yMax = Math.ceil(maxHours);

  // X-axis labels: first and last date
  const firstDate = data.length > 0 ? formatShortDate(data[0].date) : '';
  const lastDate = data.length > 0 ? formatShortDate(data[data.length - 1].date) : '';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderRadius: borderRadius.md,
          padding: spacing.md,
        },
      ]}
      accessible
      accessibilityLabel={`Duration trend over ${data.length} days`}
      accessibilityRole="summary"
    >
      <Text
        style={[
          styles.title,
          {
            color: colors.textSecondary,
            fontSize: typography.label.fontSize,
            letterSpacing: typography.label.letterSpacing,
          },
        ]}
      >
        DURATION TREND
      </Text>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT} style={{ marginTop: spacing.sm }}>
        {/* Y-axis gridlines */}
        <Line
          x1={PADDING_LEFT}
          y1={PADDING_TOP + INNER_HEIGHT}
          x2={CHART_WIDTH - PADDING_RIGHT}
          y2={PADDING_TOP + INNER_HEIGHT}
          stroke={colors.border}
          strokeWidth={1}
        />
        <Line
          x1={PADDING_LEFT}
          y1={PADDING_TOP}
          x2={CHART_WIDTH - PADDING_RIGHT}
          y2={PADDING_TOP}
          stroke={colors.border}
          strokeWidth={0.5}
          strokeDasharray="4,4"
        />

        {/* Daily values line */}
        {dailyPath && (
          <Path d={dailyPath} stroke={colors.fasting} strokeWidth={2} fill="none" />
        )}

        {/* Moving average dashed line */}
        {maPath && (
          <Path d={maPath} stroke={colors.accent} strokeWidth={2} fill="none" strokeDasharray="6,4" />
        )}
      </Svg>

      {/* Axis labels */}
      <View style={styles.xLabels}>
        <Text style={[styles.axisLabel, { color: colors.textTertiary }]}>{firstDate}</Text>
        <Text style={[styles.axisLabel, { color: colors.textTertiary }]}>{lastDate}</Text>
      </View>

      {/* Legend */}
      <View style={[styles.legend, { marginTop: spacing.sm }]}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: colors.fasting }]} />
          <Text style={[styles.legendText, { color: colors.textTertiary }]}>Daily</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: colors.accent, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.accent }]} />
          <Text style={[styles.legendText, { color: colors.textTertiary }]}>7-day avg</Text>
        </View>
      </View>
    </View>
  );
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  container: {},
  title: {
    fontFamily: 'Inter',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  xLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  axisLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '500',
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendSwatch: {
    width: 12,
    height: 3,
    borderRadius: 1,
  },
  legendText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '500',
  },
});
