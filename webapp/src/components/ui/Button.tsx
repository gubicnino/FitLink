import { useState } from 'react';
import { colors, radii, shadows } from '../../theme';

type Variant = 'primary' | 'ghost' | 'accent' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  variant?: Variant;
  size?: Size;
  onClick: () => void;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

const SIZES: Record<Size, { h: number; padX: number; fs: number; iconGap: number }> = {
  sm: { h: 34, padX: 14, fs: 13, iconGap: 6 },
  md: { h: 42, padX: 18, fs: 14, iconGap: 8 },
  lg: { h: 50, padX: 22, fs: 15, iconGap: 10 },
};

export default function Button({
  label,
  variant = 'primary',
  size = 'lg',
  onClick,
  disabled,
  leftIcon,
  rightIcon,
  fullWidth,
  type = 'button',
}: ButtonProps) {
  const [hovered, setHovered] = useState(false);
  const sz = SIZES[size];

  const base: React.CSSProperties = {
    height: sz.h,
    borderRadius: radii.lg,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sz.iconGap,
    paddingInline: sz.padX,
    fontFamily: "'DM Sans', system-ui, sans-serif",
    fontSize: sz.fs,
    fontWeight: 700,
    letterSpacing: '0.1px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s ease',
    border: 'none',
    outline: 'none',
    width: fullWidth ? '100%' : 'auto',
    opacity: disabled ? 0.55 : 1,
    whiteSpace: 'nowrap',
  };

  let palette: React.CSSProperties;
  switch (variant) {
    case 'primary':
      palette = {
        background: hovered
          ? `linear-gradient(135deg, ${colors.primaryDark} 0%, ${colors.primary} 100%)`
          : `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
        color: colors.white,
        boxShadow: hovered
          ? `0 6px 20px ${colors.primarySoftStrong}`
          : `0 2px 8px ${colors.primarySoft}`,
        transform: hovered && !disabled ? 'translateY(-1px)' : 'none',
      };
      break;
    case 'accent':
      palette = {
        background: hovered
          ? `linear-gradient(135deg, ${colors.accentDark} 0%, ${colors.accent} 100%)`
          : `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDark} 100%)`,
        color: colors.white,
        boxShadow: hovered ? '0 6px 20px rgba(255,107,53,0.32)' : '0 2px 8px rgba(255,107,53,0.20)',
        transform: hovered && !disabled ? 'translateY(-1px)' : 'none',
      };
      break;
    case 'danger':
      palette = {
        background: hovered ? '#DC2626' : colors.danger,
        color: colors.white,
        boxShadow: hovered ? '0 4px 16px rgba(239,68,68,0.30)' : '0 1px 4px rgba(239,68,68,0.15)',
      };
      break;
    case 'ghost':
    default:
      palette = {
        background: hovered ? colors.surfaceElevated : colors.surface,
        color: colors.inkPrimary,
        border: `1.5px solid ${colors.line}`,
        boxShadow: hovered ? shadows.card : 'none',
      };
      break;
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ ...base, ...palette, paddingBlock: 0 }}
    >
      {leftIcon}
      {label}
      {rightIcon}
    </button>
  );
}
