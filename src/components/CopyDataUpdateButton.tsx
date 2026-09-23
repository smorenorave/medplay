"use client";

import { useEffect, useRef, useState } from "react";
import {
  buildDataUpdateMessage,
  type DataUpdateMessageInput,
} from "@/lib/dataUpdateMessage";

type Props = DataUpdateMessageInput & {
  className?: string;
};

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Algunos WebViews exponen la API pero bloquean el permiso. En ese
      // caso continuamos con el método compatible basado en un textarea.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  if (!copied) throw new Error("No se pudo copiar el texto");
}

export default function CopyDataUpdateButton({
  className = "",
  ...data
}: Props) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    [],
  );

  const handleCopy = async () => {
    try {
      await copyText(buildDataUpdateMessage(data));
      setStatus("copied");
    } catch {
      setStatus("error");
    }

    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setStatus("idle"), 2500);
  };

  const label =
    status === "copied"
      ? "¡Datos copiados!"
      : status === "error"
        ? "No se pudo copiar"
        : "Copiar actualización de datos";

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/20 active:scale-[0.98] ${className}`}
      title={label}
      aria-label={label}
    >
      <span aria-hidden="true">📋</span>
      <span>{label}</span>
    </button>
  );
}
