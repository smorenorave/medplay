'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { usePlataformas } from '@/hooks/usePlataformas';
import { lowNoAccents } from '@/lib/strings';

/* ===================== Iconos ===================== */
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

/* ===================== Tipos ===================== */
type Pantalla = {
  id: number;
  cuenta_id: number | null;
  contacto: string;
  nro_pantalla: string;
  fecha_compra?: string | null;
  fecha_vencimiento?: string | null;
  meses_pagados?: number | null;

  total_pagado?: number | string | null;
  total_pagado_proveedor?: number | string | null;
  total_ganado?: number | string | null;

  estado?: string | null;
  comentario?: string | null;
  proveedor?: string | null;

  // derivados (ya vienen del backend)
  nombre?: string | null;
  correo?: string | null;
  plataforma_id?: number | null;
  contrasena?: string | null;
};

type GetRes = { items: Pantalla[]; nextCursor: number | null };

/* ===================== Utils fecha/dinero ===================== */
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

/** Suma meses conservando fin de mes cuando aplica */
function addMonthsSafe(isoYMD: string, months: number): string {
  const p = extractYMD(isoYMD);
  if (!p) return isoYMD;
  const y0 = p.y, m0 = p.m - 1, d0 = p.d;
  const base = new Date(Date.UTC(y0, m0, 1));
  const y1 = base.getUTCFullYear();
  const m1 = base.getUTCMonth() + months;
  const target = new Date(Date.UTC(y1, m1, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  const day = Math.min(d0, lastDay);
  const final = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), day));
  return `${final.getUTCFullYear()}-${pad2(final.getUTCMonth() + 1)}-${pad2(final.getUTCDate())}`;
}

const fmtMoney = (v?: number | string | null) => {
  if (v === '' || v == null || Number.isNaN(Number(v))) return '—';
  const num = Number(v);
  try {
    return `$ ${new Intl.NumberFormat(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(num)}`;
  } catch {
    return `$ ${num.toFixed(2)}`;
  }
};
const toNumOrNull = (val: any): number | null =>
  val == null || val === '' || Number.isNaN(Number(val)) ? null : Number(val);

/* ===================== Normalización de fila ===================== */
function normalizeRow(r: any): Pantalla {
  const n = (x: any) => (x == null || x === '' || Number.isNaN(Number(x)) ? null : Number(x));
  return {
    ...r,
    id: Number(r.id),
    cuenta_id: n(r.cuenta_id),
    plataforma_id: n(r.plataforma_id),
    total_pagado: r.total_pagado == null ? null : Number(r.total_pagado),
    total_pagado_proveedor: r.total_pagado_proveedor == null ? null : Number(r.total_pagado_proveedor),
    total_ganado: r.total_ganado == null ? null : Number(r.total_ganado),
  } as Pantalla;
}

/* ===================== Helpers Inventario / Uso ===================== */
const normEmail = (s?: string | null) => (s ?? '').trim().toLowerCase();

/** ¿Existe ya en inventario? (idempotencia del POST) */
async function existsInInventario(plataforma_id: number | null | undefined, correo: string): Promise<boolean> {
  const email = normEmail(correo);
  try {
    const base = `/api/inventario`;
    const url = plataforma_id
      ? `${base}?q=${encodeURIComponent(email)}&plataforma_id=${plataforma_id}`
      : `${base}?q=${encodeURIComponent(email)}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return false;
    const data = await res.json();
    const arr: any[] = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
    return arr.some((r) => String(r?.correo ?? '').toLowerCase() === email);
  } catch {
    return false;
  }
}

/** Crea en inventario si no existe; si no hay plataforma, lo crea solo con correo */
async function ensureInInventario(plataforma_id?: number | null, correo?: string | null, clave?: string | null) {
  if (!correo) return;
  const email = normEmail(correo);
  try {
    if (await existsInInventario(plataforma_id, email)) return;
    const body: any = { correo: email };
    if (plataforma_id != null) body.plataforma_id = plataforma_id;
    if (clave && clave.trim().length > 0) body.clave = clave;

    await fetch('/api/inventario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch { /* best-effort */ }
}

/** Helpers para listar por correo SOLO en /api/pantallas */
async function fetchListSafe(urls: string[]): Promise<any[]> {
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) continue;
      const data = await res.json();
      return Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
    } catch { /* next */ }
  }
  return [];
}

async function countPantallasByEmail(correo: string): Promise<number> {
  const email = normEmail(correo);
  const base = `/api/pantallas`;
  const urls = [
    `${base}?correo=${encodeURIComponent(email)}`,
    `${base}?q=${encodeURIComponent(email)}`,
    `${base}?limit=5000`,
  ];
  const arr = await fetchListSafe(urls);
  return arr.filter((r) => String(r?.correo ?? '').toLowerCase() === email).length;
}

/** Resuelve correo/plataforma/clave desde el backend si no está en la fila */
async function resolveVictimContextFromAPI(id: number): Promise<{ plataforma_id?: number | null; correo?: string | null; contrasena?: string | null } | null> {
  try {
    const res = await fetch(`/api/pantallas/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const j = await res.json();
    const r = (j?.item ?? j) || {};
    const pid = r.plataforma_id == null || Number.isNaN(Number(r.plataforma_id)) ? null : Number(r.plataforma_id);
    const correo = typeof r.correo === 'string' ? r.correo : null;
    const contrasena = typeof r.contrasena === 'string' ? r.contrasena : null;
    return { plataforma_id: pid, correo, contrasena };
  } catch {
    return null;
  }
}

