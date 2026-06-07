/*
ARCHIVO 1: scripts/start-edge-wa.bat
Guarda este contenido como: scripts\start-edge-wa.bat

@echo off
setlocal

set "BROWSER_EXE="

if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_EXE=C:\Program Files\Microsoft\Edge\Application\msedge.exe"
) else if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_EXE=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
) else (
    echo No se encontro Microsoft Edge.
    exit /b 1
)

if "%DEBUG_PORT%"=="" set "DEBUG_PORT=9222"
if "%USER_DATA_DIR%"=="" set "USER_DATA_DIR=%LOCALAPPDATA%\EdgeWAProfile"
if "%USER_PROFILE%"=="" set "USER_PROFILE=Default"

if not exist "%USER_DATA_DIR%" mkdir "%USER_DATA_DIR%"

start "" "%BROWSER_EXE%" ^
  --remote-debugging-port=%DEBUG_PORT% ^
  --remote-debugging-address=127.0.0.1 ^
  --user-data-dir="%USER_DATA_DIR%" ^
  --profile-directory="%USER_PROFILE%" ^
  --no-first-run ^
  --no-default-browser-check ^
  --disable-features=msEdgeStartupBoost

endlocal
exit /b 0
*/


'use strict';

const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');
const mysql = require('mysql2/promise');
const { chromium } = require('playwright');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

/* ========= CONFIG ========= */
const ROOT_DIR = path.resolve(__dirname, '..');
const LOG_DIR = path.join(ROOT_DIR, '.logs');
try { fs.mkdirSync(LOG_DIR, { recursive: true }); } catch {}

const LOG_FILE = path.join(LOG_DIR, 'notify-password-changes.log');
function flog(...args) {
  const line = `[${new Date().toISOString()}] ${args.join(' ')}\n`;
  try { fs.appendFileSync(LOG_FILE, line); } catch {}
  console.log(...args);
}

const {
  DATABASE_URL,
  DEBUG_PORT = '9222',
  OPEN_SPACING_MS = '12000',
  START_SCRIPT = './scripts/start-edge-wa.bat',
} = process.env;

if (!DATABASE_URL) {
  flog('Falta DATABASE_URL en .env');
  process.exit(1);
}

