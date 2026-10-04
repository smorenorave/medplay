/* eslint-disable @typescript-eslint/no-require-imports -- Tests use the native Node runner and ts-node. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });
const bus = require('../lib/accountDataChanges.ts');

function browser() {
  const values = new Map();
  global.localStorage = { get length() { return values.size; }, key: index => [...values.keys()][index] ?? null, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) };
  global.window = new EventTarget();
  window.localStorage = localStorage;
  return values;
}

test('confirmed deletion clears all derived caches and only matching password entries', () => {
  const values = browser(); let cache = [{ correo: 'test@example.com' }];
  bus.registerAccountCache(() => { cache = []; });
  for (const key of ['__vencidas_daily_v6', '__pantallas_cache_v3', '__cuentas_cache_v2:1', '__inventario_cache_v2:1', '__cc_inv_cache_v1:2', '__usuarios_all_cache_v1', '__plat_cache_v2', '__pantallas_sum_v1:1', '__stamp_cuentas_all', '__pw_queue_daily_v1']) localStorage.setItem(key, 'old data');
  localStorage.setItem('unrelated-preference', 'keep');
  localStorage.setItem('__pw_history_v2', JSON.stringify({ ' Test@Example.COM ': { pw: 'remove' }, 'other@example.com': { pw: 'keep' } }));
  localStorage.setItem('__pw_resolved_expirations_v1', JSON.stringify({ 'test@example.com': '2026-10-04', 'other@example.com': '2026-10-04' }));
  let refresh = 0, queueChanged = 0;
  const stop = bus.subscribeAccountDeletion(change => { refresh++; assert.equal(change.revision, '1'); });
  window.addEventListener('password-changes-updated', () => queueChanged++);
  bus.applyAccountDeletion({ revision: '1', correos: ['test@example.com'] }); stop();
  assert.deepEqual(cache, []); assert.equal(refresh, 1); assert.equal(queueChanged, 1);
  assert.deepEqual(JSON.parse(localStorage.getItem('__pw_history_v2')), { 'other@example.com': { pw: 'keep' } });
  assert.deepEqual(JSON.parse(localStorage.getItem('__pw_resolved_expirations_v1')), { 'other@example.com': '2026-10-04' });
  assert.equal(values.get('unrelated-preference'), 'keep');
  assert.equal(bus.accountRevision(), '1');
  assert.equal(values.get('__vencidas_daily_v6'), undefined); assert.equal(values.get('__cc_inv_cache_v1:2'), undefined);
});

test('cross-tab notification refreshes memory without rebroadcasting the message', () => {
  browser(); let refresh = 0;
  const stop = bus.subscribeAccountDeletion(() => refresh++);
  const unlisten = bus.listenAccountDeletionStorage();
  const event = Object.assign(new Event('storage'), { key: '__account_data_deleted', newValue: JSON.stringify({ revision: '2', correos: ['test@example.com'] }) });
  window.dispatchEvent(event);
  assert.equal(refresh, 1); assert.equal(bus.accountRevision(), '2'); assert.equal(localStorage.getItem('__account_data_deleted'), null);
  unlisten(); stop();
});

test('a read that predates deletion is retried instead of returning deleted records', async () => {
  browser(); let resolveOld; let calls = 0;
  const pending = bus.readCurrentAccountData(() => {
    calls++;
    if (calls === 1) return new Promise(resolve => { resolveOld = resolve; });
    return Promise.resolve([{ correo: 'other@example.com' }]);
  });
  bus.applyAccountDeletion({ revision: '3', correos: ['test@example.com'] });
  resolveOld([{ correo: 'test@example.com' }]);
  assert.deepEqual(await pending, [{ correo: 'other@example.com' }]); assert.equal(calls, 2);
});

test('failed deletion leaves cached state and refresh subscribers unchanged', async () => {
  browser(); let refresh = 0;
  localStorage.setItem('__vencidas_daily_v6', 'preserve');
  const stop = bus.subscribeAccountDeletion(() => refresh++);
  const oldFetch = global.fetch;
  global.fetch = async () => new Response(JSON.stringify({ error: 'Transaction failed' }), { status: 500 });
  try {
    await assert.rejects(bus.deleteEmailsGlobally(['test@example.com'], 'test'), /Transaction failed/);
    assert.equal(refresh, 0); assert.equal(localStorage.getItem('__vencidas_daily_v6'), 'preserve');
  } finally { global.fetch = oldFetch; stop(); }
});

test('successful batch normalizes and deduplicates emails and propagates the committed revision', async () => {
  browser(); const oldFetch = global.fetch; let request;
  global.fetch = async (url, options) => {
    request = { url, ...JSON.parse(options.body) };
    return new Response(JSON.stringify({ revision: '4', correos: ['test@example.com'] }));
  };
  try {
    await bus.deleteEmailsGlobally(['TEST@example.com', ' test@example.com '], 'Cuenta retirada');
    assert.deepEqual(request, { url: '/api/account-deletions', correos: ['test@example.com'], motivo: 'Cuenta retirada' });
    assert.equal(bus.accountRevision(), '4');
    await assert.rejects(bus.deleteEmailsGlobally([null], 'test'), /identificar/);
  } finally { global.fetch = oldFetch; }
});

function syncComponent() {
  const Module = require('node:module');
  const path = require('node:path');
  const resolve = Module._resolveFilename;
  Module._resolveFilename = function(request, ...args) {
    if (request.startsWith('@/lib/')) request = path.join(__dirname, '../lib', request.slice(6));
    return resolve.call(this, request, ...args);
  };
  const reactPath = require.resolve('react');
  const oldReact = require.cache[reactPath];
  let cleanup;
  require.cache[reactPath] = { exports: { useEffect: effect => { cleanup = effect(); } } };
  const interval = global.setInterval, clear = global.clearInterval;
  let poll;
  global.document = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  global.setInterval = callback => { poll = callback; return 1; };
  global.clearInterval = () => {};
  const componentPath = require.resolve('../src/components/AccountDataSync.tsx');
  delete require.cache[componentPath];
  require(componentPath).default();
  return {
    poll: () => poll(),
    close: () => {
      cleanup(); global.setInterval = interval; global.clearInterval = clear;
      if (oldReact) require.cache[reactPath] = oldReact; else delete require.cache[reactPath];
      delete require.cache[componentPath]; Module._resolveFilename = resolve;
    },
  };
}
const flush = () => new Promise(resolve => setImmediate(resolve));

test('opening a new tab uses the applied revision and preserves a recreated email password queue', async () => {
  browser(); localStorage.setItem('__account_data_revision', '1');
  localStorage.setItem('__pw_history_v2', JSON.stringify({ 'test@example.com': { pw: 'newly-recreated-key' } }));
  const oldFetch = global.fetch; const urls = [];
  global.fetch = async url => {
    urls.push(url);
    return new Response(JSON.stringify({ revision: '1', correos: url.includes('since=0') ? ['test@example.com'] : [] }));
  };
  const sync = syncComponent();
  try {
    await flush();
    assert.deepEqual(urls, ['/api/account-data-revision?since=1']);
    assert.equal(JSON.parse(localStorage.getItem('__pw_history_v2'))['test@example.com'].pw, 'newly-recreated-key');
  } finally { sync.close(); global.fetch = oldFetch; }
});

test('an older poll response cannot move the per-tab cursor backwards after a local deletion', async () => {
  browser(); const oldFetch = global.fetch; const urls = []; let resolvePending;
  global.fetch = url => {
    urls.push(url);
    if (urls.length === 1) return new Promise(resolve => { resolvePending = resolve; });
    return Promise.resolve(new Response(JSON.stringify({ revision: '3', correos: [] })));
  };
  const sync = syncComponent();
  try {
    bus.applyAccountDeletion({ revision: '3', correos: ['test@example.com'] });
    resolvePending(new Response(JSON.stringify({ revision: '2', correos: ['other@example.com'] })));
    await flush(); sync.poll(); await flush();
    assert.equal(urls[1], '/api/account-data-revision?since=3');
    assert.equal(bus.accountRevision(), '3');
  } finally { sync.close(); global.fetch = oldFetch; }
});
