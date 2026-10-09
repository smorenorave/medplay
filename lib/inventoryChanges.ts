"use client";

const EVENT = "inventory-consumed";
const STORAGE_KEY = "__inventory_consumed";
let generation = 0;
let subscribers = 0;
export const inventoryEpoch = () => generation;

function refreshInventory() {
  generation++;
  try {
    const keys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i));
    for (const key of keys) {
      if (key && /__cc_inv_cache|__inventario_cache/.test(key)) localStorage.removeItem(key);
    }
  } catch { /* Memory refresh works even without storage. */ }
  window.dispatchEvent(new Event(EVENT));
}

export function notifyInventoryConsumed() {
  refreshInventory();
  try { localStorage.setItem(STORAGE_KEY, `${Date.now()}:${Math.random()}`); } catch {}
}

function onStorage(event: StorageEvent) {
  if (event.key === STORAGE_KEY && event.newValue) refreshInventory();
}

export function subscribeInventoryChanges(refresh: () => void) {
  if (subscribers++ === 0) window.addEventListener("storage", onStorage);
  window.addEventListener(EVENT, refresh);
  return () => {
    window.removeEventListener(EVENT, refresh);
    if (--subscribers === 0) window.removeEventListener("storage", onStorage);
  };
}
