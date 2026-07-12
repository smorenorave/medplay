#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const fs = require('fs');
const { spawn } = require('child_process');
const http = require('http');
const { chromium } = require('playwright');
const mysql = require('mysql2/promise');

/* =========================
 * CONFIG GENERAL
 * ========================= */
const IS_WIN = process.platform === 'win32';
const ROOT_DIR = path.resolve(__dirname, '..');
const LOG_DIR = path.join(ROOT_DIR, '.logs');

try { fs.mkdirSync(LOG_DIR, { recursive: true }); } catch {}

const appOut = fs.createWriteStream(path.join(LOG_DIR, 'app.out.log'), { flags: 'a' });
const appErr = fs.createWriteStream(path.join(LOG_DIR, 'app.err.log'), { flags: 'a' });
const ts = () => new Date().toISOString().replace('T', ' ').replace('Z', '');

const _clog = console.log.bind(console);
const _cwarn = console.warn.bind(console);
const _cerr = console.error.bind(console);

console.log = (...args) => {
  const line = `[${ts()}] ${args.map(a => String(a)).join(' ')}\n`;
  try { appOut.write(line); } catch {}
  _clog(...args);
};

console.warn = (...args) => {
  const line = `[${ts()}] ${args.map(a => String(a)).join(' ')}\n`;
  try { appErr.write(line); } catch {}
  _cwarn(...args);
};

console.error = (...args) => {
  const line = `[${ts()}] ${args.map(a => String(a)).join(' ')}\n`;
  try { appErr.write(line); } catch {}
  _cerr(...args);
};

const {
  DATABASE_URL,
  DB_HOST,
  DB_PORT = '3306',
  DB_USER,
  DB_PASS,
  DB_NAME,
  DEBUG_PORT = '9222',
  START_SCRIPT = './scripts/start-edge-wa.bat',
} = process.env;

const START_SCRIPT_RESOLVED = path.resolve(ROOT_DIR, START_SCRIPT);

/* =========================
 * TUNABLES
 * ========================= */
const EDITOR_RETRIES = 40;
const EDITOR_POLL_MS = 250;

const FALLBACK_MS = 20_000;
const PRE_SEND_TIMEOUT_MS = 45_000;
const QUIET_PRE_MS = 1_200;
const CHAT_RETRIES = 3;
const GAP_BETWEEN_CONTACTS = 12_000;

const BRAND = 'MEDPLAY';
const NOTE_NEQUI = 'PARA PAGOS POR NEQUI SOLICITAR EL QR POR FAVOR';

