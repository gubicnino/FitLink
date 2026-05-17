import { useEffect, useState } from 'react';


/**
 * Vrne `value`, ko se ta preneha spreminjati za `delayMs`.
 * Uporablja se za omejevanje pogostosti omrežnih klicev pri iskalnem vnosu.
 * SEPRAVE: reicmo ka tipkamo "b" -> "be" -> "ben" -> "bench", neščemo po vsake tipke sprozite iskanje ker to pripela do prevec HTTP requestov.
 */

export function useDebouncedValue<T>(value: T, delayMs: number = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
