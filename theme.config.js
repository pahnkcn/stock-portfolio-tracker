/** @type {const} */
const themeColors = {
  // Primary - Strong blue for better visibility
  primary: { light: '#2563EB', dark: '#3B82F6' },
  
  // Background - Clean backgrounds
  background: { light: '#FFFFFF', dark: '#0F172A' },
  
  // Surface - Cards with good contrast
  surface: { light: '#F8FAFC', dark: '#1E293B' },
  surfaceElevated: { light: '#FFFFFF', dark: '#334155' },
  
  // Text colors - High contrast for readability
  foreground: { light: '#1E293B', dark: '#F8FAFC' },
  muted: { light: '#475569', dark: '#CBD5E1' }, // Darker muted for better readability
  
  // Borders - Visible but subtle
  border: { light: '#CBD5E1', dark: '#475569' },
  borderLight: { light: '#E2E8F0', dark: '#334155' },
  
  // Status colors - Vibrant and clear
  success: { light: '#059669', dark: '#10B981' }, // Darker green for light mode
  successLight: { light: '#D1FAE5', dark: '#064E3B' },
  warning: { light: '#D97706', dark: '#F59E0B' }, // Darker orange for light mode
  warningLight: { light: '#FEF3C7', dark: '#78350F' },
  error: { light: '#DC2626', dark: '#EF4444' }, // Darker red for light mode
  errorLight: { light: '#FEE2E2', dark: '#7F1D1D' },
  
  // Accent colors for charts - High contrast
  accent1: { light: '#7C3AED', dark: '#A78BFA' }, // Purple
  accent2: { light: '#DB2777', dark: '#F472B6' }, // Pink
  accent3: { light: '#0891B2', dark: '#22D3EE' }, // Cyan
  accent4: { light: '#EA580C', dark: '#FB923C' }, // Orange
  
  // Gradient support
  gradientStart: { light: '#2563EB', dark: '#6366F1' },
  gradientEnd: { light: '#7C3AED', dark: '#A78BFA' },
};

module.exports = { themeColors };
