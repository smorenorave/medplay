'use strict';
const fs = require('node:fs');
const { parseWhatsAppContact } = require('./whatsapp-contact');

function parsePastedRows(text) {
  const rows = [];
  for (const [index, raw] of text.split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (!line || /^(Vista:|Eliminar seleccionados|Acciones\t)/.test(line)) continue;
    const cells = line.split('\t').map(value => value.trim());
    if (cells.length !== 10 || !['Cuenta completa', 'Pantalla'].includes(cells[1])) {
      throw new Error(`Formato inesperado en la línea ${index + 1}; no se enviará ningún mensaje.`);
    }
    const [platform, service, contact, name, email, , , expiry, amount] = cells;
    if (!parseWhatsAppContact(contact) || !/^\d{4}-\d{2}-\d{2}$/.test(expiry) ||
        new Date(`${expiry}T12:00:00Z`).toISOString().slice(0, 10) !== expiry) {
      throw new Error(`Contacto o fecha inválidos en la línea ${index + 1}.`);
    }
    const cost = amount === '—' || amount === '' ? null
      : Number(amount.replace(/[$\s.]/g, '').replace(',', '.'));
    if (cost !== null && (!Number.isFinite(cost) || cost < 0)) {
      throw new Error(`Importe inválido en la línea ${index + 1}.`);
    }
    rows.push({
      plataforma_nombre: platform, servicio: service, contacto: contact,
      nombre: name === '—' || /^[+\d\s()-]+$/.test(name) ? null : name,
      correo: email === '—' ? '' : email, fecha_vencimiento: expiry,
      [service === 'Cuenta completa' ? 'total_pagado_completa' : 'total_pagado']: cost,
    });
  }
  if (!rows.length) throw new Error('El archivo no contiene servicios.');
  return rows;
}

function readLocalRows(file) {
  const text = fs.readFileSync(file, 'utf8');
  if (!file.endsWith('.json')) return parsePastedRows(text);
  const rows = JSON.parse(text);
  if (!Array.isArray(rows) || !rows.length || rows.some(row =>
    !row || !parseWhatsAppContact(row.contacto) ||
    !['Cuenta completa', 'Pantalla'].includes(row.servicio) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(row.fecha_vencimiento))) {
    throw new Error('El archivo JSON local no contiene servicios válidos.');
  }
  return rows;
}

module.exports = { parsePastedRows, readLocalRows };
