// scripts/send-expiring-wa.js
require('dotenv').config();

// ================== DEPENDENCIAS ==================
const mysql = require('mysql2/promise');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');
const cron = require('node-cron');

// ================== CONFIG / ENV ==================
const {
  DATABASE_URL,
  DRY_RUN = 'false',
  OPEN_SPACING_MS = '1400',             // respaldo si no hay SEND_GAP_MS
  DEBUG_PORT = '9222',                  // Debe coincidir con el .bat
  TZ: ENV_TZ,
  CRON_SCHEDULE: ENV_CRON,
  BAT_PATH: ENV_BAT_PATH,
  RUN_NOW,

  // Nuevos controles finos
  SEND_GAP_MS: ENV_SEND_GAP_MS,
  JITTER_PCT: ENV_JITTER_PCT,
  ENSURE_CHAT_TIMEOUT_MS: ENV_ENSURE_CHAT_TIMEOUT_MS,
  POST_SEND_SLEEP_MS: ENV_POST_SEND_SLEEP_MS,

  // Login QR
  QR_WAIT_SECONDS: ENV_QR_WAIT_SECONDS,
} = process.env;

const CRON_SCHEDULE = ENV_CRON || '0 18 * * *';         // 18:00 todos los días
const APP_TZ = ENV_TZ || 'America/Bogota';

// === Ritmo y tiempos ===
const QR_WAIT_SECONDS = (() => {
  const n = Number(ENV_QR_WAIT_SECONDS);
  return Number.isFinite(n) ? Math.max(0, n) : 600;     // 10 min (0 = sin límite)
})();
const CHAT_READY_TIMEOUT_MS = (() => {
  const n = Number(ENV_ENSURE_CHAT_TIMEOUT_MS);
  return Number.isFinite(n) ? Math.max(3000, n) : 12000;
})();
const POST_SEND_SLEEP_MS = (() => {
  const n = Number(ENV_POST_SEND_SLEEP_MS);
  return Number.isFinite(n) ? Math.max(150, n) : 350;
})();
const SEND_GAP_MS = (() => {
  const n = Number(ENV_SEND_GAP_MS ?? OPEN_SPACING_MS);
  return Number.isFinite(n) ? Math.max(250, n) : 1200;  // gap promedio entre contactos
})();
const JITTER_BASE = (() => {
  const n = Number(ENV_JITTER_PCT);
  return Number.isFinite(n) ? Math.min(0.5, Math.max(0, n)) : 0.12;
})();

if (!DATABASE_URL) {
  console.error('❌ Falta DATABASE_URL en .env');
  process.exit(1);
}
if (!cron.validate(CRON_SCHEDULE)) {
  console.error(`❌ CRON inválido: ${CRON_SCHEDULE}`);
  process.exit(1);
}

// ================== Utils ==================
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const normalizePhone = (s) => String(s || '').replace(/\D/g, '');
const isE164 = (num) => /^\d{8,15}$/.test(num);

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
    return `$ ${new Intl.NumberFormat(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(num)}`;
  } catch {
    return `$ ${num.toFixed(2)}`;
  }
}

function jitter(ms, pct = 0.15) {
  const delta = Math.floor(ms * pct);
  return ms + Math.floor((Math.random() * 2 - 1) * delta);
}

// ================== SQL: expiran hoy o mañana ==================
async function fetchExpiringRows(conn) {
  const [pRows] = await conn.query(`
    SELECT
      'Pantalla' AS servicio,
      p.contacto,
      u.nombre,
      p.nro_pantalla,
      DATE(p.fecha_vencimiento) AS fecha_vencimiento,
      p.total_pagado,
      p.estado,
      cc.correo AS correo,
      cc.plataforma_id AS plataforma_id,
      pl.nombre AS plataforma_nombre
    FROM pantallas p
    LEFT JOIN usuarios u ON u.contacto = p.contacto
    LEFT JOIN cuentascompartidas cc ON cc.id = p.cuenta_id
    LEFT JOIN plataformas pl ON pl.id = cc.plataforma_id
    WHERE p.fecha_vencimiento <= DATE_ADD(CURDATE(), INTERVAL 1 DAY)
      AND (p.estado IS NULL OR p.estado <> 'CANCELADA')
  `);

  const [cRows] = await conn.query(`
    SELECT
      'Cuenta completa' AS servicio,
      c.contacto,
      u.nombre,
      NULL AS nro_pantalla,
      DATE(c.fecha_vencimiento) AS fecha_vencimiento,
      c.total_pagado,
      c.estado,
      c.correo AS correo,
      c.plataforma_id,
      pl.nombre AS plataforma_nombre
    FROM cuentascompletas c
    LEFT JOIN usuarios u ON u.contacto = c.contacto
    LEFT JOIN plataformas pl ON pl.id = c.plataforma_id
    WHERE c.fecha_vencimiento <= DATE_ADD(CURDATE(), INTERVAL 1 DAY)
      AND (c.estado IS NULL OR c.estado <> 'CANCELADA')
  `);

  return [...pRows, ...cRows];
}

