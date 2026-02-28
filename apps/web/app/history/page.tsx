'use client';

import { colors, spacing, typography } from '@myfast/ui';
import type { Fast } from '@myfast/shared';
import { formatDuration, listFasts } from '@myfast/shared';
import { useDatabase } from '../../lib/database';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function groupByMonth(fasts: Fast[]): Map<string, Fast[]> {
  const groups = new Map<string, Fast[]>();
  for (const fast of fasts) {
    const date = new Date(fast.startedAt);
    const key = date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const group = groups.get(key);
    if (group) {
      group.push(fast);
    } else {
      groups.set(key, [fast]);
    }
  }
  return groups;
}

export default function HistoryPage() {
  const db = useDatabase();
  const fasts: Fast[] = listFasts(db, { limit: 200 });

  if (fasts.length === 0) {
    return (
      <main style={styles.emptyContainer}>
        <h1 style={{ fontSize: typography.subheading.fontSize, fontWeight: 600, color: colors.text }}>
          No fasts recorded yet
        </h1>
        <p style={{ color: colors.textSecondary, fontSize: typography.body.fontSize, marginTop: spacing.xs }}>
          Start your first fast from the Timer tab.
        </p>
      </main>
    );
  }

  const groups = groupByMonth(fasts);

  return (
    <main style={styles.container}>
      <h1 style={{ fontSize: typography.heading.fontSize, fontWeight: 700, color: colors.text, marginBottom: spacing.lg }}>
        History
      </h1>
      {Array.from(groups.entries()).map(([month, monthFasts]) => (
        <section key={month} style={{ marginBottom: spacing.lg }}>
          <h2 style={styles.sectionHeader}>{month}</h2>
          {monthFasts.map((fast) => (
            <div key={fast.id} style={styles.card}>
              <div style={styles.cardTopRow}>
                <span style={styles.badge}>{fast.protocol}</span>
                <span style={{ color: fast.hitTarget ? colors.success : colors.eating }}>
                  {fast.hitTarget ? '\u2713' : '\u2717'}
                </span>
              </div>
              <div style={{ color: colors.text, fontSize: typography.body.fontSize, fontWeight: 600 }}>
                {formatDate(fast.startedAt)}
              </div>
              <div style={{ color: colors.textSecondary, fontSize: typography.caption.fontSize, marginTop: 2 }}>
                {formatTime(fast.startedAt)}
                {fast.endedAt ? ` - ${formatTime(fast.endedAt)}` : ' - ongoing'}
              </div>
              {fast.durationSeconds !== null && (
                <div style={{ color: colors.text, fontSize: typography.subheading.fontSize, fontWeight: 700, marginTop: spacing.sm }}>
                  {formatDuration(fast.durationSeconds)}
                </div>
              )}
            </div>
          ))}
        </section>
      ))}
    </main>
  );
}

const styles = {
  container: {
    maxWidth: 480,
    margin: '0 auto',
    padding: `${spacing.xxl}px ${spacing.lg}px`,
    minHeight: '100vh',
  },
  emptyContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: spacing.lg,
  },
  sectionHeader: {
    color: colors.textSecondary,
    fontSize: typography.label.fontSize,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: typography.label.letterSpacing,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  badge: {
    backgroundColor: colors.surfaceElevated,
    color: colors.fasting,
    fontSize: typography.caption.fontSize,
    fontWeight: 700,
    padding: `${4}px ${8}px`,
    borderRadius: 8,
  },
} as const;
