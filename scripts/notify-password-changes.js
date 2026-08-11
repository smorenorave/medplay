#!/usr/bin/env node
'use strict';

const path = require('path');
require('dotenv').config({
  path: path.resolve(__dirname, '../.env')
});

const mysql = require('mysql2/promise');
const http = require('http');
const { spawn } = require('child_process');
const { chromium } = require('playwright');
const fs = require('fs');

/* =========================================================
 * CONFIG
 * ========================================================= */

const ROOT_DIR = path.resolve(__dirname, '..');

const LOG_DIR = path.join(ROOT_DIR, '.logs');

try {
  fs.mkdirSync(LOG_DIR, { recursive: true });
} catch {}

const LOG_FILE = path.join(
  LOG_DIR,
  'notify-password-changes.log'
);

function flog(...args) {
  const line =
    `[${new Date().toISOString()}] ${args.join(' ')}\n`;

  try {
    fs.appendFileSync(LOG_FILE, line);
  } catch {}

  console.log(...args);
}

const {
  DATABASE_URL,
  DEBUG_PORT = '9222',
  OPEN_SPACING_MS = '12000',
  START_SCRIPT = './scripts/start-edge-wa.bat',
} = process.env;

if (!DATABASE_URL) {
  flog('❌ Falta DATABASE_URL en .env');
  process.exit(1);
}

const START_SCRIPT_RESOLVED =
  path.resolve(ROOT_DIR, START_SCRIPT);

const IS_WIN =
  process.platform === 'win32';

const sleep =
  (ms) =>
    new Promise(resolve => setTimeout(resolve, ms));

const rand =
  (min, max) =>
    Math.floor(
      Math.random() * (max - min + 1)
    ) + min;


/* =========================================================
 * LOCK
 * ========================================================= */

const LOCK_FILE =
  path.join(
    LOG_DIR,
    'notify-password-changes.lock'
  );

const LOCK_STALE_MS =
  15 * 60 * 1000;


function acquireLock() {

  try {

    if (
      fs.existsSync(
        LOCK_FILE
      )
    ) {

      const age =
        Date.now() -
        fs.statSync(
          LOCK_FILE
        ).mtimeMs;


      if (
        age < LOCK_STALE_MS
      ) {

        flog(
          '⛔ Ya existe otra ejecución de notify-password-changes.'
        );

        return false;
      }


      flog(
        `⚠️ Lock viejo encontrado (${Math.round(age / 1000)}s). Se libera.`
      );


      try {
        fs.unlinkSync(
          LOCK_FILE
        );
      } catch {}
    }


    fs.writeFileSync(
      LOCK_FILE,
      String(process.pid)
    );


    return true;

  } catch (err) {

    flog(
      `⚠️ No se pudo gestionar lock: ${err?.message || err}`
    );

    return true;
  }
}


function releaseLock() {

  try {
    fs.unlinkSync(
      LOCK_FILE
    );
  } catch {}
}


/* =========================================================
 * TIEMPOS
 * ========================================================= */

const EDITOR_RETRIES =
  40;

const EDITOR_POLL_MS =
  250;

const PRE_SEND_TIMEOUT_MS =
  45000;

const QUIET_PRE_MS =
  1200;

const CHAT_RETRIES =
  3;

const FALLBACK_MS =
  20000;


/*
 * IMPORTANTE:
 *
 * Espera adicional después de que WhatsApp
 * ya fue detectado como "listo".
 */
const INITIAL_SYNC_WAIT_MS =
  45000;


/*
 * Número máximo de intentos para conseguir
 * o crear una pestaña en Edge.
 */
const EDGE_PAGE_CREATE_RETRIES =
  10;


/* =========================================================
 * CDP
 * ========================================================= */

function isDebuggerLive(
  port
) {

  return new Promise(
    resolve => {

      const req =
        http.get(
          {
            host:
              '127.0.0.1',

            port,

            path:
              '/json/version',

            timeout:
              1000
          },

          res => {

            resolve(
              res.statusCode === 200
            );
          }
        );


      req.on(
        'error',
        () => resolve(false)
      );


      req.on(
        'timeout',
        () => {

          try {
            req.destroy();
          } catch {}

          resolve(false);
        }
      );
    }
  );
}


async function waitForDebugger(
  port,
  maxMs = 30000
) {

  const start =
    Date.now();


  while (
    Date.now() - start <
    maxMs
  ) {

    if (
      await isDebuggerLive(
        port
      )
    ) {

      return true;
    }


    await sleep(500);
  }


  return false;
}


/* =========================================================
 * ARRANCAR EDGE
 * ========================================================= */

