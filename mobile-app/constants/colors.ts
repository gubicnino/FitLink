export const colors = {
  primary: '#2E5B9F',
  primaryDark: '#1E4275',
  primarySoft: 'rgba(46,91,159,0.08)',
  primarySoftStrong: 'rgba(46,91,159,0.15)',
  primaryBorder: 'rgba(46,91,159,0.25)',

  accent: '#FF6B35',
  accentDark: '#E54B1B',
  accentSoft: 'rgba(255,107,53,0.15)',

  success: '#10B981',
  successSoft: 'rgba(16,185,129,0.10)',
  successSoftStrong: 'rgba(16,185,129,0.15)',

  warning: '#F59E0B',
  warningSoft: 'rgba(245,158,11,0.10)',

  danger: '#EF4444',

  bg: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceElevated: '#F4F6F8',

  inkPrimary: '#1A1A1A',
  inkSecondary: '#606060',
  inkMuted: '#9CA3AF',

  line: '#E5E7EB',

  overlayDark: 'rgba(0,0,0,0.30)',
  overlayDarker: 'rgba(0,0,0,0.65)',

  dark: {
    bg: '#0F1419',
    surface: '#1A1F26',
    elevated: '#242B33',
    text: '#FFFFFF',
    textSecondary: '#B0B7C0',
    border: '#2D3540',
  },

  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export type ColorToken = keyof typeof colors;
