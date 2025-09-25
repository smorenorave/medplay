// src/components/viewers/CuentasCompletasViewer.tsx
'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { usePlataformas } from '@/hooks/usePlataformas';
import { normalizeContacto } from '@/lib/strings';

/* ========================================================================
 * Tipos
 * ===================================================================== */
type CuentaCompleta = {
  id: number;
  contacto: string;
  nombre?: string | null; // aplanado para UI
  plataforma_id: number;
  correo: string;
  contrasena?: string | null;
  proveedor?: string | null;
  fecha_compra?: string | null;       // 'YYYY-MM-DD'
  fecha_vencimiento?: string | null;  // 'YYYY-MM-DD'
  meses_pagados?: number | null;
  total_pagado?: number | string | null;
  total_pagado_proveedor?: number | string | null;
  total_ganado?: number | string | null;
  estado?: string | null;
  comentario?: string | null;
};

/* ========================================================================
 * Iconos (inline, sin dependencias)
 * ===================================================================== */
function PencilIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}
function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
function TrashIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

/* ========================================================================
 * Utils de fecha (tz-safe)
 * ===================================================================== */
const pad2 = (n: number) => String(n).padStart(2, '0');
const extractYMD = (s?: string | null) => {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
};
const toDateInput = (s?: string | null) => {
  const p = extractYMD(s);
  if (!p) return '';
  return `${p.y}-${pad2(p.m)}-${pad2(p.d)}`;
};
const fmtDate = (s?: string | null) => {
  const p = extractYMD(s);
  if (!p) return '—';
  return `${pad2(p.d)}/${pad2(p.m)}/${p.y}`;
};

/** Suma meses preservando fin de mes cuando aplica (31→30/28/29) */
function addMonthsSafe(isoYMD: string, months: number): string {
  const p = extractYMD(isoYMD);
  if (!p) return isoYMD;
  const y0 = p.y, m0 = p.m - 1, d0 = p.d; // JS: mes 0-11
  const base = new Date(Date.UTC(y0, m0, 1));
  const y1 = base.getUTCFullYear();
  const m1 = base.getUTCMonth() + months; // puede overflow
  const target = new Date(Date.UTC(y1, m1, 1));
  // último día del mes destino
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  const day = Math.min(d0, lastDay);
  const final = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), day));
  return `${final.getUTCFullYear()}-${pad2(final.getUTCMonth() + 1)}-${pad2(final.getUTCDate())}`;
}

/* ========================================================================
 * Otros utils
 * ===================================================================== */
const fmtMoney = (v?: number | string | null) => {
  if (v === '' || v == null || Number.isNaN(Number(v))) return '—';
  const num = Number(v);
  try {
    return `$ ${new Intl.NumberFormat(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(num)}`;
  } catch {
    return `$ ${num.toFixed(2)}`;
  }
};
function normalizeText(input: unknown): string {
  return String(input ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
const toNumOrNull = (val: any): number | null =>
  val == null || val === '' || Number.isNaN(Number(val)) ? null : Number(val);

const normalizeEmail = (s: string) => s?.trim().toLowerCase();

/* ---------- Normalizador robusto (aplana nombre/relación) ---------- */
function normalizeRow(r: any): CuentaCompleta {
  const nombre = r.nombre ?? r.usuarios?.nombre ?? null;
  return {
    id: Number(r.id),
    contacto: String(r.contacto ?? ''),
    nombre,
    plataforma_id: Number(r.plataforma_id),
    correo: String(r.correo ?? ''),
    contrasena: r.contrasena ?? null,
    proveedor: r.proveedor ?? null,
    fecha_compra: r.fecha_compra ?? null,
    fecha_vencimiento: r.fecha_vencimiento ?? null,
    meses_pagados: r.meses_pagados == null ? null : Number(r.meses_pagados),
    total_pagado: r.total_pagado == null ? null : Number(r.total_pagado),
    total_pagado_proveedor: r.total_pagado_proveedor == null ? null : Number(r.total_pagado_proveedor),
    total_ganado: r.total_ganado == null ? null : Number(r.total_ganado),
    estado: r.estado ?? null,
    comentario: r.comentario ?? null,
  };
}

/* ========================================================================
 * Helpers para Inventario (sin auto-archivar)
 * ===================================================================== */

/** ¿Ya está en inventario? */
async function existsInInventario(plataforma_id: number, correo: string): Promise<boolean> {
  const email = normalizeEmail(correo);
  try {
    const res = await fetch(`/api/inventario?q=${encodeURIComponent(email)}&plataforma_id=${plataforma_id}`, {
      cache: 'no-store',
    });
    if (!res.ok) return false;
    const data = await res.json();
    const arr: any[] = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
    return arr.some(
      (r) =>
        Number(r?.plataforma_id ?? r?.plataformaId) === plataforma_id &&
        String(r?.correo ?? '').toLowerCase() === email
    );
  } catch {
    return false;
  }
}

/** Crea en inventario si no existe (solo cuando el usuario lo elige). */
async function ensureInInventario(plataforma_id: number, correo: string, clave?: string | null) {
  const email = normalizeEmail(correo);
  try {
    if (await existsInInventario(plataforma_id, email)) return;
    await fetch('/api/inventario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plataforma_id,
        correo: email,
        clave: (clave && clave.trim().length > 0) ? clave : null,
      }),
    });
  } catch {
    // best-effort
  }
}

/* ========================================================================
 * Subcomponentes de tabla
 * ===================================================================== */
