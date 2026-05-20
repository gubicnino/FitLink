import { useEffect, useState } from 'react';

// simple. Returna sekunde od "startedAt" do zdaj. Osvezuje vsako sekundo ce je screen mounted. 
// Pomembno: vrednost se vedno zracuna iz "Date.now() - "startedAt", ne pa iz dejanskoga internoga counterja. 
// to nan samo zagotovi da ce user vgasne telefon ali pa samo app recimo, kda ga nazaj odpre se bo timer prikazal pravilno in z pravilno vrednostjo.

export function useElapsedTime(startedAt: string | null | undefined): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!startedAt) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  if (!startedAt) return 0;
  const startMs = new Date(startedAt).getTime();
  if (Number.isNaN(startMs)) return 0;
  return Math.max(0, Math.floor((now - startMs) / 1000));
}


// HH:MM:SS ali MM:SS (ce menje kak 1h)
export function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  if (h > 0) return `${h}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}
