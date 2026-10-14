// Records the Signal prototype for the portfolio: stills and three screen
// recordings, driven through headless Chrome with a visible fake cursor.
//   python3 -m http.server 8766 --directory ..   (or any static server)
//   node tools/capture-signal.mjs
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const BASE = process.env.SIGNAL_URL || "http://localhost:8766/2/prototype/signal/index.html";
const OUT = path.resolve(import.meta.dirname, "captures-signal");
const W = 1440, H = 900, PORT = 9335;
mkdirSync(OUT, { recursive: true });

const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
  "--headless=new", `--remote-debugging-port=${PORT}`, `--window-size=${W},${H}`, "--hide-scrollbars",
  `--user-data-dir=${path.join(tmpdir(), "signal-capture")}`, "about:blank",
], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let tabs = null;
for (let k = 0; k < 40 && !tabs; k++) { await sleep(500); tabs = await fetch(`http://127.0.0.1:${PORT}/json`).then((r) => r.json()).catch(() => null); }
const ws = new WebSocket(tabs.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0, frames = null;
const pending = new Map();
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.method === "Page.screencastFrame") { frames?.push({ t: Date.now(), data: d.params.data }); send("Page.screencastFrameAck", { sessionId: d.params.sessionId }); }
  else if (pending.has(d.id)) { pending.get(d.id)(d.result); pending.delete(d.id); }
};
const send = (method, params = {}) => new Promise((r) => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expression) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result?.value;

// A cursor the viewer can follow, plus a click ripple.
const cursorUi = `(() => { const add = () => { if (document.getElementById('fc')) return;
  const c = document.createElement('div'); c.id = 'fc';
  c.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;pointer-events:none;transition:transform .55s cubic-bezier(.2,.7,.2,1);transform:translate(${W - 200}px,${H - 120}px)';
  c.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M4 2.5 19.5 11l-7 1.8L9.2 20z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg><i style="position:absolute;left:-14px;top:-14px;width:28px;height:28px;border-radius:50%;background:rgba(19,135,123,.35);transform:scale(0);opacity:0;transition:transform .4s,opacity .4s"></i>';
  document.body.appendChild(c); };
  if (document.body) add(); else addEventListener('DOMContentLoaded', add); })();`;
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 2, mobile: false });
await send("Page.addScriptToEvaluateOnNewDocument", { source: cursorUi });

let cur = { x: W - 200, y: H - 120 };
const moveTo = async (x, y, ms = 600) => { await ev(`document.getElementById('fc').style.transform='translate(${x}px,${y}px)'`); await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }); cur = { x, y }; await sleep(ms); };
const where = (sel, text) => ev(`(() => { let el = ${JSON.stringify(sel)} ? [...document.querySelectorAll(${JSON.stringify(sel)})].filter(e => e.getBoundingClientRect().width > 0)${text ? `.find(e => e.textContent.trim().includes(${JSON.stringify(text)}))` : "[0]"} : null;
  if (!el) return null; const r = el.getBoundingClientRect(); if (r.top < 0 || r.bottom > innerHeight) { el.scrollIntoView({ block: 'center' }); } const q = el.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; })()`);
