import { useState } from "react";
import { colors, radii, spacing } from "../../theme";

interface InputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
}

export default function Input({ label, value, onChange, type = 'text', autoComplete }: InputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
      <label style={{
        fontSize: 12, fontWeight: 600, letterSpacing: '0.5px',
        textTransform: 'uppercase', color: colors.inkSecondary,
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        autoComplete={autoComplete}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          height: 48, padding: `0 ${spacing.xl}px`,
          borderRadius: radii.lg,
          border: `1.5px solid ${focused ? colors.primary : colors.line}`,
          outline: 'none',
          background: focused ? colors.surface : colors.bg,
          fontSize: 15, color: colors.inkPrimary,
          fontFamily: "'DM Sans', system-ui, sans-serif",
          transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
          boxShadow: focused ? `0 0 0 3px ${colors.primarySoft}` : 'none',
        }}
      />
    </div>
  );
}