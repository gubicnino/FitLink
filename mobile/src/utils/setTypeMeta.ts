// set classifications and their styling

import type { SetType } from '../types/workout';
import { colors } from '../theme';

export interface SetTypeMeta {
  shortLabel: string;
  fullLabel: string;
  description: string;
  badgeBg: string;
  badgeFg: string;
}

const PURPLE = '#7C5CC4';
const PURPLE_SOFT = 'rgba(124, 92, 196, 0.15)';

export const SET_TYPE_META: Readonly<Record<SetType, SetTypeMeta>> = {
  NORMAL: {
    shortLabel: '',
    fullLabel: 'Normal',
    description:
      'A standard working set. Most of your training volume should be made up of these.',
    badgeBg: colors.surface,
    badgeFg: colors.inkPrimary,
  },
  WARMUP: {
    shortLabel: 'W',
    fullLabel: 'Warm-up',
    description:
      'A lighter set done before your working sets to prime the muscle and rehearse the movement.',
    badgeBg: colors.accentSoft,
    badgeFg: colors.accent,
  },
  FAILURE: {
    shortLabel: 'F',
    fullLabel: 'Failure',
    description:
      'A set taken to muscular failure — the point where you cannot complete another rep with good form. Used sparingly for high-intensity work.',
    badgeBg: 'rgba(239, 68, 68, 0.12)',
    badgeFg: colors.danger,
  },
  DROPSET: {
    shortLabel: 'D',
    fullLabel: 'Drop set',
    description:
      'Immediately after a working set, drop the weight and continue without rest. Extends time under tension past failure.',
    badgeBg: PURPLE_SOFT,
    badgeFg: PURPLE,
  },
};

// setTypes, in order
export const SET_TYPE_ORDER: ReadonlyArray<SetType> = [
  'NORMAL',
  'WARMUP',
  'FAILURE',
  'DROPSET',
];

export function setTypeMeta(type: SetType | null | undefined): SetTypeMeta {
  if (!type) return SET_TYPE_META.NORMAL;
  return SET_TYPE_META[type] ?? SET_TYPE_META.NORMAL;
}
