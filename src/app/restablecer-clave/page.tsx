"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (password !== confirm) return setError("Las claves no coinciden.");
    setLoading(true);
    try {
      const response = await fetch("/api/admin/password-recovery/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "No fue posible restablecer la clave.");
      setMessage("Tu clave fue actualizada. Ya puedes iniciar sesión.");
      setPassword("");
      setConfirm("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No fue posible restablecer la clave.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-950 p-4 text-white">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">Seguridad Medplay</p>
        <h1 className="text-2xl font-semibold">Crear una nueva clave</h1>
        <p className="mt-2 text-sm text-gray-400">Debe tener al menos 12 caracteres, mayúscula, minúscula y número.</p>
        {!token ? (
          <p className="mt-5 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">El enlace de recuperación está incompleto.</p>
        ) : message ? (
          <div className="mt-5 space-y-4">
            <p className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-200">{message}</p>
            <Link href="/" className="inline-flex w-full justify-center rounded-lg bg-sky-600 px-4 py-2 font-medium hover:bg-sky-500">Ir al inicio de sesión</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-3">
            <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nueva clave" className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-500" required />
            <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirmar nueva clave" className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-500" required />
            {error && <p className="text-sm text-red-300">{error}</p>}
            <button disabled={loading} className="w-full rounded-lg bg-sky-600 px-4 py-2 font-medium hover:bg-sky-500 disabled:opacity-50">{loading ? "Actualizando…" : "Actualizar clave"}</button>
          </form>
        )}
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<main className="min-h-screen bg-gray-950" />}><ResetPasswordForm /></Suspense>;
}