async function launchBrowserScript() {

  flog(
    `[STEP 6.1] START_SCRIPT=${START_SCRIPT_RESOLVED}`
  );


  if (
    !fs.existsSync(
      START_SCRIPT_RESOLVED
    )
  ) {

    throw new Error(
      `No existe el script de arranque: ${START_SCRIPT_RESOLVED}`
    );
  }


  flog(
    '[STEP 6.1] Lanzando start-edge-wa.bat…'
  );


  const child =
    IS_WIN

      ? spawn(
          'cmd.exe',
          [
            '/c',
            START_SCRIPT_RESOLVED
          ],
          {
            stdio:
              'ignore',

            env:
              process.env,

            cwd:
              path.dirname(
                START_SCRIPT_RESOLVED
              ),

            detached:
              true
          }
        )

      : spawn(
          'bash',
          [
            '-lc',
            START_SCRIPT_RESOLVED
          ],
          {
            stdio:
              'ignore',

            env:
              process.env,

            cwd:
              path.dirname(
                START_SCRIPT_RESOLVED
              ),

            detached:
              true
          }
        );


  child.on(
    'error',
    err => {

      flog(
        `❌ Error lanzando navegador: ${err?.message || err}`
      );
    }
  );


  child.unref();


  await sleep(
    1500
  );
}


/* =========================================================
 * BUSCAR PESTAÑA
 * ========================================================= */

function getExistingPage(
  browser
) {

  const contexts =
    browser.contexts();


  if (
    !contexts.length
  ) {

    throw new Error(
      'CDP respondió, pero Edge no expuso ningún contexto.'
    );
  }


  for (
    const ctx of contexts
  ) {

    const pages =
      ctx
        .pages()
        .filter(
          page =>
            !page.isClosed()
        );


    if (
      pages.length
    ) {

      /*
       * Preferimos WhatsApp si ya existe.
       */

      const whatsapp =
        pages.find(
          page =>
            /web\.whatsapp\.com/i
              .test(
                page.url()
              )
        );


      return {
        ctx,
        page:
          whatsapp ||
          pages[0]
      };
    }
  }


  throw new Error(
    'CDP respondió, pero no hay pestañas disponibles en Edge.'
  );
}


/* =========================================================
 * ESPERAR PESTAÑA
 * ========================================================= */

async function getExistingPageWithRetry(
  browser,
  maxMs = 20000,
  intervalMs = 500
) {

  const start =
    Date.now();


  let lastErr;


  while (
    Date.now() - start <
    maxMs
  ) {

    try {

      return getExistingPage(
        browser
      );

    } catch (err) {

      lastErr =
        err;

      await sleep(
        intervalMs
      );
    }
  }


  throw (
    lastErr ||
    new Error(
      'CDP respondió, pero Edge nunca expuso una pestaña.'
    )
  );
}


/* =========================================================
 * CONEXIÓN EDGE + CREAR PESTAÑA
 * ========================================================= */

async function connectToExistingEdge() {

  flog(
    `[STEP 6.2] Esperando CDP en 127.0.0.1:${DEBUG_PORT}…`
  );


  const ok =
    await waitForDebugger(
      Number(
        DEBUG_PORT
      ),
      30000
    );


  flog(
    `[STEP 6.2] CDP ok: ${ok}`
  );


  if (!ok) {

    throw new Error(
      `No se detectó CDP en 127.0.0.1:${DEBUG_PORT}`
    );
  }


  const browser =
    await chromium.connectOverCDP(
      `http://127.0.0.1:${Number(DEBUG_PORT)}`,
      {
        timeout:
          20000
      }
    );


  /*
   * CDP puede estar activo aunque Edge
   * todavía no tenga una pestaña.
   *
   * Por eso:
   *
   * 1. Buscamos contexto.
   * 2. Buscamos pestaña.
   * 3. Si no existe pestaña, la creamos.
   */

  for (
    let attempt = 1;
    attempt <=
      EDGE_PAGE_CREATE_RETRIES;
    attempt++
  ) {

    try {

      const contexts =
        browser.contexts();


      if (
        !contexts.length
      ) {

        flog(
          `[STEP 6.2] ⏳ Sin contexto CDP todavía (${attempt}/${EDGE_PAGE_CREATE_RETRIES})…`
        );


        await sleep(
          1000
        );


        continue;
      }


      /*
       * Buscar una pestaña existente.
       */

      for (
        const ctx of contexts
      ) {

        const pages =
          ctx
            .pages()
            .filter(
              page =>
                !page.isClosed()
            );


        if (
          pages.length
        ) {

          const whatsapp =
            pages.find(
              page =>
                /web\.whatsapp\.com/i
                  .test(
                    page.url()
                  )
            );


          const page =
            whatsapp ||
            pages[0];


          flog(
            `[STEP 6.2] ✅ Pestaña encontrada: ${page.url() || 'about:blank'}`
          );


          return {
            browser,
            page
          };
        }
      }


      /*
       * NO hay pestaña.
       *
       * Creamos una nosotros.
       */

      const ctx =
        contexts[0];


      const page =
        await ctx.newPage();


      flog(
        '[STEP 6.2] ✅ Edge no tenía pestaña; se creó una nueva pestaña CDP.'
      );


      return {
        browser,
        page
      };


    } catch (err) {

      flog(
        `[STEP 6.2] ⚠️ Esperando/creando pestaña (${attempt}/${EDGE_PAGE_CREATE_RETRIES}): ${err?.message || err}`
      );


      await sleep(
        1000
      );
    }
  }


  throw new Error(
    'CDP respondió, pero no fue posible obtener ni crear una pestaña en Edge.'
  );
}


