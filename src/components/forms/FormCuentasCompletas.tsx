// src/components/forms/FormCuentaCompletas.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Field from '@/components/ui/Field';
import TextArea from '@/components/ui/TextArea';
import { normalizeContacto } from '@/lib/strings';
import { todayStr } from '@/lib/dates';
import { usePlataformas } from '@/hooks/usePlataformas';

/* 🔁 Cache/bus existentes para cuentas completas */
import { mergeCuentaCompletaIntoCache } from '@/lib/cuentasAll';
import { notifyCuentasChanged, subscribeCuentasChanges } from '@/lib/cuentasMutationBus';

/* ===================== Tipos ===================== */
type Usuario = { contacto: string; nombre: string | null };
type CorreoInfo = { correo: string; contrasena?: string | null };
type InventarioRow = { id: number; plataforma_id?: number | null; correo?: string | null; clave?: string | null };

type FormState = {
  contacto: string;
  nombre: string | '';
  plataforma_id: number;
  correo: string;
  contrasena: string;
  proveedor: string | '';
  fecha_compra: string | '';
  fecha_vencimiento: string | '';
  meses_pagados: number;
  total_pagado: string;
  total_pagado_proveedor: string;
  estado: string | '';
  comentario: string | '';
};

type EmailSuggestion = {
  email: string;
  count: number;
  source: 'db' | 'inv';
  invId?: number;
  invClave?: string | null;
};

/* ===================== Constantes ===================== */
const CONTACTO_MIN_LEN = 5;
const EMAIL_MIN_LEN = 5;
const SUGGEST_LIMIT = 20;
const LAST_PLATFORM_KEY = 'cuentascompletas:lastPlatformId';

/* TTLs y claves de LS */
const USERS_ALL_CACHE_TTL = 30 * 60_000; // 30 min
const LIST_CACHE_TTL = 5 * 60_000;       // 5 min listas de correo/clave
const COUNT_CACHE_TTL = 5 * 60_000;      // 5 min conteos por email
const STAMP_POLL_MS = 30_000;

const LS_USERS_ALL = '__usuarios_all_cache_v1';                // { map, ts }
const LS_CC_PREFIX = '__cc_cache_v1:';                         // por plataforma { map, ts, stamp }
const LS_INV_PREFIX = '__cc_inv_cache_v1:';                    // por plataforma { map, ts, stamp }
const LS_COUNTS_PREFIX = '__cc_counts_v1:';                    // por plataforma { map: {email:{count,ts,stamp}} }
const STAMP_KEY_CC = '__stamp_cuentas_all';                    // guarda último stamp de /api/cuentascompletas/stamp

/* ===================== Utils ===================== */
const pad2 = (n: number) => String(n).padStart(2, '0');
const toLocalDateStr = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
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
  const out = new Date(tmp.getFullYear(), tmp.getMonth(), day);
  return toLocalDateStr(out);
}
const isEmpty = (v: any) => v == null || v === '';
const toMoney = (n: number | null) => (n == null || Number.isNaN(n) ? '—' : new Intl.NumberFormat().format(n));
const normalizeEmail = (s: string) => s.trim().toLowerCase();
const hasWindow = () => typeof window !== 'undefined';

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
  try { window.localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

/* ===================== STAMP (/api/cuentascompletas/stamp) ===================== */
function getCurrentCuentasStamp(): number {
  if (!hasWindow()) return 0;
  const s = window.localStorage.getItem(STAMP_KEY_CC);
  return s ? Number(s) || 0 : 0;
}
async function refreshCuentasStampOnce(): Promise<number> {
  try {
    const r = await fetch('/api/cuentascompletas/stamp', { cache: 'no-store' });
    const j = await r.json().catch(() => ({ stamp: 0 }));
    const n = Number(j?.stamp) || 0;
    try { window.localStorage.setItem(STAMP_KEY_CC, String(n)); } catch {}
    return n;
  } catch {
    return getCurrentCuentasStamp();
  }
}

/* ===================== Usuarios: catálogo completo (una sola vez) ===================== */
type UsersAllCache = { map: Record<string, Usuario>; ts: number };
function readUsersAll(): UsersAllCache | null { return readLS<UsersAllCache>(LS_USERS_ALL); }
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
  const urls = ['/api/usuarios?limit=100000', '/api/usuarios?limit=50000', '/api/usuarios'];
  let arr: Usuario[] = [];
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) continue;
      const data = await res.json();
      const list = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
      if (list?.length) { arr = list; break; }
    } catch {}
  }
  const map: Record<string, Usuario> = {};
  for (const u of arr) {
    const k = normalizeContacto(String(u.contacto ?? ''));
    if (!k) continue;
    map[k] = u;
  }
  writeLS(LS_USERS_ALL, { map, ts: Date.now() } as UsersAllCache);
}

