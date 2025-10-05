// hooks/usePlataformas.ts
'use client';

import { useEffect, useState } from 'react';

export type Plataforma = { id: number; nombre: string };

// -------- Caché (memoria + localStorage) --------
type PlatCache = { rows: Plataforma[]; ts: number };

const MEM: { value: PlatCache | null } = { value: null };
const LS_KEY = '__plat_cache_v1';
const TTL_MS = 10 * 60 * 1000; // 10 minutos (ajústalo)

/** Lee caché válida (prioriza memoria, luego localStorage). */
function readCache(): PlatCache | null {
  // memoria
  if (MEM.value && Date.now() - MEM.value.ts < TTL_MS) return MEM.value;

  // localStorage
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed: PlatCache = JSON.parse(raw);
    if (Date.now() - parsed.ts < TTL_MS) {
      MEM.value = parsed;
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

/** Escribe en caché (memoria + localStorage). */
function writeCache(rows: Plataforma[]) {
  const cache: PlatCache = { rows, ts: Date.now() };
  MEM.value = cache;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(cache));
  } catch {
    // ignore
  }
}

/** Permite invalidar la caché desde fuera si alguna vez te hace falta. */
export function invalidatePlataformasCache() {
  MEM.value = null;
  try { localStorage.removeItem(LS_KEY); } catch {}
}

/* ===================================================== */
export function usePlataformas() {
  const [plataformas, setPlataformas] = useState<Plataforma[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carga inicial: usa caché si existe; si no, consulta.
  useEffect(() => {
    const cached = readCache();
    if (cached) {
      setPlataformas(cached.rows);
      return; // ← NO hace GET si hay caché válida
    }

    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/plataformas', { cache: 'no-store' });
        if (!res.ok) throw new Error('No se pudieron cargar las plataformas');

        const j = await res.json();
        const data: Plataforma[] = Array.isArray(j) ? j : (Array.isArray(j?.items) ? j.items : []);
        if (!active) return;

        // Normaliza por si el backend trae otro shape
        const rows = data.map((p: any) => ({
          id: Number(p.id),
          nombre: String(p.nombre ?? p.Nombre ?? p.name ?? p.id),
        }));

        setPlataformas(rows);
        writeCache(rows);
      } catch (e: any) {
        if (active) setError(e?.message ?? 'Error cargando plataformas');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, []);

  /** Refresca forzando GET y reescribe la caché. */
  const refresh = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/plataformas', { cache: 'no-store' });
      if (!res.ok) throw new Error('No se pudieron cargar las plataformas');

      const j = await res.json();
      const data: Plataforma[] = Array.isArray(j) ? j : (Array.isArray(j?.items) ? j.items : []);
      const rows = data.map((p: any) => ({
        id: Number(p.id),
        nombre: String(p.nombre ?? p.Nombre ?? p.name ?? p.id),
      }));

      setPlataformas(rows);
      writeCache(rows);
    } catch (e: any) {
      setError(e?.message ?? 'Error cargando plataformas');
    } finally {
      setLoading(false);
    }
  };

  return { plataformas, loading, error, refresh };
}
