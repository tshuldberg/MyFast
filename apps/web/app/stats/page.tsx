'use client';

import { colors, spacing, typography, borderRadius } from '@myfast/ui';
import type { StreakCache } from '@myfast/shared';

function formatHours(seconds: number): string {
  const hours = seconds / 3600;
  if (hours === 0) return '0h';
  if (hours >= 10) return `${Math.round(hours)}h`;
  return `${Math.round(hours * 10) / 10}h`;
}

export default function StatsPage() {
  // TODO: Replace with actual data from DB
  const streaks: StreakCache = {
    currentStreak: 0,
    longestStreak: 0,
    totalFasts: 0,
  };
  const avgDuration = 0;
  const hasData = streaks.totalFasts > 0;

  if (!hasData) {
    return (
      <main style={styles.emptyContainer}>
        <h1 style={{ fontSize: typography.subheading.fontSize, fontWeight: 600, color: colors.text }}>
          No stats yet
        </h1>
        <p style={{ color: colors.textSecondary, fontSize: typography.body.fontSize, marginTop: spacing.xs }}>
          Complete your first fast to see stats.
        </p>
      </main>
    );
  }

  return (
    <main style={styles.container}>
      <h1 style={{ fontSize: typography.heading.fontSize, fontWeight: 700, color: colors.text, marginBottom: spacing.lg }}>
        Stats
      </h1>

      {/* Stat cards */}
      <div style={styles.statGrid}>
        <StatCard label="Current Streak" value={String(streaks.currentStreak)} unit="days" />
        <StatCard label="Longest Streak" value={String(streaks.longestStreak)} unit="days" />
        <StatCard label="Total Fasts" value={String(streaks.totalFasts)} />
        <StatCard label="Avg Duration" value={formatHours(avgDuration)} />
      </div>
    </main>
  );
}

function StatCard({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div style={styles.statCard}>
      <div style={{ fontSize: typography.stat.fontSize, fontWeight: 700, color: colors.text }}>{value}</div>
      {unit && <div style={{ fontSize: typography.statUnit.fontSize, fontWeight: 500, color: colors.textSecondary }}>{unit}</div>}
      <div style={{ fontSize: typography.caption.fontSize, fontWeight: 500, color: colors.textTertiary, marginTop: spacing.xs }}>
        {label}
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 480,
    margin: '0 auto',
    padding: `${spacing.xxl}px ${spacing.lg}px`,
    minHeight: '100vh',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  emptyContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: spacing.lg,
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  statGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: spacing.sm,
  },
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    textAlign: 'center' as const,
  },
} as const;
