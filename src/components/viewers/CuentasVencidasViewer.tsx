'use client';

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { usePlataformas } from '@/hooks/usePlataformas';

/* ===================== Tipos ===================== */
type VServicio = 'Pantalla' | 'Cuenta completa';
type EditKey = `${'pantalla' | 'completa'}-${number}`;

type VRow = {
  servicio: VServicio;
  id: number;
  plataforma_id: number | null;
  plataforma_nombre?: string | null;
  contacto: string;
  nombre?: string | null;
  correo?: string | null;
  contrasena?: string | null;
  fecha_compra?: string | null;       // 'YYYY-MM-DD'
  fecha_vencimiento?: string | null;  // 'YYYY-MM-DD'
  meses_pagados?: number | null;
  total_pagado?: number | string | null;
  estado?: string | null;
  comentario?: string | null;
  cuenta_id?: number | null;     // pantallas
  nro_pantalla?: string | null;  // pantallas
};

type ClaveItem = { correo: string; nuevaClave: string; cuenta_id?: number | null; plataforma_id?: number | null };

/* ===================== Iconos mínimos ===================== */
const IconBtn = ({ className = '', ...p }: any) => (
  <button {...p} className={`inline-flex items-center justify-center rounded-md p-2 focus:outline-none focus:ring-2 ${className}`} />
);
const PencilIcon = (p: any) => (<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>);
const CheckIcon  = (p: any) => (<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}><path d="M20 6L9 17l-5-5"/></svg>);
const XIcon      = (p: any) => (<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}><path d="M18 6 6 18M6 6l12 12"/></svg>);
const TrashIcon  = (p: any) => (<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M10 11v6M14 11v6"/></svg>);

/* ===================== Utils fecha ===================== */
const pad2 = (n: number) => String(n).padStart(2, '0');

const extractYMD = (s?: string | null) => {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s.trim());
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
};

const parseLocalDate = (s?: string | null): Date | null => {
  const p = extractYMD(s); if (!p) return null; return new Date(p.y, p.m - 1, p.d);
};

const toDateInput = (s?: string | null) => { const p = extractYMD(s); if (!p) return ''; return `${p.y}-${pad2(p.m)}-${pad2(p.d)}`; };

/** Formatea a DD/MM/YYYY a partir de una cadena YYYY-MM-DD */
const fmtDate = (s?: string | null) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s ?? ''));
  if (!m) return '—';
  return `${m[3]}/${m[2]}/${m[1]}`;
};

const sod = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const toYMD = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/** Normaliza a 'YYYY-MM-DD' */
const normalizeYMD = (raw?: unknown): string | null => {
  if (raw == null) return null;
  if (raw instanceof Date && !isNaN(raw.getTime())) return raw.toISOString().slice(0, 10);
  const s = String(raw).trim();
  if (!s || /^0{4}-0{2}-0{2}$/.test(s)) return null;
  const m1 = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); if (m1) return `${m1[1]}-${m1[2]}-${m1[3]}`;
  const m2 = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s); if (m2) return `${m2[3]}-${m2[2]}-${m2[1]}`;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

/** suma meses cuidando fin de mes (31 → último del mes destino) */
const addMonthsYMD = (ymdLike: string, meses: number): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymdLike);
  if (!m) return normalizeYMD(ymdLike) ?? ymdLike;
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  const tmp = new Date(y, mo - 1 + (meses || 0), d);
  if (tmp.getDate() !== d) {
    const last = new Date(y, mo - 1 + (meses || 0) + 1, 0);
    return toYMD(last);
  }
  return toYMD(tmp);
};

/* rango relativo respecto a HOY */
const daysTo = (s?: string | null) => {
  const d = parseLocalDate(s);
  if (!d) return 9e9;
  return Math.floor((sod(d).getTime() - sod(new Date()).getTime()) / 86400000);
};

/* ===================== Otros utils ===================== */
const fmtMoney = (v?: number | string | null) => {
  if (v === '' || v == null || Number.isNaN(Number(v))) return '—';
  return `$ ${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(Number(v))}`;
};
const noAcc = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
const keyFrom = (r: Pick<VRow, 'servicio' | 'id'>): EditKey => `${r.servicio === 'Pantalla' ? 'pantalla' : 'completa'}-${r.id}` as EditKey;
const toNum = (v: unknown): number | null => (v == null || v === '' || Number.isNaN(Number(v)) ? null : Number(v));
const normEmail = (s?: string | null) => (s ?? '').trim().toLowerCase();

/** Vencimiento efectivo: usa fecha_vencimiento o la calcula con compra+meses */
const getVencimientoYMD = (r: { fecha_vencimiento?: string|null; fecha_compra?: string|null; meses_pagados?: number|null }) => {
  const fv = normalizeYMD(r.fecha_vencimiento);
  if (fv) return fv;
  const fc = normalizeYMD(r.fecha_compra);
  const m  = r.meses_pagados == null ? null : Number(r.meses_pagados);
  if (!fc || m == null || Number.isNaN(m)) return null;
  return addMonthsYMD(fc, m);
};

/* ===================== Fetch auxiliar ===================== */
type Paginated<T> = { items?: T[]; data?: T[]; next?: string; nextPage?: string; nextPageToken?: string; hasMore?: boolean; };

async function fetchAll<T>(urlBase: string): Promise<T[]> {
  const attempts: string[] = [
    `${urlBase}?all=1&limit=9999`,
    `${urlBase}?limit=9999`,
    `${urlBase}?pageSize=9999`,
    urlBase,
  ];
  for (const u of attempts) {
    try {
      const r: Response = await fetch(u, { cache: 'no-store' });
      if (!r.ok) continue;
      const data: unknown = await r.json();
      if (Array.isArray(data)) return data as T[];
      const pd = data as Paginated<T>;
      if (Array.isArray(pd.items)) return pd.items!;
      if (Array.isArray(pd.data))  return pd.data!;
      // paginado genérico
      const out: T[] = [];
      let page = 1;
      let nextUrl: string | null = u;
      const seen = new Set<string>();
      while (nextUrl) {
        if (seen.has(nextUrl)) break; seen.add(nextUrl);
        const rr: Response = await fetch(nextUrl, { cache: 'no-store' });
        if (!rr.ok) break;
        const dj: Paginated<T> | T[] = await rr.json();
        const arr: T[] = Array.isArray(dj) ? dj :
                        (Array.isArray(dj.items) ? dj.items! :
                        (Array.isArray(dj.data)  ? dj.data!  : []));
        if (arr.length) out.push(...arr);
        const nxt: string | null = (Array.isArray(dj) ? null : (dj.next || dj.nextPage || dj.nextPageToken || null));
        if (typeof nxt === 'string' && nxt) {
          nextUrl = nxt.startsWith('http') ? nxt : `${urlBase}?page=${++page}`;
        } else if (!Array.isArray(dj) && dj.hasMore === true) {
          nextUrl = `${urlBase}?page=${++page}`;
        } else nextUrl = null;
      }
      if (out.length) return out;
    } catch {}
  }
  return [];
}

