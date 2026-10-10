/* eslint-disable @typescript-eslint/no-require-imports -- Native Node test runner. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });
const { expiredDeletionFailure } = require('../lib/expiredDeletionFailure.ts');

for (const [code, status, explanation] of [
  ['P2021', 503, /migraciones/], ['P2022', 503, /migraciones/],
  ['P2002', 409, /índices de auditoría/], ['P2003', 409, /relación/],
  ['P2028', 503, /tiempo de espera/], ['P2034', 503, /conflicto/],
  ['P1001', 503, /conexión/], ['P1002', 503, /conexión/],
  ['P1008', 503, /conexión/], ['P1017', 503, /conexión/], ['P2024', 503, /conexión/],
]) test(`shows actionable ${code} diagnostics without leaking database details`, () => {
  const result = expiredDeletionFailure({ code, message: 'SQL: password=private-value', meta: { connection: 'private-connection' } });
  assert.equal(result.status, status); assert.equal(result.code, code);
  assert.match(result.error, explanation); assert.match(result.error, /No se guardó ningún cambio/);
  assert.ok(!JSON.stringify(result).includes('private'));
});

test('missing administrator is distinguished from database failures', () => {
  const result = expiredDeletionFailure(new Error('unauthorized'));
  assert.equal(result.status, 401); assert.match(result.error, /iniciar sesión/);
});

test('Prisma validation failures do not expose submitted credentials', () => {
  const result = expiredDeletionFailure({ name: 'PrismaClientValidationError', message: 'Invalid data: password=secret' });
  assert.equal(result.code, 'PRISMA_VALIDATION'); assert.ok(!result.error.includes('secret'));
});

test('unknown exceptions stay generic and never become successful responses', () => {
  for (const error of [null, 'secret', new Error('secret'), { code: 'sensitive-data' }]) {
    const result = expiredDeletionFailure(error);
    assert.equal(result.status, 500); assert.equal(result.code, 'EXPIRED_DELETE_FAILED');
    assert.ok(!JSON.stringify(result).includes('secret')); assert.ok(!JSON.stringify(result).includes('sensitive-data'));
  }
});

test('identifies a missing declared column without exposing the database name', () => {
  for (const column of ['dedupeKey', 'emailDeletionAudit.dedupeKey', '`private_database`.`emailDeletionAudit`.`dedupeKey`']) {
    const result = expiredDeletionFailure({ code: 'P2022', meta: { modelName: 'emailDeletionAudit', column } });
    assert.match(result.error, /falta la columna emailDeletionAudit.dedupeKey/);
    assert.ok(!result.error.includes('private_database'));
  }
});

test('unknown schema metadata is never echoed to the browser', () => {
  for (const meta of [null, { modelName: 'secret', column: 'password=secret' }, { modelName: 'plataformas', column: 'secret' }]) {
    const result = expiredDeletionFailure({ code: 'P2022', meta });
    assert.ok(!result.error.includes('secret'));
  }
});
