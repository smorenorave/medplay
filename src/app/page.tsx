"use client";

import { useState, Suspense, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import FloatingTimer from "@/components/FloatingTimer";
import WorkTimers from "@/components/WorkTimers";
import RecoveryEmailSettings from "@/components/RecoveryEmailSettings";
import OperationsDashboard from "@/components/OperationsDashboard";
import { Boxes, ChevronRight, CirclePlus, Clock3, LayoutDashboard, LogOut, Monitor, PackagePlus, Rows3, TriangleAlert } from "lucide-react";

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
  | "dashboard"
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
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const [recoveryLoading, setRecoveryLoading] = useState(false);

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
    try {
      for (let i = localStorage.length - 1; i >= 0; i -= 1) {
        const key = localStorage.key(i);
        if (key && /^(cuentas|pantallas|medplay):/i.test(key)) localStorage.removeItem(key);
      }
    } catch {}
    setAutenticado(false);
  };

  const handleRecovery = async () => {
    setError("");
    setRecoveryMessage("");
    setRecoveryLoading(true);
    try {
      const response = await fetch("/api/admin/password-recovery/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: recoveryEmail }),
      });
      const data = await response.json();
      setRecoveryMessage(data?.message || "Si el correo está registrado, recibirás instrucciones para recuperar el acceso.");
    } catch {
      setRecoveryMessage("Si el correo está registrado, recibirás instrucciones para recuperar el acceso.");
    } finally {
      setRecoveryLoading(false);
    }
  };


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
          onSubmit={(event) => {
            if (showRecovery) {
              event.preventDefault();
              void handleRecovery();
            } else {
              void handleLogin(event);
            }
          }}
          className="bg-white/10 border border-white/20 backdrop-blur-md rounded-2xl p-6 shadow-xl w-full max-w-sm text-center"
        >
          <h1 className="text-3xl font-bold mb-2 text-white">{showRecovery ? "Recuperar acceso" : "Iniciar sesión"}</h1>
          <p className="mb-5 text-sm text-gray-400">{showRecovery ? "Te enviaremos un enlace seguro si el correo está registrado." : "Accede al centro de operaciones Medplay."}</p>

          {showRecovery ? <>
            <input
              type="email"
              placeholder="Correo registrado"
              value={recoveryEmail}
              onChange={(e) => setRecoveryEmail(e.target.value)}
              className="w-full mb-3 px-3 py-2 rounded-lg border border-gray-700 bg-gray-900 text-white outline-none focus:ring-2 focus:ring-sky-500"
              autoComplete="email"
              required
            />
            {recoveryMessage && <p className="mb-3 rounded-lg bg-sky-500/10 p-3 text-left text-sm text-sky-200">{recoveryMessage}</p>}
            <button type="button" onClick={handleRecovery} disabled={recoveryLoading || !recoveryEmail.trim()} className="w-full rounded-lg bg-sky-600 hover:bg-sky-700 px-4 py-2 text-white font-medium transition disabled:opacity-60">
              {recoveryLoading ? "Enviando…" : "Enviar enlace de recuperación"}
            </button>
            <button type="button" onClick={() => { setShowRecovery(false); setRecoveryMessage(""); setError(""); }} className="mt-3 text-sm text-gray-300 hover:text-white">Volver al inicio de sesión</button>
          </> : <>
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
          <button type="button" onClick={() => { setShowRecovery(true); setError(""); }} className="mt-3 text-sm font-medium text-sky-300 hover:text-sky-200">
            ¿Olvidaste tu clave?
          </button>
          </>}
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
  const [vista, setVista] = useState<Vista>("dashboard");
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
    <main className="relative mx-auto max-w-[1700px] space-y-4 px-3 py-4 sm:px-4 md:px-6 md:py-6">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_-20%,rgba(56,189,248,0.25),transparent_60%),radial-gradient(40%_40%_at_80%_10%,rgba(139,92,246,0.25),transparent_60%)] dark:opacity-80" />

      <header className="mb-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-[-0.04em] text-white md:text-4xl">MEDPLAY</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Elige una acción:</p>
        </div>

        <div className="discreet-scroll flex max-w-full items-center gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:justify-end sm:overflow-visible sm:pb-0">
          <RecoveryEmailSettings />
          <button
            onClick={() => setTimerOpen(true)}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/10 sm:px-4"
          >
            <Clock3 size={17} /> Cronómetro
          </button>

          <button
            onClick={onLogout}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-neutral-100 transition hover:border-rose-400/30 hover:bg-rose-500/10 hover:text-rose-100 sm:px-4"
          >
            <LogOut size={17} /> Salir
          </button>
        </div>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-5">
      <aside className="sticky top-0 z-30 -mx-3 border-y border-white/10 bg-neutral-950/90 px-3 py-2 shadow-xl backdrop-blur-xl sm:-mx-4 sm:px-4 lg:mx-0 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto lg:rounded-2xl lg:border lg:bg-white/[0.045] lg:p-3">
        <nav className="discreet-scroll grid auto-cols-[minmax(165px,72vw)] grid-flow-col gap-2 overflow-x-auto pb-1 lg:grid-flow-row lg:grid-cols-1 lg:auto-cols-auto lg:overflow-x-visible lg:pb-0" aria-label="Navegación principal">
          <Btn icon={<LayoutDashboard size={18} />} active={vista === "dashboard"} onClick={() => handleSetVista("dashboard")} full>Resumen</Btn>
          <Btn icon={<CirclePlus size={18} />} active={vista === "registrar-cc"} onClick={() => handleSetVista("registrar-cc")} full>
            Nueva cuenta completa
          </Btn>
          <Btn icon={<PackagePlus size={18} />} active={vista === "registrar-pantalla"} onClick={() => handleSetVista("registrar-pantalla")} full>
            Nueva pantalla
          </Btn>
          <Btn icon={<Boxes size={18} />} active={vista === "ver-usuarios-plataformas"} onClick={() => handleSetVista("ver-usuarios-plataformas")} full>
            Catálogos e inventario
          </Btn>
          <Btn icon={<Rows3 size={18} />} active={vista === "ver-cc"} onClick={() => handleSetVista("ver-cc")} full>
            Cuentas completas
          </Btn>
          <Btn icon={<Monitor size={18} />} active={vista === "ver-pantalla"} onClick={() => handleSetVista("ver-pantalla")} full>
            Pantallas
          </Btn>
          <Btn icon={<TriangleAlert size={18} />} active={vista === "ver-cuentas-vencidas"} onClick={() => handleSetVista("ver-cuentas-vencidas")} full>
            Vencimientos
          </Btn>
          <Link href="/admin/deletions" className="flex min-h-11 items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-neutral-200 hover:bg-white/10">
            <Rows3 size={18} /> Historial de eliminaciones
          </Link>
        </nav>
      </aside>

      <section
        ref={panelRef}
        id="action-panel"
        tabIndex={-1}
        aria-label="Panel de acción"
        className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-2 shadow-sm outline-none backdrop-blur-md focus:ring-2 focus:ring-sky-400/50 sm:p-3 md:p-5"
      >
        <Suspense fallback={<SkeletonForm />}>
          {vista === "dashboard" && (
            <div>
              <OperationsDashboard onNavigate={handleSetVista} />
              <p className="hidden">
              Selecciona una opción para ver el contenido aquí debajo.
              </p>
            </div>
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
      </div>

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
  icon,
  active = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "primary" | "secondary";
  full?: boolean;
  icon?: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "group inline-flex min-h-12 items-center gap-3 rounded-xl border text-left text-sm font-semibold leading-snug transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400",
        full ? "w-full px-3.5 py-3" : "px-4 py-2.5",
        active
          ? "border-sky-400/40 bg-gradient-to-r from-sky-500/25 to-indigo-500/15 text-white shadow-[0_8px_30px_rgba(14,165,233,0.12)]"
          : variant === "primary"
          ? "border-white/10 bg-white/[0.045] text-neutral-200 hover:border-white/20 hover:bg-white/[0.09] hover:text-white"
          : "bg-white/60 dark:bg-white/10 text-gray-900 dark:text-gray-100 ring-black/10 dark:ring-white/10 hover:bg-white/80 dark:hover:bg-white/15",
      ].join(" ")}
    >
      <span className={`shrink-0 ${active ? "text-sky-300" : "text-neutral-500 group-hover:text-sky-300"}`}>{icon}</span>
      <span className="min-w-0 flex-1 whitespace-normal break-words">{children}</span>
      <ChevronRight size={15} className={`shrink-0 transition group-hover:translate-x-0.5 ${active ? "text-sky-300" : "text-neutral-600"}`} />
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
