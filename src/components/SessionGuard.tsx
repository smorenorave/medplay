"use client";

import { useLayoutEffect } from "react";

/** One guard for every module, including /admin. Only user input renews activity. */
export default function SessionGuard() {
  useLayoutEffect(() => {
    const originalFetch = window.fetch;
    let active = window.location.pathname.startsWith("/admin");
    let closing = false;
    let checking = false;
    let lastPing = 0;
    let expiresAt = Infinity;
    const expire = () => {
      if (closing) return;
      closing = true;
      document.body.style.visibility = "hidden";
      // Logout clears both HttpOnly cookies; a timeout also handles lost connectivity.
      const redirect = () => window.location.replace("/?reason=session-expired");
      const fallback = window.setTimeout(redirect, 1500);
      void originalFetch("/api/admin/logout", { method: "POST" }).catch(() => {}).finally(() => {
        window.clearTimeout(fallback);
        redirect();
      });
    };
    const check = async () => {
      if (!active || closing || checking) return;
      checking = true;
      try {
        const response = await originalFetch("/api/session/me", { cache: "no-store" });
        if (response.status === 401) expire();
        else if (response.ok) expiresAt = (await response.json()).expiresAt;
      } catch { /* A network outage is not proof of an invalid session. */ }
      finally { checking = false; }
    };
    window.fetch = async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input), window.location.href);
      const localApi = url.origin === window.location.origin && url.pathname.startsWith("/api/");
      const publicRequest = /\/api\/admin\/(login|logout|password-recovery\/)/.test(url.pathname);
      if (localApi && active && !publicRequest && Date.now() >= expiresAt) {
        // Another tab may have renewed the session since the last check.
        await check();
      }
      if (localApi && closing && !publicRequest) return new Promise<Response>(() => {});
      const response = await originalFetch(input, init);
      if (!localApi) return response;
      if (response.ok && (url.pathname === "/api/admin/login" || url.pathname === "/api/session/me")) {
        active = true;
        if (url.pathname === "/api/session/me") {
          const data = await response.clone().json();
          expiresAt = data.expiresAt;
        } else void check();
      }
      if (response.ok && url.pathname === "/api/admin/logout") active = false;
      if (response.status === 401 && active && !publicRequest) {
        expire();
        // Do not deliver the 401 to module handlers that display technical alerts.
        return new Promise<Response>(() => {});
      }
      return response;
    };
    const activity = () => {
      if (!active || closing || Date.now() - lastPing < 30_000) return;
      lastPing = Date.now();
      void window.fetch("/api/session/ping", { method: "POST" }).then(() => check()).catch(() => {});
    };
    const events = ["pointerdown", "pointermove", "keydown", "scroll", "touchstart"] as const;
    for (const event of events) window.addEventListener(event, activity, { passive: true });
    const resume = () => { if (document.visibilityState === "visible") void check(); };
    window.addEventListener("focus", resume);
    document.addEventListener("visibilitychange", resume);
    const timer = window.setInterval(() => { void check(); }, 10_000);
    void check();
    return () => {
      window.fetch = originalFetch;
      window.clearInterval(timer);
      for (const event of events) window.removeEventListener(event, activity);
      window.removeEventListener("focus", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, []);
  return null;
}
