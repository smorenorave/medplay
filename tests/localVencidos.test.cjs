const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parsePastedRows } = require('../scripts/datos-vencidos-local.cjs');

const row = (contact, amount = '$ 7.900') =>
  ['Amazon', 'Pantalla', contact, '—', 'example@example.com', 'secret', '2026-09-13', '2026-10-13', amount, 'private comment'].join('\t');

test('parses pasted table with blank lines, currency and usernames without secrets', () => {
  const result = parsePastedRows(`Vista: Todos\nEliminar seleccionados\n\tAcciones\tPlataforma\n\n${row('+573001234567')}\n\t\n${row('@usuario', '—')}`);
  assert.equal(result.length, 2);
  assert.equal(result[0].total_pagado, 7900);
  assert.equal(result[1].total_pagado, null);
  assert.equal(result[1].contacto, '@usuario');
  assert.equal(result[0].nombre, null);
  assert.doesNotMatch(JSON.stringify(result), /secret|private comment/);
});

test('fails on malformed rows rather than silently dropping recipients', () => {
  assert.throws(() => parsePastedRows(`${row('+573001234567')}\ninvalid`), /línea 2/);
  assert.throws(() => parsePastedRows(row('+573001234567', 'abc')), /Importe inválido/);
  assert.throws(() => parsePastedRows(row('+573001234567').replace('2026-10-13', '2026-02-30')), /fecha inválidos/);
  assert.throws(() => parsePastedRows(''), /no contiene servicios/);
});
