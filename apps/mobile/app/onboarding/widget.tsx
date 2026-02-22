import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@myfast/ui';
import { TimerButton } from '@/components/timer/TimerButton';

export default function WidgetScreen() {
  const router = useRouter();
  const { colors, spacing, typography, borderRadius } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Ionicons name="apps-outline" size={64} color={colors.fasting} style={styles.icon} />

      <Text style={[styles.title, { color: colors.text, fontSize: typography.heading.fontSize }]}>
        Add the widget
      </Text>
      <Text
        style={[
          styles.subtitle,
          { color: colors.textSecondary, fontSize: typography.body.fontSize, marginTop: spacing.sm },
        ]}
      >
        See your fasting status at a glance without opening the app.
      </Text>

      {/* Visual instruction card */}
      <View
        style={[
          styles.instructionCard,
          {
            backgroundColor: colors.surface,
            borderRadius: borderRadius.lg,
            padding: spacing.lg,
            marginTop: spacing.xl,
          },
        ]}
      >
        <InstructionStep
          number="1"
          text="Long-press your home screen"
          colors={colors}
          typography={typography}
          spacing={spacing}
        />
        <InstructionStep
          number="2"
          text="Tap the + button in the top corner"
          colors={colors}
          typography={typography}
          spacing={spacing}
        />
        <InstructionStep
          number="3"
          text='Search for "MyFast" and add the widget'
          colors={colors}
          typography={typography}
          spacing={spacing}
        />
      </View>

      <View style={[styles.buttonContainer, { marginTop: spacing.xxl }]}>
        <TimerButton
          label="Continue"
          color={colors.fasting}
          onPress={() => router.push('/onboarding/done')}
        />
      </View>

      <Text
        style={[
          styles.skipText,
          { color: colors.textTertiary, fontSize: typography.caption.fontSize, marginTop: spacing.md },
        ]}
      >
        You can always add it later
      </Text>
    </View>
  );
}

interface InstructionStepProps {
  number: string;
  text: string;
  colors: ReturnType<typeof useTheme>['colors'];
  typography: ReturnType<typeof useTheme>['typography'];
  spacing: ReturnType<typeof useTheme>['spacing'];
}

function InstructionStep({ number, text, colors, typography, spacing }: InstructionStepProps) {
  return (
    <View style={[styles.step, { marginBottom: spacing.md }]}>
      <View style={[styles.stepNumber, { backgroundColor: colors.fasting }]}>
        <Text style={styles.stepNumberText}>{number}</Text>
      </View>
      <Text style={[styles.stepText, { color: colors.text, fontSize: typography.body.fontSize }]}>
        {text}
      </Text>
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
  instructionCard: {
    width: '100%',
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 14,
  },
  stepText: {
    fontFamily: 'Inter',
    fontWeight: '400',
    flex: 1,
  },
  buttonContainer: {
    alignItems: 'center',
  },
  skipText: {
    fontFamily: 'Inter',
    fontWeight: '500',
  },
});