/* =========================
 * HELPERS BÁSICOS
 * ========================= */
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function isDebuggerLive(port) {
  return new Promise((resolve) => {
    const req = http.get(
      { host: '127.0.0.1', port, path: '/json/version', timeout: 1500 },
      (res) => resolve(res.statusCode === 200)
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForDebugger(port, maxMs = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    if (await isDebuggerLive(port)) return true;
    await sleep(500);
  }
  return false;
}

function getExistingPage(browser) {
  const contexts = browser.contexts();
  if (!contexts.length) {
    throw new Error('CDP respondió, pero Edge no expuso ningún contexto.');
  }

  const ctx = contexts[0];
  const pages = ctx.pages().filter(p => !p.isClosed());

  if (!pages.length) {
    throw new Error('CDP respondió, pero no hay pestañas disponibles en Edge.');
  }

  return { ctx, page: pages[0] };
}

/* =========================
 * MODAL "USAR AQUI"
 * ========================= */
async function resolveUseHereModal(page) {
  const candidates = [
    'button:has-text("Usar aquí")',
    '[role="button"]:has-text("Usar aquí")',
    'div[role="button"]:has-text("Usar aquí")',
    'button:has-text("Use here")',
    '[role="button"]:has-text("Use here")',
    'div[role="button"]:has-text("Use here")',
  ];

  for (const sel of candidates) {
    try {
      const btn = page.locator(sel).first();
      const count = await btn.count().catch(() => 0);
      if (count > 0) {
        await btn.click({ timeout: 3000 }).catch(() => {});
        console.log('✅ Modal resuelto: clic en "Usar aquí".');
        await sleep(3000);
        return true;
      }
    } catch {}
  }

  return false;
}

/* =========================
 * ESPERAS ADAPTATIVAS
 * ========================= */
async function waitForNetworkQuiet(page, { quietMs = 1500, timeout = 20000 } = {}) {
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

  for (const [ev, fn] of Object.entries(handlers)) {
    client.on('Network.' + ev, fn);
  }

  const start = Date.now();
  try {
    while (Date.now() - start < timeout) {
      if (Date.now() - lastActivity >= quietMs) return true;
      await sleep(100);
    }
    return false;
  } finally {
    for (const [ev, fn] of Object.entries(handlers)) {
      client.off('Network.' + ev, fn);
    }
    try { await client.detach(); } catch {}
  }
}

async function waitForWhatsAppReady(page, {
  timeout = 60_000,
  quietMs = 1500,
  requireWsTraffic = false,
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
    await page.waitForLoadState('domcontentloaded', { timeout: 30_000 }).catch(() => {});
    await page.waitForLoadState('load', { timeout: 30_000 }).catch(() => {});

    while (Date.now() - t0 < timeout) {
      await resolveUseHereModal(page).catch(() => {});

      if (hasWASW || wsOpen) {
        const quietOk = await waitForNetworkQuiet(page, { quietMs, timeout: 4000 });
        if (quietOk && (!requireWsTraffic || wsFrames > 0)) return true;
      }

      await sleep(200);
    }

    return false;
  } finally {
    try { await client.detach(); } catch {}
  }
}

async function waitForSWControlled(page, timeout = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    try {
      const controlled = await page.evaluate(() =>
        !!(navigator.serviceWorker && navigator.serviceWorker.controller)
      );
      if (controlled) return true;
    } catch {}
    await sleep(200);
  }
  return false;
}

async function prepareWhatsApp(page) {
  console.log('🟡 Preparando WhatsApp Web…');

  await page.goto('https://web.whatsapp.com/', {
    waitUntil: 'domcontentloaded',
    timeout: 60_000
  }).catch(() => {});

  await resolveUseHereModal(page).catch(() => {});

  let ready = await waitForWhatsAppReady(page, {
    timeout: 60_000,
    quietMs: 1500,
    requireWsTraffic: false,
  });

  if (!ready) {
    console.warn('⚠️ Readiness inicial no confirmado. Reintentando…');
    await resolveUseHereModal(page).catch(() => {});
    ready = await waitForWhatsAppReady(page, {
      timeout: 45_000,
      quietMs: 1200,
      requireWsTraffic: false,
    });
  }

  if (!ready) {
    throw new Error('WhatsApp Web no quedó listo después del arranque.');
  }

  const swOk = await waitForSWControlled(page, 15_000).catch(() => false);
  if (!swOk) {
    console.warn('⚠️ SW no confirmado, pero continúo porque WhatsApp respondió.');
  }

  console.log('✅ WhatsApp Web listo.');
}

/* =========================
 * EDITOR HELPERS
 * ========================= */
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
 * CHAT READINESS
 * ========================= */
async function ensureChatReady(page, phone, textEncoded) {
  const variants = [
    `https://web.whatsapp.com/send?phone=${encodeURIComponent(phone)}&text=${textEncoded}`,
    `https://web.whatsapp.com/send/?phone=${encodeURIComponent(phone)}&text=${textEncoded}`,
    `https://web.whatsapp.com/send?phone=${encodeURIComponent(phone)}&text=${textEncoded}&app_absent=0`,
  ];

  for (let attempt = 1; attempt <= CHAT_RETRIES; attempt++) {
    const urlToOpen = variants[(attempt - 1) % variants.length];
    console.log(`🔁 Abriendo chat (intento ${attempt}/${CHAT_RETRIES}) con: ${urlToOpen}`);

    await page.goto(urlToOpen, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000
    }).catch(() => {});

    await resolveUseHereModal(page).catch(() => {});

    const tResolve = Date.now();
    let resolved = false;

    while (Date.now() - tResolve < PRE_SEND_TIMEOUT_MS) {
      if (page.isClosed()) return false;

      await resolveUseHereModal(page).catch(() => {});

      const cur = page.url();
      const isSend = /\/send\/?\?phone=/i.test(cur);
      if (!isSend && /web\.whatsapp\.com/i.test(cur)) {
        resolved = true;
        break;
      }

      await sleep(200);
    }

    if (!resolved) {
      console.warn('⚠️ El deep link no resolvió a vista de chat; reintento corto…');
      await sleep(FALLBACK_MS);
      continue;
    }

    await waitForNetworkQuiet(page, {
      quietMs: QUIET_PRE_MS,
      timeout: PRE_SEND_TIMEOUT_MS
    }).catch(() => {});

    await resolveUseHereModal(page).catch(() => {});
    return true;
  }

  return false;
}

/* =========================
 * ENVIO
 * ========================= */
async function sendMessage(page) {
  const editor = await findEditorWithRetry(page);
  if (editor) {
    await focusEditorAtEnd(page, editor);
  }

  try {
    await page.keyboard.press('Enter');
    console.log('↩️ Enviado (Enter)');
    return true;
  } catch (e) {
    console.warn('⚠️ No se pudo pulsar Enter:', e?.message || e);
    return false;
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
           c.total_pagado_completa, c.estado,
           c.correo, c.plataforma_id, pl.nombre AS plataforma_nombre
    FROM cuentascompletas c
    LEFT JOIN usuarios u ON u.contacto = c.contacto
    LEFT JOIN plataformas pl ON pl.id = c.plataforma_id
    WHERE c.fecha_vencimiento <= DATE_ADD(CURDATE(), INTERVAL 1 DAY)
      AND (c.estado IS NULL OR c.estado <> 'CANCELADA')
  `);

  return [...pRows, ...cRows];
}

function normalizePhone(s) {
  return String(s || '').replace(/\D/g, '');
}

function isE164(num) {
  return /^\d{8,15}$/.test(num);
}

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

  try {
    return `$ ${new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(num)}`;
  } catch {
    return `$ ${num.toFixed(2)}`;
  }
}

function lineForItemPantalla(it) {
  const plat = (it.plataforma_nombre || '').trim() || 'tu plataforma';
  const correo = (it.correo || '').trim();
  const vence = fmtDateDDMMYYYY(it.fecha_vencimiento);
  const costo = fmtMoney(it.total_pagado);
  const pant = it.nro_pantalla ? ` (pantalla ${it.nro_pantalla})` : '';

  return [
    `• Tu ${plat}${pant}`,
    correo ? `, con el correo ${correo}` : '',
    `, vence el *${vence}*, quería saber si deseas *realizar la renovación*`,
    costo ? `, tiene un costo de *${costo}*.` : '.',
  ].join('');
}

function lineForItemCompleta(it) {
  const plat = (it.plataforma_nombre || '').trim() || 'tu plataforma';
  const correo = (it.correo || '').trim();
  const vence = fmtDateDDMMYYYY(it.fecha_vencimiento);
  const costo = fmtMoney(it.total_pagado_completa);

  return [
    `• Tu ${plat}`,
    correo ? `, con el correo ${correo}` : '',
    `, vence el *${vence}*, quería saber si deseas *realizar la renovación*`,
    costo ? `, tiene un costo de *${costo}*.` : '.',
  ].join('');
}

function lineForItem(it) {
  return it.servicio === 'Cuenta completa'
    ? lineForItemCompleta(it)
    : lineForItemPantalla(it);
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
    const saludo = firstName ? `Hola ${firstName},` : 'Hola,';
    const lines = items.map(lineForItem).join('\n');
    const text = [
      `${saludo} te escribimos de ${BRAND}.`,
      '',
      lines,
      '',
      `*${NOTE_NEQUI}*`
    ].join('\n');

    recipients.push({ phone, text });
  }

  return recipients;
}

/* =========================
 * FLUJO PRINCIPAL
 * ========================= */
async function launchBrowserScript() {
  console.log(`🚀 Lanzando script de navegador: ${START_SCRIPT_RESOLVED}`);

  if (!fs.existsSync(START_SCRIPT_RESOLVED)) {
    throw new Error(`No existe el script de arranque: ${START_SCRIPT_RESOLVED}`);
  }

  const scOut = fs.createWriteStream(path.join(LOG_DIR, 'start-browser.out.log'), { flags: 'a' });
  const scErr = fs.createWriteStream(path.join(LOG_DIR, 'start-browser.err.log'), { flags: 'a' });

  const child = IS_WIN
    ? spawn('cmd.exe', ['/c', START_SCRIPT_RESOLVED], {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: process.env,
        cwd: path.dirname(START_SCRIPT_RESOLVED),
        detached: true
      })
    : spawn('bash', ['-lc', START_SCRIPT_RESOLVED], {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: process.env,
        cwd: path.dirname(START_SCRIPT_RESOLVED),
        detached: true
      });

  child.on('error', (err) => {
    console.error('❌ Error lanzando script del navegador:', err?.message || err);
  });

  if (child.stdout) {
    child.stdout.on('data', (d) => {
      try { scOut.write(`[${ts()}] ${d}`); } catch {}
    });
  }

  if (child.stderr) {
    child.stderr.on('data', (d) => {
      try { scErr.write(`[${ts()}] ${d}`); } catch {}
    });
  }

  child.unref();
}

async function connectToExistingEdge() {
  console.log('⏳ Esperando CDP…');
  const ok = await waitForDebugger(Number(DEBUG_PORT), 30_000);
  if (!ok) {
    throw new Error(`No se detectó CDP en 127.0.0.1:${DEBUG_PORT}`);
  }

  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${Number(DEBUG_PORT)}`);
  await sleep(3000);

  const { page } = getExistingPage(browser);
  if (page.isClosed()) {
    throw new Error('La pestaña de Edge se cerró antes de iniciar.');
  }

  return { browser, page };
}

async function sendAll(recipients) {
  await launchBrowserScript();

  const { browser, page } = await connectToExistingEdge();

  await prepareWhatsApp(page);

  let enviados = 0;
  let omitidos = 0;

  for (let i = 0; i < recipients.length; i++) {
    const r = recipients[i];
    const textEncoded = encodeURIComponent(r.text);

    console.log(`\n[${i + 1}/${recipients.length}] → ${r.phone}`);

    if (page.isClosed()) {
      throw new Error('La pestaña de WhatsApp se cerró durante el proceso.');
    }

    const chatOk = await ensureChatReady(page, r.phone, textEncoded);
    if (!chatOk) {
      console.error(`❌ No se pudo preparar el chat de ${r.phone} tras reintentos; se omite.`);
      omitidos++;
      continue;
    }

    console.log('✉️ Enviando…');
    const sent = await sendMessage(page);

    if (sent) enviados++;
    else omitidos++;

    console.log(`⏳ Pausa post-envío: ${GAP_BETWEEN_CONTACTS / 1000}s…`);
    await sleep(GAP_BETWEEN_CONTACTS);
  }

  console.log(`\n✅ Finalizado. Enviados: ${enviados}. Omitidos: ${omitidos}.`);
  console.log('ℹ️ Navegador dejado abierto para revisión manual.');
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