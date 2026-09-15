import {
  FilesetResolver,
  GestureRecognizer,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";
import { PROFILE, CASES, EXPERIENCE } from "./content.js";
import { caseStudyPage, experiencePage } from "./reader.js";

/* =========================================================================
   Cards — one per gesture. Long-form content lives in content.js.
   `gesture` must be one of MediaPipe's built-in labels:
   Victory, Thumb_Up, Pointing_Up, Open_Palm, ILoveYou
   (Closed_Fist and Thumb_Down are reserved for closing.)
   ========================================================================= */
const ICONS = {
  person: `<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/>`,
  folder: `<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/><path d="M3.5 11h17"/>`,
  timeline: `<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>`,
  tools: `<path d="M4 20h16"/><path d="M6 20V9l6-5 6 5v11"/><path d="M10 20v-6h4v6"/>`,
  mail: `<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4 7 8 6 8-6"/>`,
};

const linkRow = (href, title, sub) =>
  `<li><a class="link-row" href="${href}"><span>${title}<small>${sub}</small></span><em>→</em></a></li>`;

const SECTIONS = [
  {
    gesture: "Victory",
    hint: "✌️ Peace sign",
    icon: "person",
    label: "About Me",
    title: "Frontend engineer",
    body: `
      <p>I'm ${PROFILE.name}, a frontend-focused software engineer building responsive, polished
      interfaces in React, TypeScript and Angular, backed by a UI/UX research foundation.</p>
      <p>I'm an Applications Associate at AAA's ACG AI Labs and a Computer Science (AI) graduate
      of the University of Michigan–Dearborn.</p>`,
    footer: [PROFILE.location, PROFILE.authorization],
  },
  {
    gesture: "Thumb_Up",
    hint: "👍 Thumbs up",
    icon: "folder",
    label: "Case Studies",
    title: "Selected case studies",
    body: `<ul class="link-list">${CASES.map((c) => linkRow(`#/work/${c.slug}`, c.title, `${c.subtitle} · ${c.year}`)).join("")}</ul>`,
    footer: [`<a href="#/work/${CASES[0].slug}">Start reading →</a>`, `<em class="pinch-hint">🤏 Pinch to open</em>`],
    pinchHref: `#/work/${CASES[0].slug}`, // where a pinch on the open card goes
  },
  {
    gesture: "Pointing_Up",
    hint: "☝️ Point up",
    icon: "timeline",
    label: "Experience",
    title: "Experience",
    body: `<ul class="link-list">${EXPERIENCE.map((e) =>
      linkRow(`#/experience/${e.id}`, e.role, `${e.company} · ${e.start} – ${e.end}`)
    ).join("")}</ul>`,
    footer: [
      `<a href="#/experience">Full experience →</a>`,
      `<a href="${PROFILE.resume}" download>Résumé ↓</a>`,
      `<em class="pinch-hint">🤏 Pinch to open</em>`,
    ],
    pinchHref: "#/experience",
  },
  {
    gesture: "Open_Palm",
    hint: "🖐️ Open palm",
    icon: "tools",
    label: "Toolkit",
    title: "Toolkit",
    body: `<p>What I use to design, build and ship interfaces, from Figma prototype to production.</p>`,
    footer: ["React", "TypeScript", "Angular", "React Native", "Figma"],
  },
  {
    gesture: "ILoveYou",
    hint: "🤟 Rock on",
    icon: "mail",
    label: "Contact",
    title: "Get in touch",
    body: `
      <ul class="link-list">
        ${linkRow(`mailto:${PROFILE.email}`, "Email", PROFILE.email)}
        ${linkRow(PROFILE.github, "GitHub", "github.com/aru24sin")}
        ${linkRow(PROFILE.linkedin, "LinkedIn", "linkedin.com/in/ary-sin24")}
      </ul>`,
    footer: [`<a href="${PROFILE.resume}" download>Résumé ↓</a>`],
  },
];

/* =========================================================================
   Config
   ========================================================================= */
const HOLD_MS = 650; // how long a gesture must be held to trigger
const MIN_SCORE = 0.6;
const CLOSE_GESTURES = new Set(["Closed_Fist", "Thumb_Down"]);
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task";
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const FONT = "'Inter Tight', system-ui, sans-serif";

// Motion
const EASE = "cubic-bezier(0.2, 0.8, 0.2, 1)";
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const ms = (d) => (reduceMotion ? 0 : d);

// Floating webcam physics
const PIP_MARGIN = 16;
const GLIDE_TAU = 110; // ms — how quickly a thrown webcam slows down (bigger = drifts further)
const MAX_SPEED = 1.6; // px/ms cap on throw speed, so a flick travels ~175px at most
const BOUNCE = 0.35; // velocity kept when bouncing off a screen edge
const TILT_PER_SPEED = 2.5; // degrees of tilt per px/ms of horizontal speed
const MAX_TILT = 4;
const SHADOW_NONE = "0 0px 0px rgba(0,0,0,0), 0 0 0 0px rgba(255,255,255,0)";
const SHADOW_PIP = "0 18px 50px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.55)";

const HAND_EDGES = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

/* =========================================================================
   DOM
   ========================================================================= */
const $ = (s) => document.querySelector(s);
const frameEl = $("#frame");
const stage = $("#stage");
const video = $("#cam");
const canvas = $("#overlay");
const ctx = canvas.getContext("2d");
const statusEl = $("#status");
const startBtn = $("#start-btn");
const progressFill = $("#progress-fill");
const reader = $("#reader");
const baseTitle = document.title;

// Big transitions (camera morph, page open/close) pause hand detection so frames stay smooth.
let bigTransitions = 0;
function track(anim) {
  bigTransitions++;
  anim.finished.catch(() => {}).finally(() => bigTransitions--);
  return anim;
}
const quietly = (promise, fn) => promise.then(fn).catch(() => {});

/* =========================================================================
   Canvas sizing — follows the stage, but not while it is morphing
   (resizing a canvas every frame is expensive; it is hidden then anyway)
   ========================================================================= */
let W = 0;
let H = 0;
let morphing = false;
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = stage.clientWidth;
  H = stage.clientHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
new ResizeObserver(() => {
  if (!morphing) resize();
}).observe(stage);
resize();

function setMorphing(on) {
  morphing = on;
  stage.classList.toggle("morphing", on);
  if (!on) resize();
}

/* =========================================================================
   Cards
   ========================================================================= */
const cardRow = $("#cards");
const cardEls = SECTIONS.map((s, i) => {
  const el = document.createElement("div");
  el.className = "card";
  el.tabIndex = 0;
  el.setAttribute("role", "button");
  el.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[s.icon]}</svg>
    <span class="label">${s.label}<span class="hint">${s.hint}</span></span>
    <div class="detail">
      <h2>${s.title}</h2>
      <div class="body">${s.body}</div>
      <footer>${s.footer.map((f) => `<span>${f}</span>`).join("")}</footer>
    </div>`;
  el.addEventListener("click", () => openSection(i));
  el.addEventListener("keydown", (e) => {
    if (e.target === el && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      openSection(i);
    }
  });
  cardRow.appendChild(el);
  return el;
});

