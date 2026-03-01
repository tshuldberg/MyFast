import { createContext, useContext, useMemo } from 'react';
import { theme as darkTheme, spacing, borderRadius, typography } from './tokens';

/** Color values use string to allow both dark and light hex values */
export interface ThemeRingColors {
  track: string;
  fasting: string;
  complete: string;
  overtime: string;
}

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceElevated: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  fasting: string;
  fastingDim: string;
  fastingGlow: string;
  eating: string;
  eatingDim: string;
  idle: string;
  accent: string;
  success: string;
  ring: ThemeRingColors;
  border: string;
  danger: string;
}

export type ThemeSpacing = typeof spacing;
export type ThemeBorderRadius = typeof borderRadius;
export type ThemeTypography = typeof typography;
export type ThemeMode = 'dark' | 'light';

export interface Theme {
  colors: ThemeColors;
  spacing: ThemeSpacing;
  borderRadius: ThemeBorderRadius;
  typography: ThemeTypography;
}

/** Light theme overrides — only colors change, spacing/typography stay the same */
const lightColors: ThemeColors = {
  background: '#F5F2F8',
  surface: '#EDEAF1',
  surfaceElevated: '#FFFFFF',
  text: '#0D0B0F',
  textSecondary: '#5E5669',
  textTertiary: '#9B92A8',
  fasting: '#0D9488',
  fastingDim: '#99F6E4',
  fastingGlow: '#14B8A6',
  eating: '#DC5845',
  eatingDim: '#FECACA',
  idle: '#9B92A8',
  accent: '#B87A3D',
  success: '#16A34A',
  ring: {
    track: '#E5E1EA',
    fasting: '#0D9488',
    complete: '#16A34A',
    overtime: '#B87A3D',
  },
  border: '#D5D0DC',
  danger: '#DC2626',
};

const lightTheme: Theme = {
  colors: lightColors,
  spacing,
  borderRadius,
  typography,
};

const ThemeContext = createContext<Theme>(darkTheme as Theme);

export interface ThemeProviderProps {
  mode?: ThemeMode;
  children: React.ReactNode;
}

export function ThemeProvider({ mode = 'dark', children }: ThemeProviderProps) {
  const value = useMemo<Theme>(
    () => (mode === 'light' ? lightTheme : (darkTheme as Theme)),
    [mode],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Access the current theme. Must be used inside a ThemeProvider. */
export function useTheme(): Theme {
  return useContext(ThemeContext);
}