async function fetchCuentaById(id: number) {
  try {
    let r: Response = await fetch(`/api/cuentascompartidas/${id}`, { cache: 'no-store' });
    if (!r.ok) r = await fetch(`/api/cuentascompartidas?id=${id}`, { cache: 'no-store' });
    if (!r.ok) return null;
    const data = await r.json().catch(() => null) as unknown;
    const obj = Array.isArray(data) ? (data as any[])[0] : (data as any);
    if (!obj) return null;
    return {
      correo: obj?.correo ?? null,
      plataforma_id: toNum(obj?.plataforma_id),
      contrasena: obj?.contrasena ?? null,
    } as { correo: string | null; plataforma_id: number | null; contrasena: string | null };
  } catch { return null; }
}

/* ===================== Subcomponentes tabla ===================== */
const Th = ({ className = '', children, ...rest }: React.ThHTMLAttributes<HTMLTableHeaderCellElement>) => (
  <th {...rest} className={`px-4 py-2 text-left text-xs uppercase tracking-wide text-neutral-300 font-medium whitespace-nowrap border-l border-neutral-800 ${className}`} >{children}</th>
);
const Td = ({ className = '', children, ...rest }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td {...rest} className={`px-4 py-2 text-sm text-neutral-100 align-top border-l border-neutral-800 ${className}`} >{children}</td>
);

/* ===================== Config ===================== */
const NOTIFY_URL = '/api/cuentasvencidas';
const INVENTARIO_URL = '/api/inventario';

/* ===================== Modal ===================== */
type ModalState =
  | { type: 'inventory-choice'; row: VRow; correo: string; plataformaNombre: string; processing?: boolean }
  | { type: 'confirm-delete'; rowsCount: number; processing?: boolean; singleRow?: VRow }
  | null;

