"use client";

import { useState, Suspense, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import FloatingTimer from "@/components/FloatingTimer";
import WorkTimers from "@/components/WorkTimers";

/* ===== Lazy components ===== */
const CuentasCompletasViewer = dynamic(
  () => import("@/components/viewers/CuentasCompletasViewer"),
  { ssr: false, loading: () => <SkeletonForm /> }
);
const PantallasViewer = dynamic(
  () => import("@/components/viewers/PantallasViewer"),
  { ssr: false, loading: () => <SkeletonForm /> }
);
const PlataformaViewer = dynamic(
  () => import("@/components/viewers/PlataformasContactosViewer"),
  { ssr: false, loading: () => <SkeletonForm /> }
);
const FormCuentaCompleta = dynamic<{
  prefillContacto?: string;
  prefillNombre?: string;
}>(() => import("@/components/forms/FormCuentasCompletas"), {
  ssr: false,
  loading: () => <SkeletonForm />,
});
const FormPantalla = dynamic<{
  prefillContacto?: string;
  prefillNombre?: string;
}>(() => import("@/components/forms/FormPantallas"), {
  ssr: false,
  loading: () => <SkeletonForm />,
});
const CuentasVencidasViewer = dynamic(
  () => import("@/components/viewers/CuentasVencidasViewer"),
  { ssr: false, loading: () => <SkeletonForm /> }
);

/* ===== Tipos ===== */
type Vista =
  | "none"
  | "registrar-cc"
  | "registrar-pantalla"
  | "ver-cuentas-vencidas"
  | "ver-cc"
  | "ver-pantalla"
  | "ver-usuarios-plataformas";

/* ========================================================= */
export default function Page() {
  const [autenticado, setAutenticado] = useState(false);
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch("/api/session/me", { method: "GET" });
        setAutenticado(r.ok);
      } catch {
        setAutenticado(false);
      } finally {
        setCheckingSession(false);
      }
    };
    check();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoadingLogin(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, contrasena: clave }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setError(data?.error || "Error al iniciar sesión");
        return;
      }
      setAutenticado(true);
      setUsuario("");
      setClave("");
    } catch {
      setError("Error de conexión con el servidor");
    } finally {
      setLoadingLogin(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {}
    setAutenticado(false);
  };

  useEffect(() => {
    if (!autenticado) return;

    let timeout: ReturnType<typeof setTimeout> | null = null;
    const debounce = 500;

    const ping = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        fetch("/api/session/ping", { method: "POST" }).catch(() => {});
      }, debounce);
    };

    const events = [
      "click",
      "keydown",
      "mousemove",
      "scroll",
      "touchstart",
      "visibilitychange",
    ] as const;

    events.forEach((ev) => window.addEventListener(ev, ping));
    ping();

    const heartbeat = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetch("/api/session/ping", { method: "POST" }).catch(() => {});
      }
    }, 10 * 60 * 1000);

    return () => {
      if (timeout) clearTimeout(timeout);
      clearInterval(heartbeat);
      events.forEach((ev) => window.removeEventListener(ev, ping));
    };
  }, [autenticado]);

  if (checkingSession) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <p className="text-gray-600 dark:text-gray-400">Verificando sesión...</p>
      </main>
    );
  }

  if (!autenticado) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <form
          onSubmit={handleLogin}
          className="bg-white/10 border border-white/20 backdrop-blur-md rounded-2xl p-6 shadow-xl w-full max-w-sm text-center"
        >
          <h1 className="text-3xl font-bold mb-4 text-white">Iniciar sesión</h1>

          <input
            type="text"
            placeholder="Usuario"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            className="w-full mb-3 px-3 py-2 rounded-lg border border-gray-700 bg-gray-900 text-white outline-none focus:ring-2 focus:ring-sky-500"
            autoComplete="username"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            className="w-full mb-3 px-3 py-2 rounded-lg border border-gray-700 bg-gray-900 text-white outline-none focus:ring-2 focus:ring-sky-500"
            autoComplete="current-password"
          />
          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
          <button
            type="submit"
            disabled={loadingLogin}
            className="w-full rounded-lg bg-sky-600 hover:bg-sky-700 px-4 py-2 text-white font-medium transition disabled:opacity-60"
          >
            {loadingLogin ? "Validando..." : "Entrar"}
          </button>
        </form>
      </main>
    );
  }

  return <DashboardApp onLogout={handleLogout} />;
}

function readMsFromStorage(key: string) {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return 0;
    const s = JSON.parse(raw);
    return Number(s.elapsedMs || 0);
  } catch {
    return 0;
  }
}


