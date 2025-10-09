// hooks/usePlataformas.ts
'use client';

import { useEffect, useState } from 'react';

export type Plataforma = {
  id: number;
  nombre: string;
  cantidad_pantallas: number; // NUEVO
};

// -------- Caché (memoria + localStorage) --------
type PlatCache = { rows: Plataforma[]; ts: number };

const MEM: { value: PlatCache | null } = { value: null };
// nueva versión de la clave (v2) para incluir cantidad_pantallas
const LS_KEY_V2 = '__plat_cache_v2';
const LS_KEY_V1 = '__plat_cache_v1'; // por si existe, migramos
const TTL_MS = 10 * 60 * 1000; // 10 minutos

/** Normaliza el objeto plataforma desde el backend (shape flexible). */
function mapPlatform(p: any): Plataforma {
  return {
    id: Number(p.id),
    nombre: String(p.nombre ?? p.Nombre ?? p.name ?? p.id),
    cantidad_pantallas:
      p.cantidad_pantallas != null
        ? Number(p.cantidad_pantallas)
        : p.cantidadPantallas != null
        ? Number(p.cantidadPantallas)
        : p.cant_pantallas != null
        ? Number(p.cant_pantallas)
        : 0,
  };
}

/** Lee caché válida (prioriza memoria, luego localStorage). */
function readCache(): PlatCache | null {
  // memoria
  if (MEM.value && Date.now() - MEM.value.ts < TTL_MS) return MEM.value;

  // localStorage v2
  try {
    const rawV2 = localStorage.getItem(LS_KEY_V2);
    if (rawV2) {
      const parsed: PlatCache = JSON.parse(rawV2);
      if (Date.now() - parsed.ts < TTL_MS) {
        // por seguridad, re-mapeamos por si el shape varía
        const rows = (parsed.rows || []).map(mapPlatform);
        const fixed: PlatCache = { rows, ts: parsed.ts };
        MEM.value = fixed;
        return fixed;
      }
    }
  } catch {
    // ignore
  }

  // migración desde v1 (si existe)
  try {
    const rawV1 = localStorage.getItem(LS_KEY_V1);
    if (rawV1) {
      const parsed: PlatCache = JSON.parse(rawV1);
      if (Date.now() - parsed.ts < TTL_MS) {
        const rows = (parsed.rows || []).map(mapPlatform);
        const migrated: PlatCache = { rows, ts: Date.now() };
        MEM.value = migrated;
        try {
          localStorage.setItem(LS_KEY_V2, JSON.stringify(migrated));
          localStorage.removeItem(LS_KEY_V1);
        } catch {}
        return migrated;
      } else {
        // expirado: limpiamos v1
        try { localStorage.removeItem(LS_KEY_V1); } catch {}
      }
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
    localStorage.setItem(LS_KEY_V2, JSON.stringify(cache));
  } catch {
    // ignore
  }
}

/** Permite invalidar la caché desde fuera si alguna vez te hace falta. */
export function invalidatePlataformasCache() {
  MEM.value = null;
  try {
    localStorage.removeItem(LS_KEY_V2);
    localStorage.removeItem(LS_KEY_V1);
  } catch {}
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
        const data: any[] = Array.isArray(j) ? j : (Array.isArray(j?.items) ? j.items : []);
        if (!active) return;

        const rows = data.map(mapPlatform);
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
      const data: any[] = Array.isArray(j) ? j : (Array.isArray(j?.items) ? j.items : []);
      const rows = data.map(mapPlatform);

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
