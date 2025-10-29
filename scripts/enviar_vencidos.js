#!/usr/bin/env node
require('dotenv').config({ path: '/home/medplay/medplayapp/medplay/.env' });

const fs = require('fs');
const { spawn } = require('child_process');
const http = require('http');
const { chromium } = require('playwright');
const mysql = require('mysql2/promise');
const path = require('path');

/* =========================
 * LOGS A ARCHIVOS
 * ========================= */
const LOG_DIR = '/home/medplay/medplayapp/medplay/.logs';
try { fs.mkdirSync(LOG_DIR, { recursive: true }); } catch {}
const appOut = fs.createWriteStream(path.join(LOG_DIR, 'app.out.log'), { flags: 'a' });
const appErr = fs.createWriteStream(path.join(LOG_DIR, 'app.err.log'), { flags: 'a' });
const ts = () => new Date().toISOString().replace('T', ' ').replace('Z', '');

const _clog = console.log.bind(console);
const _cwarn = console.warn.bind(console);
const _cerr = console.error.bind(console);

console.log = (...args) => {
  const line = `[${ts()}] ${args.map(String).join(' ')}\n`;
  try { appOut.write(line); } catch {}
  _clog(...args);
};
console.warn = (...args) => {
  const line = `[${ts()}] ${args.map(String).join(' ')}\n`;
  try { appErr.write(line); } catch {}
  _cwarn(...args);
};
console.error = (...args) => {
  const line = `[${ts()}] ${args.map(String).join(' ')}\n`;
  try { appErr.write(line); } catch {}
  _cerr(...args);
};

const START_SH_RESOLVED = process.env.START_SH
  ? path.resolve(process.env.START_SH)
  : path.join(__dirname, 'start-chrome-wa.sh');

const {
  DATABASE_URL,
  DB_HOST, DB_PORT = '3306', DB_USER, DB_PASS, DB_NAME,
  DEBUG_PORT = '9222',
  START_SH = './start-chrome-wa.sh',
} = process.env;

/* =========================
 * TUNABLES
 * ========================= */
const EDITOR_RETRIES        = 40;
const EDITOR_POLL_MS        = 250;

const FALLBACK_MS           = 240_000;   // 4 minutos (fallback global)

// Primer arranque (más largo y paciente)
const FIRST_BOOT_TOTAL_MS   = 180_000;   // hasta 3 min de preparación total
const FIRST_BOOT_SW_MS      = 60_000;    // SW controlado (↑)
const FIRST_BOOT_READY_MS   = 120_000;   // waitForWhatsAppReady (↑)
const FIRST_BOOT_QUIET_MS   = 2_500;     // quiet más exigente
const FIRST_BOOT_QUIET_TO   = 40_000;    // timeout para quiet
const FIRST_BOOT_PAD_MS     = 60_000;    // colchón extra al final

// Antes y después de enviar (máx. 1 min)
const PRE_SEND_TIMEOUT_MS   = 75_000;    // (↑ de 60s a 75s)
const QUIET_PRE_MS          = 1_400;     // “red en calma” antes de enviar

const CHAT_RETRIES          = 3;         // reintentos para preparar chat
const GAP_BETWEEN_CONTACTS  = 60_000;    // pausa entre contactos

// Mensajería
const CLOSER                = 'Quedamos pendientes, muchas gracias'; // (ya no se usa)
const BRAND = 'MEDPLAY';
const NOTE_NEQUI = 'PARA PAGOS POR NEQUI SOLICITAR EL QR POR FAVOR';