/* ===================== Cache: cuentascompletas por plataforma ===================== */
type CCEntry = { pass: string | null; count: number };
type CCCacheShape = { map: Record<string, CCEntry>; ts: number; stamp: number };
function ccKey(pid: number) { return `${LS_CC_PREFIX}${pid}`; }
function readCCCache(pid: number): CCCacheShape | null { return readLS<CCCacheShape>(ccKey(pid)); }
function writeCCCache(pid: number, map: Record<string, CCEntry>) {
  writeLS(ccKey(pid), { map, ts: Date.now(), stamp: getCurrentCuentasStamp() } as CCCacheShape);
}
function getCCMap(pid: number): Record<string, CCEntry> | null {
  const c = readCCCache(pid);
  if (!c) return null;
  const sameStamp = c.stamp === getCurrentCuentasStamp();
  const fresh = Date.now() - c.ts <= LIST_CACHE_TTL;
  return sameStamp && fresh ? c.map : null;
}

/* ===================== Cache: inventario por plataforma ===================== */
type InvEntry = { pass: string | null; id?: number };
type InvCacheShape = { map: Record<string, InvEntry>; ts: number; stamp: number };
function invKey(pid: number) { return `${LS_INV_PREFIX}${pid}`; }
function readInvCache(pid: number): InvCacheShape | null { return readLS<InvCacheShape>(invKey(pid)); }
function writeInvCache(pid: number, map: Record<string, InvEntry>) {
  writeLS(invKey(pid), { map, ts: Date.now(), stamp: getCurrentCuentasStamp() } as InvCacheShape);
}
function getInvMap(pid: number): Record<string, InvEntry> | null {
  const c = readInvCache(pid);
  if (!c) return null;
  const sameStamp = c.stamp === getCurrentCuentasStamp();
  const fresh = Date.now() - c.ts <= LIST_CACHE_TTL;
  return sameStamp && fresh ? c.map : null;
}

/* ===================== Cache: conteos por email ===================== */
type CountEntry = { count: number; ts: number; stamp: number };
type CountCacheShape = { map: Record<string, CountEntry> };
function countsKey(pid: number) { return `${LS_COUNTS_PREFIX}${pid}`; }
function getCountFromCache(pid: number, email: string): number | undefined {
  const all = readLS<CountCacheShape>(countsKey(pid)) || { map: {} };
  const entry = all.map[email];
  if (!entry) return undefined;
  const sameStamp = entry.stamp === getCurrentCuentasStamp();
  const fresh = Date.now() - entry.ts <= COUNT_CACHE_TTL;
  return sameStamp && fresh ? entry.count : undefined;
}
function setCountInCache(pid: number, email: string, count: number) {
  const all = readLS<CountCacheShape>(countsKey(pid)) || { map: {} };
  all.map[email] = { count, ts: Date.now(), stamp: getCurrentCuentasStamp() };
  writeLS(countsKey(pid), all);
}

