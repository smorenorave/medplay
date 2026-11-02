/* eslint-disable @typescript-eslint/no-require-imports -- Isolated regression runner. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });
const { readExpirations } = require('../lib/expirations.ts');
const { expirationBucket } = require('../lib/expirationsClient.ts');
const { recordDeletion } = require('../lib/recordDeletion.ts');
const bus = require('../lib/accountDataChanges.ts');

function fixture() {
  const account = { id: 7, correo: 'test@example.com', contrasena: 'key', plataforma_id: 1, plataformas: { nombre: 'Prueba' } };
  const common = { usuarios: { nombre: 'Prueba' }, contacto: 'test', estado: 'ACTIVA', fecha_compra: new Date('2026-09-29'), passwordManagedAt: new Date('2026-10-30'), total_ganado: '1000' };
  let state = {
    screens: ['2026-10-29', '2026-11-02', '2026-11-03', '2026-12-01'].map((date, i) => ({ ...common, id: i + 1, cuenta_id: 7, nro_pantalla: String(i + 1), fecha_vencimiento: new Date(date), total_pagado: '14900', total_pagado_proveedor: '13900' })),
    accounts: [{ ...common, id: 9007199254740993n, correo: 'complete@example.com', plataforma_id: 1, fecha_vencimiento: new Date('2026-10-28'), total_pagado_completa: '14900', total_pagado_proveedor_completa: '13900' }],
    history: [], finance: [{ id: 1, ingreso: 14900 }], revision: 0,
  };
  const db = { $transaction: async (work, options) => {
    assert.ok(['RepeatableRead', 'Serializable'].includes(options.isolationLevel));
    const draft = structuredClone(state);
    const tx = {
      $queryRaw: async () => [{ id: 7 }],
      pantallas: {
        findMany: async query => {
          assert.equal(query.where, undefined, 'password management and stale status must not suppress rows');
          assert.equal(query.take, undefined, 'no silent first-page truncation');
          return draft.screens.map(row => ({ ...row, cuentascompartidas: account }));
        },
        findUnique: async ({ where, select }) => {
          const row = draft.screens.find(row => row.id === where.id);
          return row && (select ? { cuenta_id: row.cuenta_id } : { ...row, cuentascompartidas: account });
        },
        count: async () => draft.screens.length,
        delete: async ({ where }) => { draft.screens = draft.screens.filter(row => row.id !== where.id); },
      },
      cuentascompletas: { findMany: async query => { assert.deepEqual(query.where, { fecha_vencimiento: { not: null } }); return draft.accounts; } },
      deletedAccountHistory: { create: async ({ data }) => { draft.history.push(data); } },
      accountDataRevision: { upsert: async () => ({ revision: BigInt(++draft.revision) }) },
    };
    const result = await work(tx); state = draft; return result;
  } };
  return { db, get state() { return state; } };
}

test('Bogota buckets at midnight UTC and Colombian midnight, including year boundary', t => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-11-03T04:59:59Z') });
  assert.equal(expirationBucket('2026-10-29'), 'anteriores');
  assert.equal(expirationBucket('2026-11-02'), 'hoy');
  assert.equal(expirationBucket('2026-11-03'), 'manana');
  assert.equal(expirationBucket('2026-11-04'), 'proximos');
  t.mock.timers.tick(1000);
  assert.equal(expirationBucket('2026-11-02'), 'anteriores');
  assert.equal(expirationBucket('2026-11-03'), 'hoy');
  assert.equal(expirationBucket('2027-01-01', '2026-12-31'), 'manana');
  for (const date of ['', null, '2026-02-31']) assert.equal(expirationBucket(date), null);
});

test('single database snapshot includes managed expired screens and accounts, normalized dates and exact IDs', async () => {
  const f = fixture();
  const { items, timeZone } = await readExpirations(f.db);
  assert.equal(timeZone, 'America/Bogota');
  assert.equal(items.length, 5);
  assert.equal(items[0].id, '9007199254740993');
  assert.doesNotThrow(() => JSON.stringify(items));
  const counts = { anteriores: 0, hoy: 0, manana: 0, proximos: 0 };
  for (const row of items) counts[expirationBucket(row.fecha_vencimiento, '2026-11-02')]++;
  assert.deepEqual(counts, { anteriores: 2, hoy: 1, manana: 1, proximos: 1 });
  assert.equal(items[1].total_pagado, 14900);
  assert.equal(items[1].fecha_compra, '2026-09-29');
});

test('confirmed screen deletion uses the operational ID; refresh and reload agree, siblings and finance survive', async () => {
  const f = fixture(), before = structuredClone(f.state);
  const target = { tipo: 'pantalla', id: '1' };
  const preview = await recordDeletion(f.db, target, 1);
  assert.equal(preview.last, false);
  await recordDeletion(f.db, target, 1, { cuentaId: preview.cuentaId, action: 'record' });
  assert.deepEqual(f.state.screens, before.screens.slice(1));
  assert.deepEqual(f.state.accounts, before.accounts);
  assert.deepEqual(f.state.finance, before.finance);
  assert.equal(f.state.history.length, 1);
  for (let reload = 0; reload < 2; reload++) {
    const data = await readExpirations(f.db);
    assert.equal(data.items.some(row => row.tipo === 'pantalla' && row.id === '1'), false);
    assert.equal(data.items.filter(row => row.tipo === 'pantalla').length, 3);
  }
});

test('renewal notifications invalidate in-flight reads and refresh same-tab and other-tab views', async () => {
  const values = new Map();
  global.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  global.window = new EventTarget();
  let changes = 0, cache = ['old'], resolveOld;
  const stop = bus.subscribeAccountDeletion(() => changes++);
  const unlisten = bus.listenAccountDeletionStorage();
  bus.registerAccountCache(() => { cache = []; });
  let reads = 0;
  const pending = bus.readCurrentAccountData(() => ++reads === 1 ? new Promise(resolve => { resolveOld = resolve; }) : Promise.resolve(['renewed']));
  bus.notifyAccountUpdate();
  resolveOld(['expired']);
  assert.deepEqual(await pending, ['renewed']);
  assert.deepEqual(cache, []);
  assert.equal(changes, 1);
  values.delete('__account_data_updated');
  window.dispatchEvent(Object.assign(new Event('storage'), { key: '__account_data_updated', newValue: '1' }));
  assert.equal(changes, 2);
  assert.equal(values.has('__account_data_updated'), false, 'cross-tab notification must not loop');
  unlisten(); stop();
});