/* =========================
 * HELPERS BÁSICOS
 * ========================= */
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function isDebuggerLive(port) {
  return new Promise((resolve) => {
    const req = http.get(
      { host: '127.0.0.1', port, path: '/json/version', timeout: 1000 },
      (res) => resolve(res.statusCode === 200)
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

async function waitForDebugger(port, maxMs = 25000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    if (await isDebuggerLive(port)) return true;
    await sleep(500);
  }
  return false;
}

/* =========================
 * ESPERAS ADAPTATIVAS (sin DOM)
 * ========================= */
async function waitForNetworkQuiet(page, { quietMs = 2000, timeout = 60000 } = {}) {
  const client = await page.context().newCDPSession(page);
  await client.send('Network.enable');
  let lastActivity = Date.now();
  const bump = () => { lastActivity = Date.now(); };

  const handlers = {
    requestWillBeSent: bump,
    responseReceived: bump,
    loadingFinished: bump,
    loadingFailed: bump,
    webSocketCreated: bump,
    webSocketFrameReceived: bump,
    webSocketFrameSent: bump,
    webSocketClosed: bump,
  };
  for (const [ev, fn] of Object.entries(handlers)) client.on('Network.' + ev, fn);

  const start = Date.now();
  try {
    while (Date.now() - start < timeout) {
      if (Date.now() - lastActivity >= quietMs) return true;
      await sleep(100);
    }
    return false;
  } finally {
    for (const [ev, fn] of Object.entries(handlers)) client.off('Network.' + ev, fn);
    try { await client.detach(); } catch {}
  }
}

function wsTracker(page) {
  const state = { frames: 0, attached: false, detach: async () => {} };
  return {
    async attach() {
      if (state.attached) return;
      const client = await page.context().newCDPSession(page);
      await client.send('Network.enable');
      state.attached = true;
      state.client = client;
      const onRecv = () => { state.frames++; };
      const onSent = () => { state.frames++; };
      client.on('Network.webSocketFrameReceived', onRecv);
      client.on('Network.webSocketFrameSent', onSent);
      state.detach = async () => {
        try {
          client.off('Network.webSocketFrameReceived', onRecv);
          client.off('Network.webSocketFrameSent', onSent);
          await client.detach();
        } catch {}
        state.attached = false;
      };
    },
    count() { return state.frames; },
    async dispose() { await state.detach(); }
  };
}

async function waitForWhatsAppReady(page, {
  timeout = 120_000,
  quietMs = 2000,
  requireWsTraffic = true,
} = {}) {
  const ctx = page.context();
  const client = await ctx.newCDPSession(page);
  await client.send('Network.enable');

  let wsOpen = false;
  let wsFrames = 0;
  let hasWASW = false;

  client.on('Network.webSocketCreated', (ev) => {
    if (String(ev.url || '').includes('web.whatsapp.com')) wsOpen = true;
  });
  client.on('Network.webSocketFrameReceived', () => { if (wsOpen) wsFrames++; });
  client.on('Network.webSocketFrameSent', () => { if (wsOpen) wsFrames++; });

  ctx.on('serviceworker', (sw) => {
    if (String(sw.url || '').startsWith('https://web.whatsapp.com/')) hasWASW = true;
  });

  const t0 = Date.now();
  try {
    await page.waitForLoadState('domcontentloaded', { timeout: 45_000 }).catch(() => {});
    await page.waitForLoadState('load', { timeout: 60_000 }).catch(() => {});

    while (Date.now() - t0 < timeout) {
      if (hasWASW || wsOpen) {
        const quietOk = await waitForNetworkQuiet(page, { quietMs, timeout: 5000 });
        if (quietOk && (!requireWsTraffic || wsFrames > 0)) return true;
      }
      await sleep(150);
    }
    return false;
  } finally {
    try { await client.detach(); } catch {}
  }
}

// SW controlado (sin DOM)
async function waitForSWControlled(page, timeout = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    try {
      const controlled = await page.evaluate(() => !!(navigator.serviceWorker && navigator.serviceWorker.controller));
      if (controlled) return true;
    } catch {}
    await sleep(200);
  }
  return false;
}

// Reset duro de la app
async function hardResetWA(page) {
  console.warn('🔄 Hard reset: recargando WhatsApp Web…');
  await page.goto('https://web.whatsapp.com/', { waitUntil: 'domcontentloaded', timeout: 60_000 }).catch(() => {});
  const swOk = await waitForSWControlled(page, 45_000);
  const ready = await waitForWhatsAppReady(page, { timeout: 90_000, quietMs: 1500 }).catch(() => false);
  const quiet = await waitForNetworkQuiet(page, { quietMs: 1200, timeout: 10_000 }).catch(() => false);
  return swOk && ready && quiet;
}

/* =========================
 * “PRIMER ARRANQUE CON GRACIA”
 * ========================= */
async function warmUpFirstLoad(page) {
  console.log('🧊 Primer arranque: preparación extendida…');
  const tStart = Date.now();

  // 1) SW controlado con timeout mayor
  const swOk = await waitForSWControlled(page, FIRST_BOOT_SW_MS);
  if (!swOk) {
    console.warn('⚠️ SW no controlado en primer arranque → intento de hard reset…');
    const resetOk = await hardResetWA(page).catch(() => false);
    if (!resetOk) {
      console.warn('⚠️ Hard reset no aseguró SW; fallback 4 min');
      await sleep(FALLBACK_MS);
    }
  }

  // 2) Readiness general con timeout mayor
  const ready = await waitForWhatsAppReady(page, {
    timeout: FIRST_BOOT_READY_MS,
    quietMs: 1800,
    requireWsTraffic: false, // en primer arranque puede tardar en mostrar frames
  }).catch(() => false);

  if (!ready) {
    console.warn('⚠️ Readiness no confirmado en primer arranque → hard reset y retry corto…');
    const resetOk = await hardResetWA(page).catch(() => false);
    if (!resetOk) {
      console.warn('⚠️ Hard reset no ayudó; fallback 4 min');
      await sleep(FALLBACK_MS);
    }
  }

  // 3) Quiet time más exigente
  const quiet = await waitForNetworkQuiet(page, {
    quietMs: FIRST_BOOT_QUIET_MS,
    timeout: FIRST_BOOT_QUIET_TO
  }).catch(() => false);

  if (!quiet) {
    console.warn('⚠️ Quiet time insuficiente en primer arranque; se aplica colchón extra.');
  }

  // 4) Colchón final para que termine de cachear
  await sleep(FIRST_BOOT_PAD_MS);

  const elapsed = Date.now() - tStart;
  console.log(`✅ Primer arranque listo en ${(elapsed/1000).toFixed(1)}s.`);
}

/* =========================
 * EDITOR HELPERS (solo para pulsar Enter)
 * ========================= */
function normalizeEditorText(s) {
  return String(s || '')
    .replace(/\u200B/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/\r/g, '')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function findEditorWithRetry(page) {
  const sels = [
    '[data-testid="conversation-compose-box-input"] div[contenteditable="true"]',
    'div[role="textbox"][contenteditable="true"]',
    'div[contenteditable="true"][data-tab]',
  ];
  for (let i = 0; i < EDITOR_RETRIES; i++) {
    for (const sel of sels) {
      const loc = page.locator(sel).last();
      if ((await loc.count().catch(() => 0)) > 0) return loc;
    }
    await sleep(EDITOR_POLL_MS);
  }
  return null;
}

async function focusEditorAtEnd(page, editor) {
  try { await editor.scrollIntoViewIfNeeded?.(); } catch {}
  try { await editor.click({ delay: 20 }); } catch {}
  try {
    await editor.evaluate(el => {
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
      if (el.focus) el.focus();
    });
  } catch {}
  try {
    await page.keyboard.press('ControlOrMeta+End').catch(() => {});
    await page.keyboard.press('End').catch(() => {});
    await page.keyboard.press('ArrowRight').catch(() => {});
  } catch {}
}

/* =========================
 * CHAT READINESS POR CONTACTO (mantiene robustez de apertura)
 * ========================= */
async function ensureChatReady(page, phone, textEncoded) {
  // Variantes de deep link
  const variants = [
    `https://web.whatsapp.com/send?phone=${encodeURIComponent(phone)}&text=${textEncoded}`,
    `https://web.whatsapp.com/send/?phone=${encodeURIComponent(phone)}&text=${textEncoded}`,
    `https://web.whatsapp.com/send?phone=${encodeURIComponent(phone)}&text=${textEncoded}&app_absent=0`,
  ];

  const tracker = wsTracker(page);
  await tracker.attach();

  for (let attempt = 1; attempt <= CHAT_RETRIES; attempt++) {
    const urlToOpen = variants[(attempt - 1) % variants.length];
    console.log(`🔁 Abriendo chat (intento ${attempt}/${CHAT_RETRIES}) con: ${urlToOpen}`);
    await page.goto(urlToOpen, { waitUntil: 'domcontentloaded', timeout: 60_000 }).catch(() => {});

    // 1) Resolver deep link (dejar /send?phone=…)
    const tResolve = Date.now();
    let resolved = false;
    while (Date.now() - tResolve < PRE_SEND_TIMEOUT_MS) {
      const cur = page.url();
      const isSend = /\/send\/?\?phone=/i.test(cur);
      if (!isSend && /web\.whatsapp\.com/i.test(cur)) { resolved = true; break; }
      await sleep(200);
    }
    if (!resolved) {
      console.warn('⚠️ El deep link no “resolvió” a vista de chat; fallback 4min y reintento');
      await sleep(FALLBACK_MS);
      await hardResetWA(page).catch(() => {});
      continue;
    }

    // 2) SW controlado
    const swOk = await waitForSWControlled(page, 35_000);
    if (!swOk) {
      console.warn('⚠️ La app no quedó controlada por el SW; fallback 4min y reintento');
      await sleep(FALLBACK_MS);
      await hardResetWA(page).catch(() => {});
      continue;
    }

    // 3) Pequeña calma de red antes de enviar
    await waitForNetworkQuiet(page, { quietMs: QUIET_PRE_MS, timeout: PRE_SEND_TIMEOUT_MS }).catch(() => {});
    await tracker.dispose();
    return true; // listo o suficientemente listo
  }

  await tracker.dispose();
  return false; // agotó reintentos
}

/* =========================
 * ENVÍO: SOLO POR URL (sin escribir nada ni verificar)
 * ========================= */
async function sendMessage(page) {
  // El editor ya viene prellenado por el parámetro &text=...
  const editor = await findEditorWithRetry(page);
  if (editor) {
    await focusEditorAtEnd(page, editor);
  }
  try {
    await page.keyboard.press('Enter'); // un solo Enter
    console.log('↩️ Enviado (Enter)');
  } catch (e) {
    console.warn('⚠️ No se pudo pulsar Enter:', e?.message || e);
  }
}

/* =========================
 * DB
 * ========================= */
async function getConnection() {
  if (DATABASE_URL && DATABASE_URL.startsWith('mysql://')) {
    return mysql.createConnection(DATABASE_URL);
  }
  if (!DB_HOST || !DB_USER || !DB_PASS || !DB_NAME) {
    throw new Error('Faltan credenciales DB en .env');
  }
  return mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT || 3306),
    user: DB_USER,
    password: DB_PASS,
    database: DB_NAME,
    charset: 'utf8mb4',
    multipleStatements: false,
  });
}

