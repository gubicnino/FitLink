import React from 'react';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../../theme';

interface CircularProgressProps {
  size?: number;
  strokeWidth?: number;
  value: number; // 0..1
  trackColor?: string;
  fillColor?: string;
}

export function CircularProgress({
  size = 140,
  strokeWidth = 8,
  value,
  trackColor = colors.dark.elevated,
  fillColor = colors.accent,
}: CircularProgressProps) {
  const clamped = Math.max(0, Math.min(1, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped);
  const half = size / 2;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle
        cx={half}
        cy={half}
        r={radius}
        fill="none"
        stroke={trackColor}
        strokeWidth={strokeWidth}
      />
      <Circle
        cx={half}
        cy={half}
        r={radius}
        fill="none"
        stroke={fillColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${half} ${half})`}
      />
    </Svg>
  );
}
