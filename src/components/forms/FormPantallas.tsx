"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePlataformas } from "@/hooks/usePlataformas";
import { normalizeContacto } from "@/lib/strings";
import { todayStr } from "@/lib/dates";
import { FieldPantallas } from "@/components/ui/FieldPantallas";
import TextArea from "@/components/ui/TextArea";
import type { Usuario, Cuenta, FormState } from "@/types/pantallas";

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


function buildPedidoResumenText(
  payloads: any[],
  plataformaMap: Map<number, string>,
  orders: any[]
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
    lineas.push(`Fecha de vencimiento: ${fmtDateHuman(order?.fecha_vencimiento)}`);
    lineas.push(`Meses pagados: ${order?.meses_pagados ?? "—"}`);
    lineas.push(`Total: ${fmtMoneyClient(p?.total_pagado)}`);
    lineas.push(""); // separador entre compras
  });

  // Totales del pedido (sumados)
  const totalPagado = payloads.reduce((acc, p) => acc + (Number(p?.total_pagado) || 0), 0);
  lineas.push("💰 TOTAL DEL PEDIDO");
  lineas.push(`Total: ${fmtMoneyClient(totalPagado)}`);

  return lineas.join("\n");
}

function buildPedidoResumenFull(
  payloads: any[],
  plataformaMap: Map<number, string>,
  orders: any[]
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
type AcctCacheShape = { map: Record<string, AcctEntry>; ts: number; stamp: number };

type InvEntry = { id?: number; pass: string | null };
type InvCacheShape = { map: Record<string, InvEntry>; ts: number; stamp: number };

type PantSumCacheShape = {
  ts: number;
  stamp: number;
  byEmail: Record<string, number>;
  byCuenta: Record<number, number>;
};

type PerPidEmailCache = {
  // dropdown
  options: Array<{ email: string; source: "acct" | "inv" }>;
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

/** Detecta el campo correcto de “pantallas permitidas” en la plataforma. */
function resolveMaxPantallas(p: any): number {
  const toNum = (x: any) => {
    const n = Number(x);
    return Number.isFinite(n) ? n : undefined;
  };

  const candidates = [
    toNum(p?.cantidad_pantallas),
    toNum(p?.cantidadPantallas),
    toNum(p?.max_pantallas),
    toNum(p?.pantallas_permitidas),
    toNum(p?.perfiles),
    toNum(p?.max_perfiles),
    toNum(p?.pantallas),
    toNum(p?.capacidad_pantallas),
  ];

  const val = candidates.find((n) => typeof n === "number" && n > 0);
  return val ?? 1;
}

function capacityForPlatform(pid: number | null | undefined, plataformas: any[]): number | null {
  if (!pid) return null;
  const p = plataformas.find((x) => Number(x.id) === Number(pid));
  if (!p) return null;
  const raw =
    (p as any).cantidad_pantallas ??
    (p as any).cantidadPantallas ??
    (p as any).max_pantallas ??
    (p as any).pantallas ??
    (p as any).perfiles ??
    null;
  if (raw === null || raw === undefined || raw === "") return null;
  const cap = Number(raw);
  return Number.isFinite(cap) && cap > 0 ? cap : null;
}

async function fetchPantallasByEmailOrCuenta(
  email: string,
  cuentaId?: number,
  plataformaId?: number
): Promise<Array<{ nro_pantalla: any } & any>> {
  const key = normalizeEmail(email);
  const base = "/api/pantallas";
  const urls = plataformaId
    ? [
        `${base}?plataforma_id=${plataformaId}&correo=${encodeURIComponent(key)}&limit=5000`,
        `${base}?plataforma_id=${plataformaId}&q=${encodeURIComponent(key)}&limit=5000`,
        `${base}?plataforma_id=${plataformaId}&limit=5000`,
      ]
    : [
        `${base}?correo=${encodeURIComponent(key)}&limit=5000`,
        `${base}?q=${encodeURIComponent(key)}&limit=5000`,
        `${base}?limit=5000`,
      ];

  const urlsWithCuenta = cuentaId
    ? [`${base}?cuenta_id=${cuentaId}&limit=5000`, ...urls]
    : urls;

  const arr = await fetchListSafe(urlsWithCuenta);
  return Array.isArray(arr) ? arr : [];
}

/* ===== LS: Users All ===== */
function readUsersAll(): UsersAllCache | null {
  return readLS<UsersAllCache>(LS_USERS_ALL);
}
function writeUsersAll(map: Record<string, Usuario>) {
  writeLS(LS_USERS_ALL, { map, ts: Date.now(), stamp: getCurrentStamp() } as UsersAllCache);
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
  writeLS(acctKey(pid), { map, ts: Date.now(), stamp: getCurrentStamp() } as AcctCacheShape);
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
  writeLS(invKey(pid), { map, ts: Date.now(), stamp: getCurrentStamp() } as InvCacheShape);
}
function getInvMap(pid: number): Record<string, InvEntry> | null {
  const c = readInvCache(pid);
  if (!c) return null;
  const sameStamp = c.stamp === getCurrentStamp();
  const fresh = Date.now() - c.ts <= LIST_CACHE_TTL;
  return sameStamp && fresh ? c.map : null;
}

/* ===== LS: pantallas resumen por plataforma (1 fetch) ===== */
function pantSumKey(pid: number) {
  return `${LS_PANT_SUM_PREFIX}${pid}`;
}
function readPantSum(pid: number): PantSumCacheShape | null {
  return readLS<PantSumCacheShape>(pantSumKey(pid));
}
function writePantSum(pid: number, data: PantSumCacheShape) {
  writeLS(pantSumKey(pid), data);
}
function getPantSum(pid: number): PantSumCacheShape | null {
  const c = readPantSum(pid);
  if (!c) return null;
  const sameStamp = c.stamp === getCurrentStamp();
  const fresh = Date.now() - c.ts <= LIST_CACHE_TTL;
  return sameStamp && fresh ? c : null;
}
async function buildPantSumForPlatform(pid: number): Promise<PantSumCacheShape> {
  const rows = await fetchListSafe([
    `/api/pantallas?plataforma_id=${pid}&limit=50000`,
    `/api/pantallas?plataforma_id=${pid}&limit=20000`,
    `/api/pantallas?plataforma_id=${pid}&limit=10000`,
  ]);

  const byEmail: Record<string, number> = {};
  const byCuenta: Record<number, number> = {};

  for (const r of rows) {
    const email = normalizeEmail(r?.correo ?? "");
    if (email) byEmail[email] = (byEmail[email] ?? 0) + 1;
    const cid = Number(r?.cuenta_id);
    if (Number.isFinite(cid) && cid > 0) {
      byCuenta[cid] = (byCuenta[cid] ?? 0) + 1;
    }
  }

  return { ts: Date.now(), stamp: getCurrentStamp(), byEmail, byCuenta };
}

/* ===================== UI helpers ===================== */
function copyToClipboard(text: string) {
  try {
    navigator.clipboard?.writeText?.(text);
  } catch {}
}
function downloadJson(filename: string, obj: any) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
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

  const { plataformas, loading: platLoading, error: platError } = usePlataformas();

  /* ====== Map id->nombre ====== */
  const plataformaMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const p of plataformas) m.set(p.id, (p as any).nombre ?? String(p.id));
    return m;
  }, [plataformas]);

  const lastPlatformId = useMemo<number | null>(() => {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(LAST_PLATFORM_KEY) : null;
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
    setOrders((prev) => prev.map((o, i) => (i === idx ? { ...o, ...patch } : o)));
  };

  /* ===== Autoselección inicial de plataforma en el primer bloque ===== */
  useEffect(() => {
    if (platLoading || platError || !plataformasOrdered.length) return;
    setOrders((prev) => {
      if (!prev.length) return [makeEmptyOrder(plataformasOrdered[0]!.id)];
      const first = prev[0]!;
      if (first.plataforma_id !== 0) return prev;
      return [{ ...first, plataforma_id: plataformasOrdered[0]!.id }, ...prev.slice(1)];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plataformasOrdered, platLoading, platError]);

  /* ===== Prefetch usuarios + stamp polling ===== */
  useEffect(() => {
    ensureUsersAllLoaded();
  }, []);

  useEffect(() => {
    let alive = true;
    refreshStampOnce();

    const onStorage = (e: StorageEvent) => {
      if (!alive) return;
      if (e.key === LS_STAMP_P || e.key === STAMP_KEY_ALL) {
        // lectura de caches ya verifica stamp
      }
    };
    window.addEventListener("storage", onStorage);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(BC_NAME);
      bc.onmessage = (ev) => {
        if (ev?.data?.type === "invalidate-pantallas") {
          refreshStampOnce();
        }
      };
    } catch {}

    const onFocus = () => refreshStampOnce();
    window.addEventListener("focus", onFocus);

    const id = window.setInterval(() => refreshStampOnce(), STAMP_POLL_MS);

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
          (r: any) => normalizeContacto(String(r?.contacto ?? "")) === norm
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


  
  /* ===== Ensure usuario ===== */
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
      }
    } catch {}
  }

  /* ===== Ensure cuenta compartida ===== */
  async function ensureCuentaCompartida(
    correo: string,
    plataformaId: number,
    pass: string | null,
    proveedor: string | null
  ) {
    const key = normalizeEmail(correo);
    const pid = plataformaId;

    const cached = getAcctMap(pid)?.[key];
    if (cached?.id) return { id: cached.id };

    const res = await fetch("/api/cuentascompartidas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plataforma_id: pid,
        correo,
        contrasena: pass || null,
        proveedor: proveedor || null,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j?.error ?? "No se pudo crear la cuenta compartida");
    }
    const saved: Cuenta = await res.json();

    const base = getAcctMap(pid) || {};
    base[key] = { id: saved.id, pass: pass || null };
    writeAcctCache(pid, base);

    await refreshStampOnce();
    return { id: saved.id };
  }

  /* ===== Slots por bloque ===== */
  const [availableSlotsByIdx, setAvailableSlotsByIdx] = useState<number[][]>([]);
  const [loadingSlotsByIdx, setLoadingSlotsByIdx] = useState<boolean[]>([]);
  const [slotsErrorByIdx, setSlotsErrorByIdx] = useState<(string | null)[]>([]);

  const ensureIdxArrays = (len: number) => {
    setAvailableSlotsByIdx((p) => (p.length >= len ? p : [...p, ...Array(len - p.length).fill([])]));
    setLoadingSlotsByIdx((p) => (p.length >= len ? p : [...p, ...Array(len - p.length).fill(false)]));
    setSlotsErrorByIdx((p) => (p.length >= len ? p : [...p, ...Array(len - p.length).fill(null)]));
  };
  useEffect(() => {
    ensureIdxArrays(orders.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders.length]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      for (let idx = 0; idx < orders.length; idx++) {
        const o = orders[idx];
        const pid = o.plataforma_id;
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

        setLoadingSlotsByIdx((p) => {
          const a = [...p];
          a[idx] = true;
          return a;
        });
        setSlotsErrorByIdx((p) => {
          const a = [...p];
          a[idx] = null;
          return a;
        });

        try {
          const plat = plataformas.find((p) => Number(p.id) === Number(pid));
          const maxAllowed = plat ? resolveMaxPantallas(plat as any) : 0;

          const rows = await fetchPantallasByEmailOrCuenta(
            email,
            o.cuenta_id ?? undefined,
            pid
          );

          const taken = new Set<number>();
          for (const r of rows) {
            const raw = (r?.nro_pantalla ?? "").toString().trim();
            const n = Number(raw);
            if (Number.isInteger(n) && n >= 1) taken.add(n);
          }

          const free: number[] = [];
          for (let i = 1; i <= maxAllowed; i++) if (!taken.has(i)) free.push(i);

          if (cancelled) return;

          setAvailableSlotsByIdx((p) => {
            const a = [...p];
            a[idx] = free;
            return a;
          });

          if (o.nro_pantalla && !free.includes(Number(o.nro_pantalla))) {
            setOrder(idx, { nro_pantalla: "" });
          }
        } catch (e: any) {
          setSlotsErrorByIdx((p) => {
            const a = [...p];
            a[idx] = e?.message ?? "No se pudieron calcular pantallas disponibles";
            return a;
          });
          setAvailableSlotsByIdx((p) => {
            const a = [...p];
            a[idx] = [];
            return a;
          });
        } finally {
          setLoadingSlotsByIdx((p) => {
            const a = [...p];
            a[idx] = false;
            return a;
          });
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    orders.map((o) => `${o.plataforma_id}:${o.correo}:${o.cuenta_id}`).join("|"),
    plataformas,
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
      })
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
      })
    );
  }, [orders.map((o) => `${o.total_pagado}:${o.total_pagado_proveedor}`).join("|")]);

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

  async function loadEmailsForPid(pid: number) {
    if (!pid) return;
    ensurePerPidInit(pid);

    setPerPid((s) => ({
      ...s,
      [pid]: { ...(s[pid] ?? ({} as any)), loading: true, error: null },
    }));

    try {
      // caches LS
      let acctMap = getAcctMap(pid);
      let invMap = getInvMap(pid);

      const needsAcct = !acctMap;
      const needsInv = !invMap;

      if (needsAcct || needsInv) {
        const [acctRes, invRes] = await Promise.all([
          needsAcct
            ? fetch(`/api/cuentascompartidas?plataforma_id=${pid}&limit=10000`, {
                cache: "no-store",
              })
            : null,
          needsInv
            ? fetch(`/api/inventario?plataforma_id=${pid}&limit=10000`, {
                cache: "no-store",
              })
            : null,
        ]);

        if (needsAcct) {
          if (!acctRes || !acctRes.ok) throw new Error("No se pudieron cargar cuentas");
          const acctRows: Cuenta[] = await acctRes.json();
          const m: Record<string, AcctEntry> = {};
          for (const r of acctRows) {
            const c = normalizeEmail((r as any)?.correo ?? "");
            if (!c) continue;
            m[c] = { id: Math.max(m[c]?.id ?? 0, r.id), pass: (r as any).contrasena ?? null };
          }
          writeAcctCache(pid, m);
          acctMap = m;
        }

        if (needsInv) {
          if (!invRes || !invRes.ok) throw new Error("No se pudo cargar inventario");
          const invRows: InventarioItem[] = await invRes.json();
          const m: Record<string, InvEntry> = {};
          for (const it of invRows) {
            const c = normalizeEmail(it?.correo ?? "");
            if (!c) continue;
            m[c] = { id: it.id, pass: (it as any).clave ?? null };
          }
          writeInvCache(pid, m);
          invMap = m;
        }
      }

      const nextAcctId: Record<string, number> = {};
      const nextAcctPass: Record<string, string | null> = {};
      for (const [email, entry] of Object.entries(acctMap!)) {
        nextAcctId[email] = entry.id!;
        nextAcctPass[email] = entry.pass ?? null;
      }

      const nextInvPass: Record<string, string | null> = {};
      const nextInvId: Record<string, number> = {};
      for (const [email, entry] of Object.entries(invMap!)) {
        nextInvPass[email] = entry.pass ?? null;
        if (entry?.id != null) nextInvId[email] = entry.id!;
      }

      const cap = capacityForPlatform(pid, plataformas) ?? 0;
      if (!cap || cap <= 0) {
        setPerPid((s) => ({
          ...s,
          [pid]: {
            ...(s[pid] ?? ({} as any)),
            acctIdMap: nextAcctId,
            acctPassMap: nextAcctPass,
            invPassMap: nextInvPass,
            invIdMap: nextInvId,
            options: [],
            freeByEmail: {},
            emailCounts: {},
            loading: false,
            error: null,
          },
        }));
        return;
      }

      let sum = getPantSum(pid);
      if (!sum) {
        sum = await buildPantSumForPlatform(pid);
        writePantSum(pid, sum);
      }

      type Cand = { email: string; source: "acct" | "inv"; cuentaId?: number | null };
      const seen = new Set<string>();
      const candidates: Cand[] = [];

      for (const [email, entry] of Object.entries(acctMap!)) {
        const e = email.toLowerCase();
        if (seen.has(e)) continue;
        seen.add(e);
        candidates.push({ email: e, source: "acct", cuentaId: entry.id ?? null });
        if (candidates.length >= 50) break;
      }
      if (candidates.length < 50) {
        for (const email of Object.keys(invMap!)) {
          const e = email.toLowerCase();
          if (seen.has(e)) continue;
          seen.add(e);
          candidates.push({ email: e, source: "inv", cuentaId: null });
          if (candidates.length >= 50) break;
        }
      }

      const freeMap: Record<string, number | null> = {};
      const emailCountsLocal: Record<string, number> = {};

      for (const c of candidates.slice(0, 40)) {
        const used =
          c.source === "acct" && c.cuentaId
            ? sum.byCuenta[c.cuentaId] ?? 0
            : sum.byEmail[c.email] ?? 0;

        const free = Math.max(0, cap - used);
        const key = `${pid}::${c.source}::${c.email}`;
        freeMap[key] = free;

        if (emailCountsLocal[c.email] == null) {
          emailCountsLocal[c.email] = sum.byEmail[c.email] ?? 0;
        }
      }

      const withFree = candidates.filter(({ email, source }) => {
        const key = `${pid}::${source}::${email}`;
        const f = freeMap[key];
        return typeof f === "number" && f > 0;
      });

      const ordered = withFree.sort((a, b) =>
        a.source === b.source ? 0 : a.source === "acct" ? -1 : 1
      );

      setPerPid((s) => ({
        ...s,
        [pid]: {
          ...(s[pid] ?? ({} as any)),
          acctIdMap: nextAcctId,
          acctPassMap: nextAcctPass,
          invPassMap: nextInvPass,
          invIdMap: nextInvId,
          options: ordered.slice(0, 20),
          freeByEmail: freeMap,
          emailCounts: emailCountsLocal,
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
          (o) => !(o.source === "acct" && o.email === email)
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


      const plataformaOk = Number.isInteger(o.plataforma_id) && o.plataforma_id > 0;
      const fechasOk = !!o.fecha_compra && !!o.fecha_vencimiento;
      const estadoOk = (o.estado ?? "").trim() !== "";
      const mesesOk = Number.isInteger(o.meses_pagados) && o.meses_pagados >= 1;

      const correoOk =
        o.correo.trim() !== "" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(o.correo.trim());
      const passOk = (o.contrasena ?? "").trim() !== "";

      const totalOk =
        o.total_pagado === "" ||
        (!Number.isNaN(Number(o.total_pagado)) && Number(o.total_pagado) >= 0);
      const totalProvOk =
        !o.total_pagado_proveedor ||
        (!Number.isNaN(Number(o.total_pagado_proveedor)) &&
          Number(o.total_pagado_proveedor) >= 0);

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
  }, [user, orders, availableSlotsByIdx,loadingSlotsByIdx]);

  /* ===== Payload por bloque ===== */
  const buildPayloadFor = (o: OrderState, cuentaIdFinal: number | null) => {
    const totalPag = toNumOrNull(o.total_pagado);
    const totalProv = toNumOrNull(o.total_pagado_proveedor);
    const totalGan =
      totalPag == null ? null : totalProv == null ? totalPag : totalPag - totalProv;

    return {
      cuenta_id: cuentaIdFinal ?? null,
      contacto: normalizeContacto(user.contacto.trim()),
      nombre: (user.nombre ?? "").trim() || null,

      nro_pantalla: String(o.nro_pantalla ?? "").trim() || null,
      plataforma_id: o.plataforma_id,
      correo: o.correo.trim().toLowerCase() || null,
      contrasena: o.contrasena || null,
      proveedor: (o.proveedor ?? "").trim() || null,

      fecha_compra: o.fecha_compra ? new Date(o.fecha_compra).toISOString() : null,
      fecha_vencimiento: o.fecha_vencimiento
        ? new Date(o.fecha_vencimiento).toISOString()
        : null,

      meses_pagados: o.meses_pagados,

      total_pagado: totalPag == null ? null : Number(totalPag.toFixed(2)),
      total_pagado_proveedor: totalProv == null ? null : Number(totalProv.toFixed(2)),
      pago_total_proveedor: totalProv == null ? null : Number(totalProv.toFixed(2)),
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
      setErrMsg("Revisa los campos obligatorios y cupos/pantallas disponibles.");
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
            (o.proveedor ?? "") || null
          );
          cuentaId = id;
        }
        payloads.push(buildPayloadFor(o, cuentaId));
      }

      setConfirmPayload(payloads);
      setConfirmOrders(orders);
      setConfirmText(JSON.stringify(payloads, null, 2));
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
          })
        )
      );

      const ok = results.filter((r) => r.status === "fulfilled") as PromiseFulfilledResult<any>[];
      const bad = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];

      // si venían de inventario: borrar por bloque usando selectedInvId
      for (let i = 0; i < ok.length; i++) {
        const sent = ok[i].value.sent;
        // buscamos el índice por match plataforma+correo+nro_pantalla (mejor esfuerzo)
        const idx = confirmOrders.findIndex(
          (o) =>
            Number(o.plataforma_id) === Number(sent?.plataforma_id) &&
            normalizeEmail(o.correo) === normalizeEmail(sent?.correo ?? "") &&
            String(o.nro_pantalla) === String(sent?.nro_pantalla ?? "")
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

      await refreshStampOnce();

      if (bad.length) {
        setErrMsg(
          `Se guardaron ${ok.length}/${toSend.length}. Fallaron: ` +
            bad
              .map((b: any, i) => `#${i + 1} (${b.reason?.message ?? "error"})`)
              .join(" | ")
        );
      } else {
        const ids = ok.map((x) => x.value.saved?.id).filter(Boolean).join(", ");
        setOkMsg(`Guardado correctamente (${ok.length}). IDs: ${ids}`);
      }

      setConfirmOpen(false);

      // recordar última plataforma del lote
      try {
        const last = toSend[toSend.length - 1];
        if (last?.plataforma_id) {
          window.localStorage.setItem(LAST_PLATFORM_KEY, String(last.plataforma_id));
        }
      } catch {}

      // reset UI
      const base = todayStr();
      const stored =
        typeof window !== "undefined" ? window.localStorage.getItem(LAST_PLATFORM_KEY) : null;
      const lastId = stored ? Number(stored) : NaN;
      const nextPlat =
        Number.isFinite(lastId) && lastId > 0 ? lastId : plataformasOrdered[0]?.id ?? 0;

      setUser({ contacto: "", nombre: "" });
      setOrders([makeEmptyOrder(nextPlat)]);
      setNombreDirty(false);
      lastContactoRef.current = "";
      setEmailOpenIdx(null);
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
    const count = pid && perPid[pid]?.emailCounts?.[email] != null ? perPid[pid]!.emailCounts[email] : 0;

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
                if (/^\+?\d*(?:\s?\d*)*$/.test(v)) setUser((s) => ({ ...s, contacto: v }));
              }}
              required
              inputMode="numeric"
              pattern="^\+\d+(?:\s*\d+)*$"
              title="Formato válido: + seguido de números"
              onInvalid={(e: any) =>
                e.currentTarget.setCustomValidity("Ingresa un teléfono en formato + y solo números")
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
                const pid = orders[orders.length - 1]?.plataforma_id || plataformasOrdered[0]?.id || 0;
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
    !pid || !pidCache
      ? []
      : (pidCache.options ?? []).filter(({ email, source }) => {
          const key = `${pid}::${source}::${email}`;
          const free = pidCache.freeByEmail?.[key];
          return typeof free === "number" && free > 0;
        });

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
              if (newPid) loadEmailsForPid(newPid).catch(() => {});
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
              e.currentTarget.setCustomValidity("Ingresa un correo válido")
            }
            onInput={(e: any) => e.currentTarget.setCustomValidity("")}
            inputClassName="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
          />

          {emailOpenIdx === idx && pid && (
            <div className="absolute left-0 right-0 z-20 mt-1 rounded-lg border border-neutral-700 bg-neutral-900 text-sm text-neutral-100 shadow-lg"
            onClick={(e) => e.stopPropagation()}  >
              
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

                    if (!(typeof free === "number" && free > 0)) return null;

                    return (
                      <li key={`${source}-${email}`}>
                        <div className="flex w-full items-center justify-between px-3 py-2 hover:bg-neutral-800">
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              if (!pidCache) return;

                              if (source === "inv") {
                                const pass = pidCache.invPassMap[email] ?? null;
                                const invId = pidCache.invIdMap[email] ?? null;

                                setOrder(idx, {
                                  correo: email,
                                  contrasena: o.contrasena || pass || "",
                                  cuenta_id: null,
                                  selectedEmailSource: "inv",
                                  selectedInvId: invId,
                                  nro_pantalla: "",
                                });
                              } else {
                                const cid = pidCache.acctIdMap[email];
                                const pass = pidCache.acctPassMap[email];
                                setOrder(idx, {
                                  correo: email,
                                  cuenta_id: cid ?? o.cuenta_id,
                                  contrasena: o.contrasena || pass || "",
                                  selectedEmailSource: "acct",
                                  selectedInvId: null,
                                  nro_pantalla: "",
                                });
                              }

                              setEmailOpenIdx(null);
                            }}
                            className="flex-1 min-w-0 text-left"
                          >
                            <span className="truncate">{email}</span>
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
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteCuentaCompartidaByEmail(pid, email);
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
            e.currentTarget.setCustomValidity("La contraseña es obligatoria")
          }
          onInput={(e: any) => e.currentTarget.setCustomValidity("")}
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
            onChange={(e) => setOrder(idx, { nro_pantalla: e.target.value })}
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
              meses_pagados: Number.isFinite(n) ? Math.max(1, n) : 1,
            });
          }}
          placeholder="Ej. 1"
          required
          inputClassName="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
        />

        <FieldPantallas
          label="Total pagado"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          placeholder="0.00"
          value={o.total_pagado}
          onChange={(v: string) => setOrder(idx, { total_pagado: v })}
          inputClassName="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
        />

        <FieldPantallas
          label="Total pagado proveedor (opcional)"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          placeholder="0.00"
          value={o.total_pagado_proveedor ?? ""}
          onChange={(v: string) => setOrder(idx, { total_pagado_proveedor: v })}
          inputClassName="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
        />

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
                Number.isFinite(lastId) && lastId > 0 ? lastId : plataformasOrdered[0]?.id ?? 0;

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
                    Se guardan todas las compras en una sola acción (varios POST).
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
            <div className="px-5 pt-4 pb-3 flex items-center justify-between gap-2 border-b border-neutral-800">
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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="text-sm px-3 py-1.5 rounded-lg border border-neutral-700 hover:bg-neutral-800"
                  onClick={() => copyToClipboard(confirmText)}
                >
                  Copiar JSON
                </button>
                <button
                  type="button"
                  className="text-sm px-3 py-1.5 rounded-lg border border-neutral-700 hover:bg-neutral-800"
                  onClick={() => {
                    let obj = confirmPayload;
                    try {
                      const maybe = JSON.parse(confirmText);
                      if (Array.isArray(maybe)) obj = maybe;
                    } catch {}
                    downloadJson("pantallas_lote.json", obj);
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
                  <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h4 className="font-semibold text-sm text-neutral-200">
                        Pedido completo (todas las compras)
                      </h4>

                      <button
                        type="button"
                        className="text-xs px-2 py-1 rounded-md border border-neutral-700 hover:bg-neutral-800"
                        onClick={() => {
                          const txt = buildPedidoResumenFull(confirmPayload, plataformaMap, confirmOrders);
                          copyToClipboard(txt);
                        }}
                      >
                        Copiar ticket completo
                      </button>
                    </div>

                    <pre className="whitespace-pre-wrap break-words text-sm font-mono bg-neutral-950/70 border border-neutral-800 rounded-lg p-3 overflow-auto">
                      {buildPedidoResumenFull(confirmPayload, plataformaMap, confirmOrders)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
                <div>
                  <p className="text-sm text-neutral-300 mb-2">
                    Puedes editar el texto antes de confirmar. Se enviará exactamente este JSON.
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