// ================== Helpers DB ==================
async function yaNotificadoHoy(conn, phone) {
  const [rows] = await conn.query(
    'SELECT 1 FROM wa_notificaciones WHERE phone=? AND fecha=CURDATE() LIMIT 1',
    [phone]
  );
  return rows.length > 0;
}
async function marcarNotificado(conn, phone) {
  await conn.query(
    'INSERT IGNORE INTO wa_notificaciones (phone, fecha) VALUES (?, CURDATE())',
    [phone]
  );
}
async function logResultado(conn, phone, status, message = null) {
  await conn.query(
    'INSERT INTO wa_logs (phone, status, message) VALUES (?, ?, ?)',
    [phone, status, message]
  );
}

// ================== Redacción ==================
const BRAND = 'MED PLAY';
const NOTE_NEQUI = 'PARA PAGOS POR NEQUI SOLICITAR EL QR POR FAVOR';

function lineForItem(it) {
  const plat = (it.plataforma_nombre || '').trim() || 'tu plataforma';
  const correo = (it.correo || '').trim();
  const vence = fmtDateDDMMYYYY(it.fecha_vencimiento);
  const costo = fmtMoney(it.total_pagado);
  const pant = it.servicio === 'Pantalla' && it.nro_pantalla ? ` (pantalla ${it.nro_pantalla})` : '';
  const partes = [
    `• Tu ${plat}${pant}`,
    correo ? `, con el correo ${correo}` : '',
    `, vence el *${vence}*, quería saber si deseas *realizar la renovación*`,
    costo ? `, tiene un costo de *${costo}*.` : '.',
  ];
  return partes.join('');
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

// ================== .BAT / Edge CDP ==================
const BAT_PATH = ENV_BAT_PATH || path.resolve(
  'C:', '\\', 'Users', 'LENOVO', 'Documents', 'medplayapp', 'medplay-web', 'bat', 'start-edge-wa.bat'
);
let batProc = null;

async function startBat() {
  return new Promise((resolve, reject) => {
    console.log(`🚀 Abriendo Edge vía BAT: ${BAT_PATH}`);
    batProc = spawn('cmd.exe', ['/c', BAT_PATH], { windowsHide: true, stdio: 'ignore' });
    batProc.on('error', reject);
    setTimeout(resolve, 2000);
  });
}
function isDebuggerLive(port) {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port, path: '/json/version', timeout: 900 }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}
async function waitForDebugger(port, maxMs = 15000) {
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
async function killBat() {
  if (!batProc || batProc.killed) return;
  return new Promise((resolve) => {
    const killer = spawn('taskkill', ['/PID', String(batProc.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    killer.on('exit', () => resolve());
    killer.on('error', () => resolve());
  });
}

// ================== Conexión CDP ==================
async function getAttachedContext() {
  const ep = `http://127.0.0.1:${DEBUG_PORT}`;
  const browser = await chromium.connectOverCDP(ep);
  const ctxs = browser.contexts();
  return ctxs[0] || await browser.newContext();
}

// ================== Login rápido (sin esperar “cargar chats”) ==================
async function waitForWhatsAppReady(page, { qrWaitSeconds = QR_WAIT_SECONDS } = {}) {
  await page.goto('https://web.whatsapp.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  const chatListSel = '[data-testid="chat-list"]';
  const qrSel = 'canvas[aria-label*="QR"], canvas[aria-label*="Scan"], [data-testid="qrcode"]';

  if (await page.locator(qrSel).first().isVisible().catch(() => false)) {
    console.log(`🔐 WhatsApp requiere autenticación. Tienes hasta ${qrWaitSeconds}s para escanear el QR...`);
    const t0 = Date.now();
    let lastShown = -1;
    while (true) {
      const elapsed = Math.floor((Date.now() - t0) / 1000);
      const left = Math.max(0, qrWaitSeconds - elapsed);
      if (qrWaitSeconds === 0) {
        if (elapsed !== lastShown && elapsed % 30 === 0) {
          process.stdout.write(`  ⏳ esperando login... (sin límite)   \r`);
          lastShown = elapsed;
        }
      } else if (elapsed !== lastShown && elapsed % 5 === 0) {
        process.stdout.write(`  ⏳ esperando login... ${left}s   \r`);
        lastShown = elapsed;
      }
      const stillQR = await page.locator(qrSel).first().isVisible().catch(() => false);
      const hasList = await page.locator(chatListSel).first().isVisible().catch(() => false);
      if (!stillQR && hasList) { console.log('\n🔓 Sesión de WhatsApp autenticada.'); break; }
      if (qrWaitSeconds > 0 && elapsed >= qrWaitSeconds) { console.log('\n'); throw new Error('No se escaneó el QR a tiempo.'); }
      await page.waitForTimeout(1000);
    }
  }
  return true;
}

// ================== Envío (rápido, con jitter) ==================
async function ensureChatReady(page, { timeout = CHAT_READY_TIMEOUT_MS } = {}) {
  const headerSel = '[data-testid="conversation-info-header"], header[data-testid="conversation-header"]';
  const editorSelectors = [
    '[data-testid="conversation-compose-box-input"] div[contenteditable="true"]',
    'div[role="textbox"][contenteditable="true"]',
    'div[contenteditable="true"][data-tab]',
  ];
  await page.waitForSelector(headerSel, { timeout }).catch(() => {});
  const start = Date.now();
  while (Date.now() - start < timeout) {
    for (const sel of editorSelectors) {
      const el = page.locator(sel).last();
      try { if ((await el.count()) > 0 && await el.isVisible()) return el; } catch {}
    }
    await page.waitForTimeout(200);
  }
  throw new Error('No se encontró el editor de mensaje en el chat.');
}

async function typeAndSend(page, text) {
  const editor = await ensureChatReady(page);
  await editor.click({ delay: 40 });
  try { await editor.press('ControlOrMeta+A'); await editor.press('Backspace'); } catch {}
  await page.keyboard.insertText(text);
  const sendBtn = page.locator('[data-testid="compose-btn-send"], [aria-label="Enviar"], [data-icon="send"]').first();
  try { (await sendBtn.count()) > 0 ? await sendBtn.click({ delay: 40 }) : await page.keyboard.press('Enter'); }
  catch { await page.keyboard.press('Enter'); }
  await page.waitForTimeout(POST_SEND_SLEEP_MS);
}

async function openViaWALink(page, phone, text) {
  const fallback = `https://wa.me/${encodeURIComponent(phone)}?text=${encodeURIComponent(text)}`;
  await page.goto(fallback, { waitUntil: 'domcontentloaded', timeout: 30000 });
  const actionBtn = page.locator('#action-button');
  if (await actionBtn.isVisible().catch(() => false)) await actionBtn.click();
  const useWeb = page.locator('a[href*="web.whatsapp.com"], a:has-text("WhatsApp Web")');
  if (await useWeb.isVisible().catch(() => false)) {
    await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {}), useWeb.click()]);
  }
  await ensureChatReady(page);
  await typeAndSend(page, text);
}

async function sendViaWhatsApp(page, { phone, text }) {
  const deepLink = `https://web.whatsapp.com/send?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await page.goto(deepLink, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await ensureChatReady(page);
      await typeAndSend(page, text);
      return 'OK';
    } catch (err) {
      console.warn(`   ⚠️ intento ${attempt} falló para ${phone}: ${err?.message || err}`);
      if (attempt === 3) {
        try { await openViaWALink(page, phone, text); return 'OK'; }
        catch (e2) { console.warn(`   🔁 Fallback también falló: ${e2?.message || e2}`); return 'FALLBACK'; }
      }
      await sleep(800);
    }
  }
}

// ================== MAIN RUN ==================
let conn; let page; let context;

async function runOnce() {
  conn = await mysql.createConnection(DATABASE_URL);
  try {
    const rows = await fetchExpiringRows(conn);
    const recipients = groupByPhone(rows);

    if (!recipients.length) {
      console.log('✅ No hay contactos por notificar.');
      return;
    }

    console.log(`📨 Enviaré ${recipients.length} mensaje(s).`);
    if (DRY_RUN === 'true') {
      for (const r of recipients) {
        const url = `https://wa.me/${encodeURIComponent(r.phone)}?text=${encodeURIComponent(r.text)}`;
        console.log(`\n[DRY] ${r.phone}\n${r.text}\nURL: ${url}\n`);
      }
      return;
    }

    await startBat();
    const ok = await waitForDebugger(Number(DEBUG_PORT), 15000);
    if (!ok) throw new Error(`No se detectó CDP en 127.0.0.1:${DEBUG_PORT}. Verifica el .bat.`);
    context = await getAttachedContext();
    page = await context.newPage();

    console.log('🟡 Verificando sesión de WhatsApp…');
    await waitForWhatsAppReady(page);
    console.log('🟢 WhatsApp listo para enviar.');
    console.log(`⚙️ Ritmo: gap base=${SEND_GAP_MS}ms, jitter=${Math.round(JITTER_BASE*100)}%, post-send=${POST_SEND_SLEEP_MS}ms, chat-timeout=${CHAT_READY_TIMEOUT_MS}ms`);

    let enviados = 0;
    for (let i = 0; i < recipients.length; i++) {
      const r = recipients[i];
      if (await yaNotificadoHoy(conn, r.phone)) {
        console.log(`  ⏭️  Ya notificado hoy: ${r.phone}, salto.`);
        continue;
      }
      console.log(`  → [${i + 1}/${recipients.length}] ${r.phone}`);
      try {
        const status = await sendViaWhatsApp(page, r);
        await logResultado(conn, r.phone, status, null);
        if (status === 'OK') { await marcarNotificado(conn, r.phone); enviados++; }
      } catch (err) {
        console.error(`  ✖ Error con ${r.phone}:`, err?.message || err);
        await logResultado(conn, r.phone, 'ERROR', err?.message || String(err));
      }
      const wait = jitter(SEND_GAP_MS, JITTER_BASE);
      console.log(`    ⏳ Esperando ${wait} ms antes del próximo...`);
      await sleep(wait);
    }

    console.log(`\n✅ Listo. Mensajes enviados: ${enviados}`);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exitCode = 1;
  } finally {
    try { if (page) await page.close(); } catch {}
    try { await killEdge(); } catch {}
    try { await killBat(); } catch {}
    try { if (conn) await conn.end(); } catch {}
  }
}

