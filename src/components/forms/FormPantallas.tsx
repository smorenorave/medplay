'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePlataformas } from '@/hooks/usePlataformas';
import { normalizeContacto } from '@/lib/strings';
import { todayStr } from '@/lib/dates';
import { FieldPantallas } from '@/components/ui/FieldPantallas';
import TextArea from '@/components/ui/TextArea';
import { fetchPantallasCountByCuentaId } from '@/lib/pantallas';
import type { Usuario, Cuenta, FormState } from '@/types/pantallas';

// Reutiliza tu bus de mutaciones / cache
import {
  mergePantallaIntoCache,
  notifyPantallasChanged,
  LS_STAMP_P,
  BC_NAME,
} from '@/lib/pantallasMutationBus';

/* ===================== Fecha ===================== */
const pad2 = (n: number) => String(n).padStart(2, '0');
const toLocalDateStr = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const parseLocalDateStr = (s: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
};
function addMonthsLocal(dateStr: string, months: number): string {
  const base = parseLocalDateStr(dateStr);
  if (!base || !Number.isFinite(months)) return '';
  const origDay = base.getDate();
  const tmp = new Date(base.getFullYear(), base.getMonth(), 1);
  tmp.setMonth(tmp.getMonth() + months);
  const lastDay = new Date(tmp.getFullYear(), tmp.getMonth() + 1, 0).getDate();
  const day = Math.min(origDay, lastDay);
  return toLocalDateStr(new Date(tmp.getFullYear(), tmp.getMonth(), day));
}

/* ===================== Num/moneda ===================== */
const toNumOrNull = (v: unknown): number | null => {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
};
const toMoney = (n: number | null) =>
  n == null || Number.isNaN(n) ? '—' : new Intl.NumberFormat().format(n);

/* ===================== Constantes ===================== */
const LAST_PLATFORM_KEY = 'pantallas:lastPlatformId';

// TTLs
const USERS_ALL_CACHE_TTL = 30 * 60_000; // 30 min catálogo completo de usuarios
const LIST_CACHE_TTL = 5 * 60_000;       // 5 min para cuentas/inventario
const COUNT_CACHE_TTL = 5 * 60_000;      // 5 min para conteos por email
const STAMP_POLL_MS = 30_000;

// Stamps & LS keys
const STAMP_KEY_ALL = '__stamp_all_combined';
const LS_USERS_ALL = '__usuarios_all_cache_v1';          // { map, ts, stamp }
const LS_ACCT_PREFIX = '__cuentas_cache_v2:';            // por plataforma: { map, ts, stamp }
const LS_INV_PREFIX = '__inventario_cache_v2:';          // por plataforma: { map, ts, stamp }
const LS_COUNTS_PREFIX = '__email_counts_v2:';           // por plataforma: { map }

/* ===================== Tipos extras ===================== */
type FormStateEx = FormState & {
  total_pagado_proveedor?: string;
  total_ganado?: string;
};
type InventarioItem = {
  id: number;
  plataforma_id?: number | null;
  correo: string;
  clave?: string | null;
};

/* ===================== Helpers LS/Stamp ===================== */
const hasWindow = () => typeof window !== 'undefined';
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
    const r = await fetch('/api/pantallas/stamp', { cache: 'no-store' });
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

/* ===================== Fetch helpers ===================== */
async function fetchListSafe(urls: string[]): Promise<any[]> {
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) continue;
      const data = await res.json();
      return Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
    } catch {}
  }
  return [];
}

async function fetchPantallasByEmailOrCuenta(
  email: string,
  cuentaId?: number,
  plataformaId?: number
): Promise<Array<{ nro_pantalla: any }>> {
  const key = normalizeEmail(email);
  const base = '/api/pantallas';
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

  // Si tenemos cuentaId, priorizamos esa consulta
  const urlsWithCuenta = cuentaId
    ? [
        `${base}?cuenta_id=${cuentaId}&limit=5000`,
        ...urls,
      ]
    : urls;

  const arr = await fetchListSafe(urlsWithCuenta);
  return Array.isArray(arr) ? arr : [];
}

/** Detecta el campo correcto de “pantallas permitidas” en la plataforma. */
function resolveMaxPantallas(p: any): number {
  const toNum = (x: any) => {
    const n = Number(x);
    return Number.isFinite(n) ? n : undefined;
  };

  // 👉 incluye tu nombre de columna real: cantidad_pantallas
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

  const val = candidates.find((n) => typeof n === 'number' && n > 0);
  // ⚠️ Evita el fallback a 6; usa 1 si no hay dato para no sobre-asignar
  return val ?? 1;
}

async function fetchPlataformaById(pid: number): Promise<any | null> {
  try {
    const r = await fetch(`/api/plataformas/${pid}`, { cache: 'no-store' });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

async function fetchPantallasCountByEmailPlat(
  email: string,
  plataformaId?: number
): Promise<number> {
  const key = normalizeEmail(email);
  const base = '/api/pantallas';
  const urls = plataformaId
    ? [
        `${base}?plataforma_id=${plataformaId}&correo=${encodeURIComponent(key)}`,
        `${base}?plataforma_id=${plataformaId}&q=${encodeURIComponent(key)}`,
        `${base}?plataforma_id=${plataformaId}&limit=5000`,
      ]
    : [
        `${base}?correo=${encodeURIComponent(key)}`,
        `${base}?q=${encodeURIComponent(key)}`,
        `${base}?limit=5000`,
      ];
  const arr = await fetchListSafe(urls);
  return arr.filter((r: any) => String(r?.correo ?? '').toLowerCase() === key).length;
}

async function countPantallasSmart(
  email: string,
  cuentaId?: number,
  plataformaId?: number
): Promise<number> {
  try {
    if (cuentaId) {
      const n = await fetchPantallasCountByCuentaId(cuentaId);
      const byEmail = await fetchPantallasCountByEmailPlat(email, plataformaId);
      return Math.max(n, byEmail);
    }
    return await fetchPantallasCountByEmailPlat(email, plataformaId);
  } catch {
    return 0;
  }
}

/* ===================== CACHE: Usuarios (catálogo completo) ===================== */
type UsersAllCache = {
  map: Record<string, Usuario>; // key: normalizeContacto(u.contacto)
  ts: number;
  stamp: number;
};

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

/** Devuelve:
 *  - Usuario si está en cache,
 *  - null si el cache dice que no existe,
 *  - undefined si aún no hay cache o está vencido.
 */
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
    '/api/usuarios?limit=100000',
    '/api/usuarios?limit=50000',
    '/api/usuarios',
  ])) as Usuario[];

  const map: Record<string, Usuario> = {};
  for (const u of arr) {
    const k = normalizeContacto(String(u.contacto ?? ''));
    if (!k) continue;
    map[k] = u; // último gana
  }
  writeUsersAll(map);
}