/* =========================================================
 * MODAL USAR AQUÍ
 * ========================================================= */

async function resolveUseHereModal(
  page
) {

  const selectors = [

    'button:has-text("Usar aquí")',

    '[role="button"]:has-text("Usar aquí")',

    'div[role="button"]:has-text("Usar aquí")',

    'button:has-text("Use here")',

    '[role="button"]:has-text("Use here")',

    'div[role="button"]:has-text("Use here")'
  ];


  for (
    const sel of selectors
  ) {

    try {

      const btn =
        page
          .locator(sel)
          .first();


      const count =
        await btn
          .count()
          .catch(
            () => 0
          );


      if (
        count > 0
      ) {

        await btn
          .click({
            timeout:
              3000
          })
          .catch(
            () => {}
          );


        flog(
          '✅ Modal resuelto: clic en "Usar aquí".'
        );


        await sleep(
          3000
        );


        return true;
      }

    } catch {}
  }


  return false;
}


/* =========================================================
 * NETWORK QUIET
 * ========================================================= */

async function waitForNetworkQuiet(
  page,
  {
    quietMs = 1500,
    timeout = 20000
  } = {}
) {

  const client =
    await page
      .context()
      .newCDPSession(
        page
      );


  await client.send(
    'Network.enable'
  );


  let lastActivity =
    Date.now();


  const bump =
    () => {

      lastActivity =
        Date.now();
    };


  const handlers = {

    requestWillBeSent:
      bump,

    responseReceived:
      bump,

    loadingFinished:
      bump,

    loadingFailed:
      bump,

    webSocketCreated:
      bump,

    webSocketFrameReceived:
      bump,

    webSocketFrameSent:
      bump,

    webSocketClosed:
      bump
  };


  for (
    const [
      ev,
      fn
    ]
      of Object.entries(
        handlers
      )
  ) {

    client.on(
      `Network.${ev}`,
      fn
    );
  }


  const start =
    Date.now();


  try {

    while (
      Date.now() - start <
      timeout
    ) {

      if (
        Date.now() -
          lastActivity >=
        quietMs
      ) {

        return true;
      }


      await sleep(
        100
      );
    }


    return false;

  } finally {

    for (
      const [
        ev,
        fn
      ]
        of Object.entries(
          handlers
        )
    ) {

      client.off(
        `Network.${ev}`,
        fn
      );
    }


    try {
      await client.detach();
    } catch {}
  }
}


/* =========================================================
 * WHATSAPP READY
 * ========================================================= */

async function waitForWhatsAppReady(
  page,
  {
    timeout = 60000,
    quietMs = 1500,
    requireWsTraffic = false
  } = {}
) {

  const ctx =
    page.context();


  const client =
    await ctx.newCDPSession(
      page
    );


  await client.send(
    'Network.enable'
  );


  let wsOpen =
    false;

  let wsFrames =
    0;

  let hasWASW =
    false;


  client.on(
    'Network.webSocketCreated',
    ev => {

      if (
        String(
          ev.url || ''
        ).includes(
          'web.whatsapp.com'
        )
      ) {

        wsOpen =
          true;
      }
    }
  );


  client.on(
    'Network.webSocketFrameReceived',
    () => {

      if (wsOpen) {
        wsFrames++;
      }
    }
  );


  client.on(
    'Network.webSocketFrameSent',
    () => {

      if (wsOpen) {
        wsFrames++;
      }
    }
  );


  ctx.on(
    'serviceworker',
    sw => {

      if (
        String(
          sw.url || ''
        ).startsWith(
          'https://web.whatsapp.com/'
        )
      ) {

        hasWASW =
          true;
      }
    }
  );


  const t0 =
    Date.now();


  try {

    await page
      .waitForLoadState(
        'domcontentloaded',
        {
          timeout:
            30000
        }
      )
      .catch(
        () => {}
      );


    await page
      .waitForLoadState(
        'load',
        {
          timeout:
            30000
        }
      )
      .catch(
        () => {}
      );


    while (
      Date.now() - t0 <
      timeout
    ) {

      await resolveUseHereModal(
        page
      ).catch(
        () => {}
      );


      if (
        hasWASW ||
        wsOpen
      ) {

        const quietOk =
          await waitForNetworkQuiet(
            page,
            {
              quietMs,
              timeout:
                4000
            }
          );


        if (
          quietOk &&
          (
            !requireWsTraffic ||
            wsFrames > 0
          )
        ) {

          return true;
        }
      }


      await sleep(
        200
      );
    }


    return false;

  } finally {

    try {
      await client.detach();
    } catch {}
  }
}


/* =========================================================
 * SERVICE WORKER
 * ========================================================= */

