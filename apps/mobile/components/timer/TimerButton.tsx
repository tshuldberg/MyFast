import { Pressable, Text, StyleSheet } from 'react-native';
import { useTheme } from '@myfast/ui';

interface TimerButtonProps {
  label: string;
  color: string;
  onPress: () => void;
}

export function TimerButton({ label, color, onPress }: TimerButtonProps) {
  const { borderRadius, spacing, typography } = useTheme();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: color,
          borderRadius: borderRadius.full,
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.md,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={label === 'Start Fast' ? 'Starts a new fasting timer' : 'Ends the current fast and saves it'}
    >
      <Text style={[styles.label, { fontSize: typography.subheading.fontSize }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
  },
  label: {
    color: '#FFFFFF',
    fontFamily: 'Inter',
    fontWeight: '700',
  },
});
