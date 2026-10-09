/* eslint-disable @typescript-eslint/no-require-imports -- Native Node test runner. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });

// Execute the real route handlers against a transactional adapter, without
// connecting to or changing the application's database.
let active;
global.prisma = new Proxy({}, { get: (_, key) => active.db[key] });
const resolve = Module._resolveFilename;
Module._resolveFilename = function(request, ...args) {
  if (request.startsWith('@/lib/')) request = path.resolve(__dirname, '../lib', request.slice(6));
  else if (request.startsWith('@generated/')) request = path.resolve(__dirname, '../src/generated', request.slice(11));
  return resolve.call(this, request, ...args);
};
const complete = require('../src/app/api/cuentascompletas/route.ts');
const completeEdit = require('../src/app/api/cuentascompletas/[id]/route.ts');
const screen = require('../src/app/api/pantallas/route.ts');
const screenEdit = require('../src/app/api/pantallas/[id]/route.ts');
Module._resolveFilename = resolve;

function fixture() {
  const dates = { fecha_compra: new Date('2026-10-09'), fecha_vencimiento: new Date('2026-11-09') };
  let state = {
    inventario: [{ id: 7, plataforma_id: 1, correo: 'stock@example.com', clave: 'stock-key' }, { id: 8, plataforma_id: 2, correo: 'stock@example.com', clave: 'other-key' }],
    usuarios: [{ contacto: '3001234567', nombre: 'Cliente' }],
    plataformas: [{ id: 1 }, { id: 2 }],
    cuentascompartidas: [{ id: 10, plataforma_id: 1, correo: 'old@example.com', contrasena: 'old-key' }],
    cuentascompletas: [{ id: 20, plataforma_id: 1, correo: 'old@example.com', contrasena: 'old-key', contacto: '3001234567', ...dates }],
    pantallas: [{ id: 30, cuenta_id: 10, contacto: '3001234567', nro_pantalla: '1', estado: 'ACTIVA', ...dates }],
  };
  let failure = '';
  let queue = Promise.resolve();
  function matches(row, where = {}) {
    return Object.entries(where).every(([key, value]) => {
      if (key === 'usuarios') return row.contacto === value.contacto;
      return value === undefined || row[key] === value;
    });
  }
  function decorate(table, row) {
    if (!row) return null;
    const result = structuredClone(row);
    if (table === 'pantallas' || table === 'cuentascompletas') result.usuarios = structuredClone(state.usuarios.find(u => u.contacto === row.contacto));
    if (table === 'pantallas') result.cuentascompartidas = structuredClone(state.cuentascompartidas.find(c => c.id === row.cuenta_id));
    return result;
  }
  function apply(row, data) {
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue;
      if (key === 'cuentascompartidas') row.cuenta_id = value.connect.id;
      else if (key === 'usuarios') row.contacto = value.connect.contacto;
      else row[key] = value;
    }
  }
  const tx = {};
  for (const table of Object.keys(state)) {
    const check = method => { if (failure === `${table}.${method}`) throw new Error('Injected save failure'); };
    const find = ({ where } = {}) => decorate(table, state[table].find(row => matches(row, where)));
    tx[table] = {
      findUnique: async args => find(args), findFirst: async args => find(args),
      findUniqueOrThrow: async args => { const row = find(args); if (!row) throw Object.assign(new Error('missing'), { code: 'P2025' }); return row; },
      count: async ({ where } = {}) => state[table].filter(row => matches(row, where)).length,
      create: async ({ data }) => {
        check('create');
        if (table === 'usuarios' && state.usuarios.some(u => u.contacto === data.contacto)) throw Object.assign(new Error('duplicate'), { code: 'P2002' });
        const row = { id: 100 + state[table].length, ...data };
        state[table].push(row); return decorate(table, row);
      },
      update: async ({ where, data }) => {
        check('update'); const row = state[table].find(r => matches(r, where));
        if (!row) throw Object.assign(new Error('missing'), { code: 'P2025' });
        const oldContacto = row.contacto;
        apply(row, data);
        if (table === 'usuarios' && data.contacto) for (const name of ['pantallas', 'cuentascompletas']) for (const sale of state[name]) if (sale.contacto === oldContacto) sale.contacto = data.contacto;
        return decorate(table, row);
      },
      updateMany: async ({ where, data }) => { check('updateMany'); const rows = state[table].filter(row => matches(row, where)); rows.forEach(row => apply(row, data)); return { count: rows.length }; },
      deleteMany: async ({ where }) => { check('deleteMany'); const rows = state[table].filter(row => matches(row, where)); state[table] = state[table].filter(row => !rows.includes(row)); return { count: rows.length }; },
      delete: async ({ where }) => { check('delete'); const row = find({ where }); state[table] = state[table].filter(r => !matches(r, where)); return row; },
      upsert: async ({ where, create, update }) => find({ where }) ? tx[table].update({ where, data: update }) : tx[table].create({ data: create }),
    };
  }
  const db = { ...tx, $transaction: fn => {
    const pending = queue.then(async () => {
      const before = structuredClone(state);
      try { return await fn(tx); } catch (error) { state = before; throw error; }
    });
    queue = pending.catch(() => {}); return pending;
  } };
  return { db, state: () => structuredClone(state), fail: value => { failure = value; } };
}

const payload = { inventario_id: 7, plataforma_id: 1, correo: 'stock@example.com', contrasena: 'stock-key', contacto: '3001234567', fecha_compra: '2026-10-09', fecha_vencimiento: '2026-11-09', estado: 'ACTIVA', nro_pantalla: '2', pin: '1234' };
const flows = [
  { name: 'crear completa', route: complete.POST, table: 'cuentascompletas', failure: 'cuentascompletas.create' },
  { name: 'editar completa', route: completeEdit.PATCH, table: 'cuentascompletas', id: 20, failure: 'cuentascompletas.update' },
  { name: 'crear pantalla', route: screen.POST, table: 'pantallas', failure: 'pantallas.create' },
  { name: 'editar pantalla', route: screenEdit.PATCH, table: 'pantallas', id: 30, failure: 'pantallas.update' },
];
const call = (flow, data = payload) => flow.route(new Request('http://localhost/api/test', { method: flow.id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }), { params: Promise.resolve({ id: String(flow.id) }) });

for (const flow of flows) {
  test(`${flow.name}: consume exactamente el inventario seleccionado y conserva la venta`, async () => {
    active = fixture(); const response = await call(flow);
    assert.equal(response.status, flow.id ? 200 : 201, await response.text());
    const state = active.state(); assert.deepEqual(state.inventario.map(r => r.id), [8]);
    const sale = flow.id ? state[flow.table].find(r => r.id === flow.id) : state[flow.table].at(-1);
    const account = flow.table === 'pantallas' ? state.cuentascompartidas.find(c => c.id === sale.cuenta_id) : sale;
    assert.equal(account.correo, payload.correo); assert.equal(account.contrasena, payload.contrasena); assert.equal(account.plataforma_id, 1);
    assert.equal(sale.contacto, payload.contacto);
  });
  test(`${flow.name}: un error al guardar revierte el retiro y todos los cambios`, async () => {
    active = fixture(); const before = active.state(); active.fail(flow.failure);
    const response = await call(flow); assert.equal(response.status, 500); assert.deepEqual(active.state(), before);
  });
  test(`${flow.name}: bloquea una selección utilizada sin guardar cambios`, async () => {
    active = fixture(); await active.db.inventario.deleteMany({ where: { id: 7 } }); const before = active.state();
    const response = await call(flow); assert.equal(response.status, 409); assert.match((await response.json()).detail, /ya fue utilizado/); assert.deepEqual(active.state(), before);
  });
  test(`${flow.name}: sin selección no retira inventario`, async () => {
    active = fixture(); const before = active.state().inventario;
    const response = await call(flow, { ...payload, inventario_id: null });
    assert.equal(response.status, flow.id ? 200 : 201); assert.deepEqual(active.state().inventario, before);
  });
  test(`${flow.name}: rechaza un ID que pertenece a otra plataforma`, async () => {
    active = fixture(); const before = active.state(); const response = await call(flow, { ...payload, inventario_id: 8 });
    assert.equal(response.status, 409); assert.deepEqual(active.state(), before);
  });
}

test('cuatro operaciones simultáneas solo pueden consumir el registro una vez', async () => {
  active = fixture(); const responses = await Promise.all(flows.map(flow => call(flow)));
  assert.equal(responses.filter(response => response.ok).length, 1);
  assert.equal(responses.filter(response => response.status === 409).length, 3);
  assert.deepEqual(active.state().inventario.map(r => r.id), [8]);
});

for (const contacto of ['3009999999', '3002222222']) {
  test(`editar completa con cambio de contacto ${contacto} también consume inventario`, async () => {
    active = fixture();
    if (contacto === '3002222222') await active.db.usuarios.create({ data: { contacto } });
    const response = await call(flows[1], { ...payload, contacto }); assert.equal(response.status, 200);
    assert.deepEqual(active.state().inventario.map(r => r.id), [8]);
  });
}

test('aplicar correo a todas conserva la cuenta compartida y consume una sola vez', async () => {
  active = fixture(); await active.db.pantallas.create({ data: { cuenta_id: 10, contacto: payload.contacto, nro_pantalla: '3' } });
  const response = await call(flows[3], { ...payload, applyCorreoCuenta: true }); assert.equal(response.status, 200);
  assert.equal(active.state().cuentascompartidas.find(c => c.id === 10).correo, payload.correo);
  assert.ok(active.state().pantallas.every(p => p.cuenta_id === 10));
  assert.deepEqual(active.state().inventario.map(r => r.id), [8]);
});

test('fallo posterior al cambio compartido revierte también la cuenta y el inventario', async () => {
  active = fixture(); active.fail('usuarios.update'); const before = active.state();
  const response = await call(flows[3], { ...payload, applyCorreoCuenta: true, nombre: 'Nuevo' });
  assert.equal(response.status, 500); assert.deepEqual(active.state(), before);
});

test('fallo al retirar inventario impide guardar la venta', async () => {
  for (const flow of flows) {
    active = fixture(); active.fail('inventario.deleteMany'); const before = active.state();
    const response = await call(flow); assert.equal(response.status, 500); assert.deepEqual(active.state(), before);
  }
});
