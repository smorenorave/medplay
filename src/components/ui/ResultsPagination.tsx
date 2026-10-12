"use client";

export default function ResultsPagination({ page, pages, total, setPage }: {
  page: number; pages: number; total: number; setPage: (page: number) => void;
}) {
  if (!total) return null;
  return <nav aria-label="Páginas de resultados" className="my-3 flex flex-wrap items-center gap-3 text-sm text-neutral-300">
    <span>{total} resultados · Página {page} de {pages}</span>
    <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-neutral-700 px-3 py-2 disabled:opacity-40">Anterior</button>
    <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} className="rounded-lg border border-neutral-700 px-3 py-2 disabled:opacity-40">Siguiente</button>
    <span className="text-xs text-neutral-400">La búsqueda y «Seleccionar todo» incluyen todos los resultados filtrados.</span>
  </nav>;
}
