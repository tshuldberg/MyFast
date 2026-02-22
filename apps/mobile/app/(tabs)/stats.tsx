import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@myfast/ui';
import type { StreakCache, DaySummary } from '@myfast/shared';
import { StatCard } from '@/components/stats/StatCard';
import { WeeklyChart } from '@/components/stats/WeeklyChart';

/** Format seconds to "Xh" or "X.Xh" */
function formatHours(seconds: number): string {
  const hours = seconds / 3600;
  if (hours === 0) return '0h';
  if (hours >= 10) return `${Math.round(hours)}h`;
  return `${Math.round(hours * 10) / 10}h`;
}

export default function StatsScreen() {
  const { colors, spacing, typography } = useTheme();

  // TODO: Replace with actual data from SQLite
  const streaks: StreakCache = {
    currentStreak: 0,
    longestStreak: 0,
    totalFasts: 0,
  };
  const avgDuration = 0;
  const weeklyData: DaySummary[] = [];
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
        <StatCard label="Avg Duration" value={formatHours(avgDuration)} />
      </View>

      {/* Weekly chart */}
      {weeklyData.length > 0 && (
        <View style={{ paddingHorizontal: spacing.md, marginTop: spacing.lg }}>
          <WeeklyChart data={weeklyData} targetHours={16} />
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
