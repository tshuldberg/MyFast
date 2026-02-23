import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@myfast/ui';

interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
}

export function StatCard({ label, value, unit }: StatCardProps) {
  const { colors, spacing, borderRadius, typography } = useTheme();

  const a11yLabel = unit ? `${label}, ${value} ${unit}` : `${label}, ${value}`;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderRadius: borderRadius.md,
          padding: spacing.md,
        },
      ]}
      accessible
      accessibilityLabel={a11yLabel}
      accessibilityRole="summary"
    >
      <Text style={[styles.value, { color: colors.text, fontSize: typography.stat.fontSize }]}>
        {value}
      </Text>
      {unit && (
        <Text style={[styles.unit, { color: colors.textSecondary, fontSize: typography.statUnit.fontSize }]}>
          {unit}
        </Text>
      )}
      <Text
        style={[
          styles.label,
          {
            color: colors.textTertiary,
            fontSize: typography.caption.fontSize,
            marginTop: spacing.xs,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
  },
  value: {
    fontFamily: 'Inter',
    fontWeight: '700',
  },
  unit: {
    fontFamily: 'Inter',
    fontWeight: '500',
    marginTop: 2,
  },
  label: {
    fontFamily: 'Inter',
    fontWeight: '500',
    textAlign: 'center',
  },
});
