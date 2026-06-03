import { colors, spacing } from "../../theme";

export default function Divider({ label }: { label: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      gap: spacing.xl, margin: `${spacing.xxl}px 0`,
    }}>
      <div style={{ flex: 1, height: 1, background: colors.line }} />
      <span style={{
        fontSize: 12, color: colors.inkMuted, fontWeight: 500,
        fontFamily: "'DM Sans', system-ui, sans-serif",
        letterSpacing: '0.5px', textTransform: 'uppercase',
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: colors.line }} />
    </div>
  );
}
