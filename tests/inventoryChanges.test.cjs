/* eslint-disable @typescript-eslint/no-require-imports -- Native Node test runner. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });
const bus = require('../lib/inventoryChanges.ts');

function browser() {
  const values = new Map();
  global.localStorage = { get length() { return values.size; }, key: i => [...values.keys()][i], getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  global.window = new EventTarget();
  return values;
}

test('un retiro actualiza todos los suscriptores y limpia solo las cachés de inventario', () => {
  const values = browser();
  for (const key of ['__cc_inv_cache_v1:1', '__inventario_cache_v2:1', '__pantallas_cache_v3', '__pw_history_v2']) values.set(key, 'saved');
  let refresh = 0;
  const stop1 = bus.subscribeInventoryChanges(() => refresh++), stop2 = bus.subscribeInventoryChanges(() => refresh++);
  const before = bus.inventoryEpoch(); bus.notifyInventoryConsumed();
  assert.equal(refresh, 2); assert.equal(bus.inventoryEpoch(), before + 1);
  assert.equal(values.has('__cc_inv_cache_v1:1'), false); assert.equal(values.has('__inventario_cache_v2:1'), false);
  assert.equal(values.get('__pantallas_cache_v3'), 'saved'); assert.equal(values.get('__pw_history_v2'), 'saved');
  assert.ok(values.has('__inventory_consumed')); stop1(); stop2();
});

test('otra pestaña actualiza una sola vez sin rebroadcast ni borrado de datos de ventas', () => {
  const values = browser(); let refresh = 0;
  const stop1 = bus.subscribeInventoryChanges(() => refresh++), stop2 = bus.subscribeInventoryChanges(() => refresh++);
  const before = bus.inventoryEpoch();
  window.dispatchEvent(Object.assign(new Event('storage'), { key: '__inventory_consumed', newValue: 'committed' }));
  assert.equal(refresh, 2); assert.equal(bus.inventoryEpoch(), before + 1); assert.equal(values.has('__inventory_consumed'), false);
  stop1(); stop2();
});

test('seleccionar o cancelar sin notificar mantiene el inventario intacto', () => {
  const values = browser(); values.set('__cc_inv_cache_v1:1', 'available'); let refresh = 0;
  const stop = bus.subscribeInventoryChanges(() => refresh++);
  assert.equal(refresh, 0); assert.equal(values.get('__cc_inv_cache_v1:1'), 'available'); stop();
});
