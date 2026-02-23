import { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, Switch, Pressable, Alert, Share, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@myfast/ui';
import { PRESET_PROTOCOLS, exportFastsCSV, exportWeightCSV, initDatabase } from '@myfast/shared';
import type { Settings, Database } from '@myfast/shared';
import { useDatabase } from '@/lib/database';

function loadSettings(db: Database): Settings {
  const get = (key: string, fallback: string): string => {
    const row = db.get<{ value: string }>(`SELECT value FROM settings WHERE key = ?`, [key]);
    return row?.value ?? fallback;
  };
  return {
    defaultProtocol: get('defaultProtocol', '16:8'),
    notifyFastComplete: get('notifyFastComplete', 'false') === 'true',
    notifyEatingWindowClosing: get('notifyEatingWindowClosing', 'false') === 'true',
    weightTrackingEnabled: get('weightTrackingEnabled', 'false') === 'true',
    weightUnit: get('weightUnit', 'lbs') as 'lbs' | 'kg',
    theme: get('theme', 'dark') as 'dark' | 'light',
  };
}

function persistSetting(db: Database, key: string, value: string): void {
  db.run(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`, [key, value]);
}

export default function SettingsScreen() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const db = useDatabase();

  const [settings, setSettings] = useState<Settings>(() => loadSettings(db));

  const updateSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    const strValue = typeof value === 'boolean' ? String(value) : String(value);
    persistSetting(db, key, strValue);
  }, [db]);

  const handleExport = useCallback(() => {
    const fastsCSV = exportFastsCSV(db);
    const weightCSV = exportWeightCSV(db);
    const combined = `=== Fasts ===\n${fastsCSV}\n=== Weight Entries ===\n${weightCSV}`;
    Share.share({ message: combined, title: 'MyFast Export' });
  }, [db]);

  const handleEraseData = useCallback(() => {
    Alert.alert(
      'Erase All Data',
      'This will permanently delete all fasts, weight entries, and settings. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Erase Everything',
          style: 'destructive',
          onPress: () => {
            db.run(`DELETE FROM fasts`);
            db.run(`DELETE FROM active_fast`);
            db.run(`DELETE FROM weight_entries`);
            db.run(`DELETE FROM streak_cache`);
            db.run(`DELETE FROM settings`);
            // Re-seed defaults
            initDatabase(db);
            setSettings(loadSettings(db));
          },
        },
      ],
    );
  }, [db]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: spacing.xxl }}
    >
      <Text
        style={[
          styles.screenTitle,
          {
            color: colors.text,
            fontSize: typography.heading.fontSize,
            paddingHorizontal: spacing.md,
            paddingTop: spacing.xxl,
            paddingBottom: spacing.lg,
          },
        ]}
      >
        Settings
      </Text>

      {/* Default Protocol */}
      <SectionTitle title="Default Protocol" colors={colors} typography={typography} spacing={spacing} />
      <View style={{ paddingHorizontal: spacing.md }}>
        {PRESET_PROTOCOLS.map((protocol) => {
          const isSelected = settings.defaultProtocol === protocol.id;
          return (
            <Pressable
              key={protocol.id}
              style={[
                styles.protocolRow,
                {
                  backgroundColor: isSelected ? colors.surfaceElevated : colors.surface,
                  borderColor: isSelected ? colors.fasting : colors.border,
                  borderRadius: borderRadius.md,
                  padding: spacing.md,
                  marginBottom: spacing.xs,
                },
              ]}
              onPress={() => updateSetting('defaultProtocol', protocol.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${protocol.id}, ${protocol.name}`}
            >
              <View style={styles.protocolRowInner}>
                <Text style={[styles.protocolId, { color: colors.fasting, fontSize: typography.body.fontSize }]}>
                  {protocol.id}
                </Text>
                <Text style={[styles.protocolName, { color: colors.textSecondary, fontSize: typography.caption.fontSize }]}>
                  {protocol.name}
                </Text>
              </View>
              {isSelected && <Ionicons name="checkmark" size={20} color={colors.fasting} />}
            </Pressable>
          );
        })}
      </View>

      {/* Notifications */}
      <SectionTitle title="Notifications" colors={colors} typography={typography} spacing={spacing} />
      <View style={{ paddingHorizontal: spacing.md }}>
        <ToggleRow
          label="Fast complete"
          value={settings.notifyFastComplete}
          onToggle={(v) => updateSetting('notifyFastComplete', v)}
          colors={colors}
          typography={typography}
          spacing={spacing}
          borderRadius={borderRadius}
        />
        <ToggleRow
          label="Eating window closing"
          value={settings.notifyEatingWindowClosing}
          onToggle={(v) => updateSetting('notifyEatingWindowClosing', v)}
          colors={colors}
          typography={typography}
          spacing={spacing}
          borderRadius={borderRadius}
        />
      </View>

      {/* Weight Tracking */}
      <SectionTitle title="Weight Tracking" colors={colors} typography={typography} spacing={spacing} />
      <View style={{ paddingHorizontal: spacing.md }}>
        <ToggleRow
          label="Enable weight log"
          value={settings.weightTrackingEnabled}
          onToggle={(v) => updateSetting('weightTrackingEnabled', v)}
          colors={colors}
          typography={typography}
          spacing={spacing}
          borderRadius={borderRadius}
        />
        {settings.weightTrackingEnabled && (
          <View style={[styles.unitRow, { marginTop: spacing.xs }]}>
            <UnitButton
              label="lbs"
              selected={settings.weightUnit === 'lbs'}
              onPress={() => updateSetting('weightUnit', 'lbs')}
              colors={colors}
              borderRadius={borderRadius}
            />
            <UnitButton
              label="kg"
              selected={settings.weightUnit === 'kg'}
              onPress={() => updateSetting('weightUnit', 'kg')}
              colors={colors}
              borderRadius={borderRadius}
            />
          </View>
        )}
      </View>

      {/* Data */}
      <SectionTitle title="Data" colors={colors} typography={typography} spacing={spacing} />
      <View style={{ paddingHorizontal: spacing.md }}>
        <Pressable
          style={[styles.actionRow, { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.xs }]}
          onPress={handleExport}
          accessibilityRole="button"
          accessibilityLabel="Export as CSV"
        >
          <Ionicons name="download-outline" size={20} color={colors.text} />
          <Text style={[styles.actionLabel, { color: colors.text, fontSize: typography.body.fontSize }]}>
            Export as CSV
          </Text>
        </Pressable>
        <Pressable
          style={[styles.actionRow, { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md }]}
          onPress={handleEraseData}
          accessibilityRole="button"
          accessibilityLabel="Erase all data"
          accessibilityHint="Double tap to erase all data"
        >
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
          <Text style={[styles.actionLabel, { color: colors.danger, fontSize: typography.body.fontSize }]}>
            Erase all data
          </Text>
        </Pressable>
      </View>

      {/* About */}
      <SectionTitle title="About" colors={colors} typography={typography} spacing={spacing} />
      <View style={[styles.aboutSection, { paddingHorizontal: spacing.md }]}>
        <Text style={[styles.aboutText, { color: colors.textSecondary, fontSize: typography.caption.fontSize }]}>
          MyFast v0.0.1
        </Text>
        <Text style={[styles.aboutText, { color: colors.textSecondary, fontSize: typography.caption.fontSize }]}>
          License: FSL-1.1-Apache-2.0
        </Text>
        <Text style={[styles.aboutText, { color: colors.textTertiary, fontSize: typography.caption.fontSize, marginTop: spacing.sm }]}>
          All data stored locally on your device. No accounts, no servers, no tracking.
        </Text>
      </View>
    </ScrollView>
  );
}

