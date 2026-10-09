"use client";
import { useInventoryRefresh } from "@/hooks/useInventoryRefresh";
import { notifyInventoryConsumed } from "@/lib/inventoryChanges";
import { deleteEmailsGlobally, readCurrentAccountData, registerAccountCache } from "@/lib/accountDataChanges";
import { useAccountDataRefresh } from "@/hooks/useAccountDataRefresh";

import { recordPasswordChange } from "@/lib/passwordChanges";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePlataformas } from "@/hooks/usePlataformas";
import { useCredentialAutofill } from "@/hooks/useCredentialAutofill";
import CopyDataUpdateButton from "@/components/CopyDataUpdateButton";

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
  total_pagado_completa: number | null;
  total_pagado_proveedor_completa: number | null;
  total_ganado: number | null;
  estado: string | null;
  comentario: string | null;
};
type EditState = Partial<Cuenta> & { id: number; inventorySelection?: { id: number | null; email: string; pid: number | null } };

/* =========================================================
 * Config
 * ======================================================= */
const REFETCH_ON_FOCUS = false;
const STALE_AFTER_MS = 5 * 60_000;
const STAMP_TTL_MS = 5 * 30_000;
const dateEl: HTMLInputElement | null = null;
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
    total_pagado_completa: r.total_pagado_completa == null ? null : Number(r.total_pagado_completa),
    total_pagado_proveedor_completa:
      r.total_pagado_proveedor_completa == null
        ? null
        : Number(r.total_pagado_proveedor_completa),
    total_ganado: r.total_ganado == null ? null : Number(r.total_ganado),
    estado: r.estado ?? null,
    comentario: r.comentario ?? null,
  };
}

let memoryCache: CacheShape | null = null;
registerAccountCache(() => { memoryCache = null; });

