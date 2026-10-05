"use client";
import { useAccountDataRefresh } from "@/hooks/useAccountDataRefresh";
import { readCurrentAccountData } from "@/lib/accountDataChanges";

import { useEffect, useState } from "react";
import SalesMetricsPanel from "./SalesMetricsPanel";
import { AlertTriangle, ArrowRight, CalendarClock, PackageCheck, RefreshCw, Sparkles } from "lucide-react";

type StockRotation = { name: string; stock: number; sales: number; priority: "high" | "medium" | "normal" };
type DashboardData = {
  salesToday: number;
  activeScreens: number; expiringSoon: number; pendingAttention: number; businessDate: string;
  topServices: { name: string; count: number }[]; lowStock: { name: string; count: number }[];
  stockRotation: StockRotation[];
};
type DashboardView = "ver-pantalla" | "ver-cuentas-vencidas";

export default function OperationsDashboard({ onNavigate }: { onNavigate: (view: DashboardView) => void }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setRefreshing(true); setError("");
    try {
      const json = await readCurrentAccountData(async () => {
        const response = await fetch("/api/dashboard", { cache: "no-store" });
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || "No fue posible cargar el dashboard");
        return json;
      });
      setData(json);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No fue posible cargar el dashboard");
    } finally { setRefreshing(false); }
  }

  useAccountDataRefresh(load);
  useEffect(() => { void load(); }, []);

  if (error) return <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-rose-100">
    <p className="font-semibold">No pudimos cargar el resumen operativo.</p><p className="mt-1 text-sm text-rose-200/80">{error}</p>
    <button type="button" onClick={load} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"><RefreshCw size={17} /> Reintentar</button>
  </div>;
  if (!data) return <DashboardSkeleton />;


  return <div className="space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="inline-flex items-center gap-2 text-sm font-semibold text-sky-300"><Sparkles size={16} /> Resumen operativo</div><h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">Centro de operación</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-400">Indicadores comerciales y alertas para decidir dónde enfocar el trabajo de hoy.</p></div><button type="button" onClick={load} disabled={refreshing} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-neutral-200 transition hover:border-white/20 hover:bg-white/10 disabled:opacity-50"><RefreshCw size={16} className={refreshing ? "animate-spin" : ""} /> Actualizar</button></header>

    <SalesMetricsPanel data={data} dailyOnly />

    <section className="grid gap-3 lg:grid-cols-3">
      <DashboardAction icon={<PackageCheck size={22} />} value={data.activeScreens} label="Pantallas activas" hint={`Vencen después de ${data.businessDate}`} tone="emerald" onClick={() => onNavigate("ver-pantalla")} />
      <DashboardAction icon={<CalendarClock size={22} />} value={data.expiringSoon} label="Vencen en 7 días" hint="Abrir gestión de vencimientos" tone="amber" onClick={() => onNavigate("ver-cuentas-vencidas")} />
      <DashboardAction icon={<AlertTriangle size={22} />} value={data.pendingAttention} label="Pendientes de atención" hint="Incluye servicios que vencen hoy" tone="rose" onClick={() => onNavigate("ver-cuentas-vencidas")} />
    </section>

    <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:p-5"><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><h3 className="text-lg font-semibold text-white">Servicios con stock y baja rotación</h3><p className="mt-1 text-sm text-neutral-400">Prioriza servicios disponibles con pocas ventas durante el mes.</p></div><span className="text-xs text-neutral-500">Ordenados por menor rotación</span></div>
      {data.stockRotation.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{data.stockRotation.map((service) => <StockCard key={service.name} service={service} />)}</div> : <div className="mt-4 rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-neutral-400">No hay servicios disponibles en inventario.</div>}
    </section>

    <section className="grid gap-4 lg:grid-cols-2"><article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"><h3 className="font-semibold text-white">Servicios más vendidos</h3><div className="mt-4 space-y-3">{data.topServices.length ? data.topServices.map((item, index) => <div key={item.name} className="flex items-center gap-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/5 text-xs font-bold text-neutral-400">{index + 1}</span><span className="min-w-0 flex-1 truncate text-sm text-neutral-200">{item.name}</span><strong className="tabular-nums text-white">{item.count}</strong></div>) : <p className="text-sm text-neutral-500">Sin ventas registradas este mes.</p>}</div></article><article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"><h3 className="font-semibold text-white">Alertas de inventario</h3><div className="mt-4 space-y-3">{data.lowStock.length ? data.lowStock.map((item) => <div key={item.name} className="flex items-center justify-between gap-3 rounded-xl bg-amber-500/[0.07] px-3 py-2.5"><span className="min-w-0 truncate text-sm text-neutral-200">{item.name}</span><strong className="shrink-0 text-sm text-amber-300">{item.count} disponibles</strong></div>) : <p className="rounded-xl bg-emerald-500/[0.07] p-3 text-sm text-emerald-300">No hay alertas de stock bajo.</p>}</div></article></section>
  </div>;
}

function DashboardAction({ icon, value, label, hint, tone, onClick }: { icon: React.ReactNode; value: number; label: string; hint: string; tone: "emerald" | "amber" | "rose"; onClick: () => void }) {
  const tones = { emerald: "border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-200 hover:border-emerald-400/50", amber: "border-amber-500/20 bg-amber-500/[0.08] text-amber-200 hover:border-amber-400/50", rose: "border-rose-500/20 bg-rose-500/[0.08] text-rose-200 hover:border-rose-400/50" };
  return <button type="button" onClick={onClick} className={`group min-h-36 rounded-2xl border p-5 text-left transition hover:-translate-y-0.5 ${tones[tone]}`}>{icon}<strong className="mt-4 block text-3xl tabular-nums text-white">{value}</strong><span className="mt-1 block font-medium">{label}</span><span className="mt-2 flex items-center gap-1 text-xs text-neutral-400">{hint} <ArrowRight size={13} className="transition group-hover:translate-x-1" /></span></button>;
}

function StockCard({ service }: { service: StockRotation }) {
  const recommendation = service.priority === "high" ? "Prioridad comercial alta" : service.priority === "medium" ? "Conviene impulsar ventas" : "Rotación saludable";
  const tone = service.priority === "high" ? "border-rose-500/25 bg-rose-500/[0.06] text-rose-200" : service.priority === "medium" ? "border-amber-500/25 bg-amber-500/[0.06] text-amber-200" : "border-emerald-500/20 bg-emerald-500/[0.05] text-emerald-200";
  return <article className={`rounded-xl border p-4 ${tone}`}><div className="flex items-start justify-between gap-3"><h4 className="min-w-0 break-words font-semibold text-white">{service.name}</h4><span className="shrink-0 rounded-full bg-black/20 px-2 py-1 text-xs font-semibold">Stock {service.stock}</span></div><div className="mt-4 flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between"><span>{service.sales} venta{service.sales === 1 ? "" : "s"} este mes</span><span className="text-xs font-medium">{recommendation}</span></div></article>;
}

function DashboardSkeleton() {
  return <div className="animate-pulse space-y-5" aria-label="Cargando resumen operativo"><div className="h-24 rounded-2xl bg-white/5" /><div className="grid grid-cols-2 gap-3 xl:grid-cols-5">{Array.from({ length: 1 }, (_, index) => <div key={index} className="h-32 rounded-2xl bg-white/5" />)}</div><div className="h-64 rounded-2xl bg-white/5" /></div>;
}