/* ===================== CACHE: Cuentas compartidas ===================== */
type AcctEntry = { id: number; pass: string | null };
type AcctCacheShape = { map: Record<string, AcctEntry>; ts: number; stamp: number };
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

/* ===================== CACHE: Inventario ===================== */
type InvEntry = { pass: string | null };
type InvCacheShape = { map: Record<string, InvEntry>; ts: number; stamp: number };
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

/* ===================== CACHE: Conteos por email ===================== */
type CountEntry = { count: number; ts: number; stamp: number };
type CountCacheShape = { map: Record<string, CountEntry> };
function countsKey(pid: number) {
  return `${LS_COUNTS_PREFIX}${pid}`;
}
function getCountFromCache(pid: number, email: string): number | undefined {
  const all = readLS<CountCacheShape>(countsKey(pid)) || { map: {} };
  const entry = all.map[email];
  if (!entry) return undefined;
  const sameStamp = entry.stamp === getCurrentStamp();
  const fresh = Date.now() - entry.ts <= COUNT_CACHE_TTL;
  return sameStamp && fresh ? entry.count : undefined;
}
function setCountInCache(pid: number, email: string, count: number) {
  const all = readLS<CountCacheShape>(countsKey(pid)) || { map: {} };
  all.map[email] = { count, ts: Date.now(), stamp: getCurrentStamp() };
  writeLS(countsKey(pid), all);
}

