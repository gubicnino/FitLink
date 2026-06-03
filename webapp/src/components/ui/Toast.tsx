import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { colors, radii, shadows, spacing, typography } from '../../theme';

type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastContextType {
  push: (tone: ToastTone, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

const TONE_STYLE: Record<ToastTone, { bg: string; border: string; fg: string }> = {
  success: { bg: colors.successSoftStrong, border: 'rgba(16,185,129,0.40)', fg: colors.success },
  error: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.40)', fg: colors.danger },
  info: { bg: colors.primarySoft, border: colors.primaryBorder, fg: colors.primary },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((tone: ToastTone, message: string) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, tone, message }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const value = useMemo<ToastContextType>(
    () => ({
      push,
      success: (m) => push('success', m),
      error: (m) => push('error', m),
      info: (m) => push('info', m),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        style={{
          position: 'fixed',
          top: spacing.xl,
          right: spacing.xl,
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.sm,
          zIndex: 9999,
          pointerEvents: 'none',
        }}
      >
        {items.map((t) => {
          const s = TONE_STYLE[t.tone];
          return (
            <div
              key={t.id}
              style={{
                background: s.bg,
                border: `1px solid ${s.border}`,
                color: s.fg,
                borderRadius: radii.lg,
                padding: `${spacing.sm}px ${spacing.md}px`,
                boxShadow: shadows.modal,
                minWidth: 240,
                maxWidth: 420,
                ...typography.bodySmall,
                fontWeight: 600,
                pointerEvents: 'auto',
              }}
            >
              {t.message}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
