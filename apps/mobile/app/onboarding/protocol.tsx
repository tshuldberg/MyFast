import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@myfast/ui';
import { PRESET_PROTOCOLS } from '@myfast/shared';
import { TimerButton } from '@/components/timer/TimerButton';

export default function ProtocolScreen() {
  const router = useRouter();
  const { colors, spacing, typography, borderRadius } = useTheme();
  const [selected, setSelected] = useState(PRESET_PROTOCOLS[0].id);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text, fontSize: typography.heading.fontSize }]}>
        Choose your protocol
      </Text>
      <Text
        style={[
          styles.subtitle,
          { color: colors.textSecondary, fontSize: typography.body.fontSize, marginTop: spacing.sm },
        ]}
      >
        You can change this anytime in Settings.
      </Text>

      <ScrollView
        style={[styles.grid, { marginTop: spacing.lg }]}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
      >
        {PRESET_PROTOCOLS.map((protocol) => {
          const isSelected = selected === protocol.id;
          return (
            <Pressable
              key={protocol.id}
              style={[
                styles.card,
                {
                  backgroundColor: isSelected ? colors.surfaceElevated : colors.surface,
                  borderColor: isSelected ? colors.fasting : colors.border,
                  borderRadius: borderRadius.md,
                  padding: spacing.md,
                  marginBottom: spacing.sm,
                },
              ]}
              onPress={() => setSelected(protocol.id)}
            >
              <View style={styles.cardHeader}>
                <Text style={[styles.protocolId, { color: colors.fasting, fontSize: typography.subheading.fontSize }]}>
                  {protocol.id}
                </Text>
                <Text style={[styles.protocolName, { color: colors.textSecondary, fontSize: typography.caption.fontSize }]}>
                  {protocol.name}
                </Text>
              </View>
              <Text
                style={[
                  styles.protocolDesc,
                  { color: colors.textTertiary, fontSize: typography.caption.fontSize, marginTop: spacing.xs },
                ]}
                numberOfLines={2}
              >
                {protocol.description}
              </Text>
              <Text style={[styles.hours, { color: colors.textSecondary, fontSize: typography.caption.fontSize, marginTop: spacing.xs }]}>
                Fast {protocol.fastingHours}h
                {protocol.eatingHours > 0 ? ` / Eat ${protocol.eatingHours}h` : ''}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={[styles.buttonContainer, { paddingBottom: spacing.xxl }]}>
        <TimerButton
          label="Continue"
          color={colors.fasting}
          onPress={() => router.push('/onboarding/widget')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
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
  grid: {
    flex: 1,
  },
  gridContent: {
    paddingBottom: 16,
  },
  card: {
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  protocolId: {
    fontFamily: 'Inter',
    fontWeight: '700',
  },
  protocolName: {
    fontFamily: 'Inter',
    fontWeight: '500',
  },
  protocolDesc: {
    fontFamily: 'Inter',
    fontWeight: '400',
  },
  hours: {
    fontFamily: 'Inter',
    fontWeight: '600',
  },
  buttonContainer: {
    alignItems: 'center',
    paddingTop: 16,
  },
});