function Th({
  children,
  className = '',
  ...rest
}: React.ThHTMLAttributes<HTMLTableHeaderCellElement>) {
  return (
    <th
      {...rest}
      className={[
        'px-3 py-2 text-left text-xs uppercase tracking-wide text-neutral-400 font-medium',
        'whitespace-nowrap',
        'sticky top-0 z-10 bg-neutral-900/80 backdrop-blur supports-[backdrop-filter]:bg-neutral-900/60',
        className,
      ].join(' ')}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className = '',
  ...rest
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      {...rest}
      className={['px-3 py-2 text-sm text-neutral-100 whitespace-nowrap', className].join(' ')}
    >
      {children}
    </td>
  );
}

/* ========================================================================
 * Componente principal
 * ===================================================================== */
export default function CuentasCompletasViewer() {
  const { plataformas, loading: platLoading, error: platError } = usePlataformas();

  // filtros
  const [q, setQ] = useState('');
  const [plataformaId, setPlataformaId] = useState<number | ''>('');

  // datos + paginación por cursor
  const PAGE_SIZE = 200;
  const [rows, setRows] = useState<CuentaCompleta[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [initialLoaded, setInitialLoaded] = useState(false);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // edición inline
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Partial<CuentaCompleta>>({});
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  // eliminación individual
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const [deleteAction, setDeleteAction] = useState<'archive' | 'purge' | null>(null);

  // selección múltiple
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // eliminación masiva
  type BulkItem = {
    id: number;
    label?: string;
    plataforma_id: number;
    correo: string;
    contrasena: string | null;
  };
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkItems, setBulkItems] = useState<BulkItem[]>([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkSummary, setBulkSummary] = useState<{ total: number; archived: number; purged: number; failed: number } | null>(null);
  const [bulkErr, setBulkErr] = useState<string | null>(null);

  // Scroll principal
  const bodyScrollRef = useRef<HTMLDivElement>(null);

  // búsqueda server-side (toda la base)
  const [serverSearching, setServerSearching] = useState(false);
  const [serverSearchErr, setServerSearchErr] = useState<string | null>(null);
  const [serverResults, setServerResults] = useState<CuentaCompleta[]>([]);
  const SEARCH_LIMIT = 1000; // límite generoso y rápido

  const platformMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const p of plataformas) m.set(p.id, (p as any).nombre ?? String(p.id));
    return m;
  }, [plataformas]);

  /* ----------------------------- Fetch helpers ----------------------------- */
  const buildUrl = (cursor?: number | null) => {
    const sp = new URLSearchParams();
    sp.set('limit', String(PAGE_SIZE));
    if (cursor != null) sp.set('cursor', String(cursor));
    if (plataformaId !== '') sp.set('plataforma_id', String(plataformaId));
    return `/api/cuentascompletas?${sp.toString()}`;
  };

  const fetchFirstPage = useCallback(async () => {
    setLoading(true);
    setErr(null);
    setEditingId(null);
    setSaveErr(null);
    try {
      setRows([]);
      setNextCursor(null);
      setInitialLoaded(false);

      const res = await fetch(buildUrl(null), { cache: 'no-store' });
      if (!res.ok) throw new Error('No se pudieron cargar las cuentas');
      const j = await res.json();
      const arr: any[] = Array.isArray(j) ? j : Array.isArray(j?.items) ? j.items : [];
      const normalized = arr.map(normalizeRow);

      setRows(normalized);
      setInitialLoaded(true);
      setNextCursor(j?.nextCursor ?? (normalized.length === PAGE_SIZE ? normalized[normalized.length - 1]?.id ?? null : null));

      // limpiar resultados de búsqueda de servidor al refrescar dataset base
      setServerResults([]);
      setServerSearchErr(null);

      // limpiar selección
      setSelectedIds(new Set());
    } catch (e: any) {
      setErr(e?.message ?? 'Error al cargar');
      setRows([]);
      setNextCursor(null);
    } finally {
      setLoading(false);
    }
  }, [plataformaId]);

  const fetchNextPage = useCallback(async () => {
    if (nextCursor == null) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(buildUrl(nextCursor), { cache: 'no-store' });
      if (!res.ok) throw new Error('No se pudieron cargar más cuentas');
      const j = await res.json();
      const arr: any[] = Array.isArray(j) ? j : Array.isArray(j?.items) ? j.items : [];
      const normalized = arr.map(normalizeRow);

      setRows((prev) => [...prev, ...normalized]);
      setNextCursor(j?.nextCursor ?? (normalized.length === PAGE_SIZE ? normalized[normalized.length - 1]?.id ?? null : null));
    } catch (e: any) {
      setErr(e?.message ?? 'Error al cargar más');
    } finally {
      setLoading(false);
    }
  }, [nextCursor, plataformaId]);

  useEffect(() => {
    fetchFirstPage();
  }, [fetchFirstPage]);

  /* ----------------------------- Búsqueda (front) ----------------------------- */
  const indexedRows = useMemo(() => {
    return rows.map((r) => {
      const platformName = r.plataforma_id ? platformMap.get(r.plataforma_id) ?? String(r.plataforma_id) : '';
      const haystack = normalizeText(
        [
          r.nombre,
          r.contacto,
          r.correo,
          r.proveedor,
          r.estado,
          r.comentario,
          platformName,
          r.total_pagado,
          r.total_pagado_proveedor,
          r.total_ganado,
        ]
          .filter((v) => v !== undefined && v !== null && v !== '')
          .join(' | ')
      );
      return { row: r, haystack };
    });
  }, [rows, platformMap]);

  const localFiltered = useMemo(() => {
    const tokens = normalizeText(q).split(' ').filter(Boolean);
    if (!tokens.length) return indexedRows.map(({ row }) => row);
    return indexedRows.filter(({ haystack }) => tokens.every((t) => haystack.includes(t))).map(({ row }) => row);
  }, [indexedRows, q]);

  /* ----------------------------- Búsqueda (server) ----------------------------- */
  useEffect(() => {
    let handle: any;
    const doSearch = async () => {
      const query = normalizeText(q);
      if (!query) {
        setServerResults([]);
        setServerSearchErr(null);
        return;
      }
      setServerSearching(true);
      setServerSearchErr(null);
      try {
        // Endpoint sugerido: /api/cuentascompletas/search
        const sp = new URLSearchParams();
        sp.set('q', query);
        sp.set('limit', String(SEARCH_LIMIT));
        if (plataformaId !== '') sp.set('plataforma_id', String(plataformaId));

        // 1) intento canónico
        let res = await fetch(`/api/cuentascompletas/search?${sp.toString()}`, { cache: 'no-store' });

        // 2) fallback (por si el backend decidió usar el mismo endpoint con ?q=)
        if (!res.ok) {
          res = await fetch(`/api/cuentascompletas?${sp.toString()}`, { cache: 'no-store' });
        }

        if (!res.ok) throw new Error('No se pudo buscar en el servidor');

        const j = await res.json();
        const arr: any[] = Array.isArray(j) ? j : Array.isArray(j?.items) ? j.items : [];
        const normalized = arr.map(normalizeRow);

        setServerResults(normalized);
      } catch (e: any) {
        setServerResults([]);
        setServerSearchErr(e?.message ?? 'Error de búsqueda');
      } finally {
        setServerSearching(false);
      }
    };

    // debounce
    handle = setTimeout(doSearch, 350);
    return () => clearTimeout(handle);
  }, [q, plataformaId]);

  // Unión de resultados: prioriza locales y agrega server, deduplicando por id
  const viewRows = useMemo(() => {
    if (!q) return localFiltered;
    const map = new Map<number, CuentaCompleta>();
    for (const r of localFiltered) map.set(r.id, r);
    for (const r of serverResults) if (!map.has(r.id)) map.set(r.id, r);
    return Array.from(map.values());
  }, [localFiltered, serverResults, q]);

  /* ------------------------------ Edit helpers ---------------------------- */
  const applyGanadoRule = (draftIn: Partial<CuentaCompleta>): Partial<CuentaCompleta> => {
    const tp = toNumOrNull(draftIn.total_pagado);
    const tpp = toNumOrNull(draftIn.total_pagado_proveedor);
    const next: Partial<CuentaCompleta> = { ...draftIn };
    if (tp == null) return next;
    const newGan = tpp == null ? tp : tp - tpp;
    next.total_ganado = String(newGan) as any;
    return next;
  };

  const maybeAutoVencimiento = (dIn: Partial<CuentaCompleta>): Partial<CuentaCompleta> => {
    const meses = toNumOrNull(dIn.meses_pagados as any);
    const compra = (dIn.fecha_compra as string) || '';
    const next = { ...dIn };
    if (compra && meses && meses > 0) {
      next.fecha_vencimiento = addMonthsSafe(compra, meses);
    }
    return next;
  };

  const beginEdit = (row: CuentaCompleta) => {
    setEditingId(row.id);
    setSaveErr(null);
    setDraft({
      ...row,
      fecha_compra: toDateInput(row.fecha_compra),
      fecha_vencimiento: toDateInput(row.fecha_vencimiento),
      total_pagado: row.total_pagado == null || row.total_pagado === '' ? '' : String(row.total_pagado),
      total_pagado_proveedor:
        row.total_pagado_proveedor == null || row.total_pagado_proveedor === '' ? '' : String(row.total_pagado_proveedor),
      total_ganado: row.total_ganado == null || row.total_ganado === '' ? '' : String(row.total_ganado),
      contrasena: row.contrasena ?? '',
      comentario: row.comentario ?? '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft({});
    setSaveErr(null);
  };

  // Recalcular automáticamente total_ganado
  useEffect(() => {
    if (editingId == null) return;
    setDraft((prev) => {
      const tp = toNumOrNull(prev.total_pagado);
      if (tp == null) return prev;
      const tpp = toNumOrNull(prev.total_pagado_proveedor);
      const newGan = tpp == null ? tp : tp - tpp;
      const prevGan = toNumOrNull(prev.total_ganado);
      if (prevGan === newGan) return prev;
      return { ...prev, total_ganado: String(newGan) as any };
    });
  }, [editingId, draft.total_pagado, draft.total_pagado_proveedor]);

  // Recalcular automáticamente fecha_vencimiento
  useEffect(() => {
    if (editingId == null) return;
    setDraft((prev) => {
      const meses = toNumOrNull(prev.meses_pagados as any);
      const compra = (prev.fecha_compra as string) || '';
      if (!compra || !meses || meses <= 0) return prev;
      const nuevo = addMonthsSafe(compra, meses);
      if (prev.fecha_vencimiento === nuevo) return prev;
      return { ...prev, fecha_vencimiento: nuevo };
    });
  }, [editingId, draft.fecha_compra, draft.meses_pagados]);

  const saveEdit = useCallback(async () => {
    if (editingId == null || saving) return;
    setSaving(true);
    setSaveErr(null);
    try {
      const current = rows.find((r) => r.id === editingId);

      const nombreVal = ((draft.nombre ?? '') as string) || null;
      const comentarioVal = ((draft.comentario ?? '') as string) || null;

      const totalPagado = toNumOrNull(draft.total_pagado);
      const totalProv   = toNumOrNull(draft.total_pagado_proveedor);
      const totalGanado = totalPagado == null ? null : (totalProv == null ? totalPagado : totalPagado - totalProv);

      const finalDraft = maybeAutoVencimiento(draft);

      const payload: Record<string, any> = {
        contacto: (finalDraft.contacto ?? '').toString(),
        nombre: nombreVal,
        correo: (finalDraft.correo ?? '').toString(),
        proveedor: (finalDraft.proveedor ?? '') || null,
        meses_pagados:
          finalDraft.meses_pagados == null || (finalDraft.meses_pagados as any) === ''
            ? null
            : Number(finalDraft.meses_pagados),
        fecha_compra: (finalDraft.fecha_compra as string) || null,
        fecha_vencimiento: (finalDraft.fecha_vencimiento as string) || null,
        total_pagado: totalPagado,
        total_pagado_proveedor: totalProv,
        pago_total_proveedor: totalProv,
        pagado_proveedor: totalProv,
        total_ganado: totalGanado,
        ganado: totalGanado,
        estado: finalDraft.estado == null || finalDraft.estado === '' ? null : String(finalDraft.estado),
        comentario: comentarioVal,
      };

      // Contraseña (si cambió)
      const rawPwd = (finalDraft.contrasena as string) ?? '';
      const originalPwd = current?.contrasena ?? '';
      if (rawPwd !== originalPwd) {
        if (rawPwd.trim() === '') {
          payload.contrasena = null;
        } else if (rawPwd.length < 7) {
          setSaveErr('La clave debe tener al menos 7 caracteres (o déjala vacía para no cambiarla).');
          setSaving(false);
          return;
        } else {
          payload.contrasena = rawPwd;
        }
      }

      const res = await fetch(`/api/cuentascompletas/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => '');
        throw new Error(msg || 'No se pudo guardar');
      }

      let updated: any = {};
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        updated = await res.json();
      } else {
        updated = payload; // optimistic
      }

      setRows((rs) =>
        rs.map((r) => {
          if (r.id !== editingId) return r;
          const mergedNorm = normalizeRow({ ...r, ...updated });
          if ((updated as any)?.plataforma_id == null) mergedNorm.plataforma_id = r.plataforma_id;
          if ((updated as any)?.nombre === undefined && mergedNorm.nombre == null) mergedNorm.nombre = nombreVal;
          if ((updated as any)?.comentario === undefined && mergedNorm.comentario == null) mergedNorm.comentario = comentarioVal;
          return mergedNorm;
        })
      );

      cancelEdit();
    } catch (e: any) {
      setSaveErr(e?.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }, [editingId, saving, draft, rows]);

  // Guardado con Enter global; en textarea Ctrl/Cmd+Enter
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editingId == null || saving) return;
      if (e.key !== 'Enter') return;
      const el = document.activeElement as HTMLElement | null;
      const isTextarea = (el?.tagName || '').toLowerCase() === 'textarea';
      if (isTextarea) {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          saveEdit();
        }
        return;
      }
      e.preventDefault();
      saveEdit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editingId, saving, saveEdit]);

  // Navegación: flechas + Shift+rueda
  const handleWheelHorizontal: React.WheelEventHandler<HTMLDivElement> = (e) => {
    if (!e.shiftKey) return;
    e.preventDefault();
    e.currentTarget.scrollLeft += e.deltaY;
  };
  const onBodyKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    const el = bodyScrollRef.current;
    if (!el) return;
    const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    const stepX = 80;
    const stepY = 40;
    switch (e.key) {
      case 'ArrowLeft': e.preventDefault(); el.scrollLeft -= stepX; break;
      case 'ArrowRight': e.preventDefault(); el.scrollLeft += stepX; break;
      case 'ArrowUp': e.preventDefault(); el.scrollTop -= stepY; break;
      case 'ArrowDown': e.preventDefault(); el.scrollTop += stepY; break;
      case 'Home': e.preventDefault(); el.scrollLeft = 0; break;
      case 'End': e.preventDefault(); el.scrollLeft = el.scrollWidth; break;
      default: break;
    }
  };

  const tblInput =
    'w-full rounded-md px-2 py-1 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500';

  /* --------------------------------- Eliminar (individual) -------------------------------- */
  const openDelete = (id: number) => {
    setDeleteErr(null);
    setDeleteAction(null);
    setDeleteTargetId(id);
  };
  const closeDelete = () => {
    if (deleting) return;
    setDeleteTargetId(null);
    setDeleteErr(null);
    setDeleteAction(null);
  };

  // El borrado ahora depende de la opción elegida en el modal
  const doDelete = async (archive: boolean) => {
    if (deleteTargetId == null) return;
    try {
      setDeleting(true);
      setDeleteErr(null);
      setDeleteAction(archive ? 'archive' : 'purge');

      // Datos del registro (para posible inventario)
      const victim = rows.find((r) => r.id === deleteTargetId) || null;
      if (!victim) throw new Error('Registro no encontrado');

      const victimPlataforma = victim.plataforma_id;
      const victimCorreo = normalizeEmail(victim.correo);
      const victimClave = victim.contrasena ?? null;

      // Solo si el usuario eligió "Enviar al inventario"
      if (archive && victimPlataforma != null && victimCorreo) {
        await ensureInInventario(victimPlataforma, victimCorreo, victimClave);
      }

      // Borrado definitivo de cuentascompletas (con cascade)
      const res = await fetch(`/api/cuentascompletas/${deleteTargetId}?cascade=1`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? 'No se pudo eliminar');
      }

      setRows((rs) => rs.filter((r) => r.id !== deleteTargetId));
      // limpiar selección si estaba marcada
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteTargetId);
        return next;
      });
      closeDelete();
    } catch (e: any) {
      setDeleteErr(e?.message ?? 'Error al eliminar');
    } finally {
      setDeleting(false);
      setDeleteAction(null);
    }
  };

  /* ------------------------------ Selección múltiple ----------------------------- */
  const isRowSelected = (id: number) => selectedIds.has(id);
  const toggleRow = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };
  const allVisibleIds = viewRows.map((r) => r.id);
  const allVisibleSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIds.has(id));
  const someVisibleSelected = allVisibleIds.some((id) => selectedIds.has(id));
  const toggleAllVisible = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        for (const id of allVisibleIds) next.add(id);
      } else {
        for (const id of allVisibleIds) next.delete(id);
      }
      return next;
    });
  };

  /* ------------------------------ Eliminación MASIVA ----------------------------- */
  const openBulk = (ids: number[]) => {
    const unique = Array.from(new Set(ids));
    if (unique.length === 0) return;

    const items: BulkItem[] = [];
    for (const id of unique) {
      const r = rows.find((x) => x.id === id);
      if (!r) continue;
      items.push({
        id: r.id,
        label: `${r.correo} / ${r.nombre ?? r.contacto ?? ''}`.trim(),
        plataforma_id: r.plataforma_id,
        correo: normalizeEmail(r.correo),
        contrasena: r.contrasena ?? null,
      });
    }
    setBulkItems(items);
    setBulkSummary(null);
    setBulkErr(null);
    setBulkProgress(0);
    setBulkProcessing(false);
    setBulkOpen(true);
  };

  const openBulkSelected = () => openBulk(Array.from(selectedIds));
  const openBulkAllView = () => openBulk(viewRows.map((r) => r.id));

  const runBulk = async (preferArchive: boolean) => {
    if (!bulkOpen || bulkItems.length === 0) return;
    setBulkProcessing(true);
    setBulkErr(null);
    setBulkProgress(0);
    const total = bulkItems.length;
    let archived = 0, purged = 0, failed = 0;

    for (let i = 0; i < bulkItems.length; i++) {
      const it = bulkItems[i];
      try {
        if (preferArchive) {
          await ensureInInventario(it.plataforma_id, it.correo, it.contrasena);
        }
        const res = await fetch(`/api/cuentascompletas/${it.id}?cascade=1`, { method: 'DELETE' });
        if (!res.ok) {
          failed++;
        } else {
          if (preferArchive) archived++; else purged++;
          // quitar de UI y selección
          setRows((rs) => rs.filter((r) => r.id !== it.id));
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(it.id);
            return next;
          });
        }
      } catch {
        failed++;
      } finally {
        setBulkProgress(Math.round(((i + 1) / total) * 100));
      }
    }

    setBulkSummary({ total, archived, purged, failed });
    setBulkProcessing(false);
  };

  const selectedCount = selectedIds.size;

  /* --------------------------------- Render -------------------------------- */
  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="grid gap-3 sm:grid-cols-[1fr_260px_auto_auto]">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, correo, contacto, proveedor, estado, comentario, totales… (Shift+rueda = scroll horizontal)"
          className="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
        />

        <div>
          <label className="block text-sm mb-1 text-neutral-300">Plataforma (server)</label>
          <select
            className="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500 [&>option]:bg-neutral-900 [&>option]:text-neutral-100"
            value={plataformaId === '' ? '' : String(plataformaId)}
            onChange={(e) => setPlataformaId(e.target.value ? Number(e.target.value) : '')}
            disabled={platLoading || !!platError}
          >
            <option value="">Todas</option>
            {plataformas.map((p) => (
              <option key={p.id} value={p.id}>
                {(p as any).nombre ?? p.id}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={fetchFirstPage}
          className="h-10 self-end rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500 hover:bg-neutral-800"
        >
          Aplicar filtros
        </button>

        <button
          type="button"
          onClick={fetchFirstPage}
          className="h-10 self-end rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500 hover:bg-neutral-800"
        >
          Refrescar
        </button>
      </div>

      {/* Barra de acciones masivas */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-sm text-neutral-300">
          Seleccionados: <span className="font-semibold">{selectedCount}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openBulkSelected}
            disabled={selectedCount === 0 || loading}
            className="rounded-lg border border-red-700 bg-red-800/40 px-3 py-1.5 text-red-100 hover:bg-red-800/60 disabled:opacity-50"
            title="Enviar al inventario (si lo eliges) y eliminar / o eliminar sin archivar"
          >
            Eliminar seleccionados
          </button>

          <button
            type="button"
            onClick={openBulkAllView}
            disabled={viewRows.length === 0 || loading}
            className="rounded-lg border border-red-700 bg-red-800/40 px-3 py-1.5 text-red-100 hover:bg-red-800/60 disabled:opacity-50"
            title="Abrir modal para eliminar todo lo que aparece en la vista"
          >
            Eliminar todo (vista)
          </button>

          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            disabled={selectedCount === 0}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-neutral-100 hover:bg-neutral-800 disabled:opacity-50"
            title="Limpiar selección"
          >
            Limpiar selección
          </button>
        </div>
      </div>

      {/* Estado */}
      {loading && <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4 text-sm text-neutral-300">Cargando cuentas…</div>}
      {err && <div className="rounded-xl border border-red-800/50 bg-red-950/30 p-4 text-sm text-red-200">Error: {err}</div>}

      {/* Aviso búsqueda server */}
      {q && (
        <div className="text-xs text-neutral-400">
          {serverSearching ? 'Buscando en el servidor…' : serverSearchErr ? `Búsqueda local activa (error server: ${serverSearchErr})` : 'Combinando resultados locales + servidor'}
        </div>
      )}

      {/* Tabla */}
      {!loading && !err && viewRows.length > 0 && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 overflow-hidden">
          <div
            ref={bodyScrollRef}
            className="custom-scroll overflow-x-auto max-h-[70vh] overflow-y-auto focus:outline-none"
            onWheel={handleWheelHorizontal}
            onKeyDown={onBodyKeyDown}
            tabIndex={0}
          >
            <table className="min-w-[2250px] w-full table-fixed">
              <thead>
                <tr className="border-b border-neutral-800">
                  {/* Selección */}
                  <Th className="w-10 text-center">
                    <input
                      type="checkbox"
                      aria-label="Seleccionar todo"
                      checked={allVisibleSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = !allVisibleSelected && someVisibleSelected;
                      }}
                      onChange={(e) => toggleAllVisible(e.target.checked)}
                    />
                  </Th>

                  <Th className="w-28 text-center">Acciones</Th>
                  <Th className="w-48">Plataforma</Th>
                  <Th className="w-40">Contacto</Th>
                  <Th className="w-40">Nombre</Th>
                  <Th className="w-60">Correo</Th>
                  <Th className="w-40">Clave</Th>
                  <Th className="w-36 text-right">Total</Th>
                  <Th className="w-40 text-right">Pagado prov.</Th>
                  <Th className="w-36 text-right">Ganado</Th>
                  <Th className="w-28">Meses</Th>
                  <Th className="w-36">Compra</Th>
                  <Th className="w-36">Vence</Th>
                  <Th className="w-32">Estado</Th>
                  <Th className="w-40">Proveedor</Th>
                  <Th className="w-[520px] min-w-[380px]">Comentario</Th>
                </tr>
              </thead>
              <tbody>
                {viewRows.map((row, idx) => {
                  const isEditing = editingId === row.id;
                  const checked = isRowSelected(row.id);

                  return (
                    <tr
                      key={row.id}
                      onDoubleClick={(e) => {
                        if (isEditing) return;
                        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
                        if (['button', 'a', 'input', 'textarea', 'select', 'svg', 'path', 'label'].includes(tag || '')) return;
                        beginEdit(row);
                      }}
                      className={`border-b border-neutral-900 ${idx % 2 === 0 ? 'bg-neutral-900/30' : 'bg-transparent'} hover:bg-neutral-800/40 ${!isEditing ? 'cursor-pointer' : ''}`}
                    >
                      {/* Checkbox selección */}
                      <Td className="text-center">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => toggleRow(row.id, e.target.checked)}
                          aria-label={`Seleccionar fila ${row.id}`}
                        />
                      </Td>

                      {/* Acciones */}
                      <Td className="text-center">
                        {!isEditing ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => beginEdit(row)}
                              className="inline-flex items-center justify-center rounded-md p-2 text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-600"
                              aria-label={`Editar fila ${row.id}`}
                              title={`Editar fila ${row.id}`}
                            >
                              <PencilIcon />
                            </button>
                            <button
                              type="button"
                              onClick={() => openDelete(row.id)}
                              className="inline-flex items-center justify-center rounded-md p-2 text-red-300 hover:bg-red-800/20 hover:text-red-100 focus:outline-none focus:ring-2 focus:ring-red-600"
                              aria-label={`Eliminar fila ${row.id}`}
                              title={`Eliminar fila ${row.id}`}
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={saveEdit}
                              disabled={saving}
                              className="inline-flex items-center justify-center rounded-md p-2 text-emerald-200 hover:bg-emerald-800/30 hover:text-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:opacity-50"
                              title="Guardar cambios (Enter o Ctrl/Cmd+Enter en comentario)"
                              aria-label="Guardar"
                            >
                              <CheckIcon />
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              disabled={saving}
                              className="inline-flex items-center justify-center rounded-md p-2 text-red-200 hover:bg-red-800/30 hover:text-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 disabled:opacity-50"
                              title="Cancelar"
                              aria-label="Cancelar"
                            >
                              <XIcon />
                            </button>
                          </div>
                        )}
                      </Td>

                      {/* Plataforma (no editable) */}
                      <Td>{platformMap.get(row.plataforma_id) ?? row.plataforma_id}</Td>

                      {/* Contacto */}
                      <Td title={row.contacto} className="font-medium">
                        {!isEditing ? (
                          row.contacto
                        ) : (
                          <input
                            className={tblInput}
                            value={(draft.contacto as string) ?? row.contacto}
                            onChange={(e) => setDraft((d) => ({ ...d, contacto: e.target.value }))}
                          />
                        )}
                      </Td>

                      {/* Nombre */}
                      <Td title={row.nombre ?? ''}>
                        {!isEditing ? (
                          row.nombre ?? '—'
                        ) : (
                          <input
                            className={tblInput}
                            value={(draft.nombre as string) ?? row.nombre ?? ''}
                            onChange={(e) => setDraft((d) => ({ ...d, nombre: e.target.value }))}
                          />
                        )}
                      </Td>

                      {/* Correo */}
                      <Td title={row.correo}>
                        {!isEditing ? (
                          row.correo
                        ) : (
                          <input
                            type="email"
                            className={tblInput}
                            value={(draft.correo as string) ?? row.correo}
                            onChange={(e) => setDraft((d) => ({ ...d, correo: e.target.value }))}
                          />
                        )}
                      </Td>

                      {/* Clave */}
                      <Td title={row.contrasena ?? ''}>
                        {!isEditing ? (
                          row.contrasena ?? '—'
                        ) : (
                          <input
                            type="text"
                            className={tblInput}
                            value={(draft.contrasena as string) ?? row.contrasena ?? ''}
                            onChange={(e) => setDraft((d) => ({ ...d, contrasena: e.target.value }))}
                            placeholder="Opcional"
                          />
                        )}
                      </Td>

                      {/* Total (cliente) */}
                      <Td className="text-right tabular-nums">
                        {!isEditing ? (
                          fmtMoney(row.total_pagado)
                        ) : (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className={`${tblInput} text-right tabular-nums`}
                            value={draft.total_pagado == null ? '' : String(draft.total_pagado)}
                            onChange={(e) => setDraft((d) => applyGanadoRule({ ...d, total_pagado: e.target.value }))}
                          />
                        )}
                      </Td>

                      {/* Pagado proveedor */}
                      <Td className="text-right tabular-nums">
                        {!isEditing ? (
                          fmtMoney(row.total_pagado_proveedor)
                        ) : (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className={`${tblInput} text-right tabular-nums`}
                            value={draft.total_pagado_proveedor == null ? '' : String(draft.total_pagado_proveedor)}
                            onChange={(e) =>
                              setDraft((d) => applyGanadoRule({ ...d, total_pagado_proveedor: e.target.value }))
                            }
                          />
                        )}
                      </Td>

                      {/* Ganado */}
                      <Td className="text-right tabular-nums">
                        {!isEditing ? (
                          fmtMoney(row.total_ganado)
                        ) : (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className={`${tblInput} text-right tabular-nums`}
                            value={draft.total_ganado == null ? '' : String(draft.total_ganado)}
                            onChange={(e) => setDraft((d) => ({ ...d, total_ganado: e.target.value }))}
                          />
                        )}
                      </Td>

                      {/* Meses */}
                      <Td>
                        {!isEditing ? (
                          row.meses_pagados == null ? '—' : String(row.meses_pagados)
                        ) : (
                          <input
                            type="number"
                            min={0}
                            className={tblInput}
                            value={draft.meses_pagados == null || (draft.meses_pagados as any) === '' ? '' : String(draft.meses_pagados)}
                            onChange={(e) =>
                              setDraft((d) =>
                                maybeAutoVencimiento({
                                  ...d,
                                  meses_pagados: e.target.value === '' ? ('' as any) : Number(e.target.value),
                                })
                              )
                            }
                          />
                        )}
                      </Td>

                      {/* Compra */}
                      <Td>
                        {!isEditing ? (
                          fmtDate(row.fecha_compra)
                        ) : (
                          <input
                            type="date"
                            className={tblInput}
                            value={(draft.fecha_compra as string) ?? toDateInput(row.fecha_compra)}
                            onChange={(e) => setDraft((d) => maybeAutoVencimiento({ ...d, fecha_compra: e.target.value }))}
                          />
                        )}
                      </Td>

                      {/* Vence */}
                      <Td>
                        {!isEditing ? (
                          fmtDate(row.fecha_vencimiento)
                        ) : (
                          <input
                            type="date"
                            className={tblInput}
                            value={(draft.fecha_vencimiento as string) ?? toDateInput(row.fecha_vencimiento)}
                            onChange={(e) => setDraft((d) => ({ ...d, fecha_vencimiento: e.target.value }))}
                          />
                        )}
                      </Td>

                      {/* Estado */}
                      <Td>
                        {!isEditing ? (
                          row.estado ?? '—'
                        ) : (
                          <input
                            className={tblInput}
                            value={(draft.estado as string) ?? row.estado ?? ''}
                            onChange={(e) => setDraft((d) => ({ ...d, estado: e.target.value }))}
                          />
                        )}
                      </Td>

                      {/* Proveedor */}
                      <Td title={row.proveedor ?? ''}>
                        {!isEditing ? (
                          row.proveedor ?? '—'
                        ) : (
                          <input
                            className={tblInput}
                            value={(draft.proveedor as string) ?? row.proveedor ?? ''}
                            onChange={(e) => setDraft((d) => ({ ...d, proveedor: e.target.value }))}
                          />
                        )}
                      </Td>

                      {/* Comentario */}
                      <Td title={row.comentario ?? ''} className="align-top !whitespace-pre-wrap break-words" onDoubleClick={() => beginEdit(row)}>
                        {!isEditing ? (
                          <div className="whitespace-pre-wrap break-words">{row.comentario ?? '—'}</div>
                        ) : (
                          <textarea
                            className={`${tblInput} resize-y whitespace-pre-wrap`}
                            rows={3}
                            value={(draft.comentario as string) ?? row.comentario ?? ''}
                            onChange={(e) => setDraft((d) => ({ ...d, comentario: e.target.value }))}
                            onKeyDown={(e) => {
                              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                e.preventDefault();
                                saveEdit();
                              }
                            }}
                            placeholder="Enter = salto • Ctrl/Cmd+Enter = guardar"
                          />
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer / Paginación */}
          <div className="flex items-center justify-between gap-3 p-3 border-t border-neutral-800">
            <div className="text-sm text-neutral-300">
              {initialLoaded ? `${rows.length} fila(s) cargadas` : '—'}
              {plataformaId !== '' && <> · Plataforma {String(plataformaId)}</>}
              {q && <> · {serverSearching ? 'buscando…' : `+${serverResults.length} resultado(s) de servidor`}</>}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchFirstPage}
                className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-neutral-100 hover:bg-neutral-800"
                disabled={loading}
              >
                Refrescar
              </button>
              <button
                type="button"
                onClick={fetchNextPage}
                className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-neutral-100 hover:bg-neutral-800 disabled:opacity-50"
                disabled={loading || nextCursor == null}
                title={nextCursor == null ? 'No hay más' : `Seguir desde id ${nextCursor}`}
              >
                {loading ? 'Cargando…' : nextCursor == null ? 'No hay más' : 'Cargar más'}
              </button>
            </div>
          </div>

          {saveErr && <div className="m-3 rounded-lg border border-red-800/50 bg-red-950/30 p-3 text-sm text-red-200">{saveErr}</div>}
        </div>
      )}

      {!loading && !err && viewRows.length === 0 && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4 text-sm text-neutral-300">
          No se encontraron resultados con los filtros actuales.
        </div>
      )}

      {/* Modal de eliminación con dos opciones (individual) */}
      {deleteTargetId != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeDelete}>
          <div
            className="w-full max-w-md rounded-xl border border-neutral-700 bg-neutral-900 p-4 text-neutral-100 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="modal-title"
            aria-describedby="modal-desc"
          >
            <h4 id="modal-title" className="text-lg font-semibold mb-2">¿Qué deseas hacer con la cuenta #{deleteTargetId}?</h4>
            <p id="modal-desc" className="text-sm text-neutral-300">
              Elige <span className="font-semibold">Enviar al inventario</span> para archivarla (se guardará correo y, si existe, la clave)
              y luego se eliminará; o <span className="font-semibold">Eliminar definitivamente</span> para borrar sin archivar.
            </p>

            {deleteErr && (
              <div className="mt-3 rounded-lg border border-red-800/50 bg-red-950/30 p-2 text-sm text-red-200">{deleteErr}</div>
            )}

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => doDelete(true)}
                disabled={deleting}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-700 bg-emerald-800/40 px-3 py-2 hover:bg-emerald-800/60 focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:opacity-60"
                title="Crear/asegurar inventario y eliminar"
              >
                {deleting && deleteAction === 'archive' ? 'Enviando…' : 'Enviar al inventario'}
              </button>
              <button
                type="button"
                onClick={() => doDelete(false)}
                disabled={deleting}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-700 bg-red-800/40 px-3 py-2 hover:bg-red-800/60 focus:outline-none focus:ring-2 focus:ring-red-600 disabled:opacity-60"
                title="Eliminar sin archivar"
              >
                {deleting && deleteAction === 'purge' ? 'Eliminando…' : 'Eliminar definitivamente'}
              </button>
            </div>

            <div className="mt-3 flex items-center justify-end">
              <button
                type="button"
                onClick={closeDelete}
                disabled={deleting}
                className="rounded-lg border border-neutral-600 px-3 py-2 hover:bg-neutral-800 disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal eliminación MASIVA */}
      {bulkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !bulkProcessing && setBulkOpen(false)}>
          <div
            className="w-full max-w-xl rounded-xl border border-neutral-700 bg-neutral-900 p-4 text-neutral-100 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="bulk-title"
            aria-describedby="bulk-desc"
          >
            <h4 id="bulk-title" className="text-lg font-semibold mb-2">Eliminar {bulkItems.length} cuentas</h4>

            <p id="bulk-desc" className="text-sm text-neutral-300">
              Puedes <strong>enviar al inventario</strong> cada cuenta (correo + clave si hay) y luego eliminarla,
              o bien <strong>eliminar definitivamente</strong> sin archivar.
            </p>

            {bulkErr && (
              <div className="mt-3 rounded-lg border border-red-800/50 bg-red-950/30 p-2 text-sm text-red-200">{bulkErr}</div>
            )}

            {bulkSummary && (
              <div className="mt-3 rounded-lg border border-neutral-700 bg-neutral-800/40 p-2 text-sm">
                <div>Total procesadas: {bulkSummary.total}</div>
                <div>Enviadas a inventario: {bulkSummary.archived}</div>
                <div>Eliminadas definitivamente: {bulkSummary.purged}</div>
                <div>Fallidas: {bulkSummary.failed}</div>
              </div>
            )}

            {bulkProcessing && (
              <div className="mt-3">
                <div className="h-2 w-full rounded bg-neutral-800 overflow-hidden">
                  <div className="h-2 bg-emerald-600" style={{ width: `${bulkProgress}%` }} />
                </div>
                <div className="mt-1 text-xs text-neutral-400">{bulkProgress}%</div>
              </div>
            )}

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => runBulk(true)}
                disabled={bulkProcessing || bulkItems.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-700 bg-emerald-800/40 px-3 py-2 hover:bg-emerald-800/60 focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:opacity-60"
                title="Enviar al inventario y eliminar"
              >
                {bulkProcessing ? 'Procesando…' : 'Inventario + Eliminar'}
              </button>

              <button
                type="button"
                onClick={() => runBulk(false)}
                disabled={bulkProcessing || bulkItems.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-700 bg-red-800/40 px-3 py-2 hover:bg-red-800/60 focus:outline-none focus:ring-2 focus:ring-red-600 disabled:opacity-60"
                title="Eliminar todo definitivamente"
              >
                {bulkProcessing ? 'Procesando…' : 'Eliminar definitivamente'}
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
          </div>
        </div>
      )}

      {/* Scrollbar discreto */}
      <style jsx global>{`
        .custom-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(120,120,120,0.35) transparent;
        }
        .custom-scroll::-webkit-scrollbar { height: 8px; width: 8px; }
        .custom-scroll::-webkit-scrollbar-thumb {
          background-color: rgba(120,120,120,0.35);
          border-radius: 9999px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll:hover::-webkit-scrollbar-thumb { background-color: rgba(120,120,120,0.5); }
      `}</style>
    </div>
  );
}
