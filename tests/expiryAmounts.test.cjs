/* eslint-disable @typescript-eslint/no-require-imports -- Isolated regression. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });
const { expiryAccountAmounts } = require('../lib/expiryAmounts.ts');

test('expiry uses complete-account stored totals without changing records or profit', () => {
  for (const [total, paid] of [[7900, 2000], ['7900.00', '2000.00'], [0, 0], [null, null]]) {
    const row = { id: '1', total_pagado_completa: total, total_pagado_proveedor_completa: paid,
      total_pagado: 999, total_pagado_proveedor: 888, total_ganado: 5900, comentario: 'keep' };
    const before = structuredClone(row);
    const result = expiryAccountAmounts(row);
    assert.equal(result.total_pagado, total == null ? null : Number(total));
    assert.equal(result.total_pagado_proveedor, paid == null ? null : Number(paid));
    assert.equal(result.total_ganado, 5900);
    assert.equal(result.comentario, 'keep');
    assert.deepEqual(row, before);
  }
});
