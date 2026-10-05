"use client";
import { BadgeDollarSign, CalendarClock, CircleDollarSign, HandCoins, ShoppingBag } from "lucide-react";
export type SalesMetrics = { salesToday: number; profitToday: number; salesMonth: number; revenueMonth: number; profitMonth: number };
export default function SalesMetricsPanel({ data, dailyOnly = false }: { data: SalesMetrics | { salesToday: number }; dailyOnly?: boolean }) {
  const values = data as SalesMetrics;
  const currency = (value: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);
  const daily = { label: "Ventas hoy", value: data.salesToday, icon: ShoppingBag, tone: "text-sky-300 bg-sky-400/10" };
  const metrics = dailyOnly ? [daily] : [
    daily,
    { label: "Ganancia de hoy", value: currency(values.profitToday), icon: HandCoins, tone: "text-teal-300 bg-teal-400/10" },
    { label: "Ventas del mes", value: values.salesMonth, icon: CalendarClock, tone: "text-violet-300 bg-violet-400/10" },
    { label: "Ingresos del mes", value: currency(values.revenueMonth), icon: CircleDollarSign, tone: "text-emerald-300 bg-emerald-400/10" },
    { label: "Ganancia del mes", value: currency(values.profitMonth), icon: BadgeDollarSign, tone: "text-amber-300 bg-amber-400/10" },
  ];

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Indicadores comerciales">{metrics.map(({ label, value, icon: Icon, tone }) => <article key={label} className="group rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.025] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:shadow-xl sm:p-5"><div className={`inline-flex rounded-xl p-2.5 ${tone}`}><Icon size={20} /></div><p className="mt-4 text-sm font-medium text-neutral-400">{label}</p><p className="mt-1 break-words text-2xl font-bold tabular-nums text-white">{value}</p></article>)}</section>
  );
}
