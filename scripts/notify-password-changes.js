#!/usr/bin/env node
/* scripts/notify-password-changes.js
 * Notifica por WhatsApp Web cambios de contraseña a clientes,
 * abriendo Chrome con CDP mediante un .sh y consultando MySQL.
 *
 * EJECUCIÓN RECOMENDADA:
 *   spawn(process.execPath, [scriptPath, `--payload=${base64(JSON)}`], { detached:true, stdio:'ignore' })
 *
 * Payload esperado:
 *   {
 *     "items": [
 *       { "correo": "email@dominio.com", "nuevaClave": "Clave123", "plataforma_id": 7 },
 *       ...
 *     ]
 *   }
 *
 * Reglas:
 *  - Enviar a TODOS los contactos asociados a los correo(s) y plataforma_id(s) del payload.
 *  - NO depende de wa_notificaciones.
 *  - NO enviar si la fecha de vencimiento es HOY o en el pasado.
 */

'use strict';

/* ========= Requires ========= */
require('dotenv').config({ path: '/home/medplay/medplayapp/medplay/.env' }); // ruta absoluta como el script funcional
const mysql = require('mysql2/promise');
const http = require('http');
const { spawn } = require('child_process');
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');

/* ========= LOG setup ========= */
const LOG_DIR = process.env.NOTIFY_LOG_DIR || `${os.homedir()}/.medplay/logs`;
try { fs.mkdirSync(LOG_DIR, { recursive: true }); } catch {}
const LOG_FILE = path.join(LOG_DIR, 'notify-password-changes.log');
function flog(...args) {
  const line = `[${new Date().toISOString()}] ${args.join(' ')}\n`;
  try { fs.appendFileSync(LOG_FILE, line); } catch {}
}
flog(`LOG_FILE=${LOG_FILE}`);

/* ========= ENV ========= */
const {
  DATABASE_URL,
  DEBUG_PORT = '9222',
  OPEN_SPACING_MS = '60000', // ↑ 60s por defecto (equipo lento). Ajustable por env.
  START_SH = './start-chrome-wa.sh',
} = process.env;

if (!DATABASE_URL) {
  flog('❌ Falta DATABASE_URL en .env');
  console.error('❌ Falta DATABASE_URL en .env');
  process.exit(1);
}

const START_SH_RESOLVED = process.env.START_SH
  ? path.resolve(process.env.START_SH)
  : path.join(__dirname, 'start-chrome-wa.sh');

function ensureExecutable(file) {
  try { fs.accessSync(file, fs.constants.X_OK); }
  catch { try { fs.chmodSync(file, 0o755); } catch {} }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/* =========================
 * TUNABLES
 * ========================= */
const EDITOR_RETRIES        = 40;
const EDITOR_POLL_MS        = 250;

const FALLBACK_MS           = 240_000;   // 4 min (uso residual, nunca durante warmup inicial)
const PRE_SEND_TIMEOUT_MS   = 75_000;
const QUIET_PRE_MS          = 1_400;
const CHAT_RETRIES          = 3;

// Primer arranque “pasivo” (sin recargas)
const FIRST_BOOT_PASSIVE_WAIT_MS     = 390_000; // ~6.5 min fijos
const POST_WARMUP_PASSIVE_QUIET_MS   = 2000;    // verificación pasiva de red en calma
const POST_WARMUP_PASSIVE_TO_MS      = 30000;   // timeout de verificación pasiva
const CHAT_SETTLE_MIN_MS             = 8000;    // 8–14s: dejar estabilizar la vista del chat antes de Enter
const CHAT_SETTLE_MAX_MS             = 14000;
const POST_SEND_MIN_MS               = 6000;    // ↑ 6–10s: pausa breve tras enviar (aumentada)
const POST_SEND_MAX_MS               = 10000;

/* ========= Helpers: lectura del payload ========= */
async function readPayload() {
  const arg = process.argv.find((a) => a.startsWith('--payload='));
  if (arg) {
    const b64 = arg.split('=')[1] || '';
    const txt = Buffer.from(b64, 'base64').toString('utf8');
    return JSON.parse(txt);
  }
  if (process.env.NOTIFY_ITEMS_JSON) return JSON.parse(process.env.NOTIFY_ITEMS_JSON);
  if (process.stdin.isTTY) return {};
  return await new Promise((resolve) => {
    let data = '';
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(data ? JSON.parse(data) : {}); } };
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => (data += c));
    process.stdin.on('end', finish);
    setTimeout(finish, 1500);
  });
}

