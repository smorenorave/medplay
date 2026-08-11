#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const fs = require('fs');
const { spawn, execSync } = require('child_process');
const http = require('http');
const { chromium } = require('playwright');
const mysql = require('mysql2/promise');

/* =========================
 * CONFIG GENERAL
 * ========================= */
const IS_WIN = process.platform === 'win32';
const ROOT_DIR = path.resolve(__dirname, '..');
const LOG_DIR = path.join(ROOT_DIR, '.logs');

try { fs.mkdirSync(LOG_DIR, { recursive: true }); } catch { }

const appOut = fs.createWriteStream(path.join(LOG_DIR, 'app.out.log'), { flags: 'a' });
const appErr = fs.createWriteStream(path.join(LOG_DIR, 'app.err.log'), { flags: 'a' });
const ts = () => new Date().toISOString().replace('T', ' ').replace('Z', '');

const _clog = console.log.bind(console);
const _cwarn = console.warn.bind(console);
const _cerr = console.error.bind(console);

console.log = (...args) => {
  const line = `[${ts()}] ${args.map(a => String(a)).join(' ')}\n`;
  try { appOut.write(line); } catch { }
  _clog(...args);
};

console.warn = (...args) => {
  const line = `[${ts()}] ${args.map(a => String(a)).join(' ')}\n`;
  try { appErr.write(line); } catch { }
  _cwarn(...args);
};

console.error = (...args) => {
  const line = `[${ts()}] ${args.map(a => String(a)).join(' ')}\n`;
  try { appErr.write(line); } catch { }
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
  // Ruta opcional a un archivo de texto (un teléfono por línea) con
  // contactos que YA recibieron el mensaje (por ejemplo, durante pruebas
  // manuales) y que deben quedar marcados como ENVIADO sin volver a
  // escribirles. Se importa una sola vez (los que ya estén en el log no
  // se vuelven a importar).
  SEED_ENVIADOS_FILE,
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

// Reinicia el navegador cada N contactos para evitar que Edge acumule
// memoria y termine crasheando ("Target crashed") tras muchas recargas
// seguidas de WhatsApp Web.
const RESTART_EVERY = 15;
// Reintentos por contacto ante un crash del navegador antes de omitirlo
// (quedará como ERROR para poder revisarlo o reintentarlo).
const MAX_ATTEMPTS_PER_CONTACT = 3;
// Reintentos al intentar recuperar/reabrir el navegador tras una caída,
// antes de darse por vencido con ESE intento puntual de recuperación.
const MAX_RECOVER_ATTEMPTS = 3;
// Si el navegador crashea esta cantidad de veces seguidas SIN lograr
// ni un solo envío exitoso de por medio, se asume que algo está roto de
// fondo (Edge, perfil, red) y se detiene el LOTE de forma ORDENADA
// (con resumen, sin perder el registro de lo ya hecho). Al volver a
// correr el script, retoma donde quedó gracias al log de envíos.
const MAX_CONSECUTIVE_BROKEN_SESSIONS = 5;

const BRAND = 'MEDPLAY';
const NOTE_NEQUI = 'PARA PAGOS POR NEQUI SOLICITAR EL QR POR FAVOR';

/* =========================
 * LOG DE ENVÍOS (fuente de verdad para deduplicación DEL DÍA)
 * =========================
 * Es un archivo JSONL (una línea = un evento). El control es "no
 * repetir el mismo día": antes de enviar a un contacto se revisa si ya
 * existe una línea con status "ENVIADO" para ese teléfono CON LA FECHA
 * DE HOY; si existe, se omite. Al terminar un lote diario completo (sin
 * pendientes) el archivo se archiva con la fecha y se reinicia vacío,
 * así el mismo cliente sí puede volver a recibir un recordatorio otro
 * día (p. ej. un día antes de vencer y el día que vence, o el mes
 * siguiente) sin quedar bloqueado para siempre.
 */
const SEND_LOG_FILE = path.join(LOG_DIR, 'envios_log.jsonl');

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function appendSendLog(entry) {
  const line = JSON.stringify({ ts: ts(), date: todayStr(), ...entry }) + '\n';
  try {
    fs.appendFileSync(SEND_LOG_FILE, line);
  } catch (e) {
    console.error('❌ No se pudo escribir en el log de envíos (esto es grave, revisar permisos):', e?.message || e);
  }
}

// Reconstruye el conjunto de teléfonos que YA recibieron un envío
// confirmado HOY. El control es "no repetir el mismo día" (porque el
// mismo cliente puede recibir un recordatorio un día antes de vencer y
// otro el mismo día de vencimiento, y además debe poder recibir un
// nuevo recordatorio el mes siguiente) — por eso solo se filtra por la
// fecha de hoy, no por todo el historial.
function loadSentPhones() {
  const sent = new Set();
  const hoy = todayStr();
  try {
    const raw = fs.readFileSync(SEND_LOG_FILE, 'utf8');
    for (const line of raw.split('\n')) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line);
        if (entry && entry.status === 'ENVIADO' && entry.phone && entry.date === hoy) {
          sent.add(entry.phone);
        }
      } catch { /* línea corrupta: se ignora, no se aborta el proceso por esto */ }
    }
  } catch { /* el archivo todavía no existe: no hay nada enviado aún hoy */ }
  return sent;
}