async function waitForSWControlled(
  page,
  timeout = 20000
) {

  const t0 =
    Date.now();


  while (
    Date.now() - t0 <
    timeout
  ) {

    try {

      const controlled =
        await page.evaluate(
          () =>
            !!(
              navigator.serviceWorker &&
              navigator.serviceWorker.controller
            )
        );


      if (
        controlled
      ) {

        return true;
      }

    } catch {}


    await sleep(
      200
    );
  }


  return false;
}


/* =========================================================
 * PAGE ACTIVA
 * ========================================================= */

async function resolveActivePage(
  browser,
  previousPage
) {

  if (
    previousPage &&
    !previousPage.isClosed()
  ) {

    try {

      await previousPage.evaluate(
        () => true
      );


      return previousPage;

    } catch {

      flog(
        '⚠️ La página perdió su contexto; buscando nuevamente la pestaña activa…'
      );
    }
  }


  const result =
    await getExistingPageWithRetry(
      browser,
      15000,
      500
    );


  return result.page;
}


/* =========================================================
 * PREPARAR WHATSAPP
 * ========================================================= */

async function prepareWhatsApp(
  browser,
  page
) {

  flog(
    '[STEP 6.3] Preparando WhatsApp Web…'
  );


  page =
    await resolveActivePage(
      browser,
      page
    );


  try {

    await page.goto(
      'https://web.whatsapp.com/',
      {
        waitUntil:
          'domcontentloaded',

        timeout:
          60000
      }
    );

  } catch (err) {

    flog(
      `⚠️ goto WhatsApp: ${err?.message || err}`
    );
  }


  /*
   * IMPORTANTE:
   *
   * Después de goto volvemos a resolver
   * la página porque Edge puede cambiar
   * el contexto.
   */

  page =
    await resolveActivePage(
      browser,
      page
    );


  await resolveUseHereModal(
    page
  ).catch(
    () => {}
  );


  let ready =
    await waitForWhatsAppReady(
      page,
      {
        timeout:
          60000,

        quietMs:
          1500,

        requireWsTraffic:
          false
      }
    );


  if (!ready) {

    flog(
      '[STEP 6.3] ⚠️ WhatsApp aún no confirmado. Reintentando…'
    );


    page =
      await resolveActivePage(
        browser,
        page
      );


    await resolveUseHereModal(
      page
    ).catch(
      () => {}
    );


    ready =
      await waitForWhatsAppReady(
        page,
        {
          timeout:
            45000,

          quietMs:
            1200,

          requireWsTraffic:
            false
        }
      );
  }


  if (!ready) {

    throw new Error(
      'WhatsApp Web no quedó listo después de los reintentos.'
    );
  }


  const swOk =
    await waitForSWControlled(
      page,
      15000
    ).catch(
      () => false
    );


  if (!swOk) {

    flog(
      '[STEP 6.3] ⚠️ Service Worker no confirmado; continúo porque WhatsApp respondió.'
    );
  }


  flog(
    '[STEP 6.3] ✅ WhatsApp Web listo.'
  );


  return page;
}


/* =========================================================
 * EDITOR
 * ========================================================= */

async function findEditorWithRetry(
  page
) {

  const selectors = [

    '[data-testid="conversation-compose-box-input"] div[contenteditable="true"]',

    'div[role="textbox"][contenteditable="true"]',

    'div[contenteditable="true"][data-tab]'
  ];


  for (
    let i = 0;
    i < EDITOR_RETRIES;
    i++
  ) {

    for (
      const selector
        of selectors
    ) {

      const loc =
        page
          .locator(
            selector
          )
          .last();


      if (
        (
          await loc
            .count()
            .catch(
              () => 0
            )
        ) > 0
      ) {

        return loc;
      }
    }


    await sleep(
      EDITOR_POLL_MS
    );
  }


  return null;
}


/* =========================================================
 * FOCUS EDITOR
 * ========================================================= */

async function focusEditorAtEnd(
  page,
  editor
) {

  try {
    await editor
      .scrollIntoViewIfNeeded();
  } catch {}


  try {

    await editor.click({
      delay:
        20
    });

  } catch {}


  try {

    await editor.evaluate(
      el => {

        const selection =
          window.getSelection();

        const range =
          document.createRange();


        range.selectNodeContents(
          el
        );


        range.collapse(
          false
        );


        selection.removeAllRanges();

        selection.addRange(
          range
        );


        if (
          el.focus
        ) {

          el.focus();
        }
      }
    );

  } catch {}


  try {

    await page.keyboard
      .press(
        'ControlOrMeta+End'
      )
      .catch(
        () => {}
      );


    await page.keyboard
      .press(
        'End'
      )
      .catch(
        () => {}
      );


    await page.keyboard
      .press(
        'ArrowRight'
      )
      .catch(
        () => {}
      );

  } catch {}
}


/* =========================================================
 * ABRIR CHAT
 * ========================================================= */

