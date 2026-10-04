"use client";
import { useEffect } from "react";
import { accountRevision, applyAccountDeletion, listenAccountDeletionStorage, subscribeAccountDeletion } from "@/lib/accountDataChanges";

export default function AccountDataSync() {
  useEffect(() => {
    let stopped = false;
    let running = false;
    // Copy the last locally applied revision once. Existing tabs retain their own cursor.
    // Replaying the entire history on every visit would clear newly recreated accounts' queues.
    const saved = accountRevision();
    let revision = /^\d{1,19}$/.test(saved) ? saved : "0";
    const unsubscribe = subscribeAccountDeletion(change => {
      if (BigInt(change.revision) > BigInt(revision)) revision = change.revision;
    });
    const sync = async () => {
      if (running || document.visibilityState === "hidden") return;
      running = true;
      try {
        const response = await fetch(`/api/account-data-revision?since=${revision}`, { cache: "no-store" });
        if (!response.ok || stopped) return;
        const result = await response.json();
        if (stopped) return;
        if (BigInt(result.revision) > BigInt(revision)) {
          applyAccountDeletion(result);
          revision = result.revision;
        }
      } catch { /* Retry on focus or the next poll. */ }
      finally { running = false; }
    };
    const unlisten = listenAccountDeletionStorage();
    const interval = setInterval(() => void sync(), 15000);
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    void sync();
    return () => { stopped = true; unsubscribe(); unlisten(); clearInterval(interval); window.removeEventListener("focus", sync); document.removeEventListener("visibilitychange", sync); };
  }, []);
  return null;
}
