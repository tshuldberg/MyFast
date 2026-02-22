'use client';

import { useState, useCallback } from 'react';
import { colors, spacing, typography, borderRadius } from '@myfast/ui';
import { PRESET_PROTOCOLS } from '@myfast/shared';
import type { Settings } from '@myfast/shared';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    defaultProtocol: '16:8',
    notifyFastComplete: false,
    notifyEatingWindowClosing: false,
    weightTrackingEnabled: false,
    weightUnit: 'lbs',
    theme: 'dark',
  });

  const updateSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  return (
    <main style={styles.container}>
      <h1 style={{ fontSize: typography.heading.fontSize, fontWeight: 700, color: colors.text, marginBottom: spacing.lg }}>
        Settings
      </h1>

      {/* Default Protocol */}
      <SectionTitle>Default Protocol</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
        {PRESET_PROTOCOLS.map((protocol) => {
          const isSelected = settings.defaultProtocol === protocol.id;
          return (
            <button
              key={protocol.id}
              style={{
                ...styles.protocolRow,
                backgroundColor: isSelected ? colors.surfaceElevated : colors.surface,
                borderColor: isSelected ? colors.fasting : colors.border,
              }}
              onClick={() => updateSetting('defaultProtocol', protocol.id)}
            >
              <div>
                <span style={{ color: colors.fasting, fontWeight: 700, marginRight: 8 }}>{protocol.id}</span>
                <span style={{ color: colors.textSecondary, fontSize: typography.caption.fontSize }}>{protocol.name}</span>
              </div>
              {isSelected && <span style={{ color: colors.fasting }}>&#10003;</span>}
            </button>
          );
        })}
      </div>

      {/* Notifications */}
      <SectionTitle>Notifications</SectionTitle>
      <ToggleRow
        label="Fast complete"
        checked={settings.notifyFastComplete}
        onChange={(v) => updateSetting('notifyFastComplete', v)}
      />
      <ToggleRow
        label="Eating window closing"
        checked={settings.notifyEatingWindowClosing}
        onChange={(v) => updateSetting('notifyEatingWindowClosing', v)}
      />

      {/* Weight Tracking */}
      <SectionTitle>Weight Tracking</SectionTitle>
      <ToggleRow
        label="Enable weight log"
        checked={settings.weightTrackingEnabled}
        onChange={(v) => updateSetting('weightTrackingEnabled', v)}
      />
      {settings.weightTrackingEnabled && (
        <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.xs }}>
          {(['lbs', 'kg'] as const).map((unit) => (
            <button
              key={unit}
              style={{
                ...styles.unitButton,
                backgroundColor: settings.weightUnit === unit ? colors.fasting : colors.surface,
                color: settings.weightUnit === unit ? '#FFFFFF' : colors.textSecondary,
              }}
              onClick={() => updateSetting('weightUnit', unit)}
            >
              {unit}
            </button>
          ))}
        </div>
      )}

      {/* Data */}
      <SectionTitle>Data</SectionTitle>
      <button style={styles.actionButton} onClick={() => alert('CSV export coming soon')}>
        Export as CSV
      </button>
      <button style={{ ...styles.actionButton, color: colors.danger, marginTop: spacing.xs }} onClick={() => {
        if (confirm('Erase all data? This cannot be undone.')) {
          // TODO: Clear all tables
        }
      }}>
        Erase all data
      </button>

      {/* About */}
      <SectionTitle>About</SectionTitle>
      <p style={{ color: colors.textSecondary, fontSize: typography.caption.fontSize, margin: 0 }}>
        MyFast v0.0.1
      </p>
      <p style={{ color: colors.textSecondary, fontSize: typography.caption.fontSize, margin: `${spacing.xs}px 0 0` }}>
        License: FSL-1.1-Apache-2.0
      </p>
      <p style={{ color: colors.textTertiary, fontSize: typography.caption.fontSize, margin: `${spacing.sm}px 0 0` }}>
        All data stored locally. No accounts, no servers, no tracking.
      </p>
    </main>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        color: colors.textSecondary,
        fontSize: typography.label.fontSize,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: typography.label.letterSpacing,
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
      }}
    >
      {children}
    </h2>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.xs,
        cursor: 'pointer',
      }}
    >
      <span style={{ color: colors.text, fontSize: typography.body.fontSize }}>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: colors.fasting, width: 20, height: 20 }}
      />
    </label>
  );
}

const styles = {
  container: {
    maxWidth: 480,
    margin: '0 auto',
    padding: `${spacing.xxl}px ${spacing.lg}px`,
    minHeight: '100vh',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  protocolRow: {
    display: 'flex' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    border: '1px solid',
    cursor: 'pointer' as const,
    background: 'none',
    width: '100%' as const,
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: typography.body.fontSize,
  },
  unitButton: {
    padding: `${10}px ${24}px`,
    borderRadius: borderRadius.sm,
    border: 'none',
    cursor: 'pointer' as const,
    fontFamily: 'Inter, system-ui, sans-serif',
    fontWeight: 600,
    fontSize: typography.body.fontSize,
  },
  actionButton: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 12,
    width: '100%' as const,
    backgroundColor: colors.surface,
    color: colors.text,
    border: 'none',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    cursor: 'pointer' as const,
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: typography.body.fontSize,
    fontWeight: 500,
  },
} as const;
