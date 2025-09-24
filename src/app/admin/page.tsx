'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { usePlataformas } from '@/hooks/usePlataformas';


/* ======================================================================
   Recharts (solo cliente) — helpers dinámicos
   ====================================================================== */
const D = (name: keyof typeof import('recharts')) =>
  dynamic<any>(() => import('recharts').then((m) => (m as any)[name]), { ssr: false });

const ResponsiveContainer = D('ResponsiveContainer');
const BarChart            = D('BarChart');
const Bar                 = D('Bar');
const XAxis               = D('XAxis');
const YAxis               = D('YAxis');
const CartesianGrid       = D('CartesianGrid');
const Tooltip             = D('Tooltip');
const PieChart            = D('PieChart');
const Pie                 = D('Pie');


/* ======================================================================
   Tipos
   ====================================================================== */
export type Pantalla = {
  id: number;
  cuenta_id: number | null;
  contacto: string;
  nro_pantalla: string;
  fecha_compra?: string | null;
  fecha_vencimiento?: string | null;
  meses_pagados?: number | null;
  total_ganado?: number | string | null;
  estado?: string | null;
  plataforma_id?: number | null;
  correo?: string | null;
  contrasena?: string | null;
  cuenta?: { plataforma_id?: number | null; correo?: string | null; contrasena?: string | null } | null;
  cuentascompartidas?: { plataforma_id?: number | null; correo?: string | null; contrasena?: string | null } | null;
};

export type CuentaCompleta = {
  id: number;
  contacto: string;
  nombre?: string | null;
  correo?: string | null;
  contrasena?: string | null;
  fecha_compra?: string | null;
  fecha_vencimiento?: string | null;
  meses_pagados?: number | null;
  total_ganado?: number | string | null;
  estado?: string | null;
  plataforma_id?: number | null;
};

export type CuentaLite = { plataforma_id: number | null; correo: string | null; contrasena: string | null };

export type DayPoint = { day: string; total: number; pantallas: number; completas: number };
export type RankRow  = { name: string; count: number; total: number; pid?: number | null };

/* ====== Snapshot mensual ====== */
export type VentasDiaPlataformaItem = {
  day: string;              // '01'..'31'
  pid: number | null;       // null = sin plataforma
  tipo: 'C' | 'P';          // C = completas, P = pantallas
  total: number;
};

export type MonthlySnapshot = {
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
  ventas_dia_plataforma?: VentasDiaPlataformaItem[] | null;
};

/* ====== Serie de plataforma ====== */
type PlatformSeries = {
  perDayPerPlatform: Array<Record<string, any>>;
  monthPlatformKeys: string[];
};

/* ======================================================================
   Utils
   ====================================================================== */
