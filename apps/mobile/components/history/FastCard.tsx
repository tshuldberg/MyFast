import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@myfast/ui';
import { formatDuration } from '@myfast/shared';
import type { Fast } from '@myfast/shared';

interface FastCardProps {
  fast: Fast;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

export function FastCard({ fast }: FastCardProps) {
  const { colors, spacing, borderRadius, typography } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderRadius: borderRadius.md,
          padding: spacing.md,
          marginBottom: spacing.sm,
        },
      ]}
    >
      {/* Top row: protocol badge + hit target indicator */}
      <View style={styles.topRow}>
        <View style={[styles.badge, { backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.sm }]}>
          <Text style={[styles.badgeText, { color: colors.fasting, fontSize: typography.caption.fontSize }]}>
            {fast.protocol}
          </Text>
        </View>
        {fast.hitTarget !== null && (
          <Ionicons
            name={fast.hitTarget ? 'checkmark-circle' : 'close-circle'}
            size={20}
            color={fast.hitTarget ? colors.success : colors.eating}
          />
        )}
      </View>

      {/* Date and times */}
      <Text style={[styles.date, { color: colors.text, fontSize: typography.body.fontSize }]}>
        {formatDate(fast.startedAt)}
      </Text>
      <Text style={[styles.times, { color: colors.textSecondary, fontSize: typography.caption.fontSize }]}>
        {formatTime(fast.startedAt)}
        {fast.endedAt ? ` - ${formatTime(fast.endedAt)}` : ' - ongoing'}
      </Text>

      {/* Duration */}
      {fast.durationSeconds !== null && (
        <Text style={[styles.duration, { color: colors.text, fontSize: typography.subheading.fontSize }]}>
          {formatDuration(fast.durationSeconds)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {},
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontFamily: 'Inter',
    fontWeight: '700',
  },
  date: {
    fontFamily: 'Inter',
    fontWeight: '600',
  },
  times: {
    fontFamily: 'Inter',
    fontWeight: '400',
    marginTop: 2,
  },
  duration: {
    fontFamily: 'Inter',
    fontWeight: '700',
    marginTop: 8,
  },
});
