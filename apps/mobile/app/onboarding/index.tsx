import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@myfast/ui';
import type { RingState } from '@myfast/ui';
import { TimerRing } from '@/components/timer/TimerRing';
import { TimerButton } from '@/components/timer/TimerButton';

export default function WelcomeScreen() {
  const router = useRouter();
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.ringContainer}>
        <TimerRing progress={0.75} state={'fasting' as RingState} size={200} strokeWidth={10} />
      </View>

      <Text style={[styles.title, { color: colors.text, fontSize: typography.heading.fontSize }]}>
        MyFast
      </Text>
      <Text
        style={[
          styles.tagline,
          { color: colors.textSecondary, fontSize: typography.body.fontSize, marginTop: spacing.sm },
        ]}
      >
        A fasting timer. That's it.
      </Text>
      <Text
        style={[
          styles.subtitle,
          { color: colors.textTertiary, fontSize: typography.caption.fontSize, marginTop: spacing.xs },
        ]}
      >
        No subscriptions. No accounts. No pseudo-science.
      </Text>

      <View style={[styles.buttonContainer, { marginTop: spacing.xxl }]}>
        <TimerButton
          label="Get Started"
          color={colors.fasting}
          onPress={() => router.push('/onboarding/protocol')}
        />
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
  ringContainer: {
    marginBottom: 32,
  },
  title: {
    fontFamily: 'Inter',
    fontWeight: '700',
  },
  tagline: {
    fontFamily: 'Inter',
    fontWeight: '400',
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Inter',
    fontWeight: '500',
    textAlign: 'center',
  },
  buttonContainer: {
    alignItems: 'center',
  },
});
