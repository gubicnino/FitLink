import type { CSSProperties, ReactNode } from 'react';
import { colors, radii, shadows, spacing } from '../../theme';

interface CardProps {
  children: ReactNode;
  padding?: keyof typeof spacing;
  hoverable?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
}

export default function Card({
  children,
  padding = 'xl',
  hoverable = false,
  onClick,
  style,
}: CardProps) {
  const base: CSSProperties = {
    background: colors.surface,
    borderRadius: radii.xl,
    border: `1px solid ${colors.line}`,
    boxShadow: shadows.card,
    padding: spacing[padding],
    transition: hoverable ? 'transform 0.15s ease, box-shadow 0.15s ease' : undefined,
    cursor: onClick ? 'pointer' : undefined,
    ...style,
  };

  if (!hoverable && !onClick) {
    return <div style={base}>{children}</div>;
  }

  return (
    <div
      style={base}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (!hoverable) return;
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = shadows.modal;
      }}
      onMouseLeave={(e) => {
        if (!hoverable) return;
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = shadows.card;
      }}
    >
      {children}
    </div>
  );
}
