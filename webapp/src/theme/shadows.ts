export const shadows = {
  none: 'none',
  card: '0 1px 4px rgba(0,0,0,0.05)',
  nav: '0 2px 8px rgba(0,0,0,0.06)',
  fab: '0 6px 24px rgba(255,107,53,0.40)',
  modal: '0 8px 32px rgba(0,0,0,0.18)',
} as const;

export type ShadowToken = keyof typeof shadows;