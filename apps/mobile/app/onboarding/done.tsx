import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@myfast/ui';
import { TimerButton } from '@/components/timer/TimerButton';

export default function DoneScreen() {
  const router = useRouter();
  const { colors, spacing, typography } = useTheme();

  const handleFinish = () => {
    // TODO: persist onboarding-complete flag to settings table
    router.replace('/(tabs)');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Ionicons name="checkmark-circle" size={72} color={colors.success} style={styles.icon} />

      <Text style={[styles.title, { color: colors.text, fontSize: typography.heading.fontSize }]}>
        You're all set
      </Text>
      <Text
        style={[
          styles.subtitle,
          { color: colors.textSecondary, fontSize: typography.body.fontSize, marginTop: spacing.sm },
        ]}
      >
        Start your first fast whenever you're ready.
      </Text>

      <View style={[styles.buttonContainer, { marginTop: spacing.xxl }]}>
        <TimerButton label="Start your first fast" color={colors.fasting} onPress={handleFinish} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  icon: {
    marginBottom: 24,
  },
  title: {
    fontFamily: 'Inter',
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Inter',
    fontWeight: '400',
    textAlign: 'center',
  },
  buttonContainer: {
    alignItems: 'center',
  },
});
