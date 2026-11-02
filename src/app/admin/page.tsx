'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import AdminSalesSummary from '@/components/AdminSalesSummary';
import { useAccountDataRefresh } from '@/hooks/useAccountDataRefresh';
import { todayYMDBogota } from '@/lib/bogotaDate';

const chart = (name: keyof typeof import('recharts')) => dynamic<any>(() => import('recharts').then(m => m[name] as any), { ssr: false });
const ResponsiveContainer = chart('ResponsiveContainer');
const BarChart = chart('BarChart');
const Bar = chart('Bar');
const XAxis = chart('XAxis');
const YAxis = chart('YAxis');
const CartesianGrid = chart('CartesianGrid');
const Tooltip = chart('Tooltip');
type Snapshot = {
  year: number; month: number; periodLabel: string; source: 'live' | 'snapshot'; provenance: string;
  total_general: number; total_pantallas: number; total_cuentas: number;
  pantallas_vendidas: number; cuentas_vendidas: number; clientes_activos: number;
  costos: number | null; ganancia_neta: number | null;
  ventas_dias: { day: string; total: number; pantallas: number; completas: number }[];
  ranking: { name: string; count: number; total: number }[];
};
type AnnualPoint = { month: number; label: string; cuentas_completas: number; pantallas: number; total: number; ingresos: number; ganancia_neta: number | null };
const fmt = (value: number) => value.toLocaleString('es-CO', { maximumFractionDigits: 2 });
const periodName = (year: number, month: number) => new Date(Date.UTC(year, month - 1, 2)).toLocaleDateString('es-CO', { month: 'long', year: 'numeric', timeZone: 'America/Bogota' });
const buttonClass = 'rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 hover:bg-neutral-800 disabled:opacity-40';

