"use client";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { deleteRecordSelection, previewRecordDeletion, type DeletionPreview, type DeletionSelection } from "@/lib/recordDeletionClient";

type Props = { items: DeletionSelection[]; onClose: () => void; onDeleted: () => void | Promise<void> };
export default function RecordDeletionDialog({ items, onClose, onDeleted }: Props) {
  const [previews, setPreviews] = useState<DeletionPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ deleted: number; archived: number; failed: string[] } | null>(null);
  const running = useRef(false);
  useEffect(() => {
    let cancelled = false;
    Promise.all(items.map(previewRecordDeletion)).then(data => { if (!cancelled) setPreviews(data); })
      .catch(reason => { if (!cancelled) setError(reason.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { cancelled = true; document.body.style.overflow = previous; };
  }, [items]);
  const run = async (inventory: boolean) => {
    if (running.current || loading || previews.length !== items.length || result) return;
    running.current = true; setBusy(true); setError("");
    const outcome = { deleted: 0, archived: 0, failed: [] as string[] };
    try {
      for (let index = 0; index < items.length; index++) {
        const item = items[index];
        try {
          // A preceding deletion in this same batch can make the next row last.
          const current = items.length === 1 ? previews[index] : await previewRecordDeletion(item);
          if (current.cuentaId !== previews[index].cuentaId) throw new Error("La asignación cambió. Vuelve a revisar este registro.");
          const response = await deleteRecordSelection(item, current, current.last ? (inventory ? "inventory" : "purge") : "record");
          outcome.deleted++;
          if (response.archived) outcome.archived++;
        } catch (reason) { outcome.failed.push(`${item.label || item.id}: ${(reason as Error).message}`); }
      }
      setResult(outcome);
      if (outcome.deleted) {
        try { await onDeleted(); } catch { setError("La eliminación terminó, pero debes refrescar el listado."); }
      }
      if (items.length === 1 && !outcome.failed.length) onClose();
    } finally { running.current = false; setBusy(false); }
  };
  if (typeof document === "undefined") return null;
  const last = previews[0]?.last;
  return createPortal(<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
    <section role="dialog" aria-modal="true" aria-labelledby="record-deletion-title" className="max-h-[90vh] w-full max-w-xl overflow-auto rounded-2xl border border-neutral-700 bg-neutral-900 p-5 text-neutral-100 shadow-xl">
      <h2 id="record-deletion-title" className="text-lg font-semibold">{items.length === 1 ? "Eliminar registro" : `Eliminar ${items.length} registros seleccionados`}</h2>
      {loading ? <p>Verificando asociaciones…</p> : <>
        <p className="my-3">{items.length === 1
          ? last ? "Es el último registro asociado. Puedes enviarlo al inventario o eliminarlo definitivamente." : "Se eliminará únicamente este registro. Los demás permanecerán sin cambios."
          : "Se eliminarán únicamente los registros seleccionados. Elige si deseas conservar en inventario las cuentas que queden sin registros."}</p>
        <ul className="max-h-40 overflow-auto text-sm">{items.map(item => <li key={`${item.tipo}:${item.id}`}>{item.tipo === "pantalla" ? "Pantalla" : "Cuenta completa"} · {item.label || item.id}</li>)}</ul>
      </>}
      {error && <p role="alert" className="my-3 text-rose-300">{error}</p>}
      {result && <div role="status" className="my-3"><p>Eliminados: {result.deleted}. Enviados a inventario: {result.archived}. Fallidos: {result.failed.length}.</p><ul>{result.failed.map((message, index) => <li key={index}>{message}</li>)}</ul></div>}
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button type="button" disabled={busy} onClick={onClose} className="rounded-lg border border-neutral-600 px-3 py-2">{result ? "Cerrar" : "Cancelar"}</button>
        {!result && <>
          {(items.length > 1 || last) && <button type="button" disabled={busy || loading || previews.length !== items.length} onClick={() => void run(true)} className="rounded-lg bg-amber-800 px-3 py-2 disabled:opacity-50">Enviar al inventario y eliminar</button>}
          <button type="button" disabled={busy || loading || previews.length !== items.length} onClick={() => void run(false)} className="rounded-lg bg-rose-800 px-3 py-2 disabled:opacity-50">{busy ? "Procesando…" : items.length === 1 && !last ? "Eliminar registro" : "Eliminar definitivamente"}</button>
        </>}
      </div>
    </section>
  </div>, document.body);
}
