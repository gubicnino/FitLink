import type { CSSProperties, ReactNode } from 'react';
import { colors, radii, spacing, typography } from '../../theme';

type Tone = 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'neutral';

interface StatTileProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
  tone?: Tone;
  style?: CSSProperties;
}

const TONES: Record<Tone, { soft: string; fg: string }> = {
  primary: { soft: colors.primarySoft, fg: colors.primary },
  accent: { soft: colors.accentSoft, fg: colors.accent },
  success: { soft: colors.successSoft, fg: colors.success },
  warning: { soft: colors.warningSoft, fg: colors.warning },
  danger: { soft: 'rgba(239,68,68,0.12)', fg: colors.danger },
  neutral: { soft: colors.surfaceElevated, fg: colors.inkSecondary },
};


export default function StatTile({
  icon,
  label,
  value,
  unit,
  hint,
  tone = 'primary',
  style,
}: StatTileProps) {
  const t = TONES[tone];
  return (
    <div
      style={{
        background: colors.surface,
        border: `1px solid ${colors.line}`,
        borderRadius: radii.xl,
        padding: spacing.lg,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        minWidth: 0,
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: radii.lg,
            background: t.soft,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: t.fg,
          }}
        >
          {icon}
        </div>
        <div
          style={{
            ...typography.caption,
            color: colors.inkMuted,
            fontWeight: 800,
            letterSpacing: '0.8px',
            fontSize: 10,
          }}
        >
          {label}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span
          style={{
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: '-0.6px',
            color: colors.inkPrimary,
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1,
          }}
        >
          {value}
        </span>
        {unit ? (
          <span
            style={{
              ...typography.bodySmall,
              fontWeight: 700,
              color: colors.inkSecondary,
            }}
          >
            {unit}
          </span>
        ) : null}
      </div>
      {hint ? (
        <div style={{ ...typography.micro, color: colors.inkMuted }}>{hint}</div>
      ) : null}
    </div>
  );
}
