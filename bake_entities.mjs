// Dev tool: bake per-entity PNGs into entities/ for visual Tiled editing.
// Run: `node bake_entities.mjs`
// Requires: Brave Browser at the standard macOS path.
//
// How it works:
//   1. Start a python http server on port 8766.
//   2. Launch ONE headless Brave with --remote-debugging-port=9222.
//   3. Drive Brave via the Chrome DevTools Protocol (raw WebSocket — Node 22
//      has WebSocket + fetch built-in, no deps).
//   4. For each entity: navigate the same tab to ?bakeentity=NAME, wait for
//      the page to set its title to "WxH" (bakeOneEntity in index.html does
//      this), then Page.captureScreenshot at the entity's native size.
//
// Single Brave reuse keeps the whole run under ~10s instead of 19 cold starts.
//
// Sizes mirror generateTextures() in index.html. Update both if you add or
// resize an entity.

import { spawn } from 'child_process';
import { writeFileSync, mkdirSync, mkdtempSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const PORT = 8766;
const DEBUG_PORT = 9222;
const BRAVE = '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';

const ENTITIES = [
  { name: 'coin',          w:  16, h:  16 },
  { name: 'spike_outdoor', w:  16, h:  16 },
  { name: 'spike_bagel',   w:  16, h:  16 },
  { name: 'goal',          w:  16, h:  48 },
  { name: 'checkpoint',    w:  16, h:  48 },
  { name: 'enemy_outdoor', w:  32, h:  24 },
  { name: 'enemy_bagel',   w:  32, h:  24 },
  { name: 'tree_outdoor',  w:  64, h: 112 },
  { name: 'tree_bagel',    w:  64, h: 112 },
  { name: 'bush_outdoor',  w:  48, h:  24 },
  { name: 'bush_bagel',    w:  48, h:  24 },
  { name: 'rock_outdoor',  w:  28, h:  18 },
  { name: 'rock_bagel',    w:  28, h:  18 },
  { name: 'platform',      w:  96, h:  16 },
  { name: 'bigplatform',   w: 128, h:  16 },
  { name: 'counter',       w:  96, h:  16 },
  { name: 'counter_big',   w: 128, h:  16 },
  { name: 'heart',         w:  64, h:  64 },
  { name: 'spawn',         w:  92, h:  92 }
];

if (!existsSync(BRAVE)) {
  console.error('Brave not found at', BRAVE);
  process.exit(1);
}

mkdirSync('entities', { recursive: true });

const server = spawn('python3', ['-m', 'http.server', String(PORT)], { stdio: 'ignore' });
const profile = mkdtempSync(join(tmpdir(), 'brave-bake-'));
const brave = spawn(BRAVE, [
  '--headless=new', '--disable-gpu', '--no-sandbox',
  `--user-data-dir=${profile}`,
  `--remote-debugging-port=${DEBUG_PORT}`,
  '--default-background-color=00000000',
  '--force-device-scale-factor=1',
  '--hide-scrollbars',
  'about:blank'
], { stdio: 'ignore' });

const cleanup = () => { try { brave.kill(); } catch {} try { server.kill(); } catch {} };
process.on('exit', cleanup);
process.on('SIGINT', () => { cleanup(); process.exit(130); });

// Wait for python server + CDP endpoint.
let version;
for (let i = 0; i < 60; i++) {
  await new Promise(r => setTimeout(r, 250));
  try {
    const r = await fetch(`http://localhost:${DEBUG_PORT}/json/version`);
    if (r.ok) { version = await r.json(); break; }
  } catch {}
}
if (!version) throw new Error('Brave CDP did not come up');
console.log('cdp:', version.webSocketDebuggerUrl);

const ws = new WebSocket(version.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));

let nextId = 1;
const pending = new Map();
const loadWaiters = [];

ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    const cb = pending.get(m.id);
    pending.delete(m.id);
    cb(m);
  } else if (m.method === 'Page.loadEventFired') {
    while (loadWaiters.length) loadWaiters.shift()();
  }
});

function send(method, params = {}, sessionId) {
  const id = nextId++;
  const msg = { id, method, params };
  if (sessionId) msg.sessionId = sessionId;
  return new Promise((resolve, reject) => {
    pending.set(id, (m) => m.error ? reject(new Error(method + ': ' + m.error.message)) : resolve(m.result));
    ws.send(JSON.stringify(msg));
  });
}
const waitLoad = () => new Promise(r => loadWaiters.push(r));

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Page.enable', {}, sessionId);
await send('Emulation.setDefaultBackgroundColorOverride', {
  color: { r: 0, g: 0, b: 0, a: 0 }
}, sessionId);

try {
  for (const ent of ENTITIES) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: ent.w, height: ent.h, deviceScaleFactor: 1, mobile: false
    }, sessionId);
    const loaded = waitLoad();
    await send('Page.navigate', { url: `http://localhost:${PORT}/index.html?bakeentity=${ent.name}` }, sessionId);
    await loaded;

    // Poll for bakeOneEntity to finish (sets document.title = "WxH").
    const expected = `${ent.w}x${ent.h}`;
    let ready = false;
    for (let i = 0; i < 50; i++) {
      const r = await send('Runtime.evaluate', { expression: 'document.title', returnByValue: true }, sessionId);
      if (r.result.value === expected) { ready = true; break; }
      await new Promise(r => setTimeout(r, 80));
    }
    if (!ready) console.warn(`  ! ${ent.name} title never matched ${expected}; screenshotting anyway`);

    const { data } = await send('Page.captureScreenshot', {
      format: 'png',
      clip: { x: 0, y: 0, width: ent.w, height: ent.h, scale: 1 },
      fromSurface: true,
      captureBeyondViewport: false
    }, sessionId);
    writeFileSync(`entities/${ent.name}.png`, Buffer.from(data, 'base64'));
    console.log(`wrote entities/${ent.name}.png  (${ent.w}x${ent.h})`);
  }
} finally {
  ws.close();
  cleanup();
}