// Archiva el log del día (para dejar rastro por si hay que depurar algo
// más adelante) y deja el archivo activo vacío, listo para el día
// siguiente. Solo se llama cuando el lote del día quedó completamente
// procesado (sin pendientes) — si quedaron pendientes, el log del día
// se mantiene tal cual para que un reintento más tarde siga sin
// duplicar envíos de hoy.
function archivarYReiniciarLogDelDia() {
  try {
    if (!fs.existsSync(SEND_LOG_FILE)) return;
    const destino = path.join(LOG_DIR, `envios_log_${todayStr()}.jsonl`);
    if (fs.existsSync(destino)) {
      // Ya se había archivado hoy (p. ej. dos corridas completas en el
      // mismo día): concatenar en vez de perder el archivo anterior.
      fs.appendFileSync(destino, fs.readFileSync(SEND_LOG_FILE, 'utf8'));
      fs.writeFileSync(SEND_LOG_FILE, '');
    } else {
      fs.renameSync(SEND_LOG_FILE, destino);
    }
    console.log(`🗄️ Log de envíos de hoy archivado en ${destino}; el control de duplicados queda listo para mañana.`);
  } catch (e) {
    console.warn('⚠️ No se pudo archivar/reiniciar el log de envíos:', e?.message || e);
  }
}

// Permite "sembrar" manualmente contactos que ya recibieron el mensaje
// (p. ej. durante las pruebas) para que el script nunca vuelva a
// escribirles, sin tener que rastrear uno por uno en qué corrida salió.
function importSeedFile(sentPhones) {
  if (!SEED_ENVIADOS_FILE) return;
  const seedPath = path.resolve(ROOT_DIR, SEED_ENVIADOS_FILE);
  try {
    const raw = fs.readFileSync(seedPath, 'utf8');
    const phones = raw.split(/\r?\n/).map(normalizePhone).filter(isE164);
    let nuevos = 0;
    for (const phone of phones) {
      if (!sentPhones.has(phone)) {
        appendSendLog({ phone, status: 'ENVIADO', motivo: 'importado_manual_pre_produccion' });
        sentPhones.add(phone);
        nuevos++;
      }
    }
    if (nuevos > 0) {
      console.log(`📥 Importados ${nuevos} contacto(s) desde ${SEED_ENVIADOS_FILE} como ya enviados (no se les volverá a escribir).`);
    }
  } catch (e) {
    console.warn(`⚠️ No se pudo leer el archivo de contactos ya enviados (${seedPath}):`, e?.message || e);
  }
}

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

// Espera a que el puerto de debug quede REALMENTE libre antes de
// relanzar Edge. Sin esto, el relanzamiento puede "conectar" a un
// proceso zombie que ya no tiene ninguna pestaña útil.
async function waitForDebuggerDown(port, maxMs = 8000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    if (!(await isDebuggerLive(port))) return true;
    await sleep(300);
  }
  return false;
}

// Mata cualquier proceso de Edge que haya quedado colgado tras un
// crash, para que el relanzamiento no choque con un perfil bloqueado.
// Nunca es fatal si falla (puede que ya no haya proceso corriendo).
function killStaleEdgeProcesses() {
  try {
    if (IS_WIN) {
      execSync('taskkill /IM msedge.exe /F', { stdio: 'ignore' });
    } else {
      execSync('pkill -f msedge || true', { stdio: 'ignore', shell: '/bin/bash' });
    }
  } catch { /* no había proceso que matar, o no se pudo: no es fatal */ }
}

