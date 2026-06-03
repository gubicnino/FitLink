import type { CSSProperties } from 'react';
import { colors, radii } from '../../theme';
import { API_ORIGIN } from '../../api/apiClient';

interface AvatarProps {
  name?: string | null;
  url?: string | null;
  size?: number;
}

function initials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function colorFromName(name?: string | null): string {
  if (!name) return colors.primary;
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  const palette = [colors.primary, colors.accent, colors.success, colors.warning, '#8B5CF6'];
  return palette[Math.abs(hash) % palette.length];
}

function resolveUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  if (url.startsWith('/uploads/')) return `${API_ORIGIN}${url}`;
  return url;
}

export default function Avatar({ name, url, size = 40 }: AvatarProps) {
  const src = resolveUrl(url);
  const wrapStyle: CSSProperties = {
    width: size,
    height: size,
    borderRadius: radii.pill,
    background: colorFromName(name),
    color: colors.white,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    fontWeight: 700,
    fontSize: size * 0.4,
    flexShrink: 0,
    overflow: 'hidden',
  };

  if (src) {
    return (
      <div style={wrapStyle}>
        <img
          src={src}
          alt={name ?? 'avatar'}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    );
  }
  return <div style={wrapStyle}>{initials(name)}</div>;
}
