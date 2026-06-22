import React from 'react';
import { BadgeCheck as BadgeCheckIcon } from 'lucide-react-native';
import { colors } from '@/constants/theme';

interface BadgeCheckProps {
  size?: number;
  color?: string;
}

export function BadgeCheck({ size = 15, color = colors.primary }: BadgeCheckProps) {
  return (
    <BadgeCheckIcon
      size={size}
      color={colors.white}
      fill={color}
      strokeWidth={2.5}
    />
  );
}