/* ===================== Parser de respuestas ===================== */
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
  const [form, setForm] = useState<FormState>({
    contacto: '',
    nombre: '',
    plataforma_id: 0,
    correo: '',
    contrasena: '',
    proveedor: '',
    fecha_compra: compraHoy,
    fecha_vencimiento: addMonthsLocal(compraHoy, 1),
    meses_pagados: 1,
    total_pagado: '',
    total_pagado_proveedor: '',
    estado: 'ACTIVA',
    comentario: '',
  });

  const { plataformas, loading: platLoading, error: platError } = usePlataformas();

  /* ===== Plataforma: map y orden ===== */
  const plataformaMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const p of plataformas) m.set(p.id, (p as any).nombre ?? String(p.id));
    return m;
  }, [plataformas]);

  const lastPlatformId = useMemo<number | null>(() => {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(LAST_PLATFORM_KEY) : null;
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  }, []);
  const plataformasOrdered = useMemo(() => {
    if (!plataformas?.length) return [];
    if (!lastPlatformId) return plataformas;
    const fav = plataformas.find(p => p.id === lastPlatformId);
    if (!fav) return plataformas;
    const rest = plataformas.filter(p => p.id !== lastPlatformId);
    return [fav, ...rest];
  }, [plataformas, lastPlatformId]);

  /* Autoselección inicial */
  useEffect(() => {
    if (platLoading || platError || !plataformasOrdered.length) return;
    if (form.plataforma_id === 0) {
      setForm((s) => ({ ...s, plataforma_id: plataformasOrdered[0]!.id }));
    }
  }, [plataformasOrdered, platLoading, platError, form.plataforma_id]);

  /* Default contraseña 'youtube' si aplica */
  const isYouTube = (id?: number) => {
    const name = (id ? plataformaMap.get(id) : '') || '';
    return /youtube/i.test(name);
  };
  useEffect(() => {
    if (!form.contrasena && isYouTube(form.plataforma_id)) {
      setForm((s) => ({ ...s, contrasena: 'youtube' }));
    }
  }, [form.plataforma_id, form.contrasena]); // eslint-disable-line

  /* ===== Stamp polling & suscripción a cambios ===== */
  useEffect(() => {
    let unsub: (() => void) | null = null;
    refreshCuentasStampOnce(); // primer refresh
    try {
      unsub = subscribeCuentasChanges(() => { refreshCuentasStampOnce(); });
    } catch {}
    const onFocus = () => refreshCuentasStampOnce();
    window.addEventListener('focus', onFocus);
    const id = window.setInterval(() => { refreshCuentasStampOnce(); }, STAMP_POLL_MS);
    return () => {
      unsub?.();
      window.removeEventListener('focus', onFocus);
      clearInterval(id);
    };
  }, []);

  /* ===== Nombre: control de edición manual y autocompletado por catálogo ===== */
  const [nombreDirty, setNombreDirty] = useState(false);
  const lastContactoRef = useRef<string>('');

  useEffect(() => {
    const raw = form.contacto.trim();
    const norm = normalizeContacto(raw);

    // contacto cambió → habilitar nuevo autocompletado
    if ((norm || '') !== lastContactoRef.current) {
      lastContactoRef.current = norm || '';
      setNombreDirty(false);
      setForm((s) => ({ ...s, nombre: '' }));
    }

    if (!norm || norm.length < CONTACTO_MIN_LEN) return;

    let canceled = false;
    const run = async () => {
      if (getUserFromAllCache(norm) === undefined) {
        await ensureUsersAllLoaded();
      }
      const u = getUserFromAllCache(norm);
      if (!canceled && u && !nombreDirty) {
        setForm((s) => ({ ...s, nombre: u.nombre ?? '' }));
      }
    };
    const id = window.setTimeout(run, 150);
    return () => { canceled = true; clearTimeout(id); };
  }, [form.contacto, nombreDirty]);

  /* ===== Mensajería + modal ===== */
  const [loading, setLoading] = useState(false);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPayload, setConfirmPayload] = useState<any>(null);
  const [confirmText, setConfirmText] = useState<string>('');
  const [confirmView, setConfirmView] = useState<'resumen' | 'json'>('resumen');

  /* ===== Sugerencias y cache de correos/contraseñas ===== */
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailOpts, setEmailOpts] = useState<EmailSuggestion[]>([]);
  const [emailCounts, setEmailCounts] = useState<Record<string, number>>({});
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailFound, setEmailFound] = useState(false);
  const [correoCount, setCorreoCount] = useState(0);
  const [selectedInvId, setSelectedInvId] = useState<number | null>(null);

  // cargar sugerencias (usa caches persistentes primero)
  async function fetchEmailsByPlatform(plataformaId: number) {
    if (!plataformaId) return;
    try {
      let ccMap = getCCMap(plataformaId);
      let invMap = getInvMap(plataformaId);

      if (!ccMap) {
        // cargar cuentascompletas para plataforma (muchas filas, pero limit razonable)
        const resDb = await fetch(`/api/cuentascompletas?plataforma_id=${plataformaId}&limit=${SUGGEST_LIMIT * 5}`, { cache: 'no-store' });
        const rowsDb = resDb.ok ? await parseListResponse(resDb) : [];
        const m: Record<string, CCEntry> = {};
        for (const r of rowsDb) {
          const c = normalizeEmail(r?.correo ?? '');
          if (!c) continue;
          const prev = m[c]?.count ?? 0;
          const pass = (r as any)?.contrasena ?? m[c]?.pass ?? null;
          m[c] = { count: prev + 1, pass };
        }
        writeCCCache(plataformaId, m);
        ccMap = m;
      }

      if (!invMap) {
        const resInv = await fetch(`/api/inventario?plataforma_id=${plataformaId}&limit=${SUGGEST_LIMIT * 3}`, { cache: 'no-store' });
        const rowsInv: InventarioRow[] = resInv.ok ? (await parseListResponse(resInv)) as any[] : [];
        const m: Record<string, InvEntry> = {};
        for (const it of rowsInv) {
          const c = normalizeEmail(it?.correo ?? '');
          if (!c) continue;
          m[c] = { pass: (it as any)?.clave ?? null, id: Number(it?.id) };
        }
        writeInvCache(plataformaId, m);
        invMap = m;
      }

      // construir sugerencias (primero inventario)
      const counts: Record<string, number> = {};
      for (const [email, entry] of Object.entries(ccMap)) counts[email] = entry.count;

      const seen = new Set<string>();
      const list: EmailSuggestion[] = [];

      for (const [email, inv] of Object.entries(invMap)) {
        if (seen.has(email)) continue;
        seen.add(email);
        list.push({ email, count: counts[email] ?? 0, source: 'inv', invId: inv.id, invClave: inv.pass ?? null });
        if (list.length >= SUGGEST_LIMIT) break;
      }
      if (list.length < SUGGEST_LIMIT) {
        const popular = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        for (const [email, count] of popular) {
          if (seen.has(email)) continue;
          seen.add(email);
          list.push({ email, count, source: 'db' });
          if (list.length >= SUGGEST_LIMIT) break;
        }
      }

      setEmailCounts(counts);
      setEmailOpts(list);
      setEmailError(null);
    } catch (e: any) {
      setEmailError(e?.message ?? 'No se pudieron cargar correos');
      setEmailOpts([]);
      setEmailCounts({});
    }
  }

  const onEmailFocus = () => {
    setEmailOpen(true);
    if (form.plataforma_id) fetchEmailsByPlatform(form.plataforma_id);
  };
  const onEmailBlur = () => setTimeout(() => setEmailOpen(false), 120);

  useEffect(() => {
    setEmailError(null);
    setEmailOpts([]);
    setEmailCounts({});
    setSelectedInvId(null);
    setCorreoCount(0);
    if (emailOpen && form.plataforma_id) fetchEmailsByPlatform(form.plataforma_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.plataforma_id]);

  useEffect(() => { setSelectedInvId(null); }, [form.correo]);

  // al escribir correo: intenta completar desde cache; si no, busca puntual y cachea
  const emailTimer = useRef<number | null>(null);
  useEffect(() => {
    const correo = form.correo.trim();
    if (emailTimer.current) window.clearTimeout(emailTimer.current);

    if (!correo || !form.plataforma_id || correo.length < EMAIL_MIN_LEN) {
      setEmailLoading(false);
      setEmailError(null);
      setEmailFound(false);
      setCorreoCount(0);
      return;
    }

    const pid = form.plataforma_id;
    const key = normalizeEmail(correo);

    // 1) desde caches persistentes
    const ccHit = getCCMap(pid)?.[key];
    const invHit = getInvMap(pid)?.[key];

    if (ccHit) {
      setEmailFound(true);
      setCorreoCount(ccHit.count ?? 0);
      if (ccHit.pass && !form.contrasena) {
        setForm((s) => ({ ...s, contrasena: ccHit.pass || s.contrasena }));
      }
      setCountInCache(pid, key, ccHit.count ?? 0);
    } else if (invHit) {
      setEmailFound(false);
      setCorreoCount(0);
      if (invHit.pass && !form.contrasena) {
        setForm((s) => ({ ...s, contrasena: invHit.pass || s.contrasena }));
      }
    } else {
      // 2) fetch puntual (debounced)
      emailTimer.current = window.setTimeout(async () => {
        setEmailLoading(true); setEmailError(null); setEmailFound(false);
        try {
          const url = `/api/cuentascompletas?q=${encodeURIComponent(key)}&plataforma_id=${pid}`;
          const res = await fetch(url, { cache: 'no-store' });
          if (!res.ok) throw new Error('No se pudo buscar el correo');
          const rows = await parseListResponse(res);
          const filtered = rows.filter((r) => (r?.plataforma_id == null ? true : Number(r.plataforma_id) === pid));

          const exact = filtered.find((u: any) => normalizeEmail(u?.correo ?? '') === key) as CorreoInfo | undefined;
          const count = filtered.map((r: any) => normalizeEmail(r?.correo ?? '')).filter((c: string) => !!c && c === key).length;

          // Actualizar cache CC si hay info
          if (count > 0 || exact?.contrasena != null) {
            const base = getCCMap(pid) || {};
            base[key] = { count, pass: (exact?.contrasena ?? base[key]?.pass ?? null) };
            writeCCCache(pid, base);
          }

          setEmailFound(!!exact);
          setCorreoCount(count);
          setCountInCache(pid, key, count);

          if (exact?.contrasena && !form.contrasena) {
            setForm((s) => ({ ...s, contrasena: exact.contrasena || s.contrasena }));
          }
        } catch (e: any) {
          setEmailError(e?.message ?? 'Error al buscar correo');
          setCorreoCount(0);
        } finally {
          setEmailLoading(false);
        }
      }, 300);
    }

    return () => { if (emailTimer.current) window.clearTimeout(emailTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.correo, form.plataforma_id, form.contrasena]);

  /* ===================== Recalcular fecha de vencimiento ===================== */
  useEffect(() => {
    const compra = form.fecha_compra;
    const meses = form.meses_pagados;
    if (!compra || !Number.isFinite(meses) || meses < 1) return;

    const nueva = addMonthsLocal(compra, meses);
    setForm((s) => (s.fecha_vencimiento === nueva ? s : { ...s, fecha_vencimiento: nueva }));
  }, [form.fecha_compra, form.meses_pagados]);

  /* ===================== Totales preview ===================== */
  const totalGanadoPreview = useMemo(() => {
    const tpStr = form.total_pagado.trim();
    if (tpStr === '' || Number.isNaN(Number(tpStr))) return '';
    const tp = Number(tpStr);
    const tppStr = form.total_pagado_proveedor.trim();
    if (tppStr === '') return String(tp);
    if (Number.isNaN(Number(tppStr))) return '';
    const tpp = Number(tppStr);
    return String(tp - tpp);
  }, [form.total_pagado, form.total_pagado_proveedor]);

  /* ===================== Validaciones ===================== */
  const canSubmit = useMemo(() => {
    const requiredOk =
      form.contacto.trim() !== '' &&
      Number.isInteger(form.plataforma_id) && form.plataforma_id > 0 &&
      form.correo.trim() !== '' &&
      form.contrasena.trim() !== '' &&
      Number.isInteger(form.meses_pagados) && form.meses_pagados >= 1 &&
      !!form.fecha_compra && !!form.fecha_vencimiento;

    const totalOk = form.total_pagado === '' || (!Number.isNaN(Number(form.total_pagado)) && Number(form.total_pagado) >= 0);
    const totalProvOk = form.total_pagado_proveedor === '' || (!Number.isNaN(Number(form.total_pagado_proveedor)) && Number(form.total_pagado_proveedor) >= 0);
    return requiredOk && totalOk && totalProvOk;
  }, [form]);

  /* ===================== Payload ===================== */
  const buildPayload = () => {
    const totalPagadoNum = form.total_pagado !== '' ? Number(form.total_pagado) : null;
    const totalProvNum = form.total_pagado_proveedor !== '' ? Number(form.total_pagado_proveedor) : null;
    const total_ganado = totalPagadoNum !== null ? (totalProvNum !== null ? totalPagadoNum - totalProvNum : totalPagadoNum) : null;

    return {
      contacto: normalizeContacto(form.contacto.trim()),
      nombre: form.nombre.trim() || null,
      plataforma_id: form.plataforma_id,
      correo: form.correo.trim().toLowerCase(),
      contrasena: form.contrasena || null,
      proveedor: form.proveedor.trim() || null,
      fecha_compra: form.fecha_compra || null,
      fecha_vencimiento: form.fecha_vencimiento || null,
      meses_pagados: form.meses_pagados,
      total_pagado: totalPagadoNum,
      total_pagado_proveedor: totalProvNum,
      total_ganado,
      estado: form.estado.trim() || null,
      comentario: form.comentario.trim() || null,
    };
  };

  /* ===================== Submit => abrir modal ===================== */
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setOkMsg(null); setErrMsg(null);
    if (!canSubmit) { setErrMsg('Revisa los campos obligatorios y formatos numéricos.'); return; }
    const payload = buildPayload();
    setConfirmPayload(payload);
    setConfirmText(JSON.stringify(payload, null, 2));
    setConfirmView('resumen');
    setConfirmOpen(true);
  }

  /* ===================== Confirmar y guardar ===================== */
  async function confirmAndSave() {
    if (!confirmPayload) return;
    setLoading(true); setErrMsg(null);
    try {
      let toSend = confirmPayload;
      try { toSend = JSON.parse(confirmText); } catch {}

      const res = await fetch('/api/cuentascompletas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toSend),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? 'No se pudo guardar');
      }

      const raw = await res.json();
      const saved = raw?.cuenta ?? raw;

      // preferencia de plataforma
      try { window.localStorage.setItem(LAST_PLATFORM_KEY, String(toSend.plataforma_id)); } catch {}

      // si venía de inventario, intenta eliminarlo
      if (selectedInvId != null) { try { await fetch(`/api/inventario/${selectedInvId}`, { method: 'DELETE' }); } catch {} }

      // cache local del nuevo registro
      try {
        const rowForCache = {
          id: Number(saved?.id),
          contacto: String(saved?.contacto ?? toSend.contacto ?? ''),
          nombre: (saved?.nombre ?? toSend.nombre ?? null) as string | null,
          plataforma_id: Number(saved?.plataforma_id ?? toSend.plataforma_id),
          correo: String(saved?.correo ?? toSend.correo ?? ''),
          contrasena: (saved?.contrasena ?? toSend.contrasena ?? null) as string | null,
          proveedor: (saved?.proveedor ?? toSend.proveedor ?? null) as string | null,
          fecha_compra: (saved?.fecha_compra ?? toSend.fecha_compra ?? null) as string | null,
          fecha_vencimiento: (saved?.fecha_vencimiento ?? toSend.fecha_vencimiento ?? null) as string | null,
          meses_pagados: (saved?.meses_pagados ?? toSend.meses_pagados ?? null) as number | null,
          total_pagado: (saved?.total_pagado ?? toSend.total_pagado ?? null) as number | null,
          total_pagado_proveedor: (saved?.total_pagado_proveedor ?? toSend.total_pagado_proveedor ?? null) as number | null,
          total_ganado: (saved?.total_ganado ?? toSend.total_ganado ?? null) as number | null,
          estado: (saved?.estado ?? toSend.estado ?? null) as string | null,
          comentario: (saved?.comentario ?? toSend.comentario ?? null) as string | null,
        };
        mergeCuentaCompletaIntoCache(rowForCache as any);
      } catch {}

      // invalidar caches dependientes (stamp) y notificar
      try {
        notifyCuentasChanged({ action: 'insert', id: Number(saved?.id), plataforma_id: Number(saved?.plataforma_id ?? toSend.plataforma_id) });
        await refreshCuentasStampOnce();
      } catch {}

      // UI OK + reset
      setOkMsg('Guardado correctamente. ID: ' + (saved?.id ?? ''));
      setConfirmOpen(false);

      const base = todayStr();
      const stored = window.localStorage.getItem(LAST_PLATFORM_KEY);
      const lastId = stored ? Number(stored) : NaN;
      const nextPlat = Number.isFinite(lastId) && lastId > 0 ? lastId : (plataformasOrdered[0]?.id ?? 0);

      setForm({
        contacto: '',
        nombre: '',
        plataforma_id: nextPlat,
        correo: '',
        contrasena: isYouTube(nextPlat) ? 'youtube' : '',
        proveedor: '',
        fecha_compra: base,
        fecha_vencimiento: addMonthsLocal(base, 1),
        meses_pagados: 1,
        total_pagado: '',
        total_pagado_proveedor: '',
        estado: 'ACTIVA',
        comentario: '',
      });
      setSelectedInvId(null);
      setEmailOpts([]);
      setCorreoCount(0);
      setNombreDirty(false);
      lastContactoRef.current = '';
    } catch (err: any) {
      setErrMsg(err?.message ?? 'Error desconocido');
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
              value={form.contacto}
              onChange={(v) => { if (/^\+?\d*(?:\s?\d*)*$/.test(v)) setForm((s) => ({ ...s, contacto: v })); }}
              required
              inputMode="numeric"
              pattern="^\+\d+(?:\s*\d+)*$"
              title="Formato válido: + seguido de números"
              onInvalid={(e: any) => e.currentTarget.setCustomValidity('Ingresa un teléfono en formato + y solo números')}
              onInput={(e: any) => e.currentTarget.setCustomValidity('')}
              inputClassName="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
            />
            <Field
              label="Nombre"
              placeholder="Se autocompleta si el contacto existe (desde cache)"
              value={form.nombre}
              onChange={(v) => { setNombreDirty(true); setForm((s) => ({ ...s, nombre: v })); }}
              inputClassName="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
            />
          </div>
        </section>

        {/* Cuenta completa */}
        <section className="border border-neutral-800 rounded-2xl p-4 bg-neutral-950/40 text-neutral-100">
          <h2 className="font-semibold mb-3 text-neutral-100">Datos de la cuenta completa</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Plataforma */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label htmlFor="plataforma" className="block text-sm text-neutral-300">
                  Plataforma <span className="text-red-600">*</span>
                </label>
                {lastPlatformId && <span className="text-xs text-neutral-400">Última usada: #{lastPlatformId}</span>}
              </div>
              <select
                id="plataforma"
                className={[
                  'w-full rounded-lg px-3 py-2',
                  'border border-neutral-700 bg-neutral-900 text-neutral-100',
                  'outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500',
                  '[&>option]:bg-neutral-900 [&>option]:text-neutral-100',
                ].join(' ')}
                value={form.plataforma_id ? String(form.plataforma_id) : ''}
                onChange={(e) => {
                  const newId = Number(e.target.value);
                  setForm((s) => ({
                    ...s,
                    plataforma_id: newId,
                    correo: '',
                    contrasena: (!s.contrasena && isYouTube(newId)) ? 'youtube' : s.contrasena,
                  }));
                }}
                required
                disabled={platLoading || !!platError}
              >
                <option value="" disabled>
                  {platLoading ? 'Cargando…' : platError ? 'Error al cargar' : 'Selecciona una plataforma'}
                </option>
                {plataformasOrdered.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>

            {/* Correo + sugerencias */}
            <div className="relative">
              <Field
                label="Correo *"
                labelRight={
                  <span className={[
                    'text-xs rounded-full px-2 py-[2px] border',
                    correoCount > 0 ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-emerald-300 bg-emerald-50 text-emerald-700',
                  ].join(' ')}>
                    {correoCount > 0 ? `coincidencias: ${correoCount}` : 'sin coincidencias'}
                  </span>
                }
                type="email"
                placeholder="correo@dominio.com"
                value={form.correo}
                onChange={(v) => setForm((s) => ({ ...s, correo: v }))}
                onFocus={onEmailFocus}
                onBlur={onEmailBlur}
                required
                inputClassName="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
              />

              {emailOpen && emailOpts.length > 0 && (
                <div className="absolute left-0 right-0 z-10 mt-1 rounded-lg border border-neutral-700 bg-neutral-900 text-sm text-neutral-100 shadow-lg">
                  <ul className="max-h-56 overflow-auto">
                    {emailOpts.map((opt) => (
                      <li
                        key={`${opt.source}:${opt.invId ?? ''}:${opt.email}`}
                        className="cursor-pointer px-3 py-2 flex items-center justify-between hover:bg-neutral-800"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setForm((s) => ({
                            ...s,
                            correo: opt.email,
                            contrasena: s.contrasena || (opt.invClave ?? ''),
                          }));
                          setSelectedInvId(opt.source === 'inv' ? opt.invId ?? null : null);
                          setEmailOpen(false);
                        }}
                        title={opt.source === 'inv' ? 'Disponible en inventario' : `${opt.count} coincidencia(s) en cuentas`}
                      >
                        <span className="truncate">{opt.email}</span>
                        <span className="flex items-center gap-2">
                          {opt.source === 'inv'
                            ? <span className="text-[10px] px-1.5 py-[1px] rounded-full border border-emerald-300 text-emerald-300">INV</span>
                            : <span className="text-xs opacity-70">({opt.count})</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-1 text-xs">
                {emailLoading && <span className="text-neutral-400">Buscando correo…</span>}
                {!emailLoading && emailError && <span className="text-red-300">Error: {emailError}</span>}
                {!emailLoading && !emailError && emailFound && <span className="text-neutral-300">Correo existente. Contraseña completada.</span>}
                {!emailLoading && !emailError && selectedInvId != null && <span className="text-emerald-300">Correo tomado del inventario.</span>}
              </div>
            </div>

            {/* Contraseña SIEMPRE VISIBLE */}
            <Field
              label="Contraseña *"
              type="text"
              placeholder="Contraseña"
              value={form.contrasena}
              onChange={(v) => setForm((s) => ({ ...s, contrasena: v }))}
              required
              inputClassName="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
            />

            <Field
              label="Proveedor"
              placeholder="Opcional"
              value={form.proveedor}
              onChange={(v) => setForm((s) => ({ ...s, proveedor: v }))}
              inputClassName="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
            />

            <Field
              label="Fecha de compra *"
              type="date"
              value={form.fecha_compra}
              onChange={(v) => setForm((s) => ({ ...s, fecha_compra: v }))}
              required
              inputClassName="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
            />

            <Field
              label="Fecha de vencimiento (auto) *"
              type="date"
              value={form.fecha_vencimiento}
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
              value={String(form.meses_pagados)}
              onChange={(v) => {
                const n = v === '' ? NaN : Number(v);
                setForm((s) => ({ ...s, meses_pagados: Number.isNaN(n) ? (1 as any) : Math.max(1, Math.trunc(n)) }));
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
              value={form.total_pagado}
              onChange={(v) => setForm((s) => ({ ...s, total_pagado: v }))}
              inputClassName="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
            />
            <Field
              label="Total pagado proveedor (opcional)"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={form.total_pagado_proveedor}
              onChange={(v) => setForm((s) => ({ ...s, total_pagado_proveedor: v }))}
              inputClassName="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
            />
            <Field
              label="Total ganado (auto)"
              type="text"
              value={totalGanadoPreview}
              onChange={() => {}}
              disabled
              inputClassName="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500 cursor-not-allowed opacity-80"
            />

            <Field
              label="Estado"
              placeholder='Ej. "ACTIVA", "PAUSADA"…'
              value={form.estado}
              onChange={(v) => setForm((s) => ({ ...s, estado: v }))}
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
            className={['px-4 py-2 rounded-xl border', canSubmit && !loading ? 'bg-gray-900 text-white border-gray-900' : 'opacity-60 cursor-not-allowed'].join(' ')}
          >
            {loading ? 'Procesando…' : 'Guardar'}
          </button>
          <button
            type="button"
            onClick={() => {
              const base = todayStr();
              const stored = typeof window !== 'undefined' ? window.localStorage.getItem(LAST_PLATFORM_KEY) : null;
              const lastId = stored ? Number(stored) : NaN;
              const nextPlat = Number.isFinite(lastId) && lastId > 0 ? lastId : (plataformasOrdered[0]?.id ?? 0);
              setForm({
                contacto: '',
                nombre: '',
                plataforma_id: nextPlat,
                correo: '',
                contrasena: isYouTube(nextPlat) ? 'youtube' : '',
                proveedor: '',
                fecha_compra: base,
                fecha_vencimiento: addMonthsLocal(base, 1),
                meses_pagados: 1,
                total_pagado: '',
                total_pagado_proveedor: '',
                estado: 'ACTIVA',
                comentario: '',
              });
              setSelectedInvId(null);
              setEmailOpts([]);
              setCorreoCount(0);
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
            className="w-full max-w-4xl rounded-2xl border border-neutral-700 bg-neutral-900 text-neutral-100 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-neutral-800 flex items-center justify-center text-sm">✅</div>
                <div>
                  <h3 id="confirm-title" className="font-semibold text-lg">Confirmar datos a guardar</h3>
                  <p className="text-xs text-neutral-400">Revisa el contenido antes de continuar. Se enviará tal cual.</p>
                </div>
              </div>
              <button className="text-neutral-300 hover:text-white rounded-lg px-2 py-1" onClick={() => setConfirmOpen(false)} aria-label="Cerrar">✕</button>
            </div>

            {/* Tabs + Acciones */}
            <div className="px-5 pt-4 flex items-center justify-between gap-2">
              <div className="inline-flex rounded-lg border border-neutral-700 overflow-hidden">
                <button type="button" className={`px-3 py-1.5 text-sm ${confirmView === 'resumen' ? 'bg-neutral-800' : 'bg-neutral-900 hover:bg-neutral-800'}`} onClick={() => setConfirmView('resumen')}>Resumen</button>
                <button type="button" className={`px-3 py-1.5 text-sm ${confirmView === 'json' ? 'bg-neutral-800' : 'bg-neutral-900 hover:bg-neutral-800'}`} onClick={() => setConfirmView('json')}>JSON</button>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" className="text-sm px-3 py-1.5 rounded-lg border border-neutral-700 hover:bg-neutral-800" onClick={() => navigator.clipboard?.writeText?.(confirmText)}>Copiar JSON</button>
                <button
                  type="button"
                  className="text-sm px-3 py-1.5 rounded-lg border border-neutral-700 hover:bg-neutral-800"
                  onClick={() => {
                    let obj = confirmPayload;
                    try { obj = JSON.parse(confirmText); } catch {}
                    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = 'cuenta.json'; a.click();
                    URL.revokeObjectURL(url);
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
                    <h4 className="font-medium text-sm text-neutral-300 mb-1">Datos del usuario</h4>
                    <dl className="grid grid-cols-[140px_1fr] text-sm gap-y-2">
                      <dt className="text-neutral-400">Contacto</dt><dd className="font-medium">{confirmPayload?.contacto || '—'}</dd>
                      <dt className="text-neutral-400">Nombre</dt>
                      <dd className="font-medium">
                        {confirmPayload?.nombre || '—'} {isEmpty(confirmPayload?.nombre) && (
                          <span className="text-[10px] px-2 py-[2px] rounded-full border border-neutral-500 text-neutral-300">opcional</span>
                        )}
                      </dd>
                      <dt className="text-neutral-400">Estado</dt><dd className="font-medium">{confirmPayload?.estado || '—'}</dd>
                    </dl>
                  </div>

                  {/* Cuenta */}
                  <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 space-y-3">
                    <h4 className="font-medium text-sm text-neutral-300 mb-1">Cuenta y plataforma</h4>
                    <dl className="grid grid-cols-[140px_1fr] text-sm gap-y-2">
                      <dt className="text-neutral-400">Plataforma</dt>
                      <dd className="font-semibold">{plataformaMap.get(confirmPayload?.plataforma_id) ?? `#${confirmPayload?.plataforma_id ?? '—'}`}</dd>
                      <dt className="text-neutral-400">Correo</dt><dd className="font-medium">{confirmPayload?.correo || '—'}</dd>
                      <dt className="text-neutral-400">Contraseña</dt><dd className="font-mono">{confirmPayload?.contrasena || '—'}</dd>
                      <dt className="text-neutral-400">Proveedor</dt><dd className="font-medium">{confirmPayload?.proveedor || '—'}</dd>
                      <dt className="text-neutral-400">Compra</dt><dd className="font-medium">{confirmPayload?.fecha_compra || '—'}</dd>
                      <dt className="text-neutral-400">Vencimiento</dt><dd className="font-medium">{confirmPayload?.fecha_vencimiento || '—'}</dd>
                      <dt className="text-neutral-400">Meses pagados</dt><dd className="font-medium">{confirmPayload?.meses_pagados ?? '—'}</dd>
                    </dl>
                  </div>

                  {/* Totales */}
                  <div className="md:col-span-2 rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                    <h4 className="font-medium text-sm text-neutral-300 mb-2">Totales</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="rounded-lg border border-neutral-800 p-3">
                        <div className="text-xs text-neutral-400">Total pagado</div>
                        <div className="text-lg font-semibold">{toMoney(confirmPayload?.total_pagado)}</div>
                      </div>
                      <div className="rounded-lg border border-neutral-800 p-3">
                        <div className="text-xs text-neutral-400">Pagado proveedor</div>
                        <div className="text-lg font-semibold">{toMoney(confirmPayload?.total_pagado_proveedor)}</div>
                      </div>
                      <div className="rounded-lg border border-neutral-800 p-3">
                        <div className="text-xs text-neutral-400">Total ganado</div>
                        <div className="text-lg font-semibold">{toMoney(confirmPayload?.total_ganado)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Comentario */}
                  <div className="md:col-span-2 rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                    <h4 className="font-medium text-sm text-neutral-300 mb-2">Comentario</h4>
                    <div className="text-sm whitespace-pre-wrap">{confirmPayload?.comentario || <span className="opacity-70">—</span>}</div>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-neutral-300 mb-2">Puedes editar el texto antes de confirmar. Se enviará exactamente este JSON.</p>
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
              <button className="px-3 py-2 rounded-lg border border-neutral-600 hover:bg-neutral-800" onClick={() => setConfirmOpen(false)} disabled={loading}>Volver a editar</button>
              <button className="px-3 py-2 rounded-lg border border-emerald-700 bg-emerald-800/40 hover:bg-emerald-800/60 disabled:opacity-60" onClick={confirmAndSave} disabled={loading}>
                {loading ? 'Guardando…' : 'Confirmar y guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
