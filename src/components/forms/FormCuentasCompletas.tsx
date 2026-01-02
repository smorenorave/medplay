// src/components/forms/FormCuentaCompletas.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Field from "@/components/ui/Field";
import TextArea from "@/components/ui/TextArea";
import { normalizeContacto } from "@/lib/strings";
import { todayStr } from "@/lib/dates";
import { usePlataformas } from "@/hooks/usePlataformas";

/* 🔁 Cache/bus existentes para cuentas completas */
import { mergeCuentaCompletaIntoCache } from "@/lib/cuentasAll";
import {
  notifyCuentasChanged,
  subscribeCuentasChanges,
} from "@/lib/cuentasMutationBus";

/* ===================== Tipos ===================== */
type Usuario = { contacto: string; nombre: string | null };
type InventarioRow = {
  id: number;
  plataforma_id?: number | null;
  correo?: string | null;
  clave?: string | null;
};

type FormState = {
  contacto: string;
  nombre: string | "";
  plataforma_id: number;
  correo: string;
  contrasena: string;
  proveedor: string | "";
  fecha_compra: string | "";
  fecha_vencimiento: string | "";
  meses_pagados: number;
  total_pagado: string;
  total_pagado_proveedor: string;
  estado: string | "";
  comentario: string | "";
};

// ✅ NUEVO: usuario separado
type UserState = { contacto: string; nombre: string | "" };

// ✅ NUEVO: “compra/bloque” (todo menos usuario)
type OrderState = Omit<FormState, "contacto" | "nombre">;

// Solo inventario
type EmailSuggestion = {
  email: string;
  invId: number | null;
  invClave: string | null;
};

/* ===================== Constantes ===================== */
const CONTACTO_MIN_LEN = 5;
const EMAIL_MIN_LEN = 5;
const SUGGEST_LIMIT = 20;
const LAST_PLATFORM_KEY = "cuentascompletas:lastPlatformId";

/* TTLs y claves de LS */
const USERS_ALL_CACHE_TTL = 30 * 60_000; // 30 min
const STAMP_POLL_MS = 30_000;

const LS_USERS_ALL = "__usuarios_all_cache_v1"; // { map, ts }
const LS_INV_PREFIX = "__cc_inv_cache_v1:"; // por plataforma { map, ts, stamp }
const STAMP_KEY_CC = "__stamp_cuentas_all"; // guarda último stamp de /api/cuentascompletas/stamp
const LIST_CACHE_TTL = 5 * 60_000; // 5 min listas de inventario (mantener)

/* ===================== Utils ===================== */
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
  const out = new Date(tmp.getFullYear(), tmp.getMonth(), day);
  return toLocalDateStr(out);
}
const toMoney = (n: number | null) =>
  n == null || Number.isNaN(n) ? "—" : new Intl.NumberFormat().format(n);
const normalizeEmail = (s: string) => s.trim().toLowerCase();
const hasWindow = () => typeof window !== "undefined";

/* ===================== LS helpers ===================== */
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

/* ===================== STAMP (/api/cuentascompletas/stamp) ===================== */
function getCurrentCuentasStamp(): number {
  if (!hasWindow()) return 0;
  const s = window.localStorage.getItem(STAMP_KEY_CC);
  return s ? Number(s) || 0 : 0;
}
async function refreshCuentasStampOnce(): Promise<number> {
  try {
    const r = await fetch("/api/cuentascompletas/stamp", { cache: "no-store" });
    const j = await r.json().catch(() => ({ stamp: 0 }));
    const n = Number(j?.stamp) || 0;
    try {
      window.localStorage.setItem(STAMP_KEY_CC, String(n));
    } catch {}
    return n;
  } catch {
    return getCurrentCuentasStamp();
  }
}

