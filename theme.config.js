/** @type {const} */
const themeColors = {
  // Primary - Modern blue gradient base
  primary: { light: '#3B82F6', dark: '#60A5FA' },
  
  // Background - Clean with subtle depth
  background: { light: '#F8FAFC', dark: '#0F172A' },
  
  // Surface - Elevated cards with glassmorphism support
  surface: { light: '#FFFFFF', dark: '#1E293B' },
  surfaceElevated: { light: '#FFFFFF', dark: '#334155' },
  
  // Text colors
  foreground: { light: '#0F172A', dark: '#F1F5F9' },
  muted: { light: '#64748B', dark: '#94A3B8' },
  
  // Borders
  border: { light: '#E2E8F0', dark: '#334155' },
  borderLight: { light: '#F1F5F9', dark: '#1E293B' },
  
  // Status colors - Vibrant and modern
  success: { light: '#10B981', dark: '#34D399' },
  successLight: { light: '#D1FAE5', dark: '#064E3B' },
  warning: { light: '#F59E0B', dark: '#FBBF24' },
  warningLight: { light: '#FEF3C7', dark: '#78350F' },
  error: { light: '#EF4444', dark: '#F87171' },
  errorLight: { light: '#FEE2E2', dark: '#7F1D1D' },
  
  // Accent colors for charts and visualization
  accent1: { light: '#8B5CF6', dark: '#A78BFA' }, // Purple
  accent2: { light: '#EC4899', dark: '#F472B6' }, // Pink
  accent3: { light: '#06B6D4', dark: '#22D3EE' }, // Cyan
  accent4: { light: '#F97316', dark: '#FB923C' }, // Orange
  
  // Gradient support
  gradientStart: { light: '#3B82F6', dark: '#6366F1' },
  gradientEnd: { light: '#8B5CF6', dark: '#A78BFA' },
};

module.exports = { themeColors };
