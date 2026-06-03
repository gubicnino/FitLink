import { colors, spacing } from '../../theme';
import { FitLinkMark } from '../brand/FitlinkMark';

interface BrandMarkProps {
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const sizeMap = {
  sm: { mark: 32, label: 16 },
  md: { mark: 40, label: 20 },
  lg: { mark: 48, label: 24 },
} as const;

export function BrandMark({ size = 'md', showLabel = true }: BrandMarkProps) {
  const sz = sizeMap[size];
  return (
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <FitLinkMark size={sz.mark} tone="light" />
      {showLabel && (
        <span style={{
          fontSize: sz.label,
          fontWeight: 700,
          letterSpacing: -0.2,
          color: colors.inkPrimary,
          fontFamily: "'DM Sans', system-ui, sans-serif",
        }}>
          FitLink
        </span>
      )}
    </div>
  );
}