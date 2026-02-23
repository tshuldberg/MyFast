import { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@myfast/ui';
import type { MonthDay } from '@myfast/shared';

interface MonthlyHeatmapProps {
  data: MonthDay[];
  year: number;
  month: number;
  onChangeMonth: (year: number, month: number) => void;
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const CELL_SIZE = 36;
const CELL_GAP = 4;

function statusColor(status: MonthDay['status'], colors: ReturnType<typeof useTheme>['colors']): string {
  switch (status) {
    case 'hit_target':
      return '#22C55E';
    case 'fasted':
      return '#D4915E';
    default:
      return 'transparent';
  }
}

export function MonthlyHeatmap({ data, year, month, onChangeMonth }: MonthlyHeatmapProps) {
  const { colors, spacing, typography, borderRadius } = useTheme();

  const monthName = new Date(year, month - 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  // What day of the week does the 1st fall on? (0=Sun)
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const daysInMonth = data.length;

  const handlePrev = useCallback(() => {
    const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
    onChangeMonth(prev.y, prev.m);
  }, [year, month, onChangeMonth]);

  const handleNext = useCallback(() => {
    const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
    onChangeMonth(next.y, next.m);
  }, [year, month, onChangeMonth]);

  // Build the grid rows
  const weeks: (MonthDay | null)[][] = [];
  let currentWeek: (MonthDay | null)[] = new Array(firstDayOfWeek).fill(null);

  for (let d = 0; d < daysInMonth; d++) {
    currentWeek.push(data[d]);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  const today = new Date();
  const todayStr =
    today.getFullYear() === year && today.getMonth() + 1 === month
      ? today.toISOString().slice(0, 10)
      : null;

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
    >
      {/* Header with navigation */}
      <View style={styles.header}>
        <Pressable onPress={handlePrev} accessibilityLabel="Previous month" hitSlop={8}>
          <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
        </Pressable>
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
          {monthName.toUpperCase()}
        </Text>
        <Pressable onPress={handleNext} accessibilityLabel="Next month" hitSlop={8}>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>

      {/* Day-of-week labels */}
      <View style={styles.row}>
        {DAY_LABELS.map((label, i) => (
          <View key={i} style={[styles.cell, { width: CELL_SIZE, height: 20 }]}>
            <Text style={[styles.dayLabel, { color: colors.textTertiary }]}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.row}>
          {week.map((day, di) => {
            if (!day) {
              return <View key={`empty-${di}`} style={[styles.cell, { width: CELL_SIZE, height: CELL_SIZE }]} />;
            }
            const dayNum = parseInt(day.date.slice(-2), 10);
            const bg = statusColor(day.status, colors);
            const isToday = day.date === todayStr;

            return (
              <View
                key={day.date}
                style={[
                  styles.cell,
                  {
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    backgroundColor: bg,
                    borderRadius: 6,
                    borderWidth: isToday ? 1.5 : 0,
                    borderColor: isToday ? colors.fasting : 'transparent',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dayNumber,
                    {
                      color:
                        day.status !== 'none' ? '#FFFFFF' : colors.textTertiary,
                    },
                  ]}
                >
                  {dayNum}
                </Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontFamily: 'Inter',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: CELL_GAP,
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '600',
  },
  dayNumber: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '500',
  },
});
