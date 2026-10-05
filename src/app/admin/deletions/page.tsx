"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAccountDataRefresh } from "@/hooks/useAccountDataRefresh";
import { applyAccountDeletion } from "@/lib/accountDataChanges";

type Platform = { id: number; nombre: string };
type Audit = { id: string; correo: string; clave: string | null; plataformas: Platform[]; fechaEliminacion: string; eliminadoPor: string; motivo: string | null; identificadorOriginal: string | null; contactos?: string[]; primeraEliminacion?: string; registros?: { eventos: Record<string, unknown>[]; restauraciones?: { evento: number; tipo: string; id: string; fechaRestauracion: string; restauradoPor: string }[] } };
type RestoreOption = { tipo: "pantalla" | "completa"; id: string; label: string; contacto: string; vencimiento: string; restored?: { fechaRestauracion: string; restauradoPor: string } };
const objects = (value: unknown): Record<string, unknown>[] => Array.isArray(value) ? value.filter((row): row is Record<string, unknown> => row !== null && typeof row === "object" && !Array.isArray(row)) : [];
function restoreOptions(audit: Audit | null): RestoreOption[] {
  if (!audit?.registros?.eventos.length) return [];
  const evento = audit.registros.eventos.length - 1;
  const source = audit.registros.eventos[evento];
  return (["pantalla", "completa"] as const).flatMap(tipo => objects(tipo === "pantalla" ? source.pantallas : source.cuentascompletas).map(row => ({
    tipo, id: String(row.id), label: tipo === "pantalla" ? `Pantalla ${row.nro_pantalla ?? ""} · #${row.id}` : `Cuenta completa #${row.id}`,
    contacto: String(row.contacto ?? "Sin contacto"), vencimiento: String(row.fecha_vencimiento ?? "").slice(0, 10),
    restored: audit.registros?.restauraciones?.find(item => item.evento === evento && item.tipo === tipo && item.id === String(row.id)),
  })));
}
const when = (value: string) => new Date(value).toLocaleString("es-CO", { timeZone: "America/Bogota" });
const field = "rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100";
const button = `${field} hover:bg-neutral-800 disabled:opacity-50`;

