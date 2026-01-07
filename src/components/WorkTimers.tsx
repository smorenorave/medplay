"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  tickMs?: number;
  persistKey?: string;
  timezone?: string;
  extraLabel?: string;
};

type Persisted = {
  running: boolean;
  workedMs: number;
  tabMs: number;
  startedAtISO: string | null;
  stoppedAtISO: string | null;
  lastTickTs: number | null;
};

const DEFAULT_STATE: Persisted = {
  running: false,
  workedMs: 0,
  tabMs: 0,
  startedAtISO: null,
  stoppedAtISO: null,
  lastTickTs: null,
};

function safeLoad(key: string): Persisted {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return DEFAULT_STATE;
    const s = JSON.parse(raw);

    const running = !!s.running;
    const workedMs = Number(s.workedMs || 0);
    const tabMs = Number(s.tabMs || 0);
    const lastTickTs = s.lastTickTs == null ? null : Number(s.lastTickTs);

    let workedFixed = workedMs;
    let tabFixed = tabMs;

    // ✅ Recupera tiempo real si estaba corriendo cuando recargaste
    if (running && lastTickTs) {
      const dt = Date.now() - lastTickTs;
      workedFixed = Math.max(0, workedFixed + dt);

      // "tienda": solo suma si ahora está visible (mínima diferencia por recarga)
      if (document.visibilityState === "visible") {
        tabFixed = Math.max(0, tabFixed + dt);
      }
    }

    return {
      running,
      workedMs: workedFixed,
      tabMs: tabFixed,
      startedAtISO: s.startedAtISO ?? null,
      stoppedAtISO: s.stoppedAtISO ?? null,
      lastTickTs: running ? Date.now() : null,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function safeSave(key: string, s: Persisted) {
  try {
    localStorage.setItem(key, JSON.stringify(s));
  } catch {}
}

export default function WorkTimers({
  tickMs = 500,
  persistKey = "medplay_worktimers_v2",
  timezone = "America/Bogota",
  extraLabel = "Actividad en la tienda",
}: Props) {
  const [hydrated, setHydrated] = useState(false);

  const [running, setRunning] = useState(false);
  const [workedMs, setWorkedMs] = useState(0);
  const [tabMs, setTabMs] = useState(0);

  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [stoppedAt, setStoppedAt] = useState<Date | null>(null);

  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  const lastTickRef = useRef<number | null>(null);

  // ✅ Cargar
  useEffect(() => {
    const s = safeLoad(persistKey);
    setRunning(s.running);
    setWorkedMs(s.workedMs);
    setTabMs(s.tabMs);
    setStartedAt(s.startedAtISO ? new Date(s.startedAtISO) : null);
    setStoppedAt(s.stoppedAtISO ? new Date(s.stoppedAtISO) : null);
    lastTickRef.current = s.lastTickTs;
    setHydrated(true);
  }, [persistKey]);

  // ✅ Tick: total siempre; tienda solo visible
  useEffect(() => {
    if (!hydrated) return;

    const id = window.setInterval(() => {
      if (!running) return;

      const now = Date.now();
      if (!lastTickRef.current) lastTickRef.current = now;

      const dt = now - lastTickRef.current;
      lastTickRef.current = now;

      setWorkedMs((p) => p + dt);

      if (document.visibilityState === "visible") {
        setTabMs((p) => p + dt);
      }
    }, tickMs);

    return () => window.clearInterval(id);
  }, [running, tickMs, hydrated]);

  // ✅ Guardar
  useEffect(() => {
    if (!hydrated) return;

    safeSave(persistKey, {
      running,
      workedMs,
      tabMs,
      startedAtISO: startedAt ? startedAt.toISOString() : null,
      stoppedAtISO: stoppedAt ? stoppedAt.toISOString() : null,
      lastTickTs: running ? (lastTickRef.current ?? Date.now()) : null,
    });
  }, [hydrated, running, workedMs, tabMs, startedAt, stoppedAt, persistKey]);

  const fmtWorked = useMemo(() => msToHhMmSs(workedMs), [workedMs]);
  const fmtTab = useMemo(() => msToHhMmSs(tabMs), [tabMs]);

  const fmtStart = useMemo(
    () => (startedAt ? fmtTime(startedAt, timezone) : "—"),
    [startedAt, timezone]
  );
  const fmtStop = useMemo(
    () => (stoppedAt ? fmtTime(stoppedAt, timezone) : "—"),
    [stoppedAt, timezone]
  );

  const startBoth = () => {
    const now = new Date();
    setSendError("");
    setStoppedAt(null);

    // Solo define start si es sesión nueva (o reiniciada)
    if (!startedAt || workedMs === 0) setStartedAt(now);

    lastTickRef.current = Date.now();
    setRunning(true);
  };

  const pauseBoth = () => {
    // ✅ Pausa sin enviar
    const stop = new Date();
    setRunning(false);
    lastTickRef.current = null;
    setStoppedAt(stop);
  };

  const resetAll = () => {
    setRunning(false);
    setWorkedMs(0);
    setTabMs(0);
    setStartedAt(null);
    setStoppedAt(null);
    setSendError("");
    lastTickRef.current = null;
    try {
      localStorage.removeItem(persistKey);
    } catch {}
  };

  const stopSendAndReset = async () => {
    // ✅ Parar + enviar + reiniciar
    const stop = new Date();
    setRunning(false);
    lastTickRef.current = null;
    setStoppedAt(stop);

    const start = startedAt ?? stop;
    if (!startedAt) setStartedAt(start);

    setSending(true);
    setSendError("");

    try {
      const res = await fetch("/api/hours-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timezone,
          startedAtISO: start.toISOString(),
          stoppedAtISO: stop.toISOString(),
          workedMs: workedMs,

          extraMs: tabMs,
          extraLabel,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || "No se pudo enviar el correo");

      // ✅ SOLO si el envío fue ok, reiniciamos
      resetAll();
    } catch (e: any) {
      setSendError(e?.message || "Error enviando el correo");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* TOTAL */}
      <div className="rounded-xl border border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700 dark:text-gray-200">
            Horas trabajadas (total)
          </div>
          <div className="text-xs px-2 py-1 rounded-full bg-white/40 dark:bg-white/10">
            {running ? "Corriendo" : "Pausado"}
          </div>
        </div>

        <div className="text-2xl font-bold tabular-nums">{fmtWorked}</div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-white/40 dark:bg-white/5 p-2">
            <div className="opacity-70">Inicio</div>
            <div className="font-medium tabular-nums">{fmtStart}</div>
          </div>
          <div className="rounded-lg bg-white/40 dark:bg-white/5 p-2">
            <div className="opacity-70">Fin</div>
            <div className="font-medium tabular-nums">{fmtStop}</div>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap pt-1">
          {!running ? (
            <button
              onClick={startBoth}
              disabled={sending}
              className="px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm disabled:opacity-60"
            >
              {workedMs > 0 ? "Reanudar" : "Iniciar"}
            </button>
          ) : (
            <button
              onClick={pauseBoth}
              disabled={sending}
              className="px-3 py-2 rounded-lg bg-amber-500/80 hover:bg-amber-500 text-white text-sm disabled:opacity-60"
            >
              Pausar
            </button>
          )}

          <button
            onClick={stopSendAndReset}
            disabled={sending || workedMs === 0}
            className="px-3 py-2 rounded-lg bg-white/70 dark:bg-white/10 text-sm disabled:opacity-60"
            title="Detiene ambos, envía el correo y reinicia en 0"
          >
            {sending ? "Enviando..." : "Parar y enviar (reinicia)"}
          </button>

          <button
            onClick={resetAll}
            disabled={sending}
            className="px-3 py-2 rounded-lg bg-white/70 dark:bg-white/10 text-sm disabled:opacity-60"
          >
            Reiniciar
          </button>
        </div>

        {sendError && <div className="text-xs text-red-400">{sendError}</div>}
        <div className="text-[11px] text-gray-500">Zona horaria: {timezone}</div>
      </div>

      {/* TIENDA */}
      <div className="rounded-xl border border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700 dark:text-gray-200">
            {extraLabel} <span className="text-[11px] opacity-70">(solo pestaña visible)</span>
          </div>
        </div>

        <div className="text-xl font-semibold tabular-nums">{fmtTab}</div>

        <div className="text-[11px] text-gray-500">
          Este tiempo solo suma cuando esta pestaña está visible.
        </div>
      </div>
    </div>
  );
}

function msToHhMmSs(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function fmtTime(d: Date, tz: string) {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(d);
}
