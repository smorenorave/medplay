'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';

/* ====================== Recharts (solo cliente) ====================== */
const D = (name: keyof typeof import('recharts')) =>
  dynamic<any>(() => import('recharts').then(m => (m as any)[name]), { ssr: false });
const ResponsiveContainer = D('ResponsiveContainer');
const BarChart            = D('BarChart');
const Bar                 = D('Bar');
const XAxis               = D('XAxis');
const YAxis               = D('YAxis');
const CartesianGrid       = D('CartesianGrid');
const Tooltip             = D('Tooltip');

/* ====================== Tipos ====================== */
type Pantalla = {
  id: number;
  cuenta_id: number|null;
  contacto: string;
  nro_pantalla: string;
  fecha_compra: string|null;
  fecha_vencimiento: string|null;
  meses_pagados: number|null;
  total_ganado: number | string | null;
  estado: string|null;
  plataforma_id: number|null;
  correo: string|null;
  contrasena: string|null;
};

type CuentaCompleta = {
  id: number;
  contacto: string;
  nombre: string|null;
  correo: string|null;
  contrasena: string|null;
  fecha_compra: string|null;
  fecha_vencimiento: string|null;
  meses_pagados: number|null;
  total_ganado: number | string | null;
  estado: string|null;
  plataforma_id: number|null;
};

type Plataforma = { id: number; nombre: string };
type DayPoint   = { day: string; total: number; pantallas: number; completas: number };
type RankRow    = { name: string; count: number; total: number; pid: number|null };

/* ====== Snapshot mensual (respuesta GET del router) ====== */
type MonthlySnapshot = {
  id: number;
  year: number;
  month: number;
  periodLabel: string;
  total_general: number;
  total_pantallas: number;
  total_cuentas: number;
  ventas_cantidad: number;
  clientes_activos: number;
  ranking: RankRow[];
  ventas_dias: DayPoint[];
  ventas_dia_plataforma?: { day: string; pid: number|null; tipo: 'C'|'P'; total: number }[] | null;
  createdAt?: string;
  updatedAt?: string;
};

/* ====================== Endpoints existentes ====================== */
const API_PANTALLAS    = '/api/pantallas';
const API_COMPLETAS    = '/api/cuentascompletas';
const API_PLATAFORMAS  = '/api/plataformas';

/* ====================== Utils ====================== */
const pad2 = (n: number) => String(n).padStart(2, '0');
const endOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const monthName = (y: number, m1to12: number) =>
  new Date(y, m1to12 - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

const toMoney = (v: number | string | null | undefined): number => {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const s0 = v.toString().trim();
  const s1 = s0.replace(/[^\d.,-]/g, '');
  const s2 = s1.replace(/(\d)[,.](?=\d{3}\b)/g, '$1'); // miles
  const s3 = s2.includes(',') && !s2.includes('.') ? s2.replace(',', '.') : s2;
  const n = Number(s3);
  return Number.isFinite(n) ? n : 0;
};

const isSameYearMonth = (iso?: string | null, y?: number, m1to12?: number) => {
  if (!iso || !y || !m1to12) return false;
  const m = String(iso).match(/^(\d{4})-(\d{2})/);
  return !!m && Number(m[1]) === y && Number(m[2]) === m1to12;
};

function safeDayInMonth(iso: string | null | undefined, year: number, month1to12: number, diasMes: number): number | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso).slice(0, 10));
  if (!m) return null;
  const y = +m[1], m1 = +m[2], d = +m[3];
  if (y !== year || m1 !== month1to12) return null;
  return Math.min(Math.max(d, 1), diasMes);
}

const isFutureOrToday = (iso?: string | null) => {
  if (!iso) return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso).slice(0, 10));
  if (!m) return false;
  const d = new Date(+m[1], +m[2]-1, +m[3]);
  const a = new Date(new Date().toDateString());
  return d.getTime() >= a.getTime();
};

const fmtDate = (iso?: string | null) => {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
  if (!m) return String(iso);
  const [_, y, mm, dd] = m;
  return `${Number(dd)}/${Number(mm)}/${y}`;
};

const fmt = (n: number) => new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);

/* Colores */
const PLATFORM_COLORS = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#84cc16','#f43f5e','#14b8a6','#eab308','#a855f7','#0ea5e9'];
const colorForPid = (pid?: number | null) => PLATFORM_COLORS[Math.abs(Number(pid ?? 0)) % PLATFORM_COLORS.length];
const withAlpha = (hex: string, a = 0.6) => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

