import React from 'react';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { colors } from '@/constants/theme';

interface SparklineProps {
  data?: number[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
  showEndDot?: boolean;
}

const DEFAULT: number[] = [18, 15, 17, 11, 12, 7, 9, 4];

export function Sparkline({
  data = DEFAULT,
  width = 80,
  height = 24,
  color = colors.primary,
  strokeWidth = 1.75,
  showEndDot = true,
}: SparklineProps) {
  const points = data
    .map((y, i) => {
      const x = (i / (data.length - 1)) * width;
      return `${x},${y}`;
    })
    .join(' ');

  const lastX = width;
  const lastY = data[data.length - 1];

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showEndDot ? <Circle cx={lastX} cy={lastY} r={2} fill={color} /> : null}
    </Svg>
  );
}