/* ===================== UI helpers ===================== */
const isEmpty = (v: any) => v == null || v === '';
function copyToClipboard(text: string) {
  try {
    navigator.clipboard.writeText(text);
  } catch {}
}
function downloadJson(filename: string, obj: any) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ===================== Componente ===================== */
export default function FormPantallas() {
  const compraHoy = todayStr();
  const [form, setForm] = useState<FormStateEx>({
    contacto: '',
    nombre: '',
    plataforma_id: 0,
    cuenta_id: null,
    nro_pantalla: '',
    correo: '',
    contrasena: '',
    proveedor: '',
    fecha_compra: compraHoy,
    fecha_vencimiento: addMonthsLocal(compraHoy, 1),
    meses_pagados: 1,
    total_pagado: '',
    total_pagado_proveedor: '',
    total_ganado: '',
    estado: 'ACTIVA',
    comentario: '',
  });

  const [availableSlots, setAvailableSlots] = useState<number[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const { plataformas, loading: platLoading, error: platError } = usePlataformas();

  // ⬇ NUEVO: controla si el nombre fue editado manualmente
  const [nombreDirty, setNombreDirty] = useState(false);
  // ⬇ NUEVO: recuerda el último contacto normalizado para detectar cambios reales
  const lastContactoRef = useRef<string>('');

  /* ====== Stamp polling + invalidación pasiva ====== */
  useEffect(() => {
    let alive = true;
    refreshStampOnce(); // primer fetch

    const onStorage = (e: StorageEvent) => {
      if (!alive) return;
      if (e.key === LS_STAMP_P || e.key === STAMP_KEY_ALL) {
        // El sello en LS hace expirar entradas en lectura.
      }
    };
    window.addEventListener('storage', onStorage);

    // BroadcastChannel del bus existente
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(BC_NAME);
      bc.onmessage = (ev) => {
        if (ev?.data?.type === 'invalidate-pantallas') {
          refreshStampOnce();
        }
      };
    } catch {}

    const onFocus = () => refreshStampOnce();
    window.addEventListener('focus', onFocus);

    const id = window.setInterval(() => {
      refreshStampOnce();
    }, STAMP_POLL_MS);

    return () => {
      alive = false;
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
      if (id) clearInterval(id);
      try {
        bc?.close();
      } catch {}
    };
  }, []);

  /* ====== Autocompletar NOMBRE con cache de usuarios ====== */
  useEffect(() => {
    const raw = form.contacto.trim();
    const norm = normalizeContacto(raw);

    // Si el contacto cambió (comparando normalizado), reseteamos estado de nombre
    if ((norm || '') !== lastContactoRef.current) {
      lastContactoRef.current = norm || '';
      // permitimos que el nuevo contacto vuelva a autocompletar
      setNombreDirty(false);
      // limpiamos el nombre anterior para que no quede pegado
      setForm((s) => ({ ...s, nombre: '' }));
    }

    if (!norm || norm.length < 5) return;

    let canceled = false;
    const run = async () => {
      // Si no hay cache listo, cargamos catálogo completo
      if (getUserFromAllCache(norm) === undefined) {
        await ensureUsersAllLoaded();
      }
      const u = getUserFromAllCache(norm);
      // Solo autocompletamos si el usuario NO modificó el nombre manualmente
      if (!canceled && u && !nombreDirty) {
        setForm((s) => ({ ...s, nombre: u.nombre ?? '' }));
      }
    };

    const id = window.setTimeout(run, 150);
    return () => {
      canceled = true;
      clearTimeout(id);
    };
  }, [form.contacto, nombreDirty]);

  /* ====== Map id->nombre y orden priorizando último usado ====== */
  const plataformaMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const p of plataformas) m.set(p.id, (p as any).nombre ?? String(p.id));
    return m;
  }, [plataformas]);

  const lastPlatformId = useMemo<number | null>(() => {
    const raw =
      typeof window !== 'undefined'
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

  /* ===== Autoselección inicial (usa última plataforma si hay) ===== */
  useEffect(() => {
    if (platLoading || platError || !plataformasOrdered.length) return;
    if (form.plataforma_id === 0) {
      setForm((s) => ({ ...s, plataforma_id: plataformasOrdered[0]!.id }));
    }
  }, [plataformasOrdered, platLoading, platError, form.plataforma_id]);

  /* ===== Mensajería + modal de confirmación ===== */
  const [loading, setLoading] = useState(false);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPayload, setConfirmPayload] = useState<any>(null);
  const [confirmText, setConfirmText] = useState<string>('');
  const [confirmView, setConfirmView] = useState<'resumen' | 'json'>('resumen');

  /* ===== Sugerencias de CORREO (cuentas compartidas + inventario) con cache ===== */
  const [open, setOpen] = useState(false);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [errEmails, setErrEmails] = useState<string | null>(null);

  const [acctIdMap, setAcctIdMap] = useState<Record<string, number>>({});
  const [acctPassMap, setAcctPassMap] = useState<Record<string, string | null>>({});
  const [invPassMap, setInvPassMap] = useState<Record<string, string | null>>({});
  const [emailCounts, setEmailCounts] = useState<Record<string, number>>({});
  const [options, setOptions] = useState<Array<{ email: string; source: 'acct' | 'inv' }>>([]);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
  let cancelled = false;

  async function computeSlots() {
    setSlotsError(null);
    setAvailableSlots([]);

    const pid = form.plataforma_id;
    const email = normalizeEmail(form.correo);
    if (!pid || !email) return; // Falta info básica

    setLoadingSlots(true);
    try {
      // 1) Lee la plataforma y determina el máximo permitido
      let p: any = plataformas.find((x) => x.id === pid);
      let maxAllowed = resolveMaxPantallas(p);

      // Si el hook no trae cantidad_pantallas (o maxAllowed <= 1 por falta de dato), intenta fetch directo
      if (!p || maxAllowed <= 1) {
        const pFull = await fetchPlataformaById(pid);
        if (pFull) {
          p = { ...p, ...pFull }; // merge suave
          maxAllowed = resolveMaxPantallas(p);
        }
      }

      // 2) Pantallas ocupadas por esa cuenta/correo en esa plataforma
      const rows = await fetchPantallasByEmailOrCuenta(
        email,
        form.cuenta_id ?? undefined,
        pid
      );

      const taken = new Set<number>();
      for (const r of rows) {
        const raw = (r?.nro_pantalla ?? '').toString().trim();
        const n = Number(raw);
        if (Number.isInteger(n) && n >= 1) taken.add(n);
      }

      // 3) Libres = [1..maxAllowed] \ taken
      const free: number[] = [];
      for (let i = 1; i <= maxAllowed; i++) {
        if (!taken.has(i)) free.push(i);
      }

      if (!cancelled) {
        setAvailableSlots(free);
        // Si la selección actual ya no es válida, limpiar
        if (
          form.nro_pantalla &&
          (!free.includes(Number(form.nro_pantalla)) || !Number(form.nro_pantalla))
        ) {
          setForm((s) => ({ ...s, nro_pantalla: '' }));
        }
      }
    } catch (e: any) {
      if (!cancelled) {
        setSlotsError(e?.message ?? 'No se pudieron calcular las pantallas disponibles');
      }
    } finally {
      if (!cancelled) setLoadingSlots(false);
    }
  }

  computeSlots();
  return () => {
    cancelled = true;
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [form.plataforma_id, form.correo, form.cuenta_id, plataformas]);



  useEffect(() => {
    // reset al cambiar plataforma
    setAcctIdMap({});
    setAcctPassMap({});
    setInvPassMap({});
    setEmailCounts({});
    setOptions([]);
    setOpen(false);
  }, [form.plataforma_id]);

  async function loadEmails() {
    if (!form.plataforma_id) return;
    setLoadingEmails(true);
    setErrEmails(null);
    try {
      const pid = form.plataforma_id;

      // 0) Intento usar caches persistentes
      let acctMap = getAcctMap(pid); // { [email]: {id, pass} }
      let invMap = getInvMap(pid);   // { [email]: {pass} }

      // 1) Si falta alguno, fetch y persiste
      if (!acctMap) {
        const rAcct = await fetch(`/api/cuentascompartidas?plataforma_id=${pid}`, {
          cache: 'no-store',
        });
        if (!rAcct.ok) throw new Error('No se pudieron cargar correos');
        const acctRows: Cuenta[] = await rAcct.json();
        const m: Record<string, AcctEntry> = {};
        for (const r of acctRows) {
          const c = normalizeEmail(r?.correo ?? '');
          if (!c) continue;
          m[c] = {
            id: m[c]?.id != null ? Math.max(m[c].id, r.id) : r.id,
            pass: (r as any).contrasena ?? null,
          };
        }
        writeAcctCache(pid, m);
        acctMap = m;
      }
      if (!invMap) {
        const rInv = await fetch(`/api/inventario?plataforma_id=${pid}&limit=100`, {
          cache: 'no-store',
        });
        const m: Record<string, InvEntry> = {};
        if (rInv.ok) {
          const invRows: InventarioItem[] = await rInv.json();
          for (const it of invRows) {
            const c = normalizeEmail(it?.correo ?? '');
            if (!c) continue;
            m[c] = { pass: (it as any).clave ?? null };
          }
        }
        writeInvCache(pid, m);
        invMap = m;
      }

      // 2) Construir opciones (hasta 20, priorizando cuentas compartidas)
      const seen = new Set<string>();
      const nextOptions: Array<{ email: string; source: 'acct' | 'inv' }> = [];

      for (const email of Object.keys(acctMap)) {
        if (seen.has(email)) continue;
        seen.add(email);
        nextOptions.push({ email, source: 'acct' });
        if (nextOptions.length >= 20) break;
      }
      if (nextOptions.length < 20) {
        for (const email of Object.keys(invMap)) {
          if (seen.has(email)) continue;
          seen.add(email);
          nextOptions.push({ email, source: 'inv' });
          if (nextOptions.length >= 20) break;
        }
      }

      // 3) Setear maps locales
      const nextAcctId: Record<string, number> = {};
      const nextAcctPass: Record<string, string | null> = {};
      for (const [email, entry] of Object.entries(acctMap)) {
        nextAcctId[email] = entry.id;
        nextAcctPass[email] = entry.pass ?? null;
      }
      const nextInvPass: Record<string, string | null> = {};
      for (const [email, entry] of Object.entries(invMap)) {
        nextInvPass[email] = entry.pass ?? null;
      }
      setAcctIdMap(nextAcctId);
      setAcctPassMap(nextAcctPass);
      setInvPassMap(nextInvPass);
      setOptions(nextOptions);

      // 4) Conteos smart (con cache por email+plataforma)
      await Promise.all(
        nextOptions.map(async ({ email, source }) => {
          const cached = getCountFromCache(pid, email);
          if (cached !== undefined) {
            setEmailCounts((m) => ({ ...m, [email]: cached }));
            return;
          }
          const cid = source === 'acct' ? nextAcctId[email] : undefined;
          const n = await countPantallasSmart(email, cid, pid);
          setEmailCounts((m) => ({ ...m, [email]: n }));
          setCountInCache(pid, email, n);
        })
      );
    } catch (e: any) {
      setErrEmails(e?.message ?? 'No se pudieron cargar correos');
      setOptions([]);
      setAcctIdMap({});
      setAcctPassMap({});
      setInvPassMap({});
      setEmailCounts({});
    } finally {
      setLoadingEmails(false);
    }
  }

  const onFocusCorreo = () => {
    loadEmails();
    setOpen(true);
  };

  const pickFromInv = (email: string) => {
    const pass = invPassMap[email] ?? null;
    setForm((s) => ({
      ...s,
      correo: email,
      contrasena: s.contrasena || pass || '',
    }));
    setOpen(false);
  };

  const pickFromAcct = (email: string) => {
    const cid = acctIdMap[email];
    const pass = acctPassMap[email];
    setForm((s) => ({
      ...s,
      correo: email,
      cuenta_id: cid ?? s.cuenta_id,
      contrasena: s.contrasena || pass || '',
    }));
    setOpen(false);
  };

  // Al escribir correo manualmente, intenta completar desde cache cuentas/inventario y actualizar contador
  const emailDetailTimer = useRef<number | null>(null);
  useEffect(() => {
    const key = normalizeEmail(form.correo);
    if (!key || !form.plataforma_id) return;

    const pid = form.plataforma_id;

    // Completar desde cache persistente si existe
    const acct = getAcctMap(pid)?.[key];
    const inv = getInvMap(pid)?.[key];
    if (acct?.id && form.cuenta_id == null) setForm((s) => ({ ...s, cuenta_id: acct.id }));
    const candidatePass = acct?.pass ?? inv?.pass ?? null;
    if (!form.contrasena && candidatePass)
      setForm((s) => ({ ...s, contrasena: candidatePass || '' }));

    // Conteo desde cache o servidor
    const cachedCount = getCountFromCache(pid, key);
    if (cachedCount !== undefined) {
      setEmailCounts((m) => ({ ...m, [key]: cachedCount }));
    } else {
      countPantallasSmart(key, acct?.id, pid).then((n) => {
        setEmailCounts((m) => ({ ...m, [key]: n }));
        setCountInCache(pid, key, n);
      });
    }

    // Si no existía en caches, intentamos fetch puntual (debounced) y cacheamos
    const needAcct = !acct;
    const needInv = !inv;
    if (!needAcct && !needInv) return;

    if (emailDetailTimer.current) {
      clearTimeout(emailDetailTimer.current);
      emailDetailTimer.current = null;
    }
    emailDetailTimer.current = window.setTimeout(async () => {
      try {
        if (needAcct) {
          const r1 = await fetch(
            `/api/cuentascompartidas?q=${encodeURIComponent(key)}&plataforma_id=${pid}`,
            { cache: 'no-store' }
          );
          if (r1.ok) {
            const arr: Cuenta[] = await r1.json();
            const exact = arr.find((r) => normalizeEmail(r?.correo ?? '') === key);
            if (exact) {
              // actualizar cache persistente de cuentas
              const base = getAcctMap(pid) || {};
              base[key] = {
                id: exact.id,
                pass: (exact as any).contrasena ?? null,
              };
              writeAcctCache(pid, base);

              setAcctIdMap((m) => ({ ...m, [key]: exact.id }));
              if ((exact as any).contrasena !== undefined) {
                setAcctPassMap((m) => ({ ...m, [key]: (exact as any).contrasena ?? null }));
              }
              setForm((s) => ({
                ...s,
                cuenta_id: s.cuenta_id ?? exact.id,
                contrasena: s.contrasena || (exact as any).contrasena || '',
              }));
              const n = await countPantallasSmart(key, exact.id, pid);
              setEmailCounts((m) => ({ ...m, [key]: n }));
              setCountInCache(pid, key, n);
              return;
            }
          }
        }
        if (needInv) {
          const r2 = await fetch(
            `/api/inventario?q=${encodeURIComponent(key)}&plataforma_id=${pid}`,
            { cache: 'no-store' }
          );
          if (r2.ok) {
            const arr: InventarioItem[] = await r2.json();
            const exact = arr.find((it) => normalizeEmail(it?.correo ?? '') === key);
            if (exact) {
              const base = getInvMap(pid) || {};
              base[key] = { pass: (exact as any).clave ?? null };
              writeInvCache(pid, base);

              if ((exact as any).clave != null && !form.contrasena) {
                setInvPassMap((m) => ({ ...m, [key]: (exact as any).clave ?? null }));
                setForm((s) => ({ ...s, contrasena: (exact as any).clave || '' }));
              }
              const n = await countPantallasSmart(key, undefined, pid);
              setEmailCounts((m) => ({ ...m, [key]: n }));
              setCountInCache(pid, key, n);
            }
          }
        }
      } catch {}
    }, 350);

    return () => {
      if (emailDetailTimer.current) clearTimeout(emailDetailTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.correo, form.plataforma_id]);

  /* ===== Crear Usuario / Cuenta ===== */
  async function ensureUsuario(contactoRaw: string, nombre: string | null) {
    const raw = contactoRaw.trim();
    const norm = normalizeContacto(raw);
    if (!norm) return;
    try {
      await ensureUsersAllLoaded(); // aseguramos catálogo en cache
      const current = readUsersAll();
      const exists = !!current?.map?.[norm];
      if (exists) return;

      // No existe: crearlo y actualizar cache local sin pedir todo de nuevo
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacto: raw, nombre: nombre || null }),
      });
      if (res.ok) {
        const created: Usuario = await res.json();
        const next = readUsersAll();
        const map = next?.map ?? {};
        map[norm] = created;
        writeUsersAll(map);
        await refreshStampOnce(); // para invalidar caches en otras pestañas
      }
    } catch {}
  }

  async function ensureCuentaCompartida(correo: string, plataformaId: number) {
    const key = normalizeEmail(correo);
    const pid = plataformaId;

    // cache primero
    const cached = getAcctMap(pid)?.[key];
    if (cached?.id) {
      const count = await countPantallasSmart(key, cached.id, pid);
      setEmailCounts((m) => ({ ...m, [key]: count }));
      setCountInCache(pid, key, count);
      return { id: cached.id, countAfter: count };
    }

    const res = await fetch('/api/cuentascompartidas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plataforma_id: pid,
        correo,
        contrasena: form.contrasena || null,
        proveedor: form.proveedor || null,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j?.error ?? 'No se pudo crear la cuenta compartida');
    }
    const saved: Cuenta = await res.json();

    // Actualizar cache persistente
    const base = getAcctMap(pid) || {};
    base[key] = { id: saved.id, pass: form.contrasena || null };
    writeAcctCache(pid, base);

    const count = await countPantallasSmart(key, saved.id, pid);
    setEmailCounts((m) => ({ ...m, [key]: count }));
    setCountInCache(pid, key, count);

    // sello
    await refreshStampOnce();

    return { id: saved.id, countAfter: count };
  }

  /* ===== Auto fechas / ganado ===== */
  useEffect(() => {
    if (!form.fecha_compra) return;
    const months =
      typeof form.meses_pagados === 'number' && Number.isFinite(form.meses_pagados) && form.meses_pagados >= 1
        ? form.meses_pagados
        : 1;
    const fv = addMonthsLocal(form.fecha_compra, months);
    if (fv !== form.fecha_vencimiento) setForm((s) => ({ ...s, fecha_vencimiento: fv }));
  }, [form.fecha_compra, form.meses_pagados]);

  useEffect(() => {
    const tp = toNumOrNull(form.total_pagado);
    if (tp == null) {
      if (form.total_ganado !== '') setForm((s) => ({ ...s, total_ganado: '' }));
      return;
    }
    const tpp = toNumOrNull(form.total_pagado_proveedor);
    const ganado = tpp == null ? tp : tp - tpp;
    const txt = ganado.toString();
    if (form.total_ganado !== txt) setForm((s) => ({ ...s, total_ganado: txt }));
  }, [form.total_pagado, form.total_pagado_proveedor]);

  const isValidPantalla = (val: string, available: number[]) => {
  const n = Number(val);
  return Number.isInteger(n) && available.includes(n);
  };

  /* ===== Validación (correo y contraseña obligatorios) ===== */
  const canSubmit = useMemo(() => {
    const pantallaOk = isValidPantalla(String(form.nro_pantalla || ''), availableSlots);
    const plataformaOk = Number.isInteger(form.plataforma_id) && form.plataforma_id > 0;
    const contactoOk = form.contacto.trim() !== '';
    const fechasOk = !!form.fecha_compra && !!form.fecha_vencimiento;
    const estadoOk = form.estado.trim() !== '';
    const mesesOk =
      typeof form.meses_pagados === 'number' && Number.isInteger(form.meses_pagados) && form.meses_pagados >= 1;
    const totalOk =
      form.total_pagado === '' ||
      (!Number.isNaN(Number(form.total_pagado)) && Number(form.total_pagado) >= 0);
    const totalProvOk =
      !form.total_pagado_proveedor ||
      (!Number.isNaN(Number(form.total_pagado_proveedor)) &&
        Number(form.total_pagado_proveedor) >= 0);

    const correoOk =
      form.correo.trim() !== '' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo.trim());
    const passOk = (form.contrasena ?? '').trim() !== '';

    return (
      plataformaOk &&
      contactoOk &&
      fechasOk &&
      estadoOk &&
      mesesOk &&
      totalOk &&
      totalProvOk &&
      correoOk &&
      passOk &&
      pantallaOk
    );
  }, [form]);

  /* ===== Payload & submit (abre modal) ===== */
  const buildPayload = () => {
    const totalPag = toNumOrNull(form.total_pagado);
    const totalProv = toNumOrNull(form.total_pagado_proveedor);
    const totalGan = totalPag == null ? null : totalProv == null ? totalPag : totalPag - totalProv;

    return {
      cuenta_id: form.cuenta_id ?? null,
      contacto: normalizeContacto(form.contacto.trim()),
      nombre: (form.nombre ?? '').trim() || null,
      nro_pantalla: String(form.nro_pantalla ?? '').trim() || null,
      plataforma_id: form.plataforma_id,
      correo: form.correo.trim().toLowerCase() || null,
      contrasena: form.contrasena || null,
      proveedor: form.proveedor.trim() || null,
      fecha_compra: form.fecha_compra ? new Date(form.fecha_compra).toISOString() : null,
      fecha_vencimiento: form.fecha_vencimiento
        ? new Date(form.fecha_vencimiento).toISOString()
        : null,
      meses_pagados: form.meses_pagados,
      total_pagado: totalPag == null ? null : Number(totalPag.toFixed(2)),
      total_pagado_proveedor: totalProv == null ? null : Number(totalProv.toFixed(2)),
      pago_total_proveedor: totalProv == null ? null : Number(totalProv.toFixed(2)),
      pagado_proveedor: totalProv == null ? null : Number(totalProv.toFixed(2)),
      total_ganado: totalGan == null ? null : Number(totalGan.toFixed(2)),
      ganado: totalGan == null ? null : Number(totalGan.toFixed(2)),
      estado: form.estado.trim(),
      comentario: form.comentario.trim() || null,
    };
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setOkMsg(null);
    setErrMsg(null);

    const correoTrim = form.correo.trim();
    if (!correoTrim || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoTrim)) {
      setErrMsg('El correo es obligatorio y debe ser válido.');
      return;
    }
    if (!form.contrasena?.trim()) {
      setErrMsg('La contraseña es obligatoria.');
      return;
    }
    if (!canSubmit) {
      setErrMsg('Revisa los campos obligatorios y formatos numéricos.');
      return;
    }

    try {
      await ensureUsersAllLoaded(); // cache de usuarios listo
      await ensureUsuario(form.contacto, form.nombre || null);

      let cuentaId: number | null = form.cuenta_id ?? null;
      const correo = correoTrim;
      if (correo && form.plataforma_id > 0) {
        const { id } = await ensureCuentaCompartida(correo, form.plataforma_id);
        cuentaId = id;
        setForm((s) => ({ ...s, cuenta_id: id }));
      }

      const payload = { ...buildPayload(), cuenta_id: cuentaId };
      setConfirmPayload(payload);
      setConfirmText(JSON.stringify(payload, null, 2));
      setConfirmView('resumen');
      setConfirmOpen(true);
    } catch (e: any) {
      setErrMsg(e?.message ?? 'Error preparando el guardado.');
    }
  }

  /* ===== Confirmar y guardar ===== */
  async function confirmAndSave() {
    if (!confirmPayload) return;
    setLoading(true);
    setErrMsg(null);
    try {
      let toSend = confirmPayload;
      try {
        toSend = JSON.parse(confirmText);
      } catch {}

      const res = await fetch('/api/pantallas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toSend),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? 'No se pudo guardar');
      }

      const saved = await res.json().catch(() => ({}));

      // ✅ Actualiza caché local y notifica al viewer
      try {
        mergePantallaIntoCache(saved);
        notifyPantallasChanged();
      } catch {}

      // sello combinado (expira caches dependientes)
      await refreshStampOnce();

      setOkMsg(`Guardado correctamente (id: ${saved?.id ?? '—'}).`);
      setConfirmOpen(false);

      // limpiar maps auxiliares
      try {
        setAcctIdMap({});
        setAcctPassMap({});
        setInvPassMap({});
        setEmailCounts({});
      } catch {}

      // Recordar última plataforma
      try {
        window.localStorage.setItem(LAST_PLATFORM_KEY, String(toSend.plataforma_id));
      } catch {}

      // Reset con plataforma priorizada
      const base = todayStr();
      const stored =
        typeof window !== 'undefined'
          ? window.localStorage.getItem(LAST_PLATFORM_KEY)
          : null;
      const lastId = stored ? Number(stored) : NaN;
      const nextPlat =
        Number.isFinite(lastId) && lastId > 0
          ? lastId
          : plataformasOrdered[0]?.id ?? 0;

      setForm({
        contacto: '',
        nombre: '',
        plataforma_id: nextPlat,
        cuenta_id: null,
        nro_pantalla: '',
        correo: '',
        contrasena: '',
        proveedor: '',
        fecha_compra: base,
        fecha_vencimiento: addMonthsLocal(base, 1),
        meses_pagados: 1,
        total_pagado: '',
        total_pagado_proveedor: '',
        total_ganado: '',
        estado: 'ACTIVA',
        comentario: '',
      });
      setOptions([]);
      setEmailCounts({});
    } catch (err: any) {
      setErrMsg(err?.message ?? 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }

  /* ===================== UI ===================== */
  const badge = (() => {
    const key = normalizeEmail(form.correo);
    const count = emailCounts[key] ?? 0;
    const cls =
      count > 0
        ? 'border-amber-300 bg-amber-50 text-amber-700'
        : 'border-emerald-300 bg-emerald-50 text-emerald-700';
    return (
      <span className={`text-xs rounded-full px-2 py-[2px] border ${cls}`}>
        hay {count} {count === 1 ? 'registro' : 'registros'}
      </span>
    );
  })();

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
              value={form.contacto}
              onChange={(v: string) => {
                if (/^\+?\d*(?:\s?\d*)*$/.test(v)) setForm((s) => ({ ...s, contacto: v }));
              }}
              required
              inputMode="numeric"
              pattern="^\+\d+(?:\s*\d+)*$"
              title="Formato válido: + seguido de números"
              onInvalid={(e: any) =>
                e.currentTarget.setCustomValidity('Ingresa un teléfono en formato + y solo números')
              }
              onInput={(e: any) => e.currentTarget.setCustomValidity('')}
              inputClassName="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
            />
            <FieldPantallas
              label="Nombre"
              placeholder="Se autocompleta si el contacto existe (desde cache)"
              value={form.nombre}
              onChange={(v: string) => {
                setNombreDirty(true); // <— marcado manual
                setForm((s) => ({ ...s, nombre: v }));
              }}
              inputClassName="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
            />
          </div>
        </section>

        {/* Pantalla */}
        <section className="border border-neutral-800 rounded-2xl p-4 bg-neutral-950/40 text-neutral-100">
          <h3 className="font-semibold mb-3">Pantalla</h3>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Plataforma */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-sm text-neutral-300">
                  Plataforma <span className="text-red-600">*</span>
                </label>
                {lastPlatformId && (
                  <span className="text-xs text-neutral-400">Última: #{lastPlatformId}</span>
                )}
              </div>
              <select
                className="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500 [&>option]:bg-neutral-900 [&>option]:text-neutral-100"
                value={form.plataforma_id ? String(form.plataforma_id) : ''}
                onChange={(e) =>
                  setForm((s) => ({
                    ...s,
                    plataforma_id: Number(e.target.value),
                    correo: '',
                    cuenta_id: null,
                    contrasena: '',
                    nro_pantalla: '',
                  }))
                }
                required
                disabled={platLoading || !!platError}
              >
                <option value="" disabled>
                  {platLoading
                    ? 'Cargando…'
                    : platError
                    ? 'Error al cargar'
                    : 'Selecciona una plataforma'}
                </option>
                {plataformasOrdered.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Correo + sugerencias */}
            <div className="relative" ref={boxRef}>
              <FieldPantallas
                label="Correo *"
                labelRight={badge}
                type="email"
                placeholder="correo@dominio.com"
                value={form.correo}
                onChange={(v: string) => setForm((s) => ({ ...s, correo: v, nro_pantalla: '' }))}
                onFocus={onFocusCorreo}
                required
                onInvalid={(e: any) => e.currentTarget.setCustomValidity('Ingresa un correo válido')}
                onInput={(e: any) => e.currentTarget.setCustomValidity('')}
                inputClassName="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
              />

              {open && (
                <div className="absolute left-0 right-0 z-20 mt-1 rounded-lg border border-neutral-700 bg-neutral-900 text-sm text-neutral-100 shadow-lg">
                  {loadingEmails && (
                    <div className="p-2 text-sm text-neutral-400">Cargando correos…</div>
                  )}
                  {!loadingEmails && errEmails && (
                    <div className="p-2 text-sm text-neutral-300">{errEmails}</div>
                  )}

                  {!loadingEmails && !errEmails && (
                    <ul className="max-h-72 overflow-auto">
                      {options.length === 0 && (
                        <li className="px-3 py-2 text-neutral-500">Sin sugerencias</li>
                      )}
                      {options.map(({ email, source }) => {
                        const n = emailCounts[email] ?? 0;
                        return (
                          <li key={`${source}-${email}`}>
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() =>
                                source === 'inv' ? pickFromInv(email) : pickFromAcct(email)
                              }
                              className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-neutral-800"
                            >
                              <span className="truncate">{email}</span>
                              <span className="ml-2 flex items-center gap-2">
                                {source === 'inv' && (
                                  <span className="text-[10px] rounded-full px-2 py-[1px] border border-emerald-400/70 text-emerald-300">
                                    INV
                                  </span>
                                )}
                                <span className="text-xs opacity-70">{n ? `(${n})` : ''}</span>
                              </span>
                            </button>
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
              value={form.proveedor}
              onChange={(v: string) => setForm((s) => ({ ...s, proveedor: v }))}
              inputClassName="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
            />

            {/* Contraseña SIEMPRE VISIBLE */}
            <FieldPantallas
              label="Contraseña *"
              type="text"               // 👈 siempre visible
              placeholder="Requerida"
              value={form.contrasena}
              onChange={(v: string) => setForm((s) => ({ ...s, contrasena: v }))}
              required
              onInvalid={(e: any) => e.currentTarget.setCustomValidity('La contraseña es obligatoria')}
              onInput={(e: any) => e.currentTarget.setCustomValidity('')}
              inputClassName="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
            />

            {/* Nro. pantalla (select de disponibles) */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-sm text-neutral-300">
                  Nro. pantalla <span className="text-red-600">*</span>
                </label>
                {form.plataforma_id > 0 && (
                  <span className="text-xs text-neutral-400">
                    {loadingSlots
                      ? 'Calculando…'
                      : slotsError
                      ? 'Error al calcular'
                      : `Disponibles: ${availableSlots.length}`}
                  </span>
                )}
              </div>

              <select
                className="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500 [&>option]:bg-neutral-900 [&>option]:text-neutral-100"
                value={form.nro_pantalla ? String(form.nro_pantalla) : ''}
                onChange={(e) => setForm((s) => ({ ...s, nro_pantalla: e.target.value }))}
                required
                disabled={
                  !form.plataforma_id ||
                  !form.correo.trim() ||
                  !!slotsError ||
                  loadingSlots ||
                  availableSlots.length === 0
                }
              >
                <option value="" disabled>
                  {!form.plataforma_id
                    ? 'Selecciona una plataforma'
                    : !form.correo.trim()
                    ? 'Ingresa o selecciona un correo'
                    : loadingSlots
                    ? 'Calculando…'
                    : slotsError
                    ? 'Error al calcular'
                    : availableSlots.length === 0
                    ? 'Sin cupos disponibles'
                    : 'Selecciona una pantalla disponible'}
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
              value={form.fecha_compra}
              onChange={(v: string) => setForm((s) => ({ ...s, fecha_compra: v }))}
              required
              inputClassName="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
            />
            <FieldPantallas
              label="Fecha de vencimiento (auto) *"
              type="date"
              value={form.fecha_vencimiento}
              onChange={() => {}}
              disabled
              required
              inputClassName="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500 cursor-not-allowed opacity-80"
            />

            {/* Meses y totales */}
            <FieldPantallas
              label="Meses pagados *"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={String(form.meses_pagados)}
              onChange={(v: string) => {
                const n = parseInt(v, 10);
                setForm((s) => ({ ...s, meses_pagados: Number.isFinite(n) ? Math.max(1, n) : 1 }));
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
              value={form.total_pagado}
              onChange={(v: string) => setForm((s) => ({ ...s, total_pagado: v }))}
              inputClassName="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
            />

            <FieldPantallas
              label="Total pagado proveedor (opcional)"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={form.total_pagado_proveedor ?? ''}
              onChange={(v: string) => setForm((s) => ({ ...s, total_pagado_proveedor: v }))}
              inputClassName="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
            />

            <FieldPantallas
              label="Total ganado (auto)"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={form.total_ganado ?? ''}
              onChange={() => {}}
              disabled
              inputClassName="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500 cursor-not-allowed opacity-80"
            />

            {/* Estado / Comentario */}
            <FieldPantallas
              label="Estado *"
              placeholder='Ej. "ACTIVA", "PAUSADA"…'
              value={form.estado}
              onChange={(v: string) => setForm((s) => ({ ...s, estado: v }))}
              required
              inputClassName="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
            />
            <TextArea
              className="sm:col-span-2"
              label="Comentario"
              placeholder="Notas adicionales"
              value={form.comentario}
              onChange={(v) => setForm((s) => ({ ...s, comentario: v }))}
            />
          </div>
        </section>

        {/* Acciones */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={!canSubmit || loading}
            className={[
              'px-4 py-2 rounded-xl border',
              canSubmit && !loading
                ? 'bg-gray-900 text-white border-gray-900'
                : 'opacity-60 cursor-not-allowed',
            ].join(' ')}
          >
            {loading ? 'Procesando…' : 'Guardar'}
          </button>
          <button
            type="button"
            onClick={() => {
              const base = todayStr();
              const stored =
                typeof window !== 'undefined'
                  ? window.localStorage.getItem(LAST_PLATFORM_KEY)
                  : null;
              const lastId = stored ? Number(stored) : NaN;
              const nextPlat =
                Number.isFinite(lastId) && lastId > 0
                  ? lastId
                  : plataformasOrdered[0]?.id ?? 0;

              setForm({
                contacto: '',
                nombre: '',
                plataforma_id: nextPlat,
                cuenta_id: null,
                nro_pantalla: '',
                correo: '',
                contrasena: '',
                proveedor: '',
                fecha_compra: base,
                fecha_vencimiento: addMonthsLocal(base, 1),
                meses_pagados: 1,
                total_pagado: '',
                total_pagado_proveedor: '',
                total_ganado: '',
                estado: 'ACTIVA',
                comentario: '',
              });
              setOptions([]);
              setEmailCounts({});
              setNombreDirty(false);
              lastContactoRef.current = '';
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
            className="w-full max-w-4xl rounded-2xl border border-neutral-700 bg-neutral-900 text-neutral-100 shadow-2xl"
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
                    Revisa el contenido antes de continuar. Se enviará tal cual.
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
            <div className="px-5 pt-4 flex items-center justify-between gap-2">
              <div className="inline-flex rounded-lg border border-neutral-700 overflow-hidden">
                <button
                  type="button"
                  className={`px-3 py-1.5 text-sm ${
                    confirmView === 'resumen' ? 'bg-neutral-800' : 'bg-neutral-900 hover:bg-neutral-800'
                  }`}
                  onClick={() => setConfirmView('resumen')}
                >
                  Resumen
                </button>
                <button
                  type="button"
                  className={`px-3 py-1.5 text-sm ${
                    confirmView === 'json' ? 'bg-neutral-800' : 'bg-neutral-900 hover:bg-neutral-800'
                  }`}
                  onClick={() => setConfirmView('json')}
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
                      obj = JSON.parse(confirmText);
                    } catch {}
                    downloadJson('pantalla.json', obj);
                  }}
                >
                  Descargar
                </button>
              </div>
            </div>

            {/* Contenido */}
            <div className="p-5">
              {confirmView === 'resumen' ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Usuario */}
                  <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 space-y-3">
                    <h4 className="font-medium text-sm text-neutral-300 mb-1">
                      Datos del usuario
                    </h4>
                    <dl className="grid grid-cols-[140px_1fr] text-sm gap-y-2">
                      <dt className="text-neutral-400">Contacto</dt>
                      <dd className="font-medium">{confirmPayload?.contacto || '—'}</dd>
                      <dt className="text-neutral-400">Nombre</dt>
                      <dd className="font-medium">
                        {form.nombre || '—'}{' '}
                        {isEmpty(form.nombre) && (
                          <span className="text-[10px] px-2 py-[2px] rounded-full border border-neutral-500 text-neutral-300">
                            opcional
                          </span>
                        )}
                      </dd>
                      <dt className="text-neutral-400">Estado</dt>
                      <dd className="font-medium">{confirmPayload?.estado || '—'}</dd>
                    </dl>
                  </div>

                  {/* Cuenta / Plataforma */}
                  <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 space-y-3">
                    <h4 className="font-medium text-sm text-neutral-300 mb-1">
                      Cuenta y plataforma
                    </h4>
                    <dl className="grid grid-cols-[140px_1fr] text-sm gap-y-2">
                      <dt className="text-neutral-400">Plataforma</dt>
                      <dd className="font-semibold">
                        {plataformaMap.get(confirmPayload?.plataforma_id) ??
                          `#${confirmPayload?.plataforma_id ?? '—'}`}
                      </dd>
                      <dt className="text-neutral-400">Correo</dt>
                      <dd className="font-medium">{confirmPayload?.correo || '—'}</dd>
                      <dt className="text-neutral-400">Contraseña</dt>
                      <dd className="font-mono">{confirmPayload?.contrasena || '—'}</dd>
                      <dt className="text-neutral-400">Proveedor</dt>
                      <dd className="font-medium">
                        {confirmPayload?.proveedor || '—'}{' '}
                        {isEmpty(confirmPayload?.proveedor) && (
                          <span className="text-[10px] px-2 py-[2px] rounded-full border border-neutral-500 text-neutral-300">
                            opcional
                          </span>
                        )}
                      </dd>
                      <dt className="text-neutral-400">Cuenta ID</dt>
                      <dd className="font-medium">{confirmPayload?.cuenta_id ?? '—'}</dd>
                      <dt className="text-neutral-400">Nro. pantalla</dt>
                      <dd className="font-medium">{confirmPayload?.nro_pantalla ?? '—'}</dd>
                    </dl>
                  </div>

                  {/* Fechas */}
                  <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                    <h4 className="font-medium text-sm text-neutral-300 mb-2">Fechas</h4>
                    <dl className="grid grid-cols-[140px_1fr] text-sm gap-y-2">
                      <dt className="text-neutral-400">Compra</dt>
                      <dd className="font-medium">{form.fecha_compra || '—'}</dd>
                      <dt className="text-neutral-400">Vencimiento</dt>
                      <dd className="font-medium">{form.fecha_vencimiento || '—'}</dd>
                      <dt className="text-neutral-400">Meses pagados</dt>
                      <dd className="font-medium">{form.meses_pagados ?? '—'}</dd>
                    </dl>
                  </div>

                  {/* Totales */}
                  <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                    <h4 className="font-medium text-sm text-neutral-300 mb-2">Totales</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="rounded-lg border border-neutral-800 p-3">
                        <div className="text-xs text-neutral-400">Total pagado</div>
                        <div className="text-lg font-semibold">
                          {toMoney(confirmPayload?.total_pagado)}
                        </div>
                      </div>
                      <div className="rounded-lg border border-neutral-800 p-3">
                        <div className="text-xs text-neutral-400">Pagado proveedor</div>
                        <div className="text-lg font-semibold">
                          {toMoney(confirmPayload?.total_pagado_proveedor)}
                        </div>
                      </div>
                      <div className="rounded-lg border border-neutral-800 p-3">
                        <div className="text-xs text-neutral-400">Total ganado</div>
                        <div className="text-lg font-semibold">
                          {toMoney(confirmPayload?.total_ganado)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Comentario */}
                  <div className="md:col-span-2 rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                    <h4 className="font-medium text-sm text-neutral-300 mb-2">Comentario</h4>
                    <div className="text-sm whitespace-pre-wrap">
                      {form.comentario || <span className="opacity-70">—</span>}
                    </div>
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
                {loading ? 'Guardando…' : 'Confirmar y guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