/* ====================== Normalización básica ====================== */
async function fetchAll<T = any>(urlBase: string, opts: { limit?: number } = {}): Promise<T[]> {
  const limit: number = opts.limit ?? 500;
  const all: T[] = [];
  let nextCursor: string | null = null;
  let guard = 0;

  const buildUrl = (base: string, lim: number, cursor: string | null): string => {
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}limit=${lim}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
  };

  while (guard++ < 200) {
    const pageUrl: string = buildUrl(urlBase, limit, nextCursor);
    const resp: Response = await fetch(pageUrl, { cache: 'no-store' });
    if (!resp.ok) throw new Error(`Error ${resp.status} en ${urlBase}`);
    const data: any = await resp.json().catch(() => ({} as any));

    const page: T[] = Array.isArray(data)
      ? (data as T[])
      : Array.isArray(data?.data) ? data.data
      : Array.isArray(data?.items) ? data.items
      : Array.isArray(data?.results) ? data.results
      : Array.isArray((data as any)?.pantallas) ? (data as any).pantallas
      : Array.isArray((data as any)?.cuentascompletas) ? (data as any).cuentascompletas
      : Array.isArray((data as any)?.plataformas) ? (data as any).plataformas : [];

    all.push(...page);

    const nc =
      (data?.nextCursor ?? data?.nextcursor ?? data?.next_page ?? data?.next_page_token ??
       data?.nextPageToken ?? data?.cursor ?? data?.next) ?? null;

    if (!nc || page.length === 0) break;
    nextCursor = String(nc);
  }
  return all;
}