const click = async (sel, text, after = 700) => {
  const p = await where(sel, text);
  if (!p) throw new Error(`Not found: ${sel} ${text || ""}`);
  await sleep(200);
  const q = await where(sel, text);
  await moveTo(q.x, q.y);
  await ev(`(() => { const i = document.querySelector('#fc i'); i.style.transform='scale(1)'; i.style.opacity=1; setTimeout(() => { i.style.transform='scale(1.6)'; i.style.opacity=0; }, 180); })()`);
  for (const type of ["mousePressed", "mouseReleased"]) await send("Input.dispatchMouseEvent", { type, x: q.x, y: q.y, button: "left", clickCount: 1 });
  await sleep(after);
};
const setSelect = async (sel, value, after = 900) => {
  const q = await where(sel);
  await moveTo(q.x, q.y, 450);
  await ev(`(() => { const s = document.querySelector(${JSON.stringify(sel)}); s.value = ${JSON.stringify(value)}; s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await sleep(after);
};
const type = async (text, gap = 90) => { for (const ch of text) { await send("Input.insertText", { text: ch }); await sleep(gap); } };
const key = (k, code, mods = 0) => Promise.all(["rawKeyDown", "keyUp"].map((t) => send("Input.dispatchKeyEvent", { type: t, key: k, code, modifiers: mods, windowsVirtualKeyCode: { Enter: 13, k: 75 }[k] || 0 })));
const shot = async (name) => { const r = await send("Page.captureScreenshot", { format: "jpeg", quality: 86 }); writeFileSync(path.join(OUT, `${name}.jpg`), Buffer.from(r.data, "base64")); console.log("shot", name); };
const go = async (hash, ms = 1600) => { await send("Page.navigate", { url: `${BASE}?c=${Date.now()}${hash}` }); await sleep(ms); };
const record = async (name, fn) => {
  frames = [];
  await send("Page.startScreencast", { format: "jpeg", quality: 82, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
  await sleep(400);
  await fn();
  await sleep(600);
  await send("Page.stopScreencast");
  const list = frames; frames = null;
  await encode(name, list);
};

async function encode(name, list) {
  if (list.length < 10) return console.log("too few frames for", name);
  const tab = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })).json();
  const w2 = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((r) => (w2.onopen = r));
  let i2 = 0; const p2 = new Map();
  w2.onmessage = (m) => { const d = JSON.parse(m.data); if (p2.has(d.id)) { p2.get(d.id)(d.result); p2.delete(d.id); } };
  const s2 = (method, params = {}) => new Promise((r) => { p2.set(++i2, r); w2.send(JSON.stringify({ id: i2, method, params })); });
  const e2 = async (expression) => (await s2("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result?.value;
  await e2(`window.F = []; 1`);
  for (let k = 0; k < list.length; k += 30) await e2(`F.push(...${JSON.stringify(list.slice(k, k + 30).map((f) => ({ t: f.t - list[0].t, d: f.data })))}); 1`);
  const res = await e2(`(async () => {
    const imgs = await Promise.all(F.map((f) => new Promise((ok) => { const im = new Image(); im.onload = () => ok(im); im.src = 'data:image/jpeg;base64,' + f.d; })));
    const c = document.createElement('canvas'); c.width = imgs[0].naturalWidth; c.height = imgs[0].naturalHeight; const g = c.getContext('2d');
    const mime = ['video/mp4;codecs=avc1.4D401F', 'video/mp4;codecs=avc1.42E01E', 'video/webm;codecs=vp9'].find((m) => MediaRecorder.isTypeSupported(m));
    const rec = new MediaRecorder(c.captureStream(30), { mimeType: mime, videoBitsPerSecond: 6_000_000 }); const parts = []; rec.ondataavailable = (e) => parts.push(e.data);
    const done = new Promise((r) => (rec.onstop = r)); g.drawImage(imgs[0], 0, 0); rec.start(250);
    const t0 = performance.now(); let i = 0;
    await new Promise((ok) => { const step = () => { const t = performance.now() - t0; while (i < F.length - 1 && F[i + 1].t <= t) i++; g.drawImage(imgs[i], 0, 0); if (t > F[F.length - 1].t + 500) return ok(); setTimeout(step, 33); }; step(); });
    rec.stop(); await done; const buf = new Uint8Array(await new Blob(parts).arrayBuffer());
    let bin = ''; for (let k = 0; k < buf.length; k += 32768) bin += String.fromCharCode(...buf.subarray(k, k + 32768));
    return { mime, b64: btoa(bin) }; })()`);
  w2.close();
  await fetch(`http://127.0.0.1:${PORT}/json/close/${tab.id}`);
  if (res?.b64) { writeFileSync(path.join(OUT, `${name}.${res.mime.startsWith("video/mp4") ? "mp4" : "webm"}`), Buffer.from(res.b64, "base64")); console.log("video", name, res.mime); }
}

try {
  const drag = async (fromSel, toSel) => {
    const a = await where(fromSel), b0 = await ev(`(() => { const r = [...document.querySelectorAll(${JSON.stringify(toSel)})][1].getBoundingClientRect(); return { x: r.left + r.width * 0.6, y: r.top + r.height * 0.5 }; })()`);
    await moveTo(a.x, a.y, 500);
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x: a.x, y: a.y, button: "left", clickCount: 1 });
    for (let k = 1; k <= 18; k++) { const x = a.x + ((b0.x - a.x) * k) / 18, y = a.y + ((b0.y - a.y) * k) / 18; await ev(`document.getElementById('fc').style.transition='none';document.getElementById('fc').style.transform='translate(${x}px,${y}px)'`); await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, button: "left", buttons: 1 }); await sleep(40); }
    await sleep(350);
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: b0.x, y: b0.y, button: "left", clickCount: 1 });
    await ev(`document.getElementById('fc').style.transition=''`);
    await sleep(700);
  };

  await go("#/dashboard", 2200);
  await shot("01-dashboard");

  // 1. Build from empty, edit in place, create a card, reorder, undo, save
  await record("build", async () => {
    await go("#/dashboard/new", 1600);
    await shot("02-empty");
    await click('[data-act="start-edit"]', null, 900);
    await click('.lib-item[data-lib="calls"]', null, 900);
    await click('.lib-item[data-lib="rating"]', null, 1000);
    await shot("03-editing");
    await click('#library [data-act="custom"]', null, 800);
    await setSelect("#c-m", "delay", 700);
    await click('.viz [data-k="bar"]', null, 700);
    await click('.seg [data-n="30"]', null, 900);
    await click('.viz [data-k="line"]', null, 900);
    await shot("04-create");
    await click(".modal [data-ok]", null, 1300);
    await drag(".widget .handle", ".widget");
    await click('.widget [data-act="remove"]', null, 700);
    await click(".toast [data-u]", null, 900);
    await click('[data-act="save"]', null, 1300);
  });

  // 2. Hover detail and range change on the full dashboard
  await record("explore", async () => {
    await go("#/dashboard", 2000);
    const r = await ev(`(() => { const b = document.querySelector('.widget svg.chart[data-kind="line"]').getBoundingClientRect(); return { l: b.left, t: b.top, w: b.width, h: b.height }; })()`);
    for (const f of [0.15, 0.35, 0.55, 0.75, 0.92]) await moveTo(r.l + r.w * f, r.t + r.h * 0.45, 420);
    await shot("05-hover");
    await click('[data-act="range"]', null, 600);
    await click(".menu button", "Last 30 days", 1500);
    await click('[data-act="compare"]', null, 1000);
    await click('[data-act="compare"]', null, 1200);
  });

  // 3. Audit log: brush the activity chart, filter, inspect, keyboard through events
  await record("audit", async () => {
    await go("#/audit", 1500);
    const r = await ev(`(() => { const b = document.querySelector('.activity svg').getBoundingClientRect(); return { l: b.left, t: b.top, w: b.width, h: b.height }; })()`);
    const y = r.t + r.h * 0.6, x1 = r.l + r.w * 0.57, x2 = r.l + r.w * 0.8;
    await moveTo(x1, y, 700);
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x: x1, y, button: "left", clickCount: 1 });
    for (let k = 1; k <= 14; k++) { const x = x1 + ((x2 - x1) * k) / 14; await ev(`document.getElementById('fc').style.transition='none';document.getElementById('fc').style.transform='translate(${x}px,${y}px)'`); await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, button: "left", buttons: 1 }); await sleep(45); }
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: x2, y, button: "left", clickCount: 1 });
    await ev(`document.getElementById('fc').style.transition=''`);
    await sleep(800);
    await click('[data-act="au-action"]', null, 600);
    await click(".menu button", "Sign-in failed", 900);
    await shot("06-audit");
    await click(".row[data-id]", null, 1000);
    for (let k = 0; k < 2; k++) { await send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "ArrowDown", code: "ArrowDown", windowsVirtualKeyCode: 40 }); await send("Input.dispatchKeyEvent", { type: "keyUp", key: "ArrowDown", code: "ArrowDown", windowsVirtualKeyCode: 40 }); await sleep(600); }
    await shot("07-inspector");
  });

  // 4. Search, catalog detail, add to dashboard, appearance
  await record("catalog", async () => {
    await go("#/catalog", 1400);
    await shot("08-catalog");
    await moveTo(W / 2, H / 2, 300);
    await key("k", "KeyK", 4);
    await sleep(500);
    await type("handle");
    await sleep(500);
    await shot("09-search");
    await key("Enter", "Enter");
    await sleep(1300);
    await shot("10-metric");
    await click('[data-tab="schema"]', null, 800);
    await click('[data-tab="usage"]', null, 800);
    await click('[data-tab="overview"]', null, 800);
    await click('[data-act="cat-add"]', null, 1500);
    await click(".modal [data-ok]", null, 1400);
    await click('[data-act="save"]', null, 900);
    await click("[data-theme-toggle]", null, 1500);
    await shot("11-dark");
    await click("[data-theme-toggle]", null, 900);
  });
} catch (e) {
  console.error("Capture stopped:", e.message);
  await shot("error-state");
}
ws.close();
chrome.kill();
