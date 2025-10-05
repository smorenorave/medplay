// src/lib/cuentasAll.ts
/**
 * Cache full de Cuentas Completas (memoria + localStorage) con helpers:
 * - loadAllCuentasCompletas(preferCacheFirst)
 * - mergeCuentaCompletaIntoCache(row)
 * - removeCuentaCompletaFromCache(id)
 * - clearCuentasCache(plataformaId: number | '')
 *
 * Se asume API:
 *   GET /api/cuentascompletas?limit=...&cursor=...
 *   -> { items: any[], nextCursor: number | null }  |  any[]
 */

export type CuentaCompleta = {
  id: number;
  plataforma_id: number;
  correo: string;
  contrasena?: string | null;
  [k: string]: any;
};

const LS_KEY = 'cuentasAll:v1:data';
const LS_TS  = 'cuentasAll:v1:ts';
// TTL opcional (si quieres forzar red al pulsar "Refrescar")
const TTL_MS = 5 * 60 * 1000;

let MEM: any[] = [];
let MEM_TS = 0;

function now() { return Date.now(); }

function readLS(): { data: any[]; ts: number } | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const ts  = Number(localStorage.getItem(LS_TS) || '0');
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return null;
    return { data, ts };
  } catch {
    return null;
  }
}

function writeLS(data: any[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
    localStorage.setItem(LS_TS, String(now()));
  } catch {}
}

function saveToMem(data: any[]) {
  MEM = data.slice();
  MEM_TS = now();
}

function fromCacheValid(): { data: any[]; from: 'mem' | 'ls' } | null {
  // memoria reciente
  if (MEM.length > 0 && now() - MEM_TS <= TTL_MS) return { data: MEM, from: 'mem' };

  // localStorage dentro de TTL
  const ls = readLS();
  if (ls && ls.data.length > 0 && now() - ls.ts <= TTL_MS) {
    // rehidratar a memoria
    saveToMem(ls.data);
    return { data: ls.data, from: 'ls' };
  }
  return null;
}

async function parseGet(res: Response): Promise<{ items: any[]; nextCursor: number | null }> {
  const j = await res.json().catch(() => null);
  if (!j) return { items: [], nextCursor: null };
  if (Array.isArray(j)) return { items: j, nextCursor: null };
  const items = Array.isArray((j as any).items) ? (j as any).items : [];
  const nextCursor = (j as any).nextCursor ?? null;
  return { items, nextCursor };
}

async function fetchAllFromNetwork(): Promise<any[]> {
  const LIMIT = 2000; // ajusta si tu backend lo permite
  let cursor: number | null = null;
  let acc: any[] = [];

  // intenta con paginación por cursor si existe
  for (let page = 0; page < 200; page++) {
    const sp = new URLSearchParams();
    sp.set('limit', String(LIMIT));
    if (cursor != null) sp.set('cursor', String(cursor));
    const res = await fetch(`/api/cuentascompletas?${sp.toString()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('No se pudo obtener cuentas');

    const { items, nextCursor } = await parseGet(res);
    acc = acc.concat(items);
    if (!nextCursor || items.length === 0) break;
    cursor = nextCursor;
  }

  // fallback: si tu endpoint retorna TODO sin nextCursor
  // acc ya tiene lo que devolvió.

  return acc;
}

/** Carga todo el dataset. Si preferCacheFirst=true intenta memoria/LS antes de red */
export async function loadAllCuentasCompletas(preferCacheFirst: boolean): Promise<{ items: any[]; fromCache: boolean }> {
  if (preferCacheFirst) {
    const hit = fromCacheValid();
    if (hit) return { items: hit.data, fromCache: true };
  }

  try {
    const all = await fetchAllFromNetwork();
    saveToMem(all);
    writeLS(all);
    return { items: all, fromCache: false };
  } catch (e) {
    // red falló: devuelve lo que haya (aunque esté viejo)
    const fallback = MEM.length ? MEM : (readLS()?.data ?? []);
    return { items: fallback, fromCache: true };
  }
}

/** Inserta/actualiza una fila por id en la caché (memoria + LS) */
export function mergeCuentaCompletaIntoCache(row: CuentaCompleta) {
  const id = Number(row?.id);
  if (!Number.isFinite(id)) return;

  // memoria
  const idx = MEM.findIndex((r) => Number(r?.id) === id);
  if (idx >= 0) MEM[idx] = { ...MEM[idx], ...row };
  else MEM.push(row);
  MEM_TS = now();

  // LS
  const ls = readLS();
  let data = ls?.data ?? [];
  const i2 = data.findIndex((r: any) => Number(r?.id) === id);
  if (i2 >= 0) data[i2] = { ...data[i2], ...row };
  else data.push(row);
  writeLS(data);
}

/** Elimina una fila por id de la caché (memoria + LS) */
export function removeCuentaCompletaFromCache(id: number) {
  const n = Number(id);
  if (!Number.isFinite(n)) return;

  // memoria
  if (MEM.length) {
    MEM = MEM.filter((r) => Number(r?.id) !== n);
    MEM_TS = now();
  }

  // LS
  const ls = readLS();
  if (ls?.data?.length) {
    const filtered = ls.data.filter((r: any) => Number(r?.id) !== n);
    writeLS(filtered);
  }
}

/**
 * Limpia caché. Si plataformaId es number, borra solo esa plataforma.
 * Si es '', borra TODO.
 */
export function clearCuentasCache(plataformaId: number | ''): void {
  if (plataformaId === '') {
    MEM = [];
    MEM_TS = 0;
    try {
      localStorage.removeItem(LS_KEY);
      localStorage.removeItem(LS_TS);
    } catch {}
    return;
  }

  // filtra por plataforma
  if (MEM.length) {
    MEM = MEM.filter((r) => Number(r?.plataforma_id) !== Number(plataformaId));
    MEM_TS = now();
  }
  const ls = readLS();
  if (ls?.data?.length) {
    const filtered = ls.data.filter((r: any) => Number(r?.plataforma_id) !== Number(plataformaId));
    writeLS(filtered);
  }
}

/* (Opcional) snapshot para debug */
export function __getCuentasCacheSnapshot() {
  return { mem: MEM.slice(), ts: MEM_TS, ls: readLS() };
}
