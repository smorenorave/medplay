/* scripts/notify-password-changes-proton.js
 * Notifica cambio de contraseña (Disney / Disney Premium) a todos los usuarios
 * asociados a un correo dado, enviando 1 mensaje por usuario (teléfono).
 *
 * Payload esperado (desde /api/proton/notify):
 *   { "correo": "email@dominio.com", "clave": "NuevaClave123" }
 *
 * ❗️NO se toca la lógica de WhatsApp (Playwright, CDP, .sh, tiempos, etc.)
 */

'use strict';

/* ========= Requires ========= */
require('dotenv').config();
const mysql = require('mysql2/promise');
const http = require('http');
const { spawn } = require('child_process');
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');

/* ========= LOG setup ========= */
const LOG_DIR =
  process.env.NOTIFY_LOG_DIR ||
  `${os.homedir()}/.medplay/logs`;

try { fs.mkdirSync(LOG_DIR, { recursive: true }); } catch {}

const LOG_FILE = path.join(LOG_DIR, 'notify-password-changes-proton.log');
function flog(...args) {
  const line = `[${new Date().toISOString()}] ${args.join(' ')}\n`;
  try { fs.appendFileSync(LOG_FILE, line); } catch {}
}
flog(`LOG_FILE=${LOG_FILE}`);

/* ========= ENV ========= */
const {
  DATABASE_URL,
  DEBUG_PORT = '9222',
  OPEN_SPACING_MS = '8000',
  START_SH = './start-chrome-wa.sh',
} = process.env;

if (!DATABASE_URL) {
  flog('❌ Falta DATABASE_URL en .env');
  console.error('❌ Falta DATABASE_URL en .env');
  process.exit(1);
}

const START_SH_RESOLVED = START_SH
  ? path.resolve(START_SH)
  : path.join(__dirname, 'start-chrome-wa.sh');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* =========================
 * TUNABLES (idénticos)
 * ========================= */
const EDITOR_RETRIES        = 40;
const EDITOR_POLL_MS        = 250;

const FALLBACK_MS           = 240_000;
const PRE_SEND_TIMEOUT_MS   = 75_000;
const QUIET_PRE_MS          = 1_400;
const CHAT_RETRIES          = 3;

const FIRST_BOOT_SW_MS      = 60_000;
const FIRST_BOOT_READY_MS   = 120_000;
const FIRST_BOOT_QUIET_MS   = 2_500;
const FIRST_BOOT_QUIET_TO   = 40_000;
const FIRST_BOOT_PAD_MS     = 20_000;

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