function readCache(): CacheShape | null {
  return memoryCache;
}
function writeCache(rows: Cuenta[], remoteStamp?: number) {
  memoryCache = { rows, ts: Date.now() };
  if (!hasWindow()) return;
  try {
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
function fetchAllCuentas(): Promise<Cuenta[]> { return readCurrentAccountData(fetchAllCuentasFromServer); }
async function fetchAllCuentasFromServer(): Promise<Cuenta[]> {
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
  const [quickFilter, setQuickFilter] = useState<
    "all" | "active" | "expiring" | "expired" | "notes"
  >("all");

  const inventoryRevision = useInventoryRefresh();
  // edición
  const [edit, setEdit] = useState<EditState | null>(null);
  const {
    acceptKnownCredential,
    loadingCredential,
    markPasswordManuallyEdited,
  } = useCredentialAutofill({
    recordId: edit?.id,
    plataformaId: edit?.plataforma_id,
    correo: edit?.correo,
    onResolved: (contrasena) =>
      setEdit((current) =>
        current ? { ...current, contrasena } : current,
      ),
  });
  // ↓ correos disponibles EN INVENTARIO por plataforma (misma lógica que FormCuentaCompletas)
  const [availableEmails, setAvailableEmails] = useState<
    { email: string; invId: number | null; invClave: string | null }[]
  >([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
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

  // 👇 lista filtrada según lo escrito (correos disponibles en inventario)
  const visibleAvailableEmails = useMemo(() => {
    const term = (edit?.correo ?? "").trim().toLowerCase();
    return availableEmails.filter((e) => !term || e.email.includes(term));
  }, [availableEmails, edit?.correo]);

  useEffect(() => {
    const pid = edit?.plataforma_id;
    if (!edit || !pid) {
      setAvailableEmails([]);
      return;
    }
    let cancelled = false;
    setLoadingEmails(true);
    (async () => {
      try {
        // ✅ Misma fuente y lógica que FormCuentaCompletas: SOLO /api/inventario
        // (esto ya excluye lo que está ocupado/usado; cuentascompartidas NO aplica aquí)
        const res = await fetch(
          `/api/inventario?plataforma_id=${pid}&limit=2000`,
          { cache: "no-store" }
        );
        const data = res.ok ? await res.json().catch(() => null) : null;
        const rows: any[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
          ? data.items
          : [];

        const map = new Map<
          string,
          { email: string; invId: number | null; invClave: string | null }
        >();
        for (const r of rows) {
          const email = String(r?.correo ?? "").trim().toLowerCase();
          if (!email) continue;
          map.set(email, {
            email,
            invId: r?.id != null ? Number(r.id) : null,
            invClave: r?.clave ?? null,
          });
        }

        const list = Array.from(map.values()).sort((a, b) =>
          a.email.localeCompare(b.email)
        );
        if (!cancelled) setAvailableEmails(list);
      } catch {
        if (!cancelled) setAvailableEmails([]);
      } finally {
        if (!cancelled) setLoadingEmails(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [edit?.plataforma_id, edit?.id, inventoryRevision]);
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
      edit.total_pagado_completa,
      edit.total_pagado_proveedor_completa
    );
    if (edit.total_ganado !== nuevo) {
      setEdit((s) => ({ ...(s as EditState), total_ganado: nuevo }));
    }
  }, [edit?.total_pagado_completa, edit?.total_pagado_proveedor_completa]);
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const warning = new Date(today);
    warning.setDate(warning.getDate() + 7);

    return rows.filter((r) => {
      if (pid !== null && r.plataforma_id !== pid) return false;
      const expires = r.fecha_vencimiento ? new Date(`${r.fecha_vencimiento}T00:00:00`) : null;
      const status = normSearch(r.estado);
      if (quickFilter === "notes" && !r.comentario?.trim()) return false;
      if (quickFilter === "expired" && (!expires || expires >= today)) return false;
      if (quickFilter === "expiring" && (!expires || expires < today || expires > warning)) return false;
      if (quickFilter === "active" && ((expires && expires < today) || status.includes("venc"))) return false;
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
  }, [rows, q, platFilter, quickFilter]);

  const overview = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const warning = new Date(today);
    warning.setDate(warning.getDate() + 7);
    return rows.reduce(
      (acc, row) => {
        const expires = row.fecha_vencimiento ? new Date(`${row.fecha_vencimiento}T00:00:00`) : null;
        if (expires && expires < today) acc.expired += 1;
        else if (expires && expires <= warning) acc.expiring += 1;
        else acc.active += 1;
        if (row.comentario?.trim()) acc.notes += 1;
        return acc;
      },
      { active: 0, expiring: 0, expired: 0, notes: 0 },
    );
  }, [rows]);

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
      seeded.total_pagado_completa,
      seeded.total_pagado_proveedor_completa
    );
    setEdit(seeded);

    // ✅ Autorellenar total_pagado_completa / total_pagado_proveedor_completa
    // con el valor por defecto de la plataforma cuando la cuenta no trae
    // esos datos guardados (mismo comportamiento que en el formulario de
    // registro).
    if (
      row.plataforma_id &&
      (row.total_pagado_completa == null ||
        Number(row.total_pagado_completa) === 0) &&
      (row.total_pagado_proveedor_completa == null ||
        Number(row.total_pagado_proveedor_completa) === 0)
    ) {
      fetch(`/api/plataformas/${row.plataforma_id}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!data) return;
          const tp =
            data?.total_pagado_completa != null &&
            data.total_pagado_completa !== 0
              ? Number(data.total_pagado_completa)
              : null;
          const tpp =
            data?.total_pagado_proveedor_completa != null &&
            data.total_pagado_proveedor_completa !== 0
              ? Number(data.total_pagado_proveedor_completa)
              : null;
          if (tp == null && tpp == null) return;
          setEdit((s) => {
            // el usuario cerró el modal o abrió otra fila mientras cargaba
            if (!s || s.id !== row.id) return s;
            // el usuario ya escribió algo mientras cargaba: no lo pisamos
            if (
              s.total_pagado_completa != null ||
              s.total_pagado_proveedor_completa != null
            )
              return s;
            const next = {
              ...s,
              total_pagado_completa: tp,
              total_pagado_proveedor_completa: tpp,
            };
            next.total_ganado = calcularTotalGanado(tp, tpp);
            return next;
          });
        })
        .catch(() => {});
    }
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
        edit.total_pagado_completa,
        edit.total_pagado_proveedor_completa
      );

      const oldCorreo = normEmail(row.correo);
      const newCorreo = normEmail(edit.correo);
      const oldPid = row.plataforma_id == null ? null : Number(row.plataforma_id);
      const newPid = edit.plataforma_id == null ? oldPid : Number(edit.plataforma_id);
      const credentialScopeChanged =
        oldCorreo !== newCorreo || oldPid !== newPid;
      const selection = edit.inventorySelection;
      const inventoryId = selection && selection.email === newCorreo && selection.pid === newPid
        ? selection.id
        : credentialScopeChanged ? availableEmails.find(item => item.email === newCorreo)?.invId ?? null : null;
      const passwordChanged =
        (edit.contrasena ?? "") !== (row.contrasena ?? "");

      const payload: Record<string, unknown> = {
        inventario_id: inventoryId,
        contacto: edit.contacto ?? "",
        nombre: (edit.nombre ?? "") === "" ? null : edit.nombre ?? "",
        proveedor: (edit.proveedor ?? "") === "" ? null : edit.proveedor ?? "",
        fecha_compra: edit.fecha_compra ?? null,
        fecha_vencimiento: finalVence,
        meses_pagados:
          edit.meses_pagados == null ? null : clamp(edit.meses_pagados, 1),
        total_pagado_completa: edit.total_pagado_completa,
        total_pagado_proveedor_completa: edit.total_pagado_proveedor_completa,
        total_ganado: total_ganado_calc,
        estado: (edit.estado ?? "") || null,
        comentario: (edit.comentario ?? null) as string | null,
        correo: (edit.correo ?? null) as string | null,
      };

      if (credentialScopeChanged || passwordChanged) {
        payload.contrasena = String(edit.contrasena ?? "");
      }

      // 👉 plataforma_id: solo si cambió y es número válido
      if (
        typeof edit.plataforma_id === "number" &&
        edit.plataforma_id !== row.plataforma_id
      ) {
        payload.plataforma_id = edit.plataforma_id;
      }

      const res = await fetch(`/api/cuentascompletas/${edit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        if (j?.error === "inventory_unavailable") notifyInventoryConsumed();
        throw new Error(j?.detail ?? j?.error ?? "No se pudo guardar");
      }

      // ⬇️ El endpoint devuelve la FILA PLANA, no {row: ...}
      const saved = await res.json();
      if (inventoryId != null) notifyInventoryConsumed();
      const updated = normalizeRow(saved); // reutiliza tu helper

      const nextCache = mergeIntoCache(updated);
      setRows(nextCache);
      broadcastInvalidate();
      if ((updated.contrasena ?? "") !== (row.contrasena ?? "") && updated.correo) {
        recordPasswordChange(updated.correo, updated.contrasena ?? "", updated.plataforma_id ?? undefined);
      }
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

  useAccountDataRefresh(forceRefresh);

  const doDelete = async (archive: boolean) => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteErr(null);
    setDeleteAction(archive ? "archive" : "purge");
    try {
      const victim = rows.find((r) => r.id === deleteTarget.id) || null;
      let victimPlataforma = victim?.plataforma_id ?? null;
      let victimCorreo = victim?.correo ?? null;
      let victimClave = victim?.contrasena ?? null;

      if ((!victimCorreo || victimPlataforma == null) && archive) {
        try {
          const resolved = await fetch(
            `/api/cuentascompletas/${deleteTarget.id}?scope=record`,
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

      if (!archive) {
        await deleteEmailsGlobally([victimCorreo], "Eliminación definitiva desde Cuentas completas");
        await forceRefresh();
        setSelectedIds(new Set());
        setDeleteTarget(null);
        setDeleteMsg("Correo eliminado de todas las cuentas, pantallas e inventario.");
        return;
      }

      if (archive && victimCorreo && victimPlataforma != null) {
        await ensureInInventario(
          victimPlataforma as number | null,
          victimCorreo,
          victimClave
        );
      }

      const res = await fetch(`/api/cuentascompletas/${deleteTarget.id}?scope=record`, {
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

  const runBulk = async (preferArchive: boolean) => {
    if (!bulkOpen || bulkItems.length === 0) return;
    setBulkProcessing(true);
    setBulkErr(null);
    setBulkProgress(0);
    const total = bulkItems.length;
    if (!preferArchive) {
      try {
        await deleteEmailsGlobally(bulkItems.map(item => item.correo), "Eliminación masiva desde Cuentas completas");
        await forceRefresh();
        setSelectedIds(new Set());
        setBulkProgress(100);
        setBulkSummary({ total, archived: 0, purged: total, failed: 0 });
      } catch (error) {
        setBulkErr((error as Error).message);
      } finally { setBulkProcessing(false); }
      return;
    }
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
        const res = await fetch(`/api/cuentascompletas/${it.id}?scope=record`, {
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
      <div className="mb-5 flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">Centro de operaciones</span>
        <h2 className="text-2xl font-semibold text-neutral-100">Gestión de cuentas completas</h2>
        <p className="text-sm text-neutral-400">Busca, prioriza y actualiza cuentas sin perder el contexto de la operación.</p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {([
          ["active", "Activas", overview.active, "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"],
          ["expiring", "Vencen en 7 días", overview.expiring, "border-amber-500/30 bg-amber-500/10 text-amber-100"],
          ["expired", "Vencidas", overview.expired, "border-rose-500/30 bg-rose-500/10 text-rose-100"],
          ["notes", "Con anotaciones", overview.notes, "border-sky-500/30 bg-sky-500/10 text-sky-100"],
        ] as const).map(([key, label, value, tone]) => (
          <button
            key={key}
            type="button"
            onClick={() => setQuickFilter((current) => current === key ? "all" : key)}
            aria-pressed={quickFilter === key}
            className={`rounded-xl border p-3 text-left transition hover:-translate-y-0.5 ${tone} ${quickFilter === key ? "ring-2 ring-white/30" : ""}`}
          >
            <span className="block text-2xl font-semibold tabular-nums">{value}</span>
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="z-20 mb-3 flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-950/95 p-3 shadow-xl backdrop-blur sm:flex-row sm:items-center lg:sticky lg:top-0">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar contacto, correo, plataforma o anotación…"
          aria-label="Buscar cuentas"
          className="flex-1 rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
        />
        <select
          value={platFilter === "all" ? "" : String(platFilter)}
          onChange={(e) =>
            setPlatFilter(e.target.value ? Number(e.target.value) : "all")
          }
          className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-neutral-100 outline-none focus:ring-2 focus:ring-sky-500 sm:w-64 [&>option]:bg-neutral-900 [&>option]:text-neutral-100"
        >
          <option value="">Todas las plataformas</option>
          {plataformas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>

        {(q || platFilter !== "all" || quickFilter !== "all") && (
          <button
            type="button"
            onClick={() => { setQ(""); setPlatFilter("all"); setQuickFilter("all"); }}
            className="px-3 py-2 text-sm text-neutral-300 hover:text-white"
          >
            Limpiar filtros
          </button>
        )}

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
        <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap">
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
            onClick={() => setSelectedIds(new Set())}
            disabled={selectedCount === 0}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-neutral-100 hover:bg-neutral-800 disabled:opacity-50"
          >
            Limpiar selección
          </button>
        </div>
      </div>

      {/* Vista móvil optimizada: reemplaza la tabla ancha por tarjetas. */}
      <div className="grid gap-3 md:hidden">
        {filtered.map((r) => {
          const isExpired = Boolean(r.fecha_vencimiento && r.fecha_vencimiento <= todayYMDLocal());
          const platform = plataformas.find((p) => Number(p.id) === Number(r.plataforma_id))?.nombre ?? "Sin plataforma";
          return <article key={`mobile-${r.id}`} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-lg bg-violet-500/10 px-2 py-1 text-xs font-semibold text-violet-200">{platform}</span><span className={`rounded-lg px-2 py-1 text-xs font-semibold ${isExpired ? "bg-rose-500/10 text-rose-200" : "bg-emerald-500/10 text-emerald-200"}`}>{isExpired ? "Vencida" : "Activa"}</span></div><h3 className="mt-3 truncate font-semibold text-white">{r.nombre || r.contacto || "Cliente sin nombre"}</h3><p className="mt-1 truncate text-sm text-neutral-400">{r.correo || "Sin correo"}</p></div><input type="checkbox" className="size-5 shrink-0 accent-sky-500" aria-label={`Seleccionar cuenta ${r.id}`} checked={isRowSelected(r.id)} onChange={(event) => toggleRow(r.id, event.target.checked)} /></div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-neutral-500">Contacto</dt><dd className="mt-0.5 truncate font-medium text-neutral-200">{r.contacto || "—"}</dd></div><div><dt className="text-xs text-neutral-500">Vencimiento</dt><dd className="mt-0.5 font-medium text-neutral-200">{r.fecha_vencimiento || "—"}</dd></div><div><dt className="text-xs text-neutral-500">Total</dt><dd className="mt-0.5 font-medium text-neutral-200">{money(r.total_pagado_completa)}</dd></div><div><dt className="text-xs text-neutral-500">Proveedor</dt><dd className="mt-0.5 truncate font-medium text-neutral-200">{r.proveedor || "—"}</dd></div></dl>
            {r.comentario && <p className="mt-4 line-clamp-2 rounded-xl bg-white/[0.035] p-3 text-xs leading-5 text-neutral-400">{r.comentario}</p>}
            <div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => openEdit(r)} className="min-h-11 rounded-xl bg-sky-500 px-3 py-2 text-sm font-semibold text-white transition active:scale-[0.98]">Editar</button><button type="button" onClick={() => openDelete(r.id, r.correo ?? undefined)} className="min-h-11 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-100 transition active:scale-[0.98]">Eliminar</button></div>
          </article>;
        })}
        {!filtered.length && <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-neutral-400">{loading ? "Cargando…" : "No se encontraron resultados."}</div>}
      </div>

      {/* Tabla */}
      <div className="hidden overflow-auto rounded-xl border border-neutral-800 md:block">
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
                    <button
                      type="button"
                      title={r.comentario ? "Ver o editar anotación" : "Agregar anotación"}
                      onClick={() => openEdit(r)}
                      className={`inline-flex rounded-md p-1 hover:bg-sky-900/30 ${r.comentario ? "text-sky-300" : "text-neutral-500 hover:text-sky-200"}`}
                      aria-label={r.comentario ? "Ver o editar anotación" : "Agregar anotación"}
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
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
                  {money(r.total_pagado_completa)}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  {money(r.total_pagado_proveedor_completa)}
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
                      onChange={(e) => {
                        const newPid = e.target.value
                          ? Number(e.target.value)
                          : null;
                        setEdit((s) => ({
                          ...(s as EditState),
                          plataforma_id: newPid,
                          contrasena: "",
                        }));

                        // ✅ Autorellenar total_pagado_completa /
                        // total_pagado_proveedor_completa con el valor por
                        // defecto de la nueva plataforma, solo si esos
                        // campos siguen vacíos (no pisamos lo que el
                        // usuario ya haya escrito).
                        if (newPid) {
                          fetch(`/api/plataformas/${newPid}`, {
                            cache: "no-store",
                          })
                            .then((r) => (r.ok ? r.json() : null))
                            .then((data) => {
                              if (!data) return;
                              const tp =
                                data?.total_pagado_completa != null &&
                                data.total_pagado_completa !== 0
                                  ? Number(data.total_pagado_completa)
                                  : null;
                              const tpp =
                                data?.total_pagado_proveedor_completa !=
                                  null &&
                                data.total_pagado_proveedor_completa !== 0
                                  ? Number(
                                      data.total_pagado_proveedor_completa,
                                    )
                                  : null;
                              if (tp == null && tpp == null) return;
                              setEdit((s) => {
                                if (!s || s.plataforma_id !== newPid) return s;
                                if (
                                  s.total_pagado_completa != null ||
                                  s.total_pagado_proveedor_completa != null
                                )
                                  return s;
                                const next = {
                                  ...s,
                                  total_pagado_completa: tp,
                                  total_pagado_proveedor_completa: tpp,
                                };
                                next.total_ganado = calcularTotalGanado(
                                  tp,
                                  tpp,
                                );
                                return next;
                              });
                            })
                            .catch(() => {});
                        }
                      }}
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
                          inventorySelection: undefined,
                          correo: e.target.value,
                          contrasena: "",
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
                                Sin correos disponibles
                              </li>
                            )}
                            {visibleAvailableEmails.map((opt) => (
                              <li key={opt.email}>
                                <button
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => {
                                    acceptKnownCredential(
                                      edit.plataforma_id,
                                      opt.email,
                                      opt.invClave,
                                    );
                                    setEdit((s) => ({
                                      ...(s as EditState),
                                      inventorySelection: { id: opt.invId, email: opt.email, pid: edit.plataforma_id ?? null },
                                      correo: opt.email,
                                      contrasena: opt.invClave ?? "",
                                    }));
                                    setEmailDropdownOpen(false);
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-neutral-800 truncate"
                                  title="Disponible en inventario"
                                >
                                  {opt.email}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </label>
                  <label className="grid gap-1">
                    <span className="flex items-center gap-2 text-sm text-neutral-300">
                      Contraseña
                      {loadingCredential && (
                        <span className="text-xs text-sky-400">
                          buscando clave…
                        </span>
                      )}
                    </span>
                    <input
                      className="rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-950 outline-none focus:ring-2 focus:ring-neutral-600"
                      value={edit.contrasena ?? ""}
                      onChange={(e) => {
                        markPasswordManuallyEdited();
                        setEdit((s) => ({
                          ...(s as EditState),
                          contrasena: e.target.value,
                        }));
                      }}
                    />
                    <span className="text-xs text-neutral-500">
                      Se carga desde el correo seleccionado, pero puedes modificarla.
                    </span>
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
                      value={edit.total_pagado_completa ?? ""}
                      onChange={(e) =>
                        setEdit((s) => ({
                          ...(s as EditState),
                          total_pagado_completa:
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
                      value={edit.total_pagado_proveedor_completa ?? ""}
                      onChange={(e) =>
                        setEdit((s) => ({
                          ...(s as EditState),
                          total_pagado_proveedor_completa:
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

                <div className="px-5 py-3 border-t border-neutral-800 flex flex-wrap items-center justify-end gap-2 sticky bottom-0 bg-neutral-900 rounded-b-2xl">
                  <CopyDataUpdateButton
                    tipo="cuenta"
                    correo={edit.correo}
                    contrasena={edit.contrasena}
                    fechaVencimiento={edit.fecha_vencimiento}
                    servicio={
                      plataformas.find(
                        (p) => Number(p.id) === Number(edit.plataforma_id),
                      )?.nombre ?? "Sin plataforma"
                    }
                    className="mr-auto"
                  />
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
                    disabled={saving || loadingCredential}
                  >
                    {saving
                      ? "Guardando…"
                      : loadingCredential
                        ? "Cargando clave…"
                        : "Guardar cambios"}
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
                    : "Existen más cuentas con este correo. La eliminación definitiva también las eliminará."}
                </p>

                <p className="mt-3 text-sm text-rose-200">Eliminar definitivamente borra todos los registros del correo en todas las plataformas, incluidas cuentas, pantallas e inventario. La operación queda auditada.</p>
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
                      retirará solo el registro seleccionado.
                    </p>

                    <p className="mt-3 text-sm text-rose-200">Eliminar definitivamente borra todos los registros de los correos seleccionados, en todas las plataformas, incluidas otras cuentas, pantallas e inventario. Es una sola transacción.</p>
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
                          Registros eliminados: {bulkSummary.purged}
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
                        title="Elimina globalmente todos los registros de los correos seleccionados, incluidas otras plataformas e inventario"
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