async function fetchExpiringRows(conn) {
  const [pRows] = await conn.query(`
    SELECT 'Pantalla' AS servicio, p.contacto, u.nombre, p.nro_pantalla,
           DATE(p.fecha_vencimiento) AS fecha_vencimiento,
           p.total_pagado, p.estado,
           cc.correo AS correo, cc.plataforma_id, pl.nombre AS plataforma_nombre
    FROM pantallas p
    LEFT JOIN usuarios u ON u.contacto = p.contacto
    LEFT JOIN cuentascompartidas cc ON cc.id = p.cuenta_id
    LEFT JOIN plataformas pl ON pl.id = cc.plataforma_id
    WHERE p.fecha_vencimiento <= DATE_ADD(CURDATE(), INTERVAL 1 DAY)
      AND (p.estado IS NULL OR p.estado <> 'CANCELADA')
  `);

  const [cRows] = await conn.query(`
    SELECT 'Cuenta completa' AS servicio, c.contacto, u.nombre, NULL AS nro_pantalla,
           DATE(c.fecha_vencimiento) AS fecha_vencimiento,
           c.total_pagado, c.estado,
           c.correo, c.plataforma_id, pl.nombre AS plataforma_nombre
    FROM cuentascompletas c
    LEFT JOIN usuarios u ON u.contacto = c.contacto
    LEFT JOIN plataformas pl ON pl.id = c.plataforma_id
    WHERE c.fecha_vencimiento <= DATE_ADD(CURDATE(), INTERVAL 1 DAY)
      AND (c.estado IS NULL OR c.estado <> 'CANCELADA')
  `);

  return [...pRows, ...cRows];
}