export default function AdminPage() {
  const today = todayYMDBogota();
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const [month, setMonth] = useState(Number(today.slice(5, 7)));
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [annualOpen, setAnnualOpen] = useState(false);
  const [annual, setAnnual] = useState<AnnualPoint[]>([]);
  const [annualError, setAnnualError] = useState<string | null>(null);
  const [annualLoading, setAnnualLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const requestId = useRef(0);
  useAccountDataRefresh(() => setRevision(r => r + 1));
  const currentPeriod = `${year}-${String(month).padStart(2, '0')}`;
  const selected = data?.periodLabel === currentPeriod ? data : null;

  useEffect(() => {
    const abort = new AbortController();
    async function load() {
      const id = ++requestId.current;
      setLoading(true); setError(null);
      try {
        const response = await fetch(`/api/metricas-mensuales?year=${year}&month=${month}`, { cache: 'no-store', signal: abort.signal });
        const result = await response.json();
        if (id !== requestId.current || abort.signal.aborted) return;
        if (!response.ok) throw Error(result.detail ?? 'No se pudo consultar el período.');
        setData(result);
      } catch (e) {
        if (id === requestId.current && !abort.signal.aborted) { setData(null); setError(e instanceof Error ? e.message : 'Error al consultar el período.'); }
      } finally { if (id === requestId.current && !abort.signal.aborted) setLoading(false); }
    }
    setData(null);
    void load();
    const timer = currentPeriod === today.slice(0, 7) ? setInterval(() => void load(), 30000) : undefined;
    return () => { abort.abort(); clearInterval(timer); };
  }, [year, month, revision, currentPeriod, today]);

  useEffect(() => {
    if (!annualOpen) return;
    const abort = new AbortController();
    setAnnualLoading(true); setAnnualError(null); setAnnual([]);
    fetch(`/api/metricas-mensuales?year=${year}&annual=1`, { cache: 'no-store', signal: abort.signal })
      .then(async r => { if (!r.ok) throw Error('No se pudo consultar el crecimiento anual.'); return r.json(); })
      .then(r => { if (!abort.signal.aborted) setAnnual(r.months); })
      .catch(e => { if (!abort.signal.aborted) setAnnualError(e.message); })
      .finally(() => { if (!abort.signal.aborted) setAnnualLoading(false); });
    return () => abort.abort();
  }, [year, annualOpen, revision]);

  const download = useCallback(async (format: 'csv' | 'xlsx') => {
    setDownloading(true); setError(null);
    try {
      const response = await fetch(`/api/metricas-mensuales?year=${year}&month=${month}&format=${format}`, { cache: 'no-store' });
      if (!response.ok) { const result = await response.json(); throw Error(result.detail ?? 'No se pudo exportar el período.'); }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a'); link.href = url; link.download = `metricas-${currentPeriod}.${format}`;
      document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setError(e instanceof Error ? e.message : 'Error de exportación.'); }
    finally { setDownloading(false); }
  }, [year, month, currentPeriod]);

  const annualSeries = Array.from({ length: 12 }, (_, index) => {
    const saved = annual.find(r => r.month === index + 1);
    return saved ?? { month: index + 1, label: periodName(year, index + 1), cuentas_completas: null, pantallas: null, total: null, ingresos: null, ganancia_neta: null };
  });
  return <div className="mx-auto max-w-[1250px] p-6 space-y-6">
    <nav aria-label="Administración" className="flex flex-wrap gap-3 text-sky-300"><Link href="/admin">📊 Dashboard</Link><Link href="/">👥 Gestión de cuentas</Link><Link href="/admin/deletions">🗑️ Historial de eliminaciones</Link><Link href="/admin/settings">⚙️ Configuración</Link></nav>
    <AdminSalesSummary />
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold">Panel de Información (Admin)</h1><p className="text-sm text-neutral-400">{periodName(year, month)}</p></div>
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Año" className={buttonClass} value={year} onChange={e => setYear(Number(e.target.value))}>{Array.from({ length: Number(today.slice(0, 4)) - 1999 }, (_, i) => Number(today.slice(0, 4)) - i).map(y => <option key={y}>{y}</option>)}</select>
        <select aria-label="Mes" className={buttonClass} value={month} onChange={e => setMonth(Number(e.target.value))}>{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(2020, i, 1).toLocaleDateString('es-CO', { month: 'long' })}</option>)}</select>
        <span role="status" className="rounded-md border border-sky-700/60 px-3 py-2 text-sm">{loading ? 'Consultando período…' : selected ? selected.source === 'live' ? 'Datos en vivo' : 'Snapshot histórico guardado' : 'Historial no disponible'}</span>
        <button className={buttonClass} onClick={() => setAnnualOpen(!annualOpen)} aria-expanded={annualOpen}>{annualOpen ? 'Ocultar crecimiento anual' : 'Ver crecimiento anual'}</button>
        <button className={buttonClass} disabled={!selected || loading || downloading} onClick={() => void download('xlsx')}>XLSX</button>
        <button className={buttonClass} disabled={!selected || loading || downloading} onClick={() => void download('csv')}>CSV</button>
      </div>
    </header>
    {error && <p role="alert" className="rounded-lg border border-amber-700 p-3 text-amber-200">{error}</p>}
    {selected?.provenance === 'legacy-unverified' && <p className="text-sm text-amber-200">Cierre anterior conservado. Sus cifras requieren cotejo con los registros o respaldos originales; no se recalculan desde cuentas actuales.</p>}
    {selected?.source === 'live' && <p className="text-sm text-neutral-400">Actualización cada 30 segundos. El mes de instalación puede tener cobertura parcial; los meses anteriores requieren evidencia para su recuperación.</p>}
    {selected && <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Total vendido (mes)', `$ ${fmt(selected.total_general)}`],
          ['Costos (mes)', selected.costos == null ? 'No disponible' : `$ ${fmt(selected.costos)}`],
          ['Ganancia neta (mes)', selected.ganancia_neta == null ? 'No disponible' : `$ ${fmt(selected.ganancia_neta)}`],
          ['Ingresos por pantallas', `$ ${fmt(selected.total_pantallas)}`],
          ['Ingresos por cuentas', `$ ${fmt(selected.total_cuentas)}`],
          ['Pantallas vendidas', fmt(selected.pantallas_vendidas)],
          ['Cuentas vendidas', fmt(selected.cuentas_vendidas)],
          ['Clientes activos', fmt(selected.clientes_activos)],
        ].map(([label, value]) => <div key={label} className="rounded-2xl border border-neutral-800 p-4"><p className="text-xs uppercase text-neutral-400">{label}</p><p className="text-2xl font-bold">{value}</p></div>)}
      </section>
      <section className="rounded-2xl border border-neutral-800 p-4"><h2 className="mb-3 font-semibold">Total vendido por día — {periodName(year, month)}</h2>
        <div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={selected.ventas_dias}><CartesianGrid stroke="#333" strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis /><Tooltip /><Bar dataKey="completas" name="Cuentas completas" stackId="sales" fill="#2ac99a" /><Bar dataKey="pantallas" name="Pantallas" stackId="sales" fill="#60a5fa" /></BarChart></ResponsiveContainer></div>
      </section>
      <section className="rounded-2xl border border-neutral-800 p-4"><h2 className="mb-3 font-semibold">Plataformas más vendidas — {periodName(year, month)}</h2>
        <table className="w-full text-left text-sm"><thead><tr><th>Plataforma</th><th>Unidades</th><th>Ingresos</th></tr></thead><tbody>{selected.ranking.map((r, i) => <tr key={i}><td className="py-2">{r.name}</td><td>{r.count}</td><td>$ {fmt(r.total)}</td></tr>)}</tbody></table>
      </section>
    </>}
    {annualOpen && <section className="rounded-2xl border border-neutral-800 p-4"><h2 className="font-semibold">Crecimiento anual — {year}</h2><p className="mb-3 text-sm text-neutral-400">Solo snapshots históricos guardados. Los meses sin cierre aparecen vacíos.</p>
      {annualLoading ? <p>Cargando cierres…</p> : annualError ? <p role="alert">{annualError}</p> : <div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={annualSeries}><CartesianGrid stroke="#333" strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Bar dataKey="cuentas_completas" name="Cuentas completas" stackId="units" fill="#2ac99a" /><Bar dataKey="pantallas" name="Pantallas" stackId="units" fill="#60a5fa" /></BarChart></ResponsiveContainer></div>}
      {!annualLoading && !annualError && <><h3 className="mt-4 font-semibold">Ingresos y ganancia neta por mes</h3><div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={annualSeries}><CartesianGrid stroke="#333" strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Bar dataKey="ingresos" name="Ingresos" fill="#60a5fa" /><Bar dataKey="ganancia_neta" name="Ganancia neta" fill="#2ac99a" /></BarChart></ResponsiveContainer></div></>}
    </section>}
  </div>;
}