/* ===== Helpers Ticket (FormCuentaCompletas) ===== */
const fmtDateHumanCC = (yyyyMmDdOrIso?: string | null) => {
  if (!yyyyMmDdOrIso) return "—";
  const d = /^\d{4}-\d{2}-\d{2}$/.test(yyyyMmDdOrIso)
    ? parseLocalDateStr(yyyyMmDdOrIso)
    : new Date(yyyyMmDdOrIso);
  if (!d || Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
};
const fmtMoneyClientCC = (n?: number | null) =>
  n == null || Number.isNaN(Number(n))
    ? "—"
    : new Intl.NumberFormat("es-CO").format(Number(n));

/** Solo datos (sin agradecimiento) */
function buildHandoffTextCC(
  payload: any,
  plataformaMap: Map<number, string>,
  order: any
) {
  const platName =
    plataformaMap.get(payload?.plataforma_id) ??
    `#${payload?.plataforma_id ?? "—"}`;
  return [
    `Plataforma: ${platName}`,
    `Correo: ${payload?.correo ?? "—"}`,
    `Clave: ${payload?.contrasena ?? "—"}`,
    `Fecha de compra: ${fmtDateHumanCC(order?.fecha_compra)}`,
    `Fecha de vencimiento: ${fmtDateHumanCC(order?.fecha_vencimiento)}`,
    `Meses pagados: ${order?.meses_pagados ?? "—"}`,
    `Total pagado: ${fmtMoneyClientCC(payload?.total_pagado)}`,
  ].join("\n");
}

/** Texto completo para mostrar/copiar/descargar */
function buildHandoffFullCC(
  payload: any,
  plataformaMap: Map<number, string>,
  order: any
) {
  return (
    buildHandoffTextCC(payload, plataformaMap, order) +
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

function buildPedidoResumenTextCC(
  payloads: any[],
  plataformaMap: Map<number, string>,
  orders: any[]
) {
  const lines: string[] = [];

  lines.push("🧾 RESUMEN DE TU PEDIDO");
  lines.push("");

  let totalPagado = 0;
  let totalProveedor = 0;
  let totalGanado = 0;

  payloads.forEach((p, i) => {
    const order = orders?.[i];
    const platName =
      plataformaMap.get(p?.plataforma_id) ??
      `#${p?.plataforma_id ?? "—"}`;

    const tp = Number(p?.total_pagado) || 0;
    const tpp = Number(p?.total_pagado_proveedor) || 0;
    const tg = Number(p?.total_ganado) || 0;

    totalPagado += tp;
    totalProveedor += tpp;
    totalGanado += tg;

    lines.push(`• COMPRA #${i + 1}`);
    lines.push(`Plataforma: ${platName}`);
    lines.push(`Correo: ${p?.correo ?? "—"}`);
    lines.push(`Clave: ${p?.contrasena ?? "—"}`);
    lines.push(`Fecha de compra: ${fmtDateHumanCC(order?.fecha_compra)}`);
    lines.push(`Fecha de vencimiento: ${fmtDateHumanCC(order?.fecha_vencimiento)}`);
    lines.push(`Meses pagados: ${order?.meses_pagados ?? "—"}`);
    lines.push(`Total: ${fmtMoneyClientCC(tp)}`);
    lines.push("");
  });

  lines.push("💰 TOTALES DEL PEDIDO");
  lines.push(`Total pagado: ${fmtMoneyClientCC(totalPagado)}`);
  return lines.join("\n");
}


function buildPedidoResumenFullCC(
  payloads: any[],
  plataformaMap: Map<number, string>,
  orders: any[]
) {
  return (
    buildPedidoResumenTextCC(payloads, plataformaMap, orders) +
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



/* ===================== Usuarios: catálogo completo (una sola vez) ===================== */
type UsersAllCache = { map: Record<string, Usuario>; ts: number };
function readUsersAll(): UsersAllCache | null {
  return readLS<UsersAllCache>(LS_USERS_ALL);
}
function usersAllFresh(c: UsersAllCache | null): boolean {
  if (!c) return false;
  return Date.now() - c.ts <= USERS_ALL_CACHE_TTL;
}
/** Devuelve Usuario | null | undefined */
function getUserFromAllCache(norm: string): Usuario | null | undefined {
  const c = readUsersAll();
  if (!usersAllFresh(c)) return undefined;
  const u = c!.map[norm];
  return u ?? null;
}
async function ensureUsersAllLoaded() {
  const c = readUsersAll();
  if (usersAllFresh(c)) return;
  const urls = [
    "/api/usuarios?limit=100000",
    "/api/usuarios?limit=50000",
    "/api/usuarios",
  ];
  let arr: Usuario[] = [];
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      const data = await res.json();
      const list = Array.isArray(data)
        ? data
        : Array.isArray((data as any)?.items)
        ? (data as any).items
        : [];
      if (list?.length) {
        arr = list;
        break;
      }
    } catch {}
  }
  const map: Record<string, Usuario> = {};
  for (const u of arr) {
    const k = normalizeContacto(String(u.contacto ?? ""));
    if (!k) continue;
    map[k] = u;
  }
  writeLS(LS_USERS_ALL, { map, ts: Date.now() } as UsersAllCache);
}

/* ===================== Cache: inventario por plataforma ===================== */
type InvEntry = { pass: string | null; id?: number };
type InvCacheShape = {
  map: Record<string, InvEntry>;
  ts: number;
  stamp: number;
};
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
    stamp: getCurrentCuentasStamp(),
  } as InvCacheShape);
}
function getInvMap(pid: number): Record<string, InvEntry> | null {
  const c = readInvCache(pid);
  if (!c) return null;
  const sameStamp = c.stamp === getCurrentCuentasStamp();
  const fresh = Date.now() - c.ts <= LIST_CACHE_TTL;
  return sameStamp && fresh ? c.map : null;
}

/* ==================== Parser de respuestas ===================== */
async function parseListResponse(res: Response): Promise<any[]> {
  const data = await res.json().catch(() => null);
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray((data as any).items)) return (data as any).items;
  return [];
}

