'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePlataformas } from '@/hooks/usePlataformas';
import { normalizeContacto } from '@/lib/strings';
import { todayStr } from '@/lib/dates';
import { FieldPantallas } from '@/components/ui/FieldPantallas';
import TextArea from '@/components/ui/TextArea';
import { fetchPantallasCountByCuentaId } from '@/lib/pantallas';
import type { Usuario, Cuenta, FormState } from '@/types/pantallas';

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
const USER_CACHE_TTL = 60_000;

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

/* ===================== Helpers fetch ===================== */
const normalizeEmail = (s: string) => s.trim().toLowerCase();

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

/** Conteo robusto por correo (filtra client-side) y por plataforma si se provee */
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

/** Conteo “inteligente”: prioriza cuenta_id; si no hay, correo+plataforma */
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

/* ===================== Helpers UI (modal) ===================== */
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

  const { plataformas, loading: platLoading, error: platError } = usePlataformas();

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

  /* ====== Autoselección inicial (usa última plataforma si hay) ====== */
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

  /* ===== Autocompletar nombre (usuario) ===== */
  const userTimer = useRef<number | null>(null);
  const userCache = useRef<Map<string, { data: Usuario | null; ts: number }>>(new Map());
  const getUserCache = (k: string) => {
    const hit = userCache.current.get(k);
    if (!hit) return undefined;
    if (Date.now() - hit.ts > USER_CACHE_TTL) {
      userCache.current.delete(k);
      return undefined;
    }
    return hit.data;
  };
  const setUserCache = (k: string, data: Usuario | null) =>
    userCache.current.set(k, { data, ts: Date.now() });

  useEffect(() => {
    const raw = form.contacto.trim();
    const norm = normalizeContacto(raw);
    if (userTimer.current) {
      clearTimeout(userTimer.current);
      userTimer.current = null;
    }
    if (!norm || norm.length < 5) return;

    const cached = getUserCache(norm);
    if (cached !== undefined) {
      if (cached) setForm((s) => ({ ...s, nombre: cached.nombre ?? '' }));
      return;
    }

    userTimer.current = window.setTimeout(async () => {
      try {
        const urls = [
          `/api/usuarios?q=${encodeURIComponent(raw)}`,
          norm !== raw ? `/api/usuarios?q=${encodeURIComponent(norm)}` : '',
        ].filter(Boolean) as string[];
        let arr: Usuario[] = [];
        for (const url of urls) {
          const r = await fetch(url, { cache: 'no-store' });
          if (!r.ok) continue;
          arr = arr.concat(await r.json());
        }
        const exact = arr.find((u) => normalizeContacto(u.contacto) === norm) ?? null;
        setUserCache(norm, exact);
        if (exact) setForm((s) => ({ ...s, nombre: exact.nombre ?? '' }));
      } catch {}
    }, 350);

    return () => {
      if (userTimer.current) clearTimeout(userTimer.current);
    };
  }, [form.contacto]);

  /* ===== Sugerencias de CORREO (inventario + cuentas) ===== */
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

      // 1) cuentas compartidas
      const rAcct = await fetch(`/api/cuentascompartidas?plataforma_id=${pid}`, {
        cache: 'no-store',
      });
      if (!rAcct.ok) throw new Error('No se pudieron cargar correos');
      const acctRows: Cuenta[] = await rAcct.json();
      const seen = new Set<string>();
      const nextOptions: Array<{ email: string; source: 'acct' | 'inv' }> = [];

      const nextAcctId: Record<string, number> = {};
      const nextAcctPass: Record<string, string | null> = {};

      for (const r of acctRows) {
        const c = normalizeEmail(r?.correo ?? '');
        if (!c || seen.has(c)) continue;
        seen.add(c);
        nextOptions.push({ email: c, source: 'acct' });
        nextAcctId[c] = nextAcctId[c] != null ? Math.max(nextAcctId[c], r.id) : r.id;
        if ((r as any).contrasena !== undefined) nextAcctPass[c] = (r as any).contrasena ?? null;
        if (nextOptions.length >= 20) break;
      }

      // 2) inventario (completa hasta 20, sin duplicar)
      const rInv = await fetch(`/api/inventario?plataforma_id=${pid}&limit=100`, {
        cache: 'no-store',
      });
      if (rInv.ok) {
        const invRows: InventarioItem[] = await rInv.json();
        const invPasses: Record<string, string | null> = {};
        for (const it of invRows) {
          const c = normalizeEmail(it?.correo ?? '');
          if (!c || seen.has(c)) continue;
          seen.add(c);
          nextOptions.push({ email: c, source: 'inv' });
          invPasses[c] = (it as any).clave ?? null;
          if (nextOptions.length >= 20) break;
        }
        setInvPassMap((m) => ({ ...m, ...invPasses }));
      }

      setAcctIdMap(nextAcctId);
      setAcctPassMap(nextAcctPass);
      setOptions(nextOptions);

      // 3) conteo de pantallas por opción (smart)
      await Promise.all(
        nextOptions.slice(0, 20).map(async ({ email, source }) => {
          const cid = source === 'acct' ? nextAcctId[email] : undefined;
          const n = await countPantallasSmart(email, cid, pid);
          setEmailCounts((m) => ({ ...m, [email]: n }));
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

  // Al escribir correo manualmente, intenta completar desde cuentas/inventario y actualizar contador
  const emailDetailTimer = useRef<number | null>(null);
  useEffect(() => {
    const key = normalizeEmail(form.correo);
    if (!key || !form.plataforma_id) return;

    const cid = acctIdMap[key];
    const passAcct = acctPassMap[key];
    const passInv = invPassMap[key];

    if (cid && form.cuenta_id == null) setForm((s) => ({ ...s, cuenta_id: cid }));
    if (!form.contrasena && (passAcct || passInv))
      setForm((s) => ({ ...s, contrasena: passAcct || passInv || '' }));

    countPantallasSmart(key, cid, form.plataforma_id).then((n) =>
      setEmailCounts((m) => ({ ...m, [key]: n }))
    );

    if ((cid && passAcct != null) || passInv != null) return;

    if (emailDetailTimer.current) {
      clearTimeout(emailDetailTimer.current);
      emailDetailTimer.current = null;
    }
    emailDetailTimer.current = window.setTimeout(async () => {
      try {
        const r1 = await fetch(
          `/api/cuentascompartidas?q=${encodeURIComponent(key)}&plataforma_id=${form.plataforma_id}`,
          { cache: 'no-store' }
        );
        if (r1.ok) {
          const arr: Cuenta[] = await r1.json();
          const exact = arr.find((r) => normalizeEmail(r?.correo ?? '') === key);
          if (exact) {
            setAcctIdMap((m) => ({ ...m, [key]: exact.id }));
            if ((exact as any).contrasena !== undefined) {
              setAcctPassMap((m) => ({ ...m, [key]: (exact as any).contrasena ?? null }));
            }
            setForm((s) => ({
              ...s,
              cuenta_id: s.cuenta_id ?? exact.id,
              contrasena: s.contrasena || (exact as any).contrasena || '',
            }));
            const n = await countPantallasSmart(key, exact.id, form.plataforma_id);
            setEmailCounts((m) => ({ ...m, [key]: n }));
            return;
          }
        }
        const r2 = await fetch(
          `/api/inventario?q=${encodeURIComponent(key)}&plataforma_id=${form.plataforma_id}`,
          { cache: 'no-store' }
        );
        if (r2.ok) {
          const arr: InventarioItem[] = await r2.json();
          const exact = arr.find((it) => normalizeEmail(it?.correo ?? '') === key);
          if (exact && (exact as any).clave != null && !form.contrasena) {
            setInvPassMap((m) => ({ ...m, [key]: (exact as any).clave ?? null }));
            setForm((s) => ({ ...s, contrasena: (exact as any).clave || '' }));
          }
          const n = await countPantallasSmart(key, undefined, form.plataforma_id);
          setEmailCounts((m) => ({ ...m, [key]: n }));
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
      const urls = [
        `/api/usuarios?q=${encodeURIComponent(raw)}`,
        norm !== raw ? `/api/usuarios?q=${encodeURIComponent(norm)}` : '',
      ].filter(Boolean) as string[];
      let arr: Usuario[] = [];
      for (const url of urls) {
        const r = await fetch(url, { cache: 'no-store' });
        if (!r.ok) continue;
        arr = arr.concat(await r.json());
        if (arr.length > 0 && url !== '/api/usuarios') break;
      }
      const exists = arr.some((u) => normalizeContacto(u.contacto) === norm);
      if (exists) return;

      await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacto: raw, nombre: nombre || null }),
      });
    } catch {}
  }

  async function ensureCuentaCompartida(correo: string, plataformaId: number) {
    const key = normalizeEmail(correo);
    if (acctIdMap[key]) {
      const count = await countPantallasSmart(key, acctIdMap[key], plataformaId);
      setEmailCounts((m) => ({ ...m, [key]: count }));
      return { id: acctIdMap[key], countAfter: count };
    }
    const res = await fetch('/api/cuentascompartidas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plataforma_id: plataformaId,
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
    setAcctIdMap((m) => ({ ...m, [key]: saved.id }));
    setAcctPassMap((m) => ({ ...m, [key]: form.contrasena || null }));
    const count = await countPantallasSmart(key, saved.id, plataformaId);
    setEmailCounts((m) => ({ ...m, [key]: count }));
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

  /* ===== Validación ===== */
  const canSubmit = useMemo(() => {
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
    return plataformaOk && contactoOk && fechasOk && estadoOk && mesesOk && totalOk && totalProvOk;
  }, [form]);

  /* ===== Payload & submit (abre modal) ===== */
const buildPayload = () => {
  const totalPag = toNumOrNull(form.total_pagado);
  const totalProv = toNumOrNull(form.total_pagado_proveedor);
  const totalGan = totalPag == null ? null : totalProv == null ? totalPag : totalPag - totalProv;

  return {
    cuenta_id: form.cuenta_id ?? null,
    contacto: normalizeContacto(form.contacto.trim()),
    nombre: (form.nombre ?? '').trim() || null, // ⬅️  NUEVO: manda el nombre
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
    if (!canSubmit) {
      setErrMsg('Revisa los campos obligatorios y formatos numéricos.');
      return;
    }

    try {
      // Garantizar usuario y cuenta si aplica (previo a confirmar)
      await ensureUsuario(form.contacto, form.nombre || null);

      let cuentaId: number | null = form.cuenta_id ?? null;
      const correo = form.correo.trim();
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

  /* ===== Confirmar y guardar (sin checkbox, contraseña visible) ===== */
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
    setOkMsg(`Guardado correctamente (id: ${saved?.id ?? '—'}).`);
    setConfirmOpen(false);

    // ⬇⬇⬇ NUEVO: limpiar caches para que nombre/clave actualizados se reflejen al instante
    try {
      // cache del autocompletado de usuario (nombre)
      userCache.current?.clear?.();
      // caches y contadores de correos (cuentas/inventario)
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
    const stored = typeof window !== 'undefined'
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

    // (opcional) este setEmailCounts({}) de abajo puedes quitarlo
    // porque ya lo limpiamos arriba en el bloque nuevo.
    // Lo dejo aquí por si prefieres mantenerlo; no rompe nada.
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
              placeholder="Se autocompleta si el contacto existe"
              value={form.nombre}
              onChange={(v: string) => setForm((s) => ({ ...s, nombre: v }))}
              inputClassName="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
            />
          </div>
        </section>

        {/* Pantalla */}
        <section className="border border-neutral-800 rounded-2xl p-4 bg-neutral-950/40 text-neutral-100">
          <h3 className="font-semibold mb-3">Pantalla</h3>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Plataforma (prioriza última usada) */}
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

            {/* Correo + sugerencias unificadas */}
            <div className="relative" ref={boxRef}>
              <FieldPantallas
                label="Correo (opcional)"
                labelRight={badge}
                type="email"
                placeholder="correo@dominio.com"
                value={form.correo}
                onChange={(v: string) => setForm((s) => ({ ...s, correo: v }))}
                onFocus={onFocusCorreo}
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

            {/* Contraseña */}
            <FieldPantallas
              label="Contraseña (si es nueva o para actualizar)"
              type="text"
              placeholder="Opcional"
              value={form.contrasena}
              onChange={(v: string) => setForm((s) => ({ ...s, contrasena: v }))}
              inputClassName="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
            />

            {/* Nro. pantalla */}
            <FieldPantallas
              label="Nro. pantalla"
              type="text"
              placeholder="Ej. 1, A1, PERFIL-2…"
              value={form.nro_pantalla}
              onChange={(v: string) => setForm((s) => ({ ...s, nro_pantalla: v }))}
              inputClassName="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
            />

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
            }}
            className="px-4 py-2 rounded-xl border"
          >
            Limpiar
          </button>
        </div>

        {okMsg && <p className="text-green-700 text-sm">{okMsg}</p>}
        {errMsg && <p className="text-red-600 text-sm">Error: {errMsg}</p>}
      </form>

      {/* ===== Modal de confirmación (sin checkbox; contraseña visible) ===== */}
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
                      <dd className="font-medium">
                        {form.fecha_compra || '—'}
                      </dd>
                      <dt className="text-neutral-400">Vencimiento</dt>
                      <dd className="font-medium">
                        {form.fecha_vencimiento || '—'}
                      </dd>
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