async function ensureChatReady(
  page,
  phone,
  textEncoded
) {

  const variants = [

    `https://web.whatsapp.com/send?phone=${encodeURIComponent(phone)}&text=${textEncoded}`,

    `https://web.whatsapp.com/send/?phone=${encodeURIComponent(phone)}&text=${textEncoded}`,

    `https://web.whatsapp.com/send?phone=${encodeURIComponent(phone)}&text=${textEncoded}&app_absent=0`
  ];


  for (
    let attempt = 1;
    attempt <=
      CHAT_RETRIES;
    attempt++
  ) {

    if (
      page.isClosed()
    ) {

      flog(
        '❌ La página de WhatsApp está cerrada.'
      );

      return false;
    }


    const urlToOpen =
      variants[
        (
          attempt - 1
        ) %
        variants.length
      ];


    flog(
      `[STEP 7] 🔁 Abriendo chat (${attempt}/${CHAT_RETRIES}) con ${phone}`
    );


    try {

      await page.goto(
        urlToOpen,
        {
          waitUntil:
            'domcontentloaded',

          timeout:
            60000
        }
      );

    } catch (err) {

      flog(
        `[STEP 7] ⚠️ goto chat: ${err?.message || err}`
      );
    }


    /*
     * Recuperar página después de goto.
     */

    try {

      const browser =
        page
          .context()
          .browser();


      page =
        await resolveActivePage(
          browser,
          page
        );

    } catch {

      await sleep(
        1500
      );

      continue;
    }


    await resolveUseHereModal(
      page
    ).catch(
      () => {}
    );


    const settleMs =
      rand(
        6000,
        10000
      );


    flog(
      `[STEP 7] ↪ asentando vista ~${Math.round(settleMs / 1000)}s…`
    );


    await sleep(
      settleMs
    );


    const tResolve =
      Date.now();


    let resolved =
      false;


    while (
      Date.now() - tResolve <
      PRE_SEND_TIMEOUT_MS
    ) {

      if (
        page.isClosed()
      ) {

        return false;
      }


      await resolveUseHereModal(
        page
      ).catch(
        () => {}
      );


      const cur =
        page.url();


      const isSend =
        /\/send\/?\?phone=/i
          .test(
            cur
          );


      if (
        !isSend &&
        /web\.whatsapp\.com/i
          .test(
            cur
          )
      ) {

        resolved =
          true;

        break;
      }


      await sleep(
        200
      );
    }


    if (
      !resolved
    ) {

      flog(
        '[STEP 7] ⚠️ Deep link no resolvió; reintentando…'
      );


      await sleep(
        FALLBACK_MS
      );


      continue;
    }


    await waitForNetworkQuiet(
      page,
      {
        quietMs:
          QUIET_PRE_MS,

        timeout:
          PRE_SEND_TIMEOUT_MS
      }
    ).catch(
      () => {}
    );


    await resolveUseHereModal(
      page
    ).catch(
      () => {}
    );


    return true;
  }


  return false;
}


/* =========================================================
 * ENVIAR MENSAJE
 * ========================================================= */

async function sendMessage(
  page
) {

  const editor =
    await findEditorWithRetry(
      page
    );


  if (
    editor
  ) {

    await focusEditorAtEnd(
      page,
      editor
    );
  }


  try {

    await page.keyboard.press(
      'Enter'
    );


    flog(
      '[STEP 8] ↩️ Enviado (Enter)'
    );


    return true;

  } catch (err) {

    flog(
      `[STEP 8] ⚠️ No se pudo pulsar Enter: ${err?.message || err}`
    );


    return false;
  }
}


/* =========================================================
 * PAYLOAD
 * ========================================================= */

async function readPayload() {

  const arg =
    process.argv.find(
      a =>
        a.startsWith(
          '--payload='
        )
    );


  if (
    arg
  ) {

    const b64 =
      arg
        .split(
          '='
        )[1] ||
      '';


    const txt =
      Buffer.from(
        b64,
        'base64'
      ).toString(
        'utf8'
      );


    return JSON.parse(
      txt
    );
  }


  if (
    process.env.NOTIFY_ITEMS_JSON
  ) {

    return JSON.parse(
      process.env.NOTIFY_ITEMS_JSON
    );
  }


  if (
    process.stdin.isTTY
  ) {

    return {};
  }


  return await new Promise(
    resolve => {

      let data =
        '';

      let done =
        false;


      const finish =
        () => {

          if (
            !done
          ) {

            done =
              true;


            resolve(
              data
                ? JSON.parse(
                    data
                  )
                : {}
            );
          }
        };


      process.stdin
        .setEncoding(
          'utf8'
        );


      process.stdin.on(
        'data',
        chunk => {

          data +=
            chunk;
        }
      );


      process.stdin.on(
        'end',
        finish
      );


      setTimeout(
        finish,
        1500
      );
    }
  );
}


/* =========================================================
 * DATABASE
 * ========================================================= */

