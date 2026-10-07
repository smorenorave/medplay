"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import RecoveryEmailSettings from "@/components/RecoveryEmailSettings";

type Platform = { id: number; nombre: string; auditarEliminaciones: boolean };
async function readSettingsResponse(response: Response): Promise<{ plataformas: Platform[] }> {
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!response.ok || !data || !Array.isArray(data.plataformas)) {
    throw new Error(data?.error || (response.status === 401 || response.status === 403
      ? "La sesión expiró o no tienes permisos. Vuelve a iniciar sesión como administrador."
      : "El servidor no devolvió una configuración válida. Actualiza las plataformas; si persiste, revisa las migraciones de auditoría."));
  }
  return data;
}
export default function SettingsPage() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function load() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/settings/deletion-audit", { cache: "no-store" });
      const data = await readSettingsResponse(response);
      setPlatforms(data.plataformas);
    } catch (error) { setError((error as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  async function save() {
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/settings/deletion-audit", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plataformas: platforms.map(row => ({ id: row.id, habilitada: row.auditarEliminaciones })) }) });
      const data = await readSettingsResponse(response);
      setPlatforms(data.plataformas); setMessage("Configuración guardada. Se aplica a las próximas eliminaciones.");
    } catch (error) { setError((error as Error).message); }
    finally { setSaving(false); }
  }
  return <main className="mx-auto max-w-4xl space-y-6 p-6 text-neutral-100">
    <Link href="/admin" className="text-sky-300">← Volver al Admin</Link>
    <h1 className="text-2xl font-bold">⚙️ Configuración</h1>
    <section className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-950 p-5"><h2 className="text-lg font-semibold">Configuración general</h2><p className="text-sm text-neutral-400">Administra el correo de recuperación de tu cuenta.</p><RecoveryEmailSettings /></section>
    <section className="space-y-4 rounded-xl border border-neutral-800 bg-neutral-950 p-5"><h2 className="text-lg font-semibold">Historial de eliminaciones</h2><p className="text-sm text-neutral-400">Selecciona las plataformas cuyas eliminaciones definitivas se guardarán en el historial. Esto no cambia la eliminación ni el envío a Inventario. El historial existente se conserva.</p>
      {loading ? <p>Cargando plataformas…</p> : <fieldset disabled={saving} className="grid gap-3 sm:grid-cols-2"><legend className="sr-only">Plataformas que generan auditoría</legend>{platforms.map(platform => <label key={platform.id} className="flex items-center gap-3 rounded-lg border border-neutral-800 p-3"><input type="checkbox" className="size-5 accent-sky-500" checked={platform.auditarEliminaciones} onChange={event => setPlatforms(rows => rows.map(row => row.id === platform.id ? { ...row, auditarEliminaciones: event.target.checked } : row))} />{platform.nombre}</label>)}{!error && !platforms.length && <p className="text-sm text-neutral-400">No hay plataformas registradas.</p>}</fieldset>}
      {error && <p role="alert" className="text-rose-300">{error}</p>}{message && <p role="status" className="text-emerald-300">{message}</p>}
      <div className="flex flex-wrap gap-3"><button type="button" className="rounded-lg border border-sky-700 bg-sky-950 px-4 py-2 disabled:opacity-50" disabled={loading || saving || !!error || !platforms.length} onClick={() => void save()}>{saving ? "Guardando…" : "Guardar configuración"}</button><button type="button" className="rounded-lg border border-neutral-700 px-4 py-2 disabled:opacity-50" disabled={loading || saving} onClick={() => void load()}>Actualizar plataformas</button></div>
    </section>
  </main>;
}
