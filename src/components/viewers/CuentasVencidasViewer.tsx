'use client';

import React, { useEffect, useMemo, useRef, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { usePlataformas } from '@/hooks/usePlataformas';
import { getDaily, setDaily, todayYMDLocal } from '@/lib/dailyCache';

/* ====================== Tipos ====================== */
type TipoRegistro = 'cuenta' | 'pantalla';

type Base = {
  id: number;
  plataforma_id: number | null;
  contacto: string;
  nombre: string | null;
  correo: string | null;
  contrasena: string | null;
  proveedor: string | null;
  fecha_compra: string | null;       // YYYY-MM-DD
  fecha_vencimiento: string | null;  // YYYY-MM-DD
  meses_pagados: number | null;
  total_pagado: number | null;       // usar total_pagado
  total_pagado_proveedor: number | null;
  total_ganado: number | null;
  estado: string | null;
  comentario: string | null;
};

type Cuenta   = Base & { tipo: 'cuenta' };
type Pantalla = Base & { tipo: 'pantalla'; nro_pantalla?: number | null };
type Registro = Cuenta | Pantalla;

type EditState = Partial<Registro> & {
  id: number;
  tipo: TipoRegistro;
  __original_contrasena?: string | null;
};

type ViewFilter = 'todos' | 'hoy' | 'manana' | 'anteriores';

/* ====================== Constantes (ajusta si necesitas) ====================== */
const DAILY_KEY = '__vencidas_daily_v5';
const NOTIFY_URL = '/api/cuentasvencidas';
const CUENTAS_BASE = '/api/cuentascompletas';
const PANTALLAS_BASE = '/api/pantallas';
const CHECK_LAST_CUENTAS_URL = `${CUENTAS_BASE}/check-last`;
const CHECK_LAST_PANTALLAS_URL = `${PANTALLAS_BASE}/check-last`;
const INVENTARIO_URL = '/api/inventario';

/* ====================== Utils ====================== */
const money = (v: number | null | undefined) =>
  v == null || Number.isNaN(v) ? '—' : '$\u00A0' + new Intl.NumberFormat('es-CO').format(v);

const isYYYYMMDD = (s?: string | null) => !!(s && /^\d{4}-\d{2}-\d{2}$/.test(s));

const ymdAddDays = (baseYmd: string, days: number) => {
  const [y, m, d] = baseYmd.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
};

const ymdAddMonths = (baseYmd: string, months: number) => {
  if (!isYYYYMMDD(baseYmd)) return baseYmd;
  const [y, m, d] = baseYmd.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setMonth(dt.getMonth() + Number(months || 0));
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
};

const today = () => todayYMDLocal();
const tomorrow = () => ymdAddDays(today(), 1);

const isToday    = (ymd?: string | null) => ymd === today();
const isTomorrow = (ymd?: string | null) => ymd === tomorrow();
const isExpired  = (ymd?: string | null) => isYYYYMMDD(ymd) && (ymd as string) < today();

/* ====================== Modal con Portal + Scroll Freeze ====================== */
function Modal({
  children,
  onClose,
  className = '',
}: {
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}) {
  useLayoutEffect(() => {
    const y = window.scrollY;
    const html = document.documentElement as HTMLElement;
    const body = document.body as HTMLElement;

    const prevHtmlOv = html.style.overflow;
    const prevBodyOv = body.style.overflow;
    const prevPos = body.style.position;
    const prevTop = body.style.top;
    const prevLeft = body.style.left;
    const prevRight = body.style.right;
    const prevWidth = body.style.width;
    const prevPadR = body.style.paddingRight;

    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;

    body.style.position = 'fixed';
    body.style.top = `-${y}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';

    return () => {
      body.style.position = prevPos;
      body.style.top = prevTop;
      body.style.left = prevLeft;
      body.style.right = prevRight;
      body.style.width = prevWidth;
      body.style.paddingRight = prevPadR;
      html.style.overflow = prevHtmlOv;
      body.style.overflow = prevBodyOv;
      window.scrollTo(0, y);
    };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/60"
      onClick={() => onClose?.()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`absolute inset-0 flex items-center justify-center p-4 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

/* ====================== Fetchers ====================== */
async function pagedFetch(baseUrl: string) {
  const out: any[] = [];
  let cursor: string | null = null;
  for (let i = 0; i < 50; i++) {
    const url = `${baseUrl}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`GET ${baseUrl} -> ${res.status}`);
    const j: any = await res.json();
    const items: any[] = Array.isArray(j?.items) ? j.items
      : Array.isArray(j?.data) ? j.data
      : Array.isArray(j) ? j
      : [];
    out.push(...items);
    const next = j?.nextCursor ?? j?.next_page_token ?? j?.nextPageToken ?? j?.cursor ?? null;
    cursor = next ? String(next) : null;
    if (!cursor || items.length === 0) break;
  }
  return out;
}

async function fetchCuentas(): Promise<Cuenta[]> {
  const T = today();
  const T1 = tomorrow();

  const trySpec = async () => {
    try {
      const out = await pagedFetch(`${CUENTAS_BASE}?vencidas=1&limit=500`);
      return out as Cuenta[];
    } catch { return null; }
  };

  const vencidas = await trySpec();
  const todas = await pagedFetch(`${CUENTAS_BASE}?limit=500`);

  const arr = (
    vencidas
      ? [...vencidas, ...todas.filter((r: any) => r.fecha_vencimiento === T || r.fecha_vencimiento === T1)]
      : todas.filter((r: any) =>
          isYYYYMMDD(r.fecha_vencimiento) &&
          (r.fecha_vencimiento! < T || r.fecha_vencimiento === T || r.fecha_vencimiento === T1))
  ) as any[];

  return arr.map((r) => ({ ...r, tipo: 'cuenta' as const }));
}

async function fetchPantallas(): Promise<Pantalla[]> {
  const T = today();
  const T1 = tomorrow();

  const trySpec = async () => {
    try {
      const out = await pagedFetch(`${PANTALLAS_BASE}?vencidas=1&limit=500`);
      return out as Pantalla[];
    } catch { return null; }
  };

  const vencidas = await trySpec();
  const todas = await pagedFetch(`${PANTALLAS_BASE}?limit=500`);

  const base = vencidas
    ? [...vencidas, ...todas.filter((r: any) => r.fecha_vencimiento === T || r.fecha_vencimiento === T1)]
    : todas.filter((r: any) =>
        isYYYYMMDD(r.fecha_vencimiento) &&
        (r.fecha_vencimiento! < T || r.fecha_vencimiento === T || r.fecha_vencimiento === T1));

  return base.map((r: any) => ({
    ...r,
    tipo: 'pantalla' as const,
  }));
}

async function fetchVencidasHoyManana(): Promise<Registro[]> {
  const [cuentas, pantallas] = await Promise.all([fetchCuentas(), fetchPantallas()]);
  const key = (x: Registro) => `${x.tipo}:${x.id}`;
  const map = new Map<string, Registro>();
  [...cuentas, ...pantallas].forEach((r) => map.set(key(r), r));
  return Array.from(map.values());
}

/* ====================== Página ====================== */
export default function CuentasPantallasVencidasPage() {
  const { plataformas } = usePlataformas();

  const [rows, setRows] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [source, setSource] = useState<'cache' | 'server' | null>(null);

  const [q, setQ] = useState('');
  const [platFilter, setPlatFilter] = useState<number | 'all'>('all');
  const [view, setView] = useState<ViewFilter>('anteriores'); // default más útil

  const [selected, setSelected] = useState<Set<string>>(new Set()); // key = tipo:id

  // Cola notificación
  const [pwNewByEmail, setPwNewByEmail] = useState<Record<string, string>>({});
  const [notifying, setNotifying] = useState(false);

  // Editar
  const [edit, setEdit] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const firstInputRef = useRef<HTMLInputElement | null>(null);

  // Eliminar simple
  const [delModal, setDelModal] = useState<{ open: boolean; row: Registro | null; busy?: boolean }>({
    open: false, row: null, busy: false,
  });

  // Inventario (último)
  const [invModal, setInvModal] = useState<{
    open: boolean; row: Registro | null; busy?: boolean; remaining?: number;
  }>({ open: false, row: null, busy: false });

  // Bulk
  const [bulkModal, setBulkModal] = useState<{
    open: boolean;
    rows: Registro[];
    lastKeys: Set<string>;
    normalKeys: Set<string>;
    scope: 'selected' | 'visible' | null;
    busy?: boolean;
    progress?: number;
    total?: number;
  }>({ open: false, rows: [], lastKeys: new Set(), normalKeys: new Set(), scope: null, busy: false, progress: 0, total: 0 });

  /* Boot con caché */
  useEffect(() => {
    (async () => {
      setErr(null);
      const cached = getDaily<Registro[]>(DAILY_KEY);
      if (cached && cached.length) {
        setRows(cached);
        setSource('cache');
        return;
      }
      try {
        setLoading(true);
        const data = await fetchVencidasHoyManana();
        setRows(data);
        setDaily(DAILY_KEY, data);
        setSource('server');
      } catch (e: any) {
        setErr(e?.message ?? 'No se pudieron cargar los datos.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* Refrescar */
  const forceRefresh = async () => {
    try {
      setLoading(true); setErr(null);
      const data = await fetchVencidasHoyManana();
      setRows(data);
      setDaily(DAILY_KEY, data);
      setSource('server');
      setSelected(new Set());
      setPwNewByEmail({});
    } catch (e: any) {
      setErr(e?.message ?? 'No se pudo refrescar.');
    } finally {
      setLoading(false);
    }
  };

  /* Plataforma */
  const platformMap = useMemo(() => {
    const m = new Map<number, string>();
    plataformas.forEach(p => m.set(p.id, (p as any).nombre ?? String(p.id)));
    return m;
  }, [plataformas]);
  const platformName = (pid?: number | null) =>
    pid == null ? 'Sin plataforma' : (platformMap.get(pid) ?? `Plataforma ${pid}`);

  /* Filtro + búsqueda */
  const filtered = useMemo(() => {
    const base = rows.filter(r => {
      const fv = r.fecha_vencimiento;
      if (!isYYYYMMDD(fv)) return false;
      switch (view) {
        case 'hoy':        return isToday(fv);
        case 'manana':     return isTomorrow(fv);
        case 'anteriores': return fv! < today();
        case 'todos':      return fv! < today() || isToday(fv) || isTomorrow(fv);
      }
    });
    const term = q.trim().toLowerCase();
    const pid: number | null = platFilter === 'all' ? null : Number(platFilter);
    return base.filter((r) => {
      if (pid !== null && r.plataforma_id !== pid) return false;
      if (!term) return true;
      const blob = [
        r.contacto, r.nombre, r.correo, r.comentario, r.proveedor,
        r.fecha_compra, r.fecha_vencimiento, platformName(r.plataforma_id),
        r.tipo === 'pantalla' ? 'pantalla' : 'cuenta completa',
      ].map(x => (x ?? '').toString().toLowerCase()).join(' ');
      return blob.includes(term);
    });
  }, [rows, view, q, platFilter, platformMap]);

  const keyOf = (r: Registro) => `${r.tipo}:${r.id}`;

  /* ====== Inventario: check + helpers ====== */
  const serverCheckIsLast = async (r: Registro) => {
    const { plataforma_id, correo, tipo } = r;
    if (!plataforma_id || !correo) return { isLast: false, remaining: 9999 };
    const url = tipo === 'cuenta' ? CHECK_LAST_CUENTAS_URL : CHECK_LAST_PANTALLAS_URL;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plataforma_id, correo }),
      });
      if (!res.ok) throw new Error();
      const j = await res.json();
      return { isLast: !!j?.isLast, remaining: Number(j?.remaining ?? 0) };
    } catch {
      // Fallback local
      const remainingLocal = rows.filter(x =>
        x.plataforma_id === plataforma_id &&
        (x.correo || '').trim() === (correo || '').trim() &&
        x.tipo === tipo
      ).length;
      return { isLast: remainingLocal <= 1, remaining: remainingLocal };
    }
  };

  const deleteRowDirect = async (r: Registro) => {
    const base = r.tipo === 'cuenta' ? CUENTAS_BASE : PANTALLAS_BASE;
    const res = await fetch(`${base}/${r.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j?.error ?? 'No se pudo eliminar');
    }
    await res.json().catch(() => ({}));
    const next = rows.filter(x => keyOf(x) !== keyOf(r));
    setRows(next);
    setDaily(DAILY_KEY, next);
    setSelected(s => { const n = new Set(s); n.delete(keyOf(r)); return n; });
  };

  const onAskDelete = async (r: Registro) => {
    const chk = await serverCheckIsLast(r);
    if (chk.isLast) {
      setInvModal({ open: true, row: r, remaining: chk.remaining, busy: false });
    } else {
      setDelModal({ open: true, row: r, busy: false });
    }
  };

  /* ====== BULK ====== */
  const collectRows = (scope: 'selected' | 'visible') =>
    scope === 'selected'
      ? rows.filter(r => selected.has(keyOf(r)))
      : filtered.slice(); // visibles

  const askBulkDelete = async (scope: 'selected' | 'visible') => {
    const list = collectRows(scope);
    if (list.length === 0) {
      alert(scope === 'selected' ? 'No hay filas seleccionadas.' : 'No hay filas visibles.');
      return;
    }
    // Pre-chequeo de "últimos"
    const checks = await Promise.all(
      list.map(async r => {
        const chk = await serverCheckIsLast(r);
        return { r, k: keyOf(r), isLast: chk.isLast };
      })
    );
    const lastKeys = new Set(checks.filter(c => c.isLast).map(c => c.k));
    const normalKeys = new Set(checks.filter(c => !c.isLast).map(c => c.k));
    setBulkModal({
      open: true,
      rows: list,
      lastKeys,
      normalKeys,
      scope,
      busy: false,
      progress: 0,
      total: list.length,
    });
  };

  const processBulk = async (mode: 'delete' | 'inventory') => {
    if (!bulkModal.open) return;
    const { rows: list, lastKeys } = bulkModal;

    setBulkModal(m => ({ ...m, busy: true, progress: 0 }));
    let ok = 0, fail = 0;
    const errs: string[] = [];

    for (let i = 0; i < list.length; i++) {
      const r = list[i];
      try {
        if (mode === 'inventory' && lastKeys.has(keyOf(r))) {
          // Enviar a inventario
          const resInv = await fetch(INVENTARIO_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'send-to-inventory',
              kind: r.tipo,
              plataforma_id: r.plataforma_id,
              correo: r.correo
            }),
          });
          if (!resInv.ok) {
            const j = await resInv.json().catch(() => ({}));
            throw new Error(j?.error || 'Inventario rechazó la operación');
          }
        }
        await deleteRowDirect(r);
        ok++;
      } catch (e: any) {
        fail++;
        errs.push(`${keyOf(r)}: ${e?.message ?? 'Error'}`);
      }
      setBulkModal(m => ({ ...m, progress: i + 1 }));
    }

    setBulkModal({ open: false, rows: [], lastKeys: new Set(), normalKeys: new Set(), scope: null, busy: false, progress: 0, total: 0 });
    if (fail > 0) {
      alert(`Completado con errores.\nOK: ${ok}\nFallidos: ${fail}\n\n${errs.slice(0, 10).join('\n')}${errs.length > 10 ? '\n…' : ''}`);
    }
  };

  /* ====== Notificaciones (cola) ====== */
  const pwChangedEmails = useMemo(() => Object.keys(pwNewByEmail), [pwNewByEmail]);

  const sendPwChangeNotifications = async () => {
    const items = Object.entries(pwNewByEmail).map(([correo, nuevaClave]) => ({
      correo, nuevaClave: (nuevaClave || '').trim(),
    }));
    if (items.length === 0) { alert('No hay correos en la cola.'); return; }
    const faltan = items.filter(it => !it.nuevaClave).map(it => it.correo);
    if (faltan.length > 0) { alert(`Falta la nueva clave para:\n- ${faltan.join('\n- ')}`); return; }

    try {
      setNotifying(true);
      const res = await fetch(NOTIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j?.error) throw new Error(j?.error || 'No se pudo iniciar la notificación');
      alert(`Notificación lanzada. PID: ${j?.pid ?? '—'}\nLog: ${j?.logFile ?? '(ver servidor)'}`);
      setPwNewByEmail({});
    } catch (e: any) {
      alert(e?.message ?? 'Error al enviar notificaciones');
    } finally {
      setNotifying(false);
    }
  };

  /* ====== Editar ====== */
  const openEdit = (r: Registro) => {
    setEdit({
      ...r,
      id: r.id,
      tipo: r.tipo,
      __original_contrasena: r.contrasena ?? '',
    });
    setTimeout(() => firstInputRef.current?.focus(), 0);
  };
  const closeEdit = () => { setEdit(null); };

  const computedVencimiento = useMemo(() => {
    if (!edit?.fecha_compra || edit.meses_pagados == null) return edit?.fecha_vencimiento || '';
    if (!isYYYYMMDD(edit.fecha_compra)) return edit.fecha_vencimiento || '';
    return ymdAddMonths(edit.fecha_compra, Number(edit.meses_pagados || 0));
  }, [edit?.fecha_compra, edit?.meses_pagados, edit?.fecha_vencimiento]);

  const saveEdit = async () => {
    if (!edit) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        contacto: edit.contacto ?? '',
        nombre: (edit.nombre ?? '') || null,
        correo: (edit.correo ?? '') || null,
        estado: (edit.estado ?? '') || null,
        comentario: (edit.comentario ?? '') || null,
        contrasena: (edit.contrasena ?? '') || null,
        fecha_compra: isYYYYMMDD(edit.fecha_compra ?? '') ? edit.fecha_compra : null,
        meses_pagados: Number.isFinite(Number(edit.meses_pagados)) ? Number(edit.meses_pagados) : null,
        fecha_vencimiento: (edit.fecha_compra && edit.meses_pagados != null && isYYYYMMDD(edit.fecha_compra))
          ? computedVencimiento
          : (edit.fecha_vencimiento ?? null),
      };

      const base = edit.tipo === 'cuenta' ? CUENTAS_BASE : PANTALLAS_BASE;
      const res = await fetch(`${base}/${edit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? 'No se pudo guardar');
      }
      const flat = await res.json().catch(() => ({}));

      const merged: Registro[] = rows.map(r =>
        keyOf(r) === `${edit.tipo}:${edit.id}`
          ? ({
              ...r,
              contacto: flat?.row?.contacto ?? (edit.contacto ?? r.contacto),
              nombre: flat?.row?.nombre ?? (edit.nombre ?? r.nombre),
              correo: flat?.row?.correo ?? (edit.correo ?? r.correo),
              estado: flat?.row?.estado ?? (edit.estado ?? r.estado),
              comentario: flat?.row?.comentario ?? (edit.comentario ?? r.comentario),
              contrasena: flat?.row?.contrasena ?? (edit.contrasena ?? r.contrasena),
              fecha_compra: flat?.row?.fecha_compra ?? (isYYYYMMDD(edit.fecha_compra ?? '') ? edit.fecha_compra : r.fecha_compra),
              meses_pagados: flat?.row?.meses_pagados ?? (Number.isFinite(Number(edit.meses_pagados)) ? Number(edit.meses_pagados) : r.meses_pagados),
              fecha_vencimiento: flat?.row?.fecha_vencimiento ?? computedVencimiento ?? r.fecha_vencimiento,
              tipo: r.tipo,
            } as Registro)
          : r
      );

      // Encolar notificación si cambió la contraseña
      const updated = merged.find(r => keyOf(r) === `${edit.tipo}:${edit.id}`)!;
      const oldPw = edit.__original_contrasena ?? '';
      const newPw = (flat?.row?.contrasena ?? edit.contrasena ?? '').toString();
      const emailForQueue = (flat?.row?.correo ?? edit.correo ?? updated.correo ?? '').toString().trim();
      if (newPw && newPw !== oldPw && emailForQueue) {
        setPwNewByEmail(prev => ({ ...prev, [emailForQueue]: newPw }));
      }

      const T = today(); const T1 = tomorrow();
      const next = merged.filter(r =>
        isYYYYMMDD(r.fecha_vencimiento) &&
        (r.fecha_vencimiento! < T || r.fecha_vencimiento === T || r.fecha_vencimiento === T1)
      );
      setRows(next);
      setDaily(DAILY_KEY, next);
      closeEdit();
    } catch (e: any) {
      alert(e?.message ?? 'Error guardando');
    } finally {
      setSaving(false);
    }
  };

  /* KPIs */
  const kpiHoy = rows.filter(r => isToday(r.fecha_vencimiento)).length;
  const kpiManana = rows.filter(r => isTomorrow(r.fecha_vencimiento)).length;
  const kpiAnteriores = rows.filter(r => isExpired(r.fecha_vencimiento)).length;

  const visibleIds = useMemo(() => new Set(filtered.map(r => keyOf(r))), [filtered]);
  const allVisibleSelected = visibleIds.size > 0 && [...visibleIds].every(id => selected.has(id));
  const toggleSelectAllVisible = () => {
    setSelected(prev => {
      const next = new Set(prev);
      if (allVisibleSelected) filtered.forEach(r => next.delete(keyOf(r)));
      else filtered.forEach(r => next.add(keyOf(r)));
      return next;
    });
  };

  const copyEmails = async () => {
    try { await navigator.clipboard.writeText(pwChangedEmails.join(', ')); alert('Correos copiados.'); }
    catch { alert('No se pudo copiar al portapapeles.'); }
  };

  /* ====================== Render ====================== */
  return (
    <div className="mx-auto max-w-[1200px] p-6 space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-end gap-3">
          <h1 className="text-2xl font-bold text-neutral-100">Cuentas y Pantallas (vencidas, hoy y mañana)</h1>
          <span className="text-sm text-neutral-400">• Fuente: {source ? (source === 'cache' ? 'Caché del día' : 'Servidor') : '—'}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={forceRefresh}
            disabled={loading}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 hover:bg-neutral-800 disabled:opacity-60"
          >
            {loading ? 'Actualizando…' : 'Refrescar'}
          </button>
        </div>
      </header>

      {/* Filtros */}
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por contacto, nombre, correo, plataforma, comentario…"
          className="flex-1 rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600"
        />
        <select
          value={platFilter === 'all' ? '' : String(platFilter)}
          onChange={(e) => setPlatFilter(e.target.value ? Number(e.target.value) : 'all')}
          className="w-64 rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 [&>option]:bg-neutral-900 [&>option]:text-neutral-100"
        >
          <option value="">Todas las plataformas</option>
          {plataformas.map((p) => (
            <option key={p.id} value={p.id}>{(p as any).nombre ?? p.id}</option>
          ))}
        </select>
        <select
          value={view}
          onChange={(e) => setView(e.target.value as ViewFilter)}
          className="w-64 rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 [&>option]:bg-neutral-900 [&>option]:text-neutral-100"
        >
          <option value="todos">Todos</option>
          <option value="hoy">Vencen hoy</option>
          <option value="manana">Vencen mañana</option>
          <option value="anteriores">Anteriores a hoy (vencidas)</option>
        </select>
      </section>

      {/* Acciones notificación */}
      <section className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold text-neutral-200">
            Correos con <em>cambio de clave</em> ({pwChangedEmails.length})
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyEmails}
              disabled={pwChangedEmails.length === 0}
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 hover:bg-neutral-800 disabled:opacity-60"
            >
              Copiar correos
            </button>
            <button
              onClick={sendPwChangeNotifications}
              disabled={pwChangedEmails.length === 0 || notifying}
              className="rounded-lg border border-emerald-700 bg-emerald-800/40 px-3 py-2 text-emerald-100 hover:bg-emerald-800/60 disabled:opacity-60"
              title="Invoca scripts/notify-password-changes.js vía /api/cuentasvencidas"
            >
              {notifying ? 'Enviando…' : 'Enviar notificación cambios de clave'}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {pwChangedEmails.length === 0 ? (
            <span className="text-neutral-400 text-sm">No hay correos en la cola (se añaden al guardar un registro con contraseña cambiada).</span>
          ) : (
            pwChangedEmails.map(email => (
              <div key={email} className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-neutral-700 px-3 py-1 text-sm text-neutral-200">
                  {email}
                  <button
                    className="text-neutral-400 hover:text-white"
                    onClick={() => setPwNewByEmail(prev => { const { [email]:_, ...rest } = prev; return rest; })}
                    title="Quitar de la cola"
                  >
                    ×
                  </button>
                </span>
                <input
                  type="text"
                  placeholder="Nueva clave…"
                  value={pwNewByEmail[email] ?? ''}
                  onChange={(e) => setPwNewByEmail(prev => ({ ...prev, [email]: e.target.value }))}
                  className="min-w-[240px] flex-1 rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600"
                />
              </div>
            ))
          )}
        </div>
        <p className="text-xs text-neutral-400">
          Nota: el script solo enviará si la fecha de vencimiento es <strong>posterior</strong> a HOY (lo valida en MySQL).
        </p>
      </section>

      {/* KPIs */}
      <section className="grid gap-3 sm:grid-cols-3 lg:grid-cols-3">
        <KPI title="Anteriores (vencidas)" value={kpiAnteriores} />
        <KPI title="Vencen hoy" value={kpiHoy} />
        <KPI title="Vencen mañana" value={kpiManana} />
      </section>

      {/* Estados */}
      {loading && (
        <div className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-3 text-neutral-300">
          Cargando…
        </div>
      )}
      {err && (
        <div className="rounded-lg border border-red-800/60 bg-red-950/40 p-3 text-red-200">
          Error: {err}
        </div>
      )}

      {/* Tabla + Toolbar de borrado */}
      <section className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-neutral-200">
            Vista: {
              view === 'todos' ? 'Todos' :
              view === 'hoy' ? 'Vencen hoy' :
              view === 'manana' ? 'Vencen mañana' :
              'Anteriores a hoy (vencidas)'
            }
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => askBulkDelete('selected')}
              disabled={selected.size === 0}
              className="rounded-lg border border-rose-800 bg-rose-900/30 px-3 py-2 text-rose-100 hover:bg-rose-900/50 disabled:opacity-60"
              title="Eliminar los registros seleccionados"
            >
              Eliminar seleccionados
            </button>
            <button
              onClick={() => askBulkDelete('visible')}
              disabled={filtered.length === 0}
              className="rounded-lg border border-rose-800 bg-rose-900/30 px-3 py-2 text-rose-100 hover:bg-rose-900/50 disabled:opacity-60"
              title="Eliminar todos los registros visibles (según filtros)"
            >
              Eliminar todos (visibles)
            </button>
          </div>
        </div>

        <div className="overflow-auto rounded border border-neutral-800">
          <table className="min-w-[1250px] w-full text-sm">
            <thead className="bg-neutral-900/70 sticky top-0 z-10">
              <tr className="text-xs uppercase text-neutral-400">
                <Th className="w-10">
                  <input
                    type="checkbox"
                    checked={visibleIds.size > 0 && [...visibleIds].every(id => selected.has(id))}
                    onChange={toggleSelectAllVisible}
                    aria-label="Seleccionar todos (visibles)"
                  />
                </Th>
                <Th className="w-24">Acciones</Th>
                <Th>Plataforma</Th>
                <Th className="w-28">Tipo</Th>
                <Th>Contacto</Th>
                <Th>Nombre</Th>
                <Th>Correo</Th>
                <Th>fecha Compra</Th>
                <Th>fecha Vencimiento</Th>
                <Th className="text-right">total pagado</Th>
                <Th>Comentario</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={keyOf(r)} className="border-t border-neutral-800 hover:bg-neutral-900/30">
                  <Td className="align-middle">
                    <input
                      type="checkbox"
                      checked={selected.has(keyOf(r))}
                      onChange={() => setSelected(prev => {
                        const n = new Set(prev);
                        const k = keyOf(r);
                        n.has(k) ? n.delete(k) : n.add(k);
                        return n;
                      })}
                      aria-label={`Seleccionar fila ${r.id}`}
                    />
                  </Td>

                  <Td>
                    <div className="flex items-center gap-2">
                      <button
                        title="Editar"
                        onClick={() => openEdit(r)}
                        className="text-neutral-300 hover:text-white inline-flex p-1 rounded-md hover:bg-neutral-800/60"
                        aria-label="Editar"
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                        </svg>
                      </button>
                      <button
                        title="Eliminar"
                        onClick={() => onAskDelete(r)}
                        className="text-rose-300 hover:text-rose-200 inline-flex p-1 rounded-md hover:bg-rose-900/30"
                        aria-label="Eliminar"
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </Td>

                  <Td>{platformName(r.plataforma_id)}</Td>
                  <Td>{r.tipo === 'pantalla' ? 'Pantalla' : 'Cuenta completa'}</Td>
                  <Td>{r.contacto || '—'}</Td>
                  <Td>{r.nombre || '—'}</Td>
                  <Td><span className="inline-block max-w-[260px] truncate align-bottom" title={r.correo ?? ''}>{r.correo || '—'}</span></Td>
                  <Td className="text-center whitespace-nowrap">{r.fecha_compra || '—'}</Td>
                  <Td className="text-center whitespace-nowrap">{r.fecha_vencimiento || '—'}</Td>
                  <Td className="text-right whitespace-nowrap">{money(r.total_pagado)}</Td>
                  <Td><span className="inline-block max-w-[300px] truncate align-bottom" title={r.comentario ?? ''}>{r.comentario || '—'}</span></Td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><Td colSpan={12} className="text-center py-6 text-neutral-400">{loading ? 'Cargando…' : 'Sin resultados.'}</Td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-2 text-sm text-neutral-400">
          {filtered.length} fila(s) visibles
          {err && <span className="text-rose-400 ml-2">— {err}</span>}
        </div>
      </section>

      {/* Modal eliminar simple */}
      {delModal.open && delModal.row && (
        <Modal onClose={() => setDelModal({ open:false, row:null })}>
          <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 text-neutral-100 shadow-xl">
            <div className="px-5 py-3 border-b border-neutral-800 flex items-center justify-between">
              <h3 className="font-semibold">Confirmar eliminación</h3>
              <button className="px-2 py-1 hover:text-white" onClick={() => setDelModal({ open:false, row:null })} disabled={!!delModal.busy}>✕</button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <p>
                ¿Seguro que deseas eliminar este registro{' '}
                <b>{delModal.row.tipo === 'pantalla' ? 'Pantalla' : 'Cuenta completa'}</b> de la plataforma{' '}
                <b>{platformName(delModal.row.plataforma_id)}</b>?
              </p>
            </div>
            <div className="px-5 py-3 border-t border-neutral-800 flex items-center justify-end gap-2">
              <button className="px-3 py-2 rounded-lg border border-neutral-600 hover:bg-neutral-800"
                      onClick={() => setDelModal({ open:false, row:null })} disabled={!!delModal.busy}>Cancelar</button>
              <button className="px-3 py-2 rounded-lg border border-rose-800 bg-rose-900/40 hover:bg-rose-900/60 disabled:opacity-60"
                      onClick={async () => {
                        if (!delModal.row) return;
                        setDelModal(m => ({ ...m, busy:true }));
                        try { await deleteRowDirect(delModal.row); setDelModal({ open:false, row:null }); }
                        catch (e:any) { alert(e?.message ?? 'Error al eliminar'); setDelModal(m => ({ ...m, busy:false })); }
                      }}
                      disabled={!!delModal.busy}>
                {delModal.busy ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal inventario (último) */}
      {invModal.open && invModal.row && (
        <Modal onClose={() => setInvModal({ open:false, row:null })}>
          <div className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900 text-neutral-100 shadow-xl">
            <div className="px-5 py-3 border-b border-neutral-800 flex items-center justify-between">
              <h3 className="font-semibold">Último registro por correo y plataforma</h3>
              <button className="px-2 py-1 hover:text-white" onClick={() => setInvModal({ open:false, row:null })} disabled={!!invModal.busy}>✕</button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <p>
                Se está eliminando el <b>último registro</b> para el correo <b>{invModal.row.correo}</b> en la plataforma{' '}
                <b>{platformName(invModal.row.plataforma_id)}</b> dentro de <b>{invModal.row.tipo === 'cuenta' ? 'Cuentas completas' : 'Pantallas'}</b>.
              </p>
              {typeof invModal.remaining === 'number' && (
                <p className="text-neutral-400">Registros restantes (estimado): {invModal.remaining}</p>
              )}
              <p>¿Deseas <b>enviar al inventario</b> antes de eliminar?</p>
            </div>
            <div className="px-5 py-3 border-t border-neutral-800 flex items-center justify-end gap-2">
              <button className="px-3 py-2 rounded-lg border border-neutral-600 hover:bg-neutral-800"
                      onClick={() => setInvModal({ open:false, row:null })} disabled={!!invModal.busy}>Cancelar</button>
              <button className="px-3 py-2 rounded-lg border border-amber-700 bg-amber-800/40 hover:bg-amber-800/60 disabled:opacity-60"
                      onClick={async () => {
                        if (!invModal.row) return;
                        setInvModal(m => ({ ...m, busy:true }));
                        try {
                          const r = invModal.row;
                          const res = await fetch(INVENTARIO_URL, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              action: 'send-to-inventory',
                              kind: r.tipo,
                              plataforma_id: r.plataforma_id,
                              correo: r.correo
                            }),
                          });
                          if (!res.ok) {
                            const j = await res.json().catch(() => ({}));
                            throw new Error(j?.error || 'Inventario rechazó la operación');
                          }
                          await deleteRowDirect(r);
                          setInvModal({ open:false, row:null });
                        } catch (e:any) {
                          alert(e?.message ?? 'Error al procesar inventario/eliminar');
                          setInvModal(m => ({ ...m, busy:false }));
                        }
                      }}
                      disabled={!!invModal.busy}>
                {invModal.busy ? 'Procesando…' : 'Enviar al inventario y eliminar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal BULK */}
      {bulkModal.open && (
        <Modal onClose={() => !bulkModal.busy && setBulkModal({ open:false, rows:[], lastKeys:new Set(), normalKeys:new Set(), scope:null, busy:false, progress:0, total:0 })}>
          <div className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900 text-neutral-100 shadow-xl">
            <div className="px-5 py-3 border-b border-neutral-800 flex items-center justify-between">
              <h3 className="font-semibold">Eliminar en lote</h3>
              <button className="px-2 py-1 hover:text-white" onClick={() => setBulkModal({ open:false, rows:[], lastKeys:new Set(), normalKeys:new Set(), scope:null, busy:false, progress:0, total:0 })} disabled={!!bulkModal.busy}>✕</button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <p>Total a procesar: <b>{bulkModal.total}</b></p>
              <p>Registros normales: <b>{bulkModal.normalKeys.size}</b></p>
              <p>Registros “últimos” (correo+plataforma dentro de su tipo): <b>{bulkModal.lastKeys.size}</b></p>

              {bulkModal.busy && (
                <div className="rounded-md border border-neutral-700 p-3">
                  Procesando… {bulkModal.progress}/{bulkModal.total}
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-neutral-800 flex items-center justify-end gap-2">
              <button className="px-3 py-2 rounded-lg border border-neutral-600 hover:bg-neutral-800"
                      onClick={() => setBulkModal({ open:false, rows:[], lastKeys:new Set(), normalKeys:new Set(), scope:null, busy:false, progress:0, total:0 })}
                      disabled={!!bulkModal.busy}>
                Cancelar
              </button>
              <button className="px-3 py-2 rounded-lg border border-rose-800 bg-rose-900/40 hover:bg-rose-900/60 disabled:opacity-60"
                      onClick={() => processBulk('delete')}
                      disabled={!!bulkModal.busy}>
                {bulkModal.busy ? 'Eliminando…' : 'Eliminar todos'}
              </button>
              <button className="px-3 py-2 rounded-lg border border-amber-700 bg-amber-800/40 hover:bg-amber-800/60 disabled:opacity-60"
                      onClick={() => processBulk('inventory')}
                      disabled={!!bulkModal.busy}>
                {bulkModal.busy ? 'Procesando…' : 'Enviar al inventario y eliminar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de edición */}
      {edit && (
        <Modal onClose={() => !saving && closeEdit()}>
          <div
            className="w-full max-w-xl max-h-[90vh] overflow-auto rounded-2xl border border-neutral-800 bg-neutral-900 text-neutral-100 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3 border-b border-neutral-800 flex items-center justify-between sticky top-0 bg-neutral-900 rounded-t-2xl">
              <h3 className="font-semibold">Editar #{edit.id}</h3>
              <button className="px-2 py-1 hover:text-white" onClick={closeEdit} disabled={saving}>✕</button>
            </div>

            <div className="p-5 grid gap-4 sm:grid-cols-2">
              <Field label="Tipo">
                <input className="rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-950 outline-none" value={edit.tipo === 'pantalla' ? 'Pantalla' : 'Cuenta completa'} readOnly/>
              </Field>
              <Field label="Plataforma">
                <input className="rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-950 outline-none" value={platformName(rows.find(r => `${r.tipo}:${r.id}` === `${edit.tipo}:${edit.id}`)?.plataforma_id)} readOnly/>
              </Field>

              <Field label="Contacto">
                <input ref={firstInputRef}
                       className="rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-950 outline-none focus:ring-2 focus:ring-neutral-600"
                       value={edit.contacto ?? ''}
                       onChange={(e) => setEdit(s => ({ ...(s as EditState), contacto: e.target.value }))}/>
              </Field>
              <Field label="Nombre">
                <input
                  className="rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-950 outline-none focus:ring-2 focus:ring-neutral-600"
                  value={edit.nombre ?? ''}
                  onChange={(e) => setEdit(s => ({ ...(s as EditState), nombre: e.target.value }))}/>
              </Field>
              <Field label="Correo">
                <input
                  className="rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-950 outline-none focus:ring-2 focus:ring-neutral-600"
                  value={edit.correo ?? ''}
                  onChange={(e) => setEdit(s => ({ ...(s as EditState), correo: e.target.value }))}/>
              </Field>
              <Field label="Estado">
                <input
                  className="rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-950 outline-none focus:ring-2 focus:ring-neutral-600"
                  value={edit.estado ?? ''}
                  onChange={(e) => setEdit(s => ({ ...(s as EditState), estado: e.target.value }))}/>
              </Field>

              <Field label="Contraseña (cambiar para encolar notificación)" full>
                <input
                  type="text"
                  className="rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-950 outline-none focus:ring-2 focus:ring-neutral-600"
                  value={edit.contrasena ?? ''}
                  onChange={(e) => setEdit(s => ({ ...(s as EditState), contrasena: e.target.value }))}/>
              </Field>

              <Field label="Fecha de compra">
                <input
                  type="date"
                  className="rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-950 outline-none focus:ring-2 focus:ring-neutral-600"
                  value={edit.fecha_compra ?? ''}
                  onChange={(e) => setEdit(s => ({ ...(s as EditState), fecha_compra: e.target.value }))}/>
              </Field>
              <Field label="Meses pagados">
                <input
                  type="number" min={0}
                  className="rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-950 outline-none focus:ring-2 focus:ring-neutral-600"
                  value={edit.meses_pagados ?? ''}
                  onChange={(e) => setEdit(s => ({ ...(s as EditState), meses_pagados: Number(e.target.value) }))}/>
              </Field>
              <Field label="Fecha de vencimiento (auto)" full>
                <input className="rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-950 outline-none" value={computedVencimiento || ''} readOnly/>
              </Field>

              <Field label="Comentario" full>
                <textarea
                  rows={3}
                  className="rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-950 outline-none focus:ring-2 focus:ring-neutral-600"
                  value={edit.comentario ?? ''}
                  onChange={(e) => setEdit(s => ({ ...(s as EditState), comentario: e.target.value }))}/>
              </Field>
            </div>

            <div className="px-5 py-3 border-t border-neutral-800 flex items-center justify-end gap-2 sticky bottom-0 bg-neutral-900 rounded-b-2xl">
              <button
                className="px-3 py-2 rounded-lg border border-neutral-600 hover:bg-neutral-800"
                onClick={closeEdit}
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                className="px-3 py-2 rounded-lg border border-emerald-700 bg-emerald-800/40 hover:bg-emerald-800/60 disabled:opacity-60"
                onClick={saveEdit}
                disabled={saving}
              >
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ====================== UI bits ====================== */
function KPI({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-4">
      <div className="text-xs uppercase tracking-wide text-neutral-400">{title}</div>
      <div className="mt-1 text-2xl font-bold text-neutral-100">{value}</div>
    </div>
  );
}
function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`text-left px-3 py-2 ${className}`}>{children}</th>;
}
function Td({ children, className = '', colSpan }: { children?: React.ReactNode; className?: string; colSpan?: number }) {
  return <td className={`px-3 py-2 ${className}`} colSpan={colSpan}>{children}</td>;
}
function Field({ label, children, full = false }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`grid gap-1 ${full ? 'sm:col-span-2' : ''}`}>
      <span className="text-sm text-neutral-300">{label}</span>
      {children}
    </label>
  );
}
