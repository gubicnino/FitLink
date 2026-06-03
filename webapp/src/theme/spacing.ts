export const spacing = {
  xxs:  4,
  xs:   8,
  sm:  12,
  md:  16,
  lg:  20,
  xl:  24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
  section: 64,
  page: 96,
} as const;

export const radii = {
  none: 0,
  xs:   4,
  sm:   6,
  md:  10,
  lg:  14,
  xl:  18,
  xxl: 24,
  pill: 999,
} as const;

export type Spacing = keyof typeof spacing;
export type Radius  = keyof typeof radii;