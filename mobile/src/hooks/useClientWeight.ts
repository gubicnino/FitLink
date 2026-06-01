import { useEffect, useState } from 'react';
import { healthApi } from '../api/healthApi';


// fetcha clientov latest weight iz health connect snapshota, fallback je check-in weight.

export function useClientWeight(traineeId: string | undefined | null): number | null {
  const [kg, setKg] = useState<number | null>(null);

  useEffect(() => {
    if (!traineeId) {
      setKg(null);
      return;
    }
    let cancelled = false;
    healthApi
      .getForClient(traineeId)
      .then(snap => {
        if (cancelled) return;
        setKg(snap?.latestWeightKg ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        setKg(null);
      });
    return () => {
      cancelled = true;
    };
  }, [traineeId]);

  return kg;
}