export default function DeletionAuditPage() {
  const [filters, setFilters] = useState({ correo: "", clave: "", plataforma: "", desde: "", hasta: "", order: "desc" });
  const [query, setQuery] = useState(filters);
  const [page, setPage] = useState(1);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [result, setResult] = useState<{ items: Audit[]; total: number; pages: number }>({ items: [], total: 0, pages: 1 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Audit | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<RestoreOption | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  useAccountDataRefresh(() => setRevision(value => value + 1));

  useEffect(() => {
    let active = true;
    fetch("/api/admin/deletions?facets=platforms", { cache: "no-store" }).then(response => response.ok ? response.json() : null).then(data => {
      if (active && data) setPlatforms(data.plataformas ?? []);
    }).catch(() => {});
    return () => { active = false; };
  }, [revision]);

  useEffect(() => {
    const controller = new AbortController();
    setBusy(true); setError(null);
    const params = new URLSearchParams({ ...query, page: String(page) });
    fetch(`/api/admin/deletions?${params}`, { cache: "no-store", signal: controller.signal }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo consultar el historial.");
      return data;
    }).then(data => { if (!controller.signal.aborted) setResult(data); }).catch(error => {
      if (!controller.signal.aborted) setError(error.message);
    }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [query, page, revision]);

  const showDetail = useCallback(async (id: string) => {
    setDetailBusy(true); setError(null); setRestoreTarget(null);
    try {
      const response = await fetch(`/api/admin/deletions?id=${id}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudieron consultar los detalles.");
      setDetail(data.item);
    } catch (error) { setError((error as Error).message); }
    finally { setDetailBusy(false); }
  }, []);

  const restore = async () => {
    if (!detail || !restoreTarget) return;
    setRestoring(true); setError(null); setSuccess(null);
    try {
      const response = await fetch("/api/admin/deletions/restore", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ auditId: detail.id, evento: detail.registros!.eventos.length - 1, tipo: restoreTarget.tipo, id: restoreTarget.id }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo restaurar.");
      applyAccountDeletion(result);
      setSuccess(result.alreadyRestored ? "Este registro ya fue restaurado." : "Registro restaurado con sus datos originales. Ya está disponible en sus vistas correspondientes.");
      await showDetail(detail.id);
    } catch (error) { setError((error as Error).message); }
    finally { setRestoring(false); }
  };
  const options = restoreOptions(detail);
  const closeDetail = () => { if (!restoring) { setDetail(null); setRestoreTarget(null); } };

  return (
    <div className="min-h-screen bg-neutral-950">
    <main className="mx-auto max-w-7xl space-y-5 p-6 text-neutral-100">
      <Link href="/admin" className="text-sky-300">← Volver al Admin</Link>
      <h1 className="text-2xl font-bold">Historial de eliminaciones</h1>
      <p className="text-sm text-neutral-400">Un registro por correo y clave eliminados definitivamente. Las cuentas conservadas en Inventario no generan auditoría. Fechas en hora de Bogotá.</p>
      <form className="grid gap-3 rounded-xl border border-neutral-800 p-4 sm:grid-cols-3" onSubmit={event => { event.preventDefault(); setPage(1); setQuery({ ...filters }); }}>
        <label className="grid gap-1 text-sm">Correo<input className={field} value={filters.correo} onChange={event => setFilters({ ...filters, correo: event.target.value })} placeholder="Buscar correo" /></label>
        <label className="grid gap-1 text-sm">Clave<input className={field} value={filters.clave} onChange={event => setFilters({ ...filters, clave: event.target.value })} placeholder="Buscar clave" /></label>
        <label className="grid gap-1 text-sm">Plataforma<select aria-label="Plataforma" className={field} value={filters.plataforma} onChange={event => setFilters({ ...filters, plataforma: event.target.value })}><option value="">Todas las plataformas</option>{platforms.map(platform => <option key={platform.id} value={platform.id}>{platform.nombre}</option>)}</select></label>
        <label className="grid gap-1 text-sm">Desde<input type="date" className={field} value={filters.desde} onChange={event => setFilters({ ...filters, desde: event.target.value })} /></label>
        <label className="grid gap-1 text-sm">Hasta<input type="date" className={field} value={filters.hasta} onChange={event => setFilters({ ...filters, hasta: event.target.value })} /></label>
        <label className="grid gap-1 text-sm">Orden<select aria-label="Orden" className={field} value={filters.order} onChange={event => setFilters({ ...filters, order: event.target.value })}><option value="desc">Más recientes primero</option><option value="asc">Más antiguas primero</option></select></label>
        <div className="flex gap-2 sm:col-span-3"><button className={button} disabled={busy}>Buscar</button><button type="button" className={button} disabled={busy} onClick={() => setRevision(value => value + 1)}>Actualizar</button></div>
      </form>
      {error && <p role="alert" className="rounded-lg bg-rose-950 p-3 text-rose-200">{error}</p>}
      {success && !detail && <p role="status" className="rounded-lg bg-emerald-950 p-3 text-emerald-200">{success}</p>}
      <p aria-live="polite" className="text-sm text-neutral-400">{busy ? "Cargando…" : `${result.total} ${result.total === 1 ? "correo eliminado" : "correos eliminados"}`}</p>
      <div className="overflow-x-auto rounded-xl border border-neutral-800">
        <table className="w-full text-left text-sm"><thead className="bg-neutral-900"><tr>{["Correo", "Clave", "Plataforma", "Fecha de eliminación", "Eliminado por", "Motivo", "Detalles"].map(title => <th className="p-3" key={title}>{title}</th>)}</tr></thead><tbody>
          {result.items.map(row => <tr key={row.id} className="border-t border-neutral-800"><td className="p-3">{row.correo}</td><td className="p-3 break-all">{row.clave || "—"}</td><td className="p-3">{row.plataformas.map(platform => platform.nombre).join(", ") || "Sin plataforma"}</td><td className="p-3 whitespace-nowrap">{when(row.fechaEliminacion)}</td><td className="p-3">{row.eliminadoPor}</td><td className="p-3">{row.motivo || "—"}</td><td className="p-3"><div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={detailBusy || restoring} onClick={() => void showDetail(row.id)}>Ver detalles</button><button type="button" className={`${button} border-emerald-800 text-emerald-200`} disabled={detailBusy || restoring} onClick={() => { setSuccess(null); void showDetail(row.id); }}>Restaurar</button></div></td></tr>)}
          {!busy && !result.items.length && <tr><td colSpan={7} className="p-5 text-center text-neutral-400">No hay eliminaciones para estos filtros.</td></tr>}
        </tbody></table>
      </div>
      <div className="flex items-center justify-between gap-3"><button className={button} disabled={page === 1 || busy} onClick={() => setPage(value => value - 1)}>Anterior</button><span>Página {page} de {result.pages}</span><button className={button} disabled={page >= result.pages || busy} onClick={() => setPage(value => value + 1)}>Siguiente</button></div>
      {detail && <div role="dialog" aria-modal="true" aria-labelledby="audit-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={closeDetail}><section className="max-h-[90vh] w-full max-w-4xl space-y-4 overflow-auto rounded-xl border border-neutral-700 bg-neutral-950 p-5" onClick={event => event.stopPropagation()}><div className="flex justify-between gap-4"><h2 id="audit-title" className="text-xl font-semibold">{detail.correo}</h2><button className={button} disabled={restoring} onClick={closeDetail}>Cerrar</button></div><p>Auditoría #{detail.id} · Primera eliminación: {when(detail.primeraEliminacion!)} · Última: {when(detail.fechaEliminacion)}</p><p>Identificadores originales: {detail.identificadorOriginal || "—"}</p><p>Clientes/contactos: {detail.contactos?.join(", ") || "—"}</p>
        <section className="space-y-3 rounded-xl border border-emerald-900 p-4" aria-label="Recuperar registros">
          <h3 className="font-semibold">Devolver a su lugar original</h3>
          <p className="text-sm text-neutral-400">Elige el registro que quieres recuperar de la última eliminación. Se conservan sus fechas, cliente, clave e importes. Si ya estaba vencido, volverá a aparecer también en Vencimientos.</p>
          {!options.length && <p className="text-sm text-neutral-400">Este respaldo no contiene pantallas o cuentas completas recuperables.</p>}
          {options.map(option => <article key={`${option.tipo}:${option.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-neutral-900 p-3"><div><p className="font-medium">{option.label}</p><p className="text-sm text-neutral-400">Cliente: {option.contacto}{option.vencimiento ? ` · Vencimiento: ${option.vencimiento}` : ""}</p>{option.restored && <p className="text-sm text-emerald-300">Restaurado el {when(option.restored.fechaRestauracion)} por {option.restored.restauradoPor}</p>}</div><button type="button" className={button} disabled={restoring || !!option.restored} onClick={() => { setError(null); setSuccess(null); setRestoreTarget(option); }}>{option.restored ? "Restaurado" : option.tipo === "pantalla" ? "Restaurar pantalla" : "Restaurar cuenta completa"}</button></article>)}
          {restoreTarget && <div className="space-y-3 rounded-lg border border-emerald-800 p-3"><p>¿Restaurar <b>{restoreTarget.label}</b> para el cliente <b>{restoreTarget.contacto}</b> con sus datos originales?</p><div className="flex flex-wrap gap-2"><button type="button" className={`${button} border-emerald-700 bg-emerald-950`} disabled={restoring} onClick={() => void restore()}>{restoring ? "Restaurando…" : "Confirmar restauración"}</button><button type="button" className={button} disabled={restoring} onClick={() => setRestoreTarget(null)}>Cancelar</button></div></div>}
          {error && <p role="alert" className="text-sm text-rose-200">{error}</p>}
          {success && <p role="status" className="text-sm text-emerald-200">{success}</p>}
        </section>
        {detail.registros?.eventos.map((event, index) => <details key={index} open={index === detail.registros!.eventos.length - 1} className="rounded-lg border border-neutral-800 p-3"><summary className="cursor-pointer">{when(String(event.fechaEliminacion))} · {String(event.eliminadoPor)} · {String(event.motivo || "Sin motivo")}</summary><p className="my-2 text-sm text-neutral-400">Registros originales conservados para rastrear esta eliminación, con sus identificadores, claves y relaciones.</p><pre className="overflow-x-auto whitespace-pre-wrap break-all text-xs text-neutral-300">{JSON.stringify(event, null, 2)}</pre></details>)}
      </section></div>}
    </main>
    </div>
  );
}
