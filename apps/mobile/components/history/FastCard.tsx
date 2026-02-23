import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@myfast/ui';
import { formatDuration } from '@myfast/shared';
import type { Fast } from '@myfast/shared';

interface FastCardProps {
  fast: Fast;
  onDelete?: (id: string) => void;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

export function FastCard({ fast, onDelete }: FastCardProps) {
  const { colors, spacing, borderRadius, typography } = useTheme();

  const targetLabel = fast.hitTarget === true ? 'target reached' : fast.hitTarget === false ? 'target missed' : '';
  const durationLabel = fast.durationSeconds !== null ? formatDuration(fast.durationSeconds) : 'ongoing';
  const a11yLabel = `${fast.protocol} fast, ${formatDate(fast.startedAt)}, ${durationLabel}${targetLabel ? `, ${targetLabel}` : ''}`;

  const handleLongPress = () => {
    if (!onDelete) return;
    Alert.alert('Delete Fast', 'Are you sure you want to delete this fast?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(fast.id) },
    ]);
  };

  return (
    <Pressable
      onLongPress={handleLongPress}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderRadius: borderRadius.md,
          padding: spacing.md,
          marginBottom: spacing.sm,
        },
      ]}
      accessible
      accessibilityLabel={a11yLabel}
      accessibilityHint="Long press to delete"
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
    </Pressable>
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
