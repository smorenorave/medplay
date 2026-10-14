'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { parseWhatsAppContact } = require('./whatsapp-contact');
const { openUsernameChat } = require('./whatsapp-username.cjs');

const key = value => String(value).replace(/^@/, '').toLowerCase();
function exclusionReason(contact, root) {
  for (const [name, reason] of [['no-contactar.json', 'solicitud_no_contactar'], ['usuarios-excluidos.json', 'exclusion_manual']]) {
    const file = path.join(root, name);
    if (!fs.existsSync(file)) continue;
    const entries = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!Array.isArray(entries) || entries.some(entry => typeof entry !== 'string')) throw new Error(`Lista inválida: ${name}`);
    const canonical = raw => { const parsed = parseWhatsAppContact(raw); return parsed ? `${parsed.type}:${key(parsed.value)}` : null; };
    if (entries.some(entry => canonical(entry) === canonical(contact))) return reason;
  }
  return null;
}

// A durable claim is written before Enter. An uncertain send is never retried automatically.
async function deliverUsername({ page, recipient, scope, directory, openChat = openUsernameChat, send, log }) {
  const id = crypto.createHash('sha256').update(JSON.stringify([scope, key(recipient.phone), recipient.text])).digest('hex');
  fs.mkdirSync(directory, { recursive: true });
  const claim = path.join(directory, `${id}.json`);
  let descriptor;
  try { descriptor = fs.openSync(claim, 'wx'); }
  catch (error) {
    if (error.code === 'EEXIST') {
      const result = { status: 'OMITIDO', motivo: 'usuario_ya_procesado_o_en_proceso' };
      log({ phone: recipient.phone, ...result });
      return result;
    }
    throw error;
  }
  const save = event => {
    fs.writeFileSync(claim, JSON.stringify(event));
    log({ phone: recipient.phone, ...event });
  };
  try {
    fs.writeFileSync(descriptor, JSON.stringify({ status: 'RESERVADO' }));
  } finally { fs.closeSync(descriptor); }
  let started = false;
  try {
    const ready = await openChat(page, recipient.phone, recipient.text);
    if (!ready) {
      const result = { status: 'OMITIDO', motivo: 'usuario_no_resuelto_o_identidad_no_verificada' };
      save(result); return result;
    }
    save({ status: 'EN_PROCESO' });
    started = true;
    const sent = await send(page, recipient.text);
    const result = sent.confirmed
      ? { status: 'ENVIADO', motivo: null }
      : { status: 'ERROR', motivo: 'envio_no_confirmado_revisar_manualmente' };
    save(result); return result;
  } catch (error) {
    const result = { status: started ? 'ERROR' : (error.omitReason ? 'OMITIDO' : 'ERROR'),
      motivo: started ? 'envio_incierto_revisar_manualmente' : (error.omitReason || 'error_abriendo_usuario') };
    save(result); return result;
  }
}

module.exports = { deliverUsername, exclusionReason };
