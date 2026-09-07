'use strict';

const E164 = /^\d{8,15}$/;

function parseWhatsAppContact(raw) {
  const contact = String(raw || '').trim();
  if (!contact) return null;

  // Keep the legacy phone normalization and validation unchanged.
  if (!/[A-Za-z]/.test(contact)) {
    const value = contact.replace(/\D/g, '');
    return E164.test(value) ? { type: 'phone', value } : null;
  }

  const value = contact.replace(/^@/, '');
  if (!value || /\s/.test(value)) return null;
  return { type: 'username', value };
}

function buildWhatsAppChatUrls(raw, textEncoded) {
  const contact = parseWhatsAppContact(raw);
  if (!contact) return [];

  if (contact.type === 'phone') {
    const value = encodeURIComponent(contact.value);
    return [
      `https://web.whatsapp.com/send?phone=${value}&text=${textEncoded}`,
      `https://web.whatsapp.com/send/?phone=${value}&text=${textEncoded}`,
      `https://web.whatsapp.com/send?phone=${value}&text=${textEncoded}&app_absent=0`,
    ];
  }

  const url = `https://wa.me/${encodeURIComponent(contact.value)}?text=${textEncoded}`;
  return [url, url, url];
}

module.exports = { parseWhatsAppContact, buildWhatsAppChatUrls };