const IS_WIN = process.platform === 'win32';
const START_SCRIPT_RESOLVED = path.resolve(ROOT_DIR, START_SCRIPT);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ========= HELPERS CDP ========= */
function isDebuggerLive(port) {
  return new Promise((resolve) => {
    const req = http.get(
      { host: '127.0.0.1', port, path: '/json/version', timeout: 1000 },
      (res) => {
        res.resume();
        resolve(res.statusCode === 200);
      }
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForDebugger(port, maxMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    if (await isDebuggerLive(port)) return true;
    await sleep(500);
  }
  return false;
}

async function launchBrowserScript() {
  flog(`[STEP 6.1] START_SCRIPT=${START_SCRIPT_RESOLVED}`);

  if (!fs.existsSync(START_SCRIPT_RESOLVED)) {
    throw new Error(`No existe el script de arranque: ${START_SCRIPT_RESOLVED}`);
  }

  flog('[STEP 6.1] Lanzando Edge con CDP...');

  const child = IS_WIN
    ? spawn('cmd.exe', ['/d', '/s', '/c', `"${START_SCRIPT_RESOLVED}"`], {
        stdio: 'ignore',
        env: process.env,
        cwd: path.dirname(START_SCRIPT_RESOLVED),
        detached: true,
        windowsHide: true,
      })
    : spawn('bash', [START_SCRIPT_RESOLVED], {
        stdio: 'ignore',
        env: process.env,
        cwd: path.dirname(START_SCRIPT_RESOLVED),
        detached: true,
      });

  child.on('error', (err) => {
    flog(`Error lanzando navegador: ${err?.message || err}`);
  });

  child.unref();
  await sleep(1500);
}

function getExistingPage(browser) {
  const contexts = browser.contexts();
  if (!contexts.length) {
    throw new Error('CDP respondio, pero Edge no expuso ningun contexto.');
  }

  const ctx = contexts[0];
  let pages = ctx.pages().filter((p) => !p.isClosed());

  if (!pages.length) {
    throw new Error('CDP respondio, pero no hay pestanas disponibles en Edge.');
  }

  return { ctx, page: pages[0] };
}

async function connectToExistingEdge() {
  const port = Number(DEBUG_PORT);
  flog(`[STEP 6.2] Esperando CDP en 127.0.0.1:${port}...`);

  const ok = await waitForDebugger(port, 30000);
  flog(`[STEP 6.2] CDP ok: ${ok}`);

  if (!ok) {
    throw new Error(`No se detecto CDP en 127.0.0.1:${port}`);
  }

  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  await sleep(3000);

  const { page } = getExistingPage(browser);
  if (page.isClosed()) {
    throw new Error('La pestana de Edge se cerro antes de iniciar.');
  }

  return { browser, page };
}

/* ========= MODAL "USAR AQUI" ========= */
async function resolveUseHereModal(page) {
  const selectors = [
    'button:has-text("Usar aqui")',
    'button:has-text("Usar aquí")',
    '[role="button"]:has-text("Usar aqui")',
    '[role="button"]:has-text("Usar aquí")',
    'div[role="button"]:has-text("Usar aqui")',
    'div[role="button"]:has-text("Usar aquí")',
    'button:has-text("Use here")',
    '[role="button"]:has-text("Use here")',
    'div[role="button"]:has-text("Use here")',
  ];

  for (const sel of selectors) {
    try {
      const btn = page.locator(sel).first();
      const count = await btn.count().catch(() => 0);
      if (count > 0) {
        await btn.click({ timeout: 3000 }).catch(() => {});
        flog('Modal resuelto: clic en Usar aqui.');
        await sleep(3000);
        return true;
      }
    } catch {}
  }

  return false;
}

/* ========= WA HELPERS ========= */
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
  timeout = 60000,
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
    await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
    await page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});

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
  flog('[STEP 6.3] Preparando WhatsApp Web...');

  await page.goto('https://web.whatsapp.com/', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  }).catch(() => {});

  await resolveUseHereModal(page).catch(() => {});

  let ready = await waitForWhatsAppReady(page, {
    timeout: 60000,
    quietMs: 1500,
    requireWsTraffic: false,
  });

  if (!ready) {
    flog('[STEP 6.3] Readiness inicial no confirmado. Reintentando...');
    await resolveUseHereModal(page).catch(() => {});
    ready = await waitForWhatsAppReady(page, {
      timeout: 45000,
      quietMs: 1200,
      requireWsTraffic: false,
    });
  }

  if (!ready) {
    throw new Error('WhatsApp Web no quedo listo despues del arranque.');
  }

  const swOk = await waitForSWControlled(page, 15000).catch(() => false);
  if (!swOk) {
    flog('[STEP 6.3] SW no confirmado, pero continuo porque WhatsApp respondio.');
  }

  flog('[STEP 6.3] WhatsApp Web listo.');
}

/* ========= EDITOR / ENVIO ========= */
const EDITOR_RETRIES = 40;
const EDITOR_POLL_MS = 250;
const PRE_SEND_TIMEOUT_MS = 45000;
const QUIET_PRE_MS = 1200;
const CHAT_RETRIES = 3;
const FALLBACK_MS = 20000;

