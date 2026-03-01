'use client';

import { useMemo, useState } from 'react';
import { colors, spacing, typography, borderRadius } from '@myfast/ui';
import type { StreakCache, SummaryStats } from '@myfast/shared';
import {
  getStreaks,
  averageDuration,
  getMonthlySummary,
  getAnnualSummary,
  formatSummaryShareText,
} from '@myfast/shared';
import { useDatabase } from '../../lib/database';

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

function exportSummaryAsPng(summary: SummaryStats, label: string): void {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#0D0B0F';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#2B2433';
  ctx.lineWidth = 4;
  ctx.strokeRect(48, 48, canvas.width - 96, canvas.height - 96);

  ctx.fillStyle = '#F5F2F8';
  ctx.font = '700 56px Inter, sans-serif';
  ctx.fillText('MyFast Summary', 96, 150);

  ctx.fillStyle = '#9B92A8';
  ctx.font = '500 34px Inter, sans-serif';
  ctx.fillText(label, 96, 200);

  const lines = [
    `Total fasts: ${summary.totalFasts}`,
    `Total hours: ${summary.totalHours}h`,
    `Average duration: ${summary.averageDurationHours}h`,
    `Longest fast: ${summary.longestFastHours}h`,
    `Current streak: ${summary.currentStreak} day${summary.currentStreak === 1 ? '' : 's'}`,
    `Adherence: ${summary.adherenceRate}%`,
  ];

  ctx.fillStyle = '#14B8A6';
  ctx.font = '700 44px Inter, sans-serif';
  let y = 320;
  for (const line of lines) {
    ctx.fillText(line, 96, y);
    y += 110;
  }

  ctx.fillStyle = '#6D6478';
  ctx.font = '400 26px Inter, sans-serif';
  ctx.fillText('Generated locally. No cloud sync, no tracking.', 96, 1080);

  const url = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = url;
  link.download = `myfast-summary-${label.toLowerCase().replace(/\s+/g, '-')}.png`;
  link.click();
}

export default function StatsPage() {
  const db = useDatabase();
  const now = new Date();
  const [summaryYear, setSummaryYear] = useState(now.getFullYear());
  const [summaryMonth, setSummaryMonth] = useState(now.getMonth() + 1);

  const streaks: StreakCache = getStreaks(db);
  const avgDuration = averageDuration(db);
  const hasData = streaks.totalFasts > 0;

  const monthlySummary = useMemo(
    () => getMonthlySummary(db, summaryYear, summaryMonth),
    [db, summaryYear, summaryMonth],
  );
  const annualSummary = useMemo(
    () => getAnnualSummary(db, summaryYear),
    [db, summaryYear],
  );

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

  const monthlyLabel = `${new Date(summaryYear, summaryMonth - 1).toLocaleString(undefined, { month: 'long' })} ${summaryYear}`;
  const annualLabel = `${summaryYear}`;

  return (
    <main style={styles.container}>
      <h1 style={{ fontSize: typography.heading.fontSize, fontWeight: 700, color: colors.text, marginBottom: spacing.lg }}>
        Stats
      </h1>

      <div style={styles.statGrid}>
        <StatCard label="Current Streak" value={String(streaks.currentStreak)} unit="days" />
        <StatCard label="Longest Streak" value={String(streaks.longestStreak)} unit="days" />
        <StatCard label="Total Fasts" value={String(streaks.totalFasts)} />
        <StatCard label="Avg Duration" value={formatHours(avgDuration)} />
      </div>

      <div style={styles.summaryControls}>
        <label style={styles.controlLabel}>
          Year
          <input
            type="number"
            value={summaryYear}
            min={2000}
            max={2100}
            onChange={(e) => setSummaryYear(Math.max(2000, Math.min(2100, Number(e.target.value) || now.getFullYear())))}
            style={styles.numberInput}
          />
        </label>
        <label style={styles.controlLabel}>
          Month
          <input
            type="number"
            value={summaryMonth}
            min={1}
            max={12}
            onChange={(e) => setSummaryMonth(Math.max(1, Math.min(12, Number(e.target.value) || now.getMonth() + 1)))}
            style={styles.numberInput}
          />
        </label>
      </div>

      <SummaryCard
        title="Monthly Summary"
        label={monthlyLabel}
        summary={monthlySummary}
        onShare={() => navigator.clipboard.writeText(formatSummaryShareText(monthlySummary, monthlyLabel))}
        onExportPng={() => exportSummaryAsPng(monthlySummary, monthlyLabel)}
      />

      <SummaryCard
        title="Annual Summary"
        label={annualLabel}
        summary={annualSummary}
        onShare={() => navigator.clipboard.writeText(formatSummaryShareText(annualSummary, annualLabel))}
        onExportPng={() => exportSummaryAsPng(annualSummary, annualLabel)}
      />
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

function SummaryCard({
  title,
  label,
  summary,
  onShare,
  onExportPng,
}: {
  title: string;
  label: string;
  summary: SummaryStats;
  onShare: () => void;
  onExportPng: () => void;
}) {
  return (
    <section style={styles.summaryCard}>
      <div style={styles.summaryHeaderRow}>
        <div>
          <h2 style={styles.summaryTitle}>{title}</h2>
          <p style={styles.summaryLabel}>{label}</p>
        </div>
        <div style={styles.summaryActionRow}>
          <button style={styles.ghostButton} onClick={onShare}>Copy Text</button>
          <button style={styles.primaryButton} onClick={onExportPng}>Export PNG</button>
        </div>
      </div>

      <SummaryRow label="Total fasts" value={formatSummaryValue(summary.totalFasts)} />
      <SummaryRow label="Total hours" value={`${formatSummaryValue(summary.totalHours)}h`} />
      <SummaryRow label="Average duration" value={`${formatSummaryValue(summary.averageDurationHours)}h`} />
      <SummaryRow label="Longest fast" value={`${formatSummaryValue(summary.longestFastHours)}h`} />
      <SummaryRow label="Current streak" value={`${formatSummaryValue(summary.currentStreak)}d`} />
      <SummaryRow label="Adherence" value={`${formatSummaryValue(summary.adherenceRate)}%`} />
    </section>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.summaryRow}>
      <span style={styles.summaryRowLabel}>{label}</span>
      <span style={styles.summaryRowValue}>{value}</span>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 620,
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
  summaryControls: {
    display: 'flex',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  controlLabel: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
    color: colors.textSecondary,
    fontSize: typography.caption.fontSize,
    fontWeight: 600,
  },
  numberInput: {
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.sm,
    color: colors.text,
    padding: '8px 10px',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  summaryCard: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  summaryHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  summaryTitle: {
    margin: 0,
    color: colors.text,
    fontSize: 16,
    fontWeight: 700,
  },
  summaryLabel: {
    margin: '2px 0 0',
    color: colors.textSecondary,
    fontSize: typography.caption.fontSize,
  },
  summaryActionRow: {
    display: 'flex',
    gap: 8,
  },
  ghostButton: {
    border: `1px solid ${colors.border}`,
    borderRadius: 999,
    padding: '8px 12px',
    background: 'transparent',
    color: colors.textSecondary,
    fontWeight: 600,
    fontSize: 12,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.7,
    cursor: 'pointer' as const,
  },
  primaryButton: {
    border: 'none',
    borderRadius: 999,
    padding: '8px 12px',
    background: colors.fasting,
    color: '#FFFFFF',
    fontWeight: 700,
    fontSize: 12,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.7,
    cursor: 'pointer' as const,
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  summaryRowLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  summaryRowValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: 700,
  },
} as const;