function Modal({
  state,
  onInventory,
  onDelete,
  onCancel,
}: {
  state: ModalState;
  onInventory: () => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  if (!state) return null;

  const base =
    'fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm';
  const card =
    'w-full max-w-xl rounded-2xl border border-neutral-700 bg-neutral-900 text-neutral-100 shadow-xl';
  const header =
    'px-5 pt-5 pb-2 text-lg font-semibold';
  const body =
    'px-5 pb-4 text-sm text-neutral-200';
  const footer =
    'px-5 pb-5 flex flex-wrap gap-3 justify-end';

  if (state.type === 'inventory-choice') {
    return (
      <div className={base} role="dialog" aria-modal="true">
        <div className={card}>
          <div className={header}>
            ¿Qué deseas hacer con la {state.row.servicio.toLowerCase()} #{state.row.id}?
          </div>
          <div className={body}>
            <p className="mb-3">
              Esta es la <b>ÚLTIMA</b> relación de <span className="font-mono">{state.correo}</span> en <b>{state.plataformaNombre}</b>.
            </p>
            <p>
              Elige <b>Enviar al inventario</b> para archivarla (se guardará el correo y, si existe, la clave) y luego se eliminará;
              o <b>Eliminar definitivamente</b> para borrar sin archivar.
            </p>
          </div>
          <div className={footer}>
            <button
              onClick={onInventory}
              disabled={state.processing}
              className="min-w-[12rem] h-10 rounded-lg px-4 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60"
            >
              Enviar al inventario
            </button>
            <button
              onClick={onDelete}
              disabled={state.processing}
              className="min-w-[12rem] h-10 rounded-lg px-4 bg-red-700 hover:bg-red-600 disabled:opacity-60"
            >
              Eliminar definitivamente
            </button>
            <button
              onClick={onCancel}
              disabled={state.processing}
              className="h-10 rounded-lg px-4 border border-neutral-600 hover:bg-neutral-800 disabled:opacity-60"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // confirm-delete
  return (
    <div className={base} role="dialog" aria-modal="true">
      <div className={card}>
        <div className={header}>
          {state.rowsCount === 1
            ? `¿Eliminar la ${state.singleRow?.servicio.toLowerCase()} #${state.singleRow?.id}?`
            : `¿Eliminar ${state.rowsCount} registro(s)?`}
        </div>
        <div className={body}>
          {state.rowsCount === 1
            ? 'Se eliminará definitivamente este registro.'
            : 'Se eliminarán definitivamente todos los registros seleccionados (se pedirá inventario cuando aplique).'}
        </div>
        <div className={footer}>
          <button
            onClick={onDelete}
            disabled={state.processing}
            className="min-w-[12rem] h-10 rounded-lg px-4 bg-red-700 hover:bg-red-600 disabled:opacity-60"
          >
            Eliminar
          </button>
          <button
            onClick={onCancel}
            disabled={state.processing}
            className="h-10 rounded-lg px-4 border border-neutral-600 hover:bg-neutral-800 disabled:opacity-60"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===================== Componente ===================== */
export default function CuentasVencidasViewer() {
  const { plataformas } = usePlataformas();

  const [mostrar, setMostrar] = useState<'hoy-maniana' | 'solo-hoy' | 'solo-maniana'>('hoy-maniana');
  const [q, setQ] = useState('');
  const [plataformaId, setPlataformaId] = useState<number | ''>('');
  const [servicio, setServicio] = useState<'Todos' | VServicio>('Todos');

  const [rows, setRows] = useState<VRow[]>([]);         // vencidas + mañana
  const [allRows, setAllRows] = useState<VRow[]>([]);   // todas para lógicas
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [editingKey, setEditingKey] = useState<EditKey | null>(null);
  const [draft, setDraft] = useState<Partial<VRow>>({});
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const tableScrollRef = useRef<HTMLDivElement>(null);

  const [claveQueue, setClaveQueue] = useState<ClaveItem[]>([]);

  // selección múltiple
  const [selectedKeys, setSelectedKeys] = useState<Set<EditKey>>(new Set());

  // modal
  const [modal, setModal] = useState<ModalState>(null);
  const modalResolver = useRef<((v: 'inventory' | 'delete' | 'cancel') => void) | null>(null);


  // inputs para agregar manualmente (notificaciones)
  const [manualCorreo, setManualCorreo] = useState('');
  const [manualClave, setManualClave] = useState('');
  const [manualPlataformaId, setManualPlataformaId] = useState<number | ''>('');

  const platformMap = useMemo(() => {
    const m = new Map<number, string>();
    plataformas.forEach((p) => m.set(p.id, (p as any).nombre ?? String(p.id)));
    return m;
  }, [plataformas]);

  /* ===== carga ===== */
  useEffect(() => {
    let cancel = false;
    const run = async () => {
      setLoading(true); setErr(null);
      try {
        const [pantRaw, compRaw] = await Promise.all([
          fetchAll<any>('/api/pantallas'),
          fetchAll<any>('/api/cuentascompletas'),
        ]);

        // 1) Normalizar pantallas
        let pantNorm: VRow[] = (Array.isArray(pantRaw) ? pantRaw : []).map(normalizePantallaBase);

        // 1.a) Completar nombre desde /api/usuarios si falta
        if (pantNorm.some((r) => !r.nombre)) {
          try {
            const usuarios = await fetchAll<any>('/api/usuarios');
            const map = new Map(usuarios.map((u: any) => [String(u.contacto ?? '').trim().toLowerCase(), u.nombre ?? null]));
            pantNorm = pantNorm.map((r) =>
              r.nombre ? r : { ...r, nombre: map.get((r.contacto ?? '').trim().toLowerCase()) ?? null }
            );
          } catch {}
        }

        // 1.b) Completar pantallas con datos de cuenta_compartida (si hay cuenta_id)
        const ids: number[] = Array.from(new Set(pantNorm.map((r) => r.cuenta_id!).filter((x): x is number => typeof x === 'number')));
        if (ids.length) {
          const cache = new Map<number, Awaited<ReturnType<typeof fetchCuentaById>>>();
          await Promise.all(ids.map(async (id) => cache.set(id, await fetchCuentaById(id))));
          pantNorm = pantNorm.map((r) => {
            if (!r.cuenta_id) return r;
            const c = cache.get(r.cuenta_id);
            return c ? {
              ...r,
              correo: r.correo ?? c.correo,
              contrasena: r.contrasena ?? c.contrasena,
              plataforma_id: r.plataforma_id ?? c.plataforma_id ?? null,
            } : r;
          });
        }

        // 2) Normalizar completas
        const compNorm: VRow[] = (Array.isArray(compRaw) ? compRaw : []).map(normalizeCompleta);

        // 3) Combinar y rotular plataforma
        const all: VRow[] = [...pantNorm, ...compNorm].map((r) => ({
          ...r,
          plataforma_nombre: r.plataforma_id != null ? (platformMap.get(Number(r.plataforma_id)) ?? String(r.plataforma_id)) : null,
        }));

        const allWithDates = all.map((r) => ({ ...r, fecha_vencimiento: getVencimientoYMD(r) ?? r.fecha_vencimiento } as VRow));
        if (!cancel) setAllRows(allWithDates);

        // 4) Filtrar vista según "mostrar"
        const filtered = allWithDates.filter((r) => {
          const dd = daysTo(getVencimientoYMD(r));
          if (mostrar === 'solo-hoy') return dd <= 0 && dd >= -10000; // hoy y anteriores
          if (mostrar === 'solo-maniana') return dd === 1;
          return dd <= 1; // hoy/anteriores + mañana
        }).sort((a, b) => {
          const da = parseLocalDate(getVencimientoYMD(a))?.getTime() ?? 0;
          const db = parseLocalDate(getVencimientoYMD(b))?.getTime() ?? 0;
          return da - db;
        });

        if (!cancel) { setRows(filtered); setSelectedIndex(0); setSelectedKeys(new Set()); }
      } catch (e: any) {
        if (!cancel) { setErr(e?.message ?? 'Error al cargar'); setRows([]); setSelectedKeys(new Set()); }
      } finally { if (!cancel) setLoading(false); }
    };
    run();
    return () => { cancel = true; };
  }, [refreshKey, platformMap, mostrar]);

  const viewRows = useMemo(() => {
    const qn = noAcc(q.trim());
    const pid = plataformaId === '' ? null : Number(plataformaId);
    return rows.filter((r) => {
      if (pid && (r.plataforma_id ?? null) !== pid) return false;
      if (servicio !== 'Todos' && r.servicio !== servicio) return false;
      if (!qn) return true;
      const hay = noAcc(
        [
          r.plataforma_nombre ?? '',
          r.servicio,
          r.contacto,
          r.nombre ?? '',
          r.correo ?? '',
          r.contrasena ?? '',
          r.estado ?? '',
          r.comentario ?? '',
          r.nro_pantalla ?? '',
        ].join(' | ')
      );
      return hay.includes(qn);
    });
  }, [rows, q, plataformaId, servicio]);

  /* ===================== Edición ===================== */
  const beginEdit = (row: VRow) => {
    setEditingKey(keyFrom(row));
    setSaveErr(null);
    setDraft({
      ...row,
      fecha_compra: toDateInput(row.fecha_compra),
      fecha_vencimiento: toDateInput(getVencimientoYMD(row) ?? row.fecha_vencimiento ?? undefined),
      total_pagado: row.total_pagado == null || row.total_pagado === '' ? '' : String(row.total_pagado),
      contrasena: row.contrasena ?? '',
      comentario: row.comentario ?? '',
    });
  };
  const cancelEdit = () => { setEditingKey(null); setDraft({}); setSaveErr(null); };

  /** 🔁 Recalcula la fecha de vencimiento si cambian compra/meses */
  const recalcVencimiento = (compraYmd?: string, meses?: number | '' | null) => {
    const fc = (compraYmd ?? '').trim();
    const m = typeof meses === 'string' ? Number(meses || 0) : (meses ?? 0);
    if (!fc || Number.isNaN(m)) return;
    const fv = addMonthsYMD(fc, m);
    setDraft((d) => ({ ...d, fecha_vencimiento: fv }));
  };
  const onChangeFechaCompra = (val: string) => {
    setDraft((d) => ({ ...d, fecha_compra: val }));
    const m = draft.meses_pagados as unknown as number | '' | null;
    recalcVencimiento(val, m == null || m === '' ? 0 : Number(m));
  };
  const onChangeMeses = (val: string) => {
    const parsed = val === '' ? '' : Number(val);
    setDraft((d) => ({ ...d, meses_pagados: parsed as any }));
    const fc = (draft.fecha_compra as string) || '';
    if (fc) recalcVencimiento(fc, parsed === '' ? 0 : Number(parsed));
  };

  const saveEdit = useCallback(async () => {
    if (!editingKey || saving) return;
    setSaving(true); setSaveErr(null);
    try {
      const [tipo, idStr] = editingKey.split('-'); const id = Number(idStr);

      const payload = {
        contacto: (draft.contacto ?? '').toString(),
        nombre: (draft.nombre ?? null) as any,
        correo: (draft.correo ?? '') as any,
        meses_pagados: draft.meses_pagados == null || (draft.meses_pagados as any) === '' ? null : Number(draft.meses_pagados),
        fecha_compra: (draft.fecha_compra as string) || null,
        fecha_vencimiento: (draft.fecha_vencimiento as string) || null,
        total_pagado: draft.total_pagado == null || draft.total_pagado === '' ? null : Number(draft.total_pagado),
        estado: (draft.estado ?? '').toString(),
        comentario: ((draft.comentario ?? '') as string) || null,
      };

      const original = rows.find(r => keyFrom(r) === editingKey) || allRows.find(r => keyFrom(r) === editingKey);
      const claveCambio = (draft.contrasena ?? '') !== (original?.contrasena ?? '');

      if (tipo === 'pantalla') {
        const res = await fetch(`/api/pantallas/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contacto: payload.contacto,
            nro_pantalla: draft.nro_pantalla ?? null,
            fecha_compra: payload.fecha_compra,
            fecha_vencimiento: payload.fecha_vencimiento,
            meses_pagados: payload.meses_pagados,
            total_pagado: payload.total_pagado,
            estado: payload.estado,
            comentario: payload.comentario,
          }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'No se pudo guardar');

        const correoDraft = (draft.correo as string) ?? '';
        const passDraft = (draft.contrasena as string) ?? '';
        if (correoDraft || passDraft) {
          let pid: number | null = toNum(draft.plataforma_id);
          if (!pid) pid = original?.plataforma_id ?? null;
          if (!pid) throw new Error('No se puede guardar correo/clave: falta plataforma.');

          if (draft.cuenta_id) {
            await fetch(`/api/cuentascompartidas/${draft.cuenta_id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ correo: correoDraft || null, contrasena: passDraft.trim() === '' ? null : passDraft }),
            }).catch(() => {});
          } else {
            const rNew = await fetch('/api/cuentascompartidas', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ plataforma_id: pid, correo: correoDraft || null, contrasena: passDraft.trim() === '' ? null : passDraft }),
            });
            if (!rNew.ok) throw new Error((await rNew.json().catch(() => ({}))).error ?? 'No se pudo crear la cuenta compartida');
            const created = await rNew.json();
            if (created?.id) {
              await fetch(`/api/pantallas/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cuenta_id: created.id }),
              }).catch(() => {});
              (draft as any).cuenta_id = created.id;
            }
          }
        }
      } else {
        const res = await fetch(`/api/cuentascompletas/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contacto: payload.contacto,
            nombre: payload.nombre,
            correo: payload.correo,
            contrasena: (draft.contrasena as string)?.trim() === '' ? null : (draft.contrasena as string) ?? undefined,
            meses_pagados: payload.meses_pagados,
            fecha_compra: payload.fecha_compra,
            fecha_vencimiento: payload.fecha_vencimiento,
            total_pagado: payload.total_pagado,
            estado: payload.estado,
            comentario: payload.comentario,
          }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'No se pudo guardar');
      }

      setRows((rs) =>
        rs.map((r) =>
          keyFrom(r) !== editingKey
            ? r
            : ({
                ...r,
                ...draft,
                fecha_compra: payload.fecha_compra || r.fecha_compra,
                fecha_vencimiento: payload.fecha_vencimiento || r.fecha_vencimiento,
              } as VRow)
        )
      );

      const correoFinal = (draft.correo ?? original?.correo ?? '').toString().trim();
      const claveFinal = (draft.contrasena ?? '').toString().trim();
      const cuentaIdFinal = (draft.cuenta_id ?? original?.cuenta_id) ?? null;
      const platIdFinal = (draft.plataforma_id ?? original?.plataforma_id) ?? null;

      if (claveCambio && correoFinal && claveFinal) {
        setClaveQueue((q) => {
          const next = [...q];
          const idx = next.findIndex(x =>
            x.correo.toLowerCase() === correoFinal.toLowerCase() &&
            (x.cuenta_id ?? null) === (cuentaIdFinal ?? null) &&
            (x.plataforma_id ?? null) === (platIdFinal ?? null)
          );
          const entry: ClaveItem = { correo: correoFinal, nuevaClave: claveFinal, cuenta_id: cuentaIdFinal, plataforma_id: platIdFinal };
          if (idx >= 0) next[idx] = entry; else next.push(entry);
          return next;
        });
      }

      cancelEdit();
    } catch (e: any) { setSaveErr(e?.message ?? 'Error al guardar'); }
    finally { setSaving(false); }
  }, [editingKey, draft, saving, rows, allRows]);

  /* ===================== Inventario / eliminación ===================== */

  function isLastRelated(row: VRow, correoLower: string, pid: number | null): boolean {
    if (row.servicio === 'Pantalla' && row.cuenta_id != null) {
      const others = allRows.filter(r =>
        r.servicio === 'Pantalla' &&
        r.cuenta_id === row.cuenta_id &&
        !(r.servicio === row.servicio && r.id === row.id)
      );
      return others.length === 0;
    }
    const others = allRows.filter(r =>
      normEmail(r.correo) === correoLower &&
      (r.plataforma_id ?? null) === (pid ?? null) &&
      !(r.servicio === row.servicio && r.id === row.id)
    );
    return others.length === 0;
  }

  async function gatherCreds(row: VRow) {
    let correo = normEmail(row.correo);
    let clave = row.contrasena ?? '';
    let pid: number | null = row.plataforma_id ?? null;

    if ((!correo || !pid || !clave) && row.servicio === 'Pantalla' && row.cuenta_id) {
      const acc = await fetchCuentaById(row.cuenta_id);
      if (acc) {
        correo = correo || normEmail(acc.correo);
        clave = clave || (acc.contrasena ?? '');
        pid = pid ?? acc.plataforma_id ?? null;
      }
    }
    return { correo, clave, pid };
  }

  async function sendToInventory(pid: number, correo: string, clave?: string | null) {
    const res = await fetch(INVENTARIO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plataforma_id: pid, correo, clave: (clave?.trim() || null) }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j?.error ?? 'No se pudo guardar en el inventario');
    }
  }

  async function deleteRow(row: VRow) {
    const url = row.servicio === 'Pantalla' ? `/api/pantallas/${row.id}` : `/api/cuentascompletas/${row.id}`;
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      if (res.status === 409) { alert(j?.message || 'No se puede eliminar: tiene registros asociados.'); return false; }
      throw new Error(j?.error ?? 'No se pudo eliminar');
    }
    setRows((rs) => rs.filter((r) => !(r.id === row.id && r.servicio === row.servicio)));
    setSelectedKeys((prev) => {
      const n = new Set(prev); n.delete(keyFrom(row)); return n;
    });
    return true;
  }

  // helpers de modal como promesas
  function askInventoryChoice(row: VRow, correo: string, plataformaNombre: string) {
    return new Promise<'inventory' | 'delete' | 'cancel'>((resolve) => {
      modalResolver.current = resolve;
      setModal({ type: 'inventory-choice', row, correo, plataformaNombre });
    });
  }
  function askConfirmDelete(rowsCount: number, singleRow?: VRow) {
    return new Promise<'delete' | 'cancel'>((resolve) => {
      modalResolver.current = (v) => resolve(v as any);
      setModal({ type: 'confirm-delete', rowsCount, singleRow });
    });
  }
    function closeModal(result: 'inventory' | 'delete' | 'cancel') {
    const r = modalResolver.current;
    modalResolver.current = null;  // libera el handler
    setModal(null);
    r?.(result);                   // llama si existe
  }

  async function handleDeleteSingle(row: VRow) {
    try {
      setDeleting(true);

      const { correo, clave, pid } = await gatherCreds(row);
      // Si no hay correo/plataforma => confirmación simple
      if (!correo || !pid) {
        const conf = await askConfirmDelete(1, row);
        if (conf === 'delete') await deleteRow(row);
        return;
      }

      const last = isLastRelated(row, correo, pid);
      if (!last) {
        const conf = await askConfirmDelete(1, row);
        if (conf === 'delete') await deleteRow(row);
        return;
      }

      // última relación -> mostrar modal custom
      const plataformaNombre = platformMap.get(pid) ?? String(pid);
      const choice = await askInventoryChoice(row, correo, plataformaNombre);
      if (choice === 'inventory') {
        await sendToInventory(pid, correo, clave || null);
        await deleteRow(row);
      } else if (choice === 'delete') {
        await deleteRow(row);
      } // cancel => nada
    } catch (e: any) {
      alert(e?.message ?? 'Error al eliminar');
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteSelected(rowsToDelete: VRow[]) {
    if (rowsToDelete.length === 0) return;
    const conf = await askConfirmDelete(rowsToDelete.length);
    if (conf !== 'delete') return;

    try {
      setDeleting(true);
      for (const row of rowsToDelete) {
        const { correo, clave, pid } = await gatherCreds(row);
        if (correo && pid && isLastRelated(row, correo, pid)) {
          // pedir decisión para cada "última relación"
          const plataformaNombre = platformMap.get(pid) ?? String(pid);
          const decision = await askInventoryChoice(row, correo, plataformaNombre);
          if (decision === 'inventory') {
            await sendToInventory(pid, correo, clave || null);
            await deleteRow(row);
          } else if (decision === 'delete') {
            await deleteRow(row);
          } else {
            // cancel: parar lote
            break;
          }
        } else {
          // no última: eliminar directo
          await deleteRow(row);
        }
      }
    } catch (e: any) {
      alert(e?.message ?? 'Error eliminando selección');
    } finally {
      setDeleting(false);
    }
  }

  /* ===================== Selección ===================== */
  const toggleRowSelection = (row: VRow) => {
    const k = keyFrom(row);
    setSelectedKeys((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k); else n.add(k);
      return n;
    });
  };
  const allVisibleSelected = viewRows.length > 0 && viewRows.every((r) => selectedKeys.has(keyFrom(r)));
  const toggleSelectAllVisible = () => {
    setSelectedKeys((prev) => {
      const n = new Set(prev);
      if (allVisibleSelected) {
        viewRows.forEach((r) => n.delete(keyFrom(r)));
      } else {
        viewRows.forEach((r) => n.add(keyFrom(r)));
      }
      return n;
    });
  };

  /* ===================== Notificaciones (cola + envío) ===================== */
  const notifyQueue = async () => {
    if (claveQueue.length === 0) { alert('No hay cambios de clave en cola.'); return; }
    try {
      const outMap = new Map<string, { correo: string; nuevaClave: string }>();

      for (const cq of claveQueue) {
        const sameAccount = allRows.filter(r => {
          const sameCuenta = (cq.cuenta_id != null && r.cuenta_id != null)
            ? r.cuenta_id === cq.cuenta_id
            : (
              (r.correo ?? '').trim().toLowerCase() === cq.correo.trim().toLowerCase() &&
              (cq.plataforma_id == null || (r.plataforma_id ?? null) === cq.plataforma_id)
            );
          if (!sameCuenta) return false;
          const fv = getVencimientoYMD(r);
          return daysTo(fv) >= 1 && !!(r.correo && r.correo.trim());
        });

        for (const r of sameAccount) {
          const key = `${r.correo!.trim().toLowerCase()}|${cq.nuevaClave}`;
          outMap.set(key, { correo: r.correo!.trim(), nuevaClave: cq.nuevaClave });
        }
      }

      const items = Array.from(outMap.values());
      if (items.length === 0) { alert('No hay destinatarios válidos (solo se notifica a quienes vencen mañana o en el futuro).'); return; }

      const res = await fetch(NOTIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Fallo notificando cambios');
      setClaveQueue([]);
      alert(`Notificaciones enviadas a ${items.length} contacto(s).`);
    } catch (e: any) {
      alert(e?.message ?? 'Error notificando cambios de clave');
    }
  };

  const addManualToQueue = () => {
    const email = manualCorreo.trim().toLowerCase();
    const pass  = manualClave.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { alert('Correo inválido'); return; }
    if (!pass) { alert('Ingresa la nueva clave'); return; }

    const entry: ClaveItem = { correo: email, nuevaClave: pass, plataforma_id: manualPlataformaId === '' ? null : Number(manualPlataformaId) };
    setClaveQueue((q) => {
      const next = [...q];
      const idx = next.findIndex(x =>
        x.correo.toLowerCase() === entry.correo &&
        (x.plataforma_id ?? null) === (entry.plataforma_id ?? null) &&
        x.nuevaClave === entry.nuevaClave
      );
      if (idx >= 0) next[idx] = entry; else next.push(entry);
      return next;
    });

    setManualCorreo(''); setManualClave(''); setManualPlataformaId('');
  };

  /* ===================== Teclado/scroll y Enter ===================== */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (viewRows.length === 0) return;
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(viewRows.length - 1, i + 1));
    } else if (e.key === 'ArrowLeft') {
      tableScrollRef.current?.scrollBy({ left: -120, behavior: 'smooth' });
    } else if (e.key === 'ArrowRight') {
      tableScrollRef.current?.scrollBy({ left: 120, behavior: 'smooth' });
    } else if (e.key === 'Enter') {
      if (editingKey) {
        e.preventDefault();
        void saveEdit();
      } else {
        e.preventDefault();
        const row = viewRows[selectedIndex];
        if (row) beginEdit(row);
      }
    }
  };

  /* ===================== UI ===================== */
  return (
    <div className="w-full max-w-screen-2xl mx-auto px-3 space-y-4" tabIndex={0} onKeyDown={handleKeyDown}>
      {/* Barra selección y acciones en lote */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-neutral-300">Seleccionados: <b>{selectedKeys.size}</b></span>
        <button
          type="button"
          disabled={selectedKeys.size === 0 || deleting}
          onClick={() => {
            const target = viewRows.filter(r => selectedKeys.has(keyFrom(r)));
            void handleDeleteSelected(target);
          }}
          className="h-9 rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-neutral-100 hover:bg-neutral-800 disabled:opacity-50"
        >
          Eliminar seleccionados
        </button>
        <button
          type="button"
          disabled={viewRows.length === 0 || deleting}
          onClick={() => void handleDeleteSelected(viewRows)}
          className="h-9 rounded-lg border border-red-800 bg-red-900/30 px-3 text-red-100 hover:bg-red-800/40 disabled:opacity-50"
        >
          Eliminar todo
        </button>
      </div>

      {/* Filtros */}
      <div className="grid gap-3 sm:grid-cols-[220px_220px_180px_auto_auto] items-end">
        {/* Mostrar */}
        <div>
          <label className="block text-sm mb-1 text-neutral-300">Mostrar</label>
          <select
            className="w-full h-10 rounded-lg px-3 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600"
            value={mostrar}
            onChange={(e) => setMostrar(e.target.value as any)}
          >
            <option value="hoy-maniana">Hoy o anteriores y Mañana</option>
            <option value="solo-hoy">Solo hoy (y anteriores)</option>
            <option value="solo-maniana">Solo mañana</option>
          </select>
        </div>

        {/* Plataforma */}
        <div>
          <label className="block text-sm mb-1 text-neutral-300">Plataforma</label>
          <select
            className="w-full h-10 rounded-lg px-3 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 [&>option]:bg-neutral-900 [&>option]:text-neutral-100"
            value={plataformaId === '' ? '' : String(plataformaId)}
            onChange={(e) => setPlataformaId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Todas</option>
            {plataformas.map((p) => (<option key={p.id} value={p.id}>{(p as any).nombre ?? p.id}</option>))}
          </select>
        </div>

        {/* Servicio */}
        <div>
          <label className="block text-sm mb-1 text-neutral-300">Servicio</label>
          <select
            className="w-full h-10 rounded-lg px-3 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 [&>option]:bg-neutral-900 [&>option]:text-neutral-100"
            value={servicio} onChange={(e) => setServicio(e.target.value as any)}
          >
            <option value="Todos">Todos</option>
            <option value="Pantalla">Pantalla</option>
            <option value="Cuenta completa">Cuenta completa</option>
          </select>
        </div>

        {/* Refrescar */}
        <button
          type="button" onClick={() => setRefreshKey((k) => k + 1)}
          className="h-10 rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 hover:bg-neutral-800"
        >
          Refrescar
        </button>

        {/* Notificar cambio de clave */}
        <button
          type="button"
          onClick={notifyQueue}
          className="h-10 rounded-lg border border-blue-700 bg-blue-900/30 px-3 text-blue-100 outline-none focus:ring-2 focus:ring-blue-600 hover:bg-blue-800/40 whitespace-nowrap shrink-0 justify-self-end"
          title="Enviar notificación a todos los correos en la cola"
        >
          Notificar cambio de clave
        </button>
      </div>

      {/* Buscador local */}
      <input
        type="text" value={q} onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar por plataforma, servicio, contacto, correo, nombre…"
        className="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
      />

      {/* Lista */}
      {loading && <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4 text-sm text-neutral-300">Cargando…</div>}
      {err && <div className="rounded-xl border border-red-800/50 bg-red-950/30 p-4 text-sm text-red-200">Error: {err}</div>}

      {!loading && !err && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 overflow-hidden">
          <div className="overflow-x-auto max-h-[70vh]" ref={tableScrollRef}>
            <table className="min-w-[2000px] w-full table-fixed border-separate border-spacing-0">
              <thead>
                <tr className="bg-neutral-900/70 border-b border-neutral-800">
                  <Th className="w-10 text-center border-l-0">
                    <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAllVisible} />
                  </Th>
                  <Th className="w-28 text-center">Acciones</Th>
                  <Th className="w-56">Plataforma</Th>
                  <Th className="w-44">Servicio</Th>
                  <Th className="w-44">Contacto</Th>
                  <Th className="w-48">Nombre</Th>
                  <Th className="w-80">Correo</Th>
                  <Th className="w-56">Clave</Th>
                  <Th className="w-40">Compra</Th>
                  <Th className="w-40">Vence</Th>
                  <Th className="w-28">Meses</Th>
                  <Th className="w-40">Total</Th>
                  <Th className="w-40">Estado</Th>
                  <Th className="w-[520px]">Comentario</Th>
                </tr>
              </thead>
              <tbody>
                {viewRows.map((row, idx) => {
                  const key = keyFrom(row);
                  const isEditing = editingKey === key;
                  const isSelected = selectedIndex === idx;
                  const plat = row.plataforma_id != null ? (platformMap.get(Number(row.plataforma_id)) ?? String(row.plataforma_id)) : '—';
                  const checked = selectedKeys.has(key);

                  return (
                    <tr
                      key={key}
                      className={`border-b border-neutral-900 ${idx % 2 === 0 ? 'bg-neutral-900/30' : 'bg-transparent'} hover:bg-neutral-800/40 ${isSelected ? 'ring-2 ring-blue-600/60' : ''}`}
                      onDoubleClick={() => beginEdit(row)}
                    >
                      {/* checkbox */}
                      <Td className="text-center border-l-0">
                        <input type="checkbox" checked={!!checked} onChange={() => toggleRowSelection(row)} />
                      </Td>

                      {/* Acciones */}
                      <Td className="text-center">
                        {!isEditing ? (
                          <div className="flex items-center justify-center gap-2">
                            <IconBtn
                              onClick={() => beginEdit(row)}
                              className="text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100 focus:ring-neutral-600"
                              title="Editar"
                            >
                              <PencilIcon />
                            </IconBtn>

                            <IconBtn
                              onClick={() => void handleDeleteSingle(row)}
                              className="text-red-200 hover:bg-red-800/30 hover:text-red-100 focus:ring-red-600"
                              title="Eliminar"
                              disabled={deleting}
                            >
                              <TrashIcon />
                            </IconBtn>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <IconBtn onClick={saveEdit} className="text-emerald-200 hover:bg-emerald-800/30 hover:text-emerald-100 focus:ring-emerald-600" title="Guardar" disabled={saving}>
                              <CheckIcon />
                            </IconBtn>
                            <IconBtn onClick={cancelEdit} className="text-red-200 hover:bg-red-800/30 hover:text-red-100 focus:ring-red-600" title="Cancelar" disabled={saving}>
                              <XIcon />
                            </IconBtn>
                          </div>
                        )}
                      </Td>

                      <Td title={plat}>{plat}</Td>
                      <Td className="font-semibold">{row.servicio}</Td>

                      <Td title={row.contacto}>
                        {!isEditing ? row.contacto : (
                          <input className="w-full rounded-md px-2 py-1 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
                                 value={(draft.contacto as string) ?? row.contacto}
                                 onChange={(e) => setDraft((d) => ({ ...d, contacto: e.target.value }))} />
                        )}
                      </Td>

                      <Td title={row.nombre ?? ''}>
                        {!isEditing ? (row.nombre ?? '—') : (
                          <input className="w-full rounded-md px-2 py-1 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
                                 value={(draft.nombre as string) ?? row.nombre ?? ''}
                                 onChange={(e) => setDraft((d) => ({ ...d, nombre: e.target.value }))} />
                        )}
                      </Td>

                      {/* CORREO */}
                      <Td title={row.correo ?? ''} className="whitespace-pre-wrap break-words">
                        {!isEditing ? (row.correo ?? '—') : (
                          <input type="email"
                                 className="w-full rounded-md px-2 py-1 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
                                 value={(draft.correo as string) ?? row.correo ?? ''}
                                 onChange={(e) => setDraft((d) => ({ ...d, correo: e.target.value }))} />
                        )}
                      </Td>

                      {/* CLAVE */}
                      <Td title={row.contrasena ?? ''} className="whitespace-pre-wrap break-words">
                        {!isEditing ? (row.contrasena ?? '—') : (
                          <input type="text"
                                 className="w-full rounded-md px-2 py-1 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
                                 value={(draft.contrasena as string) ?? row.contrasena ?? ''}
                                 onChange={(e) => setDraft((d) => ({ ...d, contrasena: e.target.value }))} />
                        )}
                      </Td>

                      {/* COMPRA */}
                      <Td>
                        {!isEditing ? (
                          fmtDate(row.fecha_compra)
                        ) : (
                          <input
                            type="date"
                            className="w-full rounded-md px-2 py-1 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
                            value={(draft.fecha_compra as string) ?? ''}
                            onChange={(e) => onChangeFechaCompra(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void saveEdit(); } }}
                          />
                        )}
                      </Td>

                      {/* VENCE */}
                      <Td>
                        {!isEditing ? (
                          fmtDate(getVencimientoYMD(row))
                        ) : (
                          <input
                            type="date"
                            className="w-full rounded-md px-2 py-1 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
                            value={(draft.fecha_vencimiento as string) ?? ''}
                            onChange={(e) => setDraft((d) => ({ ...d, fecha_vencimiento: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void saveEdit(); } }}
                          />
                        )}
                      </Td>

                      {/* MESES */}
                      <Td>
                        {!isEditing ? (
                          row.meses_pagados == null ? '—' : String(row.meses_pagados)
                        ) : (
                          <input
                            type="number"
                            min={0}
                            step={1}
                            className="w-full rounded-md px-2 py-1 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
                            value={draft.meses_pagados == null || (draft.meses_pagados as any) === '' ? '' : String(draft.meses_pagados)}
                            onChange={(e) => onChangeMeses(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void saveEdit(); } }}
                          />
                        )}
                      </Td>

                      <Td>{!isEditing ? fmtMoney(row.total_pagado) : (
                        <input type="number" step="0.01" min={0}
                               className="w-full rounded-md px-2 py-1 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
                               value={draft.total_pagado == null ? '' : String(draft.total_pagado)}
                               onChange={(e) => setDraft((d) => ({ ...d, total_pagado: e.target.value }))} />
                      )}</Td>

                      <Td>{!isEditing ? (row.estado ?? '—') : (
                        <input
                          className="w-full rounded-md px-2 py-1 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
                          value={(draft.estado as string) ?? row.estado ?? ''}
                          onChange={(e) => setDraft((d) => ({ ...d, estado: e.target.value }))}
                        />
                      )}</Td>

                      {/* COMENTARIO */}
                      <Td className="!whitespace-pre-wrap break-words" title={row.comentario ?? ''}>
                        {!isEditing ? <div className="whitespace-pre-wrap break-words">{row.comentario ?? '—'}</div> : (
                          <textarea
                            className="w-full rounded-md px-2 py-1 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500 resize-y"
                            rows={2}
                            value={(draft.comentario as string) ?? row.comentario ?? ''}
                            onChange={(e) => setDraft((d) => ({ ...d, comentario: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void saveEdit(); } }}
                          />
                        )}
                      </Td>
                    </tr>
                  );
                })}
                {viewRows.length === 0 && (
                  <tr><Td colSpan={14} className="text-neutral-300 text-sm py-4 border-l-0">No hay vencimientos con los filtros actuales.</Td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* errores de guardado */}
          {saveErr && (
            <div className="m-3 rounded-lg border border-red-800/50 bg-red-950/30 p-3 text-sm text-red-200">{saveErr}</div>
          )}

          {/* Cola de claves + agregar manual */}
          <div className="m-3 space-y-2">
            <div className="text-xs text-neutral-400">
              Cambios de clave en cola: {claveQueue.length > 0 ? (
                <span className="text-neutral-200">{claveQueue.map(x => x.correo).join(', ')}</span>
              ) : '—'}
            </div>

            <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_minmax(180px,1fr)_minmax(220px,1fr)_auto_auto]">
              <input
                type="email"
                placeholder="Correo para agregar…"
                className="h-10 rounded-lg px-3 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600"
                value={manualCorreo}
                onChange={(e) => setManualCorreo(e.target.value)}
              />
              <input
                type="text"
                placeholder="Nueva clave…"
                className="h-10 rounded-lg px-3 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600"
                value={manualClave}
                onChange={(e) => setManualClave(e.target.value)}
              />
              <select
                className="h-10 rounded-lg px-3 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 [&>option]:bg-neutral-900 [&>option]:text-neutral-100"
                value={manualPlataformaId === '' ? '' : String(manualPlataformaId)}
                onChange={(e) => setManualPlataformaId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">Plataforma (opcional)</option>
                {plataformas.map((p) => (<option key={p.id} value={p.id}>{(p as any).nombre ?? p.id}</option>))}
              </select>

              <button
                type="button"
                onClick={addManualToQueue}
                className="h-10 rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 hover:bg-neutral-800"
              >
                Agregar a la cola
              </button>

              <button
                type="button"
                onClick={notifyQueue}
                className="h-10 rounded-lg border border-blue-700 bg-blue-900/30 px-3 text-blue-100 outline-none focus:ring-2 focus:ring-blue-600 hover:bg-blue-800/40 whitespace-nowrap"
              >
                Notificar cambio de clave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL */}
      <Modal
        state={modal}
        onInventory={() => {
          if (!modal) return;
          setModal({ ...modal, processing: true } as any);
          closeModal('inventory');
        }}
        onDelete={() => {
          if (!modal) return;
          setModal({ ...modal, processing: true } as any);
          closeModal('delete');
        }}
        onCancel={() => closeModal('cancel')}
      />
    </div>
  );
}

/* ===================== Normalizadores ===================== */
function normalizePantallaBase(r: any): VRow {
  return {
    servicio: 'Pantalla',
    id: Number(r.id),
    plataforma_id: toNum(r?.plataforma_id),
    contacto: String(r?.contacto ?? ''),
    nombre: r?.nombre ?? r?.usuarios?.nombre ?? null,
    correo: r?.correo ?? null,
    contrasena: r?.contrasena ?? null,
    cuenta_id: toNum(r?.cuenta_id),
    nro_pantalla: r?.nro_pantalla ?? null,
    fecha_compra: normalizeYMD(r?.fecha_compra),
    fecha_vencimiento: normalizeYMD(r?.fecha_vencimiento),
    meses_pagados: toNum(r?.meses_pagados),
    total_pagado: r?.total_pagado == null ? null : Number(r?.total_pagado),
    estado: r?.estado ?? null,
    comentario: r?.comentario ?? null,
  };
}
function normalizeCompleta(r: any): VRow {
  const u = r?.usuarios ?? r?.usuario ?? null;
  return {
    servicio: 'Cuenta completa',
    id: Number(r.id),
    plataforma_id: toNum(r?.plataforma_id),
    contacto: String(r?.contacto ?? u?.contacto ?? ''),
    nombre: r?.nombre ?? u?.nombre ?? null,
    correo: r?.correo ?? null,
    contrasena: r?.contrasena ?? null,
    fecha_compra: normalizeYMD(r?.fecha_compra),
    fecha_vencimiento: normalizeYMD(r?.fecha_vencimiento),
    meses_pagados: toNum(r?.meses_pagados),
    total_pagado: r?.total_pagado == null ? null : Number(r?.total_pagado),
    estado: r?.estado ?? null,
    comentario: r?.comentario ?? null,
  };
}