/* ========================================================= */
function DashboardApp({ onLogout }: { onLogout: () => void }) {
  const [vista, setVista] = useState<Vista>("none");
  const [contacto] = useState("");
  const [nombre] = useState("");
  const panelRef = useRef<HTMLElement | null>(null);

  // abierto por defecto + recuerda
  const [timerOpen, setTimerOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("timer_open") !== "0";
  });

  useEffect(() => {
    localStorage.setItem("timer_open", timerOpen ? "1" : "0");
  }, [timerOpen]);

  const handleSetVista = (next: Vista) => {
    setVista(next);
    if (panelRef.current) {
      panelRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => panelRef.current?.focus(), 250);
    }
  };

  return (
    <main className="relative mx-auto max-w-screen-2xl px-3 md:px-6 py-6 space-y-6">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_-20%,rgba(56,189,248,0.25),transparent_60%),radial-gradient(40%_40%_at_80%_10%,rgba(139,92,246,0.25),transparent_60%)] dark:opacity-80" />

      <header className="mb-2 flex items-center justify-between">
        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">MEDPLAY</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Elige una acción:</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setTimerOpen(true)}
            className="rounded-xl px-4 py-2 text-sm font-medium bg-white/60 dark:bg-white/10 text-gray-900 dark:text-gray-100 ring-1 ring-inset ring-black/10 dark:ring-white/10 hover:bg-white/80 dark:hover:bg-white/15"
          >
            Abrir cronómetro
          </button>

          <button
            onClick={onLogout}
            className="rounded-xl px-4 py-2 text-sm font-medium bg-white/60 dark:bg-white/10 text-gray-900 dark:text-gray-100 ring-1 ring-inset ring-black/10 dark:ring-white/10 hover:bg-white/80 dark:hover:bg-white/15"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <section className="rounded-2xl border border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-md shadow-sm p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Btn onClick={() => handleSetVista("registrar-cc")} full>
            Registrar Cuenta Completa Vendida
          </Btn>
          <Btn onClick={() => handleSetVista("registrar-pantalla")} full>
            Registrar Pantalla Vendida
          </Btn>
          <Btn onClick={() => handleSetVista("ver-usuarios-plataformas")} full>
            Usuarios/Plataformas/Inventario
          </Btn>
          <Btn onClick={() => handleSetVista("ver-cc")} full>
            Ver/Editar Cuentas Completas
          </Btn>
          <Btn onClick={() => handleSetVista("ver-pantalla")} full>
            Ver/Editar Pantallas
          </Btn>
          <Btn onClick={() => handleSetVista("ver-cuentas-vencidas")} full>
            Cuentas Vencidas
          </Btn>
        </div>
      </section>

      <section
        ref={panelRef}
        id="action-panel"
        tabIndex={-1}
        aria-label="Panel de acción"
        className="rounded-2xl border border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-md shadow-sm p-3 md:p-5 overflow-hidden outline-none focus:ring-2 focus:ring-sky-400/50"
      >
        <Suspense fallback={<SkeletonForm />}>
          {vista === "none" && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Selecciona una opción para ver el contenido aquí debajo.
            </p>
          )}

          {vista === "registrar-cc" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Registrar Cuenta Completa</h2>
              <FormCuentaCompleta prefillContacto={contacto} prefillNombre={nombre} />
            </div>
          )}

          {vista === "registrar-pantalla" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Registrar Pantalla</h2>
              <FormPantalla prefillContacto={contacto} prefillNombre={nombre} />
            </div>
          )}

          {vista === "ver-cuentas-vencidas" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Cuentas Vencidas</h2>
              <div className="-mx-3 md:-mx-5">
                <CuentasVencidasViewer />
              </div>
            </div>
          )}

          {vista === "ver-cc" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Ver/Editar Cuentas Completas</h2>
              <div className="-mx-3 md:-mx-5">
                <CuentasCompletasViewer />
              </div>
            </div>
          )}

          {vista === "ver-pantalla" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Ver/Editar Pantallas</h2>
              <div className="-mx-3 md:-mx-5">
                <PantallasViewer />
              </div>
            </div>
          )}

          {vista === "ver-usuarios-plataformas" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Usuarios/Plataformas/Inventario</h2>
              <div className="-mx-3 md:-mx-5">
                <PlataformaViewer />
              </div>
            </div>
          )}
        </Suspense>
      </section>

      {/* POPUP DEL CRONÓMETRO */}
      <FloatingTimer
  open={timerOpen}
  onOpen={() => setTimerOpen(true)}
  onClose={() => setTimerOpen(false)}
  title="Cronómetros (Bogotá)"
>
  <WorkTimers
    tickMs={500}
    persistKey="medplay_worktimers_v1"
    timezone="America/Bogota"
    extraLabel="Actividad en la tienda"
  />
</FloatingTimer>

    </main>
  );
}

/* ===== UI helpers ===== */
function Btn({
  children,
  onClick,
  variant = "primary",
  full = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "primary" | "secondary";
  full?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "inline-flex items-center justify-center rounded-xl text-sm md:text-base font-medium transition whitespace-nowrap ring-1 ring-inset",
        full ? "w-full h-20 md:h-24 px-5" : "px-4 py-2",
        variant === "primary"
          ? "bg-gradient-to-r from-indigo-500 to-sky-500 text-white ring-transparent shadow hover:scale-[1.02] hover:shadow-md active:scale-[0.99]"
          : "bg-white/60 dark:bg-white/10 text-gray-900 dark:text-gray-100 ring-black/10 dark:ring-white/10 hover:bg-white/80 dark:hover:bg-white/15",
      ].join(" ")}
    >
      {children}
      <span className="ml-2 opacity-60">↗</span>
    </button>
  );
}

function SkeletonForm() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-5 w-44 rounded bg-gray-200/60 dark:bg-gray-700/40" />
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="h-10 rounded bg-gray-200/60 dark:bg-gray-700/40" />
        <div className="h-10 rounded bg-gray-200/60 dark:bg-gray-700/40" />
        <div className="h-10 rounded bg-gray-200/60 dark:bg-gray-700/40" />
        <div className="h-10 rounded bg-gray-200/60 dark:bg-gray-700/40" />
      </div>
    </div>
  );
}
