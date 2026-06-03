import { colors } from '../../theme';

interface LoadingSpinnerProps {
  size?: number;
  color?: string;
}

export default function LoadingSpinner({ size = 24, color = colors.primary }: LoadingSpinnerProps) {
  return (
    <>
      <style>{`@keyframes ls-spin { to { transform: rotate(360deg); } }`}</style>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          border: `${Math.max(2, size / 12)}px solid ${colors.line}`,
          borderTopColor: color,
          animation: 'ls-spin 0.7s linear infinite',
        }}
      />
    </>
  );
}
