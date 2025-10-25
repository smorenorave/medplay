"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePlataformas } from "@/hooks/usePlataformas";

/* =========================================================
 * Tipos
 * ======================================================= */
type Cuenta = {
  id: number;
  plataforma_id: number | null;
  contacto: string;
  nombre: string | null;
  correo: string | null;
  contrasena: string | null;
  proveedor: string | null;
  fecha_compra: string | null; // YYYY-MM-DD
  fecha_vencimiento: string | null; // YYYY-MM-DD (auto)
  meses_pagados: number | null;
  total_pagado: number | null;
  total_pagado_proveedor: number | null;
  total_ganado: number | null;
  estado: string | null;
  comentario: string | null;
};
type EditState = Partial<Cuenta> & { id: number };

/* =========================================================
 * Config
 * ======================================================= */
const REFETCH_ON_FOCUS = false;
const STALE_AFTER_MS = 5 * 60_000;
const STAMP_TTL_MS = 5 * 30_000;
let dateEl: HTMLInputElement | null = null;
/* =========================================================
 * Cache y sync
 * ======================================================= */
const LS_CACHE_KEY = "__cuentas_cache_v3";
const LS_REMOTE_STAMP = "__cuentas_remote_stamp";
const BC_NAME = "cuentas_mutations_bc";

type CacheShape = { rows: Cuenta[]; ts: number };

const hasWindow = () => typeof window !== "undefined";
const n = (x: unknown) =>
  x == null || x === "" || Number.isNaN(Number(x)) ? null : Number(x);

const todayYMDLocal = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

