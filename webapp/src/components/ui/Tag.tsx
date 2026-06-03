import type { CSSProperties, ReactNode } from 'react';
import { colors, radii, spacing } from '../../theme';

type TagTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'accent';

interface TagProps {
  label: string;
  tone?: TagTone;
  icon?: ReactNode;
  size?: 'sm' | 'md';
}

const TONES: Record<TagTone, { bg: string; border: string; fg: string }> = {
  neutral: { bg: colors.surfaceElevated, border: colors.line, fg: colors.inkSecondary },
  primary: { bg: colors.primarySoft, border: colors.primaryBorder, fg: colors.primary },
  success: { bg: colors.successSoft, border: 'rgba(16,185,129,0.30)', fg: colors.success },
  warning: { bg: colors.warningSoft, border: 'rgba(245,158,11,0.30)', fg: colors.warning },
  danger: { bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.30)', fg: colors.danger },
  accent: { bg: colors.accentSoft, border: 'rgba(255,107,53,0.30)', fg: colors.accent },
};

export default function Tag({ label, tone = 'neutral', icon, size = 'md' }: TagProps) {
  const tones = TONES[tone];
  const style: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: tones.bg,
    border: `1px solid ${tones.border}`,
    borderRadius: radii.pill,
    paddingInline: size === 'sm' ? spacing.xs : spacing.sm,
    paddingBlock: size === 'sm' ? 2 : 4,
    fontFamily: "'DM Sans', system-ui, sans-serif",
    fontSize: size === 'sm' ? 10 : 12,
    fontWeight: 700,
    letterSpacing: 0.4,
    color: tones.fg,
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  };
  return (
    <span style={style}>
      {icon}
      {label}
    </span>
  );
}
