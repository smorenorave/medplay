/* scripts/notify-password-changes.js
 * Notifica por WhatsApp Web cambios de contraseña a clientes,
 * abriendo Edge con CDP (via .bat) y consultando MySQL para armar mensajes.
 *
 * EJECUCIÓN RECOMENDADA (desde tu route):
 *   spawn(process.execPath, [scriptPath, `--payload=${base64(JSON)}`], { detached:true, stdio:'ignore' })
 *
 * El payload (JSON) esperado:
 *   { "items": [ { "correo": "email@dominio.com", "nuevaClave": "Clave123" }, ... ] }
 *
 * Reglas:
 *  - Enviar a TODOS los contactos asociados al/los correo(s) del payload.
 *  - NO depende de wa_notificaciones.
 *  - NO enviar si la fecha de vencimiento es HOY o en el pasado.
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
  (process.platform === 'win32'
    ? `${process.env.LOCALAPPDATA}\\MedPlay\\logs`
    : `${os.homedir()}/.medplay/logs`);

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
  OPEN_SPACING_MS = '8000',
  WA_BAT_PATH, // opcional
} = process.env;

// Path por defecto al .bat (ajústalo si es distinto)
const BAT_PATH =
  WA_BAT_PATH ||
  'C:\\Users\\LENOVO\\Documents\\medplayapp\\medplay-web\\bat\\start-edge-wa.bat';

if (!DATABASE_URL) {
  flog('❌ Falta DATABASE_URL en .env');
  console.error('❌ Falta DATABASE_URL en .env');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ========= Helpers: lectura del payload ========= */
async function readPayload() {
  // 1) --payload=<base64>
  const arg = process.argv.find((a) => a.startsWith('--payload='));
  if (arg) {
    const b64 = arg.split('=')[1] || '';
    const txt = Buffer.from(b64, 'base64').toString('utf8');
    return JSON.parse(txt);
  }

  // 2) ENV opcional
  if (process.env.NOTIFY_ITEMS_JSON) {
    return JSON.parse(process.env.NOTIFY_ITEMS_JSON);
  }

  // 3) STDIN con timeout
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

async function killEdge() {
  return new Promise((resolve) => {
    const killer = spawn('taskkill', ['/F', '/IM', 'msedge.exe'], { windowsHide: true, stdio: 'ignore' });
    killer.on('exit', () => resolve());
    killer.on('error', () => resolve());
  });
}

/* ========= Abrir BAT ========= */
async function startBatOnce() {
  return new Promise((resolve, reject) => {
    try {
      const child = spawn('cmd.exe', ['/c', BAT_PATH], { windowsHide: true, stdio: 'ignore' });
      child.on('error', reject);
      setTimeout(resolve, 1200); // margen antes de esperar CDP
    } catch (e) {
      reject(e);
    }
  });
}

/* ========= DB ========= */
/** Case-insensitive por LOWER(correo); excluye vencidos y que vencen HOY */
async function fetchByCorreos(conn, correos = []) {
  if (!correos.length) return [];
  const inPlace = correos.map(() => '?').join(',');

  // Pantallas
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
    LEFT JOIN usuarios u ON u.contacto = p.contacto
    LEFT JOIN cuentascompartidas cc ON cc.id = p.cuenta_id
    LEFT JOIN plataformas pl ON pl.id = cc.plataforma_id
    WHERE LOWER(cc.correo) IN (${inPlace})
      AND (p.estado IS NULL OR p.estado <> 'CANCELADA')
      AND DATE(p.fecha_vencimiento) > CURDATE()
    `,
    correos
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
      pl.nombre AS plataforma_nombre,
      c.correo AS correo
    FROM cuentascompletas c
    LEFT JOIN usuarios u ON u.contacto = c.contacto
    LEFT JOIN plataformas pl ON pl.id = c.plataforma_id
    WHERE LOWER(c.correo) IN (${inPlace})
      AND (c.estado IS NULL OR c.estado <> 'CANCELADA')
      AND DATE(c.fecha_vencimiento) > CURDATE()
    `,
    correos
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
      const base = `• ${it.plataforma_nombre || 'tu plataforma'} — ${it.servicio}`;
      const extra = it.servicio === 'Pantalla' && it.nro_pantalla ? ` | *Pantalla ${it.nro_pantalla}*` : '';
      const vence = it.fecha_vencimiento ? ` | vence: ${fmtDateDDMMYYYY(it.fecha_vencimiento)}` : '';
      return `${base}${extra}${vence}`;
    })
    .join('\n');

  const notaPantalla = items.some((it) => it.servicio === 'Pantalla')
    ? '\n*Recuerda tu pantalla es la que ves arriba; solo puedes utilizar esa.*'
    : '';

  const tips = `
NOTA:*NO MODIFICAR LOS NUMEROS DEL PERFIL, USAR UNICAMENTE EL QUE SE LE ASIGNO SIN CAMBIARLO*
PARA EVITAR CODIGOS DEBES BORRAR HISTORIAL Y COOKIES ---->    
EN CELULAR: https://www.youtube.com/watch?v=rEsApVI1-lk
EN EL COMPUTADOR: https://www.youtube.com/watch?v=2pYn4px0YWI`;

  return `Hola ${first}, te notificamos el *cambio de contraseña* asociado a tu correo: *${correo}*.

${bullets}

*La nueva contraseña es:* ${nuevaClave}.
No la compartas con nadie; ¡que estés súper bien!${notaPantalla}

${tips}`.trim();
}

