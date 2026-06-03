import type { ReactNode } from 'react';
import { colors, radii, spacing, typography } from '../../theme';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
}

export default function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
        padding: spacing.huge,
        textAlign: 'center',
      }}
    >
      {icon ? (
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: radii.pill,
            background: colors.surfaceElevated,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.inkMuted,
          }}
        >
          {icon}
        </div>
      ) : null}
      <h3 style={{ ...typography.h3, color: colors.inkPrimary, margin: 0 }}>{title}</h3>
      {description ? (
        <p
          style={{
            ...typography.body,
            color: colors.inkSecondary,
            margin: 0,
            maxWidth: 380,
          }}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
