// src/lib/cuentasMutationBus.ts
const KEY = 'cuentas:changed';

let bc: BroadcastChannel | undefined;
try { bc = new BroadcastChannel(KEY); } catch {}

export type CuentasEvent = { ts: number; payload?: any };

export function notifyCuentasChanged(payload?: any) {
  const msg: CuentasEvent = { ts: Date.now(), payload };
  bc?.postMessage(msg);
  try { localStorage.setItem(KEY, String(msg.ts)); } catch {}
}

export function subscribeCuentasChanges(cb: (ev: CuentasEvent) => void) {
  const onMsg = (e: MessageEvent<CuentasEvent>) => { if (e?.data?.ts) cb(e.data); };
  bc?.addEventListener?.('message', onMsg);

  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    const ts = Number(e.newValue || Date.now());
    cb({ ts });
  };
  window.addEventListener('storage', onStorage);

  return () => {
    bc?.removeEventListener?.('message', onMsg);
    window.removeEventListener('storage', onStorage);
  };
}