async function fetchByCorreosAndPlataformas(
  conn,
  correos = [],
  plataformaIds = []
) {

  if (
    !correos.length ||
    !plataformaIds.length
  ) {

    return [];
  }


  const inCorreos =
    correos
      .map(
        () => '?'
      )
      .join(',');


  const inPlats =
    plataformaIds
      .map(
        () => '?'
      )
      .join(',');


  const [
    pRows
  ] =
    await conn.query(
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
      LEFT JOIN usuarios u
        ON u.contacto = p.contacto
      LEFT JOIN cuentascompartidas cc
        ON cc.id = p.cuenta_id
      LEFT JOIN plataformas pl
        ON pl.id = cc.plataforma_id
      WHERE LOWER(cc.correo)
        IN (${inCorreos})
        AND cc.plataforma_id
        IN (${inPlats})
        AND (
          p.estado IS NULL
          OR p.estado <> 'CANCELADA'
        )
        AND DATE(p.fecha_vencimiento)
          > CURDATE()
      `,
      [
        ...correos,
        ...plataformaIds
      ]
    );


  const [
    cRows
  ] =
    await conn.query(
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
      LEFT JOIN usuarios u
        ON u.contacto = c.contacto
      LEFT JOIN plataformas pl
        ON pl.id = c.plataforma_id
      WHERE LOWER(c.correo)
        IN (${inCorreos})
        AND c.plataforma_id
        IN (${inPlats})
        AND (
          c.estado IS NULL
          OR c.estado <> 'CANCELADA'
        )
        AND DATE(c.fecha_vencimiento)
          > CURDATE()
      `,
      [
        ...correos,
        ...plataformaIds
      ]
    );


  return [
    ...pRows,
    ...cRows
  ];
}


/* =========================================================
 * HELPERS DATOS
 * ========================================================= */

function toE164(
  contacto
) {

  return String(
    contacto || ''
  ).replace(
    /\D/g,
    ''
  );
}


function fmtDateDDMMYYYY(
  value
) {

  if (
    !value
  ) {

    return '';
  }


  const s =
    String(
      value
    );


  const m =
    /^(\d{4})-(\d{2})-(\d{2})/
      .exec(
        s
      );


  if (
    m
  ) {

    return `${m[3]}/${m[2]}/${m[1]}`;
  }


  const d =
    new Date(
      value
    );


  if (
    isNaN(d)
  ) {

    return '';
  }


  const dd =
    String(
      d.getDate()
    ).padStart(
      2,
      '0'
    );


  const mm =
    String(
      d.getMonth() + 1
    ).padStart(
      2,
      '0'
    );


  const yyyy =
    d.getFullYear();


  return `${dd}/${mm}/${yyyy}`;
}


/* =========================================================
 * MENSAJE
 * ========================================================= */

function buildMessage(
  nombre,
  item,
  correo,
  nuevaClave
) {

  const first =
    (
      nombre
        ? nombre
            .trim()
            .split(/\s+/)[0]
        : null
    ) || '!';


  const base =
    `• ${item.plataforma_nombre || 'tu plataforma'} — ${item.servicio}`;


  const extra =
    item.servicio === 'Pantalla' &&
    item.nro_pantalla

      ? ` | *Pantalla ${item.nro_pantalla}*`

      : '';


  const vence =
    item.fecha_vencimiento

      ? ` | vence: ${fmtDateDDMMYYYY(item.fecha_vencimiento)}`

      : '';


  const bullet =
    `${base}${extra}${vence}`;


  const notaPantalla =
    item.servicio === 'Pantalla'

      ? '\n*Recuerda tu pantalla es la que ves arriba; solo puedes utilizar esa.*'

      : '';


  const tips = `
NOTA:*NO MODIFICAR LOS NUMEROS DEL PERFIL, USAR UNICAMENTE EL QUE SE LE ASIGNO SIN CAMBIARLO*
PARA EVITAR CODIGOS DEBES BORRAR HISTORIAL Y COOKIES ---->
EN CELULAR: https://www.youtube.com/watch?v=rEsApVI1-lk
EN EL COMPUTADOR: https://www.youtube.com/watch?v=2pYn4px0YWI`;


  return `
Hola ${first}, te notificamos el *cambio de contraseña* asociado a tu correo: *${correo}*.

${bullet}

*La nueva contraseña es:* ${nuevaClave}
No la compartas con nadie; ¡que estés súper bien!${notaPantalla}

${tips}
`.trim();
}


/* =========================================================
 * MAIN
 * ========================================================= */

