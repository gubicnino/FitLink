import { Platform, TextStyle } from 'react-native';

export const fontFamily = {
  sans: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' })!,
  sansMedium: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'System' })!,
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' })!,
};

export const typography = {
  display: {
    fontFamily: fontFamily.sans,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 32,
    letterSpacing: -0.3,
  } as TextStyle,
  h1: {
    fontFamily: fontFamily.sans,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 28,
    letterSpacing: -0.2,
  } as TextStyle,
  h2: {
    fontFamily: fontFamily.sans,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 26,
  } as TextStyle,
  h3: {
    fontFamily: fontFamily.sans,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 24,
  } as TextStyle,
  bodyLarge: {
    fontFamily: fontFamily.sans,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  } as TextStyle,
  body: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  } as TextStyle,
  bodySmall: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  } as TextStyle,
  caption: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    lineHeight: 16,
  } as TextStyle,
  micro: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 15,
  } as TextStyle,
  button: {
    fontFamily: fontFamily.sans,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  } as TextStyle,
  mono: {
    fontFamily: fontFamily.mono,
    fontWeight: '700',
  } as TextStyle,
} as const;

export type TypographyVariant = keyof typeof typography;