async function findEditorWithRetry(page) {
  const sels = [
    '[data-testid="conversation-compose-box-input"] div[contenteditable="true"]',
    'div[aria-label="Escribe un mensaje"][contenteditable="true"]',
    'div[aria-label="Type a message"][contenteditable="true"]',
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
    await editor.evaluate((el) => {
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

  for (let attempt = 1; attempt <= CHAT_RETRIES; attempt++) {
    const urlToOpen = variants[(attempt - 1) % variants.length];
    flog(`[STEP 7] Abriendo chat intento ${attempt}/${CHAT_RETRIES}: ${urlToOpen}`);

    await page.goto(urlToOpen, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
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

      const editor = await findEditorWithRetry(page);
      if (editor) {
        resolved = true;
        break;
      }

      await sleep(200);
    }

    if (!resolved) {
      flog('[STEP 7] Deep link no resolvio; reintento corto');
      await sleep(FALLBACK_MS);
      continue;
    }

    await waitForNetworkQuiet(page, {
      quietMs: QUIET_PRE_MS,
      timeout: PRE_SEND_TIMEOUT_MS,
    }).catch(() => {});

    await resolveUseHereModal(page).catch(() => {});
    return true;
  }

  return false;
}

async function sendMessage(page) {
  const editor = await findEditorWithRetry(page);
  if (editor) await focusEditorAtEnd(page, editor);

  try {
    await page.keyboard.press('Enter');
    flog('[STEP 7] Enviado con Enter');
    return true;
  } catch (e) {
    flog(`[STEP 7] No se pudo pulsar Enter: ${e?.message || e}`);
    return false;
  }
}

/* ========= DB / PAYLOAD ========= */
async function readPayload() {
  const arg = process.argv.find((a) => a.startsWith('--payload='));
  if (arg) {
    const b64 = arg.slice('--payload='.length);
    const txt = Buffer.from(b64, 'base64').toString('utf8');
    return JSON.parse(txt);
  }

  if (process.env.NOTIFY_ITEMS_JSON) {
    return JSON.parse(process.env.NOTIFY_ITEMS_JSON);
  }

  if (process.stdin.isTTY) return {};

  return await new Promise((resolve, reject) => {
    let data = '';
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch (e) {
          reject(e);
        }
      }
    };
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => (data += c));
    process.stdin.on('end', finish);
    process.stdin.on('error', reject);
    setTimeout(finish, 1500);
  });
}

async function fetchRowsForPlatformAndCorreo(conn, platformId, correoLower) {
  const [ccRows] = await conn.query(
    `
    SELECT
      'Cuenta completa' AS servicio,
      c.contacto AS contacto,
      u.nombre AS nombre,
      NULL AS nro_pantalla,
      DATE(c.fecha_vencimiento) AS fecha_vencimiento,
      pl.nombre AS plataforma_nombre
    FROM cuentascompletas c
    LEFT JOIN usuarios u ON u.contacto = c.contacto
    JOIN plataformas pl ON pl.id = c.plataforma_id
    WHERE c.plataforma_id = ?
      AND LOWER(TRIM(c.correo)) = ?
      AND DATE(c.fecha_vencimiento) > CURDATE()
    `,
    [platformId, correoLower]
  );

  const [pRows] = await conn.query(
    `
    SELECT
      'Pantalla' AS servicio,
      p.contacto AS contacto,
      u.nombre AS nombre,
      p.nro_pantalla AS nro_pantalla,
      DATE(p.fecha_vencimiento) AS fecha_vencimiento,
      pl.nombre AS plataforma_nombre
    FROM pantallas p
    JOIN cuentascompartidas cc ON cc.id = p.cuenta_id
    LEFT JOIN usuarios u ON u.contacto = p.contacto
    JOIN plataformas pl ON pl.id = cc.plataforma_id
    WHERE cc.plataforma_id = ?
      AND LOWER(TRIM(cc.correo)) = ?
      AND DATE(p.fecha_vencimiento) > CURDATE()
    `,
    [platformId, correoLower]
  );

  return [...ccRows, ...pRows];
}

/* ========= MENSAJES ========= */
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

function buildMessage(nombre, plataformaNombre, correo, nuevaClave, servicio, nroPantalla, fechaVencimiento) {
  const first = (nombre ? nombre.trim().split(/\s+/)[0] : null) || '!';
  const pantallaTxt = servicio === 'Pantalla' && nroPantalla ? `\n*Pantalla:* ${nroPantalla}` : '';
  const venceTxt = fechaVencimiento ? `\n*Vence:* ${fmtDateDDMMYYYY(fechaVencimiento)}` : '';
  const notaPantalla = servicio === 'Pantalla'
    ? '\n*Recuerda que solo puedes usar la pantalla asignada.*'
    : '';

  return `Hola ${first}, te notificamos el *cambio de contraseña* de *${plataformaNombre}*: *${correo}*.

*Servicio:* ${servicio}${pantallaTxt}${venceTxt}

*La nueva contraseña es:* ${nuevaClave}
No la compartas con nadie.${notaPantalla}`.trim();
}

