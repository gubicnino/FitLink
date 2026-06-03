import type { CSSProperties, ReactNode } from 'react';
import { colors, radii, shadows, spacing } from '../../theme';


interface HeroProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  footer?: ReactNode;
  style?: CSSProperties;
}

export default function Hero({
  eyebrow,
  title,
  subtitle,
  right,
  footer,
  style,
}: HeroProps) {
  return (
    <div
      style={{
        background: colors.primary,
        borderRadius: radii.xxl,
        padding: `${spacing.xl}px ${spacing.xxl}px`,
        boxShadow: shadows.card,
        position: 'relative',
        overflow: 'hidden',
        color: colors.white,
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.md,
        ...style,
      }}
    >
      {/* Glow blobs */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: -100,
          right: -80,
          width: 240,
          height: 240,
          borderRadius: '50%',
          background: colors.primaryDark,
          opacity: 0.5,
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          bottom: -140,
          left: -100,
          width: 280,
          height: 280,
          borderRadius: '50%',
          background: colors.primaryDark,
          opacity: 0.3,
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          display: 'flex',
          gap: spacing.lg,
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          {eyebrow ? (
            <div
              style={{
                fontFamily: "'DM Sans', system-ui, sans-serif",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '1.4px',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.65)',
              }}
            >
              {eyebrow}
            </div>
          ) : null}
          <h1
            style={{
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontSize: 32,
              lineHeight: '36px',
              letterSpacing: '-0.6px',
              fontWeight: 800,
              margin: 0,
              marginTop: eyebrow ? 4 : 0,
              color: colors.white,
            }}
          >
            {title}
          </h1>
          {subtitle ? (
            <p
              style={{
                fontFamily: "'DM Sans', system-ui, sans-serif",
                fontSize: 14,
                fontWeight: 500,
                color: 'rgba(255,255,255,0.78)',
                margin: 0,
                marginTop: 6,
              }}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
        {right ? <div style={{ flexShrink: 0, position: 'relative', zIndex: 1 }}>{right}</div> : null}
      </div>

      {footer ? (
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            paddingTop: spacing.md,
            borderTop: '1px solid rgba(255,255,255,0.14)',
          }}
        >
          {footer}
        </div>
      ) : null}
    </div>
  );
}
