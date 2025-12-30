/** @type {const} */
const themeColors = {
  // Primary - Slightly desaturated for dark mode to reduce neon effect
  primary: { light: '#2563EB', dark: '#60A5FA' }, 

  // Background - Kept same, Slate-900 is good, but text needs to be softer
  background: { light: '#FFFFFF', dark: '#0F172A' },

  // Surface - Adjusted slightly for better depth perception
  surface: { light: '#F8FAFC', dark: '#1E293B' },
  surfaceElevated: { light: '#FFFFFF', dark: '#334155' },

  // Text colors - REDUCED CONTRAST HERE
  foreground: { 
    light: '#1E293B', 
    dark: '#E2E8F0' 
  },
  muted: { 
    light: '#64748B', 
    dark: '#94A3B8'   
  },

  // Borders - SUBTLER BORDERS
  border: { 
    light: '#E2E8F0', 
    dark: '#334155'
  },
  borderLight: { 
    light: '#F1F5F9', 
    dark: '#1E293B' 
  },

  // Status colors - Slightly pastel/muted for dark mode
  success: { light: '#059669', dark: '#34D399' },
  successLight: { light: '#D1FAE5', dark: '#064E3B' },
  warning: { light: '#D97706', dark: '#FBBF24' },
  warningLight: { light: '#FEF3C7', dark: '#78350F' },
  error: { light: '#DC2626', dark: '#F87171' },
  errorLight: { light: '#FEE2E2', dark: '#7F1D1D' },

  // Accent colors - Adjusted to be less neon
  accent1: { light: '#7C3AED', dark: '#C4B5FD' },
  accent2: { light: '#DB2777', dark: '#F9A8D4' },
  accent3: { light: '#0891B2', dark: '#67E8F9' },
  accent4: { light: '#EA580C', dark: '#FDBA74' },

  // Gradient support
  gradientStart: { light: '#2563EB', dark: '#818CF8' },
  gradientEnd: { light: '#7C3AED', dark: '#C4B5FD' },
};

module.exports = { themeColors };