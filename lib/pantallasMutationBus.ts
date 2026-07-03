// Utilidades para notificar cambios y mantener la cache de pantallas sincronizada

export type Pantalla = {
  id: number;
  cuenta_id: number | null;
  plataforma_id: number | null;
  contacto: string;
  nombre?: string | null;
  correo?: string | null;
  contrasena?: string | null;
  nro_pantalla?: string | null;
  fecha_compra?: string | null;
  fecha_vencimiento?: string | null;
  meses_pagados?: number | null;
  total_pagado?: number | string | null;
  total_pagado_proveedor?: number | string | null;
  total_ganado?: number | string | null;
  estado?: string | null;
  proveedor?: string | null;
  comentario?: string | null;
  cuenta_caida?: boolean; // ✅ nuevo — antes se perdía al mergear
};

type CacheShape = { rows: Pantalla[]; ts: number };

export const LS_CACHE_KEY = "__pantallas_cache_v3";
export const LS_STAMP_P = "__stamp_pantallas";
export const LS_STAMP_C = "__stamp_cuentascompartidas";
export const LS_STAMP_U = "__stamp_usuarios";
export const BC_NAME = "pantallas_mutations_bc";

const hasWindow = () => typeof window !== "undefined";

const normEmail = (s?: string | null) => (s ?? "").trim().toLowerCase();

// Igual que en el viewer
const normalizeRow = (r: any): Pantalla => {
  const n = (x: any) =>
    x == null || x === "" || Number.isNaN(Number(x)) ? null : Number(x);
  return {
    id: Number(r.id),
    cuenta_id: n(r.cuenta_id),
    plataforma_id: n(r.plataforma_id),
    contacto: String(r.contacto ?? ""),
    cuenta_caida: r.cuenta_caida === true || r.cuenta_caida === 1,
    nombre: r.nombre ?? null,
    correo: r.correo ?? null,
    contrasena: r.contrasena ?? null,
    nro_pantalla: r.nro_pantalla ?? null,
    fecha_compra: r.fecha_compra ?? null,
    fecha_vencimiento: r.fecha_vencimiento ?? null,
    meses_pagados: n(r.meses_pagados),
    total_pagado: r.total_pagado == null ? null : Number(r.total_pagado),
    total_pagado_proveedor:
      r.total_pagado_proveedor == null
        ? null
        : Number(r.total_pagado_proveedor),
    total_ganado: r.total_ganado == null ? null : Number(r.total_ganado),
    estado: r.estado ?? null,
    proveedor: r.proveedor ?? null,
    comentario: r.comentario ?? null,
  };
};

function readCache(): CacheShape | null {
  if (!hasWindow()) return null;
  try {
    const raw = localStorage.getItem(LS_CACHE_KEY);
    return raw ? (JSON.parse(raw) as CacheShape) : null;
  } catch {
    return null;
  }
}

function writeCache(rows: Pantalla[]) {
  if (!hasWindow()) return;
  const cache: CacheShape = { rows, ts: Date.now() };
  try {
    localStorage.setItem(LS_CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

/** Mezcla (insert/update) una pantalla al cache local y devuelve la lista resultante. */
export function mergePantallaIntoCache(input: any): Pantalla[] {
  if (!hasWindow()) return [];
  const row = normalizeRow(input);
  const current = readCache();
  const list = current?.rows ?? [];

  const idx = list.findIndex((r) => r.id === row.id);
  let next: Pantalla[];
  if (idx === -1) {
    next = [row, ...list]; // nueva al principio
  } else {
    // merge conservador: no pisa correo con vacío
    const merged: Pantalla = { ...list[idx], ...row };
    if (normEmail(row.correo) === "" && normEmail(list[idx].correo) !== "") {
      merged.correo = list[idx].correo; // conserva el correo existente
    }
    if (row.cuenta_caida === undefined) {
      merged.cuenta_caida = list[idx].cuenta_caida;
    }
    next = [...list];
    next[idx] = merged;
  }
  writeCache(next);
  return next;
}

export function removePantallaFromCache(id: number): Pantalla[] {
  if (!hasWindow()) return [];
  const current = readCache();
  const list = current?.rows ?? [];
  const next = list.filter((r) => r.id !== id);
  writeCache(next);
  return next;
}

/** Sube un "sello" y emite broadcast para que otras pestañas refresquen. */
export function notifyPantallasChanged() {
  if (!hasWindow()) return;
  try {
    localStorage.setItem(LS_STAMP_P, String(Date.now()));
  } catch {}
  try {
    const bc = new BroadcastChannel(BC_NAME);
    bc.postMessage({ type: "invalidate-pantallas" });
    bc.close();
  } catch {}
}
