import type { CSSProperties, ReactNode } from 'react';
import { colors, radii, spacing, typography } from '../../theme';


interface SectionHeaderProps {
  label: string;
  count?: number | null;
  countTone?: 'neutral' | 'accent' | 'danger';
  action?: ReactNode;
  style?: CSSProperties;
}

export default function SectionHeader({
  label,
  count,
  countTone = 'neutral',
  action,
  style,
}: SectionHeaderProps) {
  const countStyles: Record<
    NonNullable<SectionHeaderProps['countTone']>,
    { bg: string; fg: string }
  > = {
    neutral: { bg: colors.surfaceElevated, fg: colors.inkSecondary },
    accent: { bg: colors.accent, fg: colors.white },
    danger: { bg: 'rgba(239,68,68,0.10)', fg: colors.danger },
  };
  const c = countStyles[countTone];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.md,
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
        <div
          aria-hidden
          style={{
            width: 3,
            height: 14,
            borderRadius: 2,
            background: colors.accent,
          }}
        />
        <div
          style={{
            ...typography.caption,
            color: colors.inkPrimary,
            fontWeight: 800,
            letterSpacing: '1.2px',
          }}
        >
          {label}
        </div>
        {count != null ? (
          <div
            style={{
              minWidth: 22,
              padding: '2px 8px',
              borderRadius: radii.pill,
              background: c.bg,
              color: c.fg,
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: 0.3,
              textAlign: 'center',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {count}
          </div>
        ) : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
