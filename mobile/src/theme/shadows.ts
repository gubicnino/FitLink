import { Platform, ViewStyle } from 'react-native';

const shadow = (elevation: number, color = '#000', opacity = 0.08): ViewStyle =>
  Platform.select<ViewStyle>({
    ios: {
      shadowColor: color,
      shadowOffset: { width: 0, height: Math.ceil(elevation / 2) },
      shadowOpacity: opacity,
      shadowRadius: elevation,
    },
    android: {
      elevation,
    },
    default: {},
  })!;

export const shadows = {
  none: {} as ViewStyle,
  card: shadow(2, '#000', 0.05),
  nav: shadow(4, '#000', 0.06),
  fab: shadow(12, '#FF6B35', 0.4),
  modal: shadow(16, '#000', 0.18),
} as const;

export type ShadowToken = keyof typeof shadows;