/* ========= CDP helpers (idénticos) ========= */
function isDebuggerLive(port) {
  return new Promise((resolve) => {
    const req = http.get(
      { host: '127.0.0.1', port, path: '/json/version', timeout: 900 },
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

async function startShOnce() {
  return new Promise((resolve, reject) => {
    try {
      const child = spawn('bash', ['-lc', START_SH_RESOLVED], {
        stdio: 'ignore',
        env: process.env,
        cwd: path.dirname(START_SH_RESOLVED),
        detached: true
      });
      child.on('error', reject);
      child.unref();
      setTimeout(resolve, 1200);
    } catch (e) {
      reject(e);
    }
  });
}

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

async function hardResetWA(page) {
  flog('🔄 Hard reset: recargando WhatsApp Web…');
  await page.goto('https://web.whatsapp.com/', { waitUntil: 'domcontentloaded', timeout: 60_000 }).catch(() => {});
  const swOk = await waitForSWControlled(page, 45_000);
  const ready = await waitForWhatsAppReady(page, { timeout: 90_000, quietMs: 1500 }).catch(() => false);
  const quiet = await waitForNetworkQuiet(page, { quietMs: 1200, timeout: 10_000 }).catch(() => false);
  return swOk && ready && quiet;
}

async function warmUpFirstLoad(page) {
  flog('🧊 Primer arranque: preparación extendida…');
  const tStart = Date.now();

  const swOk = await waitForSWControlled(page, FIRST_BOOT_SW_MS);
  if (!swOk) {
    flog('⚠️ SW no controlado → hard reset…');
    const resetOk = await hardResetWA(page).catch(() => false);
    if (!resetOk) {
      flog('⚠️ Hard reset no aseguró SW; fallback 4 min');
      await sleep(FALLBACK_MS);
    }
  }

  const ready = await waitForWhatsAppReady(page, {
    timeout: FIRST_BOOT_READY_MS,
    quietMs: 1800,
    requireWsTraffic: false,
  }).catch(() => false);

  if (!ready) {
    flog('⚠️ Readiness no confirmado → hard reset y retry corto…');
    const resetOk = await hardResetWA(page).catch(() => false);
    if (!resetOk) {
      flog('⚠️ Hard reset no ayudó; fallback 4 min');
      await sleep(FALLBACK_MS);
    }
  }

  const quiet = await waitForNetworkQuiet(page, {
    quietMs: FIRST_BOOT_QUIET_MS,
    timeout: FIRST_BOOT_QUIET_TO
  }).catch(() => false);

  if (!quiet) flog('⚠️ Quiet time insuficiente; aplicando colchón extra.');

  await sleep(FIRST_BOOT_PAD_MS);
  const elapsed = Date.now() - tStart;
  flog(`✅ Primer arranque listo en ${(elapsed/1000).toFixed(1)}s.`);
}

/* ========= EDITOR / envío (idénticos) ========= */
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

  for (let attempt = 1; attempt <= 3; attempt++) {
    const urlToOpen = variants[(attempt - 1) % variants.length];
    flog(`🔁 Abriendo chat (intento ${attempt}/3) con: ${urlToOpen}`);
    await page.goto(urlToOpen, { waitUntil: 'domcontentloaded', timeout: 60_000 }).catch(() => {});

    const tResolve = Date.now();
    let resolved = false;
    while (Date.now() - tResolve < PRE_SEND_TIMEOUT_MS) {
      const cur = page.url();
      const isSend = /\/send\/?\?phone=/i.test(cur);
      if (!isSend && /web\.whatsapp\.com/i.test(cur)) { resolved = true; break; }
      await sleep(200);
    }
    if (!resolved) {
      flog('⚠️ Deep link no resolvió; fallback 4 min y reintento');
      await sleep(FALLBACK_MS);
      await hardResetWA(page).catch(() => {});
      continue;
    }

    const swOk = await waitForSWControlled(page, 35_000);
    if (!swOk) {
      flog('⚠️ Sin SW controlado; fallback 4 min y reintento');
      await sleep(FALLBACK_MS);
      await hardResetWA(page).catch(() => {});
      continue;
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
  try {
    await page.keyboard.press('Enter');
    flog('↩️ Enviado (Enter)');
  } catch (e) {
    flog('⚠️ No se pudo pulsar Enter: ' + (e?.message || e));
  }
}

/* ========= DB ========= */
/** Solo Disney / Disney Premium; excluye vencidos y que vencen HOY */
async function fetchDisneyByCorreo(conn, correoLower) {
  if (!correoLower) return [];

  // Pantallas (cuentas compartidas) para plataformas 3 y 4
  const [pRows] = await conn.query(
    `
    SELECT
      'Pantalla' AS servicio,
      p.contacto,
      u.nombre,
      p.nro_pantalla,
      DATE(p.fecha_vencimiento) AS fecha_vencimiento,
      pl.nombre AS plataforma_nombre,
      cc.correo AS correo
    FROM pantallas p
    LEFT JOIN usuarios u           ON u.contacto = p.contacto
    LEFT JOIN cuentascompartidas cc ON cc.id = p.cuenta_id
    LEFT JOIN plataformas pl        ON pl.id = cc.plataforma_id
    WHERE LOWER(cc.correo) = ?
      AND cc.plataforma_id IN (3,4)
      AND (p.estado IS NULL OR p.estado <> 'CANCELADA')
      AND DATE(p.fecha_vencimiento) > CURDATE()
    `,
    [correoLower]
  );

  // Cuentas completas para plataformas 3 y 4
  const [cRows] = await conn.query(
    `
    SELECT
      'Cuenta completa' AS servicio,
      c.contacto,
      u.nombre,
      NULL AS nro_pantalla,
      DATE(c.fecha_vencimiento) AS fecha_vencimiento,
      pl.nombre AS plataforma_nombre,
      c.correo AS correo
    FROM cuentascompletas c
    LEFT JOIN usuarios u    ON u.contacto = c.contacto
    LEFT JOIN plataformas pl ON pl.id = c.plataforma_id
    WHERE LOWER(c.correo) = ?
      AND c.plataforma_id IN (3,4)
      AND (c.estado IS NULL OR c.estado <> 'CANCELADA')
      AND DATE(c.fecha_vencimiento) > CURDATE()
    `,
    [correoLower]
  );

  return [...pRows, ...cRows];
}

/* ========= Mensajes ========= */
function toE164(contacto) {
  return String(contacto || '').replace(/\D/g, '');
}
function fmtDateDDMMYYYY(value) {
  if (!value) return '';
  const s = String(value);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(value);
  if (isNaN(d)) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function buildMessage(nombre, items, correo, nuevaClave) {
  const first = (nombre ? nombre.trim().split(/\s+/)[0] : null) || '!';
  const bullets = items
    .map((it) => {
      const base = `• ${it.plataforma_nombre || 'Disney'} — ${it.servicio}`;
      const extra = it.servicio === 'Pantalla' && it.nro_pantalla ? ` | *Pantalla ${it.nro_pantalla}*` : '';
      const vence = it.fecha_vencimiento ? ` | vence: ${fmtDateDDMMYYYY(it.fecha_vencimiento)}` : '';
      return `${base}${extra}${vence}`;
    })
    .join('\n');

  const notaPantalla = itemtipss.some((it) => it.servicio === 'Pantalla')
    ? '\n*Recuerda tu pantalla es la que ves arriba; solo puedes utilizar esa.*'
    : '';



  return `Hola ${first}, te notificamos el *cambio de contraseña* de PROTON: *${correo}*.

${bullets}

*La nueva contraseña es:* ${nuevaClave}.
No la compartas con nadie; ¡que estés súper bien!${notaPantalla}

`.trim();
}

/* ========= MAIN ========= */
(async function main() {
  flog('== inicio notify-password-changes-proton ==');
  let browser = null;
  let page = null;
  let conn = null;

  try {
    // 1) Payload {correo, clave}
    const parsed = await readPayload();
    const correoRaw = String(parsed?.correo || '').trim().toLowerCase();
    const nuevaClave = String(parsed?.clave || '').trim();

    flog(`payload correo="${correoRaw}" clave_len=${nuevaClave.length}`);
    if (!correoRaw || !nuevaClave) {
      flog('Sin correo o clave -> aborta');
      console.log('No hay correo/clave válidos.');
      return;
    }

    // 2) Lanzar .sh y conectar CDP (sin cambios)
    flog(`START_SH=${START_SH_RESOLVED}`);
    await startShOnce();

    flog(`Esperando CDP en 127.0.0.1:${DEBUG_PORT}...`);
    const ok = await waitForDebugger(Number(DEBUG_PORT), 25000);
    flog(`CDP ok: ${ok}`);
    if (!ok) throw new Error(`No se detectó CDP en 127.0.0.1:${DEBUG_PORT}`);

    flog('Conectando a Chrome vía CDP...');
    const cdpUrl = `http://127.0.0.1:${DEBUG_PORT}`;
    const cdpBrowser = await chromium.connectOverCDP(cdpUrl);
    const context = cdpBrowser.contexts()[0] || (await cdpBrowser.newContext());
    browser = cdpBrowser;
    page = context.pages()[0] || (await context.newPage());
    flog('CDP conectado.');

    // 3) DB y consulta solo Disney(3)/Disney Premium(4)
    conn = await mysql.createConnection(DATABASE_URL);
    flog('DB: conectado');

    let rows = [];
    try {
      rows = await fetchDisneyByCorreo(conn, correoRaw);
      flog(`Filas Disney/+Premium (futuras): ${rows.length}`);
    } catch (e) {
      flog(`Error fetchDisneyByCorreo: ${e?.message || e}`);
      throw e;
    }

    // 4) Agrupar POR USUARIO (teléfono) -> 1 mensaje por usuario
    const grouped = new Map(); // key = phone
    const itemKey = (it) =>
      [
        it.servicio ?? '',
        it.plataforma_nombre ?? '',
        it.nro_pantalla ?? '',
        it.fecha_vencimiento ?? '',
      ].join('|');

    let skippedPhone = 0;

    for (const r of rows) {
      const phone = toE164(r.contacto);
      if (!/^\d{8,15}$/.test(phone)) { skippedPhone++; continue; }

      const cur =
        grouped.get(phone) || {
          phone,
          correo: correoRaw,       // mismo correo del payload
          nuevaClave,              // misma clave para todos los asociados a ese correo
          nombre: r.nombre || null,
          items: [],
          _kset: new Set(),
        };

      const item = {
        servicio: r.servicio,
        plataforma_nombre: r.plataforma_nombre,
        nro_pantalla: r.nro_pantalla,
        fecha_vencimiento: r.fecha_vencimiento,
      };

      const k = itemKey(item);
      if (!cur._kset.has(k)) {
        cur.items.push(item);
        cur._kset.add(k);
      }

      if (!cur.nombre && r.nombre) cur.nombre = r.nombre;
      grouped.set(phone, cur);
    }

    flog(`grouped.size=${grouped.size} skippedPhone=${skippedPhone}`);

    const recipients = Array.from(grouped.values())
      .map((r) => { delete r._kset; return r; })
      .sort((a, b) => a.phone.localeCompare(b.phone));

    if (!recipients.length) {
      flog('No hay recipients; saliendo.');
      console.log('No hay destinatarios (verifica fechas futuras, plataformas 3/4 y teléfonos).');
      return;
    }

    flog(`Recipients: ${recipients.length}`);
    console.log(`Notificando ${recipients.length} mensaje(s) (1 por usuario)…`);

    /* ==== 5) Abrir WhatsApp y esperar (sin cambios) ==== */
    await page.goto('https://web.whatsapp.com/', { waitUntil: 'domcontentloaded' });
    flog('⏳ Esperando 8 minutos fijos para la primera carga de WhatsApp Web…');
    await sleep(480_000);
    await warmUpFirstLoad(page).catch(async () => {
      flog('⚠️ warmUpFirstLoad lanzó excepción; fallback 4 min…');
      await sleep(FALLBACK_MS);
    });

    /* ==== 6) Envío (sin cambios) ==== */
    const gapEnv = Number(OPEN_SPACING_MS) || 8000;
    flog(`gapEnv=${gapEnv}`);

    for (let i = 0; i < recipients.length; i++) {
      const r = recipients[i];

      if (!Array.isArray(r.items) || r.items.length === 0) {
        flog(`Skip sin items -> ${r.phone}`);
        continue;
      }

      const text = buildMessage(r.nombre, r.items, r.correo, r.nuevaClave);
      flog(`Enviando [${i + 1}/${recipients.length}] ${r.phone} items=${r.items.length}`);

      const textEncoded = encodeURIComponent(text);
      const chatOk = await ensureChatReady(page, r.phone, textEncoded);
      if (!chatOk) {
        flog(`❌ No se pudo preparar el chat de ${r.phone}; se omite.`);
      } else {
        await sendMessage(page);
      }

      if (i < recipients.length - 1) {
        flog(`⏳ Pausa entre contactos: ${Math.round(gapEnv/1000)}s…`);
        await sleep(gapEnv);
      }
    }

    flog('✅ Notificaciones terminadas.');
  } catch (err) {
    flog(`❌ Error notify-password-changes-proton: ${err?.stack || err?.message || err}`);
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
  }
})();
