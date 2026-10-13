/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner with isolated data. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });
const { pantallaDeletion } = require('../lib/pantallaDeletion.ts');

// Transactional in-memory adapter: no connection to customer data. It models
// serial execution/rollback; actual MySQL locking needs a separate integration run.
function fixture(n = 6) {
  const account = { id: 1, correo: 'test@example.com', contrasena: 'test-key', plataforma_id: 1, proveedor: 'test', plataformas: { nombre: 'Test' } };
  let state = { accounts: [account], screens: Array.from({ length: n }, (_, i) => ({ id: i + 1, cuenta_id: 1, contacto: 'same-phone', nro_pantalla: String(i + 1), total_pagado: '6900', total_ganado: '6000' })), inventory: [], complete: [{ id: 99, correo: 'independent@example.com' }], users: ['same-phone'], history: [{ dedupeKey: 'prior', amount: 20 }], metrics: [{ amount: 30 }], revision: 0 };
  let queue = Promise.resolve(), failAudit = false, conflict = false;
  const db = { $transaction(work, options) {
    assert.equal(options.isolationLevel, 'Serializable');
    const run = queue.then(async () => {
      const draft = structuredClone(state);
      if (conflict) { conflict = false; throw Object.assign(new Error('retry'), { code: 'P2034' }); }
      const tx = {
        $queryRaw: async (_query, accountId) => { assert.equal(typeof accountId, 'number'); return [{ id: accountId }]; },
        pantallas: {
          findUnique: async ({ where, select }) => { const row = draft.screens.find(s => s.id === where.id); return row ? select ? { cuenta_id: row.cuenta_id } : { ...row, cuentascompartidas: draft.accounts.find(a => a.id === row.cuenta_id) } : null; },
          count: async ({ where }) => draft.screens.filter(s => s.cuenta_id === where.cuenta_id).length,
          delete: async ({ where }) => { assert.equal(typeof where.id, 'number'); assert.equal(typeof where.cuenta_id, 'number'); draft.screens = draft.screens.filter(s => !(s.id === where.id && s.cuenta_id === where.cuenta_id)); },
        },
        cuentascompartidas: {
          findFirst: async ({ where }) => draft.accounts.find(a => a.id !== where.id.not && a.correo === where.correo && a.plataforma_id === where.plataforma_id),
          deleteMany: async ({ where }) => { assert.deepEqual(where.pantallas, { none: {} }); if (draft.screens.some(s => s.cuenta_id === where.id)) return { count: 0 }; draft.accounts = draft.accounts.filter(a => a.id !== where.id); return { count: 1 }; },
        },
        cuentascompletas: { findFirst: async ({ where }) => draft.complete.find(a => a.correo === where.correo && a.plataforma_id === where.plataforma_id) },
        inventario: {
          findUnique: async ({ where }) => draft.inventory.find(a => a.correo === where.plataforma_id_correo.correo && a.plataforma_id === where.plataforma_id_correo.plataforma_id),
          create: async ({ data }) => { draft.inventory.push({ id: 1, ...data }); },
        },
        deletedAccountHistory: { create: async ({ data }) => { if (failAudit) throw new Error('audit unavailable'); draft.history.push(data); } },
        accountDataRevision: { upsert: async () => ({ revision: BigInt(++draft.revision) }) },
      };
      const result = await work(tx); state = draft; return result;
    });
    queue = run.catch(() => {}); return run;
  } };
  return { db, get state() { return state; }, failAudit() { failAudit = true; }, conflict() { conflict = true; } };
}
const remove = (f, id, action = 'record', cuentaId = 1) => pantallaDeletion(f.db, id, 1, { cuentaId, action });

