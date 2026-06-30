"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePlataformas } from "@/hooks/usePlataformas";

/* =========================================================
 * Tipos
 * ======================================================= */
type Pantalla = {
  id: number;
  cuenta_id: number | null;
  plataforma_id: number | null;
  contacto: string;
  nombre: string | null;
  correo: string | null;
  contrasena: string | null;
  nro_pantalla: string | null;
  fecha_compra: string | null; // YYYY-MM-DD
  fecha_vencimiento: string | null; // YYYY-MM-DD (auto)
  meses_pagados: number | null;
  total_pagado: number | null;
  total_pagado_proveedor: number | null;
  total_ganado: number | null;
  estado: string | null;
  proveedor: string | null;
  comentario: string | null;
  cuenta_caida: boolean; // 👈 Nueva flag
};
type EditState = Partial<Pantalla> & {
  id: number;
  __applyCorreoToCuenta?: boolean; // ✅ nuevo
};

/* =========================================================
 * Config
 * ======================================================= */
const REFETCH_ON_FOCUS = false;
const STALE_AFTER_MS = 5 * 60_000;
const STAMP_TTL_MS = 5 * 30_000;

/* =========================================================
 * Cache y sync
 * ======================================================= */
const LS_CACHE_KEY = "__pantallas_cache_v3";
const LS_REMOTE_STAMP = "__pantallas_remote_stamp";
const BC_NAME = "pantallas_mutations_bc";

const todayYMDLocal = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

type CacheShape = { rows: Pantalla[]; ts: number };

const hasWindow = () => typeof window !== "undefined";
const n = (x: unknown) =>
  x == null || x === "" || Number.isNaN(Number(x)) ? null : Number(x);

function normalizeRow(r: any): Pantalla {
  return {
    id: Number(r.id),
    cuenta_id: n(r.cuenta_id),
    plataforma_id: n(r.plataforma_id),
    contacto: String(r.contacto ?? ""),
    cuenta_caida: r.cuenta_caida ?? false,
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
}

function readCache(): CacheShape | null {
  if (!hasWindow()) return null;
  try {
    const raw = localStorage.getItem(LS_CACHE_KEY);
    return raw ? (JSON.parse(raw) as CacheShape) : null;
  } catch {
    return null;
  }
}
function writeCache(rows: Pantalla[], remoteStamp?: number) {
  if (!hasWindow()) return;
  try {
    localStorage.setItem(
      LS_CACHE_KEY,
      JSON.stringify({ rows, ts: Date.now() })
    );
    if (typeof remoteStamp === "number") {
      localStorage.setItem(LS_REMOTE_STAMP, String(remoteStamp));
    }
  } catch {}
}
function mergeIntoCache(p: any): Pantalla[] {
  const row = normalizeRow(p);
  const current = readCache();
  const list = current?.rows ?? [];
  const idx = list.findIndex((x) => x.id === row.id);
  let next: Pantalla[];
  if (idx === -1) next = [row, ...list];
  else {
    next = [...list];
    next[idx] = { ...next[idx], ...row };
  }
  writeCache(next);
  return next;
}
function removeFromCache(id: number) {
  const current = readCache();
  const list = current?.rows ?? [];
  const next = list.filter((x) => x.id !== id);
  writeCache(next);
  return next;
}
function broadcastInvalidate() {
  try {
    const bc = new BroadcastChannel(BC_NAME);
    bc.postMessage({ type: "invalidate-pantallas" });
    bc.close();
  } catch {}
}

/* =========================================================
 * Fetchers
 * ======================================================= */
async function fetchStamp(): Promise<number> {
  try {
    const r = await fetch("/api/pantallas/stamp", { cache: "no-store" });
    const j = (await r.json()) as { stamp?: number };
    return Number(j?.stamp || 0);
  } catch {
    return 0;
  }
}

async function fetchAllPantallas(): Promise<Pantalla[]> {
  const out: Pantalla[] = [];
  let cursor: number | null = null;
  let guard = 0;
  while (guard++ < 50) {
    const url =
      "/api/pantallas?limit=500" +
      (cursor ? `&cursor=${encodeURIComponent(String(cursor))}` : "");
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("No se pudieron cargar las pantallas");
    const j: any = await res.json();
    const items: any[] = Array.isArray(j?.items) ? j.items : [];
    out.push(...items.map(normalizeRow));
    const nx = j?.nextCursor ?? null;
    cursor = nx == null ? null : Number(nx);
    if (!cursor) break;
  }
  return out;
}

/* =========================================================
 * UI helpers
 * ======================================================= */

const money = (v: number | null) =>
  v == null || Number.isNaN(v) ? "—" : "$ " + new Intl.NumberFormat().format(v);

const clamp = (val: unknown, min: number) => {
  const num = Number(val);
  return Number.isFinite(num) ? Math.max(min, num) : min;
};

/** Normaliza texto para búsqueda: minúsculas, sin tildes y sin espacios */
const normSearch = (s?: string | null) =>
  (s ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD") // separa diacríticos
    .replace(/\p{Diacritic}/gu, "") // quita tildes
    .replace(/\s+/g, ""); // quita TODOS los espacios

/** YYYY-MM-DD + meses (conserva fin de mes) */
function addMonthsYYYYMMDD(ymd: string, months: number): string {
  if (!ymd || !Number.isFinite(months)) return "";
  const [y, m, d] = ymd.split("-").map(Number);
  const base = new Date(y, (m ?? 1) - 1, d ?? 1);
  if (Number.isNaN(base.getTime())) return "";
  const target = new Date(base);
  target.setMonth(target.getMonth() + months);
  if (target.getDate() !== (d ?? 1)) target.setDate(0);
  return target.toISOString().slice(0, 10);
}

/* =========================================================
 * Portal
 * ======================================================= */
function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

/* =========================================================
 * Helpers Inventario / Cuentas / Conteos
 * ======================================================= */
const normEmail = (s?: string | null) => (s ?? "").trim().toLowerCase();

async function existsInInventario(
  plataforma_id: number | null | undefined,
  correo: string
): Promise<boolean> {
  const email = normEmail(correo);
  try {
    const base = `/api/inventario`;
    const url =
      plataforma_id != null
        ? `${base}?q=${encodeURIComponent(
            email
          )}&plataforma_id=${plataforma_id}`
        : `${base}?q=${encodeURIComponent(email)}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return false;
    const data = await res.json();
    const arr: any[] = Array.isArray(data)
      ? data
      : Array.isArray(data?.items)
      ? data.items
      : [];
    return arr.some((r) => String(r?.correo ?? "").toLowerCase() === email);
  } catch {
    return false;
  }
}
async function ensureInInventario(
  plataforma_id?: number | null,
  correo?: string | null,
  clave?: string | null
) {
  if (!correo) return;
  const email = normEmail(correo);
  try {
    if (await existsInInventario(plataforma_id, email)) return;
    const body: any = { correo: email };
    if (plataforma_id != null) body.plataforma_id = plataforma_id;
    if (clave && clave.trim().length > 0) body.clave = clave;
    await fetch("/api/inventario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    /* best-effort */
  }
}

/** fetch util */
async function fetchListSafe(urls: string[]): Promise<any[]> {
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      const data = await res.json();
      return Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
        ? data.items
        : [];
    } catch {}
  }
  return [];
}

/** Conteo por (correo + plataforma) vía API (queda por si lo necesitas en el futuro) */
async function countPantallasByEmailAndPlatform(
  correo: string,
  plataforma_id: number | null
): Promise<number> {
  const email = normEmail(correo);
  const base = `/api/pantallas`;
  const urls: string[] = [];
  if (plataforma_id != null) {
    urls.push(
      `${base}?correo=${encodeURIComponent(
        email
      )}&plataforma_id=${plataforma_id}`
    );
    urls.push(
      `${base}?q=${encodeURIComponent(email)}&plataforma_id=${plataforma_id}`
    );
  }
  urls.push(`${base}?correo=${encodeURIComponent(email)}`);
  urls.push(`${base}?q=${encodeURIComponent(email)}`);
  urls.push(`${base}?limit=5000`);

  const arr = await fetchListSafe(urls);
  return arr.filter(
    (r) =>
      String(r?.correo ?? "").toLowerCase() === email &&
      (plataforma_id == null ||
        Number(r?.plataforma_id) === Number(plataforma_id))
  ).length;
}

/** ================= NUEVO: Conteo LOCAL por (correo + plataforma) ================= */
function countLocalByEmailAndPlatform(
  all: Pantalla[],
  correo: string | null | undefined,
  plataforma_id: number | null | undefined
): number {
  if (!correo || plataforma_id == null) return 0;
  const email = (correo ?? "").trim().toLowerCase();
  const pid = Number(plataforma_id);
  return all.reduce((acc, r) => {
    const sameEmail = (r.correo ?? "").trim().toLowerCase() === email;
    const samePlat = Number(r.plataforma_id) === pid;
    return acc + (sameEmail && samePlat ? 1 : 0);
  }, 0);
}

/** === cuentascompartidas helpers (para editar correo) === */

async function findCuentaCompartidaByCorreo(
  plataforma_id: number | null | undefined,
  correo: string
) {
  const email = normEmail(correo);
  if (!email) return null;
  const urls: string[] = [];
  if (plataforma_id != null) {
    urls.push(
      `/api/cuentascompartidas?correo=${encodeURIComponent(
        email
      )}&plataforma_id=${plataforma_id}`
    );
  }
  urls.push(`/api/cuentascompartidas?correo=${encodeURIComponent(email)}`);
  for (const u of urls) {
    try {
      const r = await fetch(u, { cache: "no-store" });
      if (!r.ok) continue;
      const j = await r.json();
      const arr: any[] = Array.isArray(j)
        ? j
        : Array.isArray(j?.items)
        ? j.items
        : [];
      const hit = arr.find(
        (x) =>
          normEmail(x?.correo) === email &&
          (plataforma_id == null ||
            Number(x?.plataforma_id) === Number(plataforma_id))
      );
      if (hit) return hit;
    } catch {}
  }
  return null;
}
async function upsertCuentaCompartida(
  plataforma_id: number | null | undefined,
  correo: string,
  contrasena?: string | null
): Promise<number> {
  const email = normEmail(correo);
  if (!email) throw new Error("Correo vacío al crear/buscar cuenta compartida");

  const existing = await findCuentaCompartidaByCorreo(
    plataforma_id ?? null,
    email
  );
  if (existing?.id) {
    if (contrasena && contrasena.trim() !== "") {
      try {
        await fetch(`/api/cuentascompartidas/${existing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contrasena }),
        });
      } catch {}
    }
    return Number(existing.id);
  }

  const body: any = { correo: email };
  if (plataforma_id != null) body.plataforma_id = plataforma_id;
  if (contrasena && contrasena.trim() !== "") body.contrasena = contrasena;

  const rNew = await fetch("/api/cuentascompartidas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!rNew.ok) {
    const j = await rNew.json().catch(() => ({}));
    throw new Error(j?.error ?? "No se pudo crear la cuenta compartida");
  }
  const created = await rNew.json();
  if (!created?.id)
    throw new Error("La API no devolvió id al crear cuentascompartidas");
  return Number(created.id);
}

