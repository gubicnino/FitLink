import React from 'react';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
import { colors } from '@/constants/theme';

interface FitLinkMarkProps {
  size?: number;
  tone?: 'light' | 'dark';
}

export function FitLinkMark({ size = 64, tone = 'light' }: FitLinkMarkProps) {
  const fg = tone === 'light' ? colors.white : colors.primary;
  const bg = tone === 'light' ? colors.primary : colors.white;
  const bgDark = tone === 'light' ? colors.primaryDark : colors.primarySoft;
  const accent = colors.accent;

  return (
    <Svg width={size} height={size} viewBox="0 0 96 96" fill="none">
      <Defs>
        <LinearGradient id="bgGrad" x1="0.15" y1="0" x2="0.85" y2="1">
          <Stop offset="0" stopColor={bg} stopOpacity="1" />
          <Stop offset="1" stopColor={bgDark} stopOpacity="1" />
        </LinearGradient>
      </Defs>

      {/* Rounded square plate */}
      <Rect x="0" y="0" width="96" height="96" rx="22" ry="22" fill="url(#bgGrad)" />

      {/* Subtle top-left highlight */}
      <Path
        d="M0 24 Q 0 0 24 0 L 60 0 Q 32 4 14 28 L 0 60 Z"
        fill="#FFFFFF"
        opacity={tone === 'light' ? 0.06 : 0}
      />

      {/* Grip / bar — drawn first so plate outlines overlap on top */}
      <Rect x="30" y="45" width="36" height="6" rx="1.5" fill={fg} />

      {/* Left outer plate (thin pill) */}
      <Rect
        x="11"
        y="34"
        width="6"
        height="28"
        rx="3"
        stroke={fg}
        strokeWidth="2.5"
        fill="none"
      />

      {/* Left inner plate (thick pill) */}
      <Rect
        x="20"
        y="30"
        width="10"
        height="36"
        rx="5"
        stroke={fg}
        strokeWidth="2.5"
        fill="none"
      />

      {/* Right inner plate (thick pill) */}
      <Rect
        x="66"
        y="30"
        width="10"
        height="36"
        rx="5"
        stroke={fg}
        strokeWidth="2.5"
        fill="none"
      />

      {/* Right outer plate (thin pill) */}
      <Rect
        x="79"
        y="34"
        width="6"
        height="28"
        rx="3"
        stroke={fg}
        strokeWidth="2.5"
        fill="none"
      />

      {/* Accent node — orange dot at grip center */}
      <Circle cx="48" cy="48" r="4" fill={accent} />
    </Svg>
  );
}