/* ========= MAIN ========= */
(async function main() {
  flog(`LOG_FILE=${LOG_FILE}`);
  flog('== inicio notify-password-changes ==');

  let conn = null;

  try {
    const payload = await readPayload();
    const items = Array.isArray(payload?.items)
      ? payload.items
      : (payload?.correo && payload?.clave ? [payload] : []);

    flog(`[STEP 1] items recibidos: ${items.length}`);
    if (!items.length) {
      flog('[STEP 1] No hay items validos.');
      return;
    }

    const uniqueCorreos = new Set(items.map((x) => String(x.correo || '').trim().toLowerCase()).filter(Boolean));
    const uniquePlats = new Set(items.map((x) => String(x.plataforma_id || '').trim()).filter(Boolean));
    flog(`[STEP 2] Correos unicos=${uniqueCorreos.size} | plataforma_id unicos=${uniquePlats.size}`);

    conn = await mysql.createConnection(DATABASE_URL);
    flog('[STEP 3] DB: conectado');

    const tasks = [];
    let skippedPhone = 0;
    let skippedNoClave = 0;

    for (const item of items) {
      const correo = String(item?.correo || '').trim().toLowerCase();
      const clave = String(item?.clave || '').trim();
      const plataformaId = Number(item?.plataforma_id);

      if (!correo || !plataformaId) continue;
      if (!clave) {
        skippedNoClave++;
        continue;
      }

      const rows = await fetchRowsForPlatformAndCorreo(conn, plataformaId, correo);
      flog(`[STEP 3] Filas obtenidas futuras: ${rows.length}`);

      const phones = [];
      for (const r of rows) {
        const phone = toE164(r.contacto);
        if (!/^\d{8,15}$/.test(phone)) {
          skippedPhone++;
          continue;
        }

        phones.push(phone);

        tasks.push({
          phone,
          text: buildMessage(
            r.nombre,
            r.plataforma_nombre || 'Plataforma',
            correo,
            clave,
            r.servicio,
            r.nro_pantalla,
            r.fecha_vencimiento
          ),
        });
      }

      const platformName = rows[0]?.plataforma_nombre || `id=${plataformaId}`;
      flog(`[STEP 4][RESUMEN] correo=${correo} plataforma_id=${plataformaId} (${platformName}) filas=${rows.length} phones=${phones.join(',')}`);
    }

    flog(`[STEP 4] tasks=${tasks.length} skippedPhone=${skippedPhone} skippedNoClave=${skippedNoClave}`);

    if (!tasks.length) {
      flog('[STEP 5] No hay tareas. Fin.');
      return;
    }

    flog('[STEP 5] OK: hay tareas, continuamos a WA/CDP.');

    await launchBrowserScript();
    const edge = await connectToExistingEdge();
    const page = edge.page;

    await prepareWhatsApp(page);

    const gapEnv = Number(OPEN_SPACING_MS) || 12000;

    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];

      if (page.isClosed()) {
        throw new Error('La pestana de WhatsApp se cerro durante el proceso.');
      }

      flog(`[STEP 7] Enviando [${i + 1}/${tasks.length}] ${t.phone}`);

      const chatOk = await ensureChatReady(page, t.phone, encodeURIComponent(t.text));
      if (!chatOk) {
        flog(`[STEP 7] No se pudo preparar el chat de ${t.phone}; se omite.`);
      } else {
        await sendMessage(page);
      }

      if (i < tasks.length - 1) {
        flog(`[STEP 7] Pausa entre contactos: ${Math.round(gapEnv / 1000)}s...`);
        await sleep(gapEnv);
      }
    }

    flog('Notificaciones terminadas.');
    flog('Navegador dejado abierto para revision manual.');
  } catch (err) {
    flog(`Error notify-password-changes: ${err?.stack || err?.message || err}`);
    process.exitCode = 1;
  } finally {
    try { if (conn) await conn.end(); } catch {}
    flog('== fin notify-password-changes ==');
  }
})();
