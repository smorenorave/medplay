import test from "node:test";
import assert from "node:assert/strict";
import { INACTIVITY_MS, isSessionInactive } from "../lib/sessionPolicy";
import { recordPasswordChange, readPasswordChanges, deletePasswordChange, isResolvedExpiration } from "../lib/passwordChanges";
import { todayYMDLocal } from "../lib/dailyCache";

test("inactividad: rechaza fechas inválidas, futuras y exactamente una hora; acepta actividad reciente", () => {
  const now = Date.now();
  for (const raw of [undefined, "", "NaN", "Infinity", String(now + 1), String(now - INACTIVITY_MS)]) {
    assert.equal(isSessionInactive(raw, now), true);
  }
  assert.equal(isSessionInactive(String(now - INACTIVITY_MS + 1), now), false);
});

test("cambio de clave, sincronización, borrado aislado y persistencia de vencimientos resueltos", () => {
  const storage = new Map<string, string>();
  const events: Event[] = [];
  Object.defineProperty(globalThis, "window", { configurable: true, value: { dispatchEvent: (event: Event) => events.push(event) } });
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  } });
  try {
    recordPasswordChange(" Cuenta@Example.com ", "nueva", 2);
    recordPasswordChange("otra@example.com", "otra", 3);
    assert.equal(readPasswordChanges()["cuenta@example.com"].pw, "nueva");
    assert.equal(isResolvedExpiration("CUENTA@example.com", todayYMDLocal()), true);
    assert.equal(isResolvedExpiration("sin-cambio@example.com", todayYMDLocal()), false);
    assert.equal(isResolvedExpiration("cuenta@example.com", "2099-01-01"), false);
    deletePasswordChange("cuenta@example.com");
    assert.deepEqual(Object.keys(readPasswordChanges()), ["otra@example.com"]);
    assert.equal(isResolvedExpiration("cuenta@example.com", todayYMDLocal()), true);
    assert.equal(events.length, 3);
  } finally {
    Reflect.deleteProperty(globalThis, "window");
    Reflect.deleteProperty(globalThis, "localStorage");
  }
});
