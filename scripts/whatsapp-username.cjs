'use strict';
const { buildWhatsAppChatUrls } = require('./whatsapp-contact');

function headerMatchesUsername(header, username) {
  const escaped = username.replace(/^@/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|\\s)@?${escaped}(?=$|\\s)`, 'i').test(header);
}

function restrictionReason(text) {
  if (/too many|rate limit|try again later|demasiad[oa]s|int[eé]ntalo m[aá]s tarde|temporalmente restringid/i.test(text)) return 'limite_plataforma';
  if (/username key|clave de usuario/i.test(text)) return 'requiere_clave_usuario';
  if (/blocked|bloquead|privacy|privacidad|can.t (?:send|message)|no puedes enviar|no permite/i.test(text)) return 'contacto_restringido';
  if (/no (?:existe|se encontr|es v[aá]lid)|not (?:found|valid)|invalid|doesn.t exist/i.test(text)) return 'usuario_no_disponible';
  return null;
}

function omitted(reason) { return Object.assign(new Error(reason), { omitReason: reason }); }

async function sendUsernameMessage(page, expectedText) {
  const editor = page.locator('#main footer [contenteditable="true"][role="textbox"]').last();
  await editor.waitFor({ state: 'visible', timeout: 20000 });
  const normalize = text => text.replace(/\s+/g, ' ').trim();
  if (normalize(await editor.innerText()) !== normalize(expectedText)) throw omitted('mensaje_no_coincide');
  await editor.press('Enter');
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const remaining = await editor.innerText().catch(() => null);
    if (remaining !== null && !remaining.trim()) return { sent: true, confirmed: true };
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  return { sent: true, confirmed: false };
}

async function openUsernameChat(page, username, message) {
  const url = buildWhatsAppChatUrls(username, encodeURIComponent(message))[0];
  console.log(`Abriendo enlace de usuario: https://wa.me/${encodeURIComponent(username)}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  const deadline = Date.now() + 120000;
  const followed = new Set();
  while (Date.now() < deadline) {
    const current = new URL(page.url());
    if (current.hostname === 'web.whatsapp.com') {
      const dialogs = [...await page.getByRole('dialog').allTextContents(), ...await page.getByRole('alert').allTextContents()].join(' ');
      const reason = restrictionReason(dialogs);
      if (reason) throw omitted(reason);
      const editor = page.locator('#main footer [contenteditable="true"][role="textbox"]').last();
      if (await editor.isVisible().catch(() => false)) {
        const header = await page.locator('#main header').innerText({ timeout: 3000 }).catch(() => '');
        if (!headerMatchesUsername(header, username)) {
          console.warn(`No se pudo verificar @${username} en la cabecera del chat; no se enviará.`);
          return false;
        }
        const normalize = text => text.replace(/\*/g, '').replace(/\s+/g, ' ').trim();
        const previous = await page.locator('#main .message-out').allTextContents();
        if (previous.some(text => normalize(text).includes(normalize(message)))) {
          throw omitted('recordatorio_ya_visible_en_chat_no_reenviar');
        }
        await editor.fill(message);
        return true;
      }
    } else if (['wa.me', 'api.whatsapp.com', 'www.whatsapp.com'].includes(current.hostname)) {
      if (current.hostname === 'api.whatsapp.com' && current.searchParams.get('type') === 'username' &&
          current.searchParams.get('username')?.toLowerCase() === username.toLowerCase()) {
        const web = new URL('https://web.whatsapp.com/send');
        web.searchParams.set('username', current.searchParams.get('username'));
        web.searchParams.set('type', 'username');
        web.searchParams.set('text', message);
        if (!followed.has(web.href)) {
          followed.add(web.href);
          console.log('Abriendo WhatsApp Web conservando el destinatario por usuario.');
          await page.goto(web.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
          continue;
        }
      }
      // Follow only a WhatsApp Web link actually provided by the official landing page.
      const links = await page.locator('a[href]').evaluateAll(elements => elements.map(el => el.href));
      const next = links.find(href => {
        try { const target = new URL(href); return target.protocol === 'https:' && target.hostname === 'web.whatsapp.com' && target.searchParams.get('username')?.toLowerCase() === username.toLowerCase() && !followed.has(href); }
        catch { return false; }
      });
      if (next) { followed.add(next); await page.goto(next, { waitUntil: 'domcontentloaded', timeout: 30000 }); continue; }
    } else {
      return false;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  console.warn(`El enlace de @${username} no abrió un chat verificable.`);
  return false;
}

module.exports = { headerMatchesUsername, openUsernameChat, sendUsernameMessage, restrictionReason };
