"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePlataformas } from "@/hooks/usePlataformas";
import { normalizeContacto } from "@/lib/strings";
import { todayStr } from "@/lib/dates";
import { FieldPantallas } from "@/components/ui/FieldPantallas";
import TextArea from "@/components/ui/TextArea";
import type { Usuario, Cuenta, FormState } from "@/types/pantallas";
import { buildDisponibilidadCorreos } from "@/lib/cuentasDisponibles";
import { buildNumerosPantallaDisponibles } from "@/lib/cantidadPantallasDisponibles";
import { upsertCuentaCompartida } from "@/lib/cuentasCompartidasUpsert";

// Reutiliza tu bus de mutaciones / cache
import {
  mergePantallaIntoCache,
  notifyPantallasChanged,
  LS_STAMP_P,
  BC_NAME,
} from "@/lib/pantallasMutationBus";

/* ===================== Ticket cliente ===================== */
const fmtDateHuman = (isoOrYYYYMMDD?: string | null) => {
  if (!isoOrYYYYMMDD) return "—";
  const d = /^\d{4}-\d{2}-\d{2}$/.test(isoOrYYYYMMDD)
    ? parseLocalDateStr(isoOrYYYYMMDD)
    : new Date(isoOrYYYYMMDD);
  if (!d || Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
};
const fmtMoneyClient = (n: number | null | undefined) =>
  n == null || Number.isNaN(Number(n))
    ? "—"
    : new Intl.NumberFormat("es-CO").format(Number(n));

// Límite superior para "total_pagado" / "total_pagado_proveedor". Evita el
// error de Prisma "Value out of range for the type" cuando alguien escribe
// un número con dígitos de más por error. Ajustado a DECIMAL(10,2): hasta
// 8 dígitos enteros + 2 decimales. Si la columna en la BD cambia de tipo,
// este valor debe actualizarse junto con ella.
const MAX_MONTO_COP = 99_999_999.99;

function buildPedidoResumenText(
  payloads: any[],
  plataformaMap: Map<number, string>,
  orders: any[],
) {
  const lineas: string[] = [];

  lineas.push("✅ RESUMEN DE TU PEDIDO");
  lineas.push("");

  payloads.forEach((p, i) => {
    const platName =
      plataformaMap.get(p?.plataforma_id) ?? `#${p?.plataforma_id ?? "—"}`;

    const order = orders?.[i] ?? null;

    lineas.push(`• COMPRA #${i + 1}`);
    lineas.push(`Plataforma: ${platName}`);
    lineas.push(`Pantalla: ${p?.nro_pantalla ?? "—"}`);
    lineas.push(`Correo: ${p?.correo ?? "—"}`);
    lineas.push(`Clave: ${p?.contrasena ?? "—"}`);
    lineas.push(`Fecha de compra: ${fmtDateHuman(order?.fecha_compra)}`);
    lineas.push(
      `Fecha de vencimiento: ${fmtDateHuman(order?.fecha_vencimiento)}`,
    );
    lineas.push(`Meses pagados: ${order?.meses_pagados ?? "—"}`);
    lineas.push(`Total: ${fmtMoneyClient(p?.total_pagado)}`);
    lineas.push(""); // separador entre compras
  });

  // Totales del pedido (sumados)
  const totalPagado = payloads.reduce(
    (acc, p) => acc + (Number(p?.total_pagado) || 0),
    0,
  );
  lineas.push("💰 TOTAL DEL PEDIDO");
  lineas.push(`Total: ${fmtMoneyClient(totalPagado)}`);

  return lineas.join("\n");
}

function buildPedidoResumenFull(
  payloads: any[],
  plataformaMap: Map<number, string>,
  orders: any[],
) {
  return (
    buildPedidoResumenText(payloads, plataformaMap, orders) +
    `\n\n` +
    `✨ ¡Para que no se te escape nada! ✨\n` +
    `Te recomendamos guardar nuestros números en tus contactos, por si las moscas, así siempre podrás comunicarte con nosotros y verificar el estado de promociones, soporte, beneficios y novedades cuando lo necesites.\n\n` +
    `📲 +57 304 676 0115\n` +
    `📲 +57 322 532 4142\n\n` +
    `📌 Mejor tenerlos guardados… ¡por si acaso! 😄\n\n` +
    `Gracias por tu compra! 🥳\n` +
    `Si tienes dudas o necesitas soporte, estamos para ayudarte.`
  );
}

/* ===================== Fecha ===================== */
const pad2 = (n: number) => String(n).padStart(2, "0");
const toLocalDateStr = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const parseLocalDateStr = (s: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
};
function addMonthsLocal(dateStr: string, months: number): string {
  const base = parseLocalDateStr(dateStr);
  if (!base || !Number.isFinite(months)) return "";
  const origDay = base.getDate();
  const tmp = new Date(base.getFullYear(), base.getMonth(), 1);
  tmp.setMonth(tmp.getMonth() + months);
  const lastDay = new Date(tmp.getFullYear(), tmp.getMonth() + 1, 0).getDate();
  const day = Math.min(origDay, lastDay);
  return toLocalDateStr(new Date(tmp.getFullYear(), tmp.getMonth(), day));
}

/* ===================== Num/moneda ===================== */
const toNumOrNull = (v: unknown): number | null => {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
};

/* ===================== Constantes / LS ===================== */
const LAST_PLATFORM_KEY = "pantallas:lastPlatformId";

// TTLs
const USERS_ALL_CACHE_TTL = 30 * 60_000; // 30 min catálogo completo de usuarios
const LIST_CACHE_TTL = 5 * 60_000; // 5 min para cuentas/inventario
const STAMP_POLL_MS = 30_000;

// Stamps & LS keys
const STAMP_KEY_ALL = "__stamp_all_combined";
const LS_USERS_ALL = "__usuarios_all_cache_v1"; // { map, ts, stamp }
const LS_ACCT_PREFIX = "__cuentas_cache_v2:"; // por plataforma: { map, ts, stamp }
const LS_INV_PREFIX = "__inventario_cache_v2:"; // por plataforma: { map, ts, stamp }
const LS_PANT_SUM_PREFIX = "__pantallas_sum_v1:"; // por plataforma

/* ===================== Tipos ===================== */
type FormStateEx = FormState & {
  total_pagado_proveedor?: string;
  total_ganado?: string;
};

type UserState = { contacto: string; nombre: string | "" };

type OrderState = Omit<FormStateEx, "contacto" | "nombre" | "meses_pagados"> & {
  meses_pagados: number;
  selectedEmailSource?: "inv" | "acct" | null;
  selectedInvId?: number | null;
};

type InventarioItem = {
  id: number;
  plataforma_id?: number | null;
  correo: string;
  clave?: string | null;
};

type AcctEntry = { id: number; pass: string | null };
type AcctCacheShape = {
  map: Record<string, AcctEntry>;
  ts: number;
  stamp: number;
};

type InvEntry = { id?: number; pass: string | null };
type InvCacheShape = {
  map: Record<string, InvEntry>;
  ts: number;
  stamp: number;
};

type PantSumCacheShape = {
  ts: number;
  stamp: number;
  byEmail: Record<string, number>;
  byCuenta: Record<number, number>;
};

type PerPidEmailCache = {
  // dropdown

  options: Array<{
    email: string;
    source: "acct" | "inv";
    cuentaId: number | null;
  }>;
  // maps
  acctIdMap: Record<string, number>;
  acctPassMap: Record<string, string | null>;
  invPassMap: Record<string, string | null>;
  invIdMap: Record<string, number>;
  // cupos por email+fuente
  freeByEmail: Record<string, number | null>; // key: `${pid}::${source}::${email}`
  // badge registros por email
  emailCounts: Record<string, number>;
  // flags
  loading: boolean;
  error: string | null;
};

type UsersAllCache = {
  map: Record<string, Usuario>; // key: normalizeContacto(u.contacto)
  ts: number;
  stamp: number;
};

/* ===================== Helpers ===================== */
const hasWindow = () => typeof window !== "undefined";
const normalizeEmail = (s: string) => s.trim().toLowerCase();

function readLS<T = any>(key: string): T | null {
  if (!hasWindow()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function writeLS(key: string, val: any) {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}
function getCurrentStamp(): number {
  if (!hasWindow()) return 0;
  const s = window.localStorage.getItem(STAMP_KEY_ALL);
  return s ? Number(s) || 0 : 0;
}
async function refreshStampOnce(): Promise<number> {
  try {
    const r = await fetch("/api/pantallas/stamp", { cache: "no-store" });
    const j = await r.json().catch(() => ({ stamp: 0 }));
    const n = Number(j?.stamp) || 0;
    try {
      window.localStorage.setItem(STAMP_KEY_ALL, String(n));
    } catch {}
    return n;
  } catch {
    return getCurrentStamp();
  }
}

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

/**
 * Trae TODAS las pantallas de una plataforma directo de la API (sin
 * adivinar query-params como correo/q que el backend puede no soportar).
 * Misma estrategia que usa PantallasViewer: traer el dataset completo y
 * filtrar en memoria, así el resultado nunca depende de un filtro server
 * que silenciosamente no funcione.
 */
async function fetchPantallasPorPlataforma(
  plataformaId: number,
): Promise<any[]> {
  if (!plataformaId) return [];
  const rows = await fetchListSafe([
    `/api/pantallas?plataforma_id=${plataformaId}&limit=50000`,
    `/api/pantallas?plataforma_id=${plataformaId}&limit=20000`,
    `/api/pantallas?plataforma_id=${plataformaId}&limit=10000`,
  ]);
  return Array.isArray(rows) ? rows : [];
}

/** Filtra en memoria las pantallas de un correo y/o cuenta dentro de una plataforma. */
function filtrarPantallasPorEmailOCuenta(
  allRows: any[],
  email: string,
  cuentaId?: number | null,
): Array<{ nro_pantalla: any } & any> {
  const key = normalizeEmail(email);
  return allRows.filter((r) => {
    if (cuentaId) {
      const cid = Number(r?.cuenta_id);
      if (Number.isFinite(cid) && cid === Number(cuentaId)) return true;
    }
    return normalizeEmail(r?.correo ?? "") === key;
  });
}

/* ===== LS: Users All ===== */
function readUsersAll(): UsersAllCache | null {
  return readLS<UsersAllCache>(LS_USERS_ALL);
}
function writeUsersAll(map: Record<string, Usuario>) {
  writeLS(LS_USERS_ALL, {
    map,
    ts: Date.now(),
    stamp: getCurrentStamp(),
  } as UsersAllCache);
}
function usersAllFresh(c: UsersAllCache | null): boolean {
  if (!c) return false;
  const sameStamp = c.stamp === getCurrentStamp();
  const fresh = Date.now() - c.ts <= USERS_ALL_CACHE_TTL;
  return sameStamp && fresh;
}
function getUserFromAllCache(norm: string): Usuario | null | undefined {
  const c = readUsersAll();
  if (!usersAllFresh(c)) return undefined;
  const u = c!.map[norm];
  return u ?? null;
}
async function ensureUsersAllLoaded() {
  const c = readUsersAll();
  if (usersAllFresh(c)) return;
  await forceReloadUsersAll();
}
async function forceReloadUsersAll() {
  const arr: Usuario[] = (await fetchListSafe([
    "/api/usuarios?limit=100000",
    "/api/usuarios?limit=50000",
    "/api/usuarios",
  ])) as Usuario[];

  const map: Record<string, Usuario> = {};
  for (const u of arr) {
    const k = normalizeContacto(String(u.contacto ?? ""));
    if (!k) continue;
    map[k] = u;
  }
  writeUsersAll(map);
}

/* ===== LS: cuentas compartidas cache ===== */
function acctKey(pid: number) {
  return `${LS_ACCT_PREFIX}${pid}`;
}
function readAcctCache(pid: number): AcctCacheShape | null {
  return readLS<AcctCacheShape>(acctKey(pid));
}
function writeAcctCache(pid: number, map: Record<string, AcctEntry>) {
  writeLS(acctKey(pid), {
    map,
    ts: Date.now(),
    stamp: getCurrentStamp(),
  } as AcctCacheShape);
}
function getAcctMap(pid: number): Record<string, AcctEntry> | null {
  const c = readAcctCache(pid);
  if (!c) return null;
  const sameStamp = c.stamp === getCurrentStamp();
  const fresh = Date.now() - c.ts <= LIST_CACHE_TTL;
  return sameStamp && fresh ? c.map : null;
}

/* ===== LS: inventario cache ===== */
function invKey(pid: number) {
  return `${LS_INV_PREFIX}${pid}`;
}
function readInvCache(pid: number): InvCacheShape | null {
  return readLS<InvCacheShape>(invKey(pid));
}
function writeInvCache(pid: number, map: Record<string, InvEntry>) {
  writeLS(invKey(pid), {
    map,
    ts: Date.now(),
    stamp: getCurrentStamp(),
  } as InvCacheShape);
}
function getInvMap(pid: number): Record<string, InvEntry> | null {
  const c = readInvCache(pid);
  if (!c) return null;
  const sameStamp = c.stamp === getCurrentStamp();
  const fresh = Date.now() - c.ts <= LIST_CACHE_TTL;
  return sameStamp && fresh ? c.map : null;
}

/* ===== Nota =====
 * El cálculo de "pantallas usadas por correo/cuenta" ya NO se hace con un
 * resumen cacheado en localStorage (podía quedar desincronizado y hacía que
 * los correos disponibles o los cupos salieran mal). Ahora se calcula en
 * memoria a partir del dataset fresco de /api/pantallas por plataforma,
 * igual que en PantallasViewer (ver getPantallasPorPlataformaCached). */

/* ===================== UI helpers ===================== */
async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {}
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    Object.assign(ta.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "1px",
      height: "1px",
      padding: "0",
      border: "none",
      outline: "none",
      boxShadow: "none",
      background: "transparent",
    });
    ta.setAttribute("readonly", "");
    ta.setAttribute("aria-hidden", "true");
    document.body.appendChild(ta);
    ta.focus();
    ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function downloadJson(filename: string, obj: any) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ===================== Componente ===================== */
export default function FormPantallas() {
  const compraHoy = todayStr();

  const {
    plataformas,
    loading: platLoading,
    error: platError,
  } = usePlataformas();

  /* ====== Map id->nombre ====== */
  const plataformaMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const p of plataformas) m.set(p.id, (p as any).nombre ?? String(p.id));
    return m;
  }, [plataformas]);

  const lastPlatformId = useMemo<number | null>(() => {
    const raw =
      typeof window !== "undefined"
        ? window.localStorage.getItem(LAST_PLATFORM_KEY)
        : null;
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  }, []);

  const plataformasOrdered = useMemo(() => {
    if (!plataformas?.length) return [];
    if (!lastPlatformId) return plataformas;
    const fav = plataformas.find((p) => p.id === lastPlatformId);
    if (!fav) return plataformas;
    const rest = plataformas.filter((p) => p.id !== lastPlatformId);
    return [fav, ...rest];
  }, [plataformas, lastPlatformId]);

  const makeEmptyOrder = (pid: number): OrderState => ({
    plataforma_id: pid || 0,
    cuenta_id: null,
    nro_pantalla: "",
    correo: "",
    contrasena: "",
    proveedor: "",
    fecha_compra: compraHoy,
    fecha_vencimiento: addMonthsLocal(compraHoy, 1),
    meses_pagados: 1,
    total_pagado: "",
    total_pagado_proveedor: "",
    total_ganado: "",
    estado: "ACTIVA",
    comentario: "",
    selectedEmailSource: null,
    selectedInvId: null,
  });

  /* ✅ usuario separado */
  const [user, setUser] = useState<UserState>({ contacto: "", nombre: "" });

  /* ✅ múltiples compras */
  const [orders, setOrders] = useState<OrderState[]>(() => [makeEmptyOrder(0)]);

  const setOrder = (idx: number, patch: Partial<OrderState>) => {
    setOrders((prev) =>
      prev.map((o, i) => (i === idx ? { ...o, ...patch } : o)),
    );
  };

  /* ===== Autoselección inicial de plataforma en el primer bloque ===== */
  useEffect(() => {
    if (platLoading || platError || !plataformasOrdered.length) return;
    setOrders((prev) => {
      if (!prev.length) return [makeEmptyOrder(plataformasOrdered[0]!.id)];
      const first = prev[0]!;
      if (first.plataforma_id !== 0) return prev;
      const newPid = plataformasOrdered[0]!.id;
      // Precargamos totales de la plataforma inicial
      fetch(`/api/plataformas/${newPid}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!data) return;
          const tp =
            data?.total_pagado != null && data.total_pagado !== 0
              ? String(data.total_pagado)
              : "";
          const tpp =
            data?.total_pagado_proveedor != null &&
            data.total_pagado_proveedor !== 0
              ? String(data.total_pagado_proveedor)
              : "";
          setOrders((cur) =>
            cur.map((o, i) =>
              i === 0 &&
              o.total_pagado === "" &&
              o.total_pagado_proveedor === ""
                ? { ...o, total_pagado: tp, total_pagado_proveedor: tpp }
                : o,
            ),
          );
          setPlataformaTotales((s) => ({
            ...s,
            [newPid]: {
              total_pagado:
                data?.total_pagado != null ? Number(data.total_pagado) : null,
              total_pagado_proveedor:
                data?.total_pagado_proveedor != null
                  ? Number(data.total_pagado_proveedor)
                  : null,
              loading: false,
            },
          }));
        })
        .catch(() => {});
      return [{ ...first, plataforma_id: newPid }, ...prev.slice(1)];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plataformasOrdered, platLoading, platError]);

  /* ===== Prefetch usuarios + stamp polling ===== */
  useEffect(() => {
    ensureUsersAllLoaded();
  }, []);

  useEffect(() => {
    let alive = true;

    // Único punto que reacciona a un cambio remoto/local: refresca el stamp
    // del servidor y, si cambió de verdad, invalida el cache en memoria y
    // dispara un "tick" para que los efectos de slots/correos recalculen.
    const handleInvalidate = async () => {
      if (!alive) return;
      const before = getCurrentStamp();
      const after = await refreshStampOnce();
      if (!alive || after === before) return;
      invalidatePantallasPidCache();
      setRefreshTick((t) => t + 1);
    };

    handleInvalidate();

    const onStorage = (e: StorageEvent) => {
      if (!alive) return;
      if (e.key === LS_STAMP_P || e.key === STAMP_KEY_ALL) handleInvalidate();
    };
    window.addEventListener("storage", onStorage);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(BC_NAME);
      bc.onmessage = (ev) => {
        if (ev?.data?.type === "invalidate-pantallas") handleInvalidate();
      };
    } catch {}

    const onFocus = () => handleInvalidate();
    window.addEventListener("focus", onFocus);
    const id = window.setInterval(handleInvalidate, STAMP_POLL_MS);

    return () => {
      alive = false;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
      clearInterval(id);
      try {
        bc?.close();
      } catch {}
    };
  }, []);

  /* ===== Nombre autocompletar (user) ===== */
  const [nombreDirty, setNombreDirty] = useState(false);
  const lastContactoRef = useRef<string>("");
  const [refreshTick, setRefreshTick] = useState(0);
  useEffect(() => {
    const raw = user.contacto.trim();
    const norm = normalizeContacto(raw);

    if ((norm || "") !== lastContactoRef.current) {
      lastContactoRef.current = norm || "";
      setNombreDirty(false);
      setUser((s) => ({ ...s, nombre: "" }));
    }
    if (!norm || norm.length < 5) return;

    let canceled = false;

    const run = async () => {
      if (getUserFromAllCache(norm) === undefined) await ensureUsersAllLoaded();
      const u = getUserFromAllCache(norm);
      if (!canceled && !nombreDirty && u && (u.nombre ?? "") !== "") {
        setUser((s) => ({ ...s, nombre: u.nombre ?? "" }));
        return;
      }

      // fallback: pantallas
      try {
        const rowsP = await fetchListSafe([
          `/api/pantallas?q=${encodeURIComponent(norm)}&limit=2000`,
          `/api/pantallas?limit=5000`,
        ]);
        const sameP = rowsP.filter(
          (r: any) => normalizeContacto(String(r?.contacto ?? "")) === norm,
        );
        const names = sameP
          .map((r: any) => String(r?.nombre ?? "").trim())
          .filter((n: string) => n.length > 0);

        let bestName = "";
        if (names.length) {
          const freq = new Map<string, number>();
          for (const n of names) freq.set(n, (freq.get(n) || 0) + 1);
          bestName = [...freq.entries()].sort((a, b) => b[1] - a[1])[0]![0];
        } else {
          const withName = sameP
            .filter((r: any) => String(r?.nombre ?? "").trim().length > 0)
            .sort((a: any, b: any) => Number(b?.id ?? 0) - Number(a?.id ?? 0));
          if (withName.length) bestName = String(withName[0].nombre).trim();
        }

        if (!canceled && !nombreDirty && bestName) {
          setUser((s) => ({ ...s, nombre: bestName }));
          const cur = readUsersAll();
          const map = cur?.map ?? {};
          map[norm] = { contacto: norm, nombre: bestName } as any;
          writeUsersAll(map);
        }
      } catch {
        /* best-effort */
      }
    };

    const id = window.setTimeout(run, 150);
    return () => {
      canceled = true;
      clearTimeout(id);
    };
  }, [user.contacto, nombreDirty]);

  /* ===== Ensure usuario =====
   * Mismo patrón de bug que teníamos en cuentascompartidas: la caché local
   * puede decir "no existe" aunque el contacto YA esté en la base de datos
   * (creado por otra sesión/dispositivo que esta pestaña nunca vio, o
   * simplemente porque pasaron los 30 min del TTL). Eso generaba el
   * "Unique constraint failed on the constraint: `PRIMARY`" en `usuarios`.
   *
   * A diferencia de cuentascompartidas, aquí NO conviene forzar una
   * recarga completa del catálogo (puede ser una lista grande) cada vez
   * que se registra un contacto nuevo, porque eso SÍ es un caso muy común
   * (cliente nuevo) y volveríamos a introducir lentitud. Además, crear
   * el `usuario` no es indispensable para guardar la `pantalla` (son
   * independientes -> por eso antes el guardado seguía funcionando pese
   * al error).
   *
   * Entonces: si el POST falla (choque de PK), no lo reintentamos ni
   * dejamos el error suelto -> guardamos un valor optimista en caché
   * (para no repetir el mismo POST fallido con este contacto en lo que
   * dure la sesión) y refrescamos el catálogo completo en SEGUNDO PLANO
   * (sin bloquear el guardado actual), para que la próxima vez ya
   * tengamos el dato real.
   */
  async function ensureUsuario(contactoRaw: string, nombre: string | null) {
    const raw = contactoRaw.trim();
    const norm = normalizeContacto(raw);
    if (!norm) return;

    try {
      await ensureUsersAllLoaded();
      const current = readUsersAll();
      const exists = !!current?.map?.[norm];
      if (exists) return;

      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacto: raw, nombre: nombre || null }),
      });
      if (res.ok) {
        const created: Usuario = await res.json();
        const next = readUsersAll();
        const map = next?.map ?? {};
        map[norm] = created;
        writeUsersAll(map);
        await refreshStampOnce();
        return;
      }

      // No reventamos ni reintentamos: probablemente ya existía.
      const next = readUsersAll();
      const map = next?.map ?? {};
      map[norm] = { contacto: raw, nombre: nombre || null } as Usuario;
      writeUsersAll(map);

      // Autocorrección en segundo plano, no bloquea este guardado.
      forceReloadUsersAll().catch(() => {});
    } catch {}
  }

  /* ===== Ensure cuenta compartida =====
   * Antes, esta función SOLO miraba la caché local (`getAcctMap`) para
   * decidir si el correo ya existía; si la caché estaba vacía, vieja, o
   * simplemente no cargada en ese navegador (otra pestaña, otra persona
   * abriendo el formulario), creaba una fila nueva en `cuentascompartidas`
   * aunque el correo ya existiera -> eso fue lo que generó los duplicados
   * que limpiamos (Crunchyroll, Netflix, Paramount).
   *
   * Fix con 2 caminos, para no perder el rendimiento del caso común:
   *
   * 1) CAMINO RÁPIDO (sin request extra): si el correo ya aparece en
   *    `perPid[pid].acctIdMap`, que es el dataset que se cargó momentos
   *    antes con `cache:no-store` al abrir/usar esta plataforma (NO es la
   *    caché vieja de localStorage), lo reutilizamos directo. Este es el
   *    caso normal: el usuario elige un correo ya existente del dropdown.
   *
   * 2) CAMINO SEGURO (1 request extra, solo cuando hace falta): si el
   *    correo NO está en ese dataset -> es un correo genuinamente nuevo
   *    (o el dataset no alcanzó a cargar). Ahí sí delegamos en
   *    `upsertCuentaCompartida` (compartido con PantallasViewer), que
   *    confirma con el servidor antes de crear. Este es justo el caso que
   *    antes generaba duplicados, así que aquí no se puede recortar el
   *    chequeo.
   */
  async function ensureCuentaCompartida(
    correo: string,
    plataformaId: number,
    pass: string | null,
    proveedor: string | null,
  ) {
    const key = normalizeEmail(correo);
    const pid = plataformaId;

    const knownId = perPid[pid]?.acctIdMap?.[key];
    if (knownId) {
      const base = getAcctMap(pid) || {};
      base[key] = { id: knownId, pass: pass || null };
      writeAcctCache(pid, base);
      return { id: knownId };
    }

    const { id } = await upsertCuentaCompartida(pid, correo, {
      contrasena: pass,
      proveedor,
    });

    const base = getAcctMap(pid) || {};
    base[key] = { id, pass: pass || null };
    writeAcctCache(pid, base);

    // 🚀 Actualiza también el mapa en memoria (no solo localStorage), para
    // que si OTRO bloque del mismo envío usa este mismo correo nuevo, ya
    // lo encuentre por el camino rápido en vez de volver a pagar el
    // request de verificación.
    setPerPid((s) => {
      const cur = s[pid];
      if (!cur) return s;
      return {
        ...s,
        [pid]: {
          ...cur,
          acctIdMap: { ...cur.acctIdMap, [key]: id },
        },
      };
    });

    await refreshStampOnce();
    return { id };
  }

  /* ===== Slots por bloque ===== */
  const [availableSlotsByIdx, setAvailableSlotsByIdx] = useState<number[][]>(
    [],
  );
  const [loadingSlotsByIdx, setLoadingSlotsByIdx] = useState<boolean[]>([]);
  const [slotsErrorByIdx, setSlotsErrorByIdx] = useState<(string | null)[]>([]);

  const ensureIdxArrays = (len: number) => {
    setAvailableSlotsByIdx((p) =>
      p.length >= len ? p : [...p, ...Array(len - p.length).fill([])],
    );
    setLoadingSlotsByIdx((p) =>
      p.length >= len ? p : [...p, ...Array(len - p.length).fill(false)],
    );
    setSlotsErrorByIdx((p) =>
      p.length >= len ? p : [...p, ...Array(len - p.length).fill(null)],
    );
  };
  useEffect(() => {
    ensureIdxArrays(orders.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders.length]);

  // Cache en memoria (no localStorage) de pantallas por plataforma, para esta
  // sesión del formulario. Se invalida llamando a invalidatePantallasPidCache(pid)
  // después de guardar, para que el siguiente cálculo de cupos sea exacto.
  const pantallasPidCacheRef = useRef<Record<number, any[]>>({});
  const invalidatePantallasPidCache = (pid?: number | null) => {
    if (pid) delete pantallasPidCacheRef.current[pid];
    else pantallasPidCacheRef.current = {};
  };
  async function getPantallasPorPlataformaCached(
    pid: number,
    force = false,
  ): Promise<any[]> {
    if (!force && pantallasPidCacheRef.current[pid]) {
      return pantallasPidCacheRef.current[pid];
    }
    const rows = await fetchPantallasPorPlataforma(pid);
    pantallasPidCacheRef.current[pid] = rows;
    return rows;
  }

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoadingSlotsByIdx(orders.map(() => true));

      // Plataformas distintas involucradas en los bloques actuales
      const pidsNeeded = Array.from(
        new Set(
          orders
            .map((o) => Number(o.plataforma_id))
            .filter((n) => Number.isFinite(n) && n > 0),
        ),
      );

      // Trae (o reusa) el dataset completo de cada plataforma involucrada
      const rowsByPid: Record<number, any[]> = {};
      await Promise.all(
        pidsNeeded.map(async (pid) => {
          rowsByPid[pid] = await getPantallasPorPlataformaCached(pid);
        }),
      );
      if (cancelled) return;

      for (let idx = 0; idx < orders.length; idx++) {
        const o = orders[idx];
        const pid = Number(o.plataforma_id);
        const email = normalizeEmail(o.correo);

        if (!pid || !email) {
          setAvailableSlotsByIdx((p) => {
            const a = [...p];
            a[idx] = [];
            return a;
          });
          setSlotsErrorByIdx((p) => {
            const a = [...p];
            a[idx] = null;
            return a;
          });
          continue;
        }

        try {
          const allRows = rowsByPid[pid] ?? [];
          const { free } = buildNumerosPantallaDisponibles({
            plataformaId: pid,
            plataformas,
            pantallas: allRows,
            correo: email,
            cuentaId: o.cuenta_id ?? undefined,
          });
          if (cancelled) return;

          setAvailableSlotsByIdx((p) => {
            const a = [...p];
            a[idx] = free;
            return a;
          });
          setSlotsErrorByIdx((p) => {
            const a = [...p];
            a[idx] = null;
            return a;
          });

          if (o.nro_pantalla && !free.includes(Number(o.nro_pantalla))) {
            setOrder(idx, { nro_pantalla: "" });
          }
        } catch (e: any) {
          if (cancelled) return;
          setSlotsErrorByIdx((p) => {
            const a = [...p];
            a[idx] =
              e?.message ?? "No se pudieron calcular pantallas disponibles";
            return a;
          });
          setAvailableSlotsByIdx((p) => {
            const a = [...p];
            a[idx] = [];
            return a;
          });
        }
      }

      if (!cancelled) setLoadingSlotsByIdx(orders.map(() => false));
    };

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    orders
      .map((o) => `${o.plataforma_id}:${o.correo}:${o.cuenta_id}`)
      .join("|"),
    plataformas,
    refreshTick,
  ]);

  /* ===== Fecha vencimiento por bloque ===== */
  useEffect(() => {
    setOrders((prev) =>
      prev.map((o) => {
        if (!o.fecha_compra) return o;
        const months =
          typeof o.meses_pagados === "number" &&
          Number.isFinite(o.meses_pagados) &&
          o.meses_pagados >= 1
            ? o.meses_pagados
            : 1;
        const fv = addMonthsLocal(o.fecha_compra, months);
        return fv !== o.fecha_vencimiento ? { ...o, fecha_vencimiento: fv } : o;
      }),
    );
  }, [orders.map((o) => `${o.fecha_compra}:${o.meses_pagados}`).join("|")]);

  /* ===== Total ganado por bloque ===== */
  useEffect(() => {
    setOrders((prev) =>
      prev.map((o) => {
        const tp = toNumOrNull(o.total_pagado);
        if (tp == null) {
          return o.total_ganado !== "" ? { ...o, total_ganado: "" } : o;
        }
        const tpp = toNumOrNull(o.total_pagado_proveedor);
        const ganado = tpp == null ? tp : tp - tpp;
        const txt = ganado.toString();
        return o.total_ganado !== txt ? { ...o, total_ganado: txt } : o;
      }),
    );
  }, [
    orders
      .map((o) => `${o.total_pagado}:${o.total_pagado_proveedor}`)
      .join("|"),
  ]);

  /* ===== Totales de plataforma: cache de total_pagado y total_pagado_proveedor ===== */
  const [plataformaTotales, setPlataformaTotales] = useState<
    Record<
      number,
      {
        total_pagado: number | null;
        total_pagado_proveedor: number | null;
        loading: boolean;
      }
    >
  >({});

  async function fetchPlataformaTotales(pid: number) {
    if (!pid) return;
    // Si ya lo tenemos en cache (y no está cargando), no volvemos a buscar
    if (plataformaTotales[pid] && !plataformaTotales[pid].loading) return;

    setPlataformaTotales((s) => ({
      ...s,
      [pid]: {
        total_pagado: null,
        total_pagado_proveedor: null,
        loading: true,
      },
    }));

    try {
      const res = await fetch(`/api/plataformas/${pid}`, { cache: "no-store" });
      if (!res.ok) throw new Error("No se pudo obtener la plataforma");
      const data = await res.json();
      setPlataformaTotales((s) => ({
        ...s,
        [pid]: {
          total_pagado:
            data?.total_pagado != null ? Number(data.total_pagado) : null,
          total_pagado_proveedor:
            data?.total_pagado_proveedor != null
              ? Number(data.total_pagado_proveedor)
              : null,
          loading: false,
        },
      }));
    } catch {
      setPlataformaTotales((s) => ({
        ...s,
        [pid]: {
          total_pagado: null,
          total_pagado_proveedor: null,
          loading: false,
        },
      }));
    }
  }

  /* ===== Dropdown correos: cache por plataforma ===== */
  const [perPid, setPerPid] = useState<Record<number, PerPidEmailCache>>({});
  const [emailOpenIdx, setEmailOpenIdx] = useState<number | null>(null);
  const dropdownBoxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!dropdownBoxRef.current) return;
      if (!dropdownBoxRef.current.contains(e.target as Node)) {
        setEmailOpenIdx(null);
      }
    }

    // ✅ IMPORTANTE: usar "click", NO "mousedown"
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const ensurePerPidInit = (pid: number) => {
    setPerPid((s) => {
      if (s[pid]) return s;
      return {
        ...s,
        [pid]: {
          options: [],
          acctIdMap: {},
          acctPassMap: {},
          invPassMap: {},
          invIdMap: {},
          freeByEmail: {},
          emailCounts: {},
          loading: false,
          error: null,
        },
      };
    });
  };

  async function loadEmailsForPid(pid: number, force = false) {
    if (!pid) return;
    ensurePerPidInit(pid);

    setPerPid((s) => ({
      ...s,
      [pid]: { ...(s[pid] ?? ({} as any)), loading: true, error: null },
    }));

    try {
      // ✅ Igual que en PantallasViewer: traer SIEMPRE datos frescos de
      // cuentas compartidas + inventario (sin cache de localStorage con
      // stamps que puedan quedar desincronizados).
      const [acctRes, invRes] = await Promise.all([
        fetch(`/api/cuentascompartidas?plataforma_id=${pid}&limit=10000`, {
          cache: "no-store",
        }),
        fetch(`/api/inventario?plataforma_id=${pid}&limit=10000`, {
          cache: "no-store",
        }),
      ]);

      if (!acctRes.ok) throw new Error("No se pudieron cargar cuentas");
      if (!invRes.ok) throw new Error("No se pudo cargar inventario");

      const acctRows: Cuenta[] = await acctRes.json();
      const invRows: InventarioItem[] = await invRes.json();

      // Seguimos escribiendo el cache LS de cuentas/inventario porque otras
      // partes del componente lo siguen leyendo (líneas ~739, 758, 1239:
      // autocompletar contraseña al escribir, eliminar cuenta por correo).
      // Esto es cache de UI, no lógica de negocio, así que se queda tal cual.
      const acctMapForCache: Record<string, AcctEntry> = {};
      for (const r of acctRows) {
        const c = normalizeEmail((r as any)?.correo ?? "");
        if (!c) continue;
        acctMapForCache[c] = {
          id: Math.max(acctMapForCache[c]?.id ?? 0, (r as any).id),
          pass: (r as any).contrasena ?? null,
        };
      }
      writeAcctCache(pid, acctMapForCache);

      const invMapForCache: Record<string, InvEntry> = {};
      for (const it of invRows) {
        const c = normalizeEmail((it as any)?.correo ?? "");
        if (!c) continue;
        invMapForCache[c] = {
          id: (it as any).id,
          pass: (it as any).clave ?? null,
        };
      }
      writeInvCache(pid, invMapForCache);

      // ✅ Pantallas usadas: dataset fresco de la plataforma.
      const pantallasRows = await getPantallasPorPlataformaCached(pid, force);

      // ✅ Única fuente de verdad para disponibilidad de correos.
      const disponibilidad = buildDisponibilidadCorreos({
        plataformaId: pid,
        plataformas,
        cuentasCompartidas: acctRows as any,
        inventario: invRows as any,
        pantallas: pantallasRows,
      });

      setPerPid((s) => ({
        ...s,
        [pid]: {
          ...(s[pid] ?? ({} as any)),
          acctIdMap: disponibilidad.acctIdMap,
          acctPassMap: disponibilidad.acctPassMap,
          invPassMap: disponibilidad.invPassMap,
          invIdMap: disponibilidad.invIdMap,
          options: disponibilidad.options,
          freeByEmail: disponibilidad.freeByEmail,
          emailCounts: disponibilidad.emailCounts,
          loading: false,
          error: null,
        },
      }));
    } catch (e: any) {
      setPerPid((s) => ({
        ...s,
        [pid]: {
          ...(s[pid] ?? ({} as any)),
          options: [],
          loading: false,
          error: e?.message ?? "No se pudieron cargar correos",
        },
      }));
    }
  }

  useEffect(() => {
    if (refreshTick === 0) return; // no dupliques la carga inicial
    const pidsActivos = Array.from(
      new Set(
        orders
          .map((o) => Number(o.plataforma_id))
          .filter((n) => Number.isFinite(n) && n > 0),
      ),
    );
    pidsActivos.forEach((pid) => {
      loadEmailsForPid(pid, true).catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTick]);

  async function deleteCuentaCompartidaByEmail(pid: number, email: string) {
    const cache = perPid[pid];
    const id = cache?.acctIdMap?.[email];
    if (!pid || !id) return;

    if (!window.confirm(`¿Eliminar la cuenta compartida\n${email}?`)) return;

    try {
      const res = await fetch(`/api/cuentascompartidas/${id}`, {
        method: "DELETE",
        cache: "no-store",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? "No se pudo eliminar la cuenta");
      }

      // LS
      const map = getAcctMap(pid) || {};
      delete map[email];
      writeAcctCache(pid, map);

      // Estado
      setPerPid((s) => {
        const cur = s[pid];
        if (!cur) return s;

        const nextAcctId = { ...cur.acctIdMap };
        const nextAcctPass = { ...cur.acctPassMap };
        delete nextAcctId[email];
        delete nextAcctPass[email];

        const nextOptions = cur.options.filter(
          (o) => !(o.source === "acct" && o.email === email),
        );

        const nextFree = { ...cur.freeByEmail };
        delete nextFree[`${pid}::acct::${email}`];

        return {
          ...s,
          [pid]: {
            ...cur,
            acctIdMap: nextAcctId,
            acctPassMap: nextAcctPass,
            options: nextOptions,
            freeByEmail: nextFree,
          },
        };
      });

      await refreshStampOnce();
    } catch (e: any) {
      alert(e?.message ?? "Error eliminando cuenta");
    }
  }

  /* ===== Validación ===== */
  const canSubmit = useMemo(() => {
    const contactoOk = user.contacto.trim() !== "";
    if (!contactoOk) return false;
    if (!orders.length) return false;

    for (let i = 0; i < orders.length; i++) {
      const o = orders[i];
      const available = availableSlotsByIdx[i] ?? [];
      const isLoadingSlots = loadingSlotsByIdx[i] ?? false;
      const pantallaOk = (() => {
        const n = Number(o.nro_pantalla);
        if (!Number.isInteger(n)) return false;
        // mientras carga, no bloquees submit por availableSlots vacío
        if (isLoadingSlots) return true;
        return available.includes(n);
      })();

      const plataformaOk =
        Number.isInteger(o.plataforma_id) && o.plataforma_id > 0;
      const fechasOk = !!o.fecha_compra && !!o.fecha_vencimiento;
      const estadoOk = (o.estado ?? "").trim() !== "";
      const mesesOk = Number.isInteger(o.meses_pagados) && o.meses_pagados >= 1;

      const correoOk =
        o.correo.trim() !== "" &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(o.correo.trim());
      const passOk = (o.contrasena ?? "").trim() !== "";

      const totalOk =
        o.total_pagado === "" ||
        (!Number.isNaN(Number(o.total_pagado)) &&
          Number(o.total_pagado) >= 0 &&
          Number(o.total_pagado) <= MAX_MONTO_COP);
      const totalProvOk =
        !o.total_pagado_proveedor ||
        (!Number.isNaN(Number(o.total_pagado_proveedor)) &&
          Number(o.total_pagado_proveedor) >= 0 &&
          Number(o.total_pagado_proveedor) <= MAX_MONTO_COP);

      if (
        !(
          plataformaOk &&
          fechasOk &&
          estadoOk &&
          mesesOk &&
          correoOk &&
          passOk &&
          pantallaOk &&
          totalOk &&
          totalProvOk
        )
      )
        return false;
    }

    return true;
  }, [user, orders, availableSlotsByIdx, loadingSlotsByIdx]);

  /* ===== Payload por bloque ===== */
  const buildPayloadFor = (o: OrderState, cuentaIdFinal: number | null) => {
    const totalPag = toNumOrNull(o.total_pagado);
    const totalProv = toNumOrNull(o.total_pagado_proveedor);
    const totalGan =
      totalPag == null
        ? null
        : totalProv == null
          ? totalPag
          : totalPag - totalProv;

    return {
      cuenta_id: cuentaIdFinal ?? null,
      contacto: normalizeContacto(user.contacto.trim()),
      nombre: (user.nombre ?? "").trim() || null,

      nro_pantalla: String(o.nro_pantalla ?? "").trim() || null,
      plataforma_id: o.plataforma_id,
      correo: o.correo.trim().toLowerCase() || null,
      contrasena: o.contrasena || null,
      proveedor: (o.proveedor ?? "").trim() || null,

      fecha_compra: o.fecha_compra
        ? new Date(o.fecha_compra).toISOString()
        : null,
      fecha_vencimiento: o.fecha_vencimiento
        ? new Date(o.fecha_vencimiento).toISOString()
        : null,

      meses_pagados: o.meses_pagados,

      total_pagado: totalPag == null ? null : Number(totalPag.toFixed(2)),
      total_pagado_proveedor:
        totalProv == null ? null : Number(totalProv.toFixed(2)),
      pago_total_proveedor:
        totalProv == null ? null : Number(totalProv.toFixed(2)),
      pagado_proveedor: totalProv == null ? null : Number(totalProv.toFixed(2)),

      total_ganado: totalGan == null ? null : Number(totalGan.toFixed(2)),
      ganado: totalGan == null ? null : Number(totalGan.toFixed(2)),

      estado: (o.estado ?? "").trim(),
      comentario: (o.comentario ?? "").trim() || null,
    };
  };

  /* ===== Mensajería + modal confirmación ===== */
  const [loading, setLoading] = useState(false);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPayload, setConfirmPayload] = useState<any[] | null>(null);
  const [confirmText, setConfirmText] = useState<string>("");
  const [confirmTicketText, setConfirmTicketText] = useState<string>(""); // ← NUEVO
  const [confirmView, setConfirmView] = useState<"resumen" | "json">("resumen");
  const [confirmOrders, setConfirmOrders] = useState<OrderState[]>([]);

  const modalBoxRef = useRef<HTMLDivElement | null>(null);
  const modalScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!confirmOpen) return;

    // 1) asegura que el modal quede centrado en la pantalla
    requestAnimationFrame(() => {
      modalBoxRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });

      // 2) manda el scroll interno del modal al inicio (donde está el resumen)
      if (modalScrollRef.current) {
        modalScrollRef.current.scrollTop = 0;
      }
    });
  }, [confirmOpen]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setOkMsg(null);
    setErrMsg(null);

    if (!canSubmit) {
      setErrMsg(
        "Revisa los campos obligatorios y cupos/pantallas disponibles.",
      );
      return;
    }

    try {
      await ensureUsersAllLoaded();
      await ensureUsuario(user.contacto, user.nombre || null);

      // evitar duplicados plataforma+correo+nro_pantalla en el mismo guardado
      const keyset = new Set<string>();
      for (const o of orders) {
        const k = `${o.plataforma_id}:${normalizeEmail(o.correo)}:${String(o.nro_pantalla)}`;
        if (keyset.has(k)) {
          setErrMsg(`Duplicado en el mismo guardado: ${k}`);
          return;
        }
        keyset.add(k);
      }

      // asegurar cuenta compartida por bloque y construir payload
      const payloads: any[] = [];
      for (const o of orders) {
        let cuentaId: number | null = o.cuenta_id ?? null;
        if (o.correo && o.plataforma_id > 0) {
          const { id } = await ensureCuentaCompartida(
            o.correo,
            o.plataforma_id,
            o.contrasena || null,
            (o.proveedor ?? "") || null,
          );
          cuentaId = id;
        }
        payloads.push(buildPayloadFor(o, cuentaId));
      }

      setConfirmPayload(payloads);
      setConfirmOrders(orders);
      setConfirmText(JSON.stringify(payloads, null, 2));
      setConfirmTicketText(
        buildPedidoResumenFull(payloads, plataformaMap, orders),
      ); // ← NUEVO
      setConfirmView("resumen");
      setConfirmOpen(true);
    } catch (e: any) {
      setErrMsg(e?.message ?? "Error preparando el guardado.");
    }
  }

  async function confirmAndSave() {
    if (!confirmPayload) return;
    setLoading(true);
    setErrMsg(null);

    try {
      let toSend: any[] = confirmPayload;
      try {
        const maybe = JSON.parse(confirmText);
        if (Array.isArray(maybe)) toSend = maybe;
      } catch {}

      const results = await Promise.allSettled(
        toSend.map((p) =>
          fetch("/api/pantallas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(p),
          }).then(async (res) => {
            const j = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(j?.error ?? "No se pudo guardar");
            return { saved: j, sent: p };
          }),
        ),
      );

      const ok = results.filter(
        (r) => r.status === "fulfilled",
      ) as PromiseFulfilledResult<any>[];
      const bad = results.filter(
        (r) => r.status === "rejected",
      ) as PromiseRejectedResult[];

      // si venían de inventario: borrar por bloque usando selectedInvId
      for (let i = 0; i < ok.length; i++) {
        const sent = ok[i].value.sent;
        // buscamos el índice por match plataforma+correo+nro_pantalla (mejor esfuerzo)
        const idx = confirmOrders.findIndex(
          (o) =>
            Number(o.plataforma_id) === Number(sent?.plataforma_id) &&
            normalizeEmail(o.correo) === normalizeEmail(sent?.correo ?? "") &&
            String(o.nro_pantalla) === String(sent?.nro_pantalla ?? ""),
        );
        if (idx >= 0) {
          const o = confirmOrders[idx];
          if (o.selectedEmailSource === "inv" && o.selectedInvId != null) {
            try {
              await fetch(`/api/inventario/${o.selectedInvId}`, {
                method: "DELETE",
                cache: "no-store",
              });
            } catch {}
          }
        }
      }

      for (const f of ok) {
        try {
          mergePantallaIntoCache(f.value.saved);
          notifyPantallasChanged();
        } catch {}
      }

      // ✅ Invalida el cache en memoria de pantallas/cupos de las plataformas
      // afectadas, así el próximo cálculo de cupos y correos disponibles
      // refleja lo que se acaba de guardar.
      const pidsAfectados = new Set<number>();
      for (const f of ok) {
        const pid = Number(
          f.value?.saved?.plataforma_id ?? f.value?.sent?.plataforma_id,
        );
        if (Number.isFinite(pid) && pid > 0) pidsAfectados.add(pid);
      }
      pidsAfectados.forEach((pid) => invalidatePantallasPidCache(pid));

      await refreshStampOnce();
      setRefreshTick((t) => t + 1);

      if (bad.length) {
        setErrMsg(
          `Se guardaron ${ok.length}/${toSend.length}. Fallaron: ` +
            bad
              .map((b: any, i) => `#${i + 1} (${b.reason?.message ?? "error"})`)
              .join(" | "),
        );
      } else {
        const ids = ok
          .map((x) => x.value.saved?.id)
          .filter(Boolean)
          .join(", ");
        setOkMsg(`Guardado correctamente (${ok.length}). IDs: ${ids}`);
      }

      setConfirmOpen(false);

      // recordar última plataforma del lote
      try {
        const last = toSend[toSend.length - 1];
        if (last?.plataforma_id) {
          window.localStorage.setItem(
            LAST_PLATFORM_KEY,
            String(last.plataforma_id),
          );
        }
      } catch {}

      // reset UI
      const base = todayStr();
      const stored =
        typeof window !== "undefined"
          ? window.localStorage.getItem(LAST_PLATFORM_KEY)
          : null;
      const lastId = stored ? Number(stored) : NaN;
      const nextPlat =
        Number.isFinite(lastId) && lastId > 0
          ? lastId
          : (plataformasOrdered[0]?.id ?? 0);

      setUser({ contacto: "", nombre: "" });
      setOrders([makeEmptyOrder(nextPlat)]);
      setNombreDirty(false);
      lastContactoRef.current = "";
      setEmailOpenIdx(null);

      // ✅ FIX: al resetear tras guardar, volvemos a precargar los totales
      // por defecto de la plataforma (igual que al montar el formulario o
      // al cambiar de plataforma). Antes este reset dejaba total_pagado y
      // total_pagado_proveedor vacíos porque makeEmptyOrder() no dispara
      // el fetch de autorelleno, dando la sensación de que el valor "se
      // borraba" cada vez que se registraba una pantalla.
      if (nextPlat) {
        fetch(`/api/plataformas/${nextPlat}`, { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (!data) return;
            const tp =
              data?.total_pagado != null && data.total_pagado !== 0
                ? String(data.total_pagado)
                : "";
            const tpp =
              data?.total_pagado_proveedor != null &&
              data.total_pagado_proveedor !== 0
                ? String(data.total_pagado_proveedor)
                : "";
            setOrders((cur) =>
              cur.map((o, i) =>
                i === 0 &&
                o.total_pagado === "" &&
                o.total_pagado_proveedor === ""
                  ? { ...o, total_pagado: tp, total_pagado_proveedor: tpp }
                  : o,
              ),
            );
            setPlataformaTotales((s) => ({
              ...s,
              [nextPlat]: {
                total_pagado:
                  data?.total_pagado != null ? Number(data.total_pagado) : null,
                total_pagado_proveedor:
                  data?.total_pagado_proveedor != null
                    ? Number(data.total_pagado_proveedor)
                    : null,
                loading: false,
              },
            }));
          })
          .catch(() => {});
      }
    } catch (err: any) {
      setErrMsg(err?.message ?? "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  /* ===== UI: badge por bloque ===== */
  const badgeFor = (idx: number) => {
    const o = orders[idx];
    const pid = o?.plataforma_id;
    const email = normalizeEmail(o?.correo ?? "");
    const count =
      pid && perPid[pid]?.emailCounts?.[email] != null
        ? perPid[pid]!.emailCounts[email]
        : 0;

    const cls =
      count > 0
        ? "border-amber-300 bg-amber-50 text-amber-700"
        : "border-emerald-300 bg-emerald-50 text-emerald-700";

    return (
      <span className={`text-xs rounded-full px-2 py-[2px] border ${cls}`}>
        hay {count} {count === 1 ? "registro" : "registros"}
      </span>
    );
  };

  /* ===================== Render ===================== */
  return (
    <>
      <form onSubmit={onSubmit} className="grid gap-6">
        {/* Usuario */}
        <section className="border border-neutral-800 rounded-2xl p-4 bg-neutral-950/40 text-neutral-100">
          <h3 className="font-semibold mb-3">Usuario</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldPantallas
              label="Contacto *"
              type="tel"
              placeholder="+57 3xxxxxxxxx"
              value={user.contacto}
              onChange={(v: string) => {
                const soloDigitos = v
                  .replace(/[^\d\s]/g, "")
                  .replace(/^\s+/, "");
                const next = soloDigitos ? `+${soloDigitos}` : "";
                setUser((s) => ({ ...s, contacto: next }));
              }}
              required
              inputMode="tel"
              pattern="^\+?[\d\s\-\(\)]{7,20}$"
              title="Formato válido: + seguido de números"
              onInvalid={(e: any) =>
                e.currentTarget.setCustomValidity(
                  "Ingresa un teléfono en formato + y solo números",
                )
              }
              onInput={(e: any) => e.currentTarget.setCustomValidity("")}
              inputClassName="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
            />
            <FieldPantallas
              label="Nombre"
              placeholder="Se autocompleta si el contacto existe (desde cache)"
              value={user.nombre}
              onChange={(v: string) => {
                setNombreDirty(true);
                setUser((s) => ({ ...s, nombre: v }));
              }}
              inputClassName="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
            />
          </div>
        </section>

        {/* Compras / Pantallas (multi-bloque) */}
        <section className="border border-neutral-800 rounded-2xl p-4 bg-neutral-950/40 text-neutral-100">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="font-semibold">Compras / Plataformas</h3>

            <button
              type="button"
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 hover:bg-neutral-800"
              onClick={() => {
                const pid =
                  orders[orders.length - 1]?.plataforma_id ||
                  plataformasOrdered[0]?.id ||
                  0;
                setOrders((prev) => [...prev, makeEmptyOrder(pid)]);
              }}
              title="Agregar otra compra/plataforma"
            >
              +
            </button>
          </div>

          <div className="grid gap-6" ref={dropdownBoxRef}>
            {orders.map((o, idx) => {
              const pid = o.plataforma_id;
              const pidCache = pid ? perPid[pid] : null;
              const availableSlots = availableSlotsByIdx[idx] ?? [];
              const loadingSlots = loadingSlotsByIdx[idx] ?? false;
              const slotsError = slotsErrorByIdx[idx] ?? null;

              // ✅ FIX: NO useMemo dentro de map (esto rompía el orden de hooks)
              const visibleOptions =
                !pid || !pidCache ? [] : (pidCache.options ?? []);

              return (
                <div
                  key={idx}
                  className="border border-neutral-800 rounded-2xl p-4 bg-neutral-950/40"
                >
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h4 className="font-semibold">Compra #{idx + 1}</h4>

                    {orders.length > 1 && (
                      <button
                        type="button"
                        className="text-sm px-3 py-1.5 rounded-lg border border-neutral-700 hover:bg-neutral-800"
                        onClick={() => {
                          setOrders((prev) => prev.filter((_, i) => i !== idx));
                          setEmailOpenIdx((cur) => (cur === idx ? null : cur));
                        }}
                      >
                        Quitar
                      </button>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Plataforma */}
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <label className="block text-sm text-neutral-300">
                          Plataforma <span className="text-red-600">*</span>
                        </label>
                        {lastPlatformId && (
                          <span className="text-xs text-neutral-400">
                            Última: #{lastPlatformId}
                          </span>
                        )}
                      </div>

                      <select
                        className="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500 [&>option]:bg-neutral-900 [&>option]:text-neutral-100"
                        value={o.plataforma_id ? String(o.plataforma_id) : ""}
                        onChange={(e) => {
                          const newPid = Number(e.target.value);
                          setOrder(idx, {
                            plataforma_id: newPid,
                            correo: "",
                            cuenta_id: null,
                            contrasena: "",
                            nro_pantalla: "",
                            selectedEmailSource: null,
                            selectedInvId: null,
                          });
                          if (newPid) {
                            loadEmailsForPid(newPid).catch(() => {});
                            // Obtener totales de la plataforma y autorellenar si vienen definidos
                            fetch(`/api/plataformas/${newPid}`, {
                              cache: "no-store",
                            })
                              .then((r) => (r.ok ? r.json() : null))
                              .then((data) => {
                                if (!data) return;
                                const tp =
                                  data?.total_pagado != null &&
                                  data.total_pagado !== 0
                                    ? String(data.total_pagado)
                                    : "";
                                const tpp =
                                  data?.total_pagado_proveedor != null &&
                                  data.total_pagado_proveedor !== 0
                                    ? String(data.total_pagado_proveedor)
                                    : "";
                                setOrder(idx, {
                                  total_pagado: tp,
                                  total_pagado_proveedor: tpp,
                                });
                                // Guardar en cache local
                                setPlataformaTotales((s) => ({
                                  ...s,
                                  [newPid]: {
                                    total_pagado:
                                      data?.total_pagado != null
                                        ? Number(data.total_pagado)
                                        : null,
                                    total_pagado_proveedor:
                                      data?.total_pagado_proveedor != null
                                        ? Number(data.total_pagado_proveedor)
                                        : null,
                                    loading: false,
                                  },
                                }));
                              })
                              .catch(() => {});
                          }
                        }}
                        required
                        disabled={platLoading || !!platError}
                      >
                        <option value="" disabled>
                          {platLoading
                            ? "Cargando…"
                            : platError
                              ? "Error al cargar"
                              : "Selecciona una plataforma"}
                        </option>
                        {plataformasOrdered.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Correo + dropdown */}
                    <div className="relative">
                      <FieldPantallas
                        label="Correo *"
                        labelRight={badgeFor(idx)}
                        type="email"
                        placeholder="correo@dominio.com"
                        value={o.correo}
                        onChange={(v: string) => {
                          setOrder(idx, {
                            correo: v,
                            nro_pantalla: "",
                            selectedEmailSource: null,
                            selectedInvId: null,
                          });
                        }}
                        onFocus={() => {
                          if (pid) loadEmailsForPid(pid).catch(() => {});
                          setEmailOpenIdx(idx);
                        }}
                        required
                        onInvalid={(e: any) =>
                          e.currentTarget.setCustomValidity(
                            "Ingresa un correo válido",
                          )
                        }
                        onInput={(e: any) =>
                          e.currentTarget.setCustomValidity("")
                        }
                        inputClassName="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
                      />

                      {emailOpenIdx === idx && pid && (
                        <div
                          className="absolute left-0 right-0 z-20 mt-1 rounded-lg border border-neutral-700 bg-neutral-900 text-sm text-neutral-100 shadow-lg"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {pidCache?.loading && (
                            <div className="p-2 text-sm text-neutral-400">
                              Cargando correos…
                            </div>
                          )}
                          {!pidCache?.loading && pidCache?.error && (
                            <div className="p-2 text-sm text-neutral-300">
                              {pidCache.error}
                            </div>
                          )}

                          {!pidCache?.loading && !pidCache?.error && (
                            <ul className="max-h-72 overflow-auto">
                              {visibleOptions.length === 0 && (
                                <li className="px-3 py-2 text-neutral-500">
                                  Sin correos con cupos disponibles
                                </li>
                              )}

                              {visibleOptions.map(({ email, source }) => {
                                const key = `${pid}::${source}::${email}`;
                                const free = pidCache?.freeByEmail?.[key];

                                if (!(typeof free === "number" && free > 0))
                                  return null;

                                return (
                                  <li key={`${source}-${email}`}>
                                    <div className="flex w-full items-center justify-between px-3 py-2 hover:bg-neutral-800">
                                      <button
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => {
                                          if (!pidCache) return;

                                          if (source === "inv") {
                                            const pass =
                                              pidCache.invPassMap[email] ??
                                              null;
                                            const invId =
                                              pidCache.invIdMap[email] ?? null;

                                            setOrder(idx, {
                                              correo: email,
                                              contrasena:
                                                o.contrasena || pass || "",
                                              cuenta_id: null,
                                              selectedEmailSource: "inv",
                                              selectedInvId: invId,
                                              nro_pantalla: "",
                                            });
                                          } else {
                                            const cid =
                                              pidCache.acctIdMap[email];
                                            const pass =
                                              pidCache.acctPassMap[email];
                                            setOrder(idx, {
                                              correo: email,
                                              cuenta_id: cid ?? o.cuenta_id,
                                              contrasena:
                                                o.contrasena || pass || "",
                                              selectedEmailSource: "acct",
                                              selectedInvId: null,
                                              nro_pantalla: "",
                                            });
                                          }

                                          setEmailOpenIdx(null);
                                        }}
                                        className="flex-1 min-w-0 text-left"
                                      >
                                        <span className="truncate">
                                          {email}
                                        </span>
                                      </button>

                                      <div className="ml-2 flex items-center gap-2">
                                        {source === "inv" && (
                                          <span className="text-[10px] rounded-full px-2 py-[1px] border border-emerald-400/70 text-emerald-300">
                                            INV
                                          </span>
                                        )}
                                        <span className="text-xs opacity-70">{`cupos: ${free}`}</span>

                                        {source === "acct" && (
                                          <button
                                            type="button"
                                            onMouseDown={(e) =>
                                              e.preventDefault()
                                            }
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              deleteCuentaCompartidaByEmail(
                                                pid,
                                                email,
                                              );
                                            }}
                                            className="ml-1 text-xs rounded px-2 py-[3px] border border-red-700/60 text-red-300 hover:bg-red-900/30"
                                          >
                                            Eliminar
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Proveedor */}
                    <FieldPantallas
                      label="Proveedor"
                      placeholder="Opcional"
                      value={o.proveedor}
                      onChange={(v: string) => setOrder(idx, { proveedor: v })}
                      inputClassName="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
                    />

                    {/* Contraseña */}
                    <FieldPantallas
                      label="Contraseña *"
                      type="text"
                      placeholder="Requerida"
                      value={o.contrasena}
                      onChange={(v: string) => setOrder(idx, { contrasena: v })}
                      required
                      onInvalid={(e: any) =>
                        e.currentTarget.setCustomValidity(
                          "La contraseña es obligatoria",
                        )
                      }
                      onInput={(e: any) =>
                        e.currentTarget.setCustomValidity("")
                      }
                      inputClassName="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
                    />

                    {/* Nro pantalla */}
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <label className="block text-sm text-neutral-300">
                          Nro. pantalla <span className="text-red-600">*</span>
                        </label>
                        {pid > 0 && (
                          <span className="text-xs text-neutral-400">
                            {loadingSlots
                              ? "Calculando…"
                              : slotsError
                                ? "Error al calcular"
                                : `Disponibles: ${availableSlots.length}`}
                          </span>
                        )}
                      </div>

                      <select
                        className="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500 [&>option]:bg-neutral-900 [&>option]:text-neutral-100"
                        value={o.nro_pantalla ? String(o.nro_pantalla) : ""}
                        onChange={(e) =>
                          setOrder(idx, { nro_pantalla: e.target.value })
                        }
                        required
                        disabled={
                          !pid ||
                          !o.correo.trim() ||
                          !!slotsError ||
                          loadingSlots ||
                          availableSlots.length === 0
                        }
                      >
                        <option value="" disabled>
                          {!pid
                            ? "Selecciona una plataforma"
                            : !o.correo.trim()
                              ? "Ingresa o selecciona un correo"
                              : loadingSlots
                                ? "Calculando…"
                                : slotsError
                                  ? "Error al calcular"
                                  : availableSlots.length === 0
                                    ? "Sin cupos disponibles"
                                    : "Selecciona una pantalla disponible"}
                        </option>

                        {availableSlots.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Fechas */}
                    <FieldPantallas
                      label="Fecha de compra *"
                      type="date"
                      value={o.fecha_compra}
                      onChange={(v) => setOrder(idx, { fecha_compra: v })}
                      required
                      onMouseDown={(e) => {
                        const el = e.currentTarget;
                        if (el.showPicker && document.activeElement !== el) {
                          requestAnimationFrame(() => el.showPicker());
                        }
                      }}
                      inputClassName="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500 cursor-text"
                    />

                    <FieldPantallas
                      label="Fecha de vencimiento (auto) *"
                      type="date"
                      value={o.fecha_vencimiento}
                      onChange={() => {}}
                      disabled
                      required
                      inputClassName="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500 cursor-not-allowed opacity-80"
                    />

                    {/* Meses / Totales */}
                    <FieldPantallas
                      label="Meses pagados *"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      step={1}
                      value={String(o.meses_pagados)}
                      onChange={(v: string) => {
                        const n = parseInt(v, 10);
                        setOrder(idx, {
                          meses_pagados: Number.isFinite(n)
                            ? Math.max(1, n)
                            : 1,
                        });
                      }}
                      placeholder="Ej. 1"
                      required
                      inputClassName="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
                    />

                    {/* Total pagado — se autorellena desde la plataforma pero es editable */}
                    <div>
                      <div className="mb-1 flex items-center justify-between gap-1">
                        <label className="block text-sm text-neutral-300">
                          Total pagado
                        </label>
                      </div>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        max={MAX_MONTO_COP}
                        placeholder="0.00"
                        value={o.total_pagado}
                        onChange={(e) =>
                          setOrder(idx, { total_pagado: e.target.value })
                        }
                        className="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
                      />
                      {o.total_pagado !== "" &&
                        !Number.isNaN(Number(o.total_pagado)) &&
                        Number(o.total_pagado) > MAX_MONTO_COP && (
                          <p className="mt-1 text-xs text-red-500">
                            El monto máximo permitido es $
                            {fmtMoneyClient(MAX_MONTO_COP)}. Revisa si
                            escribiste un dígito de más.
                          </p>
                        )}
                    </div>

                    {/* Total pagado proveedor — se autorellena desde la plataforma pero es editable */}
                    <div>
                      <div className="mb-1 flex items-center justify-between gap-1">
                        <label className="block text-sm text-neutral-300">
                          Total pagado proveedor{" "}
                          <span className="text-neutral-500">(opcional)</span>
                        </label>
                      </div>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        max={MAX_MONTO_COP}
                        placeholder="0.00"
                        value={o.total_pagado_proveedor ?? ""}
                        onChange={(e) =>
                          setOrder(idx, {
                            total_pagado_proveedor: e.target.value,
                          })
                        }
                        className="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
                      />
                      {o.total_pagado_proveedor &&
                        !Number.isNaN(Number(o.total_pagado_proveedor)) &&
                        Number(o.total_pagado_proveedor) > MAX_MONTO_COP && (
                          <p className="mt-1 text-xs text-red-500">
                            El monto máximo permitido es $
                            {fmtMoneyClient(MAX_MONTO_COP)}. Revisa si
                            escribiste un dígito de más.
                          </p>
                        )}
                    </div>

                    <FieldPantallas
                      label="Total ganado (auto)"
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={o.total_ganado ?? ""}
                      onChange={() => {}}
                      disabled
                      inputClassName="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500 cursor-not-allowed opacity-80"
                    />

                    {/* Estado / Comentario */}
                    <FieldPantallas
                      label="Estado *"
                      placeholder='Ej. "ACTIVA", "PAUSADA"…'
                      value={o.estado}
                      onChange={(v: string) => setOrder(idx, { estado: v })}
                      required
                      inputClassName="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
                    />

                    <TextArea
                      className="sm:col-span-2"
                      label="Comentario"
                      placeholder="Notas adicionales"
                      value={o.comentario}
                      onChange={(v) => setOrder(idx, { comentario: v })}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Acciones */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={!canSubmit || loading}
            className={[
              "px-4 py-2 rounded-xl border",
              canSubmit && !loading
                ? "bg-gray-900 text-white border-gray-900"
                : "opacity-60 cursor-not-allowed",
            ].join(" ")}
          >
            {loading ? "Procesando…" : "Guardar todo"}
          </button>

          <button
            type="button"
            onClick={() => {
              const base = todayStr();
              const stored =
                typeof window !== "undefined"
                  ? window.localStorage.getItem(LAST_PLATFORM_KEY)
                  : null;
              const lastId = stored ? Number(stored) : NaN;
              const nextPlat =
                Number.isFinite(lastId) && lastId > 0
                  ? lastId
                  : (plataformasOrdered[0]?.id ?? 0);

              setUser({ contacto: "", nombre: "" });
              setOrders([
                {
                  ...makeEmptyOrder(nextPlat),
                  fecha_compra: base,
                  fecha_vencimiento: addMonthsLocal(base, 1),
                },
              ]);
              setNombreDirty(false);
              lastContactoRef.current = "";
              setEmailOpenIdx(null);
              setOkMsg(null);
              setErrMsg(null);
            }}
            className="px-4 py-2 rounded-xl border"
          >
            Limpiar
          </button>
        </div>

        {okMsg && <p className="text-green-700 text-sm">{okMsg}</p>}
        {errMsg && <p className="text-red-600 text-sm">Error: {errMsg}</p>}
      </form>

      {/* ===== Modal de confirmación ===== */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setConfirmOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
        >
          <div
            ref={modalBoxRef}
            className="w-full max-w-4xl rounded-2xl border border-neutral-700 bg-neutral-900 text-neutral-100 shadow-2xl
                        max-h-[90vh] grid grid-rows-[auto_auto_1fr_auto]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-neutral-800 flex items-center justify-center text-sm">
                  ✅
                </div>
                <div>
                  <h3 id="confirm-title" className="font-semibold text-lg">
                    Confirmar datos a guardar
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Se guardan todas las compras en una sola acción (varios
                    POST).
                  </p>
                </div>
              </div>
              <button
                className="text-neutral-300 hover:text-white rounded-lg px-2 py-1"
                onClick={() => setConfirmOpen(false)}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            {/* Tabs + Acciones */}
            <div className="px-5 pt-4 pb-3 flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800">
              <div className="inline-flex rounded-lg border border-neutral-700 overflow-hidden">
                <button
                  type="button"
                  className={`px-3 py-1.5 text-sm ${
                    confirmView === "resumen"
                      ? "bg-neutral-800"
                      : "bg-neutral-900 hover:bg-neutral-800"
                  }`}
                  onClick={() => setConfirmView("resumen")}
                >
                  Resumen
                </button>
                <button
                  type="button"
                  className={`px-3 py-1.5 text-sm ${
                    confirmView === "json"
                      ? "bg-neutral-800"
                      : "bg-neutral-900 hover:bg-neutral-800"
                  }`}
                  onClick={() => setConfirmView("json")}
                >
                  JSON
                </button>
              </div>
              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                <button
                  type="button"
                  className="text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 rounded-lg border border-neutral-700 hover:bg-neutral-800 whitespace-nowrap"
                  onClick={() => copyToClipboard(confirmText)}
                >
                  Copiar JSON
                </button>
                <button
                  type="button"
                  className="text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 rounded-lg border border-neutral-700 hover:bg-neutral-800 whitespace-nowrap"
                  onClick={() => copyToClipboard(confirmTicketText)}
                >
                  Copiar ticket
                </button>
                <button
                  type="button"
                  className="text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 rounded-lg border border-neutral-700 hover:bg-neutral-800 whitespace-nowrap"
                  onClick={() => {
                    /* ...mantén tu lógica de Descargar igual... */
                  }}
                >
                  Descargar
                </button>
              </div>
            </div>

            {/* Contenido */}
            <div ref={modalScrollRef} className="p-5 overflow-y-auto min-w-0">
              {confirmView === "resumen" ? (
                <div className="grid gap-4">
                  {Array.isArray(confirmPayload) && (
                    // ✅ DESPUÉS (sin el botón, solo el título)
                    <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                      <h4 className="font-semibold text-sm text-neutral-200 mb-2">
                        Pedido completo (todas las compras)
                      </h4>

                      <pre className="whitespace-pre-wrap break-words text-sm font-mono bg-neutral-950/70 border border-neutral-800 rounded-lg p-3 overflow-auto">
                        {buildPedidoResumenFull(
                          confirmPayload,
                          plataformaMap,
                          confirmOrders,
                        )}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-sm text-neutral-300 mb-2">
                    Puedes editar el texto antes de confirmar. Se enviará
                    exactamente este JSON.
                  </p>
                  <textarea
                    className="w-full h-96 rounded-lg border border-neutral-700 bg-neutral-950 text-neutral-100 font-mono text-sm p-3"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-neutral-800 flex items-center justify-end gap-2">
              <button
                className="px-3 py-2 rounded-lg border border-neutral-600 hover:bg-neutral-800"
                onClick={() => setConfirmOpen(false)}
                disabled={loading}
              >
                Volver a editar
              </button>
              <button
                className="px-3 py-2 rounded-lg border border-emerald-700 bg-emerald-800/40 hover:bg-emerald-800/60 disabled:opacity-60"
                onClick={confirmAndSave}
                disabled={loading}
              >
                {loading ? "Guardando…" : "Confirmar y guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
