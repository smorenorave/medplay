// hooks/usePlataformas.ts
import { useEffect, useState } from 'react';

export type Plataforma = { id: number; nombre: string };

export function usePlataformas() {
  const [plataformas, setPlataformas] = useState<Plataforma[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/plataformas', { cache: 'no-store' });
        if (!res.ok) throw new Error('No se pudieron cargar las plataformas');
        const data: Plataforma[] = await res.json();
        if (active) setPlataformas(data);
      } catch (e: any) {
        if (active) setError(e?.message ?? 'Error cargando plataformas');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  return { plataformas, loading, error };
}