/* ====================== Componente ====================== */
export default function AdminPanel() {
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);

  const [pantallas, setPantallas] = useState<Pantalla[]>([]);
  const [completas, setCompletas] = useState<CuentaCompleta[]>([]);
  const [plataformas, setPlataformas] = useState<Plataforma[]>([]);

  const [loading, setLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string|null>(null);

  /* ======== Estados snapshot / export ======== */
  const [savingSnap, setSavingSnap] = useState(false);
  const [loadingSnap, setLoadingSnap] = useState(false);
  const [msg, setMsg] = useState<string|null>(null);
  const [viewMode, setViewMode] = useState<'live' | 'snapshot'>('live');
  const [snapshot, setSnapshot] = useState<MonthlySnapshot | null>(null);

  /* ======== Estados descarga de registros (XLSX/CSV locales) ======== */
  const [downloading, setDownloading] = useState(false);
  const [dlMsg, setDlMsg] = useState<string|null>(null);

  /* ======== Carga de datos ======== */
  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true); setErr(null);
      try {
        const [pRaw, cRaw, sRaw] = await Promise.all([
          fetchAll<any>(API_PANTALLAS),
          fetchAll<any>(API_COMPLETAS),
          fetchAll<any>(API_PLATAFORMAS),
        ]);
        if (!cancel) {
          setPantallas(pRaw as Pantalla[]);
          setCompletas(cRaw as CuentaCompleta[]);
          setPlataformas((sRaw as any[]).map((r) => ({ id: Number(r.id), nombre: String(r.nombre ?? r.name ?? r.titulo ?? r.id) })));
        }
      } catch (e: any) {
        if (!cancel) setErr(e?.message ?? 'No se pudieron cargar los datos');
      } finally { if (!cancel) setLoading(false); }
    })();
    return () => { cancel = true; };
  }, []);

  /* ======== Mapa id→nombre ======== */
  const platformMap = useMemo(() => {
    const m = new Map<number, string>();
    plataformas.forEach(p => m.set(p.id, p.nombre));
    return m;
  }, [plataformas]);

  const platformName = (pid?: number | null) =>
    pid == null ? 'Sin plataforma' : (platformMap.get(pid) ?? `Plataforma ${pid}`);

  const availableYears = useMemo<number[]>(() => {
    const years = new Set<number>();
    const pull = (iso?: string|null) => { const m = String(iso ?? '').match(/^(\d{4})/); if (m) years.add(Number(m[1])); };
    pantallas.forEach(p => { pull(p.fecha_compra); pull(p.fecha_vencimiento); });
    completas.forEach(c => { pull(c.fecha_compra); pull(c.fecha_vencimiento); });
    const arr = Array.from(years.values()).sort((a,b)=>b-a);
    return arr.length ? arr : [now.getFullYear()];
  }, [pantallas, completas]);

  /* ===================== Agregaciones LIVE ===================== */
  const agg = useMemo(() => {
    const diasMes = endOfMonth(new Date(year, month-1, 1)).getDate();

    const pf = pantallas.filter(p => isSameYearMonth(p.fecha_compra, year, month));
    const cf = completas .filter(c => isSameYearMonth(c.fecha_compra, year, month));

    const totalPantMonto = pf.reduce((s,r)=>s+toMoney(r.total_ganado),0);
    const totalCompMonto = cf.reduce((s,r)=>s+toMoney(r.total_ganado),0);
    const totalGeneral   = totalPantMonto + totalCompMonto;

    const totalPantUnid  = pf.length;
    const totalCompUnid  = cf.length;

    const byDay = new Map<number, { total: number; pantallas: number; completas: number }>();
    for (let d=1; d<=diasMes; d++) byDay.set(d, { total:0, pantallas:0, completas:0 });

    pf.forEach(r => {
      const dd = safeDayInMonth(r.fecha_compra, year, month, diasMes);
      if (dd == null) return;
      const v = toMoney(r.total_ganado);
      const o = byDay.get(dd)!; o.total += v; o.pantallas += v;
    });
    cf.forEach(r => {
      const dd = safeDayInMonth(r.fecha_compra, year, month, diasMes);
      if (dd == null) return;
      const v = toMoney(r.total_ganado);
      const o = byDay.get(dd)!; o.total += v; o.completas += v;
    });

    const porDia: DayPoint[] = [...byDay.entries()].map(([d, v]) => ({ day: pad2(d), ...v }));

    const rankMap = new Map<number|null, RankRow>();
    const push = (pid: number|null, val:number) => {
      const key = pid ?? null;
      const cur: RankRow = rankMap.get(key) ?? { name: platformName(key), count: 0, total: 0, pid: key };
      cur.count += 1; cur.total += val; rankMap.set(key, cur);
    };
    pf.forEach(r => push(r.plataforma_id, toMoney(r.total_ganado)));
    cf.forEach(r => push(r.plataforma_id, toMoney(r.total_ganado)));
    const ranking = [...rankMap.values()].sort((a,b)=> (b.count-a.count) || (b.total-a.total));

    // Serie por día por plataforma para guardar en payload (C_*, P_*)
    const keys = Array.from(new Set<number|null>([...pf.map(p=>p.plataforma_id), ...cf.map(c=>c.plataforma_id)]));
    const kstr = keys.map(k => k==null?'NA':String(k))
                     .sort((a,b)=>(a==='NA'?1:b==='NA'?-1:Number(a)-Number(b)));

    const perDayPerPlatform: Array<Record<string, any>> = [];
    for (let d=1; d<=diasMes; d++) {
      const row: Record<string, number | string> = { day: pad2(d) };
      kstr.forEach(k => { row[`C_${k}`] = 0; row[`P_${k}`] = 0; });
      perDayPerPlatform.push(row);
    }
    pf.forEach(r => {
      const dd = safeDayInMonth(r.fecha_compra, year, month, diasMes);
      if (dd == null) return;
      const key = r.plataforma_id==null?'NA':String(r.plataforma_id);
      (perDayPerPlatform[dd-1][`P_${key}`] as number) += toMoney(r.total_ganado);
    });
    cf.forEach(r => {
      const dd = safeDayInMonth(r.fecha_compra, year, month, diasMes);
      if (dd == null) return;
      const key = r.plataforma_id==null?'NA':String(r.plataforma_id);
      (perDayPerPlatform[dd-1][`C_${key}`] as number) += toMoney(r.total_ganado);
    });

    const activos =
      pantallas.filter(p => isFutureOrToday(p.fecha_vencimiento)).length +
      completas .filter(c => isFutureOrToday(c.fecha_vencimiento)).length;

    return {
      totalGeneral,
      totalPantMonto, totalCompMonto,
      totalPantUnid,  totalCompUnid,
      activos,
      porDia,
      ranking,
      perDayPerPlatform,
      monthPlatformKeys: kstr,
    };
  }, [pantallas, completas, year, month, platformMap]);

  const {
    totalGeneral, totalPantMonto, totalCompMonto,
    totalPantUnid, totalCompUnid,
    activos, porDia, ranking, perDayPerPlatform, monthPlatformKeys
  } = agg;

  /* ===================== Helpers descarga ===================== */
  const saveBlob = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.rel = 'noopener';
    document.body.appendChild(a);
    a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 800);
  }, []);

  /* ===================== Guardar snapshot (POST) ===================== */
  const buildVentasDiaPlataforma = useCallback(() => {
    const out: { day: string; pid: number|null; tipo: 'C'|'P'; total: number }[] = [];
    perDayPerPlatform.forEach((row) => {
      const day = String(row.day);
      monthPlatformKeys.forEach((k) => {
        const pid = k === 'NA' ? null : Number(k);
        out.push({ day, pid, tipo: 'C', total: Number(row[`C_${k}`] ?? 0) });
        out.push({ day, pid, tipo: 'P', total: Number(row[`P_${k}`] ?? 0) });
      });
    });
    return out;
  }, [perDayPerPlatform, monthPlatformKeys]);

  const saveMonthlySnapshot = useCallback(async () => {
    try {
      setSavingSnap(true); setMsg(null);
      const payload = {
        year, month,
        total_general: totalGeneral,
        total_pantallas: totalPantMonto,
        total_cuentas: totalCompMonto,
        clientes_activos: activos,
        ventas_cantidad: totalPantUnid + totalCompUnid,
        ranking: ranking.map(r => ({ name: r.name, count: r.count, total: r.total, pid: r.pid ?? null })),
        ventas_dias: porDia.map(d => ({ day: d.day, total: d.total, pantallas: d.pantallas, completas: d.completas })),
        ventas_dia_plataforma: buildVentasDiaPlataforma(), // opcional, el router la guarda en payload
      };

      const res = await fetch('/api/metricas-mensuales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let detail = '';
        try { detail = (await res.json())?.detail || (await res.json())?.error || ''; } catch {}
        throw new Error(detail || `Error ${res.status}`);
      }

      const saved: MonthlySnapshot = await res.json();
      setMsg(`Snapshot guardado (${saved.periodLabel}).`);
      setSnapshot(saved);
      setViewMode('snapshot');
    } catch (e: any) {
      setMsg(e?.message ?? 'No se pudo guardar el snapshot');
    } finally {
      setSavingSnap(false);
    }
  }, [year, month, totalGeneral, totalPantMonto, totalCompMonto, activos, totalPantUnid, totalCompUnid, ranking, porDia, buildVentasDiaPlataforma]);

  /* ===================== Cargar snapshot (GET JSON) ===================== */
  const loadMonthlySnapshot = useCallback(async () => {
    try {
      setLoadingSnap(true); setMsg(null);
      const res = await fetch(`/api/metricas-mensuales?year=${year}&month=${month}`, { cache: 'no-store' });
      if (res.status === 404) {
        setSnapshot(null);
        setViewMode('live');
        setMsg('No hay snapshot guardado para este mes.');
        return;
      }
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data: MonthlySnapshot = await res.json();
      setSnapshot(data);
      setViewMode('snapshot');
      setMsg(`Viendo snapshot guardado (${data.periodLabel}).`);
    } catch (e: any) {
      setMsg(e?.message ?? 'Error al cargar snapshot');
    } finally {
      setLoadingSnap(false);
    }
  }, [year, month]);

  const showLive = useCallback(() => {
    setViewMode('live');
    setMsg(null);
  }, []);

  /* ===================== Descargar snapshot (XLSX/CSV desde router) ===================== */
  const downloadSnapshot = useCallback(async (format: 'xlsx'|'csv') => {
    try {
      setLoadingSnap(true); setMsg(null);
      const res = await fetch(`/api/metricas-mensuales?year=${year}&month=${month}&format=${format}`, { cache: 'no-store' });
      if (res.status === 404) { setMsg('No hay snapshot guardado para descargar.'); return; }
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const blob = await res.blob();
      saveBlob(blob, `metricas-${year}-${pad2(month)}.${format}`);
      setMsg(`Descargado snapshot (${format.toUpperCase()}).`);
    } catch (e: any) {
      setMsg(e?.message ?? 'No se pudo descargar el snapshot');
    } finally {
      setLoadingSnap(false);
    }
  }, [year, month, saveBlob]);

  /* ===================== Descarga REGISTROS del mes (XLSX con Ranking / CSV) ===================== */
  const [downloadingLocal, setDownloadingLocal] = useState(false);
  const HEADERS = [
    'tipo','id','contacto','plataforma_id','plataforma',
    'cuenta_id','nro_pantalla','nombre','correo','contrasena',
    'fecha_compra','fecha_vencimiento','meses_pagados','total_ganado','estado'
  ] as const;
  type HeaderKey = typeof HEADERS[number];
  type Row = Record<HeaderKey, string | number | null>;

  const toCSV = (rows: Array<Record<string, any>>, headers: string[]) => {
    const esc = (v: any) => {
      if (v == null) return '';
      const s = String(v).replace(/"/g, '""');
      return /[",\n;]/.test(s) ? `"${s}"` : s;
    };
    const head = headers.join(',');
    const lines = rows.map(r => headers.map(h => esc(r[h])).join(','));
    return [head, ...lines].join('\n');
  };

  const buildRowsForMonth = (): Row[] => {
    const pRows: Row[] = pantallas
      .filter(p => isSameYearMonth(p.fecha_compra, year, month))
      .map(p => ({
        tipo: 'Pantalla',
        id: p.id,
        contacto: p.contacto,
        plataforma_id: p.plataforma_id,
        plataforma: platformName(p.plataforma_id),
        cuenta_id: p.cuenta_id,
        nro_pantalla: p.nro_pantalla,
        nombre: null,
        correo: p.correo,
        contrasena: p.contrasena,
        fecha_compra: p.fecha_compra,
        fecha_vencimiento: p.fecha_vencimiento,
        meses_pagados: p.meses_pagados,
        total_ganado: toMoney(p.total_ganado),
        estado: p.estado ?? '',
      }));

    const cRows: Row[] = completas
      .filter(c => isSameYearMonth(c.fecha_compra, year, month))
      .map(c => ({
        tipo: 'Completa',
        id: c.id,
        contacto: c.contacto,
        plataforma_id: c.plataforma_id,
        plataforma: platformName(c.plataforma_id),
        cuenta_id: null,
        nro_pantalla: null,
        nombre: c.nombre,
        correo: c.correo,
        contrasena: c.contrasena,
        fecha_compra: c.fecha_compra,
        fecha_vencimiento: c.fecha_vencimiento,
        meses_pagados: c.meses_pagados,
        total_ganado: toMoney(c.total_ganado),
        estado: c.estado ?? '',
      }));

    return [...pRows, ...cRows];
  };

  const downloadRegistros = useCallback(async (fmtOut: 'xlsx'|'csv'='xlsx') => {
    const rows = buildRowsForMonth();
    const period = `${year}-${pad2(month)}`;
    setDlMsg(null);
    setDownloading(true);
    setDownloadingLocal(true);
    try {
      if (fmtOut === 'xlsx') {
        try {
          const XLSX = await import('xlsx');
          const wb = XLSX.utils.book_new();

          const ws1 = XLSX.utils.json_to_sheet(rows, { header: [...HEADERS] as unknown as string[] });
          XLSX.utils.book_append_sheet(wb, ws1, `Registros_${period}`);

          const rankingRows = ranking.map(r => ({
            Plataforma: r.name, Unidades: r.count, Total: Number(r.total || 0)
          }));
          const ws2 = XLSX.utils.json_to_sheet(rankingRows, { header: ['Plataforma','Unidades','Total'] });
          XLSX.utils.book_append_sheet(wb, ws2, 'Ranking_plataformas');

          const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
          saveBlob(
            new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
            `registros-${period}.xlsx`
          );
          setDlMsg(`Descargado Excel (registros-${period}.xlsx)`);
          return;
        } catch (e) {
          console.warn('Fallo XLSX; fallback CSV.', e);
        }
      }
      const csvReg = toCSV(rows, [...HEADERS] as unknown as string[]);
      const rankHeaders = ['Plataforma','Unidades','Total'];
      const csvRank = toCSV(ranking.map(r => ({ Plataforma: r.name, Unidades: r.count, Total: Number(r.total||0) })) as any[], rankHeaders);
      const csv = csvReg + '\n\n' + csvRank;
      saveBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `registros-${period}.csv`);
      setDlMsg(`Descargado CSV (registros-${period}.csv)`);
    } catch (e: any) {
      setDlMsg(e?.message ?? 'No se pudo generar la descarga');
    } finally {
      setDownloading(false);
      setDownloadingLocal(false);
    }
  }, [year, month, pantallas, completas, ranking, saveBlob]);

  /* ===================== Fuente: snapshot vs live ===================== */
  const isSnap = viewMode === 'snapshot' && snapshot && snapshot.year === year && snapshot.month === month;

  const kpi_total      = isSnap ? snapshot!.total_general   : totalGeneral;
  const kpi_pantallas  = isSnap ? snapshot!.total_pantallas : totalPantMonto;
  const kpi_completas  = isSnap ? snapshot!.total_cuentas   : totalCompMonto;
  const kpi_activos    = isSnap ? snapshot!.clientes_activos: activos;
  const seriePorDia    = isSnap ? snapshot!.ventas_dias     : porDia;
  const rankList       = isSnap ? snapshot!.ranking         : ranking;

  /* ===================== UI ===================== */
  return (
    <div className="mx-auto max-w-[1250px] p-6 space-y-6">
      <header className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-end gap-3">
          <h1 className="text-2xl font-bold text-neutral-100">Panel de Información (Admin)</h1>
          <span className="text-sm text-neutral-400">• {monthName(year, month)}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100" value={year} onChange={e=>setYear(+e.target.value)}>
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100" value={month} onChange={e=>setMonth(+e.target.value)}>
            {Array.from({length:12}).map((_,i) => <option key={i+1} value={i+1}>{new Date(2020,i,1).toLocaleDateString('es-ES',{month:'long'})}</option>)}
          </select>

          {/* Guardar / Ver snapshot */}
          <button
            type="button"
            onClick={saveMonthlySnapshot}
            disabled={savingSnap || loading}
            className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 hover:bg-neutral-800 disabled:opacity-60"
          >
            {savingSnap ? 'Guardando…' : 'Guardar snapshot mensual'}
          </button>

          <button
            type="button"
            onClick={loadMonthlySnapshot}
            disabled={loadingSnap || loading}
            className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 hover:bg-neutral-800 disabled:opacity-60"
          >
            {loadingSnap ? 'Cargando…' : 'Ver snapshot guardado'}
          </button>

          {isSnap && (
            <button
              type="button"
              onClick={showLive}
              className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 hover:bg-neutral-800"
            >
              Ver datos en vivo
            </button>
          )}

          {/* Descargar snapshot desde el router */}
          <button
            type="button"
            onClick={() => downloadSnapshot('xlsx')}
            disabled={loadingSnap}
            className="rounded-md border border-emerald-700 bg-emerald-900/30 px-3 py-2 text-emerald-100 hover:bg-emerald-900 disabled:opacity-60"
            title="Descargar snapshot (XLSX desde API)"
          >
            XLSX DB
          </button>
          <button
            type="button"
            onClick={() => downloadSnapshot('csv')}
            disabled={loadingSnap}
            className="rounded-md border border-emerald-700 bg-emerald-900/30 px-3 py-2 text-emerald-100 hover:bg-emerald-900 disabled:opacity-60"
            title="Descargar snapshot (CSV desde API)"
          >
            CSV
          </button>

          {/* Descargar registros del mes (local) */}
          <button
            type="button"
            onClick={() => downloadRegistros('xlsx')}
            disabled={downloadingLocal}
            className="rounded-md border border-blue-700 bg-blue-900/30 px-3 py-2 text-blue-100 hover:bg-blue-900 disabled:opacity-60"
          >
            {downloadingLocal ? 'Generando…' : 'Registros (XLSX)'}
          </button>
          <button
            type="button"
            onClick={() => downloadRegistros('csv')}
            disabled={downloadingLocal}
            className="rounded-md border border-blue-700 bg-blue-900/30 px-3 py-2 text-blue-100 hover:bg-blue-900 disabled:opacity-60"
          >
            CSV
          </button>
        </div>
      </header>

      {msg   && <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-2 text-sm text-neutral-100">{msg}</div>}
      {dlMsg && <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-2 text-sm text-neutral-100">{dlMsg}</div>}
      {loading && <div className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-3 text-neutral-300">Cargando…</div>}
      {err     && <div className="rounded-lg border border-red-800/60 bg-red-950/40 p-3 text-red-200">Error: {err}</div>}

      {/* KPIs */}
      {!loading && !err && (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KPI title="Total vendido (mes)" value={`$ ${fmt(kpi_total)}`} />
            <KPI title="Total Pantallas (mes)" value={`$ ${fmt(kpi_pantallas)}`} />
            <KPI title="Total Cuentas completas (mes)" value={`$ ${fmt(kpi_completas)}`} />
            <KPI title="Clientes activos" value={fmt(kpi_activos)} />
          </section>

          {/* Total vendido por día */}
          <section className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-4">
            <div className="mb-2 text-sm font-semibold text-neutral-200">
              Total vendido por día — {monthName(year, month)} {isSnap && '(snapshot)'}
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={seriePorDia}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="completas" name="Cuentas completas" stackId="a" fill="#34d399" />
                  <Bar dataKey="pantallas" name="Pantallas"         stackId="a" fill="#60a5fa" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Ranking por plataforma */}
          <section className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-4">
            <div className="mb-2 text-sm font-semibold text-neutral-200">
              Plataformas más vendidas — {monthName(year, month)} {isSnap && '(snapshot)'}
            </div>
            <div className="overflow-auto rounded border border-neutral-800">
              <table className="min-w-[600px] w-full text-sm">
                <thead className="bg-neutral-900/70 sticky top-0 z-10">
                  <tr className="text-xs uppercase text-neutral-400">
                    <th className="text-left px-3 py-2">Plataforma</th>
                    <th className="text-right px-3 py-2">Unidades</th>
                    <th className="text-right px-3 py-2">Total $</th>
                  </tr>
                </thead>
                <tbody>
                  {rankList.map((r) => (
                    <tr key={`${r.pid}-${r.name}`} className="border-t border-neutral-800">
                      <td className="px-3 py-2">
                        <span className="inline-block h-2 w-2 rounded-full mr-2" style={{ background: colorForPid(r.pid) }} />
                        {r.name}
                      </td>
                      <td className="px-3 py-2 text-right">{fmt(r.count)}</td>
                      <td className="px-3 py-2 text-right">$ {fmt(r.total)}</td>
                    </tr>
                  ))}
                  {rankList.length === 0 && (
                    <tr><td colSpan={3} className="px-3 py-3 text-neutral-400 text-center">Sin ventas este mes.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Registros del mes (vista rápida) */}
          <section className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-4 space-y-4">
            <div className="text-sm font-semibold text-neutral-200">Registros (mes seleccionado)</div>
            <div className="overflow-auto rounded border border-neutral-800">
              <table className="min-w-[1000px] w-full text-sm">
                <thead className="bg-neutral-900/70 sticky top-0 z-10">
                  <tr className="text-xs uppercase text-neutral-400">
                    <th className="text-left px-3 py-2">Tipo</th>
                    <th className="text-left px-3 py-2">Contacto</th>
                    <th className="text-left px-3 py-2">Plataforma</th>
                    <th className="text-left px-3 py-2">Compra</th>
                    <th className="text-left px-3 py-2">Venc.</th>
                    <th className="text-right px-3 py-2">Total</th>
                    <th className="text-left px-3 py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {[...pantallas.filter(p=>isSameYearMonth(p.fecha_compra,year,month)).map(p => ({tipo:'Pantalla', c:p})) ,
                    ...completas.filter(c=>isSameYearMonth(c.fecha_compra,year,month)).map(c => ({tipo:'Completa', c})) ]
                    .map((row, i) => {
                      const r = row.c as Pantalla | CuentaCompleta;
                      return (
                        <tr key={i} className="border-t border-neutral-800">
                          <td className="px-3 py-2">{row.tipo}</td>
                          <td className="px-3 py-2">{(r as any).contacto}</td>
                          <td className="px-3 py-2">{platformName((r as any).plataforma_id)}</td>
                          <td className="px-3 py-2">{fmtDate((r as any).fecha_compra)}</td>
                          <td className="px-3 py-2">{fmtDate((r as any).fecha_vencimiento)}</td>
                          <td className="px-3 py-2 text-right">$ {fmt(toMoney((r as any).total_ganado))}</td>
                          <td className="px-3 py-2">{(r as any).estado ?? ''}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

/* ====================== KPI simple ====================== */
function KPI({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-4">
      <div className="text-xs uppercase tracking-wide text-neutral-400">{title}</div>
      <div className="mt-1 text-2xl font-bold text-neutral-100">{value}</div>
    </div>
  );
}
