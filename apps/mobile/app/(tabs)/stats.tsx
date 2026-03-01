import { useState, useCallback, useRef, type RefObject } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Share } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useTheme } from '@myfast/ui';
import type { StreakCache, DaySummary, MonthDay, DurationPoint, SummaryStats } from '@myfast/shared';
import {
  getStreaks,
  averageDuration,
  weeklyRollup,
  monthlyRollup,
  durationTrend,
  getMonthlySummary,
  getAnnualSummary,
  formatSummaryShareText,
} from '@myfast/shared';
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

function formatSummaryValue(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1);
}

export default function StatsScreen() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const db = useDatabase();

  const [streaks, setStreaks] = useState<StreakCache>({ currentStreak: 0, longestStreak: 0, totalFasts: 0 });
  const [avgDur, setAvgDur] = useState(0);
  const [weeklyData, setWeeklyData] = useState<DaySummary[]>([]);
  const now = new Date();
  const [heatmapYear, setHeatmapYear] = useState(now.getFullYear());
  const [heatmapMonth, setHeatmapMonth] = useState(now.getMonth() + 1);
  const [monthlyData, setMonthlyData] = useState<MonthDay[]>([]);
  const [trendData, setTrendData] = useState<DurationPoint[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<SummaryStats>(() => getMonthlySummary(db, now.getFullYear(), now.getMonth() + 1));
  const [annualSummary, setAnnualSummary] = useState<SummaryStats>(() => getAnnualSummary(db, now.getFullYear()));
  const monthlySummaryRef = useRef<View>(null);
  const annualSummaryRef = useRef<View>(null);

  useFocusEffect(
    useCallback(() => {
      setStreaks(getStreaks(db));
      setAvgDur(averageDuration(db));
      setWeeklyData(weeklyRollup(db));
      setMonthlyData(monthlyRollup(db, heatmapYear, heatmapMonth));
      setTrendData(durationTrend(db, 30));
      setMonthlySummary(getMonthlySummary(db, heatmapYear, heatmapMonth));
      setAnnualSummary(getAnnualSummary(db, heatmapYear));
    }, [db, heatmapYear, heatmapMonth]),
  );

  const handleChangeMonth = useCallback((year: number, month: number) => {
    setHeatmapYear(year);
    setHeatmapMonth(month);
    setMonthlyData(monthlyRollup(db, year, month));
    setMonthlySummary(getMonthlySummary(db, year, month));
    setAnnualSummary(getAnnualSummary(db, year));
  }, [db]);

  const handleShareSummary = useCallback(
    async (
      summaryRef: RefObject<View | null>,
      summary: SummaryStats,
      label: string,
    ) => {
      try {
        const uri = await captureRef(summaryRef, {
          format: 'png',
          quality: 1,
          result: 'tmpfile',
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: 'image/png',
            UTI: 'public.png',
            dialogTitle: `${label} Summary`,
          });
          return;
        }
      } catch {
        // Fall back to text share below.
      }

      const message = formatSummaryShareText(summary, label);
      await Share.share({
        title: `${label} Summary`,
        message,
      });
    },
    [],
  );

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

  const monthlyLabel = `${new Date(heatmapYear, heatmapMonth - 1).toLocaleString(undefined, { month: 'long' })} ${heatmapYear}`;
  const annualLabel = `${heatmapYear}`;

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

      <View style={[styles.statRow, { paddingHorizontal: spacing.md, gap: spacing.sm }]}> 
        <StatCard label="Current Streak" value={String(streaks.currentStreak)} unit="days" />
        <StatCard label="Longest Streak" value={String(streaks.longestStreak)} unit="days" />
      </View>
      <View style={[styles.statRow, { paddingHorizontal: spacing.md, gap: spacing.sm, marginTop: spacing.sm }]}> 
        <StatCard label="Total Fasts" value={String(streaks.totalFasts)} />
        <StatCard label="Avg Duration" value={formatHours(avgDur)} />
      </View>

      {weeklyData.length > 0 && (
        <View style={{ paddingHorizontal: spacing.md, marginTop: spacing.lg }}>
          <WeeklyChart data={weeklyData} targetHours={16} />
        </View>
      )}

      <View style={{ paddingHorizontal: spacing.md, marginTop: spacing.lg }}>
        <MonthlyHeatmap
          data={monthlyData}
          year={heatmapYear}
          month={heatmapMonth}
          onChangeMonth={handleChangeMonth}
        />
      </View>

      {trendData.some((d) => d.durationHours > 0) && (
        <View style={{ paddingHorizontal: spacing.md, marginTop: spacing.lg }}>
          <DurationTrend data={trendData} />
        </View>
      )}

      <View ref={monthlySummaryRef} collapsable={false}>
        <View
          style={[
            styles.summaryCard,
            {
              marginTop: spacing.lg,
              marginHorizontal: spacing.md,
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: borderRadius.md,
              padding: spacing.md,
            },
          ]}
        >
          <View style={styles.summaryHeaderRow}>
            <Text style={[styles.summaryTitle, { color: colors.text }]}>Monthly Summary</Text>
            <Pressable
              style={[styles.shareButton, { borderColor: colors.border }]}
              onPress={() => void handleShareSummary(monthlySummaryRef, monthlySummary, monthlyLabel)}
            >
              <Ionicons name="share-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.shareButtonText, { color: colors.textSecondary }]}>Share</Text>
            </Pressable>
          </View>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{monthlyLabel}</Text>
          <SummaryRow label="Total fasts" value={formatSummaryValue(monthlySummary.totalFasts)} colors={colors} />
          <SummaryRow label="Total hours" value={`${formatSummaryValue(monthlySummary.totalHours)}h`} colors={colors} />
          <SummaryRow label="Average duration" value={`${formatSummaryValue(monthlySummary.averageDurationHours)}h`} colors={colors} />
          <SummaryRow label="Longest fast" value={`${formatSummaryValue(monthlySummary.longestFastHours)}h`} colors={colors} />
          <SummaryRow label="Current streak" value={`${formatSummaryValue(monthlySummary.currentStreak)}d`} colors={colors} />
          <SummaryRow label="Adherence" value={`${formatSummaryValue(monthlySummary.adherenceRate)}%`} colors={colors} />
        </View>
      </View>

      <View ref={annualSummaryRef} collapsable={false}>
        <View
          style={[
            styles.summaryCard,
            {
              marginTop: spacing.md,
              marginHorizontal: spacing.md,
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: borderRadius.md,
              padding: spacing.md,
            },
          ]}
        >
          <View style={styles.summaryHeaderRow}>
            <Text style={[styles.summaryTitle, { color: colors.text }]}>Annual Summary</Text>
            <Pressable
              style={[styles.shareButton, { borderColor: colors.border }]}
              onPress={() => void handleShareSummary(annualSummaryRef, annualSummary, annualLabel)}
            >
              <Ionicons name="share-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.shareButtonText, { color: colors.textSecondary }]}>Share</Text>
            </Pressable>
          </View>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{annualLabel}</Text>
          <SummaryRow label="Total fasts" value={formatSummaryValue(annualSummary.totalFasts)} colors={colors} />
          <SummaryRow label="Total hours" value={`${formatSummaryValue(annualSummary.totalHours)}h`} colors={colors} />
          <SummaryRow label="Average duration" value={`${formatSummaryValue(annualSummary.averageDurationHours)}h`} colors={colors} />
          <SummaryRow label="Longest fast" value={`${formatSummaryValue(annualSummary.longestFastHours)}h`} colors={colors} />
          <SummaryRow label="Current streak" value={`${formatSummaryValue(annualSummary.currentStreak)}d`} colors={colors} />
          <SummaryRow label="Adherence" value={`${formatSummaryValue(annualSummary.adherenceRate)}%`} colors={colors} />
        </View>
      </View>
    </ScrollView>
  );
}

function SummaryRow({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryRowLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.summaryRowValue, { color: colors.text }]}>{value}</Text>
    </View>
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
  summaryCard: {
    borderWidth: 1,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTitle: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 16,
  },
  summaryLabel: {
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 12,
    marginTop: 2,
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  summaryRowLabel: {
    fontFamily: 'Inter',
    fontSize: 13,
  },
  summaryRowValue: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 13,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  shareButtonText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
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