function normalizeRow(r: any): Cuenta {
  return {
    id: Number(r.id),
    plataforma_id: n(r.plataforma_id),
    contacto: String(r.contacto ?? ""),
    nombre: r.nombre ?? null,
    correo: r.correo ?? null,
    contrasena: r.contrasena ?? null,
    proveedor: r.proveedor ?? null,
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
function writeCache(rows: Cuenta[], remoteStamp?: number) {
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
function mergeIntoCache(p: any): Cuenta[] {
  const row = normalizeRow(p);
  const current = readCache();
  const list = current?.rows ?? [];
  const idx = list.findIndex((x) => x.id === row.id);
  let next: Cuenta[];
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
    bc.postMessage({ type: "invalidate-cuentas" });
    bc.close();
  } catch {}
}

/* =========================================================
 * Fetchers
 * ======================================================= */
async function fetchStamp(): Promise<number> {
  try {
    const r = await fetch("/api/cuentascompletas/stamp", { cache: "no-store" });
    const j = (await r.json()) as { stamp?: number };
    return Number(j?.stamp || 0);
  } catch {
    return 0;
  }
}
async function fetchAllCuentas(): Promise<Cuenta[]> {
  const out: Cuenta[] = [];
  let cursor: number | null = null;
  let guard = 0;
  while (guard++ < 50) {
    const url =
      "/api/cuentascompletas?limit=500" +
      (cursor ? `&cursor=${encodeURIComponent(String(cursor))}` : "");
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("No se pudieron cargar las cuentas completas");
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
/** Normaliza texto para búsqueda: minúsculas, sin tildes y sin espacios */
const normSearch = (s?: string | null) =>
  (s ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD") // separa diacríticos
    .replace(/\p{Diacritic}/gu, "") // quita tildes
    .replace(/\s+/g, ""); // quita TODOS los espacios

const money = (v: number | null) =>
  v == null || Number.isNaN(v)
    ? "—"
    : "$\u00A0" + new Intl.NumberFormat("es-CO").format(v);

const clamp = (val: unknown, min: number) => {
  const num = Number(val);
  return Number.isFinite(num) ? Math.max(min, num) : min;
};

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
 * Helpers Inventario / Conteos
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
    if (await existsInInventario(plataforma_id ?? null, email)) return;
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

/** conteo local por (correo + plataforma) sobre la vista cargada */
function countLocalByEmailAndPlatform(
  all: Cuenta[],
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

/* =========================================================
 * Componente principal
 * ======================================================= */

const calcularTotalGanado = (tp?: number | null, tpp?: number | null) => {
  const a = Number(tp ?? 0);
  const b = Number(tpp ?? 0);
  return Math.round((a - b) * 100) / 100;
};

export default function CuentasCompletasViewer() {
  const { plataformas } = usePlataformas();

  const [rows, setRows] = useState<Cuenta[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [platFilter, setPlatFilter] = useState<number | "all">("all");

  // edición
  const [edit, setEdit] = useState<EditState | null>(null);
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
    if (!edit) return;
    const nuevo = calcularTotalGanado(
      edit.total_pagado,
      edit.total_pagado_proveedor
    );
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
        const all = await fetchAllCuentas();
        if (!mounted.current) return;
        setRows(all);
        writeCache(all, remoteStamp);
      } catch (e: any) {
        if (mounted.current)
          setErr(e?.message ?? "Error cargando cuentas completas");
      } finally {
        if (mounted.current) setLoading(false);
      }
    })();

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(BC_NAME);
      bc.onmessage = async (ev) => {
        if (ev?.data?.type === "invalidate-cuentas") {
          try {
            setLoading(true);
            const stamp = await fetchStamp();
            const local = Number(localStorage.getItem(LS_REMOTE_STAMP) || 0);
            if (stamp !== local) {
              const all = await fetchAllCuentas();
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
      const [stamp, all] = await Promise.all([fetchStamp(), fetchAllCuentas()]);
      if (!mounted.current) return;
      setRows(all);
      writeCache(all, stamp);
    } catch (e: any) {
      if (mounted.current) setErr(e?.message ?? "No se pudo refrescar");
    } finally {
      if (mounted.current) setLoading(false);
    }
  }

  // Filtro + búsqueda local
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
        normSearch(r.comentario).includes(term);

      return hay;
    });
  }, [rows, q, platFilter]);

  /* =========================================================
   * Editar / Guardar
   * ======================================================= */
  function openEdit(row: Cuenta) {
    const seeded: EditState = {
      ...row,
      nombre: row.nombre ?? "",
      correo: row.correo ?? "",
      contrasena: row.contrasena ?? "",
      proveedor: row.proveedor ?? "",
      fecha_compra: row.fecha_compra ?? "",
      fecha_vencimiento: row.fecha_vencimiento ?? "",
      estado: row.estado ?? "",
      comentario: row.comentario ?? "",
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
    seeded.total_ganado = calcularTotalGanado(
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

      // fecha_vencimiento derivada si hay compra+meses
      let finalVence = edit.fecha_vencimiento ?? null;
      if (edit.fecha_compra && edit.meses_pagados && edit.meses_pagados >= 1) {
        finalVence = addMonthsYYYYMMDD(edit.fecha_compra, edit.meses_pagados);
      }

      const total_ganado_calc = calcularTotalGanado(
        edit.total_pagado,
        edit.total_pagado_proveedor
      );

      const payload: Record<string, unknown> = {
        contacto: edit.contacto ?? "",
        nombre: (edit.nombre ?? "") === "" ? null : edit.nombre ?? "",
        proveedor: (edit.proveedor ?? "") === "" ? null : edit.proveedor ?? "",
        fecha_compra: edit.fecha_compra ?? null,
        fecha_vencimiento: finalVence,
        meses_pagados:
          edit.meses_pagados == null ? null : clamp(edit.meses_pagados, 1),
        total_pagado: edit.total_pagado,
        total_pagado_proveedor: edit.total_pagado_proveedor,
        total_ganado: total_ganado_calc,
        estado: (edit.estado ?? "") || null,
        comentario: (edit.comentario ?? null) as string | null,
        correo: (edit.correo ?? null) as string | null,
      };

      // 👉 plataforma_id: solo si cambió y es número válido
      if (
        typeof edit.plataforma_id === "number" &&
        edit.plataforma_id !== row.plataforma_id
      ) {
        payload.plataforma_id = edit.plataforma_id;
      }

      // contraseña: enviar si cambió (permitir limpiar => null)
      if ((edit.contrasena ?? "") !== (row.contrasena ?? "")) {
        const raw = (edit.contrasena ?? "").toString();
        payload.contrasena = raw.trim() === "" ? null : raw;
      }

      const res = await fetch(`/api/cuentascompletas/${edit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? "No se pudo guardar");
      }

      // ⬇️ El endpoint devuelve la FILA PLANA, no {row: ...}
      const saved = await res.json();
      const updated = normalizeRow(saved); // reutiliza tu helper

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
            const res = await fetch(`/api/cuentascompletas/${id}`, {
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
        label: label ?? (correo ? correo : `#${id}`),
      });

      if (!correo || plataforma_id == null) {
        setCanArchive(false);
        return;
      }

      // usar SOLO las filas cargadas (lo que "miras")
      const usesLocal = countLocalByEmailAndPlatform(
        rows,
        correo,
        plataforma_id
      );
      setCanArchive(usesLocal <= 1);
    } catch (e: any) {
      setDeleteErr(e?.message ?? "Error al verificar estado del correo.");
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
          const resolved = await fetch(
            `/api/cuentascompletas/${deleteTarget.id}`,
            { cache: "no-store" }
          ).then((r) => (r.ok ? r.json() : null));
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

      const res = await fetch(`/api/cuentascompletas/${deleteTarget.id}`, {
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

      setDeleteMsg("Cuenta completa eliminada correctamente.");
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
          const res = await fetch(`/api/cuentascompletas/${id}`, {
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

    let can = false;
    if (correo && plataforma_id != null) {
      const usesLocal = countLocalByEmailAndPlatform(
        rows,
        correo,
        plataforma_id
      );
      can = usesLocal <= 1;
    }
    const label = correo ? correo : `#${id}`;
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
        const res = await fetch(`/api/cuentascompletas/${it.id}`, {
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
        Ver/Editar Cuentas Completas
      </h2>

      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center mb-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, contacto, correo, proveedor, estado, comentario"
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
            title="Si es la última relación por correo+plataforma → inventario; si no → eliminar"
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
              <th className="px-3 py-2 text-right w-28">Total</th>
              <th className="px-3 py-2 text-right w-28">Pagado Prov.</th>
              <th className="px-3 py-2 text-right w-28">Ganado</th>
              <th className="px-3 py-2 text-center w-16">Meses</th>
              <th className="px-3 py-2 text-center w-28">Compra</th>
              <th className="px-3 py-2 text-center w-28">Vence</th>
              <th className="px-3 py-2 text-left w-28">Estado</th>
              <th className="px-3 py-2 text-left w-40">Proveedor</th>
              <th className="px-3 py-2 text-left">Comentario</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, idx) => (
              <tr
                key={r.id ?? `row-${idx}`}
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
                      {/* lápiz */}
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
                      onClick={() => openDelete(r.id, r.correo ?? undefined)}
                      className="text-rose-300 hover:text-rose-200 inline-flex p-1 rounded-md hover:bg-rose-900/30"
                      aria-label="Eliminar"
                    >
                      {/* papelera */}
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
                  </div>
                </td>

                <td className="px-3 py-2 whitespace-nowrap">
                  {plataformas.find((p) => p.id === r.plataforma_id)?.nombre ??
                    "—"}
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

                <td className="px-3 py-2 text-right whitespace-nowrap">
                  {money(r.total_pagado)}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  {money(r.total_pagado_proveedor)}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
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
            {!filtered.length && (
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
                  <h3 className="font-semibold">Editar cuenta #{edit.id}</h3>
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
                      className="rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-950 outline-none focus:ring-2 focus:ring-neutral-600 [&>option]:bg-neutral-900 [&>option]:text-neutral-100"
                      value={edit.plataforma_id ?? ""}
                      onChange={(e) =>
                        setEdit((s) => ({
                          ...(s as EditState),
                          plataforma_id: e.target.value
                            ? Number(e.target.value)
                            : null,
                        }))
                      }
                    >
                      <option value="">— Selecciona —</option>
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

                  <label className="grid gap-1">
                    <span className="text-sm text-neutral-300">Correo</span>
                    <input
                      className="rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-950 outline-none focus:ring-2 focus:ring-neutral-600"
                      value={edit.correo ?? ""}
                      onChange={(e) =>
                        setEdit((s) => ({
                          ...(s as EditState),
                          correo: e.target.value,
                        }))
                      }
                    />
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
                    <span className="text-sm text-neutral-300">Proveedor</span>
                    <input
                      className="rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-950 outline-none focus:ring-2 focus:ring-neutral-600"
                      value={edit.proveedor ?? ""}
                      onChange={(e) =>
                        setEdit((s) => ({
                          ...(s as EditState),
                          proveedor: e.target.value,
                        }))
                      }
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
                  Eliminar cuenta completa
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
                    ? "Es la última cuenta con este correo en esta plataforma. Puedes enviarla al inventario antes de eliminar."
                    : "Existen más cuentas con este correo en esta plataforma. Solo puedes eliminar definitivamente."}
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
                        : "Inventario + Eliminar"}
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
                  Eliminar {bulkItems.length} cuenta(s)
                </h4>

                {bulkAssessing ? (
                  <p className="text-sm text-neutral-300">
                    Analizando registros para decidir inventario/eliminación…
                  </p>
                ) : (
                  <>
                    <p id="bulk-desc" className="text-sm text-neutral-300">
                      Para cada registro: si es la última relación por{" "}
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