/* =========================================================
 * Componente principal
 * ======================================================= */
const calcGanado = (tp?: number | null, tpp?: number | null) => {
  const a = Number(tp ?? 0);
  const b = Number(tpp ?? 0);
  return Math.round((a - b) * 100) / 100; // diferencia redondeada
};

export default function PantallasViewer() {
  const { plataformas } = usePlataformas();

  const [rows, setRows] = useState<Pantalla[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [platFilter, setPlatFilter] = useState<number | "all">("all");

  // Capacidad por plataforma (desde usePlataformas)
  // ⚠️ Debe declararse ANTES de cualquier efecto/memo que la use en su
  // arreglo de dependencias, ya que ese arreglo se evalúa en cada render.
  const capacityByPlatform = useMemo(() => {
    const m = new Map<number, number | null>();
    for (const p of plataformas) {
      // soporta snake y camel, y castea string/number
      const raw =
        (p as any).cantidad_pantallas ?? (p as any).cantidadPantallas ?? null;

      if (raw === null || raw === undefined || raw === "") {
        m.set(Number(p.id), null); // capacidad desconocida (AÚN no pintamos rojo)
        continue;
      }

      const cap = Number(raw);
      m.set(Number(p.id), Number.isFinite(cap) ? cap : null);
    }
    return m;
  }, [plataformas]);

  // Pantallas usadas por (correo + plataforma) sobre TODO el dataset
  // key: `${pid}__${email}` -> value: usadas
  const usedByEmailPlat = useMemo(() => {
    const m = new Map<string, number>(); // key: `${pid}__${email}`
    const norm = (s?: string | null) => (s ?? "").trim().toLowerCase();
    for (const r of rows) {
      const pid = Number(r.plataforma_id);
      const em = norm(r.correo);
      if (!Number.isFinite(pid) || !em) continue;
      const k = `${pid}__${em}`;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [rows]);

  // edición
  const [edit, setEdit] = useState<EditState | null>(null);
  // ↓ NUEVO: correos disponibles (inventario + cuentas compartidas) por plataforma
  const [availableEmails, setAvailableEmails] = useState<string[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  // ↓ NUEVO: cupos disponibles por correo (igual que en el form) -> key: email, value: cupos libres
  const [emailFreeMap, setEmailFreeMap] = useState<Record<string, number>>({});
  // ↓ NUEVO: control del dropdown de correos (mismo estilo que el form)
  const [emailDropdownOpen, setEmailDropdownOpen] = useState(false);
  const emailDropdownRef = useRef<HTMLLabelElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!emailDropdownRef.current) return;
      if (!emailDropdownRef.current.contains(e.target as Node)) {
        setEmailDropdownOpen(false);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  // 👇 NUEVO: correos marcados como "cuenta caída" (no deben sugerirse)
  const caidaEmailSet = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      if (!r.cuenta_caida) continue;
      const c = (r.correo ?? "").trim().toLowerCase();
      if (c) set.add(c);
    }
    return set;
  }, [rows]);

  // 👇 NUEVO: correo original de la fila que se está editando (para no descontarle
  // su propio cupo: ese registro ya "ocupa" un cupo de su correo actual, pero
  // seguir eligiéndolo no debería contar como exceder el límite)
  const originalCorreoForEdit = useMemo(() => {
    if (!edit?.id) return "";
    const row = rows.find((r) => r.id === edit.id);
    return (row?.correo ?? "").trim().toLowerCase();
  }, [edit?.id, rows]);

  // 👇 NUEVO: lista filtrada según lo escrito + excluyendo cuentas caídas + solo con cupos disponibles
  const visibleAvailableEmails = useMemo(() => {
    const term = (edit?.correo ?? "").trim().toLowerCase();
    return availableEmails
      .filter((em) => !caidaEmailSet.has(em))
      .filter((em) => {
        const free =
          (emailFreeMap[em] ?? 0) + (em === originalCorreoForEdit ? 1 : 0);
        return free > 0;
      })
      .filter((em) => !term || em.includes(term));
  }, [
    availableEmails,
    caidaEmailSet,
    edit?.correo,
    emailFreeMap,
    originalCorreoForEdit,
  ]);

  // 👇 NUEVO: cupos efectivos a mostrar junto a cada correo en el dropdown
  const effectiveFreeForEmail = (email: string) =>
    (emailFreeMap[email] ?? 0) + (email === originalCorreoForEdit ? 1 : 0);

  useEffect(() => {
    const pid = edit?.plataforma_id;
    if (!edit || !pid) {
      setAvailableEmails([]);
      setEmailFreeMap({});
      return;
    }
    let cancelled = false;
    setLoadingEmails(true);
    (async () => {
      try {
        const [acctRes, invRes] = await Promise.all([
          fetch(`/api/cuentascompartidas?plataforma_id=${pid}&limit=10000`, {
            cache: "no-store",
          }),
          fetch(`/api/inventario?plataforma_id=${pid}&limit=10000`, {
            cache: "no-store",
          }),
        ]);
        const acctRows = acctRes.ok ? await acctRes.json() : [];
        const invRows = invRes.ok ? await invRes.json() : [];
        const set = new Set<string>();
        for (const r of acctRows) {
          const c = String((r as any)?.correo ?? "").trim().toLowerCase();
          if (c) set.add(c);
        }
        for (const r of invRows) {
          const c = String((r as any)?.correo ?? "").trim().toLowerCase();
          if (c) set.add(c);
        }

        // ✅ Igual que en el form: cupos = capacidad de la plataforma - pantallas ya usadas con ese correo
        const cap = capacityByPlatform.get(Number(pid));
        const free: Record<string, number> = {};
        if (cap != null && cap > 0) {
          for (const email of set) {
            const used = usedByEmailPlat.get(`${Number(pid)}__${email}`) ?? 0;
            free[email] = Math.max(0, cap - used);
          }
        }
        if (!cancelled) {
          setAvailableEmails(Array.from(set).sort());
          setEmailFreeMap(free);
        }
      } catch {
        if (!cancelled) {
          setAvailableEmails([]);
          setEmailFreeMap({});
        }
      } finally {
        if (!cancelled) setLoadingEmails(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [edit?.plataforma_id, capacityByPlatform, usedByEmailPlat]);
  const [saving, setSaving] = useState(false);

  // selección múltiple
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // eliminación individual
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    label?: string;
  } | null>(null);
  const [checkingArchive, setCheckingArchive] = useState(false);
  const [canArchive, setCanArchive] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const [deleteAction, setDeleteAction] = useState<"archive" | "purge" | null>(
    null
  );
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);

  // eliminación masiva
  type BulkItem = {
    id: number;
    label?: string;
    canArchive: boolean;
    plataforma_id: number | null;
    correo: string | null;
    contrasena: string | null;
  };
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkItems, setBulkItems] = useState<BulkItem[]>([]);
  const [bulkAssessing, setBulkAssessing] = useState(false);
  const [bulkErr, setBulkErr] = useState<string | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkSummary, setBulkSummary] = useState<{
    total: number;
    archived: number;
    purged: number;
    failed: number;
  } | null>(null);

  const mounted = useRef(false);

  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("pantallas_mutations_bc");
      bc.onmessage = (ev) => {
        if (ev?.data?.type === "invalidate-pantallas") {
          console.log("🔄 Refrescando pantallas por broadcast...");
          forceRefresh(); // 👈 ya tienes esta función para recargar desde el servidor
        }
      };
    } catch {}

    return () => {
      try {
        bc?.close();
      } catch {}
    };
  }, []);

  //recalcular modal
  useEffect(() => {
    if (!edit) return;
    const fc = edit.fecha_compra ?? "";
    const m = edit.meses_pagados ?? null;
    if (fc && m != null && m >= 1) {
      const venc = addMonthsYYYYMMDD(fc, m);
      if (venc !== edit.fecha_vencimiento) {
        setEdit((s) => ({ ...(s as EditState), fecha_vencimiento: venc }));
      }
    } else if (edit.fecha_vencimiento) {
      setEdit((s) => ({ ...(s as EditState), fecha_vencimiento: "" }));
    }
  }, [edit?.fecha_compra, edit?.meses_pagados]);

  // 👇 Añade esto justo después
  useEffect(() => {
    if (!edit) return;
    const nuevo = calcGanado(edit.total_pagado, edit.total_pagado_proveedor);
    if (edit.total_ganado !== nuevo) {
      setEdit((s) => ({ ...(s as EditState), total_ganado: nuevo }));
    }
  }, [edit?.total_pagado, edit?.total_pagado_proveedor]);

  /* ===== Boot ===== */
  useEffect(() => {
    mounted.current = true;
    (async () => {
      setErr(null);
      const cached = readCache();
      if (cached?.rows?.length) setRows(cached.rows);

      const cacheAge = cached ? Date.now() - cached.ts : Infinity;
      const skipStamp = cacheAge < STAMP_TTL_MS;

      const remoteStamp = skipStamp
        ? Number(localStorage.getItem(LS_REMOTE_STAMP) || 0)
        : await fetchStamp();

      const localStamp = Number(localStorage.getItem(LS_REMOTE_STAMP) || 0);
      const needServer =
        !cached?.rows?.length ||
        cacheAge > STALE_AFTER_MS ||
        remoteStamp !== localStamp;

      if (!needServer) return;

      try {
        setLoading(true);
        const all = await fetchAllPantallas();
        if (!mounted.current) return;
        setRows(all);
        writeCache(all, remoteStamp);
      } catch (e: any) {
        if (mounted.current) setErr(e?.message ?? "Error cargando pantallas");
      } finally {
        if (mounted.current) setLoading(false);
      }
    })();

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(BC_NAME);
      bc.onmessage = async (ev) => {
        if (ev?.data?.type === "invalidate-pantallas") {
          try {
            setLoading(true);
            const stamp = await fetchStamp();
            const local = Number(localStorage.getItem(LS_REMOTE_STAMP) || 0);
            if (stamp !== local) {
              const all = await fetchAllPantallas();
              if (!mounted.current) return;
              setRows(all);
              writeCache(all, stamp);
            }
          } catch (e: any) {
            if (mounted.current)
              setErr(e?.message ?? "Error actualizando datos");
          } finally {
            if (mounted.current) setLoading(false);
          }
        }
      };
    } catch {}

    const onFocus = async () => {
      if (!REFETCH_ON_FOCUS) return;
      const cached = readCache();
      const cacheAge = cached ? Date.now() - cached.ts : Infinity;
      if (cacheAge > STALE_AFTER_MS) {
        await forceRefresh();
        return;
      }
      try {
        const stamp = await fetchStamp();
        const local = Number(localStorage.getItem(LS_REMOTE_STAMP) || 0);
        if (stamp !== local) await forceRefresh();
      } catch {}
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      mounted.current = false;
      try {
        bc?.close();
      } catch {}
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  async function forceRefresh() {
    try {
      setLoading(true);
      setErr(null);
      const [stamp, all] = await Promise.all([
        fetchStamp(),
        fetchAllPantallas(),
      ]);
      if (!mounted.current) return;
      setRows(all);
      writeCache(all, stamp);
    } catch (e: any) {
      if (mounted.current) setErr(e?.message ?? "No se pudo refrescar");
    } finally {
      if (mounted.current) setLoading(false);
    }
  }

  // 👇 Alterna la bandera para TODAS las filas con el mismo correo
  // persistiendo en cuentascompartidas con un único PATCH bulk.
  async function toggleFlagByEmail(target: Pantalla) {
    const email = (target.correo ?? "").trim().toLowerCase();
    if (!email) return;

    // Filas visibles con ese correo
    const sameEmailRows = rows.filter(
      (x) => (x.correo ?? "").trim().toLowerCase() === email
    );

    if (sameEmailRows.length === 0) return;

    // Si todas están ON ⇒ apágalas; si alguna OFF ⇒ enciende TODAS
    const nextValue = !sameEmailRows.every((x) => !!x.cuenta_caida);

    // ✅ Optimistic UI
    setRows((prev) =>
      prev.map((x) =>
        (x.correo ?? "").trim().toLowerCase() === email
          ? { ...x, cuenta_caida: nextValue }
          : x
      )
    );
    for (const x of sameEmailRows)
      mergeIntoCache({ ...x, cuenta_caida: nextValue });

    try {
      // 👉 Persistimos en cuentascompartidas (UNA sola llamada si hay cuenta_id)
      if (target.cuenta_id) {
        await fetch(
          `/api/cuentascompartidas/${target.cuenta_id}?applyToSameEmail=1`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cuenta_caida: nextValue }),
          }
        );
      } else {
        // Fallback (si por alguna razón no hay cuenta_id), no debería ocurrir normalmente
        await Promise.all(
          sameEmailRows.map((x) =>
            fetch(`/api/pantallas/${x.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ cuenta_caida: nextValue }),
            })
          )
        );
      }

      // 🔊 Avisar a otras pestañas/ventanas del MISMO navegador
      try {
        const bc = new BroadcastChannel("pantallas_mutations_bc");
        bc.postMessage({ type: "invalidate-pantallas" });
        bc.close();
      } catch {}
    } catch {
      // Si algo falla, fuerza un refetch para no quedar desincronizado
      await forceRefresh();
    }
  }

  // Filtro + búsqueda local
  const filtered = useMemo(() => {
    const term = normSearch(q);
    const pid: number | null = platFilter === "all" ? null : Number(platFilter);

    if (!term && pid === null) return rows;

    return rows.filter((r) => {
      if (pid !== null && r.plataforma_id !== pid) return false;
      if (!term) return true;

      const hay =
        normSearch(r.nombre).includes(term) ||
        normSearch(r.contacto).includes(term) ||
        normSearch(r.correo).includes(term) ||
        normSearch(r.estado).includes(term) ||
        normSearch(r.proveedor).includes(term) ||
        normSearch(r.comentario).includes(term) ||
        normSearch(r.nro_pantalla).includes(term);

      return hay;
    });
  }, [rows, q, platFilter]);

  // 🔸 justo después de const filtered = useMemo(...)

  const [platCaps, setPlatCaps] = useState<
    Map<number, { nombre: string; capacidad: number }>
  >(new Map());

  // Normaliza email
  const emailKey = (s?: string | null) => (s ?? "").trim().toLowerCase();

  // Nombre por plataforma (para mostrar en el badge)
  const nameByPlatform = useMemo(() => {
    const m = new Map<number, string>();
    for (const p of plataformas) {
      m.set(Number(p.id), String(p.nombre ?? `#${p.id}`));
    }
    return m;
  }, [plataformas]);

  // Helper que arma los items para los badges de un email dado
  // REEMPLAZA tu función actual por esta
  function getPerPlatformForEmail(email: string) {
    const norm = (s?: string | null) => (s ?? "").trim().toLowerCase();
    const em = norm(email);

    // plataformas donde este email tiene algo
    const seen = new Set<number>();
    for (const r of rows) {
      if (norm(r.correo) !== em) continue;
      const pid = Number(r.plataforma_id);
      if (Number.isFinite(pid)) seen.add(pid);
    }

    type Item = {
      pid: number;
      name: string;
      used: number;
      capacity: number | null; // null = desconocida
      available: number | null; // null = desconocida
    };

    const items: Item[] = [];
    for (const pid of seen) {
      const used = usedByEmailPlat.get(`${pid}__${em}`) ?? 0;

      // nombre y capacidad: primero hook, si no existe usa lo traído por /api/plataformas/:id
      const hookCap = capacityByPlatform.get(pid); // number | null
      const fetched = platCaps.get(pid); // { nombre, capacidad } | undefined
      const capacity =
        hookCap != null
          ? hookCap
          : fetched?.capacidad != null
          ? Number(fetched.capacidad)
          : null;

      const name =
        plataformas.find((p) => Number(p.id) === pid)?.nombre ??
        fetched?.nombre ??
        `#${pid}`;

      const available = capacity == null ? null : Math.max(0, capacity - used);
      items.push({ pid, name, used, capacity, available });
    }

    items.sort((a, b) => a.name.localeCompare(b.name));
    return items;
  }

  // Agrupar por correo y ordenar dentro por fecha de vencimiento asc (vacías al final)
  const groupedByEmail = useMemo(() => {
    const toNum = (s?: string | null) => {
      if (!s) return Number.POSITIVE_INFINITY;
      const t = new Date(s).getTime();
      return Number.isFinite(t) ? t : Number.POSITIVE_INFINITY;
    };

    const map = new Map<string, Pantalla[]>();
    for (const r of filtered) {
      const email = (r.correo ?? "(sin correo)").trim().toLowerCase();
      if (!map.has(email)) map.set(email, []);
      map.get(email)!.push(r);
    }

    const groups = Array.from(map.entries()).map(([email, arr]) => {
      const rowsSorted = [...arr].sort(
        (a, b) => toNum(a.fecha_vencimiento) - toNum(b.fecha_vencimiento)
      );
      return { email, rows: rowsSorted };
    });

    // (opcional) ordenar grupos por email asc
    groups.sort((a, b) => a.email.localeCompare(b.email));
    return groups;
  }, [filtered]);

  /* =========================================================
   * Editar / Guardar
   * ======================================================= */
  function openEdit(row: Pantalla) {
    const seeded: EditState = {
      ...row,
      nombre: row.nombre ?? "",
      correo: row.correo ?? "",
      contrasena: row.contrasena ?? "",
      nro_pantalla: row.nro_pantalla ?? "",
      fecha_compra: row.fecha_compra ?? "",
      fecha_vencimiento: row.fecha_vencimiento ?? "",
      estado: row.estado ?? "",
      comentario: row.comentario ?? "",
      proveedor: row.proveedor ?? "",
      __applyCorreoToCuenta: false,
    };
    if (
      seeded.fecha_compra &&
      seeded.meses_pagados &&
      !seeded.fecha_vencimiento
    ) {
      const venc = addMonthsYYYYMMDD(
        seeded.fecha_compra as string,
        Number(seeded.meses_pagados)
      );
      if (venc) seeded.fecha_vencimiento = venc;
    }
    seeded.total_ganado = calcGanado(
      seeded.total_pagado,
      seeded.total_pagado_proveedor
    );

    setEdit(seeded);
  }

  // recalcula vencimiento cuando cambia compra/meses
  useEffect(() => {
    if (!edit) return;
    const fc = edit.fecha_compra ?? "";
    const m = edit.meses_pagados ?? null;
    if (fc && m != null && m >= 1) {
      const venc = addMonthsYYYYMMDD(fc, m);
      if (venc !== edit.fecha_vencimiento) {
        setEdit((s) => ({ ...(s as EditState), fecha_vencimiento: venc }));
      }
    } else if (edit.fecha_vencimiento) {
      setEdit((s) => ({ ...(s as EditState), fecha_vencimiento: "" }));
    }
  }, [edit?.fecha_compra, edit?.meses_pagados]);

  async function saveEdit() {
    if (!edit) return;
    setSaving(true);
    setErr(null);

    try {
      const row = rows.find((r) => r.id === edit.id);
      if (!row) throw new Error("Fila no encontrada");

      const applyCorreoCuenta = (edit as any).applyCorreoCuenta === true;

      const oldCorreo = normEmail(row.correo);
      const newCorreo = normEmail(edit.correo as string);

      const oldPid: number | null =
        row.plataforma_id == null ? null : Number(row.plataforma_id);
      const newPid: number | null =
        edit.plataforma_id == null ? oldPid : Number(edit.plataforma_id);

      // ===== Derivados =====
      let finalVence = edit.fecha_vencimiento ?? null;
      if (edit.fecha_compra && edit.meses_pagados && edit.meses_pagados >= 1) {
        finalVence = addMonthsYYYYMMDD(edit.fecha_compra, edit.meses_pagados);
      }
      const totalGanadoCalc = calcGanado(
        edit.total_pagado,
        edit.total_pagado_proveedor
      );

      // ===== Payload base para PANTALLAS (sin correo/plataforma si se aplica a todas) =====
      const payloadPant: Record<string, unknown> = {
        contacto: edit.contacto ?? "",
        nombre: (edit.nombre ?? "") === "" ? null : edit.nombre ?? "",
        nro_pantalla: edit.nro_pantalla ?? "",
        fecha_compra: edit.fecha_compra ?? null,
        fecha_vencimiento: finalVence,
        meses_pagados:
          edit.meses_pagados == null ? null : clamp(edit.meses_pagados, 1),
        total_pagado: edit.total_pagado,
        total_pagado_proveedor: edit.total_pagado_proveedor,
        total_ganado: totalGanadoCalc,
        estado: edit.estado ?? "",
        comentario: (edit.comentario ?? null) as string | null,
      };

      // Si NO aplicamos a todas, sí permitimos cambiar plataforma en pantallas
      if (!applyCorreoCuenta) {
        payloadPant.plataforma_id = newPid;
      }

      let cuentaIdToUpdate: number | null = row.cuenta_id ?? null;

      // ===== A) Checkbox marcado → actualiza la CUENTA (mismo id) =====
      if (applyCorreoCuenta) {
        if (!row.cuenta_id) {
          throw new Error(
            "No hay cuenta asociada (cuenta_id) para aplicar el correo a todas."
          );
        }

        // 1) Actualizar cuentascompartidas (correo/plataforma/clave) en el MISMO id
        const bodyCuenta: any = {};
        if (newCorreo && newCorreo !== oldCorreo) bodyCuenta.correo = newCorreo;
        if (newPid !== oldPid) bodyCuenta.plataforma_id = newPid;

        const hasNewPass =
          typeof edit.contrasena === "string" &&
          edit.contrasena.trim() !== "" &&
          edit.contrasena !== row.contrasena;
        if (hasNewPass) bodyCuenta.contrasena = edit.contrasena;

        if (Object.keys(bodyCuenta).length > 0) {
          const resC = await fetch(`/api/cuentascompartidas/${row.cuenta_id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bodyCuenta),
          });
          if (!resC.ok) {
            const j = await resC.json().catch(() => ({}));
            throw new Error(
              j?.error ??
                "No se pudo actualizar la cuenta compartida (correo/plataforma)."
            );
          }
        }

        // 2) Patch de PANTALLAS solo con campos locales (¡sin correo/plataforma!)
        const resPant = await fetch(`/api/pantallas/${edit.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloadPant),
        });
        if (!resPant.ok) {
          const j = await resPant.json().catch(() => ({}));
          throw new Error(j?.error ?? "No se pudo guardar");
        }
        const flat = await resPant.json();

        // 3) UI: reflejar el cambio en TODAS las filas con el mismo cuenta_id
        setRows((prev) => {
          const next = prev.map((r) =>
            Number(r.cuenta_id) === Number(row.cuenta_id)
              ? {
                  ...r,
                  correo: newCorreo ? newCorreo : r.correo,
                  plataforma_id:
                    newPid !== undefined && newPid !== null
                      ? newPid
                      : r.plataforma_id,
                  contrasena:
                    hasNewPass && typeof edit.contrasena === "string"
                      ? edit.contrasena
                      : r.contrasena,
                }
              : r
          );
          writeCache(next);
          return next;
        });

        // 4) Mezcla la fila editada con lo devuelto por la API
        mergeIntoCache({
          id: Number(flat?.row?.id ?? edit.id),
          cuenta_id: cuentaIdToUpdate,
          contacto: flat?.row?.contacto ?? edit.contacto,
          nombre: flat?.row?.usuarios?.nombre ?? edit.nombre ?? null,
          nro_pantalla: flat?.row?.nro_pantalla ?? edit.nro_pantalla ?? null,
          fecha_compra: flat?.row?.fecha_compra ?? edit.fecha_compra ?? null,
          fecha_vencimiento: flat?.row?.fecha_vencimiento ?? finalVence ?? null,
          meses_pagados:
            flat?.row?.meses_pagados ??
            (edit.meses_pagados == null ? null : edit.meses_pagados),
          total_pagado:
            flat?.row?.total_pagado == null
              ? null
              : Number(flat.row.total_pagado as any),
          total_pagado_proveedor:
            flat?.row?.total_pagado_proveedor == null
              ? null
              : Number(flat.row.total_pagado_proveedor as any),
          total_ganado:
            flat?.row?.total_ganado == null
              ? null
              : Number(flat.row.total_ganado as any),
          estado: flat?.row?.estado ?? edit.estado ?? null,
          comentario: flat?.row?.comentario ?? edit.comentario ?? null,
          plataforma_id:
            newPid !== undefined && newPid !== null
              ? newPid
              : row.plataforma_id,
          correo: newCorreo ? newCorreo : row.correo || null,
          contrasena:
            hasNewPass && typeof edit.contrasena === "string"
              ? edit.contrasena
              : row.contrasena ?? null,
          proveedor: edit.proveedor ?? null,
        });

        broadcastInvalidate();
        setEdit(null);
        setSaving(false);
        return; // ← Detén aquí; no entres a la rama normal
      }

      // ===== B) Checkbox NO marcado → flujo original (puede crear/reasignar cuentas)
      if (newCorreo && newCorreo !== oldCorreo) {
        const existing = await findCuentaCompartidaByCorreo(null, newCorreo);

        if (existing?.id) {
          (payloadPant as any).cuenta_id = Number(existing.id);
          (payloadPant as any).correo = newCorreo;
          cuentaIdToUpdate = Number(existing.id);

          const hasNewPass =
            typeof edit.contrasena === "string" &&
            edit.contrasena.trim() !== "";
          if (hasNewPass) {
            try {
              await fetch(`/api/cuentascompartidas/${existing.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contrasena: edit.contrasena }),
              });
            } catch {}
          }
        } else {
          const bodyCreate: any = { correo: newCorreo };
          if (oldPid != null) bodyCreate.plataforma_id = oldPid;
          if (
            typeof edit.contrasena === "string" &&
            edit.contrasena.trim() !== ""
          ) {
            bodyCreate.contrasena = edit.contrasena;
          }

          const rNew = await fetch("/api/cuentascompartidas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bodyCreate),
          });
          if (!rNew.ok) {
            const j = await rNew.json().catch(() => ({}));
            throw new Error(
              j?.error ?? "No se pudo crear la cuenta compartida"
            );
          }
          const created = await rNew.json();
          if (!created?.id)
            throw new Error(
              "La API no devolvió id al crear cuentascompartidas"
            );

          (payloadPant as any).cuenta_id = Number(created.id);
          (payloadPant as any).correo = newCorreo;
          cuentaIdToUpdate = Number(created.id);
        }
      } else {
        const hasNewPass =
          typeof edit.contrasena === "string" &&
          edit.contrasena.trim() !== "" &&
          edit.contrasena !== row.contrasena;

        if (hasNewPass && row.cuenta_id) {
          try {
            await fetch(`/api/cuentascompartidas/${row.cuenta_id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ contrasena: edit.contrasena }),
            });
          } catch {}
        }

        (payloadPant as any).correo = newCorreo || oldCorreo || null;

        if (!newCorreo) {
          (payloadPant as any).cuenta_id = null;
          cuentaIdToUpdate = null;
        }
      }

      const res = await fetch(`/api/pantallas/${edit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadPant),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? "No se pudo guardar");
      }
      const flat = await res.json();

      const updated = {
        id: Number(flat?.row?.id ?? edit.id),
        cuenta_id: cuentaIdToUpdate,
        contacto: flat?.row?.contacto ?? edit.contacto,
        nombre: flat?.row?.usuarios?.nombre ?? edit.nombre ?? null,
        nro_pantalla: flat?.row?.nro_pantalla ?? edit.nro_pantalla ?? null,
        fecha_compra: flat?.row?.fecha_compra ?? edit.fecha_compra ?? null,
        fecha_vencimiento: flat?.row?.fecha_vencimiento ?? finalVence ?? null,
        meses_pagados:
          flat?.row?.meses_pagados ??
          (edit.meses_pagados == null ? null : edit.meses_pagados),
        total_pagado:
          flat?.row?.total_pagado == null
            ? null
            : Number(flat.row.total_pagado as any),
        total_pagado_proveedor:
          flat?.row?.total_pagado_proveedor == null
            ? null
            : Number(flat.row.total_pagado_proveedor as any),
        total_ganado:
          flat?.row?.total_ganado == null
            ? null
            : Number(flat.row.total_ganado as any),
        estado: flat?.row?.estado ?? edit.estado ?? null,
        comentario: flat?.row?.comentario ?? edit.comentario ?? null,
        plataforma_id:
          flat?.row?.plataforma_id != null
            ? Number(flat.row.plataforma_id)
            : newPid,
        correo: newCorreo ? newCorreo : row.correo || null,
        contrasena: (edit.contrasena as string) ?? row.contrasena ?? null,
        proveedor: edit.proveedor ?? null,
      } satisfies Partial<Pantalla> & { id: number };

      const nextCache = mergeIntoCache(updated);
      setRows(nextCache);
      broadcastInvalidate();
      setEdit(null);
    } catch (e: any) {
      setErr(e?.message ?? "Error guardando");
    } finally {
      setSaving(false);
    }
  }

  /* =========================================================
   * Selección
   * ======================================================= */
  const isRowSelected = (id: number) => selectedIds.has(id);
  const toggleRow = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };
  const allVisibleIds = filtered
    .map((r) => r.id)
    .filter((id) => Number.isFinite(id));
  const allVisibleSelected =
    allVisibleIds.length > 0 &&
    allVisibleIds.every((id) => selectedIds.has(id));
  const someVisibleSelected = allVisibleIds.some((id) => selectedIds.has(id));
  const toggleAllVisible = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) for (const id of allVisibleIds) next.add(id);
      else for (const id of allVisibleIds) next.delete(id);
      return next;
    });
  };

  /* =========================================================
   * Eliminación (individual y masiva) con inventario opcional
   * ======================================================= */
  const openDelete = async (id: number, label?: string) => {
    setDeleteTarget({ id, label });
    setDeleteErr(null);
    setDeleteAction(null);
    setCanArchive(false);
    setCheckingArchive(true);

    try {
      const victimLocal = rows.find((r) => r.id === id) || null;
      let correo = victimLocal?.correo ?? null;
      let plataforma_id = victimLocal?.plataforma_id ?? null;

      if (!correo || plataforma_id == null) {
        const resolved = await (async () => {
          try {
            const res = await fetch(`/api/pantallas/${id}`, {
              cache: "no-store",
            });
            if (!res.ok) return null;
            const j = await res.json();
            return {
              correo: j?.item?.correo ?? j?.correo ?? null,
              plataforma_id: j?.item?.plataforma_id ?? j?.plataforma_id ?? null,
            };
          } catch {
            return null;
          }
        })();
        if (resolved) {
          if (!correo) correo = resolved.correo;
          if (plataforma_id == null) plataforma_id = resolved.plataforma_id;
        }
      }

      setDeleteTarget({
        id,
        label:
          label ??
          (correo
            ? `${correo} / ${victimLocal?.nro_pantalla ?? ""}`
            : victimLocal?.nro_pantalla ?? `#${id}`),
      });

      if (!correo || plataforma_id == null) {
        setCanArchive(false);
        return;
      }

      // ======== usar SOLO las filas cargadas (lo que "miras") ========
      const usesLocal = countLocalByEmailAndPlatform(
        rows,
        correo,
        plataforma_id
      );
      setCanArchive(usesLocal <= 1);
    } catch (e: any) {
      setDeleteErr(e?.message ?? "Error al verificar el estado del correo.");
    } finally {
      setCheckingArchive(false);
    }
  };

  const doDelete = async (archive: boolean) => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteErr(null);
    setDeleteAction(archive ? "archive" : "purge");
    try {
      let victim = rows.find((r) => r.id === deleteTarget.id) || null;
      let victimPlataforma = victim?.plataforma_id ?? null;
      let victimCorreo = victim?.correo ?? null;
      let victimClave = victim?.contrasena ?? null;

      if ((!victimCorreo || victimPlataforma == null) && archive) {
        try {
          const resolved = await fetch(`/api/pantallas/${deleteTarget.id}`, {
            cache: "no-store",
          }).then((r) => (r.ok ? r.json() : null));
          if (resolved) {
            if (!victimCorreo)
              victimCorreo = resolved?.item?.correo ?? resolved?.correo ?? null;
            if (victimPlataforma == null)
              victimPlataforma =
                resolved?.item?.plataforma_id ??
                resolved?.plataforma_id ??
                null;
            if (!victimClave)
              victimClave =
                resolved?.item?.contrasena ?? resolved?.contrasena ?? null;
          }
        } catch {}
      }

      if (archive && victimCorreo && victimPlataforma != null) {
        await ensureInInventario(
          victimPlataforma as number | null,
          victimCorreo,
          victimClave
        );
      }

      const res = await fetch(`/api/pantallas/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? "No se pudo eliminar");
      }
      await res.json().catch(() => ({}));

      const next = removeFromCache(deleteTarget.id);
      setRows(next);
      broadcastInvalidate();

      setDeleteMsg("Pantalla eliminada correctamente.");
      setSelectedIds((prev) => {
        const s = new Set(prev);
        s.delete(deleteTarget.id);
        return s;
      });
      setDeleteTarget(null);
    } catch (e: any) {
      setDeleteErr(e?.message ?? "Error al eliminar");
    } finally {
      setDeleting(false);
      setDeleteAction(null);
    }
  };

  // ==== BULK ====
  type Built = {
    id: number;
    label?: string;
    canArchive: boolean;
    plataforma_id: number | null;
    correo: string | null;
    contrasena: string | null;
  };

  const buildBulkItem = async (id: number): Promise<Built> => {
    const local = rows.find((r) => r.id === id) || null;
    let correo = local?.correo ?? null;
    let plataforma_id = local?.plataforma_id ?? null;
    let contrasena = local?.contrasena ?? null;

    if (!correo || plataforma_id == null) {
      const resolved = await (async () => {
        try {
          const res = await fetch(`/api/pantallas/${id}`, {
            cache: "no-store",
          });
          if (!res.ok) return null;
          const j = await res.json();
          return {
            correo: j?.item?.correo ?? j?.correo ?? null,
            plataforma_id: j?.item?.plataforma_id ?? j?.plataforma_id ?? null,
            contrasena: j?.item?.contrasena ?? j?.contrasena ?? null,
          };
        } catch {
          return null;
        }
      })();
      if (resolved) {
        if (!correo) correo = resolved.correo;
        if (plataforma_id == null) plataforma_id = resolved.plataforma_id;
        if (!contrasena) contrasena = resolved.contrasena;
      }
    }

    // ======== usar SOLO las filas cargadas (lo que "miras") ========
    let can = false;
    if (correo && plataforma_id != null) {
      const usesLocal = countLocalByEmailAndPlatform(
        rows,
        correo,
        plataforma_id
      );
      can = usesLocal <= 1;
    }
    const label = correo
      ? `${correo} / ${local?.nro_pantalla ?? ""}`
      : local?.nro_pantalla ?? `#${id}`;
    return {
      id,
      label,
      canArchive: can,
      plataforma_id: plataforma_id ?? null,
      correo: correo ?? null,
      contrasena: contrasena ?? null,
    };
  };

  const openBulk = async (ids: number[]) => {
    const unique = Array.from(new Set(ids));
    if (unique.length === 0) return;
    setBulkOpen(true);
    setBulkErr(null);
    setBulkSummary(null);
    setBulkItems([]);
    setBulkAssessing(true);
    try {
      const items: Built[] = [];
      for (const id of unique) {
        // eslint-disable-next-line no-await-in-loop
        const it = await buildBulkItem(id);
        items.push(it);
      }
      setBulkItems(items);
    } catch (e: any) {
      setBulkErr(e?.message ?? "Error preparando la eliminación masiva.");
    } finally {
      setBulkAssessing(false);
    }
  };
  const openBulkSelected = () => openBulk(Array.from(selectedIds));
  const openBulkAllView = () => openBulk(filtered.map((r) => r.id));

  const runBulk = async (preferArchive: boolean) => {
    if (!bulkOpen || bulkItems.length === 0) return;
    setBulkProcessing(true);
    setBulkErr(null);
    setBulkProgress(0);
    const total = bulkItems.length;
    let archived = 0,
      purged = 0,
      failed = 0;

    for (let i = 0; i < bulkItems.length; i++) {
      const it = bulkItems[i];
      try {
        if (
          preferArchive &&
          it.canArchive &&
          it.correo &&
          it.plataforma_id != null
        ) {
          // eslint-disable-next-line no-await-in-loop
          await ensureInInventario(
            it.plataforma_id,
            it.correo,
            it.contrasena ?? null
          );
        }
        // eslint-disable-next-line no-await-in-loop
        const res = await fetch(`/api/pantallas/${it.id}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          failed++;
        } else {
          if (
            preferArchive &&
            it.canArchive &&
            it.correo &&
            it.plataforma_id != null
          )
            archived++;
          else purged++;
          setRows((rs) => rs.filter((r) => r.id !== it.id));
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(it.id);
            return next;
          });
          removeFromCache(it.id);
        }
      } catch {
        failed++;
      } finally {
        setBulkProgress(Math.round(((i + 1) / total) * 100));
      }
    }

    broadcastInvalidate();
    setBulkSummary({ total, archived, purged, failed });
    setBulkProcessing(false);
  };

  /* =========================================================
   * Render
   * ======================================================= */
  const selectedCount = selectedIds.size;

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold text-neutral-100 mb-3">
        Ver/Editar Pantallas
      </h2>

      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center mb-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar nombre, contacto, correo, estado, comentario…"
          className="flex-1 rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
        />
        <select
          value={platFilter === "all" ? "" : String(platFilter)}
          onChange={(e) =>
            setPlatFilter(e.target.value ? Number(e.target.value) : "all")
          }
          className="w-64 rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 [&>option]:bg-neutral-900 [&>option]:text-neutral-100"
        >
          <option value="">Todas</option>
          {plataformas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>

        <button
          onClick={forceRefresh}
          disabled={loading}
          className="px-4 py-2 rounded-lg border border-neutral-700 bg-neutral-900 text-neutral-100 hover:bg-neutral-800 disabled:opacity-60"
        >
          {loading ? "Actualizando…" : "Refrescar"}
        </button>
      </div>

      {/* Barra de acciones masivas */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <div className="text-sm text-neutral-300">
          Seleccionados: <span className="font-semibold">{selectedCount}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openBulkSelected}
            disabled={selectedCount === 0 || loading}
            className="rounded-lg border border-red-700 bg-red-800/40 px-3 py-1.5 text-red-100 hover:bg-red-800/60 disabled:opacity-50"
            title="Si es última relación por correo+plataforma → inventario; si no → eliminar"
          >
            Eliminar seleccionados
          </button>
          <button
            type="button"
            onClick={openBulkAllView}
            disabled={filtered.length === 0 || loading}
            className="rounded-lg border border-red-700 bg-red-800/40 px-3 py-1.5 text-red-100 hover:bg-red-800/60 disabled:opacity-50"
          >
            Eliminar todo (vista)
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            disabled={selectedCount === 0}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-neutral-100 hover:bg-neutral-800 disabled:opacity-50"
          >
            Limpiar selección
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-auto rounded-xl border border-neutral-800">
        <table className="min-w-[1200px] w-full text-sm text-neutral-100">
          <thead className="bg-neutral-900/70 border-b border-neutral-800 sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2 text-center w-10">
                <input
                  type="checkbox"
                  aria-label="Seleccionar todo"
                  checked={allVisibleSelected}
                  ref={(el) => {
                    if (el)
                      el.indeterminate =
                        !allVisibleSelected && someVisibleSelected;
                  }}
                  onChange={(e) => toggleAllVisible(e.target.checked)}
                />
              </th>
              <th className="px-3 py-2 text-left w-20">Acciones</th>
              <th className="px-3 py-2 text-left w-40">Plataforma</th>
              <th className="px-3 py-2 text-left w-44">Contacto</th>
              <th className="px-3 py-2 text-left w-40">Nombre</th>
              <th className="px-3 py-2 text-left w-[280px]">Correo</th>
              <th className="px-3 py-2 text-left w-[220px]">Clave</th>
              <th className="px-3 py-2 text-center w-24">Pantalla</th>
              <th className="px-3 py-2 text-right w-28">Total</th>
              <th className="px-3 py-2 text-right w-28">Pagado Prov.</th>
              <th className="px-3 py-2 text-right w-28">Ganado</th>
              <th className="px-3 py-2 text-center w-16">Meses</th>
              <th className="px-3 py-2 text-center w-28">Compra</th>
              <th className="px-3 py-2 text-center w-28">Vence</th>
              <th className="px-3 py-2 text-left w-28">Estado</th>
               <th className="px-3 py-2 text-left w-36">Proveedor</th>
              <th className="px-3 py-2 text-left">Comentario</th>
            </tr>
          </thead>
          <tbody>
            {groupedByEmail.length > 0 ? (
              groupedByEmail.map((g, gi) => (
                <React.Fragment key={`grp-${gi}-${g.email}`}>
                  {/* Encabezado del grupo (correo) + badges de disponibilidad */}
                  <tr className="bg-neutral-950/60 border-b border-neutral-800">
                    <td colSpan={17} className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-semibold text-neutral-200">
                          {g.email}
                        </span>
                        <span className="text-neutral-400">
                          • {g.rows.length} registro(s)
                        </span>
                        {getPerPlatformForEmail(g.email).map((pp) => {
                          const cap = pp.capacity; // puede ser null si no se conoce aún
                          const avail = pp.available; // ya viene calculado (null si cap==null)

                          const cls =
                            avail == null
                              ? "border-neutral-600 bg-neutral-800/40 text-neutral-200"
                              : avail > 0
                              ? "border-emerald-700 bg-emerald-800/40 text-emerald-100"
                              : "border-rose-700 bg-rose-900/40 text-rose-100";
                          // Antes de retornar el encabezado del grupo:
                          const allOn = g.rows.every((x) => !!x.cuenta_caida);
                          const someOn =
                            !allOn && g.rows.some((x) => !!x.cuenta_caida);

                          // Dentro del encabezado:
                          {
                            allOn && (
                              <span className="ml-2 inline-flex items-center rounded-md border border-rose-700 bg-rose-900/40 px-2 py-0.5 text-xs text-rose-100">
                                🏳️ Cuenta caída (todas)
                              </span>
                            );
                          }
                          {
                            !allOn && someOn && (
                              <span className="ml-2 inline-flex items-center rounded-md border border-amber-700 bg-amber-900/40 px-2 py-0.5 text-xs text-amber-100">
                                🏳️ Algunas caídas
                              </span>
                            );
                          }

                          return (
                            <span
                              key={pp.pid}
                              className={`ml-2 inline-flex items-center gap-2 rounded-md border px-2 py-0.5 text-xs ${cls}`}
                              title={
                                cap == null
                                  ? `${pp.name} • capacidad: desconocida • usadas: ${pp.used}`
                                  : `${pp.name} • capacidad: ${cap} • usadas: ${pp.used}`
                              }
                            >
                              <strong className="font-medium">{pp.name}</strong>
                              <span>
                                ·{" "}
                                {cap == null
                                  ? "Capacidad desconocida"
                                  : avail! > 0
                                  ? `${avail} disponibles`
                                  : "Sin pantallas disponibles"}
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    </td>
                  </tr>

                  {/* Filas del grupo (ya vienen ordenadas por vence desde tu groupedByEmail) */}
                  {g.rows.map((r, idx) => (
                    <tr
                      key={r.id ?? `row-${gi}-${idx}`}
                      className="border-b border-neutral-800 hover:bg-neutral-900/30"
                      onDoubleClick={() => openEdit(r)}
                    >
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={isRowSelected(r.id)}
                          onChange={(e) => toggleRow(r.id, e.target.checked)}
                        />
                      </td>

                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <button
                            title="Editar"
                            onClick={() => openEdit(r)}
                            className="text-neutral-300 hover:text-white inline-flex p-1 rounded-md hover:bg-neutral-800/60"
                            aria-label="Editar"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              width="18"
                              height="18"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                            </svg>
                          </button>
                          <button
                            title="Eliminar"
                            onClick={() =>
                              openDelete(
                                r.id,
                                `${r.correo ?? ""} / ${r.nro_pantalla ?? ""}`
                              )
                            }
                            className="text-rose-300 hover:text-rose-200 inline-flex p-1 rounded-md hover:bg-rose-900/30"
                            aria-label="Eliminar"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              width="18"
                              height="18"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                              <path d="M10 11v6" />
                              <path d="M14 11v6" />
                              <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                          {/* 🏳️ Bandera (aplica a TODO el correo) */}
                          <button
                            title={
                              r.cuenta_caida
                                ? "Cuenta caída (clic para quitar en todas)"
                                : "Marcar como caída en todas las de este correo"
                            }
                            onClick={() => toggleFlagByEmail(r)}
                            className={`inline-flex p-1 rounded-md border hover:bg-neutral-800/60 ${
                              r.cuenta_caida
                                ? "bg-rose-800/40 border-rose-700 text-rose-200"
                                : "bg-neutral-800/40 border-neutral-600 text-neutral-300"
                            }`}
                            aria-label="Bandera cuenta caída"
                          >
                            🏳️
                          </button>
                        </div>
                      </td>

                      <td className="px-3 py-2 whitespace-nowrap">
                        {plataformas.find((p) => p.id === r.plataforma_id)
                          ?.nombre ?? "—"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {r.contacto || "—"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {r.nombre || "—"}
                      </td>

                      <td className="px-3 py-2">
                        <span
                          className="inline-block max-w-[260px] truncate align-bottom"
                          title={r.correo ?? ""}
                        >
                          {r.correo || "—"}
                        </span>
                      </td>

                      <td className="px-3 py-2">
                        <span
                          className="inline-block max-w-[200px] truncate align-bottom"
                          title={r.contrasena ?? ""}
                        >
                          {r.contrasena || "—"}
                        </span>
                      </td>

                      {/* Pantalla (nro_pantalla) */}
                      <td className="px-3 py-2 text-center">
                        {r.nro_pantalla || "—"}
                      </td>

                      <td className="px-3 py-2 text-right">
                        {money(r.total_pagado)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {money(r.total_pagado_proveedor)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {money(r.total_ganado)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {r.meses_pagados ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-center whitespace-nowrap">
                        {r.fecha_compra || "—"}
                      </td>
                      <td className="px-3 py-2 text-center whitespace-nowrap">
                        {r.fecha_vencimiento || "—"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {r.estado || "—"}
                      </td>
                        <td className="px-3 py-2 whitespace-nowrap">
    {r.proveedor || "—"}
  </td>
                      <td className="px-3 py-2">
                        <span
                          className="inline-block max-w-[420px] truncate align-bottom"
                          title={r.comentario ?? ""}
                        >
                          {r.comentario || "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))
            ) : (
              <tr>
                <td
                  colSpan={16}
                  className="px-3 py-6 text-center text-neutral-400"
                >
                  {loading ? "Cargando…" : "No se encontraron resultados."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer info */}
      <div className="mt-2 text-sm text-neutral-400">
        {rows.length} fila(s) en cache · {filtered.length} visible(s)
        {err && <span className="text-rose-400 ml-2">— {err}</span>}
        {deleteMsg && (
          <span className="text-emerald-400 ml-2">— {deleteMsg}</span>
        )}
      </div>

      {/* Modal edición */}
      {edit && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 bg-black/60 overflow-y-auto"
            role="dialog"
            aria-modal="true"
          >
            <div className="min-h-screen flex items-center justify-center p-4">
              <div
                className="w-full max-w-3xl rounded-2xl border border-neutral-800 bg-neutral-900 text-neutral-100 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-5 py-3 border-b border-neutral-800 flex items-center justify-between sticky top-0 bg-neutral-900 rounded-t-2xl">
                  <h3 className="font-semibold">Editar pantalla #{edit.id}</h3>
                  <button
                    className="px-2 py-1 hover:text-white"
                    onClick={() => setEdit(null)}
                    disabled={saving}
                  >
                    ✕
                  </button>
                </div>

                <div className="p-5 grid gap-4 sm:grid-cols-2">
                  {/* Plataforma */}
                  <label className="grid gap-1">
                    <span className="text-sm text-neutral-300">Plataforma</span>
                    <select
                      className="rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-950 outline-none focus:ring-2 focus:ring-neutral-600 [&>option]:bg-neutral-950 [&>option]:text-neutral-100"
                      value={
                        edit.plataforma_id == null
                          ? ""
                          : String(edit.plataforma_id)
                      }
                      onChange={(e) =>
                        setEdit((s) => ({
                          ...(s as EditState),
                          plataforma_id: e.target.value
                            ? Number(e.target.value)
                            : null,
                        }))
                      }
                    >
                      <option value="">—</option>
                      {plataformas.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-1">
                    <span className="text-sm text-neutral-300">Contacto</span>
                    <input
                      className="rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-950 outline-none focus:ring-2 focus:ring-neutral-600"
                      value={edit.contacto ?? ""}
                      onChange={(e) =>
                        setEdit((s) => ({
                          ...(s as EditState),
                          contacto: e.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-sm text-neutral-300">Nombre</span>
                    <input
                      className="rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-950 outline-none focus:ring-2 focus:ring-neutral-600"
                      value={edit.nombre ?? ""}
                      onChange={(e) =>
                        setEdit((s) => ({
                          ...(s as EditState),
                          nombre: e.target.value,
                        }))
                      }
                    />
                  </label>

                  <label className="grid gap-1 relative" ref={emailDropdownRef}>
                    <span className="text-sm text-neutral-300 flex items-center gap-2">
                      Correo
                      {loadingEmails && (
                        <span className="text-xs text-neutral-500">
                          cargando…
                        </span>
                      )}
                      {!loadingEmails && visibleAvailableEmails.length > 0 && (
                        <span className="text-xs text-sky-400">
                          {visibleAvailableEmails.length} disponible(s)
                        </span>
                      )}
                    </span>
                    <input
                      className="rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-950 outline-none focus:ring-2 focus:ring-neutral-600"
                      value={edit.correo ?? ""}
                      placeholder="Escribe o elige uno disponible"
                      autoComplete="off"
                      onFocus={() => setEmailDropdownOpen(true)}
                      onChange={(e) => {
                        setEdit((s) => ({
                          ...(s as EditState),
                          correo: e.target.value,
                        }));
                        setEmailDropdownOpen(true);
                      }}
                    />

                    {emailDropdownOpen && (
                      <div
                        className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border border-neutral-700 bg-neutral-900 text-sm text-neutral-100 shadow-lg"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {loadingEmails && (
                          <div className="p-2 text-sm text-neutral-400">
                            Cargando correos…
                          </div>
                        )}

                        {!loadingEmails && (
                          <ul className="max-h-60 overflow-auto">
                            {visibleAvailableEmails.length === 0 && (
                              <li className="px-3 py-2 text-neutral-500">
                                Sin correos con cupos disponibles
                              </li>
                            )}
                            {visibleAvailableEmails.map((em) => (
                              <li key={em}>
                                <button
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => {
                                    setEdit((s) => ({
                                      ...(s as EditState),
                                      correo: em,
                                    }));
                                    setEmailDropdownOpen(false);
                                  }}
                                  className="flex w-full items-center justify-between gap-2 text-left px-3 py-2 hover:bg-neutral-800"
                                >
                                  <span className="truncate">{em}</span>
                                  <span className="text-xs opacity-70 shrink-0">{`cupos: ${effectiveFreeForEmail(em)}`}</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </label>
                  {/* dentro del modal edición, por ejemplo arriba de “Guardar” */}
                  <label className="flex items-center gap-2 sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={Boolean((edit as any).applyCorreoCuenta)}
                      onChange={(e) =>
                        setEdit((s) => ({
                          ...(s as any),
                          applyCorreoCuenta: e.target.checked,
                        }))
                      }
                    />
                    <span className="text-sm text-neutral-300">
                      Aplicar correo (y plataforma) a todas las pantallas de
                      esta cuenta
                    </span>
                  </label>

                  <label className="grid gap-1">
                    <span className="text-sm text-neutral-300">Contraseña</span>
                    <input
                      className="rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-950 outline-none focus:ring-2 focus:ring-neutral-600"
                      value={edit.contrasena ?? ""}
                      onChange={(e) =>
                        setEdit((s) => ({
                          ...(s as EditState),
                          contrasena: e.target.value,
                        }))
                      }
                    />
                  </label>

                  <label className="grid gap-1">
                    <span className="text-sm text-neutral-300">
                      Nro. pantalla
                    </span>
                    <input
                      className="rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-950 outline-none focus:ring-2 focus:ring-neutral-600"
                      value={edit.nro_pantalla ?? ""}
                      onChange={(e) =>
                        setEdit((s) => ({
                          ...(s as EditState),
                          nro_pantalla: e.target.value,
                        }))
                      }
                    />
                  </label>

                  <label className="grid gap-1">
                    <span className="text-sm text-neutral-300">Estado</span>
                    <input
                      className="rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-950 outline-none focus:ring-2 focus:ring-neutral-600"
                      value={edit.estado ?? ""}
                      onChange={(e) =>
                        setEdit((s) => ({
                          ...(s as EditState),
                          estado: e.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-sm text-neutral-300">
                      Fecha compra (YYYY-MM-DD)
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        className="flex-1 rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-950 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600"
                        value={edit.fecha_compra ?? ""}
                        onChange={(e) =>
                          setEdit((s) => ({
                            ...(s as EditState),
                            fecha_compra: e.target.value,
                          }))
                        }
                        // 👉 Abre el calendario solo si aún no está enfocado
                        onMouseDown={(e) => {
                          const el = e.currentTarget;
                          if (document.activeElement !== el && el.showPicker) {
                            requestAnimationFrame(() => el.showPicker());
                          }
                        }}
                      />

                      {/* 📅 Botón para abrir el calendario explícitamente */}
                      <button
                        type="button"
                        onClick={() => {
                          const input = document.querySelector(
                            'input[type="date"]'
                          ) as HTMLInputElement;
                          input?.showPicker?.();
                        }}
                        className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 hover:bg-neutral-800"
                        title="Abrir calendario"
                      >
                        📅
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setEdit((s) => ({
                            ...(s as EditState),
                            fecha_compra: todayYMDLocal(),
                          }))
                        }
                        className="whitespace-nowrap rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 hover:bg-neutral-800"
                        title="Poner fecha de compra en hoy"
                      >
                        Hoy
                      </button>
                    </div>
                  </label>
                  <label className="grid gap-1">
                    <span className="text-sm text-neutral-300">
                      Meses pagados
                    </span>
                    <input
                      type="number"
                      min={1}
                      className="rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-950 outline-none focus:ring-2 focus:ring-neutral-600"
                      value={String(edit.meses_pagados ?? "")}
                      onChange={(e) =>
                        setEdit((s) => ({
                          ...(s as EditState),
                          meses_pagados:
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                        }))
                      }
                    />
                  </label>

                  <label className="grid gap-1">
                    <span className="text-sm text-neutral-300">
                      Fecha vencimiento (auto)
                    </span>
                    <input
                      type="date"
                      disabled
                      readOnly
                      className="rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-950/70 text-neutral-400 cursor-not-allowed"
                      value={edit.fecha_vencimiento ?? ""}
                    />
                  </label>

                  <label className="grid gap-1">
                    <span className="text-sm text-neutral-300">
                      Total pagado
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-950 outline-none focus:ring-2 focus:ring-neutral-600"
                      value={edit.total_pagado ?? ""}
                      onChange={(e) =>
                        setEdit((s) => ({
                          ...(s as EditState),
                          total_pagado:
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                        }))
                      }
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-sm text-neutral-300">
                      Pagado proveedor
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-950 outline-none focus:ring-2 focus:ring-neutral-600"
                      value={edit.total_pagado_proveedor ?? ""}
                      onChange={(e) =>
                        setEdit((s) => ({
                          ...(s as EditState),
                          total_pagado_proveedor:
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                        }))
                      }
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-sm text-neutral-300">
                      Total ganado (auto)
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      disabled
                      readOnly
                      className="rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-950/70 text-neutral-400 cursor-not-allowed"
                      value={edit.total_ganado ?? ""}
                    />
                  </label>

                  <label className="grid gap-1 sm:col-span-2">
                    <span className="text-sm text-neutral-300">Comentario</span>
                    <textarea
                      rows={3}
                      className="rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-950 outline-none focus:ring-2 focus:ring-neutral-600"
                      value={edit.comentario ?? ""}
                      onChange={(e) =>
                        setEdit((s) => ({
                          ...(s as EditState),
                          comentario: e.target.value,
                        }))
                      }
                    />
                  </label>
                </div>

                <div className="px-5 py-3 border-t border-neutral-800 flex items-center justify-end gap-2 sticky bottom-0 bg-neutral-900 rounded-b-2xl">
                  <button
                    className="px-3 py-2 rounded-lg border border-neutral-600 hover:bg-neutral-800"
                    onClick={() => setEdit(null)}
                    disabled={saving}
                  >
                    Cancelar
                  </button>
                  <button
                    className="px-3 py-2 rounded-lg border border-emerald-700 bg-emerald-800/40 hover:bg-emerald-800/60 disabled:opacity-60"
                    onClick={saveEdit}
                    disabled={saving}
                  >
                    {saving ? "Guardando…" : "Guardar cambios"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Modal eliminar (individual) */}
      {deleteTarget && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 bg-black/60 overflow-y-auto"
            onClick={() => !deleting && setDeleteTarget(null)}
          >
            <div className="min-h-screen flex items-center justify-center p-4">
              <div
                className="w-full max-w-md rounded-xl border border-neutral-700 bg-neutral-900 p-4 text-neutral-100 shadow-xl"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-labelledby="modal-title"
                aria-describedby="modal-desc"
              >
                <h4 id="modal-title" className="text-lg font-semibold mb-2">
                  Eliminar pantalla
                </h4>
                <p id="modal-desc" className="text-sm text-neutral-300">
                  {deleteTarget.label ? (
                    <>
                      <span className="opacity-80">({deleteTarget.label})</span>
                      <br />
                    </>
                  ) : null}
                  {checkingArchive
                    ? "Verificando si es la última relación por correo y plataforma…"
                    : canArchive
                    ? "Es la última pantalla con este correo en esta plataforma. Puedes enviarla al inventario antes de eliminar."
                    : "Existen más pantallas con este correo en esta plataforma. Solo puedes eliminar definitivamente."}
                </p>

                {deleteErr && (
                  <div className="mt-3 rounded-lg border border-red-800/50 bg-red-950/30 p-2 text-sm text-red-200">
                    {deleteErr}
                  </div>
                )}

                <div
                  className={`mt-4 ${
                    canArchive
                      ? "grid gap-2 sm:grid-cols-2"
                      : "flex justify-end gap-2"
                  }`}
                >
                  {canArchive && (
                    <button
                      type="button"
                      onClick={() => doDelete(true)}
                      disabled={deleting || checkingArchive}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-700 bg-emerald-800/40 px-3 py-2 hover:bg-emerald-800/60 focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:opacity-60"
                      title="Crear/asegurar inventario y eliminar"
                    >
                      {deleting && deleteAction === "archive"
                        ? "Enviando…"
                        : "Enviar al inventario"}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => doDelete(false)}
                    disabled={deleting}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-700 bg-red-800/40 px-3 py-2 hover:bg-red-800/60 focus:outline-none focus:ring-2 focus:ring-red-600 disabled:opacity-60"
                    title="Eliminar sin archivar"
                  >
                    {deleting && deleteAction === "purge"
                      ? "Eliminando…"
                      : "Eliminar definitivamente"}
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(null)}
                    disabled={deleting}
                    className="rounded-lg border border-neutral-600 px-3 py-2 hover:bg-neutral-800 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Modal eliminación MASIVA */}
      {bulkOpen && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 bg-black/60 overflow-y-auto"
            onClick={() => !bulkProcessing && setBulkOpen(false)}
          >
            <div className="min-h-screen flex items-center justify-center p-4">
              <div
                className="w-full max-w-xl rounded-xl border border-neutral-700 bg-neutral-900 p-4 text-neutral-100 shadow-xl"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-labelledby="bulk-title"
                aria-describedby="bulk-desc"
              >
                <h4 id="bulk-title" className="text-lg font-semibold mb-2">
                  Eliminar {bulkItems.length} pantalla(s)
                </h4>

                {bulkAssessing ? (
                  <p className="text-sm text-neutral-300">
                    Analizando registros para decidir inventario/eliminación…
                  </p>
                ) : (
                  <>
                    <p id="bulk-desc" className="text-sm text-neutral-300">
                      Se verificará cada registro: si es la última relación por{" "}
                      <strong>correo + plataforma</strong>, se enviará al
                      inventario y luego se eliminará; en caso contrario, se
                      eliminará definitivamente.
                    </p>

                    {bulkErr && (
                      <div className="mt-3 rounded-lg border border-red-800/50 bg-red-950/30 p-2 text-sm text-red-200">
                        {bulkErr}
                      </div>
                    )}

                    {bulkSummary && (
                      <div className="mt-3 rounded-lg border border-neutral-700 bg-neutral-800/40 p-2 text-sm">
                        <div>Total procesados: {bulkSummary.total}</div>
                        <div>Enviados a inventario: {bulkSummary.archived}</div>
                        <div>
                          Eliminados definitivamente: {bulkSummary.purged}
                        </div>
                        <div>Fallidos: {bulkSummary.failed}</div>
                      </div>
                    )}

                    {bulkProcessing && (
                      <div className="mt-3">
                        <div className="h-2 w-full rounded bg-neutral-800 overflow-hidden">
                          <div
                            className="h-2 bg-emerald-600"
                            style={{ width: `${bulkProgress}%` }}
                          />
                        </div>
                        <div className="mt-1 text-xs text-neutral-400">
                          {bulkProgress}%
                        </div>
                      </div>
                    )}

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => runBulk(true)}
                        disabled={
                          bulkAssessing ||
                          bulkProcessing ||
                          bulkItems.length === 0
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-700 bg-emerald-800/40 px-3 py-2 hover:bg-emerald-800/60 focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:opacity-60"
                      >
                        Inventario (cuando aplique) + Eliminar
                      </button>

                      <button
                        type="button"
                        onClick={() => runBulk(false)}
                        disabled={
                          bulkAssessing ||
                          bulkProcessing ||
                          bulkItems.length === 0
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-700 bg-red-800/40 px-3 py-2 hover:bg-red-800/60 focus:outline-none focus:ring-2 focus:ring-red-600 disabled:opacity-60"
                      >
                        Eliminar definitivamente
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => setBulkOpen(false)}
                        disabled={bulkProcessing}
                        className="rounded-lg border border-neutral-600 px-3 py-2 hover:bg-neutral-800 disabled:opacity-50"
                      >
                        Cerrar
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
