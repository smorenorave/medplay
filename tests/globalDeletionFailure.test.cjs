/* eslint-disable @typescript-eslint/no-require-imports -- Native Node test runner. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });
const { globalDeletionFailure } = require('../lib/globalDeletionFailure.ts');

test('global deletion returns safe actionable diagnostics with a matching log reference', async (t) => {
  const logs = [];
  t.mock.method(console, 'error', (...args) => logs.push(args));
  for (const [error, code, status] of [
    [{ code: 'P2022', meta: { modelName: 'emailDeletionAudit', column: 'dedupeKey' }, message: 'secret SQL' }, 'P2022', 503],
    [{ code: 'P2003', message: 'secret SQL' }, 'P2003', 409],
    [{ code: 'P2028', message: 'secret SQL' }, 'P2028', 503],
    [new Error('unauthorized'), 'ADMIN_NOT_FOUND', 401],
    [new Error('secret SQL'), 'GLOBAL_DELETE_FAILED', 500],
    [null, 'GLOBAL_DELETE_FAILED', 500],
  ]) {
    const response = globalDeletionFailure(error);
    const body = await response.json();
    assert.equal(response.status, status);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(body.code, code);
    assert.match(body.reference, /^[0-9a-f-]{36}$/);
    assert.ok(body.error.includes(code));
    assert.ok(body.error.includes(body.reference));
    assert.ok(!JSON.stringify(body).includes('secret'));
    assert.deepEqual(logs.at(-1)[1], { reference: body.reference, code });
    if (code === 'P2022') assert.match(body.error, /emailDeletionAudit\.dedupeKey/);
  }
});