// ================== SCHEDULER ==================
let isRunning = false;
async function safeRun() {
  if (isRunning) { console.log('⏭️ Ya hay una ejecución en curso.'); return; }
  isRunning = true;
  const startAt = new Date();
  console.log(`⏱️ Iniciando runOnce() a las ${startAt.toLocaleString('es-CO', { timeZone: APP_TZ })}`);
  try { await runOnce(); }
  catch (err) { console.error('❌ Error en runOnce:', err?.message || err); process.exitCode = 1; }
  finally {
    isRunning = false;
    const endAt = new Date();
    console.log(`✅ Finalizó runOnce() a las ${endAt.toLocaleString('es-CO', { timeZone: APP_TZ })}`);
  }
}

console.log(`⏳ Tarea programada: ${CRON_SCHEDULE} (${APP_TZ}).`);
console.log(`🕒 Ahora (${APP_TZ}):`, new Date().toLocaleString('es-CO', { timeZone: APP_TZ }));
console.log(`🔐 Espera máxima QR: ${QR_WAIT_SECONDS}s`);

cron.schedule(CRON_SCHEDULE, () => {
  const firedAt = new Date();
  console.log(`🚨 Disparo cron a las ${firedAt.toLocaleString('es-CO', { timeZone: APP_TZ })} (${APP_TZ})`);
  safeRun();
}, { timezone: APP_TZ });

// Ejecutar inmediato: node scripts/send-expiring-wa.js --now
if (process.argv.includes('--now') || RUN_NOW === 'true') {
  console.log('▶️  RUN_NOW: ejecutando inmediatamente...');
  safeRun();
}

// ================== Salida elegante ==================
process.on('SIGINT', async () => {
  console.log('\n🛑 SIGINT recibido. Cerrando recursos…');
  try { if (page) await page.close(); } catch {}
  try { await killEdge(); } catch {}
  try { await killBat(); } catch {}
  try { if (conn) await conn.end(); } catch {}
  process.exit(130);
});
process.on('SIGTERM', async () => {
  console.log('\n🛑 SIGTERM recibido. Cerrando recursos…');
  try { if (page) await page.close(); } catch {}
  try { await killEdge(); } catch {}
  try { await killBat(); } catch {}
  try { if (conn) await conn.end(); } catch {}
  process.exit(143);
});
