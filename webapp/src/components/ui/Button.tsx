import { useState } from "react";
import { colors, radii, shadows, spacing } from "../../theme";


interface ButtonProps {
  label: string;
  variant: 'primary' | 'ghost';
  onClick: () => void;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export default function Button({ label, variant, onClick, disabled, leftIcon, fullWidth }: ButtonProps) {
  const [hovered, setHovered] = useState(false);
  const isPrimary = variant === 'primary';

  const base: React.CSSProperties = {
    height: 50, borderRadius: radii.xl,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: spacing.md,
    fontFamily: "'DM Sans', system-ui, sans-serif",
    fontSize: 15, fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s ease',
    border: 'none', outline: 'none',
    width: fullWidth ? '100%' : 'auto',
    opacity: disabled ? 0.6 : 1,
  };

  const primaryStyle: React.CSSProperties = {
    background: hovered
      ? `linear-gradient(135deg, ${colors.primaryDark} 0%, ${colors.primary} 100%)`
      : `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
    color: colors.white,
    boxShadow: hovered ? `0 6px 20px ${colors.primarySoftStrong}` : `0 2px 8px ${colors.primarySoft}`,
    transform: hovered ? 'translateY(-1px)' : 'none',
  };

  const ghostStyle: React.CSSProperties = {
    background: hovered ? colors.surfaceElevated : colors.surface,
    color: colors.inkPrimary,
    border: `1.5px solid ${colors.line}`,
    boxShadow: hovered ? shadows.card : 'none',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ ...base, ...(isPrimary ? primaryStyle : ghostStyle) }}
    >
      {leftIcon}
      {label}
    </button>
  );
}