interface SectionTitleProps {
  title: string;
  colors: ReturnType<typeof useTheme>['colors'];
  typography: ReturnType<typeof useTheme>['typography'];
  spacing: ReturnType<typeof useTheme>['spacing'];
}

function SectionTitle({ title, colors, typography, spacing }: SectionTitleProps) {
  return (
    <Text
      style={[
        styles.sectionTitle,
        {
          color: colors.textSecondary,
          fontSize: typography.label.fontSize,
          letterSpacing: typography.label.letterSpacing,
          paddingHorizontal: spacing.md,
          paddingTop: spacing.lg,
          paddingBottom: spacing.sm,
        },
      ]}
    >
      {title}
    </Text>
  );
}

interface ToggleRowProps {
  label: string;
  value: boolean;
  onToggle: (value: boolean) => void;
  colors: ReturnType<typeof useTheme>['colors'];
  typography: ReturnType<typeof useTheme>['typography'];
  spacing: ReturnType<typeof useTheme>['spacing'];
  borderRadius: ReturnType<typeof useTheme>['borderRadius'];
}

function ToggleRow({ label, value, onToggle, colors, typography, spacing, borderRadius }: ToggleRowProps) {
  return (
    <View
      style={[
        styles.toggleRow,
        {
          backgroundColor: colors.surface,
          borderRadius: borderRadius.md,
          padding: spacing.md,
          marginBottom: spacing.xs,
        },
      ]}
    >
      <Text style={{ color: colors.text, fontSize: typography.body.fontSize, fontFamily: 'Inter' }}>
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.border, true: colors.fasting }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

interface UnitButtonProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
  borderRadius: ReturnType<typeof useTheme>['borderRadius'];
}

function UnitButton({ label, selected, onPress, colors, borderRadius }: UnitButtonProps) {
  return (
    <Pressable
      style={[
        styles.unitButton,
        {
          backgroundColor: selected ? colors.fasting : colors.surface,
          borderRadius: borderRadius.sm,
        },
      ]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
    >
      <Text style={{ color: selected ? '#FFFFFF' : colors.textSecondary, fontWeight: '600', fontFamily: 'Inter' }}>
        {label}
      </Text>
    </Pressable>
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
  sectionTitle: {
    fontFamily: 'Inter',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  protocolRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
  },
  protocolRowInner: {
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
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  unitRow: {
    flexDirection: 'row',
    gap: 8,
  },
  unitButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionLabel: {
    fontFamily: 'Inter',
    fontWeight: '500',
  },
  aboutSection: {},
  aboutText: {
    fontFamily: 'Inter',
    fontWeight: '400',
  },
});