/* ===================== Componente ===================== */
export default function FormCuentaCompletas() {
  const compraHoy = todayStr();

  const {
    plataformas,
    loading: platLoading,
    error: platError,
  } = usePlataformas();

  /* ===== Plataforma: map y orden ===== */
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

  /* Default contraseña 'youtube' si aplica */
  const isYouTube = (id?: number) => {
    const name = (id ? plataformaMap.get(id) : "") || "";
    return /youtube/i.test(name);
  };

  // ✅ NUEVO: constructor de orden
  const makeEmptyOrder = (plataforma_id: number): OrderState => {
    const pid = plataforma_id || 0;
    return {
      plataforma_id: pid,
      correo: "",
      contrasena: isYouTube(pid) ? "youtube" : "",
      proveedor: "",
      fecha_compra: compraHoy,
      fecha_vencimiento: addMonthsLocal(compraHoy, 1),
      meses_pagados: 1,
      total_pagado: "",
      total_pagado_proveedor: "",
      estado: "ACTIVA",
      comentario: "",
    };
  };

  // ✅ NUEVO: usuario separado
  const [user, setUser] = useState<UserState>({
    contacto: "",
    nombre: "",
  });

  // ✅ NUEVO: múltiples compras
  const [orders, setOrders] = useState<OrderState[]>(() => [
    makeEmptyOrder(0),
  ]);

  // helper para editar un bloque
  const setOrder = (idx: number, patch: Partial<OrderState>) => {
    setOrders((prev) =>
      prev.map((o, i) => (i === idx ? { ...o, ...patch } : o))
    );
  };

  // ✅ NUEVO: autoselección inicial (solo si pid 0 en el primer bloque)
  useEffect(() => {
    if (platLoading || platError || !plataformasOrdered.length) return;

    setOrders((prev) => {
      if (!prev.length) return [makeEmptyOrder(plataformasOrdered[0]!.id)];
      const first = prev[0]!;
      if (first.plataforma_id !== 0) return prev;
      const pid = plataformasOrdered[0]!.id;
      const next0 = { ...first, plataforma_id: pid };
      if (!next0.contrasena && isYouTube(pid)) next0.contrasena = "youtube";
      return [next0, ...prev.slice(1)];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plataformasOrdered, platLoading, platError]);

  // ✅ NUEVO: asegurar “youtube” por bloque cuando cambia plataforma
  useEffect(() => {
    setOrders((prev) =>
      prev.map((o) => {
        if (!o.plataforma_id) return o;
        if (!o.contrasena && isYouTube(o.plataforma_id)) {
          return { ...o, contrasena: "youtube" };
        }
        return o;
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plataformaMap]);

  useEffect(() => {
    ensureUsersAllLoaded();
  }, []);

  /* ===== Stamp polling & suscripción a cambios ===== */
  useEffect(() => {
    let unsub: (() => void) | null = null;
    refreshCuentasStampOnce(); // primer refresh
    try {
      unsub = subscribeCuentasChanges(() => {
        refreshCuentasStampOnce();
      });
    } catch {}
    const onFocus = () => refreshCuentasStampOnce();
    window.addEventListener("focus", onFocus);
    const id = window.setInterval(() => {
      refreshCuentasStampOnce();
    }, STAMP_POLL_MS);
    return () => {
      unsub?.();
      window.removeEventListener("focus", onFocus);
      clearInterval(id);
    };
  }, []);

  /* ===== Nombre: control de edición manual y autocompletado por catálogo + fallback ===== */
  const [nombreDirty, setNombreDirty] = useState(false);
  const lastContactoRef = useRef<string>("");

  useEffect(() => {
    const raw = user.contacto.trim();
    const norm = normalizeContacto(raw);

    // contacto cambió → habilitar nuevo autocompletado
    if ((norm || "") !== lastContactoRef.current) {
      lastContactoRef.current = norm || "";
      setNombreDirty(false);
      setUser((s) => ({ ...s, nombre: "" }));
    }

    if (!norm || norm.length < CONTACTO_MIN_LEN) return;

    let canceled = false;

    const run = async () => {
      // 1) Catálogo de usuarios (rápido si está en cache)
      if (getUserFromAllCache(norm) === undefined) {
        await ensureUsersAllLoaded();
      }
      const u = getUserFromAllCache(norm);

      if (!canceled && !nombreDirty && u && (u.nombre ?? "") !== "") {
        setUser((s) => ({ ...s, nombre: u.nombre ?? "" }));
        return;
      }

      // 2) Fallback: buscar en cuentascompletas por contacto exacto
      try {
        const res = await fetch(
          `/api/cuentascompletas?q=${encodeURIComponent(norm)}&limit=200`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error("No se pudo consultar cuentascompletas");
        const rows = await parseListResponse(res);

        const same = rows.filter(
          (r: any) => normalizeContacto(String(r?.contacto ?? "")) === norm
        );

        const names = same
          .map((r: any) => String(r?.nombre ?? "").trim())
          .filter((n: string) => n.length > 0);

        let bestName = "";
        if (names.length) {
          const freq = new Map<string, number>();
          for (const n of names) freq.set(n, (freq.get(n) || 0) + 1);
          bestName = [...freq.entries()].sort((a, b) => b[1] - a[1])[0]![0];
        } else {
          const withName = same
            .filter((r: any) => String(r?.nombre ?? "").trim().length > 0)
            .sort((a: any, b: any) => Number(b?.id ?? 0) - Number(a?.id ?? 0));
          if (withName.length) bestName = String(withName[0].nombre).trim();
        }

        if (!canceled && !nombreDirty && bestName) {
          setUser((s) => ({ ...s, nombre: bestName }));

          const cur = readUsersAll() || { map: {}, ts: 0 };
          cur.map[norm] = { contacto: norm, nombre: bestName };
          cur.ts = Date.now();
          writeLS(LS_USERS_ALL, cur);
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

  /* ===== Mensajería + modal ===== */
  const [loading, setLoading] = useState(false);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPayload, setConfirmPayload] = useState<any>(null);
  const [confirmText, setConfirmText] = useState<string>("");
  const [confirmView, setConfirmView] = useState<"resumen" | "json">("resumen");

  // ✅ NUEVO: confirmOrders para mostrar resumen por bloque
  const [confirmOrders, setConfirmOrders] = useState<OrderState[]>([]);

  /* ===== Inventario (por bloque) ===== */
  const [emailOpenIdx, setEmailOpenIdx] = useState<number | null>(null);
  const [emailOptsByIdx, setEmailOptsByIdx] = useState<EmailSuggestion[][]>([]);
  const [emailErrorByIdx, setEmailErrorByIdx] = useState<(string | null)[]>([]);
  const [isInvLoadingByIdx, setIsInvLoadingByIdx] = useState<boolean[]>([]);
  const [selectedInvIdByIdx, setSelectedInvIdByIdx] = useState<(number | null)[]>(
    []
  );


  // ✅ refs para centrar modal + reset scroll interno
const modalBoxRef = useRef<HTMLDivElement | null>(null);
const modalScrollRef = useRef<HTMLDivElement | null>(null);

useEffect(() => {
  if (!confirmOpen) return;

  // Espera a que el modal renderice
  requestAnimationFrame(() => {
    // centra el modal en pantalla
    modalBoxRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });

    // sube el scroll interno del modal al inicio
    if (modalScrollRef.current) {
      modalScrollRef.current.scrollTop = 0;
    }
  });
}, [confirmOpen]);

  // inventario cache en memoria por plataforma
  const [invIndexByPid, setInvIndexByPid] = useState<
    Record<number, Record<string, InvEntry>>
  >({});

  const ensureIdxArrays = (len: number) => {
    setEmailOptsByIdx((prev) =>
      prev.length >= len ? prev : [...prev, ...Array(len - prev.length).fill([])]
    );
    setEmailErrorByIdx((prev) =>
      prev.length >= len
        ? prev
        : [...prev, ...Array(len - prev.length).fill(null)]
    );
    setIsInvLoadingByIdx((prev) =>
      prev.length >= len
        ? prev
        : [...prev, ...Array(len - prev.length).fill(false)]
    );
    setSelectedInvIdByIdx((prev) =>
      prev.length >= len
        ? prev
        : [...prev, ...Array(len - prev.length).fill(null)]
    );
  };

  useEffect(() => {
    ensureIdxArrays(orders.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders.length]);

  async function fetchEmailsByPlatform(plataformaId: number) {
    if (!plataformaId) return {};

    // 1) LS cache
    const invMapLS = getInvMap(plataformaId);
    if (invMapLS) {
      setInvIndexByPid((s) => ({ ...s, [plataformaId]: invMapLS }));
      return invMapLS;
    }

    // 2) fetch inventario
    const resInv = await fetch(
      `/api/inventario?plataforma_id=${plataformaId}&limit=${SUGGEST_LIMIT * 100}`,
      { cache: "no-store" }
    );
    const rowsInv: InventarioRow[] = resInv.ok
      ? ((await parseListResponse(resInv)) as any[])
      : [];
    const m: Record<string, InvEntry> = {};
    for (const it of rowsInv) {
      const c = normalizeEmail(it?.correo ?? "");
      if (!c) continue;
      m[c] = { pass: (it as any)?.clave ?? null, id: Number(it?.id) };
    }
    writeInvCache(plataformaId, m);
    setInvIndexByPid((s) => ({ ...s, [plataformaId]: m }));
    return m;
  }

  const openEmailForIdx = async (idx: number) => {
    setEmailOpenIdx(idx);
    const pid = orders[idx]?.plataforma_id;
    if (!pid) return;
    try {
      setIsInvLoadingByIdx((p) => {
        const a = [...p];
        a[idx] = true;
        return a;
      });
      const invMap =
        invIndexByPid[pid] ?? (await fetchEmailsByPlatform(pid));

      const list: EmailSuggestion[] = Object.entries(invMap)
        .slice(0, SUGGEST_LIMIT)
        .map(([email, ent]) => ({
          email,
          invId: ent.id ?? null,
          invClave: ent.pass ?? null,
        }));

      setEmailOptsByIdx((p) => {
        const a = [...p];
        a[idx] = list;
        return a;
      });
      setEmailErrorByIdx((p) => {
        const a = [...p];
        a[idx] = null;
        return a;
      });
    } catch (e: any) {
      setEmailErrorByIdx((p) => {
        const a = [...p];
        a[idx] = e?.message ?? "No se pudieron cargar correos de inventario";
        return a;
      });
      setEmailOptsByIdx((p) => {
        const a = [...p];
        a[idx] = [];
        return a;
      });
    } finally {
      setIsInvLoadingByIdx((p) => {
        const a = [...p];
        a[idx] = false;
        return a;
      });
    }
  };

  const closeEmailDropdown = () => setTimeout(() => setEmailOpenIdx(null), 120);

  // ✅ por cada bloque: cuando cambia plataforma, precarga inventario y resetea flags del bloque
  useEffect(() => {
    orders.forEach((o, idx) => {
      const pid = o.plataforma_id;
      if (!pid) return;
      // precarga sin bloquear
      fetchEmailsByPlatform(pid).catch(() => {});
      setSelectedInvIdByIdx((p) => {
        const a = [...p];
        a[idx] = null;
        return a;
      });
      setEmailOptsByIdx((p) => {
        const a = [...p];
        a[idx] = [];
        return a;
      });
      setEmailErrorByIdx((p) => {
        const a = [...p];
        a[idx] = null;
        return a;
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders.map((o) => o.plataforma_id).join("|")]);

  // ✅ por cada bloque: al escribir correo, filtra dropdown y autocompleta clave desde inventario
  useEffect(() => {
    orders.forEach((o, idx) => {
      const pid = o.plataforma_id;
      if (!pid) return;

      const correo = normalizeEmail(o.correo.trim());
      const invIndex = invIndexByPid[pid] ?? {};

      // autocompletar desde inventario
      if (correo && invIndex[correo]) {
        const hit = invIndex[correo];
        setSelectedInvIdByIdx((p) => {
          const a = [...p];
          a[idx] = hit.id ?? null;
          return a;
        });

        if (hit.pass && !o.contrasena) {
          setOrder(idx, { contrasena: hit.pass || o.contrasena });
        }
      } else {
        setSelectedInvIdByIdx((p) => {
          const a = [...p];
          a[idx] = null;
          return a;
        });
      }

      // filtrar dropdown local
      const nextOpts: EmailSuggestion[] = [];
      if (correo.length >= EMAIL_MIN_LEN) {
        for (const [email, ent] of Object.entries(invIndex)) {
          if (email.includes(correo)) {
            nextOpts.push({
              email,
              invId: ent.id ?? null,
              invClave: ent.pass ?? null,
            });
            if (nextOpts.length >= SUGGEST_LIMIT) break;
          }
        }
      } else {
        for (const [email, ent] of Object.entries(invIndex)) {
          nextOpts.push({
            email,
            invId: ent.id ?? null,
            invClave: ent.pass ?? null,
          });
          if (nextOpts.length >= SUGGEST_LIMIT) break;
        }
      }

      setEmailOptsByIdx((p) => {
        const a = [...p];
        a[idx] = nextOpts;
        return a;
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders.map((o) => `${o.plataforma_id}:${o.correo}:${o.contrasena}`).join("|"), invIndexByPid]);

  /* ===================== Recalcular fecha de vencimiento por bloque ===================== */
  useEffect(() => {
    setOrders((prev) =>
      prev.map((o) => {
        const compra = o.fecha_compra;
        const meses = o.meses_pagados;
        if (!compra || !Number.isFinite(meses) || meses < 1) return o;
        const nueva = addMonthsLocal(compra, meses);
        return o.fecha_vencimiento === nueva ? o : { ...o, fecha_vencimiento: nueva };
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders.map((o) => `${o.fecha_compra}:${o.meses_pagados}`).join("|")]);

  /* ===================== Totales preview por bloque ===================== */
  const totalGanadoPreviewByIdx = useMemo(() => {
    return orders.map((o) => {
      const tpStr = o.total_pagado.trim();
      if (tpStr === "" || Number.isNaN(Number(tpStr))) return "";
      const tp = Number(tpStr);
      const tppStr = o.total_pagado_proveedor.trim();
      if (tppStr === "") return String(tp);
      if (Number.isNaN(Number(tppStr))) return "";
      const tpp = Number(tppStr);
      return String(tp - tpp);
    });
  }, [orders]);

  /* ===================== Validaciones ===================== */
  const canSubmit = useMemo(() => {
    const contactoOk = user.contacto.trim() !== "";
    if (!contactoOk) return false;
    if (!orders.length) return false;

    for (const o of orders) {
      const requiredOk =
        Number.isInteger(o.plataforma_id) &&
        o.plataforma_id > 0 &&
        o.correo.trim() !== "" &&
        o.contrasena.trim() !== "" &&
        Number.isInteger(o.meses_pagados) &&
        o.meses_pagados >= 1 &&
        !!o.fecha_compra &&
        !!o.fecha_vencimiento;

      if (!requiredOk) return false;

      const totalOk =
        o.total_pagado === "" ||
        (!Number.isNaN(Number(o.total_pagado)) && Number(o.total_pagado) >= 0);

      const totalProvOk =
        o.total_pagado_proveedor === "" ||
        (!Number.isNaN(Number(o.total_pagado_proveedor)) &&
          Number(o.total_pagado_proveedor) >= 0);

      if (!totalOk || !totalProvOk) return false;
    }
    return true;
  }, [user, orders]);

  /* ===================== Payload por bloque ===================== */
  const buildPayloadFor = (o: OrderState) => {
    const totalPagadoNum = o.total_pagado !== "" ? Number(o.total_pagado) : null;
    const totalProvNum =
      o.total_pagado_proveedor !== "" ? Number(o.total_pagado_proveedor) : null;
    const total_ganado =
      totalPagadoNum !== null
        ? totalProvNum !== null
          ? totalPagadoNum - totalProvNum
          : totalPagadoNum
        : null;

    return {
      contacto: normalizeContacto(user.contacto.trim()),
      nombre: user.nombre.trim() || null,
      plataforma_id: o.plataforma_id,
      correo: o.correo.trim().toLowerCase(),
      contrasena: o.contrasena || null,
      proveedor: o.proveedor.trim() || null,
      fecha_compra: o.fecha_compra || null,
      fecha_vencimiento: o.fecha_vencimiento || null,
      meses_pagados: o.meses_pagados,
      total_pagado: totalPagadoNum,
      total_pagado_proveedor: totalProvNum,
      total_ganado,
      estado: o.estado.trim() || null,
      comentario: o.comentario.trim() || null,
    };
  };

  /* ===================== Submit => abrir modal ===================== */
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setOkMsg(null);
    setErrMsg(null);

    if (!canSubmit) {
      setErrMsg("Revisa los campos obligatorios y formatos numéricos.");
      return;
    }

    const payloads = orders.map(buildPayloadFor);

    // ✅ (opcional pero útil) evitar duplicados plataforma+correo en el mismo guardado
    const keyset = new Set<string>();
    for (const p of payloads) {
      const k = `${p.plataforma_id}:${p.correo}`;
      if (keyset.has(k)) {
        setErrMsg(`Duplicado en el mismo guardado: ${k}`);
        return;
      }
      keyset.add(k);
    }

    setConfirmPayload(payloads);
    setConfirmOrders(orders);
    setConfirmText(JSON.stringify(payloads, null, 2));
    setConfirmView("resumen");
    setConfirmOpen(true);
  }

  /* ===================== Confirmar y guardar (todos) ===================== */
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
        toSend.map((p, idx) =>
          fetch("/api/cuentascompletas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(p),
          }).then(async (res) => {
            const j = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(j?.error ?? "No se pudo guardar");
            return { saved: j?.cuenta ?? j, idx, sent: p };
          })
        )
      );

      const ok = results.filter((r) => r.status === "fulfilled") as PromiseFulfilledResult<{
        saved: any;
        idx: number;
        sent: any;
      }>[];

      const bad = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];

      // preferencia de plataforma: última del lote
      try {
        const last = toSend[toSend.length - 1];
        if (last?.plataforma_id) {
          window.localStorage.setItem(LAST_PLATFORM_KEY, String(last.plataforma_id));
        }
      } catch {}

      // si venían de inventario, intenta eliminar (por bloque)
      for (const f of ok) {
        const idx = f.value.idx;
        const invId = selectedInvIdByIdx[idx];
        if (invId != null) {
          try {
            await fetch(`/api/inventario/${invId}`, { method: "DELETE" });
          } catch {}
        }
      }

      // cache local + notify por cada insert ok
      for (const f of ok) {
        const { saved, sent } = f.value;

        try {
          const rowForCache = {
            id: Number(saved?.id),
            contacto: String(saved?.contacto ?? sent.contacto ?? ""),
            nombre: (saved?.nombre ?? sent.nombre ?? null) as string | null,
            plataforma_id: Number(saved?.plataforma_id ?? sent.plataforma_id),
            correo: String(saved?.correo ?? sent.correo ?? ""),
            contrasena: (saved?.contrasena ?? sent.contrasena ?? null) as string | null,
            proveedor: (saved?.proveedor ?? sent.proveedor ?? null) as string | null,
            fecha_compra: (saved?.fecha_compra ?? sent.fecha_compra ?? null) as string | null,
            fecha_vencimiento: (saved?.fecha_vencimiento ?? sent.fecha_vencimiento ?? null) as string | null,
            meses_pagados: (saved?.meses_pagados ?? sent.meses_pagados ?? null) as number | null,
            total_pagado: (saved?.total_pagado ?? sent.total_pagado ?? null) as number | null,
            total_pagado_proveedor: (saved?.total_pagado_proveedor ?? sent.total_pagado_proveedor ?? null) as number | null,
            total_ganado: (saved?.total_ganado ?? sent.total_ganado ?? null) as number | null,
            estado: (saved?.estado ?? sent.estado ?? null) as string | null,
            comentario: (saved?.comentario ?? sent.comentario ?? null) as string | null,
          };
          mergeCuentaCompletaIntoCache(rowForCache as any);
        } catch {}

        try {
          notifyCuentasChanged({
            action: "insert",
            id: Number(saved?.id),
            plataforma_id: Number(saved?.plataforma_id ?? sent.plataforma_id),
          });
        } catch {}
      }

      try {
        await refreshCuentasStampOnce();
      } catch {}

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

      // reset UI (mantiene último pid)
      const base = todayStr();
      const stored = window.localStorage.getItem(LAST_PLATFORM_KEY);
      const lastId = stored ? Number(stored) : NaN;
      const nextPlat =
        Number.isFinite(lastId) && lastId > 0 ? lastId : plataformasOrdered[0]?.id ?? 0;

      setUser({ contacto: "", nombre: "" });
      setOrders([makeEmptyOrder(nextPlat)]);

      setEmailOpenIdx(null);
      setEmailOptsByIdx([]);
      setEmailErrorByIdx([]);
      setIsInvLoadingByIdx([]);
      setSelectedInvIdByIdx([]);
      setNombreDirty(false);
      lastContactoRef.current = "";
    } catch (err: any) {
      setErrMsg(err?.message ?? "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  /* ===================== UI ===================== */
  return (
    <>
      <form onSubmit={onSubmit} className="grid gap-6">
        {/* Usuario */}
        <section className="border border-neutral-800 rounded-2xl p-4 bg-neutral-950/40 text-neutral-100">
          <h2 className="font-semibold mb-3 text-neutral-100">Datos del usuario</h2>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
            <Field
              label="Contacto *"
              type="tel"
              placeholder="+57 3xxxxxxxxx"
              value={user.contacto}
              onChange={(v) => {
                if (/^\+?\d*(?:\s?\d*)*$/.test(v))
                  setUser((s) => ({ ...s, contacto: v }));
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
            <Field
              label="Nombre"
              placeholder="Se autocompleta si el contacto existe (desde cache)"
              value={user.nombre}
              onChange={(v) => {
                setNombreDirty(true);
                setUser((s) => ({ ...s, nombre: v }));
              }}
              inputClassName="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
            />
          </div>
        </section>

        {/* ✅ NUEVO: header con botón + */}
        <section className="border border-neutral-800 rounded-2xl p-4 bg-neutral-950/40 text-neutral-100">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="font-semibold text-neutral-100">Compras / Plataformas</h2>
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

          <div className="grid gap-6">
            {orders.map((o, idx) => (
              <div
                key={idx}
                className="border border-neutral-800 rounded-2xl p-4 bg-neutral-950/40"
              >
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h3 className="font-semibold text-neutral-100">Compra #{idx + 1}</h3>
                  {orders.length > 1 && (
                    <button
                      type="button"
                      className="text-sm px-3 py-1.5 rounded-lg border border-neutral-700 hover:bg-neutral-800"
                      onClick={() => {
                        setOrders((prev) => prev.filter((_, i) => i !== idx));
                        setSelectedInvIdByIdx((p) => p.filter((_, i) => i !== idx));
                        setEmailOptsByIdx((p) => p.filter((_, i) => i !== idx));
                        setEmailErrorByIdx((p) => p.filter((_, i) => i !== idx));
                        setIsInvLoadingByIdx((p) => p.filter((_, i) => i !== idx));
                        if (emailOpenIdx === idx) setEmailOpenIdx(null);
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
                      <label htmlFor={`plataforma-${idx}`} className="block text-sm text-neutral-300">
                        Plataforma <span className="text-red-600">*</span>
                      </label>
                      {lastPlatformId && (
                        <span className="text-xs text-neutral-400">Última usada: #{lastPlatformId}</span>
                      )}
                    </div>
                    <select
                      id={`plataforma-${idx}`}
                      className={[
                        "w-full rounded-lg px-3 py-2",
                        "border border-neutral-700 bg-neutral-900 text-neutral-100",
                        "outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500",
                        "[&>option]:bg-neutral-900 [&>option]:text-neutral-100",
                      ].join(" ")}
                      value={o.plataforma_id ? String(o.plataforma_id) : ""}
                      onChange={(e) => {
                        const newId = Number(e.target.value);
                        setOrder(idx, {
                          plataforma_id: newId,
                          correo: "",
                          contrasena: !o.contrasena && isYouTube(newId) ? "youtube" : o.contrasena,
                        });
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

                  {/* Correo + sugerencias */}
                  <div className="relative">
                    <Field
                      label="Correo *"
                      type="email"
                      placeholder="correo@dominio.com"
                      value={o.correo}
                      onChange={(v) => setOrder(idx, { correo: v })}
                      onFocus={() => openEmailForIdx(idx)}
                      onBlur={closeEmailDropdown}
                      required
                      inputClassName="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
                    />

                    {emailOpenIdx === idx && (emailOptsByIdx[idx]?.length ?? 0) > 0 && (
                      <div className="absolute left-0 right-0 z-10 mt-1 rounded-lg border border-neutral-700 bg-neutral-900 text-sm text-neutral-100 shadow-lg">
                        <ul className="max-h-56 overflow-auto">
                          {emailOptsByIdx[idx].map((opt) => (
                            <li
                              key={`${opt.invId ?? "x"}:${opt.email}`}
                              className="cursor-pointer px-3 py-2 flex items-center justify-between hover:bg-neutral-800"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setOrder(idx, {
                                  correo: opt.email,
                                  contrasena: o.contrasena || (opt.invClave ?? ""),
                                });
                                setSelectedInvIdByIdx((p) => {
                                  const a = [...p];
                                  a[idx] = opt.invId ?? null;
                                  return a;
                                });
                                setEmailOpenIdx(null);
                              }}
                              title="Disponible en inventario"
                            >
                              <span className="truncate">{opt.email}</span>
                              <span className="text-[10px] px-1.5 py-[1px] rounded-full border border-emerald-300 text-emerald-300">
                                INV
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="mt-1 text-xs">
                      {isInvLoadingByIdx[idx] && (
                        <span className="text-neutral-400">Cargando inventario…</span>
                      )}
                      {!isInvLoadingByIdx[idx] && emailErrorByIdx[idx] && (
                        <span className="text-red-300">Error: {emailErrorByIdx[idx]}</span>
                      )}
                      {!isInvLoadingByIdx[idx] &&
                        !emailErrorByIdx[idx] &&
                        selectedInvIdByIdx[idx] != null && (
                          <span className="text-emerald-300">Correo tomado del inventario.</span>
                        )}
                    </div>
                  </div>

                  {/* Contraseña */}
                  <Field
                    label="Contraseña *"
                    type="text"
                    placeholder="Contraseña"
                    value={o.contrasena}
                    onChange={(v) => setOrder(idx, { contrasena: v })}
                    required
                    inputClassName="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
                  />

                  <Field
                    label="Proveedor"
                    placeholder="Opcional"
                    value={o.proveedor}
                    onChange={(v) => setOrder(idx, { proveedor: v })}
                    inputClassName="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
                  />

                  <Field
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

                  <Field
                    label="Fecha de vencimiento (auto) *"
                    type="date"
                    value={o.fecha_vencimiento}
                    onChange={() => {}}
                    disabled
                    required
                    inputClassName="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500 cursor-not-allowed opacity-80"
                  />

                  <Field
                    label="Meses pagados *"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    placeholder="Ej. 3"
                    value={String(o.meses_pagados)}
                    onChange={(v) => {
                      const n = v === "" ? NaN : Number(v);
                      setOrder(idx, {
                        meses_pagados: Number.isNaN(n) ? (1 as any) : Math.max(1, Math.trunc(n)),
                      });
                    }}
                    required
                    inputClassName="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
                  />

                  {/* Totales */}
                  <Field
                    label="Total pagado"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={o.total_pagado}
                    onChange={(v) => setOrder(idx, { total_pagado: v })}
                    inputClassName="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
                  />

                  <Field
                    label="Total pagado proveedor (opcional)"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={o.total_pagado_proveedor}
                    onChange={(v) => setOrder(idx, { total_pagado_proveedor: v })}
                    inputClassName="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
                  />

                  <Field
                    label="Total ganado (auto)"
                    type="text"
                    value={totalGanadoPreviewByIdx[idx] ?? ""}
                    onChange={() => {}}
                    disabled
                    inputClassName="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500 cursor-not-allowed opacity-80"
                  />

                  <Field
                    label="Estado"
                    placeholder='Ej. "ACTIVA", "PAUSADA"…'
                    value={o.estado}
                    onChange={(v) => setOrder(idx, { estado: v })}
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
            ))}
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
            {loading ? "Procesando…" : "Guardar"}
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
              setOrders([makeEmptyOrder(nextPlat)]);

              setEmailOpenIdx(null);
              setEmailOptsByIdx([]);
              setEmailErrorByIdx([]);
              setIsInvLoadingByIdx([]);
              setSelectedInvIdByIdx([]);

              setNombreDirty(false);
              lastContactoRef.current = "";
            }}
            className="px-4 py-2 rounded-xl border"
          >
            Limpiar
          </button>
        </div>

        {okMsg && <p className="text-green-700 text-sm">{okMsg}</p>}
        {errMsg && <p className="text-red-600 text-sm">Error: {errMsg}</p>}
      </form>

      {/* ===== Modal ===== */}
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
                    Se enviará tal cual. (Se guardan todas las compras en una sola acción)
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
                  onClick={() => navigator.clipboard?.writeText?.(confirmText)}
                >
                  Copiar JSON
                </button>
                <button
                  type="button"
                  className="text-sm px-3 py-1.5 rounded-lg border border-neutral-700 hover:bg-neutral-800"
                  onClick={() => {
                    let obj = confirmPayload;
                    try {
                      obj = JSON.parse(confirmText);
                    } catch {}
                    const blob = new Blob([JSON.stringify(obj, null, 2)], {
                      type: "application/json",
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "cuentas.json";
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Descargar
                </button>
              </div>
            </div>

            {/* Contenido (scrollable) */}
            <div ref={modalScrollRef} className="p-5 overflow-y-auto min-w-0">
              {confirmView === "resumen" ? (
              <div className="grid gap-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-semibold text-sm text-neutral-200">
                    Ticket del pedido completo
                  </h4>

                  <button
                    type="button"
                    className="text-sm px-3 py-1.5 rounded-lg border border-neutral-700 hover:bg-neutral-800"
                    onClick={() => {
                      const txt = buildPedidoResumenFullCC(confirmPayload, plataformaMap, confirmOrders);
                      navigator.clipboard?.writeText?.(txt);
                    }}
                  >
                    Copiar ticket
                  </button>
                </div>

                <pre className="whitespace-pre-wrap break-words text-sm font-mono bg-neutral-950/70 border border-neutral-800 rounded-lg p-3 overflow-auto">
                  {buildPedidoResumenFullCC(confirmPayload, plataformaMap, confirmOrders)}
                </pre>

                <div className="text-xs text-neutral-400">
                  {Array.isArray(confirmPayload) ? `${confirmPayload.length} item(s)` : "—"}
                </div>
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
