/* eslint-disable @typescript-eslint/no-require-imports -- Standalone isolated regression. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });
const { recordDeletion } = require('../lib/recordDeletion.ts');
function fixture(count = 2) {
  let state = { accounts: Array.from({ length: count }, (_, i) => ({ id: BigInt(i + 1), correo: 'Same@Example.com ', plataforma_id: 1, contrasena: 'key', proveedor: 'proveedor', plataformas: { nombre: 'Test' }, fecha_vencimiento: new Date('2099-01-01'), estado: 'ACTIVA' })), shared: [], inventory: [], history: [], users: ['keep'], revision: 0 };
  let fail = '', queue = Promise.resolve();
  const db = { $transaction(work, options) {
    assert.equal(options.isolationLevel, 'Serializable');
    const run = queue.then(async () => {
      const draft = structuredClone(state);
      const tx = {
        $queryRaw: async (sql, ...values) => {
          const query = sql.join('?');
          const list = query.includes('cuentascompartidas') ? draft.shared : draft.accounts;
          return query.includes('LOWER') ? list.filter(r => r.correo.trim().toLowerCase() === values[0] && r.plataforma_id === values[1]).map(r => ({ id: r.id })) : list.filter(r => r.id === values[0]);
        },
        cuentascompletas: {
          findUnique: async ({ where }) => draft.accounts.find(r => r.id === where.id),
          delete: async ({ where }) => { if (fail === 'delete') throw Error('delete failed'); draft.accounts = draft.accounts.filter(r => r.id !== where.id); },
        },
        inventario: {
          findUnique: async ({ where }) => draft.inventory.find(r => r.correo === where.plataforma_id_correo.correo && r.plataforma_id === where.plataforma_id_correo.plataforma_id),
          create: async ({ data }) => { if (fail === 'inventory') throw Error('inventory failed'); draft.inventory.push(data); },
        },
        deletedAccountHistory: { create: async ({ data }) => { if (fail === 'history') throw Error('history failed'); draft.history.push(data); } },
        accountDataRevision: { upsert: async () => ({ revision: BigInt(++draft.revision) }) },
      };
      const result = await work(tx); state = draft; return result;
    }); queue = run.catch(() => {}); return run;
  } };
  return { db, get state() { return state; }, fail(value) { fail = value; } };
}
const preview = (f, id = '1') => recordDeletion(f.db, { tipo: 'completa', id }, 1);
const remove = (f, action, id = '1') => recordDeletion(f.db, { tipo: 'completa', id }, 1, { cuentaId: id, action });
test('preview/cancel preserves data; non-last removes only selected ID despite matching email and future expiry', async () => {
  const f = fixture(); const before = structuredClone(f.state);
  assert.deepEqual(await preview(f), { cuentaId: '1', last: false, count: 2 }); assert.deepEqual(f.state, before);
  await remove(f, 'record'); assert.deepEqual(f.state.accounts.map(r => r.id), [2n]); assert.deepEqual(f.state.users, ['keep']); assert.equal(f.state.inventory.length, 0);
});
test('last inventory and deletion commit together, with full history and no unrelated removal', async () => {
  const f = fixture(1); f.state.accounts.push({ ...f.state.accounts[0], id: 90n, plataforma_id: 2 });
  await remove(f, 'inventory'); assert.deepEqual(f.state.accounts.map(r => r.id), [90n]); assert.equal(f.state.inventory[0].correo, 'same@example.com'); assert.equal(f.state.history.length, 1); assert.equal(f.state.history[0].datosRecuperacion.cuenta.id, '1');
});
test('last purge retains inventory, users and independent accounts', async () => {
  const f = fixture(1); f.state.inventory.push({ correo: 'same@example.com', plataforma_id: 1, clave: 'key' });
  await remove(f, 'purge'); assert.equal(f.state.accounts.length, 0); assert.equal(f.state.inventory.length, 1); assert.deepEqual(f.state.users, ['keep']);
});
for (const failure of ['inventory', 'history', 'delete']) test('rollback all changes on ' + failure + ' failure', async () => {
  const f = fixture(1), before = structuredClone(f.state); f.fail(failure);
  await assert.rejects(remove(f, 'inventory')); assert.deepEqual(f.state, before);
});
test('stale final/nonfinal choice refuses without collateral mutations', async () => {
  const f = fixture(); await assert.rejects(remove(f, 'purge'), /asociaciones/);
  await remove(f, 'record'); await assert.rejects(remove(f, 'record', '2'), /asociaciones/); assert.equal(f.state.accounts.length, 1);
});
test('inventory credential conflict or shared account prevents transfer, never overwrites', async () => {
  const f = fixture(1); f.state.inventory.push({ correo: 'same@example.com', plataforma_id: 1, clave: 'different' });
  await assert.rejects(remove(f, 'inventory'), /credenciales/); assert.equal(f.state.accounts.length, 1);
  f.state.inventory = []; f.state.shared.push({ id: 90, correo: 'SAME@example.com', plataforma_id: 1 });
  await assert.rejects(remove(f, 'inventory'), /compartida/); assert.equal(f.state.accounts.length, 1);
});
test('sequential batch recalculates last, stores inventory once; duplicate deletion cannot commit twice', async () => {
  const f = fixture(3);
  for (const id of ['1', '2', '3']) { const p = await preview(f, id); await remove(f, p.last ? 'inventory' : 'record', id); }
  assert.equal(f.state.inventory.length, 1); assert.equal(f.state.history.length, 3);
  await assert.rejects(remove(f, 'purge', '3'), /no existe/);
});
const Module = require('node:module'), path = require('node:path');
const resolve = Module._resolveFilename;
Module._resolveFilename = function(request, ...args) { if (request.startsWith('@/lib/')) request = path.join(__dirname, '../lib', request.slice(6)); return resolve.call(this, request, ...args); };
let routeFixture = fixture(1), adminId = 1;
require.cache[require.resolve('../lib/db.ts')] = { exports: { prisma: new Proxy({}, { get: (_, key) => routeFixture.db[key] }) } };
require.cache[require.resolve('../lib/adminSession.ts')] = { exports: { getAuthenticatedAdminId: async () => adminId } };
const route = require('../src/app/api/record-deletions/route.ts');
const request = (method, body) => route[method](new Request('http://localhost/api/record-deletions', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
test('shared endpoint authenticates, rejects global payloads and requires explicit action', async () => {
  routeFixture = fixture(1); adminId = null; assert.equal((await request('POST', { target: { tipo: 'completa', id: '1' } })).status, 401); adminId = 1;
  for (const body of [{ correos: ['same@example.com'] }, { target: { tipo: 'completa', id: '1' } }, { target: { tipo: 'completa', id: '-1' }, decision: { cuentaId: '1', action: 'purge' } }]) assert.equal((await request('DELETE', body)).status, 400);
  assert.equal(routeFixture.state.accounts.length, 1);
});
test('shared endpoint preview followed by one explicit click action, no typed confirmation', async () => {
  routeFixture = fixture(1);
  const target = { tipo: 'completa', id: '1' };
  const p = await (await request('POST', { target })).json(); assert.equal(p.last, true);
  assert.equal((await request('DELETE', { target, decision: { cuentaId: p.cuentaId, action: 'purge' } })).status, 200);
  assert.equal(routeFixture.state.accounts.length, 0);
});