/* ========= CDP helpers ========= */
function isDebuggerLive(port) {
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
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    if (await isDebuggerLive(port)) return true;
    await sleep(500);
  }
  return false;
}

/* ========= Lanzar el .sh ========= */
async function launchChromeViaSh() {
  return new Promise((resolve, reject) => {
    try {
      const env = {
        ...process.env,
        DEBUG_PORT: String(process.env.DEBUG_PORT || '9222'),
      };

      const child = spawn('bash', ['-lc', START_SH_RESOLVED], {
        cwd: path.dirname(START_SH_RESOLVED),
        env,
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      child.stdout.on('data', (b) => flog(`[start-sh][out] ${String(b).trim()}`));
      child.stderr.on('data', (b) => flog(`[start-sh][err] ${String(b).trim()}`));
      child.on('error', (e) => reject(e));

      child.unref();
      resolve();
    } catch (e) { reject(e); }
  });
}

/* ========= Esperas de red / WA ========= */
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

// Verificación pasiva post-warmup (SIN recargas ni hard reset)
async function passivePostWarmupChecks(page) {
  try { await page.waitForLoadState('load', { timeout: 45_000 }); } catch {}
  await waitForNetworkQuiet(page, {
    quietMs: POST_WARMUP_PASSIVE_QUIET_MS,
    timeout: POST_WARMUP_PASSIVE_TO_MS
  }).catch(() => {});
}

/* ========= Editor & envío ========= */
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
async function ensureChatReady(page, phone, textEncoded) {
  const variants = [
    `https://web.whatsapp.com/send?phone=${encodeURIComponent(phone)}&text=${textEncoded}`,
    `https://web.whatsapp.com/send/?phone=${encodeURIComponent(phone)}&text=${textEncoded}`,
    `https://web.whatsapp.com/send?phone=${encodeURIComponent(phone)}&text=${textEncoded}&app_absent=0`,
  ];

  const tracker = wsTracker(page);
  await tracker.attach();

  for (let attempt = 1; attempt <= CHAT_RETRIES; attempt++) {
    const urlToOpen = variants[(attempt - 1) % variants.length];
    flog(`🔁 [STEP 7] Abriendo chat (intento ${attempt}/${CHAT_RETRIES}) con: ${urlToOpen}`);
    await page.goto(urlToOpen, { waitUntil: 'domcontentloaded', timeout: 60_000 }).catch(() => {});

    // Pequeño asentamiento del chat (equipo lento)
    const settleMs = rand(CHAT_SETTLE_MIN_MS, CHAT_SETTLE_MAX_MS);
    flog(`   ↪ asentando vista de chat ~${Math.round(settleMs/1000)}s…`);
    await sleep(settleMs);

    const tResolve = Date.now();
    let resolved = false;
    while (Date.now() - tResolve < PRE_SEND_TIMEOUT_MS) {
      const cur = page.url();
      const isSend = /\/send\/?\?phone=/i.test(cur);
      if (!isSend && /web\.whatsapp\.com/i.test(cur)) { resolved = true; break; }
      await sleep(200);
    }
    if (!resolved) {
      flog('⚠️ Deep link no resolvió; reintento con otra variante (sin hard reset)…');
      continue; // NO hard reset aquí para no castigar equipos lentos
    }

    await waitForNetworkQuiet(page, { quietMs: QUIET_PRE_MS, timeout: PRE_SEND_TIMEOUT_MS }).catch(() => {});
    await tracker.dispose();
    return true;
  }

  await tracker.dispose();
  return false;
}
async function sendMessage(page) {
  const editor = await findEditorWithRetry(page);
  if (editor) await focusEditorAtEnd(page, editor);
  try { await page.keyboard.press('Enter'); flog('↩️ [STEP 8] Enviado (Enter)'); }
  catch (e) { flog('⚠️ No se pudo pulsar Enter: ' + (e?.message || e)); }
}

/* ========= DB ========= */
/** Filtra por LOWER(correo) y por plataforma_id; excluye vencidos y que vencen HOY */
async function fetchByCorreosAndPlataformas(conn, correos = [], plataformaIds = []) {
  if (!correos.length || !plataformaIds.length) return [];
  const inCorreos = correos.map(() => '?').join(',');
  const inPlats   = plataformaIds.map(() => '?').join(',');

  // Pantallas (plataforma por cuentascompartidas)
  const [pRows] = await conn.query(
    `
    SELECT
      'Pantalla' AS servicio,
      p.contacto,
      u.nombre,
      p.nro_pantalla,
      DATE(p.fecha_vencimiento) AS fecha_vencimiento,
      pl.id AS plataforma_id,
      pl.nombre AS plataforma_nombre,
      cc.correo AS correo
    FROM pantallas p
    LEFT JOIN usuarios u ON u.contacto = p.contacto
    LEFT JOIN cuentascompartidas cc ON cc.id = p.cuenta_id
    LEFT JOIN plataformas pl ON pl.id = cc.plataforma_id
    WHERE LOWER(cc.correo) IN (${inCorreos})
      AND cc.plataforma_id IN (${inPlats})
      AND (p.estado IS NULL OR p.estado <> 'CANCELADA')
      AND DATE(p.fecha_vencimiento) > CURDATE()
    `,
    [...correos, ...plataformaIds]
  );

  // Cuentas completas
  const [cRows] = await conn.query(
    `
    SELECT
      'Cuenta completa' AS servicio,
      c.contacto,
      u.nombre,
      NULL AS nro_pantalla,
      DATE(c.fecha_vencimiento) AS fecha_vencimiento,
      pl.id AS plataforma_id,
      pl.nombre AS plataforma_nombre,
      c.correo AS correo
    FROM cuentascompletas c
    LEFT JOIN usuarios u ON u.contacto = c.contacto
    LEFT JOIN plataformas pl ON pl.id = c.plataforma_id
    WHERE LOWER(c.correo) IN (${inCorreos})
      AND c.plataforma_id IN (${inPlats})
      AND (c.estado IS NULL OR c.estado <> 'CANCELADA')
      AND DATE(c.fecha_vencimiento) > CURDATE()
    `,
    [...correos, ...plataformaIds]
  );

  return [...pRows, ...cRows];
}

/* ========= Mensajes ========= */
function toE164(contacto) { return String(contacto || '').replace(/\D/g, ''); }
function fmtDateDDMMYYYY(value) {
  if (!value) return '';
  const s = String(value);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(value); if (isNaN(d)) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).toString().padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
function buildMessage(nombre, item, correo, nuevaClave) {
  const first = (nombre ? nombre.trim().split(/\s+/)[0] : null) || '!';
  const base = `• ${item.plataforma_nombre || 'tu plataforma'} — ${item.servicio}`;
  const extra = item.servicio === 'Pantalla' && item.nro_pantalla ? ` | *Pantalla ${item.nro_pantalla}*` : '';
  const vence = item.fecha_vencimiento ? ` | vence: ${fmtDateDDMMYYYY(item.fecha_vencimiento)}` : '';
  const bullet = `${base}${extra}${vence}`;

  const notaPantalla = item.servicio === 'Pantalla'
    ? '\n*Recuerda tu pantalla es la que ves arriba; solo puedes utilizar esa.*'
    : '';

  const tips = `
NOTA:*NO MODIFICAR LOS NUMEROS DEL PERFIL, USAR UNICAMENTE EL QUE SE LE ASIGNO SIN CAMBIARLO*
PARA EVITAR CODIGOS DEBES BORRAR HISTORIAL Y COOKIES ---->    
EN CELULAR: https://www.youtube.com/watch?v=rEsApVI1-lk
EN EL COMPUTADOR: https://www.youtube.com/watch?v=2pYn4px0YWI`;

  return `Hola ${first}, te notificamos el *cambio de contraseña* asociado a tu correo: *${correo}*.

${bullet}

*La nueva contraseña es:* ${nuevaClave} 
No la compartas con nadie; ¡que estés súper bien!${notaPantalla}

${tips}`.trim();
}

/* ========= MAIN ========= */
(async function main() {
  flog('== inicio notify-password-changes ==');
  let browser = null;
  let page = null;
  let conn = null;

  try {
    /* STEP 1: Leer payload */
    const t1 = Date.now();
    const parsed = await readPayload();
    const items = Array.isArray(parsed?.items) ? parsed.items : [];
    flog(`[STEP 1] items recibidos: ${items.length}`);
    if (!items.length) { flog('⛔ No hay items para notificar → salida temprana.'); console.log('No hay items para notificar'); return; }

    /* STEP 2: Normalizar y consolidar por (correo, plataforma_id) */
    const normCorreo = (v) => String(v || '').trim().toLowerCase();
    const lastByCorreoPlataforma = new Map(); // key = `${correo}::${plataforma_id}`
    const correosSet = new Set();
    const plataformasSet = new Set();

    for (const it of items) {
      const correo = normCorreo(it.correo);
      const plataforma_id = Number(it.plataforma_id);
      const nuevaClave = String(it.nuevaClave || '').trim();
      if (!correo || !nuevaClave || !Number.isFinite(plataforma_id)) continue;
      const key = `${correo}::${plataforma_id}`;
      lastByCorreoPlataforma.set(key, nuevaClave);
      correosSet.add(correo);
      plataformasSet.add(plataforma_id);
    }

    const correos = Array.from(correosSet);
    const plataformaIds = Array.from(plataformasSet);
    flog(`[STEP 2] Correos únicos=${correos.length} | plataforma_id únicos=${plataformaIds.length}`);
    if (!correos.length || !plataformaIds.length) {
      flog('⛔ Sin correos o plataforma_id válidos en payload → salida temprana.');
      console.log('Sin correos/plataformas válidos.'); return;
    }
    flog(`[STEP 2] Time=${Date.now() - t1}ms`);

    /* STEP 3: Conectar DB y consultar por (correo, plataforma_id) */
    const t3 = Date.now();
    conn = await mysql.createConnection(DATABASE_URL);
    flog('[STEP 3] DB: conectado');
    let rows = [];
    try {
      rows = await fetchByCorreosAndPlataformas(conn, correos, plataformaIds);
      flog(`[STEP 3] Filas obtenidas (futuras): ${rows.length}`);
    } catch (e) {
      flog(`[STEP 3] ❌ Error fetchByCorreosAndPlataformas: ${e?.message || e}`);
      throw e;
    }

    // Log detallado (opcional) de cada fila que regresó el SQL — activar con VERBOSE_SQL_LOG=1
    if (String(process.env.VERBOSE_SQL_LOG) === '1') {
      for (const r of rows) {
        flog(
          `[STEP 3][ROW] correo=${(r.correo||'').toLowerCase()} ` +
          `plataforma_id=${r.plataforma_id} (${r.plataforma_nombre||'N/D'}) ` +
          `phone=${String(r.contacto||'').replace(/\D/g,'')} ` +
          `servicio=${r.servicio} ` +
          `pantalla=${r.nro_pantalla ?? '—'} ` +
          `vence=${fmtDateDDMMYYYY(r.fecha_vencimiento) || '—'}`
        );
      }
    }

    flog(`[STEP 3] Time=${Date.now() - t3}ms`);

    /* STEP 4: Construir tareas (1 tarea = 1 mensaje) ordenadas por correo y plataforma */
    const t4 = Date.now();

    // Log auxiliar por correo/plataforma para ver qué trae la DB
    const perCorreoPlat = new Map(); // `${correo}::${plataforma_id}` -> { plataforma_nombre, count, phones:Set }
    const bump = (k, platName, phone) => {
      if (!perCorreoPlat.has(k)) perCorreoPlat.set(k, { plataforma_nombre: platName || 'N/D', count: 0, phones: new Set() });
      const o = perCorreoPlat.get(k);
      o.count++;
      if (phone) o.phones.add(phone);
    };

    /** task = { correo, plataforma_id, plataforma_nombre, phone, nombre, item, nuevaClave } */
    const tasks = [];
    let skippedPhone = 0;
    let skippedNoClave = 0;

    for (const r of rows) {
      const phone = toE164(r.contacto);
      if (!/^\d{8,15}$/.test(phone)) { skippedPhone++; continue; }

      const correoL = normCorreo(r.correo);
      const plataforma_id = Number(r.plataforma_id);
      const keyCP = `${correoL}::${plataforma_id}`;
      const nuevaClave = lastByCorreoPlataforma.get(keyCP);
      if (!nuevaClave) { skippedNoClave++; continue; }

      const item = {
        servicio: r.servicio,
        plataforma_id: r.plataforma_id,
        plataforma_nombre: r.plataforma_nombre,
        nro_pantalla: r.nro_pantalla,
        fecha_vencimiento: r.fecha_vencimiento,
      };

      tasks.push({
        correo: correoL,
        plataforma_id,
        plataforma_nombre: r.plataforma_nombre || null,
        phone,
        nombre: r.nombre || null,
        item,
        nuevaClave,
      });

      bump(keyCP, r.plataforma_nombre, phone);
    }

    // Ordenar: correo ASC, plataforma (nombre ASC, fallback id), phone
    tasks.sort((a, b) => {
      const c = a.correo.localeCompare(b.correo);
      if (c !== 0) return c;
      const na = (a.plataforma_nombre || '').toString();
      const nb = (b.plataforma_nombre || '').toString();
      const pn = na.localeCompare(nb);
      if (pn !== 0) return pn;
      return (a.plataforma_id - b.plataforma_id) || a.phone.localeCompare(b.phone);
    });

    // Logs de resumen por correo+plataforma
    for (const [k, v] of perCorreoPlat.entries()) {
      const [corr, pid] = k.split('::');
      flog(`[STEP 4][RESUMEN] correo=${corr} plataforma_id=${pid} (${v.plataforma_nombre}) filas=${v.count} phones=${Array.from(v.phones).join(',')}`);
    }

    flog(`[STEP 4] tasks=${tasks.length} skippedPhone=${skippedPhone} skippedNoClave=${skippedNoClave}`);
    flog(`[STEP 4] Time=${Date.now() - t4}ms`);

    /* STEP 5: Validaciones finales antes de abrir navegador/.sh */
    if (!tasks.length) {
      flog('⛔ No hay tareas tras filtros (fechas futuras / correos / teléfonos / plataforma) → salida temprana.');
      console.log('No hay destinatarios (verifica fechas futuras, correos, teléfonos y plataforma).');
      return;
    }
    flog('[STEP 5] OK → hay tareas, continuamos a WA/CDP.');

    /* STEP 6: Levantar Chrome (.sh) y conectar CDP (sin hard reset durante warmup) */
    const t6 = Date.now();
    flog(`[STEP 6.1] START_SH=${START_SH_RESOLVED}`);
    ensureExecutable(START_SH_RESOLVED);

    // Si ya hay CDP vivo, no lanzamos otro Chrome
    const preLive = await waitForDebugger(Number(DEBUG_PORT), 1500);
    if (!preLive) {
      flog('[STEP 6.1] Lanzando start-chrome-wa.sh…');
      await launchChromeViaSh();
    } else {
      flog('[STEP 6.1] CDP ya estaba vivo, no relanzamos Chrome.');
    }

    flog(`[STEP 6.2] Esperando CDP en 127.0.0.1:${DEBUG_PORT}…`);
    const ok = await waitForDebugger(Number(DEBUG_PORT), 25_000);
    flog(`[STEP 6.2] CDP ok: ${ok}`);
    if (!ok) {
      flog('[STEP 6.2] Falló espera de CDP. Reintento único: relanzo .sh y espero 25s más…');
      await launchChromeViaSh();
      const ok2 = await waitForDebugger(Number(DEBUG_PORT), 25_000);
      flog(`[STEP 6.2] CDP ok tras relanzar: ${ok2}`);
      if (!ok2) throw new Error(`No se detectó CDP en 127.0.0.1:${DEBUG_PORT}`);
    }

    flog('[STEP 6.2] Conectando a Chrome vía CDP…');
    const cdpUrl = `http://127.0.0.1:${DEBUG_PORT}`;
    const cdpBrowser = await chromium.connectOverCDP(cdpUrl);
    const context = cdpBrowser.contexts()[0] || (await cdpBrowser.newContext());
    browser = cdpBrowser;
    page = context.pages()[0] || (await context.newPage());
    flog('[STEP 6.2] CDP conectado.');

    // Abrir WA y WARMUP (pasivo, sin recargas)
    await page.goto('https://web.whatsapp.com/', { waitUntil: 'domcontentloaded' });
    flog(`⏳ [STEP 6.3] Warmup inicial: esperando ${Math.round(FIRST_BOOT_PASSIVE_WAIT_MS / 1000)}s fijos (sin recargar)…`);
    await sleep(FIRST_BOOT_PASSIVE_WAIT_MS);

    // Verificación pasiva (no recarga, no hard reset)
    flog('[STEP 6.3] Verificación pasiva post-warmup (sin recargas)…');
    await passivePostWarmupChecks(page);
    flog(`[STEP 6] Time=${Date.now() - t6}ms`);

    /* STEP 7/8: Envío con pausas */
    // Más tiempo base entre mensajes (90s mínimo) + jitter 15–30s
    const baseGap = Math.max(Number(OPEN_SPACING_MS) || 90000, 90000);
    flog(`[STEP 7] base gapEnv=${baseGap}ms (se añadirá jitter 15–30s)`);
    console.log(`Notificando ${tasks.length} mensaje(s) en orden por correo y plataforma…`);

    // Log de “bloques” (correo::plataforma)
    let prevKey = null;

    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      const blkKey = `${t.correo}::${t.plataforma_id}`;
      if (blkKey !== prevKey) {
        flog(`— BLOQUE — correo=${t.correo} | plataforma_id=${t.plataforma_id} (${t.plataforma_nombre || 'N/D'})`);
        prevKey = blkKey;
      }

      const text = buildMessage(t.nombre, t.item, t.correo, t.nuevaClave);
      flog(`→ [${i + 1}/${tasks.length}] phone=${t.phone} correo=${t.correo} plataforma_id=${t.plataforma_id} (${t.plataforma_nombre||'N/D'}) servicio=${t.item.servicio} pantalla=${t.item.nro_pantalla||'—'} vence=${fmtDateDDMMYYYY(t.item.fecha_vencimiento)||'—'}`);

      const textEncoded = encodeURIComponent(text);
      const chatOk = await ensureChatReady(page, t.phone, textEncoded);
      if (!chatOk) {
        flog(`❌ No se pudo preparar el chat de ${t.phone}; se omite.`);
      } else {
        await sendMessage(page); // Enter
        const postSendPause = rand(POST_SEND_MIN_MS, POST_SEND_MAX_MS); // 6–10s
        flog(`   ↪ post-send pause ~${Math.round(postSendPause/1000)}s…`);
        await sleep(postSendPause);
      }

      // Pausa entre mensajes (si NO es el último)
      if (i < tasks.length - 1) {
        const jitter = rand(15000, 30000); // 15–30s
        const pause = baseGap + jitter;
        flog(`⏳ Pausa entre mensajes: ~${Math.round(pause/1000)}s (incluye jitter)…`);
        await sleep(pause);
      }
    }

    // 🔚 Espera final tras el ÚLTIMO mensaje (misma pausa que entre mensajes)
    if (tasks.length > 0) {
      const jitter = rand(15000, 30000); // 15–30s, igual que entre mensajes
      const finalPause = baseGap + jitter;
      flog(`🧵 Espera final post-último mensaje: ~${Math.round(finalPause/1000)}s (misma que entre mensajes)…`);
      await sleep(finalPause);
    }

    flog('✅ Notificaciones terminadas.');
  } catch (err) {
    flog(`❌ Error notify-password-changes: ${err?.stack || err?.message || err}`);
    process.exitCode = 1;
  } finally {
    try { if (page) await page.close(); } catch {}
    try {
      if (browser) {
        try {
          const cdp = await browser.newBrowserCDPSession?.();
          if (cdp) await cdp.send('Browser.close').catch(() => {});
        } catch {}
        await browser.close().catch(() => {});
      }
    } catch {}
    try { if (conn) await conn.end(); } catch {}
    flog('== fin notify-password-changes ==');
  }
})();
