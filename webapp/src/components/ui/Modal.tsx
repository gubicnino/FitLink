import { useEffect, type ReactNode } from 'react';
import { colors, radii, shadows, spacing, typography } from '../../theme';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}

export default function Modal({ open, onClose, title, children, footer, width = 480 }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: colors.overlayDarker,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: spacing.lg,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.surface,
          borderRadius: radii.xl,
          boxShadow: shadows.modal,
          width: '100%',
          maxWidth: width,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: `${spacing.lg}px ${spacing.xl}px`,
            borderBottom: `1px solid ${colors.line}`,
          }}
        >
          <h2 style={{ ...typography.h2, color: colors.inkPrimary, margin: 0 }}>{title}</h2>
        </div>
        <div
          style={{
            padding: spacing.xl,
            overflow: 'auto',
            flex: 1,
          }}
        >
          {children}
        </div>
        {footer ? (
          <div
            style={{
              padding: `${spacing.md}px ${spacing.xl}px`,
              borderTop: `1px solid ${colors.line}`,
              display: 'flex',
              gap: spacing.md,
              justifyContent: 'flex-end',
            }}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
