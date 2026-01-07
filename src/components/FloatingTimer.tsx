"use client";

import { ReactNode, useEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

type WinState = { x: number; y: number; w: number; h: number };

const WIN_KEY = "floating_timer_win_v3";
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

const loadWin = (): WinState => {
  if (typeof window === "undefined") return { x: 24, y: 24, w: 420, h: 340 };
  try {
    const raw = localStorage.getItem(WIN_KEY);
    if (!raw) throw new Error("no");
    const s = JSON.parse(raw);
    return {
      x: Number(s.x ?? 24),
      y: Number(s.y ?? 24),
      w: Number(s.w ?? 420),
      h: Number(s.h ?? 340),
    };
  } catch {
    return { x: 24, y: 24, w: 420, h: 340 };
  }
};

export default function FloatingTimer({
  open,
  onOpen,
  onClose,
  title = "Cronómetro",
  children,
}: Props) {
  const [win, setWin] = useState<WinState>(() => loadWin());

  const headerRef = useRef<HTMLDivElement>(null);
  const resizingRef = useRef(false);
  const dragRef = useRef({ dragging: false, dx: 0, dy: 0 });

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(WIN_KEY, JSON.stringify(win));
  }, [win]);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const onDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      // ✅ Si el click viene del botón cerrar, NO arrastres
      if (target?.dataset?.closebtn === "1") return;

      dragRef.current.dragging = true;
      dragRef.current.dx = e.clientX - win.x;
      dragRef.current.dy = e.clientY - win.y;
      header.setPointerCapture(e.pointerId);
    };

    const onMove = (e: PointerEvent) => {
      if (!dragRef.current.dragging || resizingRef.current) return;

      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const x = clamp(e.clientX - dragRef.current.dx, 8, vw - 220);
      const y = clamp(e.clientY - dragRef.current.dy, 8, vh - 120);

      setWin((s) => ({ ...s, x, y }));
    };

    const onUp = () => {
      dragRef.current.dragging = false;
    };

    header.addEventListener("pointerdown", onDown);
    header.addEventListener("pointermove", onMove);
    header.addEventListener("pointerup", onUp);
    header.addEventListener("pointercancel", onUp);

    return () => {
      header.removeEventListener("pointerdown", onDown);
      header.removeEventListener("pointermove", onMove);
      header.removeEventListener("pointerup", onUp);
      header.removeEventListener("pointercancel", onUp);
    };
  }, [win.x, win.y]);

  return (
    <>
      {/* ✅ Botón para reabrir cuando está oculto */}
      {!open && (
        <button
          onClick={onOpen}
          className="fixed z-[9999] bottom-4 right-4 rounded-full px-5 py-3 text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-xl"
        >
          ⏱ Abrir cronómetro
        </button>
      )}

      {/* ✅ La ventana SIEMPRE se renderiza (no desmonta children) */}
      <div
        style={{
          left: win.x,
          top: win.y,
          width: win.w,
          height: win.h,
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transform: open ? "translateY(0px)" : "translateY(8px)",
        }}
        className="fixed z-[9999] rounded-2xl border border-white/10 bg-white/70 dark:bg-neutral-900/80 backdrop-blur-md shadow-2xl overflow-hidden transition"
      >
        <div
          ref={headerRef}
          className="cursor-move flex items-center justify-between px-3 py-2 bg-white/50 dark:bg-white/5 select-none"
        >
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </span>

          <button
            data-closebtn="1"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onClose(); // ✅ solo oculta, NO desmonta
            }}
            className="text-gray-600 dark:text-gray-300 hover:text-red-500 text-lg leading-none"
            title="Cerrar (solo oculta)"
          >
            ✕
          </button>
        </div>

        <div className="p-3 h-[calc(100%-40px)] overflow-auto">{children}</div>

        {/* ✅ Resize handle */}
        <div
          onPointerDown={(e) => {
            resizingRef.current = true;

            const startW = win.w;
            const startH = win.h;
            const startX = e.clientX;
            const startY = e.clientY;

            const onMove = (ev: PointerEvent) => {
              const vw = window.innerWidth;
              const vh = window.innerHeight;

              const w = clamp(startW + (ev.clientX - startX), 300, vw - win.x - 8);
              const h = clamp(startH + (ev.clientY - startY), 220, vh - win.y - 8);

              setWin((s) => ({ ...s, w, h }));
            };

            const onUp = () => {
              resizingRef.current = false;
              window.removeEventListener("pointermove", onMove);
              window.removeEventListener("pointerup", onUp);
            };

            window.addEventListener("pointermove", onMove);
            window.addEventListener("pointerup", onUp);
            e.preventDefault();
          }}
          className="absolute right-2 bottom-2 h-4 w-4 cursor-se-resize opacity-70"
          title="Cambiar tamaño"
        >
          <div className="h-full w-full rounded-sm border border-gray-400/40 dark:border-white/20" />
        </div>
      </div>
    </>
  );
}
