"use client";
import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import SalesMetricsPanel, { type SalesMetrics } from "./SalesMetricsPanel";
import { useAccountDataRefresh } from "@/hooks/useAccountDataRefresh";
import { readCurrentAccountData } from "@/lib/accountDataChanges";
export default function AdminSalesSummary() {
  const [data, setData] = useState<SalesMetrics | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  async function load() {
    setRefreshing(true);
    try {
      const next = await readCurrentAccountData(async () => {
        const response = await fetch("/api/admin/dashboard", { cache: "no-store" });
        if (!response.ok) throw new Error("No fue posible cargar el panel de resumen");
        return response.json();
      });
      setData(next); setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "No fue posible cargar el resumen"); }
    finally { setRefreshing(false); }
  }
  useAccountDataRefresh(load);
  useEffect(() => { void load(); }, []);
  if (error) return <div role="alert">{error}<button onClick={load} className="ml-3 text-sky-300">Reintentar</button></div>;
  if (!data) return <div aria-label="Cargando panel de resumen" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5 animate-pulse">{Array.from({ length: 5 }, (_, i) => <div key={i} className="h-32 rounded-2xl bg-white/5" />)}</div>;
  return <section className="space-y-4"><header className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold text-white">Panel de Resumen</h2><button type="button" onClick={load} disabled={refreshing} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-neutral-200 transition hover:border-white/20 hover:bg-white/10 disabled:opacity-50"><RefreshCw size={16} className={refreshing ? "animate-spin" : ""} /> Actualizar</button></header><SalesMetricsPanel data={data} /></section>;
}