let current = -1;

// Animate every card from its current size (even mid-animation) to its new size.
function morphCards(mutate) {
  const before = cardEls.map((el) => [el.offsetWidth, el.offsetHeight]);
  cardEls.forEach((el) => el.getAnimations({ subtree: true }).forEach((a) => a.cancel()));
  mutate();

  let activeAnim = null;
  cardEls.forEach((el, i) => {
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const [bw, bh] = before[i];
    if (Math.abs(bw - w) < 1 && Math.abs(bh - h) < 1) return;

    const anim = el.animate(
      [
        { width: `${bw}px`, height: `${bh}px` },
        { width: `${w}px`, height: `${h}px` },
      ],
      { duration: ms(440), easing: EASE }
    );
    const isActive = el.classList.contains("active");
    if (isActive) activeAnim = anim;

    const content = isActive ? [el.querySelector(".detail")] : el.querySelectorAll(":scope > svg, :scope > .label");
    content.forEach((c) =>
      c.animate(
        [
          { opacity: 0, transform: "translateY(6px)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: ms(280), delay: ms(isActive ? 140 : 180), easing: EASE, fill: "backwards" }
      )
    );
  });
  return activeAnim;
}

function openSection(i) {
  if (i === current) return;
  const anim = morphCards(() => {
    current = i;
    cardEls.forEach((el, k) => el.classList.toggle("active", k === i));
  });
  // Scroll once the card has its final size, so the target position is correct.
  const reveal = () => {
    if (current !== i) return;
    const card = cardEls[i];
    const left = card.offsetLeft - (cardRow.clientWidth - card.offsetWidth) / 2;
    cardRow.scrollTo({ left: Math.max(0, left), behavior: reduceMotion ? "auto" : "smooth" });
  };
  anim ? quietly(anim.finished, reveal) : reveal();
}

function closeSection() {
  if (current < 0) return;
  morphCards(() => {
    current = -1;
    cardEls.forEach((el) => el.classList.remove("active"));
  });
}

const step = (d) => openSection((Math.max(current, 0) + d + SECTIONS.length) % SECTIONS.length);
$("#prev").addEventListener("click", () => step(-1));
$("#next").addEventListener("click", () => step(1));

/* =========================================================================
   Reader (detail pages) — hash routes: #/work/<slug>, #/experience[/<id>]
   ========================================================================= */
let returnFocus = null;
let closing = null; // the running close animation, if any
let pendingOrigin = null; // card the page should expand out of
let navDir = 0; // +1 / -1 when moving to the next / previous page, for the slide direction
const readerOpen = () => !reader.hidden && !closing;

// Remember which card a page link was clicked in, so the page can grow out of it.
document.addEventListener(
  "click",
  (e) => {
    const card = e.target.closest(".card.active");
    if (card && e.target.closest('a[href^="#/"]')) pendingOrigin = card;
  },
  true
);

const FULL_CLIP = "inset(0px 0px 0px 0px round 0px)";
function clipTo(el) {
  const f = frameEl.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return `inset(${r.top - f.top}px ${f.right - r.right}px ${f.bottom - r.bottom}px ${r.left - f.left}px round 10px)`;
}

function showReader(origin) {
  reader.getAnimations({ subtree: true }).forEach((a) => a.cancel());
  reader.hidden = false;
  reader.classList.add("morphing");
  frameEl.classList.add("reading");
  frameEl.classList.remove("covered");

  let main;
  if (origin) {
    main = reader.animate(
      [
        { clipPath: clipTo(origin), backgroundColor: "#ffffff" },
        { clipPath: FULL_CLIP, backgroundColor: "#f7f6f3" },
      ],
      { duration: ms(650), easing: EASE }
    );
    for (const child of reader.children) {
      child.animate(
        [
          { opacity: 0, transform: "translateY(16px)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: ms(450), delay: ms(220), easing: EASE, fill: "backwards" }
      );
    }
  } else {
    main = reader.animate(
      [
        { opacity: 0, transform: "translateY(24px)" },
        { opacity: 1, transform: "none" },
      ],
      { duration: ms(450), easing: EASE }
    );
  }
  track(main);
  // Once the page fully covers the frame, stop rendering the blurred cards behind it.
  quietly(main.finished, () => {
    reader.classList.remove("morphing");
    frameEl.classList.add("covered");
  });
  toPip();
}

function hideReader() {
  frameEl.classList.remove("covered");
  reader.classList.add("morphing");

  const card = cardEls[current];
  const f = frameEl.getBoundingClientRect();
  const cr = card?.getBoundingClientRect();
  const cardVisible = cr && cr.right > f.left + 20 && cr.left < f.right - 20;

  for (const child of reader.children) {
    child.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms(160), easing: "ease-out", fill: "forwards" });
  }
  const anim = track(
    cardVisible
      ? reader.animate(
          [
            { clipPath: FULL_CLIP, backgroundColor: "#f7f6f3" },
            { clipPath: clipTo(card), backgroundColor: "#ffffff" },
          ],
          { duration: ms(520), easing: EASE, fill: "forwards" }
        )
      : reader.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms(260), easing: "ease-out", fill: "forwards" })
  );

  closing = anim;
  quietly(anim.finished, () => {
    if (closing !== anim) return;
    closing = null;
    reader.hidden = true;
    reader.classList.remove("morphing");
    reader.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    frameEl.classList.remove("reading");
  });
  fromPip();
}

