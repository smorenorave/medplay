"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const normalizeEmail = (value?: string | null) =>
  String(value ?? "").trim().toLowerCase();

type Params = {
  recordId?: number | null;
  plataformaId?: number | null;
  correo?: string | null;
  onResolved: (contrasena: string) => void;
};

export function useCredentialAutofill({
  recordId,
  plataformaId,
  correo,
  onResolved,
}: Params) {
  const [loadingCredential, setLoadingCredential] = useState(false);
  const lastScopeRef = useRef<string | null>(null);
  const manuallyEditedRef = useRef(false);
  const onResolvedRef = useRef(onResolved);

  useEffect(() => {
    onResolvedRef.current = onResolved;
  }, [onResolved]);

  const scopeFor = useCallback(
    (pid?: number | null, email?: string | null) =>
      `${recordId ?? "none"}|${pid ?? "none"}|${normalizeEmail(email)}`,
    [recordId],
  );

  useEffect(() => {
    const email = normalizeEmail(correo);
    const scope = scopeFor(plataformaId, email);
    const previousRecord = lastScopeRef.current?.split("|", 1)[0] ?? null;
    const currentRecord = String(recordId ?? "none");

    if (previousRecord !== currentRecord) {
      lastScopeRef.current = scope;
      manuallyEditedRef.current = false;
      setLoadingCredential(false);
      return;
    }

    if (lastScopeRef.current === scope) return;

    lastScopeRef.current = scope;
    manuallyEditedRef.current = false;

    if (!recordId || !plataformaId || !email) {
      setLoadingCredential(false);
      onResolvedRef.current("");
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoadingCredential(true);

      try {
        const response = await fetch(
          "/api/account-credentials",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plataforma_id: plataformaId, correo: email }),
            cache: "no-store",
            signal: controller.signal,
          },
        );
        if (!response.ok) return;

        const data = await response.json();
        if (
          lastScopeRef.current === scope &&
          !manuallyEditedRef.current
        ) {
          onResolvedRef.current(
            data?.found ? String(data?.contrasena ?? "") : "",
          );
        }
      } catch (error) {
        if ((error as Error)?.name !== "AbortError") {
          // Mantener el campo editable si la consulta temporalmente falla.
        }
      } finally {
        if (lastScopeRef.current === scope) {
          setLoadingCredential(false);
        }
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [correo, plataformaId, recordId, scopeFor]);

  const markPasswordManuallyEdited = useCallback(() => {
    manuallyEditedRef.current = true;
  }, []);

  const acceptKnownCredential = useCallback(
    (pid: number | null | undefined, email: string, password?: string | null) => {
      lastScopeRef.current = scopeFor(pid, email);
      manuallyEditedRef.current = false;
      setLoadingCredential(false);
      onResolvedRef.current(String(password ?? ""));
    },
    [scopeFor],
  );

  return {
    acceptKnownCredential,
    loadingCredential,
    markPasswordManuallyEdited,
  };
}
