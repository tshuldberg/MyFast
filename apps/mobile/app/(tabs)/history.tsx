import { useState, useCallback } from 'react';
import { View, Text, SectionList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@myfast/ui';
import type { Fast } from '@myfast/shared';
import { FastCard } from '@/components/history/FastCard';

interface Section {
  title: string;
  data: Fast[];
}

/** Group fasts by month ("February 2026") */
function groupByMonth(fasts: Fast[]): Section[] {
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
  return Array.from(groups.entries()).map(([title, data]) => ({ title, data }));
}

export default function HistoryScreen() {
  const { colors, spacing, typography } = useTheme();

  // TODO: Replace with actual data from SQLite via listFasts()
  const [fasts] = useState<Fast[]>([]);

  const sections = groupByMonth(fasts);

  const renderSectionHeader = useCallback(
    ({ section }: { section: Section }) => (
      <Text
        style={[
          styles.sectionHeader,
          {
            color: colors.textSecondary,
            fontSize: typography.label.fontSize,
            letterSpacing: typography.label.letterSpacing,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
            backgroundColor: colors.background,
          },
        ]}
      >
        {section.title}
      </Text>
    ),
    [colors, typography, spacing],
  );

  const renderItem = useCallback(
    ({ item }: { item: Fast }) => <FastCard fast={item} />,
    [],
  );

  if (fasts.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="list-outline" size={48} color={colors.textTertiary} />
        <Text
          style={[
            styles.emptyTitle,
            { color: colors.text, fontSize: typography.subheading.fontSize, marginTop: spacing.md },
          ]}
        >
          No fasts recorded yet
        </Text>
        <Text
          style={[
            styles.emptySubtitle,
            { color: colors.textSecondary, fontSize: typography.body.fontSize, marginTop: spacing.xs },
          ]}
        >
          Start your first fast from the Timer tab.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text
        style={[
          styles.screenTitle,
          {
            color: colors.text,
            fontSize: typography.heading.fontSize,
            paddingHorizontal: spacing.md,
            paddingTop: spacing.xxl,
            paddingBottom: spacing.md,
          },
        ]}
      >
        History
      </Text>
      <SectionList
        sections={sections}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xxl }}
        stickySectionHeadersEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenTitle: {
    fontFamily: 'Inter',
    fontWeight: '700',
  },
  sectionHeader: {
    fontFamily: 'Inter',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontFamily: 'Inter',
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: 'Inter',
    fontWeight: '400',
    textAlign: 'center',
  },
});
