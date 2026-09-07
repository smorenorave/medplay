"use client";

import { useState } from "react";

export default function RecoveryEmailSettings() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [mailStatus, setMailStatus] = useState<{ configured: boolean; missing: string[] } | null>(null);

  async function show() {
    setOpen(true);
    setMessage("");
    const [response, statusResponse] = await Promise.all([
      fetch("/api/admin/recovery-email", { cache: "no-store" }),
      fetch("/api/admin/mail-status", { cache: "no-store" }),
    ]);
    const data = await response.json().catch(() => ({}));
    const status = await statusResponse.json().catch(() => null);
    if (response.ok) setEmail(data.email || "");
    if (statusResponse.ok) setMailStatus(status);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/recovery-email", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "No fue posible guardar el correo.");
      setMessage("Correo de recuperación actualizado.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "No fue posible guardar el correo.");
    } finally {
      setLoading(false);
    }
  }

  return <>
    <button onClick={show} className="inline-flex min-h-11 shrink-0 items-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/10 sm:px-4">
      Correo de recuperación
    </button>
    {open && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="recovery-email-title">
      <form onSubmit={save} className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-950 p-6 text-left shadow-2xl">
        <h2 id="recovery-email-title" className="text-xl font-semibold text-white">Correo de recuperación</h2>
        <p className="mt-2 text-sm text-neutral-400">Este correo será el único autorizado para recuperar el acceso administrativo.</p>
        {mailStatus && <div className={`mt-4 rounded-lg border px-3 py-2 text-sm ${mailStatus.configured ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-amber-500/30 bg-amber-500/10 text-amber-100"}`}>
          {mailStatus.configured ? "Servicio de correo configurado." : `Falta configurar: ${mailStatus.missing.join(", ")}.`}
        </div>}
        <label className="mt-5 block text-sm text-neutral-300">Correo registrado</label>
        <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-sky-500" required />
        {message && <p className="mt-3 text-sm text-sky-200">{message}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-neutral-300 hover:bg-white/10">Cerrar</button>
          <button disabled={loading} className="rounded-lg bg-sky-600 px-4 py-2 font-medium text-white hover:bg-sky-500 disabled:opacity-50">{loading ? "Guardando…" : "Guardar"}</button>
        </div>
      </form>
    </div>}
  </>;
}
