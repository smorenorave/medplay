/* eslint-disable @typescript-eslint/no-require-imports -- Node regression suite. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });
const { hasActiveAssignment, assignmentStatusLabel } = require('../lib/expiredAccountSafety.ts');
test('valid Colombian expiry overrides stale ACTIVA while future and unknown dates stay protected', t => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-14T02:30:00Z') });
  for (const estado of ['ACTIVA', 'ACTIVO', 'ACTIVE', 'VIGENTE', 'VENCIDA', null]) {
    for (const fecha of ['2026-10-12', '2026-10-12T00:00:00.000Z', new Date('2026-10-12T00:00:00Z')]) {
      assert.equal(hasActiveAssignment({ fecha_vencimiento: fecha, estado }), false);
      assert.equal(assignmentStatusLabel({ fecha_vencimiento: fecha, estado }), 'VENCIDA');
    }
    assert.equal(hasActiveAssignment({ fecha_vencimiento: '2026-10-13', estado }), false, 'today policy preserved');
    assert.equal(hasActiveAssignment({ fecha_vencimiento: '2026-10-14', estado }), true);
    assert.equal(assignmentStatusLabel({ fecha_vencimiento: '2026-10-14', estado }), 'ACTIVA');
    assert.equal(assignmentStatusLabel({ fecha_vencimiento: '2026-10-13', estado }), 'VENCE HOY');
    for (const fecha of [null, '', '12/10/2026', '2026-02-31', 'invalid', new Date(NaN)]) {
      assert.equal(hasActiveAssignment({ fecha_vencimiento: fecha, estado }), true);
      assert.equal(assignmentStatusLabel({ fecha_vencimiento: fecha, estado }), 'FECHA NO VERIFICABLE');
    }
  }
});
