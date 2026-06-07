import { colors, radii } from "../../theme";

export default function TabButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: `8px 16px`,
        borderRadius: radii.md,
        background: active ? colors.primary : 'transparent',
        color: active ? colors.white : colors.inkSecondary,
        border: 'none',
        cursor: 'pointer',
        fontFamily: "'DM Sans', system-ui, sans-serif",
        fontSize: 13,
        fontWeight: active ? 800 : 600,
        letterSpacing: '0.1px',
        transition: 'all 0.12s ease',
      }}
    >
      {icon}
      {label}
    </button>
  );
}