function route() {
  const hash = location.hash;
  let m;
  let page = null;
  let jump = null;
  if ((m = hash.match(/^#\/work\/([\w-]+)/))) page = caseStudyPage(m[1]);
  else if ((m = hash.match(/^#\/experience(?:\/([\w-]+))?/))) {
    page = experiencePage();
    jump = m[1] && `exp-${m[1]}`;
  }

  if (!page) {
    pendingOrigin = null;
    if (readerOpen()) {
      hideReader();
      document.title = baseTitle;
      returnFocus?.focus({ preventScroll: true });
    }
    return;
  }

  const wasOpen = readerOpen();
  if (closing) closing = null; // reopened mid-close: showReader cancels the close animation
  if (!wasOpen) returnFocus = document.activeElement;
  reader.innerHTML = page.html;
  document.title = page.title;
  reader.scrollTop = 0;

  if (!wasOpen) {
    showReader(pendingOrigin?.isConnected ? pendingOrigin : null);
  } else {
    // Moving between pages: a short slide + crossfade in the direction of travel
    const from = navDir ? `translateX(${navDir * 32}px)` : "translateY(10px)";
    reader.querySelectorAll(".r-page, .r-toc").forEach((el) =>
      el.animate(
        [
          { opacity: 0, transform: from },
          { opacity: 1, transform: "none" },
        ],
        { duration: ms(360), easing: EASE }
      )
    );
  }
  navDir = 0;
  pendingOrigin = null;
  reader.querySelector("h1")?.focus({ preventScroll: true });
  if (jump) requestAnimationFrame(() => document.getElementById(jump)?.scrollIntoView({ block: "start" }));
  requestAnimationFrame(updateToc);
}

// Table of contents: highlight the section currently being read
let tocFrame = 0;
function updateToc() {
  tocFrame = 0;
  const items = reader.querySelectorAll("[data-toc]");
  if (!items.length || !items[0].offsetParent) return; // no TOC, or hidden on narrow screens

  const line = reader.getBoundingClientRect().top + reader.clientHeight * 0.3;
  let activeId = items[0].dataset.toc;
  for (const item of items) {
    const section = document.getElementById(item.dataset.toc);
    if (section && section.getBoundingClientRect().top <= line) activeId = item.dataset.toc;
  }
  // Short final sections never reach the line: highlight the last one at the bottom
  if (reader.scrollTop + reader.clientHeight >= reader.scrollHeight - 4) {
    activeId = items[items.length - 1].dataset.toc;
  }
  items.forEach((item) => {
    const on = item.dataset.toc === activeId;
    item.classList.toggle("active", on);
    if (on) item.setAttribute("aria-current", "true");
    else item.removeAttribute("aria-current");
  });
}
reader.addEventListener(
  "scroll",
  () => {
    if (!tocFrame) tocFrame = requestAnimationFrame(updateToc);
  },
  { passive: true }
);
window.addEventListener("resize", () => readerOpen() && updateToc());

function closeReader() {
  history.pushState(null, "", location.pathname + location.search);
  route();
}

reader.addEventListener("click", (e) => {
  const arrow = e.target.closest(".r-icon");
  if (arrow) navDir = arrow.getAttribute("aria-label") === "Next" ? 1 : -1;
  if (e.target.closest("[data-close]")) closeReader();
  const jump = e.target.closest("[data-jump]");
  if (jump) {
    document
      .getElementById(jump.dataset.jump)
      ?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }
  if (e.target.closest("[data-print]")) window.print();
});
window.addEventListener("hashchange", route);

window.addEventListener("keydown", (e) => {
  if (readerOpen()) {
    if (e.key === "Escape") closeReader();
    if (e.key === "ArrowLeft") navigate(-1);
    if (e.key === "ArrowRight") navigate(1);
    return;
  }
  if (e.target.closest?.("input, textarea")) return;
  if (e.key === "Escape") closeSection();
  if (e.key === "ArrowLeft") step(-1);
  if (e.key === "ArrowRight") step(1);
  const n = Number(e.key);
  if (n >= 1 && n <= SECTIONS.length) openSection(n - 1);
});

/* =========================================================================
   Floating webcam — the camera stage shrinks into a draggable window while reading.
   Positioned with transforms (GPU-composited) rather than left/top.
   ========================================================================= */
let pipState = null; // null | "pip" | "returning"
let pipPos = null; // saved preference
const cur = { x: 0, y: 0 }; // live position
let tilt = 0;
try {
  pipPos = JSON.parse(localStorage.getItem("pipPos"));
} catch {}

function pipSize() {
  const w = Math.round(Math.min(280, window.innerWidth * 0.38));
  const ratio = (video.videoHeight || 720) / (video.videoWidth || 1280);
  return { w, h: Math.round(w * ratio) };
}
function clampPip(x, y, w, h) {
  return {
    x: Math.min(Math.max(PIP_MARGIN, x), window.innerWidth - w - PIP_MARGIN),
    y: Math.min(Math.max(PIP_MARGIN, y), window.innerHeight - h - PIP_MARGIN),
  };
}
function placePip(x, y) {
  cur.x = x;
  cur.y = y;
  stage.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${tilt}deg)`;
}
function savePip() {
  pipPos = { x: Math.round(cur.x), y: Math.round(cur.y) };
  try {
    localStorage.setItem("pipPos", JSON.stringify(pipPos));
  } catch {}
}
function rectOf(el) {
  const b = el.getBoundingClientRect();
  return { x: b.left, y: b.top, w: b.width, h: b.height };
}
const keyframe = (r, radius, shadow) => ({
  transform: `translate3d(${r.x}px, ${r.y}px, 0)`,
  width: `${r.w}px`,
  height: `${r.h}px`,
  borderRadius: `${radius}px`,
  boxShadow: shadow,
});

function toPip() {
  if (!camReady || pipState === "pip") return;
  const from = rectOf(stage); // mid-animation rects are fine: animations affect layout
  stage.getAnimations().forEach((a) => a.cancel());
  stopGlide();
  tilt = 0;

  pipState = "pip";
  const { w, h } = pipSize();
  const base = pipPos ?? { x: window.innerWidth - w - 28, y: window.innerHeight - h - 28 };
  const p = clampPip(base.x, base.y, w, h);

  setMorphing(true);
  stage.classList.remove("returning");
  stage.classList.add("pip");
  stage.style.width = `${w}px`;
  stage.style.height = `${h}px`;
  placePip(p.x, p.y);

  const anim = track(
    stage.animate([keyframe(from, 18, SHADOW_NONE), keyframe({ x: p.x, y: p.y, w, h }, 14, SHADOW_PIP)], {
      duration: ms(650),
      easing: EASE,
    })
  );
  quietly(anim.finished, () => setMorphing(false));
}

function fromPip() {
  if (pipState !== "pip") return;
  endDrag();
  stopGlide();
  tilt = 0;

  const animating = stage.getAnimations().length > 0;
  const from = animating ? rectOf(stage) : { x: cur.x, y: cur.y, w: stage.offsetWidth, h: stage.offsetHeight };
  stage.getAnimations().forEach((a) => a.cancel());

  pipState = "returning";
  setMorphing(true);
  stage.classList.add("returning");
  const to = rectOf(frameEl);
  const anim = track(
    stage.animate([keyframe(from, 14, SHADOW_PIP), keyframe(to, 18, SHADOW_NONE)], {
      duration: ms(560),
      easing: EASE,
      fill: "forwards",
    })
  );
  quietly(anim.finished, () => {
    if (pipState !== "returning") return;
    pipState = null;
    stage.classList.remove("pip", "returning");
    stage.removeAttribute("style");
    anim.cancel();
    setMorphing(false);
  });
}

/* ---- Dragging with momentum ---- */
let drag = null;
let glide = 0;
const samples = []; // recent pointer positions, for release velocity

stage.addEventListener("pointerdown", (e) => {
  if (pipState !== "pip" || morphing || e.button !== 0) return;
  e.preventDefault();
  stopGlide();
  drag = { dx: e.clientX - cur.x, dy: e.clientY - cur.y, id: e.pointerId, w: stage.offsetWidth, h: stage.offsetHeight };
  samples.length = 0;
  samples.push({ x: e.clientX, y: e.clientY, t: e.timeStamp });
  stage.setPointerCapture(e.pointerId);
  stage.classList.add("dragging");
});

stage.addEventListener("pointermove", (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  samples.push({ x: e.clientX, y: e.clientY, t: e.timeStamp });
  while (samples.length > 2 && e.timeStamp - samples[0].t > 100) samples.shift();

  // Lean into the direction of travel
  const a = samples[Math.max(0, samples.length - 3)];
  const vx = (e.clientX - a.x) / Math.max(8, e.timeStamp - a.t);
  const target = reduceMotion ? 0 : Math.max(-MAX_TILT, Math.min(MAX_TILT, vx * TILT_PER_SPEED));
  tilt += (target - tilt) * 0.3;

  const p = clampPip(e.clientX - drag.dx, e.clientY - drag.dy, drag.w, drag.h);
  placePip(p.x, p.y);
});

function endDrag(e) {
  if (!drag) return;
  const { id } = drag;
  drag = null;
  try {
    stage.releasePointerCapture(id);
  } catch {}
  stage.classList.remove("dragging");

  // Release velocity from the last ~80ms of movement; none if the pointer had stopped.
  let vx = 0;
  let vy = 0;
  if (e?.type === "pointerup") {
    const recent = samples.filter((s) => e.timeStamp - s.t <= 80);
    if (recent.length >= 2) {
      const a = recent[0];
      const b = recent[recent.length - 1];
      const dt = Math.max(16, b.t - a.t);
      vx = (b.x - a.x) / dt;
      vy = (b.y - a.y) / dt;
      const speed = Math.hypot(vx, vy);
      if (speed > MAX_SPEED) {
        vx *= MAX_SPEED / speed;
        vy *= MAX_SPEED / speed;
      }
    }
  }

  if (reduceMotion || !e) {
    tilt = 0;
    placePip(cur.x, cur.y);
    savePip();
  } else {
    startGlide(vx, vy);
  }
}
stage.addEventListener("pointerup", endDrag);
stage.addEventListener("pointercancel", endDrag);

function startGlide(vx, vy) {
  stopGlide();
  const w = stage.offsetWidth;
  const h = stage.offsetHeight;
  let last = performance.now();

  const tick = (now) => {
    const dt = Math.min(32, now - last);
    last = now;

    let x = cur.x + vx * dt;
    let y = cur.y + vy * dt;
    const maxX = window.innerWidth - w - PIP_MARGIN;
    const maxY = window.innerHeight - h - PIP_MARGIN;
    if (x < PIP_MARGIN) (x = PIP_MARGIN), (vx = Math.abs(vx) * BOUNCE);
    else if (x > maxX) (x = maxX), (vx = -Math.abs(vx) * BOUNCE);
    if (y < PIP_MARGIN) (y = PIP_MARGIN), (vy = Math.abs(vy) * BOUNCE);
    else if (y > maxY) (y = maxY), (vy = -Math.abs(vy) * BOUNCE);

    const decay = Math.exp(-dt / GLIDE_TAU);
    vx *= decay;
    vy *= decay;

    const target = Math.max(-MAX_TILT, Math.min(MAX_TILT, vx * TILT_PER_SPEED));
    tilt += (target - tilt) * (1 - Math.exp(-dt / 70));

    if (Math.hypot(vx, vy) < 0.01 && Math.abs(tilt) < 0.03) {
      tilt = 0;
      placePip(x, y);
      glide = 0;
      savePip();
      return;
    }
    placePip(x, y);
    glide = requestAnimationFrame(tick);
  };
  glide = requestAnimationFrame(tick);
}
function stopGlide() {
  if (glide) cancelAnimationFrame(glide);
  glide = 0;
}

window.addEventListener("resize", () => {
  if (pipState !== "pip" || morphing) return;
  const p = clampPip(cur.x, cur.y, stage.offsetWidth, stage.offsetHeight);
  placePip(p.x, p.y);
});

/* =========================================================================
   Camera + model
   ========================================================================= */
let recognizer = null;
let camReady = false;

async function loadModel() {
  const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
  const opts = (delegate) => ({
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode: "VIDEO",
    numHands: 2,
  });
  try {
    recognizer = await GestureRecognizer.createFromOptions(fileset, opts("GPU"));
  } catch {
    recognizer = await GestureRecognizer.createFromOptions(fileset, opts("CPU"));
  }
}

async function startCamera() {
  startBtn.hidden = true;
  statusEl.textContent = "Requesting camera…";
  try {
    video.srcObject = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    await video.play();
    camReady = true;
    frameEl.classList.remove("no-cam");
    statusEl.textContent = recognizer ? "Show a gesture" : "Loading model…";
    if (readerOpen()) toPip();
  } catch (err) {
    console.warn(err);
    statusEl.textContent = "Camera off";
    startBtn.hidden = false;
  }
}
startBtn.addEventListener("click", startCamera);

route(); // open a deep link, if any, before the camera starts
startCamera();
loadModel()
  .then(() => camReady && (statusEl.textContent = "Show a gesture"))
  .catch((err) => {
    console.error(err);
    statusEl.textContent = "Gesture model unavailable";
  });

/* =========================================================================
   Gesture state machine
   ========================================================================= */
let holdGesture = null;
let holdStart = 0;
let firedGesture = null; // prevents re-firing until the gesture changes
let lastProgress = -1;

// `blocked`: the hand is moving or pinching, so a held pose shouldn't count yet.
function updateGesture(name, now, blocked) {
  // While reading, only the close gestures do anything.
  if (name && readerOpen() && !CLOSE_GESTURES.has(name)) name = null;

  if (name !== holdGesture) {
    holdGesture = name;
    holdStart = now;
    if (name !== firedGesture) firedGesture = null;
  }
  if (blocked) holdStart = now; // holds only accumulate while the hand is steady
  const progress = name && name !== firedGesture ? Math.min(1, (now - holdStart) / HOLD_MS) : 0;

  if (name && progress >= 1 && firedGesture !== name) {
    firedGesture = name;
    if (CLOSE_GESTURES.has(name)) {
      if (readerOpen()) closeReader();
      else closeSection();
    } else {
      const i = SECTIONS.findIndex((x) => x.gesture === name);
      if (i >= 0) openSection(i);
    }
  }
  if (!name) firedGesture = null;

  return progress;
}

function setProgressBar(progress) {
  // transform instead of width: no layout work every frame
  const shown = Math.round(progress * 100) / 100;
  if (shown !== lastProgress) {
    lastProgress = shown;
    progressFill.style.transform = `scaleX(${shown})`;
  }
}

/* =========================================================================
   Hands-free controls
   - A cursor follows the point between the thumb and index fingertips
   - Pinch = tap whatever is under the cursor; pinching while the Case Studies
     or Experience card is open opens its page
   - Pinch + drag on a page = scroll, with a little momentum
   ========================================================================= */
const CURSOR_GAIN = 1.2; // reach the frame edges without stretching to the camera's edge
const PINCH_ON = 0.25; // thumb–index distance ÷ palm length that starts a pinch
const PINCH_OFF = 0.38; // …and that releases it (the gap stops flicker)
const TAP_SLOP = 36; // px a pinch may wander and still count as a tap
const DRAG_START = 16; // px of movement before a pinch on a page becomes a scroll
const SCROLL_GAIN = 2.2;
const SCROLL_TAU = 260; // ms — scroll momentum after letting go
const STEADY_SPEED = 0.5; // palm speed (camera widths/s) above which gesture holds don't count
const LOST_GRACE = 150; // ms a hand can drop out of tracking before the cursor hides
const TRACK_JUMP = 0.12; // palm moving more than this (camera widths) in one frame = tracking glitch

// One Euro filter: smooths jitter when the hand is still, stays responsive when it moves.
class OneEuro {
  constructor(minCutoff = 1.2, beta = 0.004, dCutoff = 1) {
    Object.assign(this, { minCutoff, beta, dCutoff });
    this.reset();
  }
  reset() {
    this.x = null;
    this.dx = 0;
  }
  alpha(cutoff, dt) {
    return 1 / (1 + 1 / (2 * Math.PI * cutoff * dt));
  }
  filter(x, t) {
    if (this.x === null) {
      this.x = x;
      this.t = t;
      return x;
    }
    const dt = Math.max(1e-3, (t - this.t) / 1000);
    this.t = t;
    this.dx += this.alpha(this.dCutoff, dt) * ((x - this.x) / dt - this.dx);
    this.x += this.alpha(this.minCutoff + this.beta * Math.abs(this.dx), dt) * (x - this.x);
    return this.x;
  }
}

const cursorEl = $("#hand-cursor");
const fx = new OneEuro();
const fy = new OneEuro();
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
let frameBox = frameEl.getBoundingClientRect();
window.addEventListener("resize", () => (frameBox = frameEl.getBoundingClientRect()));

const hf = {
  visible: false,
  x: 0,
  y: 0,
  lastFresh: 0,
  lostAt: 0,
  trackStart: 0,
  steady: true,
  palm: [], // recent palm positions (normalized, mirrored)
  pinch: false,
  pinchFrames: 0,
  seenOpen: false, // a pinch must start from an open hand
  dragging: false,
  moved: 0,
  start: { x: 0, y: 0 },
  lastY: 0,
  scrollSamples: [],
  cooldownUntil: 0,
  hover: null,
};

// Normalized camera point → viewport point over the frame (mirrored, object-fit: cover, with gain).
function viewportPoint(nx, ny) {
  const vw = video.videoWidth || 1280;
  const vh = video.videoHeight || 720;
  const f = frameBox;
  const s = Math.max(f.width / vw, f.height / vh);
  const dw = vw * s;
  const dh = vh * s;
  const x = f.left + f.width / 2 + ((1 - nx) * dw - dw / 2) * CURSOR_GAIN;
  const y = f.top + f.height / 2 + (ny * dh - dh / 2) * CURSOR_GAIN;
  return { x: clamp(x, f.left + 6, f.right - 6), y: clamp(y, f.top + 6, f.bottom - 6) };
}

function handsFree(lms, gesture, now) {
  if (!lms) {
    if (!hf.lostAt) hf.lostAt = now;
    if (hf.visible && now - hf.lostAt > LOST_GRACE) releaseHand();
    return;
  }
  hf.lostAt = 0;
  if (now - hf.lastFresh > 250) resetTracking(now);
  hf.lastFresh = now;

  const vw = video.videoWidth || 1280;
  const vh = video.videoHeight || 720;
  const d = (a, b) => Math.hypot((lms[a].x - lms[b].x) * vw, (lms[a].y - lms[b].y) * vh);

  // Cursor sits between thumb and index tips, which barely moves as the fingers close
  const p = viewportPoint((lms[4].x + lms[8].x) / 2, (lms[4].y + lms[8].y) / 2);
  hf.x = fx.filter(p.x, now);
  hf.y = fy.filter(p.y, now);

  // Palm motion → steadiness (gesture holds only count while the hand is still)
  const px = 1 - lms[9].x;
  const py = lms[9].y;
  const prev = hf.palm[hf.palm.length - 1];
  if (prev && Math.hypot(px - prev.x, py - prev.y) > TRACK_JUMP) {
    // Faster than a hand can move: tracking jumped (e.g. to the other hand). Start fresh.
    resetTracking(now);
    const q = viewportPoint((lms[4].x + lms[8].x) / 2, (lms[4].y + lms[8].y) / 2);
    hf.x = fx.filter(q.x, now);
    hf.y = fy.filter(q.y, now);
  }
  hf.palm.push({ x: px, y: py, t: now });
  while (hf.palm.length > 1 && now - hf.palm[0].t > 400) hf.palm.shift();
  const ref = hf.palm.find((s) => now - s.t <= 150) ?? hf.palm[0];
  hf.steady = Math.hypot(px - ref.x, py - ref.y) / (Math.max(50, now - ref.t) / 1000) < STEADY_SPEED;

  // Pinch, with hysteresis. A fist also brings thumb and index together, so rule that out.
  const ratio = d(4, 8) / (d(0, 9) || 1);
  if (ratio > PINCH_OFF) hf.seenOpen = true;
  const indexExtended = d(0, 8) > 1.1 * d(0, 5);
  const pinching = hf.pinch
    ? ratio < PINCH_OFF
    : ratio < PINCH_ON && hf.seenOpen && indexExtended && gesture !== "Closed_Fist";

  if (pinching && !hf.pinch) {
    if (++hf.pinchFrames >= 2) pinchStart(now);
  } else if (!pinching) {
    hf.pinchFrames = 0;
    if (hf.pinch) pinchEnd(now);
  }
  if (hf.pinch) pinchMove(now);

  showCursor(true);
  if (!hf.dragging) updateHover();
}

function resetTracking(now) {
  if (hf.pinch) pinchEnd(now, true);
  holdStart = now; // a newly acquired (or jumped) hand must hold a pose for the full time
  hf.palm.length = 0;
  hf.trackStart = now;
  hf.seenOpen = false;
  fx.reset();
  fy.reset();
}

function releaseHand() {
  if (hf.pinch) pinchEnd(performance.now(), true);
  hf.pinchFrames = 0;
  hf.seenOpen = false;
  hf.palm.length = 0;
  hf.steady = true;
  fx.reset();
  fy.reset();
  showCursor(false);
}

function showCursor(on) {
  if (on) cursorEl.style.transform = `translate3d(${hf.x}px, ${hf.y}px, 0)`;
  if (on === hf.visible) return;
  hf.visible = on;
  cursorEl.classList.toggle("on", on);
  if (!on) setHover(null);
}

const HOVERABLE = "a[href], button, [data-jump], .card";
function updateHover() {
  setHover(document.elementFromPoint(hf.x, hf.y)?.closest(HOVERABLE) ?? null);
}
function setHover(target) {
  if (target === hf.hover) return;
  hf.hover?.classList.remove("hand-hover");
  target?.classList.add("hand-hover");
  hf.hover = target;
  cursorEl.classList.toggle("over", !!target);
}

/* ---- Pinch ---- */
function pinchStart(now) {
  hf.pinch = true;
  hf.dragging = false;
  hf.moved = 0;
  hf.start = { x: hf.x, y: hf.y };
  hf.lastY = hf.y;
  hf.scrollSamples = [{ y: hf.y, t: now }];
  stopScrollGlide();
  cursorEl.classList.add("pinch");
}

function pinchMove(now) {
  hf.moved = Math.max(hf.moved, Math.hypot(hf.x - hf.start.x, hf.y - hf.start.y));
  if (!hf.dragging && readerOpen() && hf.moved > DRAG_START) {
    hf.dragging = true;
    cursorEl.classList.add("grab");
    setHover(null);
  }
  if (hf.dragging) {
    reader.scrollTop -= (hf.y - hf.lastY) * SCROLL_GAIN;
    hf.scrollSamples.push({ y: hf.y, t: now });
    while (hf.scrollSamples.length > 2 && now - hf.scrollSamples[0].t > 100) hf.scrollSamples.shift();
  }
  hf.lastY = hf.y;
}

function pinchEnd(now, cancelled = false) {
  hf.pinch = false;
  hf.pinchFrames = 0;
  hf.cooldownUntil = now + 300;
  cursorEl.classList.remove("pinch", "grab");
  const wasDragging = hf.dragging;
  hf.dragging = false;
  if (cancelled) return;

  if (wasDragging) {
    const a = hf.scrollSamples[0];
    const b = hf.scrollSamples[hf.scrollSamples.length - 1];
    const v = b.t > a.t ? (-(b.y - a.y) / (b.t - a.t)) * SCROLL_GAIN : 0;
    glideScroll(clamp(v, -3, 3));
  } else if (hf.moved < TAP_SLOP) {
    pinchTap(hf.start);
  }
}

function pinchTap(pt) {
  pulse();
  const el = document.elementFromPoint(pt.x, pt.y);
  const target = el?.closest("a[href], button, [data-jump]");
  const card = el?.closest(".card");
  const sec = current >= 0 ? SECTIONS[current] : null;

  if (target) return target.click();
  if (card) {
    const i = cardEls.indexOf(card);
    if (i === current && sec?.pinchHref) return openPage(card, sec.pinchHref);
    return openSection(i);
  }
  // Pinching anywhere while Case Studies / Experience is open expands that card
  if (!readerOpen() && sec?.pinchHref) openPage(cardEls[current], sec.pinchHref);
}

function openPage(card, href) {
  if (location.hash === href) return;
  pendingOrigin = card;
  location.hash = href;
}

function pulse() {
  cursorEl.querySelector("b").animate(
    [
      { opacity: 0.9, transform: "scale(1)" },
      { opacity: 0, transform: "scale(2.2)" },
    ],
    { duration: ms(450), easing: "ease-out" }
  );
}

let scrollGlide = 0;
function glideScroll(v) {
  stopScrollGlide();
  if (reduceMotion || Math.abs(v) < 0.05) return;
  let last = performance.now();
  const tick = (t) => {
    const dt = Math.min(32, t - last);
    last = t;
    reader.scrollTop += v * dt;
    v *= Math.exp(-dt / SCROLL_TAU);
    if (Math.abs(v) < 0.02 || !readerOpen()) return (scrollGlide = 0);
    scrollGlide = requestAnimationFrame(tick);
  };
  scrollGlide = requestAnimationFrame(tick);
}
function stopScrollGlide() {
  if (scrollGlide) cancelAnimationFrame(scrollGlide);
  scrollGlide = 0;
}

// Next / previous in whatever context is on screen (keyboard ← →).
function navigate(dir) {
  if (!readerOpen()) return step(dir);

  const m = location.hash.match(/^#\/work\/([\w-]+)/);
  if (m) {
    const i = CASES.findIndex((c) => c.slug === m[1]);
    if (i < 0) return;
    navDir = dir;
    location.hash = `#/work/${CASES[(i + dir + CASES.length) % CASES.length].slug}`;
    return;
  }
  if (/^#\/experience/.test(location.hash)) jumpRole(dir);
}

function jumpRole(dir) {
  const roles = [...reader.querySelectorAll(".r-role")];
  if (!roles.length) return;
  const line = reader.getBoundingClientRect().top + 84;
  let idx = -1;
  roles.forEach((r, k) => {
    if (r.getBoundingClientRect().top <= line) idx = k;
  });
  const next = idx + dir;
  const behavior = reduceMotion ? "auto" : "smooth";
  if (next < 0) reader.scrollTo({ top: 0, behavior });
  else if (next < roles.length) roles[next].scrollIntoView({ behavior, block: "start" });
}

function handLabel() {
  if (hf.pinch) return hf.dragging ? "Scrolling" : "Pinch";
  return null;
}

/* =========================================================================
   Drawing
   ========================================================================= */
// Map a normalized landmark into stage space, matching object-fit: cover + mirror.
function toScreen(lm) {
  const vw = video.videoWidth || 1280;
  const vh = video.videoHeight || 720;
  const s = Math.max(W / vw, H / vh);
  const dw = vw * s;
  const dh = vh * s;
  return { x: (W - dw) / 2 + (1 - lm.x) * dw, y: (H - dh) / 2 + lm.y * dh };
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function drawHand(points, gesture, progress, override) {
  // Scale the overlay down when the camera is the small floating window
  const s = Math.min(1, Math.max(0.4, W / 700));

  // Skeleton
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 1.25 * s;
  ctx.beginPath();
  for (const [a, b] of HAND_EDGES) {
    ctx.moveTo(points[a].x, points[a].y);
    ctx.lineTo(points[b].x, points[b].y);
  }
  ctx.stroke();
  ctx.fillStyle = "#fff";
  for (const p of points) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.5 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  // Bounding box
  const pad = 30 * s;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x0 = Math.min(...xs) - pad;
  const y0 = Math.min(...ys) - pad;
  const w = Math.max(...xs) + pad - x0;
  const h = Math.max(...ys) + pad - y0;
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 1.25;
  roundRect(x0, y0, w, h, 12 * s);
  ctx.fill();
  ctx.stroke();

  // In the floating window there's no room for a label: show hold progress along the box instead
  if (s < 0.6) {
    if (progress > 0) {
      ctx.fillStyle = "#fff";
      ctx.fillRect(x0, y0 + h + 3, w * progress, 2);
    }
    return;
  }

  // Label pill
  const section = SECTIONS.find((sec) => sec.gesture === gesture);
  const text = override ?? (section ? section.label : CLOSE_GESTURES.has(gesture) ? "Close" : "Hand detected");
  ctx.font = `500 12px ${FONT}`;
  const tw = ctx.measureText(text).width + 20;
  const ly = y0 - 34;
  ctx.fillStyle = "#fff";
  roundRect(x0, ly, tw, 26, 6);
  ctx.fill();
  ctx.fillStyle = "#16140f";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x0 + 10, ly + 13.5);

  // Hold progress along the bottom of the pill
  if (progress > 0) {
    ctx.fillStyle = "#16140f";
    ctx.fillRect(x0 + 6, ly + 22, (tw - 12) * progress, 1.5);
  }
}

/* =========================================================================
   Loop
   ========================================================================= */
let lastVideoTime = -1;
let lastResult = null;
let drewHands = false;

function frame(now) {
  let fresh = false;
  // Skip inference during big transitions: it is the heaviest per-frame work on the page.
  if (
    bigTransitions === 0 &&
    recognizer &&
    camReady &&
    video.readyState >= 2 &&
    video.currentTime !== lastVideoTime
  ) {
    lastVideoTime = video.currentTime;
    try {
      lastResult = recognizer.recognizeForVideo(video, now);
      fresh = true;
    } catch (e) {
      console.warn(e);
    }
  }

  const hands = (lastResult?.landmarks || []).map((lms, i) => {
    const g = lastResult.gestures?.[i]?.[0];
    const ok = g && g.score >= MIN_SCORE && g.categoryName !== "None";
    return { points: lms.map(toScreen), gesture: ok ? g.categoryName : null, score: g?.score ?? 0 };
  });

  // Hands-free cursor, pinch and pointing follow the first tracked hand, on new camera frames only
  if (fresh) {
    handsFree(lastResult.landmarks?.[0] ?? null, lastResult.gestures?.[0]?.[0]?.categoryName ?? null, now);
  } else if (hf.visible && bigTransitions === 0 && now - hf.lastFresh > 400) {
    releaseHand(); // camera stalled
  }

  const primary = hands.filter((h) => h.gesture).sort((a, b) => b.score - a.score)[0];
  // Pose holds pause while pinching or moving
  const blocked = hf.pinch || now < hf.cooldownUntil || !hf.steady;
  const progress = updateGesture(primary?.gesture ?? null, now, blocked);
  setProgressBar(progress);

  if (!morphing && (hands.length || drewHands)) {
    ctx.clearRect(0, 0, W, H);
    hands.forEach((h, i) => {
      const p = h === primary ? progress : 0;
      drawHand(h.points, h.gesture, p, i === 0 ? handLabel() : null);
    });
    drewHands = hands.length > 0;
  }

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