async function getExistingPage(browser) {
  const limit = Date.now() + 10000;

  while (Date.now() < limit) {

    const contexts = browser.contexts();

    if (contexts.length) {

      const ctx = contexts[0];
      const pages = ctx.pages().filter(p => !p.isClosed());

      if (pages.length) {
        return {
          ctx,
          page: pages[0]
        };
      }
    }

    await sleep(500);
  }

  throw new Error("Edge no expuso ningún contexto.");
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
        await btn.click({ timeout: 3000 }).catch(() => { });
        console.log('✅ Modal resuelto: clic en "Usar aquí".');
        await sleep(3000);
        return true;
      }
    } catch { }
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
    try { await client.detach(); } catch { }
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
    await page.waitForLoadState('domcontentloaded', { timeout: 30_000 }).catch(() => { });
    await page.waitForLoadState('load', { timeout: 30_000 }).catch(() => { });

    while (Date.now() - t0 < timeout) {
      await resolveUseHereModal(page).catch(() => { });

      if (hasWASW || wsOpen) {
        const quietOk = await waitForNetworkQuiet(page, { quietMs, timeout: 4000 });
        if (quietOk && (!requireWsTraffic || wsFrames > 0)) return true;
      }

      await sleep(200);
    }

    return false;
  } finally {
    try { await client.detach(); } catch { }
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
    } catch { }
    await sleep(200);
  }
  return false;
}

async function prepareWhatsApp(page) {
  console.log('🟡 Preparando WhatsApp Web…');

  await page.goto('https://web.whatsapp.com/', {
    waitUntil: 'domcontentloaded',
    timeout: 60_000
  }).catch(() => { });

  await resolveUseHereModal(page).catch(() => { });

  let ready = await waitForWhatsAppReady(page, {
    timeout: 60_000,
    quietMs: 1500,
    requireWsTraffic: false,
  });

  if (!ready) {
    console.warn('⚠️ Readiness inicial no confirmado. Reintentando…');
    await resolveUseHereModal(page).catch(() => { });
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
const EDITOR_SELECTOR = [
  '[data-testid="conversation-compose-box-input"] div[contenteditable="true"]',
  'div[role="textbox"][contenteditable="true"]',
  'div[contenteditable="true"][data-tab]',
].join(', ');

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
  try { await editor.scrollIntoViewIfNeeded?.(); } catch { }
  try { await editor.click({ delay: 20 }); } catch { }

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
  } catch { }

  try {
    await page.keyboard.press('ControlOrMeta+End').catch(() => { });
    await page.keyboard.press('End').catch(() => { });
    await page.keyboard.press('ArrowRight').catch(() => { });
  } catch { }
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
    }).catch(() => { });

    await resolveUseHereModal(page).catch(() => { });

    const tResolve = Date.now();
    let resolved = false;

    while (Date.now() - tResolve < PRE_SEND_TIMEOUT_MS) {
      if (page.isClosed()) return false;

      await resolveUseHereModal(page).catch(() => { });

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
    }).catch(() => { });

    await resolveUseHereModal(page).catch(() => { });
    return true;
  }

  return false;
}

/* =========================
 * ENVIO
 * ========================= */

// Verificación best-effort de que el mensaje realmente se envió:
// WhatsApp Web vacía el compositor casi de inmediato al aceptar el
// envío. Si sigue con texto después de un rato, algo no se aceptó.
// No es infalible, pero evita confiar ciegamente en que "Enter" haya
// funcionado (que era la causa de que envíos ambiguos por un crash se
// dieran por buenos o por malos sin ninguna evidencia real).
async function confirmMessageSent(page, timeoutMs = 5000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (page.isClosed()) return false;
    const text = await page.locator(EDITOR_SELECTOR).last().innerText().catch(() => null);
    if (text === '' || text === null) return true;
    await sleep(200);
  }
  return false;
}

