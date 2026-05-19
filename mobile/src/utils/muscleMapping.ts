// Maperamo nazive misic iz backendovega formata v sluge, ki jih uporablja body highlighter komponenta.

import type { Slug } from 'react-native-body-highlighter';

// Nejso vse misice TOCNO tak kak v realnosti, ker yuhonasov dataset ni 1:1 kompatibilen z body highlighterjem. 
// Nekateri nazivi so preveč splošni (npr. "shoulders"), nekateri pa so specifični in jih ni v body highlighterju (npr "lats"). 
// V teh primeraj san naredo najboljšo možno mapo glede na to ka mamo.
const BACKEND_TO_SLUG: Readonly<Record<string, Slug>> = {
  abdominals: 'abs',
  abductors: 'gluteal',
  adductors: 'adductors',
  biceps: 'biceps',
  calves: 'calves',
  chest: 'chest',
  forearms: 'forearm',
  glutes: 'gluteal',
  hamstrings: 'hamstring',
  lats: 'upper-back',
  'lower back': 'lower-back',
  'middle back': 'upper-back',
  neck: 'neck',
  quadriceps: 'quadriceps',
  shoulders: 'deltoids',
  traps: 'trapezius',
  triceps: 'triceps',
};

export interface HighlightedMuscle {
  slug: Slug;
  // secondary muscle = 1, primary muscle = 2. Primary vedno zmaga over secondary, če se slučajno oba mapirata na isti slug.
  intensity: 1 | 2;
}


// returna listo highlighted muscleov iz primary in seocndary misicnih parov.
export function buildMuscleHighlights(
  primary: string[] | null | undefined,
  secondary: string[] | null | undefined,
): HighlightedMuscle[] {
  const map = new Map<Slug, 1 | 2>();
  for (const name of secondary ?? []) {
    const slug = BACKEND_TO_SLUG[name?.toLowerCase()];
    if (slug && !map.has(slug)) map.set(slug, 1);
  }
  for (const name of primary ?? []) {
    const slug = BACKEND_TO_SLUG[name?.toLowerCase()];
    if (slug) map.set(slug, 2);
  }
  return Array.from(map.entries()).map(([slug, intensity]) => ({ slug, intensity }));
}
