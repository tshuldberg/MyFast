import { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@myfast/ui';
import type { StreakCache, DaySummary, MonthDay, DurationPoint } from '@myfast/shared';
import { getStreaks, averageDuration, weeklyRollup, monthlyRollup, durationTrend } from '@myfast/shared';
import { useDatabase } from '@/lib/database';
import { StatCard } from '@/components/stats/StatCard';
import { WeeklyChart } from '@/components/stats/WeeklyChart';
import { MonthlyHeatmap } from '@/components/stats/MonthlyHeatmap';
import { DurationTrend } from '@/components/stats/DurationTrend';

/** Format seconds to "Xh" or "X.Xh" */
function formatHours(seconds: number): string {
  const hours = seconds / 3600;
  if (hours === 0) return '0h';
  if (hours >= 10) return `${Math.round(hours)}h`;
  return `${Math.round(hours * 10) / 10}h`;
}

export default function StatsScreen() {
  const { colors, spacing, typography } = useTheme();
  const db = useDatabase();

  const [streaks, setStreaks] = useState<StreakCache>({ currentStreak: 0, longestStreak: 0, totalFasts: 0 });
  const [avgDur, setAvgDur] = useState(0);
  const [weeklyData, setWeeklyData] = useState<DaySummary[]>([]);
  const now = new Date();
  const [heatmapYear, setHeatmapYear] = useState(now.getFullYear());
  const [heatmapMonth, setHeatmapMonth] = useState(now.getMonth() + 1);
  const [monthlyData, setMonthlyData] = useState<MonthDay[]>([]);
  const [trendData, setTrendData] = useState<DurationPoint[]>([]);

  useFocusEffect(
    useCallback(() => {
      setStreaks(getStreaks(db));
      setAvgDur(averageDuration(db));
      setWeeklyData(weeklyRollup(db));
      setMonthlyData(monthlyRollup(db, heatmapYear, heatmapMonth));
      setTrendData(durationTrend(db, 30));
    }, [db, heatmapYear, heatmapMonth]),
  );

  const handleChangeMonth = useCallback((year: number, month: number) => {
    setHeatmapYear(year);
    setHeatmapMonth(month);
    setMonthlyData(monthlyRollup(db, year, month));
  }, [db]);

  const hasData = streaks.totalFasts > 0;

  if (!hasData) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="bar-chart-outline" size={48} color={colors.textTertiary} />
        <Text
          style={[
            styles.emptyTitle,
            { color: colors.text, fontSize: typography.subheading.fontSize, marginTop: spacing.md },
          ]}
        >
          No stats yet
        </Text>
        <Text
          style={[
            styles.emptySubtitle,
            { color: colors.textSecondary, fontSize: typography.body.fontSize, marginTop: spacing.xs },
          ]}
        >
          Complete your first fast to see stats.
        </Text>
      </View>
    );
  }

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
        Stats
      </Text>

      {/* Stat cards row */}
      <View style={[styles.statRow, { paddingHorizontal: spacing.md, gap: spacing.sm }]}>
        <StatCard label="Current Streak" value={String(streaks.currentStreak)} unit="days" />
        <StatCard label="Longest Streak" value={String(streaks.longestStreak)} unit="days" />
      </View>
      <View style={[styles.statRow, { paddingHorizontal: spacing.md, gap: spacing.sm, marginTop: spacing.sm }]}>
        <StatCard label="Total Fasts" value={String(streaks.totalFasts)} />
        <StatCard label="Avg Duration" value={formatHours(avgDur)} />
      </View>

      {/* Weekly chart */}
      {weeklyData.length > 0 && (
        <View style={{ paddingHorizontal: spacing.md, marginTop: spacing.lg }}>
          <WeeklyChart data={weeklyData} targetHours={16} />
        </View>
      )}

      {/* Monthly heatmap */}
      <View style={{ paddingHorizontal: spacing.md, marginTop: spacing.lg }}>
        <MonthlyHeatmap
          data={monthlyData}
          year={heatmapYear}
          month={heatmapMonth}
          onChangeMonth={handleChangeMonth}
        />
      </View>

      {/* Duration trend */}
      {trendData.some((d) => d.durationHours > 0) && (
        <View style={{ paddingHorizontal: spacing.md, marginTop: spacing.lg }}>
          <DurationTrend data={trendData} />
        </View>
      )}
    </ScrollView>
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
  statRow: {
    flexDirection: 'row',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontFamily: 'Inter',
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: 'Inter',
    fontWeight: '400',
    textAlign: 'center',
  },
});
