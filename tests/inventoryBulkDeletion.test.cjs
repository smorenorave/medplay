/* eslint-disable @typescript-eslint/no-require-imports -- Isolated API regression. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });
const resolve = Module._resolveFilename;
Module._resolveFilename = function(request, ...args) {
  if (request.startsWith('@/lib/')) request = path.join(__dirname, '../lib', request.slice(6));
  return resolve.call(this, request, ...args);
};
let adminId = 1, failAudit = false, state;
const reset = () => { state = { inventory: [1, 2, 3].map(id => ({ id, plataforma_id: id, correo: 'same@example.test', clave: 'key', plataformas: { nombre: 'Demo' } })), history: [], accounts: ['keep'], screens: ['keep'], users: ['keep'] }; };
require.cache[require.resolve('../lib/adminSession.ts')] = { exports: { getAuthenticatedAdminId: async () => adminId } };
require.cache[require.resolve('../lib/db.ts')] = { exports: { prisma: {
  $transaction: async (work, options) => {
    assert.equal(options.isolationLevel, 'Serializable');
    const draft = structuredClone(state);
    const result = await work({
      inventario: {
        findMany: async ({ where }) => draft.inventory.filter(row => where.id.in.includes(row.id)),
        deleteMany: async ({ where }) => {
          const before = draft.inventory.length;
          draft.inventory = draft.inventory.filter(row => !where.id.in.includes(row.id));
          return { count: before - draft.inventory.length };
        },
      },
      deletedAccountHistory: { upsert: async ({ create }) => { if (failAudit && draft.history.length === 1) throw Error('history unavailable'); draft.history.push(create); } },
    });
    state = draft;
    return result;
  },
} } };
const { DELETE } = require('../src/app/api/inventario/bulk-delete/route.ts');
const remove = body => DELETE(new Request('http://localhost/api/inventario/bulk-delete', { method: 'DELETE', body: JSON.stringify(body) }));
test('bulk deletes only selected IDs, archives them and preserves same-email records', async () => {
  reset();
  const response = await remove({ ids: [1, 2, 1], confirmed: true });
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { deleted: 2 });
  assert.deepEqual(state.inventory.map(row => row.id), [3]); assert.equal(state.history.length, 2);
  for (const key of ['accounts', 'screens', 'users']) assert.deepEqual(state[key], ['keep']);
  assert.deepEqual(await (await remove({ ids: [1, 2], confirmed: true })).json(), { deleted: 0 });
  assert.equal(state.history.length, 2);
});
test('authentication, explicit confirmation and valid bounded IDs are required', async () => {
  reset(); const before = structuredClone(state);
  adminId = null; assert.equal((await remove({ ids: [1], confirmed: true })).status, 401); adminId = 1;
  for (const body of [{ ids: [1] }, { ids: [], confirmed: true }, { ids: [-1], confirmed: true }, { ids: [1.2], confirmed: true }, { ids: Array(501).fill(1), confirmed: true }, { ids: [1], confirmed: true, correos: ['same@example.test'] }]) assert.equal((await remove(body)).status, 400);
  assert.deepEqual(state, before);
});
test('failed history persistence rolls back the entire selection', async () => {
  reset(); const before = structuredClone(state); failAudit = true;
  const log = console.error; console.error = () => {};
  try { assert.equal((await remove({ ids: [1, 2], confirmed: true })).status, 500); assert.deepEqual(state, before); }
  finally { failAudit = false; console.error = log; }
});