// Devuelve { sent, confirmed }:
//  - sent=false      -> ni siquiera se pudo pulsar Enter (compositor no encontrado, etc.)
//  - sent=true, confirmed=false -> se pulsó Enter pero no hay evidencia de que se haya aceptado
//  - sent=true, confirmed=true  -> hay evidencia razonable de que el mensaje se envió
async function sendMessage(page) {
  const editor = await findEditorWithRetry(page);

  if (editor) {
    await focusEditorAtEnd(page, editor);
  }

  try {
    await page.keyboard.press('Enter');
  } catch (e) {
    const msg = e?.message || "";

    // Si el navegador murió de verdad, dejar que sendAll() lo maneje
    // como una caída de sesión (reintento con navegador nuevo).
    if (
      msg.includes("Target crashed") ||
      msg.includes("Target page") ||
      msg.includes("browser has been closed") ||
      msg.includes("Target closed")
    ) {
      throw e;
    }

    console.warn("⚠️ No se pudo pulsar Enter:", msg);
    return { sent: false, confirmed: false };
  }

  const confirmed = await confirmMessageSent(page).catch(() => false);

  if (confirmed !== true) {
    console.warn('⚠️ Se pulsó Enter pero el envío no quedó confirmado (el compositor no se vació).');
    return { sent: true, confirmed: false };
  }

  console.log('↩️ Enviado y confirmado.');
  return { sent: true, confirmed: true };
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
      try { scOut.write(`[${ts()}] ${d}`); } catch { }
    });
  }

  if (child.stderr) {
    child.stderr.on('data', (d) => {
      try { scErr.write(`[${ts()}] ${d}`); } catch { }
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
  console.log("=== DEBUG CDP ===");
  console.log("Contexts:", browser.contexts().length);

  for (const [i, ctx] of browser.contexts().entries()) {
    console.log(`Context ${i}: ${ctx.pages().length} páginas`);
  }

  const { page } = await getExistingPage(browser);
  if (page.isClosed()) {
    throw new Error('La pestaña de Edge se cerró antes de iniciar.');
  }

  return { browser, page };
}

async function openFreshSession() {
  // Si ya había un Edge corriendo (por ejemplo abierto manualmente antes
  // de correr el script), hay que cerrarlo primero: Edge es de instancia
  // única, así que lanzar uno nuevo con --remote-debugging-port mientras
  // otro ya está abierto sin ese flag NO habilita la depuración sobre esa
  // ventana — el puerto responde, pero sin ningún contexto real
  // ("Contexts: 0"). Por eso siempre se garantiza un arranque limpio.
  killStaleEdgeProcesses();
  await waitForDebuggerDown(Number(DEBUG_PORT), 5000).catch(() => { });

  await launchBrowserScript();
  const { browser, page } = await connectToExistingEdge();
  await prepareWhatsApp(page);
  return { browser, page };
}

// Cierra la sesión de Playwright Y se asegura de que el proceso de Edge
// quede realmente muerto (mata procesos colgados + espera a que el
// puerto de debug se libere). Esto es lo que antes faltaba: relanzar
// Edge sin esta limpieza es lo que producía "CDP respondió, pero Edge
// no expuso ningún contexto" al reconectar.
async function closeSessionQuiet(browser) {
  try { await browser?.close(); } catch { }
  await sleep(800);
  killStaleEdgeProcesses();
  await waitForDebuggerDown(Number(DEBUG_PORT), 8000).catch(() => { });
}

function looksLikeCrash(msg) {
  return /crash|closed|disconnected|Target closed|guid page|context or browser|no expuso ningún contexto/i.test(
    String(msg || '')
  );
}

// Intenta reabrir una sesión de navegador con reintentos y backoff
// creciente. A diferencia de la versión anterior, ESTA FUNCIÓN NUNCA
// LANZA: si no lo logra tras MAX_RECOVER_ATTEMPTS intentos, devuelve
// null y quien la llama decide qué hacer (nunca debe tumbar todo el
// proceso por esto).
async function recoverSession(motivo) {
  console.warn(`♻️ Reiniciando navegador (${motivo})…`);

  for (let i = 1; i <= MAX_RECOVER_ATTEMPTS; i++) {
    try {
      killStaleEdgeProcesses();
      await waitForDebuggerDown(Number(DEBUG_PORT), 5000).catch(() => { });
      await sleep(1500 * i);
      const session = await openFreshSession();
      return session;
    } catch (e) {
      console.error(`❌ Intento ${i}/${MAX_RECOVER_ATTEMPTS} de reabrir el navegador falló:`, e?.message || e);
    }
  }

  console.error('❌ No se pudo recuperar el navegador tras varios intentos.');
  return null;
}

/* =========================
 * ENVÍO DEL LOTE
 * =========================
 * Reglas duras de esta función:
 *  1) Un fallo con UN contacto jamás debe abortar el resto del lote.
 *  2) Si el navegador deja de poder recuperarse, el LOTE se detiene de
 *     forma ordenada (resumen + pendientes), nunca con una excepción
 *     sin controlar / process.exit(1) a mitad de camino.
 *  3) Cada resultado (ENVIADO / OMITIDO / ERROR) queda registrado en el
 *     log persistente con motivo, para poder depurar y para que la
 *     próxima corrida sepa a quién no volver a escribirle.
 */
async function sendAll(recipients, sentPhones) {
  let session = null;
  try {
    session = await openFreshSession();
  } catch (e) {
    console.error('❌ No se pudo iniciar el navegador:', e?.message || e);
  }

  let enviados = 0;
  let errores = 0;
  let sinceRestart = 0;
  let consecutiveBrokenSessions = 0;
  let detenidoEnIndex = -1; // -1 = se procesó todo el lote

  for (let i = 0; i < recipients.length; i++) {
    const r = recipients[i];

    if (!session) {
      detenidoEnIndex = i;
      break;
    }

    console.log(`\n[${i + 1}/${recipients.length}] → ${r.phone}`);

    // Reinicio preventivo periódico.
    if (sinceRestart > 0 && sinceRestart % RESTART_EVERY === 0) {
      await closeSessionQuiet(session.browser);
      session = await recoverSession('reinicio preventivo');
      if (!session) { detenidoEnIndex = i; break; }
      sinceRestart = 0;
    }

    let resultado = null;
    let motivo = null;

    try {
      const textEncoded = encodeURIComponent(r.text);
      let done = false;

      for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_CONTACT && !done; attempt++) {
        try {
          if (session.page.isClosed()) {
            throw new Error('La pestaña de WhatsApp se cerró.');
          }

          const chatOk = await ensureChatReady(session.page, r.phone, textEncoded);
          if (!chatOk) {
            throw new Error('CHAT_NOT_READY');
          }

          console.log('✉️ Enviando…');
          const sendResult = await sendMessage(session.page);

          if (sendResult.confirmed) {
            resultado = 'ENVIADO';
            enviados++;
            sentPhones.add(r.phone);
            consecutiveBrokenSessions = 0;
          } else {
            resultado = 'ERROR';
            motivo = sendResult.sent
              ? 'envio_no_confirmado_revisar_manualmente'
              : 'no_se_pudo_pulsar_enviar';
            errores++;
          }

          done = true;

        } catch (e) {
          const msg = e?.message || String(e);

          if (msg === 'CHAT_NOT_READY') {
            console.warn('♻️ Reiniciando Edge porque WhatsApp dejó de responder...');
            await closeSessionQuiet(session.browser);
            session = await recoverSession('chat no listo');
            if (!session) throw new Error('NO_SESSION');
            sinceRestart = 0;
            continue; // reintenta el MISMO contacto
          }

          console.warn(`⚠️ Fallo procesando ${r.phone} (intento ${attempt}/${MAX_ATTEMPTS_PER_CONTACT}): ${msg}`);

          if (!looksLikeCrash(msg)) {
            resultado = 'ERROR';
            motivo = msg;
            errores++;
            done = true;
            break;
          }

          consecutiveBrokenSessions++;
          await closeSessionQuiet(session.browser);
          session = await recoverSession(`fallo consecutivo ${consecutiveBrokenSessions}/${MAX_CONSECUTIVE_BROKEN_SESSIONS}`);
          if (!session) throw new Error('NO_SESSION');
          sinceRestart = 0;

          if (consecutiveBrokenSessions >= MAX_CONSECUTIVE_BROKEN_SESSIONS) {
            throw new Error('NO_SESSION');
          }
          // si quedan intentos, el for reintenta el MISMO contacto
        }
      }

      if (!done) {
        resultado = 'ERROR';
        motivo = 'se_agotaron_los_intentos';
        errores++;
      }

    } catch (fatalContactErr) {
      // Red de seguridad: CUALQUIER cosa no anticipada cae aquí, y el
      // lote sigue (o se detiene ordenadamente si ya no hay navegador).
      const msg = fatalContactErr?.message || String(fatalContactErr);

      if (msg === 'NO_SESSION' || !session) {
        console.error(`❌ Sin navegador disponible para continuar con ${r.phone}; se detiene el lote de forma ordenada.`);
        appendSendLog({ phone: r.phone, status: 'ERROR', motivo: 'sin_sesion_de_navegador_disponible' });
        detenidoEnIndex = i;
        break;
      }

      console.error(`❌ Excepción no controlada procesando ${r.phone}:`, msg);
      resultado = 'ERROR';
      motivo = 'excepcion_no_controlada: ' + msg;
      errores++;
    }

    if (resultado) {
      appendSendLog({ phone: r.phone, status: resultado, motivo });
    }

    sinceRestart++;

    console.log(`⏳ Pausa post-envío: ${GAP_BETWEEN_CONTACTS / 1000}s…`);
    await sleep(GAP_BETWEEN_CONTACTS);
  }

  if (session) {
    console.log('ℹ️ Dejando el navegador abierto para revisión manual.');
  }

  const pendientes = detenidoEnIndex >= 0 ? (recipients.length - detenidoEnIndex) : 0;

  return { enviados, errores, pendientes };
}

/* =========================
 * MAIN
 * ========================= */
(async () => {
  try {
    const conn = await getConnection();

    try {
      const rows = await fetchExpiringRows(conn);
      const allRecipients = groupByPhone(rows);

      if (!allRecipients.length) {
        console.log('✅ No hay contactos por notificar (hoy/mañana).');
        return;
      }

      // Fuente de verdad: el log persistente de envíos, sin importar
      // la fecha. Nunca se le vuelve a escribir a quien ya conste ahí
      // como ENVIADO.
      const sentPhones = loadSentPhones();
      importSeedFile(sentPhones);

      const recipients = [];
      let omitidosPrevios = 0;

      for (const r of allRecipients) {
        if (sentPhones.has(r.phone)) {
          omitidosPrevios++;
          appendSendLog({ phone: r.phone, status: 'OMITIDO', motivo: 'ya_enviado_previamente' });
          continue;
        }
        recipients.push(r);
      }

      if (omitidosPrevios > 0) {
        console.log(`⏩ ${omitidosPrevios} contacto(s) ya habían sido enviados anteriormente; se omiten.`);
      }

      if (!recipients.length) {
        console.log('✅ Todos los contactos vigentes ya fueron notificados anteriormente.');
        console.log(`\n===== RESUMEN =====\n✅ Enviados: 0\n⏩ Omitidos (ya en el log): ${omitidosPrevios}\n❌ Errores: 0\n⏳ Pendientes: 0\n====================`);
        return;
      }

      console.log(`📨 Enviaré ${recipients.length} mensaje(s).`);
      const { enviados, errores, pendientes } = await sendAll(recipients, sentPhones);

      console.log('\n===== RESUMEN =====');
      console.log(`✅ Enviados: ${enviados}`);
      console.log(`⏩ Omitidos (ya en el log): ${omitidosPrevios}`);
      console.log(`❌ Errores: ${errores}`);
      console.log(`⏳ Pendientes: ${pendientes}`);
      console.log('====================');

      if (pendientes > 0) {
        console.log('ℹ️ Vuelve a ejecutar el script para continuar con los pendientes; no se reenviará a quien ya conste como ENVIADO hoy en el log.');
      } else {
        // Lote del día completado sin pendientes: se archiva y se
        // reinicia el control de duplicados para mañana.
        archivarYReiniciarLogDelDia();
      }

    } finally {
      try { await conn.end(); } catch { }
      try { appOut.end(); } catch { }
      try { appErr.end(); } catch { }
    }

    // El navegador se deja abierto a propósito (para revisión manual y
    // para conservar la sesión de WhatsApp iniciada), pero la conexión
    // CDP hacia él mantiene vivo el proceso de Node indefinidamente si
    // no se sale explícitamente. Esto SOLO cierra el proceso de Node,
    // no toca Edge/WhatsApp.
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err?.message || err);
    process.exit(1);
  }
})();
