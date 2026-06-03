import type { CSSProperties } from 'react';

export const fontFamily = {
  sans: "'DM Sans', system-ui, -apple-system, sans-serif",
  sansMedium: "'DM Sans', system-ui, -apple-system, sans-serif",
  mono: "'Menlo', 'Consolas', 'monospace'",
};

export const typography: Record<TypographyVariant, CSSProperties> = {
  display: {
    fontFamily: fontFamily.sans,
    fontSize: 36,
    fontWeight: 700,
    lineHeight: '42px',
    letterSpacing: '-0.5px',
  },
  h1: {
    fontFamily: fontFamily.sans,
    fontSize: 30,
    fontWeight: 700,
    lineHeight: '36px',
    letterSpacing: '-0.3px',
  },
  h2: {
    fontFamily: fontFamily.sans,
    fontSize: 24,
    fontWeight: 700,
    lineHeight: '30px',
    letterSpacing: '-0.2px',
  },
  h3: {
    fontFamily: fontFamily.sans,
    fontSize: 20,
    fontWeight: 600,
    lineHeight: '26px',
  },
  bodyLarge: {
    fontFamily: fontFamily.sans,
    fontSize: 17,
    fontWeight: 400,
    lineHeight: '26px',
  },
  body: {
    fontFamily: fontFamily.sans,
    fontSize: 15,
    fontWeight: 400,
    lineHeight: '22px',
  },
  bodySmall: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    fontWeight: 400,
    lineHeight: '20px',
  },
  caption: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.7px',
    textTransform: 'uppercase',
    lineHeight: '16px',
  },
  micro: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    fontWeight: 500,
    lineHeight: '15px',
  },
  button: {
    fontFamily: fontFamily.sans,
    fontSize: 15,
    fontWeight: 600,
    lineHeight: '20px',
    letterSpacing: '0.1px',
  },
  mono: {
    fontFamily: fontFamily.mono,
    fontWeight: 700,
    fontSize: 13,
    lineHeight: '20px',
  },
};

export type TypographyVariant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'bodyLarge'
  | 'body'
  | 'bodySmall'
  | 'caption'
  | 'micro'
  | 'button'
  | 'mono';