function normalizePhone(s) { return String(s || '').replace(/\D/g, ''); }
function isE164(num) { return /^\d{8,15}$/.test(num); }
function fmtDateDDMMYYYY(value) {
  if (!value) return '';
  const s = String(value);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
function fmtMoney(v) {
  if (v == null || v === '' || Number.isNaN(Number(v))) return null;
  const num = Number(v);
  try { return `$ ${new Intl.NumberFormat(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(num)}`; }
  catch { return `$ ${num.toFixed(2)}`; }
}
function lineForItem(it) {
  const plat = (it.plataforma_nombre || '').trim() || 'tu plataforma';
  const correo = (it.correo || '').trim();
  const vence = fmtDateDDMMYYYY(it.fecha_vencimiento);
  const costo = fmtMoney(it.total_pagado);
  const pant = it.servicio === 'Pantalla' && it.nro_pantalla ? ` (pantalla ${it.nro_pantalla})` : '';
  return [
    `• Tu ${plat}${pant}`,
    correo ? `, con el correo ${correo}` : '',
    `, vence el *${vence}*, quería saber si deseas *realizar la renovación*`,
    costo ? `, tiene un costo de *${costo}*.` : '.',
  ].join('');
}
function groupByPhone(rows) {
  const map = new Map();
  for (const r of rows) {
    const phone = normalizePhone(r.contacto);
    if (!isE164(phone)) continue;
    const cur = map.get(phone) || { phone, items: [], nombre: r.nombre || null };
    cur.items.push(r);
    if (!cur.nombre && r.nombre) cur.nombre = r.nombre;
    map.set(phone, cur);
  }
  const recipients = [];
  for (const { phone, items, nombre } of map.values()) {
    const firstName = nombre ? String(nombre).trim().split(/\s+/)[0] : null;
    const saludo = firstName ? `Hola ${firstName},` : `Hola,`;
    const lines = items.map(lineForItem).join('\n');
    const text = [`${saludo} te escribimos de ${BRAND}.`, '', lines, '', `*${NOTE_NEQUI}*`].join('\n');
    recipients.push({ phone, text });
  }
  return recipients;
}

/* =========================
 * FLUJO PRINCIPAL
 * ========================= */
async function sendAll(recipients) {
  console.log('🚀 Lanzando start-chrome-wa.sh…');

  // Logs del script START_SH a archivos dedicados
  const scOut = fs.createWriteStream(path.join(LOG_DIR, 'start-chrome.out.log'), { flags: 'a' });
  const scErr = fs.createWriteStream(path.join(LOG_DIR, 'start-chrome.err.log'), { flags: 'a' });

  const child = spawn('bash', ['-lc', START_SH_RESOLVED], {
    stdio: ['ignore', 'pipe', 'pipe'], // << capturamos stdout/err
    env: process.env,
    cwd: path.dirname(START_SH_RESOLVED),
    detached: true
  });
  // Pipe de logs del proceso hijo
  if (child.stdout) child.stdout.on('data', (d) => { try { scOut.write(`[${ts()}] ${d}`); } catch {} });
  if (child.stderr) child.stderr.on('data', (d) => { try { scErr.write(`[${ts()}] ${d}`); } catch {} });
  child.unref();

  console.log('⏳ Esperando CDP…');
  const ok = await waitForDebugger(Number(DEBUG_PORT), 25000);
  if (!ok) throw new Error(`No se detectó CDP en 127.0.0.1:${DEBUG_PORT}`);

  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${Number(DEBUG_PORT)}`);
  const ctx = browser.contexts()[0] || (await browser.newContext());
  const page = ctx.pages()[0] || (await ctx.newPage());

  console.log('🟡 Abriendo WhatsApp Web…');
  await page.goto('https://web.whatsapp.com/', { waitUntil: 'domcontentloaded' });

  // 🔥 Espera fija inicial de 8 minutos (antes 6)
  console.log('⏳ Esperando 8 minutos fijos para la primera carga completa de WhatsApp Web…');
  await sleep(480_000);

  // 🔥 Primer arranque con gracia (chequeos adaptativos adicionales)
  await warmUpFirstLoad(page).catch(async () => {
    console.warn('⚠️ warmUpFirstLoad lanzó excepción; aplicando fallback 4 min…');
    await sleep(FALLBACK_MS);
  });

  for (let i = 0; i < recipients.length; i++) {
    const r = recipients[i];
    const textEncoded = encodeURIComponent(r.text);

    console.log(`\n[${i + 1}/${recipients.length}] → ${r.phone}`);

    const chatOk = await ensureChatReady(page, r.phone, textEncoded);
    if (!chatOk) {
      console.error(`❌ No se pudo preparar el chat de ${r.phone} tras reintentos; se omite.`);
      continue;
    }

    // Envío ÚNICO: solo Enter (sin escribir, sin verificar, sin reintentos)
    console.log('✉️  Enviando (un solo intento, solo URL)…');
    await sendMessage(page);

    // ⏳ Siempre esperar el mismo GAP, incluso para el ÚLTIMO contacto
    console.log(`⏳ Pausa post-envío: ${GAP_BETWEEN_CONTACTS / 1000}s…`);
    await sleep(GAP_BETWEEN_CONTACTS);
  }

  console.log('\n✅ Finalizado.');

  // ==== CIERRE DE CHROME ====
  try {
    const cdp = await browser.newBrowserCDPSession?.();
    if (cdp) {
      await cdp.send('Browser.close').catch(() => {});
    }
  } catch {}
  try { await browser.close(); } catch {}
}

/* =========================
 * MAIN
 * ========================= */
(async () => {
  try {
    const conn = await getConnection();
    try {
      const rows = await fetchExpiringRows(conn);
      const recipients = groupByPhone(rows);

      if (!recipients.length) {
        console.log('✅ No hay contactos por notificar (hoy/mañana).');
        return;
      }

      console.log(`📨 Enviaré ${recipients.length} mensaje(s).`);
      await sendAll(recipients);
    } finally {
      try { await conn.end(); } catch {}
      try { appOut.end(); } catch {}
      try { appErr.end(); } catch {}
    }
  } catch (err) {
    console.error('❌ Error:', err?.message || err);
    process.exit(1);
  }
})();