test('six screens sharing email and phone: only middle assignment removed, counts and account retained', async () => {
  const f = fixture(); const siblings = f.state.screens.filter(s => s.id !== 3);
  const result = await remove(f, 3);
  assert.deepEqual(f.state.screens, siblings); assert.equal(result.count, 5); assert.equal(f.state.accounts.length, 1);
  assert.deepEqual(f.state.users, ['same-phone']); assert.equal(6 - result.count, 1);
});
test('last assignment inventory preserves parent/credentials and removes client assignment', async () => {
  const f = fixture(1); const original = structuredClone(f.state.accounts);
  assert.equal((await pantallaDeletion(f.db, 1, 1)).last, true);
  await remove(f, 1, 'inventory'); assert.deepEqual(f.state.accounts, original); assert.equal(f.state.screens.length, 0);
  assert.deepEqual(f.state.inventory, [{ id: 1, plataforma_id: 1, correo: 'test@example.com', clave: 'test-key' }]);
});
test('matching inventory is not duplicated or modified', async () => {
  const f = fixture(1); f.state.inventory.push({ id: 9, plataforma_id: 1, correo: 'test@example.com', clave: 'test-key' });
  await remove(f, 1, 'inventory'); assert.equal(f.state.inventory.length, 1); assert.equal(f.state.inventory[0].id, 9);
});
test('last purge only deletes exact parent, retaining other account with same email and its screens', async () => {
  const f = fixture(1); f.state.accounts.push({ ...f.state.accounts[0], id: 2 }); f.state.screens.push({ ...f.state.screens[0], id: 20, cuenta_id: 2 });
  await remove(f, 1, 'purge'); assert.deepEqual(f.state.accounts.map(a => a.id), [2]); assert.deepEqual(f.state.screens.map(s => s.id), [20]);
});
test('preview followed by cancel does not change data', async () => {
  const f = fixture(); const before = structuredClone(f.state); await pantallaDeletion(f.db, 2, 1); assert.deepEqual(f.state, before);
});
test('stale last decision and wrong account fail closed', async () => {
  for (const [n, action, account] of [[2, 'purge', 1], [2, 'inventory', 1], [1, 'record', 1], [2, 'record', 2]]) {
    const f = fixture(n), before = structuredClone(f.state); await assert.rejects(remove(f, 1, action, account)); assert.deepEqual(f.state, before);
  }
});
test('concurrent last two deletions do not silently delete the final parent', async () => {
  const f = fixture(2); const results = await Promise.allSettled([remove(f, 1), remove(f, 2)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1); assert.equal(f.state.screens.length, 1); assert.equal(f.state.accounts.length, 1);
  await remove(f, f.state.screens[0].id, 'inventory'); assert.equal(f.state.inventory.length, 1);
});
test('duplicate concurrent clicks commit only once and deadlock is retried', async () => {
  const f = fixture(); f.conflict(); const results = await Promise.allSettled([remove(f, 2), remove(f, 2)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1); assert.equal(f.state.history.length, 2); assert.equal(f.state.screens.length, 5);
});
test('financial snapshots and prior history, metrics, users, complete accounts and independent inventory survive', async () => {
  const f = fixture(1); f.state.inventory.push({ id: 50, correo: 'independent@example.com' }); const original = structuredClone(f.state);
  await remove(f, 1, 'purge'); for (const key of ['metrics', 'users', 'complete', 'inventory']) assert.deepEqual(f.state[key], original[key]);
  assert.deepEqual(f.state.history[0], original.history[0]); assert.equal(f.state.history[1].datosRecuperacion.pantalla.total_pagado, '6900');
});
test('audit failure rolls back inventory and deletion together', async () => {
  const f = fixture(1), before = structuredClone(f.state); f.failAudit(); await assert.rejects(remove(f, 1, 'inventory')); assert.deepEqual(f.state, before);
});
test('ambiguous inventory or credential conflict changes nothing', async () => {
  for (const kind of ['shared', 'complete', 'inventory']) {
    const f = fixture(1);
    if (kind === 'shared') f.state.accounts.push({ ...f.state.accounts[0], id: 2 });
    if (kind === 'complete') f.state.complete.push({ ...f.state.accounts[0], id: 5 });
    if (kind === 'inventory') f.state.inventory.push({ id: 1, plataforma_id: 1, correo: 'test@example.com', clave: 'other' });
    const before = structuredClone(f.state); await assert.rejects(remove(f, 1, 'inventory')); assert.deepEqual(f.state, before);
  }
});
test('consecutive selected IDs retain unselected assignments', async () => {
  const f = fixture(); for (const id of [1, 3, 5]) await remove(f, id); assert.deepEqual(f.state.screens.map(s => s.id), [2, 4, 6]);
});
test('viewer individual and bulk paths cannot call global deletion', () => {
  const viewer = fs.readFileSync('src/components/viewers/PantallasViewer.tsx', 'utf8');
  assert.doesNotMatch(viewer, /deleteEmailsGlobally|ELIMINAR TODO|account-deletions|ensureInInventario/);
  assert.match(viewer, /deleteRequest\(deleteTarget.id, deleteTarget.cuentaId/); assert.match(viewer, /deleteRequest\(it.id, current.cuentaId/);
  assert.match(viewer, /disabled=\{deleting \|\| checkingArchive \|\| !deleteTarget.cuentaId\}/);
});

const Module = require('node:module');
const path = require('node:path');
const resolve = Module._resolveFilename;
Module._resolveFilename = function(request, ...args) {
  if (request.startsWith('@/lib/')) request = path.join(__dirname, '../lib', request.slice(6));
  if (request === '@generated/prisma') request = path.join(__dirname, '../src/generated/prisma');
  return resolve.call(this, request, ...args);
};
let routeFixture, adminId = 1;
require.cache[require.resolve('../lib/db.ts')] = { exports: { prisma: new Proxy({}, { get: (_target, key) => routeFixture.db[key] }) } };
require.cache[require.resolve('../lib/adminSession.ts')] = { exports: { getAuthenticatedAdminId: async () => adminId } };
const route = require('../src/app/api/pantallas/[id]/route.ts');
const request = (body, id = '1') => route.DELETE(new Request(`http://localhost/api/pantallas/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), { params: Promise.resolve({ id }) });
test('actual endpoint authenticates and rejects email-only, missing decisions and invalid IDs without writes', async () => {
  routeFixture = fixture(); const before = structuredClone(routeFixture.state);
  adminId = null; assert.equal((await request({ cuentaId: 1, action: 'record' })).status, 401); adminId = 1;
  for (const body of [null, {}, { correo: 'test@example.com' }, { cuentaId: 1, action: 'global' }]) assert.equal((await request(body)).status, 400);
  assert.equal((await request({ cuentaId: 1, action: 'record' }, '-1')).status, 400);
  assert.deepEqual(routeFixture.state, before);
});
test('actual endpoint previews authoritative account count and commits one assignment', async () => {
  routeFixture = fixture(); adminId = 1;
  const preview = await route.GET(new Request('http://localhost/api/pantallas/1?deletion=preview'), { params: Promise.resolve({ id: '1' }) });
  assert.deepEqual(await preview.json(), { cuentaId: 1, last: false, count: 6 });
  const response = await request({ cuentaId: 1, action: 'record' }); assert.equal(response.status, 200);
  assert.equal((await response.json()).count, 5); assert.equal(routeFixture.state.screens.length, 5);
});