const pad2 = (n: number) => String(n).padStart(2, '0');
const endOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const monthName = (y: number, m1to12: number) =>
  new Date(y, m1to12 - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

const isSameYearMonth = (iso?: string | null, y?: number, m1to12?: number) => {
  if (!iso || !y || !m1to12) return false;
  const d = new Date(iso);
  return d.getFullYear() === y && d.getMonth() + 1 === m1to12;
};
const isFutureOrToday = (iso?: string | null) => {
  if (!iso) return true;
  const a = new Date(new Date(iso).toDateString()).getTime();
  const b = new Date(new Date().toDateString()).getTime();
  return a >= b;
};
const toMoney = (v: number | string | null | undefined) =>
  v == null || v === '' || Number.isNaN(Number(v)) ? 0 : Number(v);

/* Paleta por plataforma + helpers */
const PLATFORM_COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f43f5e', '#14b8a6', '#eab308',
  '#a855f7', '#0ea5e9', '#10b981', '#fb923c', '#f472b6',
];
const TYPE_COLORS = { pantallas: '#60a5fa', completas: '#34d399' } as const;
const colorForPid = (pid?: number | null) => PLATFORM_COLORS[Math.abs(Number(pid ?? 0)) % PLATFORM_COLORS.length];
const withAlpha = (hex: string, a = 0.45) => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex) || [];
  const r = parseInt(m[1] || '0', 16), g = parseInt(m[2] || '0', 16), b = parseInt(m[3] || '0', 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

/* Helpers para manejar "Sin plataforma" */
const PID_NA = 'NA';
const pidKey = (pid: number | null | undefined) => (pid == null ? PID_NA : String(Number(pid)));
const labelForKey = (key: string, platformMap: Map<number, string>) =>
  key === PID_NA ? 'Sin plataforma' : (platformMap.get(Number(key)) ?? key);
const colorForKey = (key: string) => (key === PID_NA ? '#9ca3af' : colorForPid(Number(key)));

/* ======================================================================
   Normalización y fetch helpers
   ====================================================================== */
const pickCuentaInfo = (r: any): CuentaLite => ({
  plataforma_id: r?.plataforma_id ?? r?.cuenta?.plataforma_id ?? r?.cuentascompartidas?.plataforma_id ?? null,
  correo: r?.correo ?? r?.cuenta?.correo ?? r?.cuentascompartidas?.correo ?? null,
  contrasena: r?.contrasena ?? r?.cuenta?.contrasena ?? r?.cuentascompartidas?.contrasena ?? null,
});
function normalizePantallaRow(r: any): Pantalla {
  const info = pickCuentaInfo(r);
  return { ...r, plataforma_id: info.plataforma_id ?? null, correo: r?.correo ?? info.correo ?? null, contrasena: r?.contrasena ?? info.contrasena ?? null } as Pantalla;
}
async function fetchCuentaById(id: number) {
  let res = await fetch(`/api/cuentascompartidas/${id}`, { cache: 'no-store' });
  if (!res.ok) res = await fetch(`/api/cuentascompartidas?id=${id}`, { cache: 'no-store' });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  const obj = Array.isArray(data) ? data[0] : data;
  if (!obj) return null;
  return { plataforma_id: obj?.plataforma_id ?? null, correo: obj?.correo ?? null, contrasena: obj?.contrasena ?? null } as CuentaLite;
}

/* ======================================================================
   Component
   ====================================================================== */
export default function Page() {
  const { plataformas } = usePlataformas();

  const [pantallas, setPantallas] = useState<Pantalla[]>([]);
  const [completas, setCompletas] = useState<CuentaCompleta[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [tab, setTab] = useState<'resumen' | 'detalle'>('resumen');

  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [platformFilter, setPlatformFilter] = useState<number | 'all'>('all');

  const [snapshot, setSnapshot] = useState<MonthlySnapshot | null>(null);
  const [viewMode, setViewMode] = useState<'live' | 'snapshot'>('live');
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);
  const [snapErr, setSnapErr] = useState<string | null>(null);

  const [platformSeriesOverride, setPlatformSeriesOverride] = useState<PlatformSeries | null>(null);

  const [savingSnap, setSavingSnap] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const [exporting, setExporting] = useState(false);

  /* ======== Refs para capturar las gráficas ======== */
  const refGraficoPerPlatform = useRef<HTMLDivElement>(null);
  const refGraficoPie         = useRef<HTMLDivElement>(null);
  const refGraficoRanking     = useRef<HTMLDivElement>(null);
  const refGraficoDetalle     = useRef<HTMLDivElement>(null);

  /* Mapa id→nombre */
  const platformMap = useMemo(() => {
    const m = new Map<number, string>();
    plataformas.forEach((p) => m.set(p.id, (p as any).nombre ?? String(p.id)));
    return m;
  }, [plataformas]);

  /* Carga y normaliza */
  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true); setErr(null);
      try {
        const [pRes, cRes] = await Promise.all([
          fetch('/api/pantallas', { cache: 'no-store' }),
          fetch('/api/cuentascompletas', { cache: 'no-store' }),
        ]);
        if (!pRes.ok || !cRes.ok) throw new Error('No se pudieron cargar datos');

        const pRaw: any[] = await pRes.json();
        const cRaw: any[] = await cRes.json();

        let pantNorm: Pantalla[] = (Array.isArray(pRaw) ? pRaw : []).map(normalizePantallaRow);

        // Completar datos desde cuenta si faltan
        const need = pantNorm.filter((r) => r.cuenta_id && (r.plataforma_id == null || r.correo == null || r.contrasena == null));
        const ids = Array.from(new Set(need.map((r) => r.cuenta_id!).filter(Boolean)));
        if (ids.length) {
          const cache = new Map<number, CuentaLite | null>();
          await Promise.all(ids.map(async (id) => cache.set(id, await fetchCuentaById(id))));
          pantNorm = pantNorm.map((r) => {
            if (!r.cuenta_id) return r;
            const c = cache.get(r.cuenta_id);
            return c ? { ...r, plataforma_id: r.plataforma_id ?? c.plataforma_id, correo: r.correo ?? c.correo, contrasena: r.contrasena ?? c.contrasena } : r;
          });
        }

        const compNorm: CuentaCompleta[] = (Array.isArray(cRaw) ? cRaw : []).map((r: any) => ({
          ...r, plataforma_id: r?.plataforma_id == null ? null : Number(r?.plataforma_id),
        }));

        if (!cancel) { setPantallas(pantNorm); setCompletas(compNorm); }
      } catch (e: any) {
        if (!cancel) setErr(e?.message ?? 'Error al cargar');
      } finally { if (!cancel) setLoading(false); }
    })();
    return () => { cancel = true; };
  }, []);

  /* Años disponibles */
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    const add = (iso?: string | null) => { if (iso) years.add(new Date(iso).getFullYear()); };
    pantallas.forEach(p => { add(p.fecha_compra); add(p.fecha_vencimiento); });
    completas.forEach(c => { add(c.fecha_compra); add(c.fecha_vencimiento); });
    const arr = Array.from(years.values()).sort((a, b) => b - a);
    return arr.length ? arr : [now.getFullYear()];
  }, [pantallas, completas]);

  /* ===================== Agregaciones LIVE ===================== */
  const liveAgg = useMemo(() => {
    const diasMes = endOfMonth(new Date(year, month - 1, 1)).getDate();

    const pantFil = pantallas.filter((r) => isSameYearMonth(r.fecha_compra, year, month));
    const compFil = completas.filter((r) => isSameYearMonth(r.fecha_compra, year, month));

    const totalPant = pantFil.reduce((s, r) => s + toMoney(r.total_ganado), 0);
    const totalComp = compFil.reduce((s, r) => s + toMoney(r.total_ganado), 0);
    const total = totalPant + totalComp;

    const byDay = new Map<number, { total: number; pantallas: number; completas: number }>();
    for (let d = 1; d <= diasMes; d++) byDay.set(d, { total: 0, pantallas: 0, completas: 0 });
    pantFil.forEach((r) => { const d = new Date(r.fecha_compra!).getDate(); const v = toMoney(r.total_ganado); const o = byDay.get(d)!; o.total += v; o.pantallas += v; });
    compFil.forEach((r) => { const d = new Date(r.fecha_compra!).getDate(); const v = toMoney(r.total_ganado); const o = byDay.get(d)!; o.total += v; o.completas += v; });
    const serieDia: DayPoint[] = [...byDay.entries()].map(([d, v]) => ({ day: pad2(d), ...v }));

    const activosP = pantallas.filter((r) => isFutureOrToday(r.fecha_vencimiento)).length;
    const activosC = completas.filter((r) => isFutureOrToday(r.fecha_vencimiento)).length;

    // Ranking por plataforma
    const rankMap = new Map<string, RankRow>();
    const pushRank = (pid: number | null | undefined, value: number) => {
      const key = pidKey(pid);
      const name = labelForKey(key, platformMap);
      const cur = rankMap.get(name) ?? { name, count: 0, total: 0, pid: pid ?? null };
      cur.count += 1; cur.total += value;
      rankMap.set(name, cur);
    };
    pantFil.forEach((r) => pushRank(r.plataforma_id ?? null, toMoney(r.total_ganado)));
    compFil.forEach((r) => pushRank(r.plataforma_id ?? null, toMoney(r.total_ganado)));
    const rank = [...rankMap.values()].sort((a, b) => (b.count - a.count) || (b.total - a.total));

    // Por día y plataforma (C_ y P_)
    const keysSet = new Set<string>();
    pantFil.forEach(p => keysSet.add(pidKey(p.plataforma_id)));
    compFil.forEach(c => keysSet.add(pidKey(c.plataforma_id)));
    const pidKeys = [...keysSet.values()].sort((a, b) => (a === PID_NA ? 1 : b === PID_NA ? -1 : Number(a) - Number(b)));

    const perDayPlat: Array<Record<string, any>> = [];
    for (let d = 1; d <= diasMes; d++) {
      const row: Record<string, any> = { day: pad2(d) };
      pidKeys.forEach(k => { row[`C_${k}`] = 0; row[`P_${k}`] = 0; });
      perDayPlat.push(row);
    }
    pantFil.forEach((r) => {
      const d = new Date(r.fecha_compra!).getDate();
      perDayPlat[d-1][`P_${pidKey(r.plataforma_id)}`] += toMoney(r.total_ganado);
    });
    compFil.forEach((r) => {
      const d = new Date(r.fecha_compra!).getDate();
      perDayPlat[d-1][`C_${pidKey(r.plataforma_id)}`] += toMoney(r.total_ganado);
    });

    return {
      totalMes: total,
      totalMesPantallas: totalPant,
      totalMesCompletas: totalComp,
      porDia: serieDia,
      activosPantallas: activosP,
      activosCompletas: activosC,
      rankingPlataformas: rank,
      totalVentasMesCount: pantFil.length + compFil.length,
      perDayPerPlatform: perDayPlat,
      monthPlatformKeys: pidKeys,
    };
  }, [pantallas, completas, platformMap, year, month]);

  /* =========== Fuente: snapshot vs live =========== */
  const snapshotMatch =
    viewMode === 'snapshot' &&
    snapshot &&
    snapshot.year === year &&
    snapshot.month === month;

  const totalMes            = snapshotMatch ? snapshot!.total_general    : liveAgg.totalMes;
  const totalMesPantallas   = snapshotMatch ? snapshot!.total_pantallas  : liveAgg.totalMesPantallas;
  const totalMesCompletas   = snapshotMatch ? snapshot!.total_cuentas    : liveAgg.totalMesCompletas;
  const rankingPlataformas  = snapshotMatch ? snapshot!.ranking          : liveAgg.rankingPlataformas;
  const porDia              = snapshotMatch ? snapshot!.ventas_dias      : liveAgg.porDia;

  // ====== Serie por plataforma (elige snapshot si trae ventas_dia_plataforma) ======
  const platformSeries = useMemo<PlatformSeries>(() => {
    if (platformSeriesOverride) return platformSeriesOverride;
    if (!(snapshotMatch && snapshot?.ventas_dia_plataforma?.length)) {
      return { perDayPerPlatform: liveAgg.perDayPerPlatform, monthPlatformKeys: liveAgg.monthPlatformKeys };
    }
    const vdp = snapshot.ventas_dia_plataforma!;
    const diasMes = endOfMonth(new Date(year, month - 1, 1)).getDate();
    const keys = new Set<string>();
    vdp.forEach((r) => keys.add(pidKey(r.pid)));
    const monthPlatformKeys = [...keys.values()].sort((a, b) => (a === PID_NA ? 1 : b === PID_NA ? -1 : Number(a) - Number(b)));
    const perDayPerPlatform: Array<Record<string, any>> = [];
    for (let d = 1; d <= diasMes; d++) {
      const row: Record<string, any> = { day: pad2(d) };
      monthPlatformKeys.forEach(k => { row[`C_${k}`] = 0; row[`P_${k}`] = 0; });
      perDayPerPlatform.push(row);
    }
    vdp.forEach((r) => {
      const key = pidKey(r.pid);
      const idx = Math.max(1, Math.min(diasMes, Number(r.day))) - 1;
      perDayPerPlatform[idx][`${r.tipo}_${key}`] += r.total;
    });
    return { perDayPerPlatform, monthPlatformKeys };
  }, [platformSeriesOverride, snapshotMatch, snapshot, liveAgg.perDayPerPlatform, liveAgg.monthPlatformKeys, year, month]);

  const perDayPerPlatform   = platformSeries.perDayPerPlatform;
  const monthPlatformKeys   = platformSeries.monthPlatformKeys;

  const totalActivos        = snapshotMatch ? snapshot!.clientes_activos : (liveAgg.activosPantallas + liveAgg.activosCompletas);
  const activosPantallas    = liveAgg.activosPantallas;
  const activosCompletas    = liveAgg.activosCompletas;
  const totalVentasMesCount = liveAgg.totalVentasMesCount;

  /* ===================== Guardar snapshot ===================== */
  const saveMonthlySnapshot = useCallback(async () => {
    setSavingSnap(true);
    setSaveMsg(null);
    try {
      const ventas_dia_plataforma: VentasDiaPlataformaItem[] = [];
      perDayPerPlatform.forEach((row) => {
        const day = row.day as string;
        monthPlatformKeys.forEach((k) => {
          const pid = k === PID_NA ? null : Number(k);
          const c = Number(row[`C_${k}`] ?? 0);
          const p = Number(row[`P_${k}`] ?? 0);
          ventas_dia_plataforma.push({ day, pid, tipo: 'C', total: c });
          ventas_dia_plataforma.push({ day, pid, tipo: 'P', total: p });
        });
      });

      const payload = {
        year, month,
        total_general: totalMes,
        total_pantallas: totalMesPantallas,
        total_cuentas: totalMesCompletas,
        clientes_activos: totalActivos,
        ranking: rankingPlataformas.map(r => ({ name: r.name, count: r.count, total: r.total, pid: r.pid ?? null })),
        ventas_dias: porDia.map(d => ({ day: d.day, total: d.total, pantallas: d.pantallas, completas: d.completas })),
        ventas_cantidad: totalVentasMesCount,
        ventas_dia_plataforma,
      };

      const res = await fetch('/api/metricas-mensuales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let detail = '';
        try { detail = (await res.json())?.error || ''; } catch {}
        throw new Error(detail || `Error ${res.status}`);
      }

      const saved = await res.json();
      setSaveMsg(`Snapshot guardado (${saved.periodLabel}).`);
    } catch (e: any) {
      console.error(e);
      setSaveMsg(e?.message ?? 'Error al guardar snapshot');
    } finally {
      setSavingSnap(false);
    }
  }, [year, month, totalMes, totalMesPantallas, totalMesCompletas, totalActivos, rankingPlataformas, porDia, totalVentasMesCount, perDayPerPlatform, monthPlatformKeys]);

  /* ===================== Cargar snapshot ===================== */
  const loadMonthlySnapshot = useCallback(async () => {
    setLoadingSnapshot(true);
    setSnapErr(null);
    try {
      const res = await fetch(`/api/metricas-mensuales?year=${year}&month=${month}`, { cache: 'no-store' });
      if (res.status === 404) {
        setSnapshot(null);
        setViewMode('live');
        setSnapErr('No hay snapshot guardado para este mes.');
        return;
      }
      if (!res.ok) {
        let msg = '';
        try { msg = (await res.json())?.error || ''; } catch {}
        throw new Error(msg || `Error ${res.status}`);
      }
      const data: MonthlySnapshot = await res.json();

      let override: PlatformSeries | null = null;
      if (!data.ventas_dia_plataforma || data.ventas_dia_plataforma.length === 0) {
        const diasMes = endOfMonth(new Date(year, month - 1, 1)).getDate();
        const perDayPerPlatform: Array<Record<string, any>> = [];
        for (let d = 1; d <= diasMes; d++) perDayPerPlatform.push({ day: pad2(d), C_NA: 0, P_NA: 0 });
        (data.ventas_dias || []).forEach((r: any) => {
          const idx = Math.max(1, Math.min(diasMes, Number(r.day))) - 1;
          perDayPerPlatform[idx].C_NA += Number(r.completas || 0);
          perDayPerPlatform[idx].P_NA += Number(r.pantallas || 0);
        });
        override = { perDayPerPlatform, monthPlatformKeys: [PID_NA] };
      }
      setPlatformSeriesOverride(override);

      setSnapshot(data);
      setViewMode('snapshot');
      setSaveMsg(`Viendo snapshot guardado (${data.periodLabel}).`);
    } catch (e: any) {
      console.error(e);
      setSnapErr(e?.message ?? 'Error al cargar snapshot');
    } finally {
      setLoadingSnapshot(false);
    }
  }, [year, month]);

  const showLive = useCallback(() => {
    setViewMode('live');
    setSnapErr(null);
    setSaveMsg(null);
    setPlatformSeriesOverride(null);
  }, []);

  /* ===================== Helpers descarga segura ===================== */
  const saveBlob = useCallback(async (blob: Blob, filename: string) => {
    try {
      const mod = await import('file-saver'); // npm i file-saver
      mod.saveAs(blob, filename);
    } catch {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }, []);

  /* ===================== Exportar a Excel (datos) ===================== */
  const exportExcel = useCallback(async () => {
    try {
      setExporting(true);
      const XLSX = await import('xlsx');

      const period = `${year}-${pad2(month)}`;
      const fuente = snapshotMatch ? 'snapshot' : 'live';

      const kpis = [
        { KPI: 'Periodo', Valor: period },
        { KPI: 'Fuente', Valor: fuente },
        { KPI: 'Total general', Valor: totalMes },
        { KPI: 'Total pantallas', Valor: totalMesPantallas },
        { KPI: 'Total cuentas completas', Valor: totalMesCompletas },
        { KPI: 'Clientes activos', Valor: totalActivos },
        { KPI: 'Ventas (unidades)', Valor: totalVentasMesCount },
      ];

      const rankingRows = rankingPlataformas.map(r => ({ Plataforma: r.name, Unidades: r.count, Total: r.total, PlataformaId: r.pid ?? null }));
      const serieDiaRows = porDia.map(d => ({ Dia: d.day, Total: d.total, Pantallas: d.pantallas, Completas: d.completas }));

      const perDayPlatRows: Array<Record<string, any>> = [];
      perDayPerPlatform.forEach(row => {
        const day = row.day as string;
        monthPlatformKeys.forEach(k => {
          perDayPlatRows.push({ Dia: day, Tipo: 'Cuentas completas', Plataforma: labelForKey(k, platformMap), Total: row[`C_${k}`] ?? 0 });
          perDayPlatRows.push({ Dia: day, Tipo: 'Pantallas', Plataforma: labelForKey(k, platformMap), Total: row[`P_${k}`] ?? 0 });
        });
      });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kpis), 'KPIs');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rankingRows), 'Ranking');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(serieDiaRows), 'Ventas_dia_total');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(perDayPlatRows), 'Ventas_dia_plataforma');

      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      await saveBlob(blob, `panel-${fuente}-${period}.xlsx`);
    } catch (e: any) {
      console.error(e);
      setSaveMsg(e?.message ?? 'No se pudo exportar a Excel');
    } finally {
      setExporting(false);
    }
  }, [year, month, snapshotMatch, totalMes, totalMesPantallas, totalMesCompletas, totalActivos, totalVentasMesCount, rankingPlataformas, porDia, perDayPerPlatform, monthPlatformKeys, platformMap, saveBlob]);

  /* ===================== Exportar a Excel (con gráficas) ===================== */
  const exportExcelConGraficas = useCallback(async () => {
    try {
      setExporting(true);

      // ExcelJS en navegador (fallback a bundle min si el principal falla)
      let Excel: any;
      try {
        Excel = await import('exceljs');
      } catch {
        const Excel = await import('exceljs');
      }
      const WorkbookCtor = Excel?.Workbook ?? Excel?.default?.Workbook;
      if (!WorkbookCtor) throw new Error('No se pudo cargar ExcelJS (Workbook).');

      const { toPng } = await import('html-to-image');

      const wb = new WorkbookCtor();
      const period = `${year}-${pad2(month)}`;
      const fuente = snapshotMatch ? 'snapshot' : 'live';

      /* ===== Hoja KPIs ===== */
      const wsKPI = wb.addWorksheet('KPIs');
      wsKPI.addRows([
        ['KPI', 'Valor'],
        ['Periodo', period],
        ['Fuente',  fuente],
        ['Total general', totalMes],
        ['Total pantallas', totalMesPantallas],
        ['Total cuentas completas', totalMesCompletas],
        ['Clientes activos', totalActivos],
        ['Ventas (unidades)', totalVentasMesCount],
      ]);
      wsKPI.getRow(1).font = { bold: true };

      /* ===== Hoja Ranking ===== */
      const wsRanking = wb.addWorksheet('Ranking');
      wsRanking.addRows([['Plataforma', 'Unidades', 'Total', 'PlataformaId']]);
      wsRanking.getRow(1).font = { bold: true };
      rankingPlataformas.forEach(r => wsRanking.addRow([r.name, r.count, r.total, r.pid ?? null]));

      /* ===== Hoja Ventas_dia_total ===== */
      const wsDiaTot = wb.addWorksheet('Ventas_dia_total');
      wsDiaTot.addRows([['Dia', 'Total', 'Pantallas', 'Completas']]);
      wsDiaTot.getRow(1).font = { bold: true };
      porDia.forEach(d => wsDiaTot.addRow([d.day, d.total, d.pantallas, d.completas]));

      /* ===== Hoja Ventas_dia_plataforma ===== */
      const wsDiaPlat = wb.addWorksheet('Ventas_dia_plataforma');
      wsDiaPlat.addRows([['Dia', 'Tipo', 'Plataforma', 'Total']]);
      wsDiaPlat.getRow(1).font = { bold: true };
      perDayPerPlatform.forEach(row => {
        const day = String(row.day);
        monthPlatformKeys.forEach(k => {
          wsDiaPlat.addRow([day, 'Cuentas completas', labelForKey(k, platformMap), row[`C_${k}`] ?? 0]);
          wsDiaPlat.addRow([day, 'Pantallas',         labelForKey(k, platformMap), row[`P_${k}`] ?? 0]);
        });
      });

      /* ===== Hoja Gráficas ===== */
      const wsImgs = wb.addWorksheet('Gráficas');

      const capture = async (node: HTMLElement | null, width = 1000, height = 450) => {
        if (!node) return null;
        // Si un chart está oculto (p.ej. en otra tab), saldrá null
        return await toPng(node, { cacheBust: true, width, height, style: { background: '#ffffff' } });
      };
      const strip = (dataUrl: string | null) => (dataUrl ? dataUrl.split(',')[1] ?? null : null);

      const [imgPerPlat, imgPie, imgRanking, imgDetalle] = await Promise.all([
        capture(refGraficoPerPlatform.current),
        capture(refGraficoPie.current),
        capture(refGraficoRanking.current),
        capture(refGraficoDetalle.current),
      ]);

      let rowCursor = 1;
      const place = (dataUrl: string | null, title: string) => {
        wsImgs.mergeCells(rowCursor, 1, rowCursor, 10);
        wsImgs.getCell(rowCursor, 1).value = title;
        wsImgs.getCell(rowCursor, 1).font = { bold: true };
        rowCursor += 1;

        const base64 = strip(dataUrl);
        if (!base64) {
          wsImgs.getCell(rowCursor, 1).value = 'No disponible (la sección puede estar oculta)';
          rowCursor += 20;
          return;
        }
        const imageId = wb.addImage({ base64, extension: 'png' });
        wsImgs.addImage(imageId, {
          tl: { col: 0, row: rowCursor - 1 },
          ext: { width: 1000, height: 450 },
          editAs: 'oneCell',
        });
        rowCursor += 24;
      };

      place(imgPerPlat, `Ventas por día por plataforma — ${monthName(year, month)}`);
      place(imgPie,     'Distribución por tipo (mes)');
      place(imgRanking, `Plataformas más vendidas — ${monthName(year, month)}`);
      place(imgDetalle, `Detalle — Total vendido por día (${monthName(year, month)})`);

      const buf: ArrayBuffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      await saveBlob(blob, `panel-${fuente}-${period}-con-graficas.xlsx`);
    } catch (e: any) {
      console.error(e);
      setSaveMsg(e?.message ?? 'No se pudo exportar el Excel con gráficas');
    } finally {
      setExporting(false);
    }
  }, [year, month, snapshotMatch, totalMes, totalMesPantallas, totalMesCompletas, totalActivos, totalVentasMesCount, rankingPlataformas, porDia, perDayPerPlatform, monthPlatformKeys, platformMap, saveBlob]);

  /* ===================== Serie Detalle por día (filtro plataforma) ===================== */
  const detalleDia = useMemo<DayPoint[]>(() => {
    const dias = endOfMonth(new Date(year, month - 1, 1)).getDate();
    const byDay = new Map<number, { total: number; pantallas: number; completas: number }>();
    for (let d = 1; d <= dias; d++) byDay.set(d, { total: 0, pantallas: 0, completas: 0 });

    if (platformFilter === 'all') {
      porDia.forEach((r) => {
        const d = Number(r.day);
        const o = byDay.get(d)!;
        o.total += r.total; o.pantallas += r.pantallas; o.completas += r.completas;
      });
    } else {
      const match = (pid?: number | null) => Number(pid ?? -1) === Number(platformFilter);
      pantallas.forEach((r) => {
        if (!isSameYearMonth(r.fecha_compra, year, month)) return;
        if (!match(r.plataforma_id)) return;
        const d = new Date(r.fecha_compra!).getDate();
        const v = toMoney(r.total_ganado);
        const o = byDay.get(d)!; o.total += v; o.pantallas += v;
      });
      completas.forEach((r) => {
        if (!isSameYearMonth(r.fecha_compra, year, month)) return;
        if (!match(r.plataforma_id)) return;
        const d = new Date(r.fecha_compra!).getDate();
        const v = toMoney(r.total_ganado);
        const o = byDay.get(d)!; o.total += v; o.completas += v;
      });
    }

    return [...byDay.entries()].map(([d, v]) => ({ day: pad2(d), ...v }));
  }, [pantallas, completas, year, month, platformFilter, porDia]);

  const fmt = (n: number) => new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);

  /* ===================== UI ===================== */
  return (
    <div className="mx-auto max-w-[1400px] p-6 space-y-6">
      <header className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-end gap-3">
          <h1 className="text-2xl font-bold text-neutral-100">Panel de Información (Admin)</h1>
          <span className="text-sm text-neutral-400">• {monthName(year, month)}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Año / Mes */}
          <select className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {Array.from({ length: 12 }).map((_, i) => {
              const m = i + 1;
              return <option key={m} value={m}>{new Date(2020, i, 1).toLocaleDateString('es-ES', { month: 'long' })}</option>;
            })}
          </select>

          <button
            type="button"
            onClick={saveMonthlySnapshot}
            disabled={savingSnap || loading}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 hover:bg-neutral-800 disabled:opacity-60"
          >
            {savingSnap ? 'Guardando…' : 'Guardar snapshot mensual'}
          </button>

          <button
            type="button"
            onClick={loadMonthlySnapshot}
            disabled={loadingSnapshot || loading}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 hover:bg-neutral-800 disabled:opacity-60"
          >
            {loadingSnapshot ? 'Cargando…' : 'Ver snapshot guardado'}
          </button>

          {viewMode === 'snapshot' && (
            <button
              type="button"
              onClick={showLive}
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 hover:bg-neutral-800"
            >
              Ver datos en vivo
            </button>
          )}

          <button
            type="button"
            onClick={exportExcel}
            disabled={exporting}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 hover:bg-neutral-800 disabled:opacity-60"
          >
            {exporting ? 'Exportando…' : 'Exportar a Excel'}
          </button>

          <button
            type="button"
            onClick={exportExcelConGraficas}
            disabled={exporting}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 hover:bg-neutral-800 disabled:opacity-60"
          >
            {exporting ? 'Exportando…' : 'Exportar Excel (con gráficas)'}
          </button>
        </div>
      </header>

      {/* Mensajes */}
      {viewMode === 'snapshot' && snapshot && (
        <div className="space-y-2">
          <div className="rounded-lg border border-emerald-700 bg-emerald-900/30 p-3 text-sm text-emerald-100">
            Viendo snapshot: <strong>{snapshot.periodLabel}</strong>.
          </div>
          {platformSeriesOverride && (
            <div className="rounded-lg border border-amber-700 bg-amber-900/30 p-3 text-xs text-amber-100">
              Este snapshot no incluye <code>ventas_dia_plataforma</code>. Mostramos totales diarios por tipo.
            </div>
          )}
        </div>
      )}
      {snapErr && (
        <div className="rounded-lg border border-amber-700 bg-amber-900/30 p-3 text-sm text-amber-100">{snapErr}</div>
      )}
      {saveMsg && <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-3 text-sm text-neutral-100">{saveMsg}</div>}
      {loading  && <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4 text-sm text-neutral-300">Cargando…</div>}
      {err      && <div className="rounded-xl border border-red-800/50 bg-red-950/30 p-4 text-sm text-red-200">Error: {err}</div>}

      {/* Tabs */}
      <div className="flex gap-2">
        <button className={`rounded-md px-3 py-2 text-sm border ${tab === 'resumen' ? 'bg-neutral-800 border-neutral-600' : 'bg-neutral-900 border-neutral-700 hover:bg-neutral-800'}`} onClick={() => setTab('resumen')}>Resumen</button>
        <button className={`rounded-md px-3 py-2 text-sm border ${tab === 'detalle' ? 'bg-neutral-800 border-neutral-600' : 'bg-neutral-900 border-neutral-700 hover:bg-neutral-800'}`} onClick={() => setTab('detalle')}>Total vendido por día</button>
      </div>

      {/* ==================== TAB RESUMEN ==================== */}
      {!loading && !err && tab === 'resumen' && (
        <>
          {/* KPIs */}
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KPI title="Total vendido (mes)" value={`$ ${fmt(totalMes)}`} />
            <KPI title="Total Pantallas (mes)" value={`$ ${fmt(totalMesPantallas)}`} />
            <KPI title="Total Cuentas completas (mes)" value={`$ ${fmt(totalMesCompletas)}`} />
            <KPI title="Clientes activos" value={fmt(totalActivos)} sub={`${fmt(activosPantallas)} pantallas / ${fmt(activosCompletas)} completas`} />
          </section>

          {/* Ventas por día por plataforma */}
          <section className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-4">
            <div className="flex items-center justify-between">
              <h3 className="mb-3 text-sm font-semibold text-neutral-200">Ventas por día por plataforma — {monthName(year, month)}</h3>
              <div className="flex items-center gap-3 text-xs text-neutral-300">
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block h-3 w-3 rounded-sm" style={{ background: '#000', border: `2px solid ${TYPE_COLORS.completas}` }} />
                  Cuentas completas (sólido)
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block h-3 w-3 rounded-sm" style={{ background: 'transparent', border: `2px solid ${TYPE_COLORS.pantallas}`, backgroundColor: 'rgba(96,165,250,.35)' }} />
                  Pantallas (transparente)
                </span>
              </div>
            </div>

            {/* Leyenda de plataformas */}
            <div className="mb-4 flex flex-wrap gap-2 max-h-20 overflow-auto pr-2">
              {monthPlatformKeys.map(k => (
                <span key={k} className="inline-flex items-center gap-2 rounded-full border border-neutral-700 px-2 py-1 text-xs text-neutral-200">
                  <span className="inline-block h-3 w-3 rounded-full" style={{ background: colorForKey(k) }} />
                  {labelForKey(k, platformMap)}
                </span>
              ))}
              {monthPlatformKeys.length === 0 && <span className="text-xs text-neutral-400">No hay ventas este mes.</span>}
            </div>

            <div className="h-80" ref={refGraficoPerPlatform}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={perDayPerPlatform} barCategoryGap="30%" barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  {/* cluster 1: COMPLETAS */}
                  {monthPlatformKeys.map(k => (
                    <Bar key={`C_${k}`} dataKey={`C_${k}`} stackId="C" name={`${labelForKey(k, platformMap)} — Cuentas`} fill={colorForKey(k)} />
                  ))}
                  {/* cluster 2: PANTALLAS */}
                  {monthPlatformKeys.map(k => (
                    <Bar key={`P_${k}`} dataKey={`P_${k}`} stackId="P" name={`${labelForKey(k, platformMap)} — Pantallas`} fill={withAlpha(colorForKey(k), 0.45)} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Pie por tipo */}
          <section className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-4">
            <h3 className="mb-3 text-sm font-semibold text-neutral-200">Distribución por tipo (mes)</h3>
            <div className="h-72" ref={refGraficoPie}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip />
                  <Pie
                    data={[
                      { name: 'Cuentas completas', value: totalMesCompletas, fill: (TYPE_COLORS as any).completas },
                      { name: 'Pantallas', value: totalMesPantallas, fill: (TYPE_COLORS as any).pantallas },
                    ]}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Ranking por plataforma */}
          <section className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-4">
            <h3 className="mb-3 text-sm font-semibold text-neutral-200">Plataformas más vendidas — {monthName(year, month)}</h3>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2 h-72" ref={refGraficoRanking}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={rankingPlataformas.map((r) => ({ name: r.name, count: r.count, pid: r.pid, fill: colorForPid(r.pid) }))}
                    margin={{ left: 12, right: 12 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" name="Ventas (unidades)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div>
                <table className="w-full table-fixed text-sm">
                  <thead>
                    <tr className="text-neutral-400 text-xs uppercase">
                      <th className="text-left py-1">Plataforma</th>
                      <th className="text-right py-1">Unid.</th>
                      <th className="text-right py-1">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankingPlataformas.map((r) => (
                      <tr key={r.name} className="border-t border-neutral-800">
                        <td className="py-1 pr-2">
                          <span className="inline-block h-2 w-2 rounded-full mr-2" style={{ background: colorForPid(r.pid) }} />
                          {r.name}
                        </td>
                        <td className="py-1 text-right">{r.count}</td>
                        <td className="py-1 text-right">$ {fmt(r.total)}</td>
                      </tr>
                    ))}
                    {rankingPlataformas.length === 0 && (
                      <tr><td colSpan={3} className="py-3 text-neutral-400">Sin ventas este mes.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}

      {/* ==================== TAB DETALLE ==================== */}
      {!loading && !err && tab === 'detalle' && (
        <section className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-sm font-semibold text-neutral-200">Total vendido por día — {monthName(year, month)}</h3>
            <div className="ml-auto flex items-center gap-2">
              <label className="text-xs text-neutral-400">Plataforma</label>
              <select
                className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100"
                value={platformFilter === 'all' ? 'all' : String(platformFilter)}
                onChange={(e) => setPlatformFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              >
                <option value="all">Todas</option>
                {Array.from(new Set([
                  ...pantallas.map(p => p.plataforma_id).filter(Boolean) as number[],
                  ...completas.map(c => c.plataforma_id).filter(Boolean) as number[],
                ])).map(pid => (
                  <option key={pid} value={pid}>{platformMap.get(pid) ?? pid}</option>
                ))}
              </select>
            </div>
          </div>

          {/* chips por día */}
          <div className="overflow-x-auto -mx-2 px-2">
            <div className="flex gap-2 min-w-max">
              {detalleDia
                .filter(d => (d.completas + d.pantallas) > 0)
                .map(d => (
                <div key={d.day} className="w-[150px] rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2">
                  <div className="text-[11px] uppercase tracking-wide text-neutral-400">Día {d.day}</div>
                  <div className="mt-0.5 text-xl font-bold text-neutral-100">$ {fmt(d.completas + d.pantallas)}</div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-neutral-300">
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ background: (TYPE_COLORS as any).completas }} />
                      $ {fmt(d.completas)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ background: (TYPE_COLORS as any).pantallas }} />
                      $ {fmt(d.pantallas)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="h-80" ref={refGraficoDetalle}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={detalleDia}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="completas" name="Cuentas completas" fill={(TYPE_COLORS as any).completas} />
                <Bar dataKey="pantallas" name="Pantallas" fill={(TYPE_COLORS as any).pantallas} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  );
}

/* ======================================================================
   KPI simple
   ====================================================================== */
function KPI({ title, value, sub }: { title: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-4">
      <div className="text-xs uppercase tracking-wide text-neutral-400">{title}</div>
      <div className="mt-1 text-2xl font-bold text-neutral-100">{value}</div>
      {sub && <div className="mt-1 text-xs text-neutral-400">{sub}</div>}
    </div>
  );
}