(async function main() {

  flog(
    `LOG_FILE=${LOG_FILE}`
  );


  flog(
    '== inicio notify-password-changes =='
  );


  if (
    !acquireLock()
  ) {

    flog(
      '⏭️ Ya hay una ejecución de notify-password-changes.js en curso; se omite esta corrida.'
    );

    return;
  }


  let browser =
    null;

  let page =
    null;

  let conn =
    null;


  try {

    /* =====================================================
     * STEP 1
     * ===================================================== */

    const t1 =
      Date.now();


    const parsed =
      await readPayload();


    const items =
      Array.isArray(
        parsed?.items
      )
        ? parsed.items
        : [];


    flog(
      `[STEP 1] items recibidos: ${items.length}`
    );


    if (
      !items.length
    ) {

      flog(
        '⛔ No hay items para notificar → salida temprana.'
      );


      console.log(
        'No hay items para notificar'
      );


      return;
    }


    /* =====================================================
     * STEP 2
     * ===================================================== */

    const normCorreo =
      value =>
        String(
          value || ''
        )
          .trim()
          .toLowerCase();


    const lastByCorreoPlataforma =
      new Map();


    const correosSet =
      new Set();


    const plataformasSet =
      new Set();


    for (
      const it of items
    ) {

      const correo =
        normCorreo(
          it.correo
        );


      const plataforma_id =
        Number(
          it.plataforma_id
        );


      const nuevaClave =
        String(
          it.nuevaClave || ''
        ).trim();


      if (
        !correo ||
        !nuevaClave ||
        !Number.isFinite(
          plataforma_id
        )
      ) {

        continue;
      }


      const key =
        `${correo}::${plataforma_id}`;


      lastByCorreoPlataforma.set(
        key,
        nuevaClave
      );


      correosSet.add(
        correo
      );


      plataformasSet.add(
        plataforma_id
      );
    }


    const correos =
      Array.from(
        correosSet
      );


    const plataformaIds =
      Array.from(
        plataformasSet
      );


    flog(
      `[STEP 2] Correos únicos=${correos.length} | plataforma_id únicos=${plataformaIds.length}`
    );


    if (
      !correos.length ||
      !plataformaIds.length
    ) {

      flog(
        '⛔ Sin correos o plataforma_id válidos en payload → salida temprana.'
      );


      console.log(
        'Sin correos/plataformas válidos.'
      );


      return;
    }


    flog(
      `[STEP 2] Time=${Date.now() - t1}ms`
    );


    /* =====================================================
     * STEP 3
     * ===================================================== */

    const t3 =
      Date.now();


    conn =
      await mysql.createConnection(
        DATABASE_URL
      );


    flog(
      '[STEP 3] DB: conectado'
    );


    let rows =
      [];


    try {

      rows =
        await fetchByCorreosAndPlataformas(
          conn,
          correos,
          plataformaIds
        );


      flog(
        `[STEP 3] Filas obtenidas (futuras): ${rows.length}`
      );

    } catch (err) {

      flog(
        `[STEP 3] ❌ Error fetchByCorreosAndPlataformas: ${err?.message || err}`
      );


      throw err;
    }


    flog(
      `[STEP 3] Time=${Date.now() - t3}ms`
    );


    /* =====================================================
     * STEP 4
     * ===================================================== */

    const t4 =
      Date.now();


    const perCorreoPlat =
      new Map();


    const tasks =
      [];


    let skippedPhone =
      0;


    let skippedNoClave =
      0;


    const bump =
      (
        key,
        platName,
        phone
      ) => {

        if (
          !perCorreoPlat.has(
            key
          )
        ) {

          perCorreoPlat.set(
            key,
            {
              plataforma_nombre:
                platName ||
                'N/D',

              count:
                0,

              phones:
                new Set()
            }
          );
        }


        const o =
          perCorreoPlat.get(
            key
          );


        o.count++;


        if (
          phone
        ) {

          o.phones.add(
            phone
          );
        }
      };


    for (
      const r of rows
    ) {

      const phone =
        toE164(
          r.contacto
        );


      if (
        !/^\d{8,15}$/.test(
          phone
        )
      ) {

        skippedPhone++;

        continue;
      }


      const correoL =
        normCorreo(
          r.correo
        );


      const plataforma_id =
        Number(
          r.plataforma_id
        );


      const keyCP =
        `${correoL}::${plataforma_id}`;


      const nuevaClave =
        lastByCorreoPlataforma.get(
          keyCP
        );


      if (
        !nuevaClave
      ) {

        skippedNoClave++;

        continue;
      }


      const item = {

        servicio:
          r.servicio,

        plataforma_id:
          r.plataforma_id,

        plataforma_nombre:
          r.plataforma_nombre,

        nro_pantalla:
          r.nro_pantalla,

        fecha_vencimiento:
          r.fecha_vencimiento
      };


      tasks.push({

        correo:
          correoL,

        plataforma_id,

        plataforma_nombre:
          r.plataforma_nombre ||
          null,

        phone,

        nombre:
          r.nombre ||
          null,

        item,

        nuevaClave
      });


      bump(
        keyCP,
        r.plataforma_nombre,
        phone
      );
    }


    tasks.sort(
      (a, b) => {

        const c =
          a.correo.localeCompare(
            b.correo
          );


        if (
          c !== 0
        ) {

          return c;
        }


        const na =
          String(
            a.plataforma_nombre ||
            ''
          );


        const nb =
          String(
            b.plataforma_nombre ||
            ''
          );


        const pn =
          na.localeCompare(
            nb
          );


        if (
          pn !== 0
        ) {

          return pn;
        }


        return (
          a.plataforma_id -
          b.plataforma_id
        ) ||
        a.phone.localeCompare(
          b.phone
        );
      }
    );


    for (
      const [
        key,
        value
      ]
        of perCorreoPlat.entries()
    ) {

      const [
        corr,
        pid
      ] =
        key.split(
          '::'
        );


      flog(
        `[STEP 4][RESUMEN] correo=${corr} plataforma_id=${pid} (${value.plataforma_nombre}) filas=${value.count} phones=${Array.from(value.phones).join(',')}`
      );
    }


    flog(
      `[STEP 4] tasks=${tasks.length} skippedPhone=${skippedPhone} skippedNoClave=${skippedNoClave}`
    );


    flog(
      `[STEP 4] Time=${Date.now() - t4}ms`
    );


    if (
      !tasks.length
    ) {

      flog(
        '⛔ No hay tareas tras filtros → salida temprana.'
      );


      console.log(
        'No hay destinatarios.'
      );


      return;
    }


    flog(
      '[STEP 5] OK → hay tareas, continuamos a WA/CDP.'
    );


    /* =====================================================
     * STEP 6
     * ===================================================== */

    await launchBrowserScript();


    const edge =
      await connectToExistingEdge();


    browser =
      edge.browser;


    page =
      await prepareWhatsApp(
        browser,
        edge.page
      );


    /* =====================================================
     * SINCRONIZACIÓN INICIAL
     * ===================================================== */

    flog(
      `[STEP 6.4] ⏳ Esperando ${Math.round(INITIAL_SYNC_WAIT_MS / 1000)}s para sincronización inicial de WhatsApp…`
    );


    await sleep(
      INITIAL_SYNC_WAIT_MS
    );


    flog(
      '[STEP 6.4] 🔄 Verificando nuevamente que WhatsApp siga disponible…'
    );


    page =
      await resolveActivePage(
        browser,
        page
      );


    await resolveUseHereModal(
      page
    ).catch(
      () => {}
    );


    await waitForNetworkQuiet(
      page,
      {
        quietMs:
          2500,

        timeout:
          10000
      }
    ).catch(
      () => {}
    );


    flog(
      '[STEP 6.4] ✅ Sincronización inicial completada. Comenzando envíos.'
    );


    /* =====================================================
     * STEP 7
     * ===================================================== */

    const baseGap =
      Math.max(
        Number(
          OPEN_SPACING_MS
        ) ||
        12000,

        12000
      );


    flog(
      `[STEP 7] base gapEnv=${baseGap}ms`
    );


    let prevKey =
      null;


    for (
      let i = 0;
      i < tasks.length;
      i++
    ) {

      const t =
        tasks[i];


      const blkKey =
        `${t.correo}::${t.plataforma_id}`;


      if (
        blkKey !== prevKey
      ) {

        flog(
          `— BLOQUE — correo=${t.correo} | plataforma_id=${t.plataforma_id} (${t.plataforma_nombre || 'N/D'})`
        );


        prevKey =
          blkKey;
      }


      /*
       * Si WhatsApp se cerró, detener.
       */

      if (
        !page ||
        page.isClosed()
      ) {

        throw new Error(
          'La pestaña de WhatsApp se cerró durante el proceso.'
        );
      }


      const text =
        buildMessage(
          t.nombre,
          t.item,
          t.correo,
          t.nuevaClave
        );


      flog(
        `→ [${i + 1}/${tasks.length}] phone=${t.phone} correo=${t.correo} plataforma_id=${t.plataforma_id} (${t.plataforma_nombre || 'N/D'}) servicio=${t.item.servicio} pantalla=${t.item.nro_pantalla || '—'} vence=${fmtDateDDMMYYYY(t.item.fecha_vencimiento) || '—'}`
      );


      const textEncoded =
        encodeURIComponent(
          text
        );


      const chatOk =
        await ensureChatReady(
          page,
          t.phone,
          textEncoded
        );


      if (
        !chatOk
      ) {

        flog(
          `❌ No se pudo preparar el chat de ${t.phone}; se omite.`
        );

      } else {

        await sendMessage(
          page
        );


        /*
         * ESPERA DESPUÉS DEL ENVÍO.
         *
         * 10-15 segundos para que WhatsApp
         * procese/sincronice el mensaje antes
         * de continuar.
         */

        const postSendPause =
          rand(
            10000,
            15000
          );


        flog(
          `↪ post-send pause ~${Math.round(postSendPause / 1000)}s…`
        );


        await sleep(
          postSendPause
        );
      }


      if (
        i <
        tasks.length - 1
      ) {

        const jitter =
          rand(
            4000,
            9000
          );


        const pause =
          baseGap +
          jitter;


        flog(
          `⏳ Pausa entre mensajes: ~${Math.round(pause / 1000)}s…`
        );


        await sleep(
          pause
        );
      }
    }


    /* =====================================================
     * FIN
     * ===================================================== */

    flog(
      '✅ Notificaciones terminadas.'
    );


    flog(
      'ℹ️ Navegador dejado abierto para revisión manual.'
    );


  } catch (err) {

    flog(
      `❌ Error notify-password-changes: ${err?.stack || err?.message || err}`
    );


    process.exitCode =
      1;


  } finally {

    try {

      if (
        conn
      ) {

        await conn.end();
      }

    } catch {}


    releaseLock();


    flog(
      '== fin notify-password-changes =='
    );
  }

})();