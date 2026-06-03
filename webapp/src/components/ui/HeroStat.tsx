import { colors } from '../../theme';

interface HeroStatProps {
  value: string | number;
  label: string;
  unit?: string;
  accent?: boolean;
}


export default function HeroStat({ value, label, unit, accent }: HeroStatProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span
          style={{
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: '-0.8px',
            color: accent ? colors.accent : colors.white,
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1,
          }}
        >
          {value}
        </span>
        {unit ? (
          <span
            style={{
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontSize: 12,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.65)',
            }}
          >
            {unit}
          </span>
        ) : null}
      </div>
      <div
        style={{
          fontFamily: "'DM Sans', system-ui, sans-serif",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.6px',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.6)',
        }}
      >
        {label}
      </div>
    </div>
  );
}
