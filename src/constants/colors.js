import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

// Responsive scaling - base on iPhone 15 (393px width)
const scale = (size) => (width / 393) * size;

const moderateScale = (size) => {
  const scaled = scale(size);
  return scaled > size ? size + (scaled - size) * 0.5 : scaled;
};

// =========================
// SKINS (THEMES)
// =========================
export const SKINS = {
  minimal: 'minimal',
  operator: 'operator',
  midnight: 'midnight',
};

// Theme configurations - Premium Black by default
export const THEMES = {
  [SKINS.minimal]: {
    // Premium Black Theme with Dull Red Accent
    bgDeep: '#050505',
    bgPanel: '#0a0a0a',
    bgCard: '#111111',
    primary: '#9b2c2c',
    primaryDim: 'rgba(155, 44, 44, 0.15)',
    textMain: '#ffffff',
    textMuted: '#888888',
    border: '#222222',
    danger: '#ff003c',
    gold: '#d4af37',
    success: '#9b2c2c',
    shadow: 'rgba(0,0,0,0.5)',
    shadowSoft: 'rgba(0,0,0,0.3)',
  },
  [SKINS.operator]: {
    // Skin: OPERATOR (Dark Premium Dull Red) - Default for the app
    bgDeep: '#050505',
    bgPanel: '#0a0a0a',
    bgCard: '#111111',
    primary: '#9b2c2c',
    primaryDim: 'rgba(155, 44, 44, 0.15)',
    textMain: '#ffffff',
    textMuted: '#888888',
    border: '#222222',
    danger: '#ff003c',
    gold: '#ffd700',
    success: '#9b2c2c',
    shadow: 'rgba(0,0,0,0.5)',
    shadowSoft: 'rgba(0,0,0,0.3)',
  },
  [SKINS.midnight]: {
    // Skin: MIDNIGHT (Premium Black with dull red accent)
    bgDeep: '#050505',
    bgPanel: '#0a0a0a',
    bgCard: '#111111',
    primary: '#9b2c2c',
    primaryDim: 'rgba(155, 44, 44, 0.15)',
    textMain: '#ffffff',
    textMuted: '#888888',
    border: '#222222',
    danger: '#ff003c',
    gold: '#ffd700',
    success: '#9b2c2c',
    shadow: 'rgba(0,0,0,0.5)',
    shadowSoft: 'rgba(0,0,0,0.3)',
  },
};

// Get current theme based on skin preference
export function getTheme(skin = SKINS.operator) {
  return THEMES[skin] || THEMES[SKINS.operator];
}

// Default colors object (backwards compatibility - uses Operator theme by default)
const defaultTheme = THEMES[SKINS.operator];

export const Colors = {
  // Dynamic theme colors - these should be accessed via useTheme hook
  // But for backwards compatibility, we export defaults
  background: defaultTheme.bgDeep,
  card: defaultTheme.bgPanel,
  cardLight: defaultTheme.bgCard,
  surface: defaultTheme.bgCard,
  surfaceLight: defaultTheme.bgDeep,
  surfaceElevated: defaultTheme.bgDeep,

  // Text
  text: defaultTheme.textMain,
  textSecondary: defaultTheme.textMain,
  textMuted: defaultTheme.textMuted,
  muted: defaultTheme.textMuted,
  muted2: defaultTheme.textMuted,
  textDark: '#3f3f46',

  // Primary accent
  primary: defaultTheme.primary,
  primaryDark: defaultTheme.primary,
  primaryLight: defaultTheme.primary,
  primarySubtle: defaultTheme.primaryDim,
  primarySubtleMedium: defaultTheme.primaryDim,
  primaryGlow: defaultTheme.primaryDim,

  // Secondary
  accent: defaultTheme.primary,
  accentLight: defaultTheme.primary,

  // Status
  success: defaultTheme.success,
  warning: '#f59e0b',
  error: defaultTheme.danger,
  info: '#3b82f6',

  // Special
  gold: defaultTheme.gold,
  silver: '#d4d4d8',
  bronze: '#f97316',
  orange: '#f97316',
  yellow: '#eab308',

  // Borders / separators
  border: defaultTheme.border,
  borderLight: defaultTheme.border,
  divider: defaultTheme.border,

  overlay: 'rgba(0,0,0,0.6)',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: moderateScale(12),
  lg: moderateScale(16),
  xl: moderateScale(20),
  xxl: moderateScale(28),
  xxxl: moderateScale(36),
};

export const BorderRadius = {
  xs: 6,      // Updated to match HTML reference
  sm: 6,
  md: 12,     // Updated to match HTML reference
  lg: 20,     // Updated to match HTML reference
  xl: 20,
  xxl: 24,
  '2xl': 24,
  '3xl': 28,
  full: 9999,
};

export const Typography = {
  h1: { fontSize: moderateScale(30), fontWeight: '800', letterSpacing: -0.6, lineHeight: moderateScale(36) },
  h2: { fontSize: moderateScale(24), fontWeight: '800', letterSpacing: -0.4, lineHeight: moderateScale(30) },
  h3: { fontSize: moderateScale(18), fontWeight: '700', letterSpacing: -0.2, lineHeight: moderateScale(24) },
  h4: { fontSize: moderateScale(15), fontWeight: '700', letterSpacing: -0.1, lineHeight: moderateScale(20) },

  body: { fontSize: moderateScale(15), fontWeight: '400', letterSpacing: 0, lineHeight: moderateScale(22) },
  bodySmall: { fontSize: moderateScale(13), fontWeight: '400', letterSpacing: 0, lineHeight: moderateScale(18) },
  caption: { fontSize: moderateScale(12), fontWeight: '700', letterSpacing: 1.2, lineHeight: moderateScale(14) },
  mono: { fontSize: moderateScale(12), fontWeight: '600', letterSpacing: 0.2, lineHeight: moderateScale(16) },

  display: { fontSize: moderateScale(22), fontWeight: '800', letterSpacing: -0.2, lineHeight: moderateScale(26) },
  displaySmall: { fontSize: moderateScale(18), fontWeight: '800', letterSpacing: -0.1, lineHeight: moderateScale(22) },

  // New mono typography matching HTML reference
  monoTiny: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  monoSmall: { fontSize: 10, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  monoBody: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  monoLarge: { fontSize: 13, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
};

// Screen utilities
export const isSmallScreen = width < 375;
export const isMediumScreen = width >= 375 && width < 414;
export const isLargeScreen = width >= 414;

// Shadow utilities for theme
export const Shadows = {
  subtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: Platform.OS === 'ios' ? 0.1 : 0.15,
    shadowRadius: 14,
    elevation: 3,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: Platform.OS === 'ios' ? 0.25 : 0.4,
    shadowRadius: 25,
    elevation: 8,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: Platform.OS === 'ios' ? 0.3 : 0.5,
    shadowRadius: 35,
    elevation: 12,
  },
  heavy: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: Platform.OS === 'ios' ? 0.3 : 0.5,
    shadowRadius: 35,
    elevation: 12,
  },
  glow: {
    shadowColor: defaultTheme.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: Platform.OS === 'ios' ? 0.25 : 0.4,
    shadowRadius: 18,
    elevation: 8,
  },
};

export { moderateScale };
