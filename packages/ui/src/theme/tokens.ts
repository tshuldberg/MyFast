/** MyFast design tokens — dark theme */
export const colors = {
  background: '#0D0B0F',
  surface: '#171419',
  surfaceElevated: '#211D26',
  text: '#F5F2F8',
  textSecondary: '#9B92A8',
  textTertiary: '#5E5669',
  fasting: '#14B8A6',
  fastingDim: '#0D7A6E',
  fastingGlow: '#5EEAD4',
  eating: '#E8725C',
  eatingDim: '#9A4A3B',
  idle: '#5E5669',
  accent: '#D4915E',
  success: '#22C55E',
  ring: {
    track: '#1E1A23',
    fasting: '#14B8A6',
    complete: '#22C55E',
    overtime: '#D4915E',
  },
  border: '#252030',
  danger: '#EF4444',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const typography = {
  timer: { fontFamily: 'Inter', fontSize: 56, fontWeight: '700' as const, letterSpacing: -1 },
  timerLabel: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 1.5,
  },
  heading: { fontFamily: 'Inter', fontSize: 24, fontWeight: '700' as const },
  subheading: { fontFamily: 'Inter', fontSize: 18, fontWeight: '600' as const },
  body: { fontFamily: 'Inter', fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  stat: { fontFamily: 'Inter', fontSize: 32, fontWeight: '700' as const },
  statUnit: { fontFamily: 'Inter', fontSize: 14, fontWeight: '500' as const },
  caption: { fontFamily: 'Inter', fontSize: 13, fontWeight: '500' as const },
  label: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  },
} as const;

export const theme = { colors, spacing, borderRadius, typography } as const;
