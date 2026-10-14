'use strict';
const { request } = require('playwright');
(async () => {
  const username = (process.argv[2] || '').replace(/^@/, '');
  if (!/^[A-Za-z0-9_.]{3,64}$/.test(username)) throw new Error('Uso: node scripts/diagnosticar-usuario.cjs usuario');
  const context = await request.newContext();
  try {
    const response = await context.get(`https://wa.me/${encodeURIComponent(username)}`, { timeout: 20000 });
    const html = await response.text();
    const text = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    console.log(JSON.stringify({ status: response.status(), url: response.url(), text: text.slice(0,6000), links: [...html.matchAll(/href="([^"]+)"/g)].map(m => m[1]).filter(link => /whatsapp|wa.me/.test(link)).slice(0,20) }, null, 2));
  } finally { await context.dispose(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