/* ===================== NUEVOS HELPERS para cuentascompartidas ===================== */
async function findCuentaCompartidaByCorreo(plataforma_id: number | null | undefined, correo: string) {
  const email = normEmail(correo);
  if (!email) return null;

  const urls: string[] = [];
  if (plataforma_id != null) {
    urls.push(`/api/cuentascompartidas?correo=${encodeURIComponent(email)}&plataforma_id=${plataforma_id}`);
  }
  urls.push(`/api/cuentascompartidas?correo=${encodeURIComponent(email)}`);

  for (const u of urls) {
    try {
      const r = await fetch(u, { cache: 'no-store' });
      if (!r.ok) continue;
      const j = await r.json();
      const arr: any[] = Array.isArray(j) ? j : (Array.isArray(j?.items) ? j.items : []);
      const hit = arr.find(x =>
        normEmail(x?.correo) === email &&
        (plataforma_id == null || Number(x?.plataforma_id) === Number(plataforma_id))
      );
      if (hit) return hit;
    } catch {}
  }
  return null;
}

async function upsertCuentaCompartida(plataforma_id: number | null | undefined, correo: string, contrasena?: string | null): Promise<number> {
  const email = normEmail(correo);
  if (!email) throw new Error('Correo vacío al crear/buscar cuenta compartida');

  const existing = await findCuentaCompartidaByCorreo(plataforma_id ?? null, email);
  if (existing?.id) {
    if (contrasena && contrasena.trim() !== '') {
      try {
        await fetch(`/api/cuentascompartidas/${existing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contrasena }),
        });
      } catch {}
    }
    return Number(existing.id);
  }

  const body: any = { correo: email };
  if (plataforma_id != null) body.plataforma_id = plataforma_id;
  if (contrasena && contrasena.trim() !== '') body.contrasena = contrasena;

  const rNew = await fetch('/api/cuentascompartidas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!rNew.ok) {
    const j = await rNew.json().catch(() => ({}));
    throw new Error(j?.error ?? 'No se pudo crear la cuenta compartida');
  }
  const created = await rNew.json();
  if (!created?.id) throw new Error('La API no devolvió id al crear cuentascompartidas');
  return Number(created.id);
}

/* ===================== Tabla ===================== */
function Th({ children, className = '', ...rest }: React.ThHTMLAttributes<HTMLTableHeaderCellElement>) {
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
function Td({ children, className = '', ...rest }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td {...rest} className={['px-3 py-2 text-sm text-neutral-100 whitespace-nowrap', className].join(' ')}>
      {children}
    </td>
  );
}

/* ===================== Componente principal ===================== */
export default function PantallasViewer() {
  const { plataformas, loading: platLoading, error: platError } = usePlataformas();

  // filtro server-side
  const [plataformaId, setPlataformaId] = useState<number | ''>('');

  // buscador (texto) con debounce
  const [q, setQ] = useState('');
  const [qDebounced, setQDebounced] = useState('');

  // datos base
  const [rows, setRows] = useState<Pantalla[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // paginación (cursor del backend)
  const PAGE_SIZE = 120;
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [initialLoaded, setInitialLoaded] = useState(false);

  // edición
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Partial<Pantalla>>({});
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  // eliminación
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; label?: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const [deleteAction, setDeleteAction] = useState<'archive' | 'purge' | null>(null);

  // control “Enviar al inventario”
  const [canArchive, setCanArchive] = useState(false);
  const [checkingArchive, setCheckingArchive] = useState(false);

  // scroll
  const bodyScrollRef = useRef<HTMLDivElement>(null);

  // debounce buscador
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const platformMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const p of plataformas) m.set(p.id, (p as any).nombre ?? String(p.id));
    return m;
  }, [plataformas]);

  /* ========== Fetch Helpers ========== */
  const buildUrl = (cursor?: number | null) => {
    const sp = new URLSearchParams();
    sp.set('limit', String(PAGE_SIZE));
    if (cursor != null) sp.set('cursor', String(cursor));
    if (plataformaId !== '') sp.set('plataforma_id', String(plataformaId));
    return `/api/pantallas?${sp.toString()}`;
  };

  // Acepta respuesta {items,nextCursor} o [] (retrocompat)
  const parseGet = async (res: Response): Promise<{ items: Pantalla[]; nextCursor: number | null }> => {
    const data = await res.json();
    if (Array.isArray(data)) return { items: data, nextCursor: null };
    const j = data as GetRes;
    return { items: j.items ?? [], nextCursor: j.nextCursor ?? null };
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
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || 'No se pudieron cargar las pantallas');
      }
      const data = await parseGet(res);

      const normalized = (data.items ?? []).map(normalizeRow);
      setRows(normalized);
      setInitialLoaded(true);
      setNextCursor(data.nextCursor);

      // limpiar resultados de búsqueda de servidor al refrescar dataset base
      setServerResults([]);
      setServerSearchErr(null);
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
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || 'No se pudieron cargar más pantallas');
      }
      const data = await parseGet(res);

      const normalized = (data.items ?? []).map(normalizeRow);
      const map = new Map<number, Pantalla>();
      for (const r of rows) map.set(r.id, r);
      for (const r of normalized) map.set(r.id, r);
      setRows(Array.from(map.values()));

      setNextCursor(data.nextCursor);
    } catch (e: any) {
      setErr(e?.message ?? 'Error al cargar más');
    } finally {
      setLoading(false);
    }
  }, [nextCursor, rows, plataformaId]);

  // Primera carga + cuando cambian filtros server-side
  useEffect(() => {
    fetchFirstPage();
  }, [fetchFirstPage]);

  // teclado/scroll
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

  /* ===================== BÚSQUEDA EN SERVIDOR (toda la base) ===================== */
  const [serverSearching, setServerSearching] = useState(false);
  const [serverSearchErr, setServerSearchErr] = useState<string | null>(null);
  const [serverResults, setServerResults] = useState<Pantalla[]>([]);
  const SEARCH_LIMIT = 2000; // puedes subirlo si quieres

  useEffect(() => {
    let handle: any;
    const doSearch = async () => {
      const query = qDebounced; // enviar tal cual; el backend debería normalizar
      if (!query) {
        setServerResults([]);
        setServerSearchErr(null);
        return;
      }
      setServerSearching(true);
      setServerSearchErr(null);
      try {
        const sp = new URLSearchParams();
        sp.set('q', query);
        sp.set('limit', String(SEARCH_LIMIT));
        if (plataformaId !== '') sp.set('plataforma_id', String(plataformaId));

        // 1) endpoint dedicado
        let res = await fetch(`/api/pantallas/search?${sp.toString()}`, { cache: 'no-store' });
        // 2) fallback básico
        if (!res.ok) {
          res = await fetch(`/api/pantallas?${sp.toString()}`, { cache: 'no-store' });
        }
        if (!res.ok) throw new Error('No se pudo buscar en el servidor');

        const data = await parseGet(res);
        setServerResults((data.items ?? []).map(normalizeRow));
      } catch (e: any) {
        setServerResults([]);
        setServerSearchErr(e?.message ?? 'Error de búsqueda');
      } finally {
        setServerSearching(false);
      }
    };
    handle = setTimeout(doSearch, 350);
    return () => clearTimeout(handle);
  }, [qDebounced, plataformaId]);

  /* ===================== Buscador (solo coincidencias; ignora espacios y dígitos) ===================== */
  const stripSpaces = (s: string) => s.replace(/\s+/g, '');
  const onlyDigits = (s: string) => s.replace(/\D+/g, '');
  const norm = (s: unknown) => lowNoAccents(String(s ?? ''));
  const normNoSpaces = (s: unknown) => stripSpaces(norm(s));

  type Indexed = { row: Pantalla; haystack: string; haystackNoSpaces: string; haystackDigits: string };

  const indexRow = (r: Pantalla): Indexed => {
    const platformName = r.plataforma_id ? platformMap.get(r.plataforma_id) ?? String(r.plataforma_id) : '';
    const fields = [
      r.correo,
      r.contacto,
      r.nombre,
      r.nro_pantalla,
      r.estado,
      r.proveedor,
      r.comentario,
      r.total_pagado,
      r.total_pagado_proveedor,
      r.total_ganado,
      platformName,
    ];
    const joined = fields.map((f) => String(f ?? '')).join(' | ');
    const haystack = norm(joined);
    const haystackNoSpaces = normNoSpaces(joined);
    const haystackDigits = onlyDigits(`${r.contacto ?? ''}|${r.nro_pantalla ?? ''}|${r.correo ?? ''}`);
    return { row: r, haystack, haystackNoSpaces, haystackDigits };
  };

  const buildMatcher = (queryRaw: string) => {
    const qn = norm(queryRaw);
    const qnNoSpaces = normNoSpaces(queryRaw);
    const qDigits = onlyDigits(queryRaw);
    const tokens = qn.split(' ').filter(Boolean);

    return (idx: Indexed) => {
      const textOK = tokens.length > 0
        ? tokens.every((t) => idx.haystack.includes(t))
        : qn.length > 0 && idx.haystack.includes(qn);
      const nospaceOK = qnNoSpaces.length > 0 && idx.haystackNoSpaces.includes(qnNoSpaces);
      const digitsOK = qDigits.length >= 3 && idx.haystackDigits.includes(qDigits);
      return textOK || nospaceOK || digitsOK;
    };
  };

  const indexedRows = useMemo<Indexed[]>(() => rows.map(indexRow), [rows, platformMap]);

  // Solo filas locales que COINCIDEN
  const localFiltered = useMemo(() => {
    if (!qDebounced) return rows;
    const match = buildMatcher(qDebounced);
    return indexedRows.filter(match).map((x) => x.row);
  }, [indexedRows, qDebounced, rows]);

  // Solo filas del servidor que COINCIDEN (mismo criterio)
  const serverFiltered = useMemo(() => {
    if (!qDebounced || serverResults.length === 0) return [];
    const match = buildMatcher(qDebounced);
    return serverResults.map(indexRow).filter(match).map((x) => x.row);
  }, [serverResults, qDebounced, platformMap]);

  // Unión de coincidencias (deduplicado por id)
  const viewRows = useMemo(() => {
    if (!qDebounced) return localFiltered;
    const map = new Map<number, Pantalla>();
    for (const r of localFiltered) map.set(r.id, r);
    for (const r of serverFiltered) if (!map.has(r.id)) map.set(r.id, r);
    return Array.from(map.values());
  }, [localFiltered, serverFiltered, qDebounced]);

  /* ===== edición ===== */
  const applyGanadoRule = (draftIn: Partial<Pantalla>): Partial<Pantalla> => {
    const tp = toNumOrNull(draftIn.total_pagado);
    const tpp = toNumOrNull(draftIn.total_pagado_proveedor);
    if (tp == null) return draftIn;
    const newGan = tpp == null ? tp : tp - tpp;
    return { ...draftIn, total_ganado: String(newGan) as any };
  };

  const maybeAutoVencimiento = (dIn: Partial<Pantalla>): Partial<Pantalla> => {
    const meses = toNumOrNull(dIn.meses_pagados as any);
    const compra = (dIn.fecha_compra as string) || '';
    const next = { ...dIn };
    if (compra && meses && meses > 0) {
      next.fecha_vencimiento = addMonthsSafe(compra, meses);
    }
    return next;
  };

  const beginEdit = (row: Pantalla) => {
    setEditingId(row.id);
    setSaveErr(null);
    setDraft({
      ...row,
      fecha_compra: toDateInput(row.fecha_compra),
      fecha_vencimiento: toDateInput(row.fecha_vencimiento),
      meses_pagados: row.meses_pagados ?? ('' as any),
      total_pagado: row.total_pagado == null || row.total_pagado === '' ? '' : String(row.total_pagado),
      total_pagado_proveedor:
        row.total_pagado_proveedor == null || row.total_pagado_proveedor === '' ? '' : String(row.total_pagado_proveedor),
      total_ganado: row.total_ganado == null || row.total_ganado === '' ? '' : String(row.total_ganado),
      contrasena: row.contrasena ?? '',
      comentario: row.comentario ?? '',
      correo: row.correo ?? '',
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

  // Recalcular automáticamente fecha_vencimiento al cambiar compra/meses
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

  /* ===== saveEdit con re-vinculación de cuenta_id por correo ===== */
  const saveEdit = useCallback(async () => {
    if (editingId == null) return;
    setSaving(true);
    setSaveErr(null);
    try {
      const row = rows.find((r) => r.id === editingId);
      if (!row) throw new Error('Fila no encontrada');

      const oldCorreo = normEmail(row.correo);
      const newCorreo = normEmail(draft.correo as string);
      const pid: number | null = row.plataforma_id == null ? null : Number(row.plataforma_id);

      // Payload base de pantalla (aseguramos vencimiento auto)
      const finalDraft = maybeAutoVencimiento(draft);
      const pantallaPayload: any = {
        contacto: finalDraft.contacto,
        nro_pantalla: finalDraft.nro_pantalla,
        fecha_compra: (finalDraft.fecha_compra as string) || null,
        fecha_vencimiento: (finalDraft.fecha_vencimiento as string) || null,
        meses_pagados: (finalDraft.meses_pagados as any) === '' ? null : Number(finalDraft.meses_pagados as any),
        total_pagado: toNumOrNull(finalDraft.total_pagado),
        total_pagado_proveedor: toNumOrNull(finalDraft.total_pagado_proveedor),
        total_ganado: toNumOrNull(finalDraft.total_ganado),
        estado: finalDraft.estado ?? '',
        comentario: finalDraft.comentario == null ? undefined : String(finalDraft.comentario).trim() === '' ? null : String(finalDraft.comentario),
      };

      // Si cambió el correo ⇒ buscar/crear en cuentascompartidas y asignar cuenta_id
      if (newCorreo && newCorreo !== oldCorreo) {
        const newCuentaId = await upsertCuentaCompartida(pid, newCorreo, (finalDraft.contrasena as string) ?? null);
        pantallaPayload.cuenta_id = newCuentaId;
        pantallaPayload.correo = newCorreo; // por si el backend no lo devuelve en el PATCH
      } else {
        // Si no cambió el correo pero cambiaste clave y hay cuenta_id ⇒ actualizar clave
        const hasNewPass = typeof finalDraft.contrasena === 'string' && finalDraft.contrasena.trim() !== '' && finalDraft.contrasena !== row.contrasena;
        if (hasNewPass && row.cuenta_id) {
          try {
            await fetch(`/api/cuentascompartidas/${row.cuenta_id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contrasena: finalDraft.contrasena }),
            });
          } catch {}
        }
      }

      // Guardar la pantalla
      const r1 = await fetch(`/api/pantallas/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pantallaPayload),
      });
      if (!r1.ok) throw new Error((await r1.json().catch(() => ({})))?.error ?? 'No se pudo guardar la pantalla');
      const savedPantalla: Pantalla = normalizeRow(await r1.json());

      // Refrescar UI (asegurando correo/clave visibles)
      setRows((rs) =>
        rs.map((r) =>
          r.id === editingId
            ? {
                ...r,
                ...savedPantalla,
                correo: newCorreo || r.correo,
                contrasena: (finalDraft.contrasena as string) ?? r.contrasena,
              }
            : r
        )
      );

      cancelEdit();
    } catch (e: any) {
      setSaveErr(e?.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }, [editingId, draft, rows]);

  /* ===== eliminación (verificación SOLO en /api/pantallas por correo) ===== */
  const openDelete = async (id: number, label?: string) => {
    setDeleteTarget({ id, label });
    setDeleteErr(null);
    setDeleteMsg(null);
    setDeleteAction(null);
    setCanArchive(false);
    setCheckingArchive(true);

    try {
      // Obtener correo desde fila o API
      const victimLocal = rows.find((r) => r.id === id) || null;
      let correo = victimLocal?.correo ?? null;
      let plataforma_id = victimLocal?.plataforma_id ?? null;
      let contrasena = victimLocal?.contrasena ?? null;

      if (!correo) {
        const resolved = await resolveVictimContextFromAPI(id);
        if (resolved) {
          if (!correo) correo = resolved.correo ?? null;
          if (!plataforma_id) plataforma_id = resolved.plataforma_id ?? null;
          if (!contrasena) contrasena = resolved.contrasena ?? null;
        }
      }

      // Guardar label enriquecido (solo visual)
      setDeleteTarget({ id, label: label ?? (correo ? `${correo} / ${victimLocal?.nro_pantalla ?? ''}` : undefined) });

      // Sin correo ⇒ no podemos ofrecer inventario
      if (!correo) { setCanArchive(false); return; }

      // Conteo SOLO en pantallas
      const uses = await countPantallasByEmail(correo);
      setCanArchive(uses <= 1);
    } catch (e: any) {
      setDeleteErr(e?.message ?? 'Error al verificar el estado del correo.');
    } finally {
      setCheckingArchive(false);
    }
  };

  const doDelete = async (archive: boolean) => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteErr(null);
    setDeleteMsg(null);
    setDeleteAction(archive ? 'archive' : 'purge');
    try {
      // Datos para inventario (opcional)
      let victim = rows.find((r) => r.id === deleteTarget.id) || null;
      let victimPlataforma = victim?.plataforma_id ?? null;
      let victimCorreo = victim?.correo ?? null;
      let victimClave = victim?.contrasena ?? null;

      if (!victimCorreo && archive) {
        const resolved = await resolveVictimContextFromAPI(deleteTarget.id);
        if (resolved) {
          if (!victimCorreo) victimCorreo = resolved.correo ?? null;
          if (!victimPlataforma) victimPlataforma = resolved.plataforma_id ?? null;
          if (!victimClave) victimClave = resolved.contrasena ?? null;
        }
      }

      if (archive && victimCorreo) {
        await ensureInInventario(victimPlataforma as number | null, victimCorreo, victimClave);
      }

      const res = await fetch(`/api/pantallas/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? 'No se pudo eliminar');
      }
      const info = await res.json().catch(() => ({}));
      setRows((rs) => rs.filter((r) => r.id !== deleteTarget.id));

      const parts: string[] = ['Pantalla eliminada.'];
      if ((info as any)?.cuenta_deleted) parts.push('Se eliminó la cuenta compartida (última referencia).');
      if ((info as any)?.usuario_deleted) parts.push('Se eliminó el contacto/usuario (sin referencias).');
      setDeleteMsg(parts.join(' '));

      setDeleteTarget(null);
    } catch (e: any) {
      setDeleteErr(e?.message ?? 'Error al eliminar');
    } finally {
      setDeleting(false);
      setDeleteAction(null);
    }
  };

  // Guardar con Enter global; en textarea Ctrl/Cmd+Enter
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

  /* ---- UI ---- */
  const tblInput =
    'w-full rounded-md px-2 py-1 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500';
  const moneyInput = (value: any, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void) => (
    <input
      type="number"
      step="0.01"
      min="0"
      className={`${tblInput} text-right tabular-nums`}
      value={value == null ? '' : String(value)}
      onChange={onChange}
    />
  );

  return (
    <div className="space-y-4">
      {/* Filtros server-side + buscador */}
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_240px_120px]">
        <div className="relative w-full">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar correo, contacto, nombre, plataforma, proveedor… (busca en toda la base)"
            className="w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800"
              aria-label="Limpiar búsqueda"
              title="Limpiar"
            >
              ×
            </button>
          )}
        </div>

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
      </div>

      {/* Estado */}
      {loading && <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4 text-sm text-neutral-300">Cargando…</div>}
      {err && <div className="rounded-xl border border-red-800/50 bg-red-950/30 p-4 text-sm text-red-200">Error: {err}</div>}
      {deleteMsg && <div className="rounded-xl border border-neutral-700 bg-neutral-900 p-3 text-sm text-neutral-100">{deleteMsg}</div>}

      {/* Aviso búsqueda server */}
      {qDebounced && (
        <div className="text-xs text-neutral-400">
          {serverSearching ? 'Buscando en el servidor…' : serverSearchErr ? `Búsqueda local activa (error server: ${serverSearchErr})` : 'Mostrando solo coincidencias (local + servidor)'}
        </div>
      )}

      {/* Tabla */}
      {!err && viewRows.length > 0 && (
        <div className="rounded-b-2xl border border-neutral-800 bg-neutral-950/40 overflow-hidden">
          <div
            ref={bodyScrollRef}
            className="overflow-x-auto max-h-[70vh] overflow-y-auto focus:outline-none discreet-scroll"
            onWheel={handleWheelHorizontal}
            onKeyDown={onBodyKeyDown}
            tabIndex={0}
          >
            <table className="min-w-[2100px] w-full table-fixed">
              <thead>
                <tr className="border-b border-neutral-800">
                  <Th className="w-28 text-center">Acciones</Th>
                  <Th className="w-48">Plataforma</Th>
                  <Th className="w-40">Contacto</Th>
                  <Th className="w-40">Nombre</Th>
                  <Th className="w-60">Correo</Th>
                  <Th className="w-40">Clave</Th>
                  <Th className="w-36">Nro. Pantalla</Th>
                  <Th className="w-36 text-right">Total</Th>
                  <Th className="w-40 text-right">Pagado prov.</Th>
                  <Th className="w-36 text-right">Ganado</Th>
                  <Th className="w-28">Meses</Th>
                  <Th className="w-36">Compra</Th>
                  <Th className="w-36">Vence</Th>
                  <Th className="w-32">Estado</Th>
                  <Th className="w-40">Proveedor</Th>
                  <Th className="w-[420px]">Comentario</Th>
                </tr>
              </thead>
              <tbody>
                {viewRows.map((row, idx) => {
                  const isEditing = editingId === row.id;
                  const pid = row.plataforma_id == null ? null : Number(row.plataforma_id);
                  const platformName = pid ? platformMap.get(pid) ?? String(pid) : '—';

                  return (
                    <tr
                      key={row.id}
                      onDoubleClick={(e) => {
                        if (isEditing) return;
                        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
                        if (['button', 'a', 'input', 'textarea', 'select', 'svg', 'path'].includes(tag || '')) return;
                        beginEdit(row);
                      }}
                      className={`border-b border-neutral-900 ${idx % 2 === 0 ? 'bg-neutral-900/30' : 'bg-transparent'} hover:bg-neutral-800/40 ${!isEditing ? 'cursor-pointer' : ''}`}
                    >
                      {/* Acciones */}
                      <Td className="text-center">
                        {!isEditing ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => beginEdit(row)}
                              className="inline-flex items-center justify-center rounded-md p-2 text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-600"
                              title={`Editar fila ${row.id}`}
                              aria-label={`Editar fila ${row.id}`}
                            >
                              <PencilIcon />
                            </button>

                            <button
                              type="button"
                              onClick={() => openDelete(row.id, `${row.correo ?? ''} / ${row.nro_pantalla}`)}
                              className="inline-flex items-center justify-center rounded-md p-2 text-red-300 hover:bg-red-900/30 hover:text-red-100 focus:outline-none focus:ring-2 focus:ring-red-600"
                              title={`Eliminar fila ${row.id}`}
                              aria-label={`Eliminar fila ${row.id}`}
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

                      {/* Plataforma */}
                      <Td title={platformName}>{platformName}</Td>

                      {/* Contacto */}
                      <Td title={row.contacto} className="font-medium">
                        {!isEditing ? (
                          <span className="block w-full truncate">{row.contacto}</span>
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
                          <span className="block w-full truncate">{row.nombre ?? '—'}</span>
                        ) : (
                          <input
                            className={tblInput}
                            value={(draft.nombre as string) ?? row.nombre ?? ''}
                            onChange={(e) => setDraft((d) => ({ ...d, nombre: e.target.value }))}
                          />
                        )}
                      </Td>

                      {/* Correo */}
                      <Td title={row.correo ?? ''}>
                        {!isEditing ? (
                          <span className="block w-full truncate">{row.correo ?? '—'}</span>
                        ) : (
                          <input
                            type="email"
                            className={tblInput}
                            value={(draft.correo as string) ?? row.correo ?? ''}
                            onChange={(e) => setDraft((d) => ({ ...d, correo: e.target.value }))}
                            placeholder="correo@dominio.com"
                          />
                        )}
                      </Td>

                      {/* Clave */}
                      <Td title={row.contrasena ?? ''}>
                        {!isEditing ? (
                          <span className="block w-full truncate">{row.contrasena ?? '—'}</span>
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

                      {/* Nro. Pantalla */}
                      <Td>
                        {!isEditing ? (
                          <span className="block w-full truncate">{row.nro_pantalla}</span>
                        ) : (
                          <input
                            className={tblInput}
                            value={(draft.nro_pantalla as string) ?? row.nro_pantalla}
                            onChange={(e) => setDraft((d) => ({ ...d, nro_pantalla: e.target.value }))}
                          />
                        )}
                      </Td>

                      {/* Total (cliente) */}
                      <Td className="text-right tabular-nums">
                        {!isEditing ? (
                          fmtMoney(row.total_pagado)
                        ) : (
                          moneyInput(
                            draft.total_pagado == null ? '' : String(draft.total_pagado),
                            (e) => setDraft((d) => applyGanadoRule({ ...d, total_pagado: e.target.value }))
                          )
                        )}
                      </Td>

                      {/* Pagado proveedor */}
                      <Td className="text-right tabular-nums">
                        {!isEditing ? (
                          fmtMoney(row.total_pagado_proveedor)
                        ) : (
                          moneyInput(
                            draft.total_pagado_proveedor == null ? '' : String(draft.total_pagado_proveedor),
                            (e) => setDraft((d) => applyGanadoRule({ ...d, total_pagado_proveedor: e.target.value }))
                          )
                        )}
                      </Td>

                      {/* Ganado */}
                      <Td className="text-right tabular-nums">
                        {!isEditing ? (
                          fmtMoney(row.total_ganado)
                        ) : (
                          moneyInput(
                            draft.total_ganado == null ? '' : String(draft.total_ganado),
                            (e) => setDraft((d) => ({ ...d, total_ganado: e.target.value }))
                          )
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
                          <span className="block w-full truncate">{row.estado ?? '—'}</span>
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
                        <span className="block w-full truncate">{row.proveedor ?? '—'}</span>
                      </Td>

                      {/* Comentario */}
                      <Td title={row.comentario ?? ''} className="align-top !whitespace-normal">
                        {!isEditing ? (
                          <div className="max-w-none break-words">{row.comentario ?? '—'}</div>
                        ) : (
                          <textarea
                            className={`${tblInput} resize-y`}
                            rows={2}
                            value={(draft.comentario as string) ?? row.comentario ?? ''}
                            onChange={(e) => setDraft((d) => ({ ...d, comentario: e.target.value }))}
                            onKeyDown={(e) => {
                              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                e.preventDefault();
                                saveEdit();
                              }
                            }}
                          />
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="flex items-center justify-between gap-3 p-3 border-t border-neutral-800">
            <div className="text-sm text-neutral-300">
              {initialLoaded ? `${rows.length} fila(s) cargadas` : '—'}
              {plataformaId !== '' && <> · Plataforma {String(plataformaId)}</>}
              {qDebounced && <> · {serverSearching ? 'buscando…' : `+${serverResults.length} resultado(s) de servidor`}</>}
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

      {!err && viewRows.length === 0 && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4 text-sm text-neutral-300">
          {loading ? 'Cargando…' : 'No se encontraron resultados.'}
        </div>
      )}

      {/* Modal eliminar */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDeleteTarget(null)}>
          <div
            className="w-full max-w-md rounded-xl border border-neutral-700 bg-neutral-900 p-4 text-neutral-100 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="modal-title"
            aria-describedby="modal-desc"
          >
            <h4 id="modal-title" className="text-lg font-semibold mb-2">Eliminar pantalla</h4>
            <p id="modal-desc" className="text-sm text-neutral-300">
              {deleteTarget.label ? <><span className="opacity-80">({deleteTarget.label})</span><br/></> : null}
              {checkingArchive
                ? 'Verificando si es el último registro con este correo (en Pantallas)…'
                : canArchive
                  ? 'Es la última pantalla con este correo. Puedes enviarla al inventario antes de eliminar.'
                  : 'Existen más pantallas con este correo. Solo puedes eliminar definitivamente.'}
            </p>

            {deleteErr && (
              <div className="mt-3 rounded-lg border border-red-800/50 bg-red-950/30 p-2 text-sm text-red-200">{deleteErr}</div>
            )}

            <div className={`mt-4 ${canArchive ? 'grid gap-2 sm:grid-cols-2' : 'flex justify-end gap-2'}`}>
              {canArchive && (
                <button
                  type="button"
                  onClick={() => doDelete(true)}
                  disabled={deleting || checkingArchive}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-700 bg-emerald-800/40 px-3 py-2 hover:bg-emerald-800/60 focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:opacity-60"
                  title="Crear/asegurar inventario y eliminar"
                >
                  {deleting && deleteAction === 'archive' ? 'Enviando…' : 'Enviar al inventario'}
                </button>
              )}

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
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="rounded-lg border border-neutral-600 px-3 py-2 hover:bg-neutral-800 disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scrollbar discreto */}
      <style jsx global>{`
        .discreet-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(120,120,120,0.35) transparent;
        }
        .discreet-scroll::-webkit-scrollbar { height: 8px; width: 8px; }
        .discreet-scroll::-webkit-scrollbar-thumb {
          background-color: rgba(120,120,120,0.35);
          border-radius: 9999px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }
        .discreet-scroll::-webkit-scrollbar-track { background: transparent; }
        .discreet-scroll:hover::-webkit-scrollbar-thumb { background-color: rgba(120,120,120,0.5); }
      `}</style>
    </div>
  );
}