/* ========= Enviar y confirmar envío ========= */
async function waitSentBubble(page, prevCount, timeoutMs = 10000) {
  const selectors = [
    'div.message-out',
    'div._amk9.selectable-text',
    'div[data-testid="msg-out"]',
  ];

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    for (const sel of selectors) {
      try {
        const cur = await page.locator(sel).count();
        if (cur > prevCount) return true;
      } catch {}
    }
    await sleep(250);
  }
  return false;
}

async function sendViaWhatsApp(page, phone, text, spacingMs) {
  const url = `https://web.whatsapp.com/send?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Esperar editor listo
      await page.waitForSelector('div[role="textbox"][contenteditable="true"]', { timeout: 60000 });
      const editor = page.locator('div[role="textbox"][contenteditable="true"]').last();

      // Conteo previo
      let prevCount = 0;
      try { prevCount = await page.locator('div.message-out').count(); } catch {}

      // Escribir + enviar
      await editor.click({ delay: 60 });
      await editor.press('ControlOrMeta+A');
      await editor.press('Backspace');
      await page.keyboard.insertText(text);
      await page.keyboard.press('Enter');

      // Confirmar burbuja
      const sent = await waitSentBubble(page, prevCount, 10000);
      if (!sent) {
        try { await page.waitForLoadState('networkidle', { timeout: 3000 }); } catch {}
        await sleep(2500);
      }

      // Pausa entre mensajes
      const gap = Math.max(500, Number(spacingMs) || 8000);
      await sleep(gap);

      return true;
    } catch (e) {
      flog(`sendViaWhatsApp intento ${attempt} falló (${phone}): ${e?.message || e}`);
      if (attempt === 3) return false;
      await sleep(1500);
    }
  }
}

/* ========= MAIN ========= */
(async function main() {
  flog('== inicio notify-password-changes ==');
  let browser = null;
  let page = null;
  let conn = null;
  let attemptedAny = false;

  try {
    // 1) Payload
    const parsed = await readPayload();
    const items = Array.isArray(parsed?.items) ? parsed.items : [];
    flog(`items recibidos: ${items.length}`);
    if (!items.length) { console.log('No hay items para notificar'); return; }

    // 2) Edge con CDP
    flog(`BAT_PATH=${BAT_PATH}`);
    await startBatOnce();

    flog(`Esperando CDP en 127.0.0.1:${DEBUG_PORT}...`);
    const ok = await waitForDebugger(Number(DEBUG_PORT), 25000);
    flog(`CDP ok: ${ok}`);
    if (!ok) throw new Error(`No se detectó CDP en 127.0.0.1:${DEBUG_PORT}`);

    flog('Conectando a Edge vía CDP...');
    const cdpUrl = `http://127.0.0.1:${DEBUG_PORT}`;
    const cdpBrowser = await chromium.connectOverCDP(cdpUrl);
    const context = cdpBrowser.contexts()[0] || (await cdpBrowser.newContext());
    browser = cdpBrowser;
    page = await context.newPage();
    flog('CDP conectado.');

    // 3) DB y agrupación
    conn = await mysql.createConnection(DATABASE_URL);
    flog('DB: conectado');

    const normCorreo = (v) => String(v || '').trim().toLowerCase();

    // Mapa: última clave por correo (payload manda la definitiva)
    const lastByCorreo = new Map();
    for (const it of items) {
      const correo = normCorreo(it.correo);
      const nuevaClave = String(it.nuevaClave || '').trim();
      if (!correo || !nuevaClave) continue;
      lastByCorreo.set(correo, nuevaClave);
    }

    const correos = Array.from(lastByCorreo.keys());
    flog(`Correos a consultar (lower): ${correos.length}`);
    if (correos.length === 0) { flog('Sin correos válidos; saliendo.'); return; }

    // Importante: enviar los correos ya normalizados (lower)
    let rows = [];
    try {
      rows = await fetchByCorreos(conn, correos);
      flog(`Filas desde fetchByCorreos (futuras): ${rows.length}`);
    } catch (e) {
      flog(`Error fetchByCorreos: ${e?.message || e}`);
      throw e;
    }

    // Agrupar por (phone + correo) con dedup
    const grouped = new Map(); // key = `${phone}::${correo}`
    const itemKey = (it) =>
      [
        it.servicio ?? '',
        it.plataforma_nombre ?? '',
        it.nro_pantalla ?? '',
        it.fecha_vencimiento ?? '',
      ].join('|');

    let skippedPhone = 0, skippedNoClave = 0;

    for (const r of rows) {
      const phone = toE164(r.contacto);
      if (!/^\d{8,15}$/.test(phone)) { skippedPhone++; continue; }

      const correoL = normCorreo(r.correo);
      const nuevaClave = lastByCorreo.get(correoL);
      if (!nuevaClave) { skippedNoClave++; continue; }

      const key = `${phone}::${correoL}`;
      const cur =
        grouped.get(key) || {
          phone, correo: correoL, nuevaClave,
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
      grouped.set(key, cur);
    }

    flog(`grouped.size=${grouped.size} skippedPhone=${skippedPhone} skippedNoClave=${skippedNoClave}`);

    const recipients = Array.from(grouped.values())
      .map((r) => { delete r._kset; return r; })
      .sort((a, b) => a.phone.localeCompare(b.phone) || a.correo.localeCompare(b.correo));

    if (recipients.length === 0) {
      flog('No hay recipients; saliendo (revisa filtros de fecha y estado).');
      console.log('No hay destinatarios (verifica fechas futuras, correos y teléfonos).');
      return;
    }

    flog(`Recipients: ${recipients.length}`);
    console.log(`Notificando ${recipients.length} mensaje(s) (agrupado por teléfono+correo)…`);

    // 4) Enviar
    const gapEnv = Number(OPEN_SPACING_MS) || 8000;
    flog(`gapEnv=${gapEnv}`);

    for (let i = 0; i < recipients.length; i++) {
      const r = recipients[i];

      if (!Array.isArray(r.items) || r.items.length === 0) {
        flog(`Skip sin items -> ${r.phone} | ${r.correo}`);
        continue;
      }

      const text = buildMessage(r.nombre, r.items, r.correo, r.nuevaClave);
      flog(`Enviando [${i + 1}/${recipients.length}] ${r.phone} | ${r.correo} items=${r.items.length}`);
      attemptedAny = true;

      try {
        const okSend = await sendViaWhatsApp(page, r.phone, text, gapEnv);
        flog(`${okSend ? 'OK' : 'FAIL(sentFlag)'} ${r.phone} | ${r.correo}`);
      } catch (e) {
        flog(`FAIL ${r.phone} | ${r.correo}: ${e?.message || e}`);
      }
    }

    flog('✅ Notificaciones terminadas.');
  } catch (err) {
    flog(`❌ Error notify-password-changes: ${err?.stack || err?.message || err}`);
    process.exitCode = 1;
  } finally {
    try { if (page) await page.close(); } catch {}
    try { if (browser) await browser.close(); } catch {}
    try { if (conn) await conn.end(); } catch {}

    try {
      if (attemptedAny) {
        await killEdge();
        flog('Edge cerrado.');
      } else {
        flog('No se intentó enviar; Edge queda abierto para depurar.');
      }
    } catch {}
  }
})();
