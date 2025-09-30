'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Field from '@/components/ui/Field';
import TextArea from '@/components/ui/TextArea';
import { normalizeContacto } from '@/lib/strings';
import { todayStr } from '@/lib/dates';
import { usePlataformas } from '@/hooks/usePlataformas';

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
const CACHE_TTL_MS = 60_000;
const CACHE_MAX = 100;
const CONTACTO_MIN_LEN = 5;
const EMAIL_MIN_LEN = 5;
const SUGGEST_LIMIT = 20;
const LAST_PLATFORM_KEY = 'cuentascompletas:lastPlatformId';

/* ===================== Utils de fecha ===================== */
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

/* ===================== Parser de respuestas ===================== */
async function parseListResponse(res: Response): Promise<any[]> {
  const data = await res.json().catch(() => null);
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray((data as any).items)) return (data as any).items;
  return [];
}

/* ===================== Helpers UI (modal) ===================== */
const isEmpty = (v: any) => v == null || v === '';
const toMoney = (n: number | null) =>
  n == null || Number.isNaN(n) ? '—' : new Intl.NumberFormat().format(n);

function copyToClipboard(text: string) {
  try { navigator.clipboard.writeText(text); } catch {}
}
function downloadJson(filename: string, obj: any) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
function badge(required = false) {
  return required
    ? 'text-[10px] px-2 py-[2px] rounded-full border border-emerald-400 text-emerald-300'
    : 'text-[10px] px-2 py-[2px] rounded-full border border-neutral-500 text-neutral-300';
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

  /* map id->nombre */
  const plataformaMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const p of plataformas) m.set(p.id, (p as any).nombre ?? String(p.id));
    return m;
  }, [plataformas]);

  /* ordenar priorizando última usada */
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

  /* autoselección inicial */
  useEffect(() => {
    if (platLoading || platError || !plataformasOrdered.length) return;
    if (form.plataforma_id === 0) {
      setForm((s) => ({ ...s, plataforma_id: plataformasOrdered[0]!.id }));
    }
  }, [plataformasOrdered, platLoading, platError, form.plataforma_id]);

  /* default contraseña "youtube" cuando plataforma sea YouTube y esté vacío */
  const isYouTube = (id?: number) => {
    const name = (id ? plataformaMap.get(id) : '') || '';
    return /youtube/i.test(name);
  };
  useEffect(() => {
    if (!form.contrasena && isYouTube(form.plataforma_id)) {
      setForm((s) => ({ ...s, contrasena: 'youtube' }));
    }
  }, [form.plataforma_id, form.contrasena]);

  /* mensajería + modal */
  const [loading, setLoading] = useState(false);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPayload, setConfirmPayload] = useState<any>(null);
  const [confirmText, setConfirmText] = useState<string>('');
  const [confirmView, setConfirmView] = useState<'resumen' | 'json'>('resumen');

  /* caches y timers */
  const contactTimer = useRef<number | null>(null);
  const userCache = useRef<Map<string, { data: Usuario | null; ts: number }>>(new Map());

  const getUserFromCache = (key: string) => {
    const hit = userCache.current.get(key);
    if (!hit) return undefined;
    if (Date.now() - hit.ts > CACHE_TTL_MS) { userCache.current.delete(key); return undefined; }
    return hit.data;
  };
  const setUserInCache = (key: string, data: Usuario | null) => {
    if (userCache.current.size >= CACHE_MAX) {
      const firstKey = userCache.current.keys().next().value;
      if (firstKey) userCache.current.delete(firstKey);
    }
    userCache.current.set(key, { data, ts: Date.now() });
  };

  /* autocompletar nombre */
  useEffect(() => {
    const raw = form.contacto.trim();
    const norm = normalizeContacto(raw);
    if (contactTimer.current) window.clearTimeout(contactTimer.current);

    if (!norm || norm.length < CONTACTO_MIN_LEN) {
      setForm((s) => ({ ...s, nombre: s.nombre ?? '' }));
      return;
    }

    const cached = getUserFromCache(norm);
    if (cached !== undefined) {
      if (cached) setForm((s) => ({ ...s, nombre: cached.nombre ?? '' }));
      return;
    }

    contactTimer.current = window.setTimeout(async () => {
      try {
        const urls = [
          `/api/usuarios?q=${encodeURIComponent(raw)}`,
          norm !== raw ? `/api/usuarios?q=${encodeURIComponent(norm)}` : '',
        ].filter(Boolean) as string[];

        let arr: Usuario[] = [];
        for (const url of urls) {
          const res = await fetch(url, { cache: 'no-store' });
          if (!res.ok) continue;
          const list = await parseListResponse(res);
          arr = arr.concat(list);
        }
        const seen = new Set<string>();
        const merged = arr.filter((u) => {
          const k = normalizeContacto(u.contacto);
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
        const exact = merged.find((u) => normalizeContacto(u.contacto) === norm) ?? null;
        setUserInCache(norm, exact);
        if (exact) setForm((s) => ({ ...s, nombre: exact.nombre ?? '' }));
      } catch {}
    }, 350);

    return () => { if (contactTimer.current) window.clearTimeout(contactTimer.current); };
  }, [form.contacto]);

  /* correo: sugerencias/contador/clave */
  const emailCache = useRef<Map<string, { data: CorreoInfo | null; ts: number }>>(new Map());
  const emailKey = (correo: string, plataformaId: number) => `${plataformaId}|${correo.toLowerCase()}`;
  const getEmailFromCache = (key: string) => {
    const hit = emailCache.current.get(key);
    if (!hit) return undefined;
    if (Date.now() - hit.ts > CACHE_TTL_MS) { emailCache.current.delete(key); return undefined; }
    return hit.data;
  };
  const setEmailInCache = (key: string, data: CorreoInfo | null) => {
    if (emailCache.current.size >= CACHE_MAX) {
      const firstKey = emailCache.current.keys().next().value;
      if (firstKey) emailCache.current.delete(firstKey);
    }
    emailCache.current.set(key, { data, ts: Date.now() });
  };

  const [emailOpen, setEmailOpen] = useState(false);
  const [emailOpts, setEmailOpts] = useState<EmailSuggestion[]>([]);
  const [emailCounts, setEmailCounts] = useState<Record<string, number>>({});
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailFound, setEmailFound] = useState(false);
  const emailTimer = useRef<number | null>(null);
  const suggestionsAbort = useRef<AbortController | null>(null);
  const [correoCount, setCorreoCount] = useState(0);
  const [selectedInvId, setSelectedInvId] = useState<number | null>(null);

  async function fetchEmailsByPlatform(plataformaId: number) {
    if (!plataformaId) return;
    suggestionsAbort.current?.abort();
    const ac = new AbortController();
    suggestionsAbort.current = ac;

    try {
      const resDb = await fetch(
        `/api/cuentascompletas?plataforma_id=${plataformaId}&limit=${SUGGEST_LIMIT * 5}`,
        { cache: 'no-store', signal: ac.signal }
      );
      const rowsDb = resDb.ok ? await parseListResponse(resDb) : [];

      const counts: Record<string, number> = {};
      for (const r of rowsDb) {
        const c = String(r?.correo ?? '').trim().toLowerCase();
        if (!c) continue;
        counts[c] = (counts[c] ?? 0) + 1;
      }

      const resInv = await fetch(
        `/api/inventario?plataforma_id=${plataformaId}&limit=${SUGGEST_LIMIT * 3}`,
        { cache: 'no-store', signal: ac.signal }
      );
      const rowsInv: InventarioRow[] = resInv.ok ? (await parseListResponse(resInv)) as any[] : [];

      const seen = new Set<string>();
      const list: EmailSuggestion[] = [];

      for (const it of rowsInv) {
        const email = String(it?.correo ?? '').trim().toLowerCase();
        if (!email || seen.has(email)) continue;
        seen.add(email);
        list.push({
          email,
          count: counts[email] ?? 0,
          source: 'inv',
          invId: Number(it?.id),
          invClave: (it as any)?.clave ?? null,
        });
        if (list.length >= SUGGEST_LIMIT) break;
      }

      if (list.length < SUGGEST_LIMIT) {
        const popular = Object.entries(counts).sort((a, b) => (b[1] - a[1]));
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

  const onEmailFocus = () => { setEmailOpen(true); if (form.plataforma_id) fetchEmailsByPlatform(form.plataforma_id); };
  const onEmailBlur = () => setTimeout(() => setEmailOpen(false), 120);

  useEffect(() => {
    setEmailFound(false); setEmailError(null); setEmailOpts([]); setEmailCounts({});
    emailCache.current.clear(); setSelectedInvId(null);
    if (emailOpen && form.plataforma_id) fetchEmailsByPlatform(form.plataforma_id);
  }, [form.plataforma_id]); // eslint-disable-line

  useEffect(() => { setSelectedInvId(null); }, [form.correo]);

  useEffect(() => {
    const correo = form.correo.trim();
    if (emailTimer.current) window.clearTimeout(emailTimer.current);

    if (!correo || !form.plataforma_id || correo.length < EMAIL_MIN_LEN) {
      setEmailLoading(false); setEmailError(null); setEmailFound(false); setCorreoCount(0); return;
    }

    const key = emailKey(correo, form.plataforma_id);
    const cached = getEmailFromCache(key);
    if (cached !== undefined) {
      setEmailFound(!!cached);
      if (cached?.contrasena && !form.contrasena) {
        setForm((s) => ({ ...s, contrasena: cached.contrasena || s.contrasena }));
      }
    }

    emailTimer.current = window.setTimeout(async () => {
      setEmailLoading(true); setEmailError(null); setEmailFound(false);
      try {
        const url = `/api/cuentascompletas?q=${encodeURIComponent(correo)}&plataforma_id=${form.plataforma_id}`;
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error('No se pudo buscar el correo');
        const rows = await parseListResponse(res);

        const filtered = rows.filter((r) =>
          r?.plataforma_id == null ? true : Number(r.plataforma_id) === form.plataforma_id
        );

        const exact = (filtered.find((u: any) => (u?.correo ?? '').toLowerCase() === correo.toLowerCase()) as CorreoInfo) ?? null;

        setEmailInCache(key, exact);
        setEmailFound(!!exact);

        if (exact?.contrasena && !form.contrasena) {
          setForm((s) => ({ ...s, contrasena: exact.contrasena || s.contrasena }));
        }

        const count = filtered
          .map((r: any) => (r?.correo ?? '').trim().toLowerCase())
          .filter((c: string) => !!c && c === correo.toLowerCase()).length;
        setCorreoCount(count);
      } catch (e: any) {
        setEmailError(e?.message ?? 'Error al buscar correo'); setCorreoCount(0);
      } finally { setEmailLoading(false); }
    }, 350);

    return () => { if (emailTimer.current) window.clearTimeout(emailTimer.current); };
  }, [form.correo, form.contrasena, form.plataforma_id]);

  /* ===================== Recalcular fecha de vencimiento ===================== */
  useEffect(() => {
    const compra = form.fecha_compra;
    const meses = form.meses_pagados;
    if (!compra || !Number.isFinite(meses) || meses < 1) return;

    const nueva = addMonthsLocal(compra, meses);
    // Evitar renders innecesarios
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
      const data = await res.json();

      try { window.localStorage.setItem(LAST_PLATFORM_KEY, String(toSend.plataforma_id)); } catch {}

      if (selectedInvId != null) { try { await fetch(`/api/inventario/${selectedInvId}`, { method: 'DELETE' }); } catch {} }

      setOkMsg('Guardado correctamente. ID: ' + (data?.cuenta?.id ?? data?.id ?? ''));
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
              placeholder="Nombre del usuario"
              value={form.nombre}
              onChange={(v) => setForm((s) => ({ ...s, nombre: v }))}
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
                  ].join(' ')}
                  >
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
            }}
            className="px-4 py-2 rounded-xl border"
          >
            Limpiar
          </button>
        </div>

        {okMsg && <p className="text-green-700 text-sm">{okMsg}</p>}
        {errMsg && <p className="text-red-600 text-sm">Error: {errMsg}</p>}
      </form>

      {/* ===== Modal (sin máscara y sin checkbox) ===== */}
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
                <button type="button" className="text-sm px-3 py-1.5 rounded-lg border border-neutral-700 hover:bg-neutral-800" onClick={() => copyToClipboard(confirmText)}>Copiar JSON</button>
                <button type="button" className="text-sm px-3 py-1.5 rounded-lg border border-neutral-700 hover:bg-neutral-800" onClick={() => { let obj = confirmPayload; try { obj = JSON.parse(confirmText); } catch {} downloadJson('cuenta.json', obj); }}>Descargar</button>
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
                      <dt className="text-neutral-400">Nombre</dt><dd className="font-medium">{confirmPayload?.nombre || '—'} {isEmpty(confirmPayload?.nombre) && <span className={badge(false)}>opcional</span>}</dd>
                      <dt className="text-neutral-400">Estado</dt><dd className="font-medium">{confirmPayload?.estado || '—'} {isEmpty(confirmPayload?.estado) && <span className={badge(false)}>opcional</span>}</dd>
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
                      <dt className="text-neutral-400">Proveedor</dt><dd className="font-medium">{confirmPayload?.proveedor || '—'} {isEmpty(confirmPayload?.proveedor) && <span className={badge(false)}>opcional</span>}</dd>
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

            {/* Footer (solo botones) */}
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
