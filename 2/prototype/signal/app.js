// Signal — an NDA-safe rebuild of an analytics dashboard prototype.
// All names and numbers are fictional. Vanilla JS: hash routes, string
// templates and small SVG chart helpers.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const app = $("#app"), view = $("#view"), topbar = $("#topbar"), scroller = $("#scroll");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const fmt = (n) => Math.round(n).toLocaleString("en-US");
  const I = (d, cls = "i") => `<svg class="${cls}" viewBox="0 0 24 24">${d}</svg>`;
  const ic = {
    plus: I('<path d="M12 5v14M5 12h14"/>'), x: I('<path d="M6 6l12 12M18 6 6 18"/>'), check: I('<path d="M5 12.5l4.5 4.5L19 7.5"/>', "i tick"),
    grip: I('<circle cx="9" cy="6" r=".8"/><circle cx="15" cy="6" r=".8"/><circle cx="9" cy="12" r=".8"/><circle cx="15" cy="12" r=".8"/><circle cx="9" cy="18" r=".8"/><circle cx="15" cy="18" r=".8"/>'),
    dots: I('<circle cx="5" cy="12" r=".9"/><circle cx="12" cy="12" r=".9"/><circle cx="19" cy="12" r=".9"/>'),
    cal: I('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'), cv: I('<path d="m6 9 6 6 6-6"/>', "i cv"),
    search: I('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'), edit: I('<path d="M4 20h4L19 9l-4-4L4 16z"/>'),
    share: I('<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13"/>'), down: I('<path d="M12 4v12M6 12l6 6 6-6M4 20h16"/>'),
    line: I('<path d="M3 17l5-6 4 3 4-7 5 5"/>'), bar: I('<path d="M5 20V11M10 20V5M15 20v-6M20 20V9"/>'), num: I('<path d="M5 9h14M5 15h14M10 4 8 20M16 4l-2 16"/>'), list: I('<path d="M4 6h16M4 12h11M4 18h7"/>'),
    up: I('<path d="M7 17 17 7M9 7h8v8"/>'), dn: I('<path d="M7 7l10 10M17 9v8H9"/>'), db: I('<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/>'),
    folder: I('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'), tw: I('<path d="m6 9 6 6 6-6"/>', "i tw"),
    back: I('<path d="m15 18-6-6 6-6"/>'), copy: I('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>'),
    refresh: I('<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>'), sort: I('<path d="m8 9 4-4 4 4M8 15l4 4 4-4"/>'), filter: I('<path d="M4 5h16l-6 8v6l-4-2v-4z"/>'),
    trash: I('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  };
  const glyph = { line: ic.line, bar: ic.bar, number: ic.num, breakdown: ic.list };

  /* ------------------------------------------------------------- sample data */
  const rng = (seed) => () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const series = (seed, n, base, spread) => { const r = rng(seed); return Array.from({ length: n }, (_, i) => base + (r() - 0.5) * spread + Math.sin(i / 2.3) * spread * 0.3); };
  const END = new Date(2026, 9, 13);
  const dateOf = (back) => { const d = new Date(END); d.setDate(d.getDate() - back); return d; };
  const short = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const labels = (n) => Array.from({ length: n }, (_, i) => { const d = dateOf(n - 1 - i); return n > 7 ? short(d) : d.toLocaleDateString("en-US", { weekday: "short" }); });
  const longDate = (back) => dateOf(back).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  const M = {
    calls: { name: "Calls answered", cat: "Support", rec: "Call", kind: "line", seed: 3, base: 9800, spread: 3000, f: (v) => fmt(v), sum: true, def: "Calls picked up by an agent, counted once per call." },
    rating: { name: "Average call rating", cat: "Support", rec: "Call", kind: "bar", seed: 7, base: 4.35, spread: 0.6, f: (v) => v.toFixed(2), target: 4.5, def: "Mean post-call survey score from 1 to 5." },
    handle: { name: "Average handle time", cat: "Support", rec: "Call", kind: "number", seed: 11, base: 252, spread: 40, f: (v) => `${Math.floor(v / 60)}m ${String(Math.round(v % 60)).padStart(2, "0")}s`, def: "Talk, hold and wrap-up time per answered call." },
    delay: { name: "Answer delay", cat: "Support", rec: "Call", kind: "line", seed: 13, base: 38, spread: 22, f: (v) => `${Math.round(v)}s`, def: "Seconds from ring to pickup." },
    chats: { name: "Chats started", cat: "Support", rec: "Chat", kind: "bar", seed: 17, base: 2100, spread: 900, f: (v) => fmt(v), sum: true, def: "Conversations opened from web or app." },
    callbacks: { name: "Callbacks requested", cat: "Support", rec: "Callback", kind: "line", seed: 19, base: 640, spread: 260, f: (v) => fmt(v), sum: true, def: "Customers who chose a callback over waiting." },
    jobs: { name: "Jobs by reason", cat: "Field service", rec: "Job", kind: "breakdown", seed: 23, base: 1300, spread: 300, f: (v) => fmt(v), sum: true, def: "Dispatched jobs, grouped by reason." },
    arrive: { name: "Time to arrive", cat: "Field service", rec: "Job", kind: "line", seed: 29, base: 41, spread: 16, f: (v) => `${Math.round(v)}m`, def: "Minutes from dispatch to arrival." },
  };
    const lowerIsBetter = new Set(["handle", "delay", "arrive"]);
  const vals = (id, n, prev = 0) => series(M[id].seed + n + prev * 7, n, M[id].base * (prev ? (lowerIsBetter.has(id) ? 1.06 : 0.93) : 1), M[id].spread);
  const REASONS = [["Battery", 5120], ["Flat tire", 4660], ["Lockout", 4255], ["Out of fuel", 1970], ["Tow", 1410]];
  const KPI = {
    "1": [["Calls answered", 9842, 3.1, "calls"], ["Avg handle time", "4m 06s", -2.4, "handle", true], ["Avg call rating", "4.61", 2.0, "rating"], ["Jobs dispatched", 1304, -2.4, "arrive"]],
    "7": [["Calls answered", 68412, 4.2, "calls"], ["Avg handle time", "4m 12s", -3.1, "handle", true], ["Avg call rating", "4.52", 4.6, "rating"], ["Jobs dispatched", 9120, -1.1, "arrive"]],
    "30": [["Calls answered", 291880, 6.8, "calls"], ["Avg handle time", "4m 19s", 1.2, "handle", true], ["Avg call rating", "4.44", 0, "rating"], ["Jobs dispatched", 38940, 2.0, "arrive"]],
  };

  /* -------------------------------------------------------------------- state */
  let uid = 20;
  const seed = () => [
    { id: "s1", title: "Support", w: [{ id: "w1", m: "calls", k: "line", ann: 2 }, { id: "w2", m: "rating", k: "bar" }] },
    { id: "s2", title: "Field service", w: [{ id: "w3", m: "jobs", k: "breakdown" }, { id: "w4", m: "handle", k: "number" }] },
  ];
  const S = { range: "7", compare: true, sections: seed(), editing: false, snap: null, target: null };
  const rangeName = { "1": "Today", "7": "Last 7 days", "30": "Last 30 days" };
  const days = () => (S.range === "1" ? 7 : +S.range);
  const rangeDates = () => (S.range === "1" ? short(END) : `${short(dateOf(+S.range - 1))} – ${short(END)}`);
  const prevDates = () => `${short(dateOf(2 * days() - 1))} – ${short(dateOf(days()))}`;

  /* ------------------------------------------------------------------- charts */
  const niceMax = (v) => { const p = 10 ** Math.floor(Math.log10(v)); return Math.ceil(v / (p / 2)) * (p / 2); };
  const tick = (v) => (v >= 1000 ? `${+(v / 1000).toFixed(1)}k` : +v.toFixed(2));
  function lineSVG(cur, prev, labs, { w = 560, h = 190, ann } = {}) {
    const L = 34, R = 6, T = 10, B = 22, all = prev ? cur.concat(prev) : cur;
    const max = niceMax(Math.max(...all) * 1.04), min = Math.max(0, Math.floor((Math.min(...all) * 0.85) / (max / 8)) * (max / 8));
    const x = (i) => L + (i * (w - L - R)) / (cur.length - 1), y = (v) => T + (1 - (v - min) / (max - min)) * (h - T - B);
    const path = (a) => a.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
    let len = 0; for (let i = 1; i < cur.length; i++) len += Math.hypot(x(i) - x(i - 1), y(cur[i]) - y(cur[i - 1]));
    const grid = [0, 1 / 3, 2 / 3, 1].map((f) => { const v = min + (max - min) * f; return `<line class="gl" x1="${L}" x2="${w - R}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${L - 6}" y="${y(v) + 3.5}" text-anchor="end">${tick(v)}</text>`; }).join("");
    const st = Math.ceil(cur.length / 7);
    const xl = labs.map((l, i) => (i % st === 0 || i === labs.length - 1 ? `<text class="ax" x="${x(i)}" y="${h - 5}" text-anchor="${i === 0 ? "start" : i === labs.length - 1 ? "end" : "middle"}">${l}</text>` : "")).join("");
    const a = ann != null && ann < cur.length ? `<line class="ann" x1="${x(ann)}" x2="${x(ann)}" y1="${T}" y2="${h - B}"/><text class="annl" x="${x(ann) + 5}" y="${T + 9}">Launch</text>` : "";
    return `<svg class="chart" viewBox="0 0 ${w} ${h}" data-kind="line" data-plot="${L},${w - R},${T},${h - B},${min},${max}" style="--len:${len | 0}"><defs><linearGradient id="g-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--brand)" stop-opacity=".14"/><stop offset="1" stop-color="var(--brand)" stop-opacity="0"/></linearGradient></defs>${grid}${xl}${a}${prev ? `<path class="cmp" d="${path(prev)}"/>` : ""}<path class="ar" d="${path(cur)}L${x(cur.length - 1)},${h - B}L${L},${h - B}Z"/><path class="ln" d="${path(cur)}"/><line class="hl" x1="-99" x2="-99" y1="${T}" y2="${h - B}"/><circle class="hd" r="4" cx="-99" cy="0"/></svg>`;
  }
  function barSVG(cur, labs, { w = 560, h = 190, target } = {}) {
    const L = 34, R = 6, T = 10, B = 22, n = cur.length, big = Math.max(...cur) > 10;
    const max = big ? niceMax(Math.max(...cur) * 1.05) : 5, min = big ? 0 : Math.floor(Math.min(...cur) - 0.5);
    const bw = ((w - L - R) / n) * 0.56, x = (i) => L + ((i + 0.5) * (w - L - R)) / n, y = (v) => T + (1 - (v - min) / (max - min)) * (h - T - B);
    const grid = [0, 1 / 3, 2 / 3, 1].map((f) => { const v = min + (max - min) * f; return `<line class="gl" x1="${L}" x2="${w - R}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${L - 6}" y="${y(v) + 3.5}" text-anchor="end">${tick(v)}</text>`; }).join("");
    const st = Math.ceil(n / 7);
    return `<svg class="chart" viewBox="0 0 ${w} ${h}" data-kind="bar" data-plot="${L},${w - R}">${grid}${labs.map((l, i) => (i % st === 0 ? `<text class="ax" x="${x(i)}" y="${h - 5}" text-anchor="middle">${l}</text>` : "")).join("")}${cur.map((v, i) => `<rect class="bar" style="--i:${i}" x="${x(i) - bw / 2}" y="${y(v)}" width="${bw}" height="${h - B - y(v)}" rx="${Math.min(4, bw / 4)}"/>`).join("")}${target ? `<line class="tgt" x1="${L}" x2="${w - R}" y1="${y(target)}" y2="${y(target)}"/><text class="tgl" x="${w - R}" y="${y(target) - 5}" text-anchor="end">Target ${target}</text>` : ""}</svg>`;
  }
  const sparkSVG = (a) => { const mx = Math.max(...a), mn = Math.min(...a); return `<svg class="spark" viewBox="0 0 72 26"><path d="${a.map((v, i) => `${i ? "L" : "M"}${((i * 72) / (a.length - 1)).toFixed(1)},${(23 - ((v - mn) / (mx - mn || 1)) * 20).toFixed(1)}`).join("")}"/></svg>`; };
  const delta = (p, invert) => { if (!p) return `<span class="delta flat">0.0%</span>`; const good = invert ? p < 0 : p > 0; return `<span class="delta ${good ? "up" : "down"}">${p > 0 ? ic.up : ic.dn}${Math.abs(p).toFixed(1)}%</span>`; };

  function widgetInner(wd, n = days()) {
    const m = M[wd.m], cur = vals(wd.m, n), prev = S.compare ? vals(wd.m, n, 1) : null;
    const agg = (a) => (m.sum ? a.reduce((x, y) => x + y, 0) : a.reduce((x, y) => x + y, 0) / a.length);
    const total = agg(cur), pct = prev ? ((total - agg(prev)) / agg(prev)) * 100 : 0;
    const head = `<div class="w-value"><b>${m.f(total)}</b>${prev ? delta(+pct.toFixed(1), lowerIsBetter.has(wd.m)) : ""}</div>`;
    const leg = prev ? `<div class="legend"><span><i></i>${rangeDates()}</span><span><i class="cmp"></i>${prevDates()}</span></div>` : "";
    if (wd.k === "line") return head + lineSVG(cur, prev, labels(n), { ann: wd.ann, w: wd.wide ? 1160 : 560 }) + leg;
    if (wd.k === "bar") return head + barSVG(cur, labels(n), { target: m.target, w: wd.wide ? 1160 : 560 });
    if (wd.k === "breakdown") {
      const sum = REASONS.reduce((a, r) => a + r[1], 0);
      return `<div class="w-value"><b>${fmt(sum)}</b>${delta(-1.1)}</div><div class="breakdown"><div class="row h"><span>Reason</span><span>Share</span><span>Jobs</span></div>${REASONS.map(([k, v], i) => `<div class="row"><span class="nm">${k}<span class="bar"><i style="--i:${i};width:${(v / REASONS[0][1]) * 100}%"></i></span></span><span>${Math.round((v / sum) * 100)}%</span><span>${fmt(v)}</span></div>`).join("")}</div>`;
    }
    return `<div class="big">${m.f(total)}</div>${prev ? `<div>${delta(+pct.toFixed(1), lowerIsBetter.has(wd.m))} <span style="color:var(--text-3)">vs ${prevDates()}</span></div>` : ""}<div style="margin-top:16px">${sparkSVG(cur).replace("<svg", '<svg preserveAspectRatio="none"')}</div>`;
  }
  function widgetHTML(wd, { enter, n } = {}) {
    const m = M[wd.m];
    return `<article class="card widget draw ${enter ? "enter" : ""}" data-w="${wd.id}" data-m="${wd.m}" data-n="${n || days()}">
      <div class="w-head"><button class="handle" type="button" aria-label="Drag to reorder">${ic.grip}</button><h3 class="dotted" title="${esc(m.def)}">${m.name}</h3>
      <button class="more" type="button" data-act="${S.editing ? "remove" : "card-menu"}" aria-label="${S.editing ? "Remove card" : "Card options"}">${S.editing ? ic.x : ic.dots}</button></div>
      ${widgetInner(wd, n || days())}<div class="tip"></div></article>`;
  }

  /* ------------------------------------------------------------------- toasts */
  function toast(msg, undo) {
    const t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button type="button" data-u>Undo</button>' : ""}<button class="x" type="button" aria-label="Dismiss">${ic.x}</button>`;
    $(".toasts").append(t);
    const close = () => { if (t.classList.contains("out")) return; t.classList.add("out"); setTimeout(() => t.remove(), 200); };
    t.addEventListener("click", (e) => { if (e.target.closest("[data-u]")) undo(); if (e.target.closest("button")) close(); });
    setTimeout(close, 4000);
  }

  /* -------------------------------------------------------------------- menus */
  let openMenu = null;
  function menu(anchor, items, onPick) {
    closeMenu();
    const m = document.createElement("div");
    m.className = "menu";
    m.setAttribute("role", "menu");
    m.innerHTML = items.map((it) => (it === "-" ? "<hr>" : `<button type="button" role="menuitemradio" aria-checked="${!!it.on}" data-v="${it.v}">${it.icon || ""}${esc(it.l)}${it.meta != null ? `<span class="meta">${it.meta}</span>` : ""}${ic.check}</button>`)).join("");
    document.body.append(m);
    const r = anchor.getBoundingClientRect();
    m.style.top = `${r.bottom + 6}px`;
    m.style.left = `${Math.max(12, Math.min(innerWidth - m.offsetWidth - 12, r.left))}px`;
    m.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { onPick(b.dataset.v); closeMenu(); } });
    openMenu = m;
    setTimeout(() => document.addEventListener("pointerdown", outside), 0);
  }
  const outside = (e) => { if (openMenu && !openMenu.contains(e.target)) closeMenu(); };
  function closeMenu() { openMenu?.remove(); openMenu = null; document.removeEventListener("pointerdown", outside); }

  /* ---------------------------------------------------------------- dashboard */
  function dashTopbar() {
    topbar.innerHTML = `<div class="crumbs">Dashboards<span class="sep">/</span><b>Operations overview</b></div>
      <div class="right"><button class="btn" type="button" data-act="range">${ic.cal}${rangeName[S.range]}<span style="color:var(--text-3);font-weight:400">${rangeDates()}</span>${ic.cv}</button>
      <button class="chip ${S.compare ? "set" : ""}" type="button" data-act="compare">${S.compare ? "vs previous period" : "No comparison"}</button>
      <button class="btn ghost icon" type="button" data-act="share" aria-label="Share">${ic.share}</button>
      <button class="btn dark" type="button" data-act="edit">${ic.edit}Edit</button></div>`;
  }
  const kpiHTML = () => KPI[S.range].map(([l, v, p, m, inv], i) => `<article class="card kpi" style="--i:${i}"><div class="label dotted">${l}</div><div class="val"><b data-count="${typeof v === "number" ? v : ""}">${typeof v === "number" ? fmt(v) : v}</b>${delta(p, inv)}</div><small>vs ${S.range === "1" ? "yesterday" : "previous period"}</small>${sparkSVG(vals(m, 12))}</article>`).join("");
  const dropHint = () => `<div class="drop-hint">Pick a metric from the library to add it here</div>`;
  const sectionHTML = (s) => `<section class="section" data-s="${s.id}"><div class="section-head"><h2>${esc(s.title)}</h2><span class="tools"><button class="btn ghost icon" type="button" data-act="del-section" aria-label="Delete section">${ic.trash}</button></span></div><div class="grid">${s.w.map((w) => widgetHTML(w)).join("") || (S.editing ? dropHint() : "")}</div></section>`;
  function renderDashboard() {
    dashTopbar();
    view.innerHTML = `<div class="page dash ${S.editing ? "editing" : ""}">
      <div class="title"><div><h1>Operations overview</h1><p>Shared with 12 people · updated 2 minutes ago</p></div></div>
      <div class="kpis">${kpiHTML()}</div>
      <div class="sections">${S.sections.length ? S.sections.map(sectionHTML).join("") : emptyHTML()}</div></div>`;
    countUp($$("[data-count]", view));
  }
  function emptyHTML() {
    const picks = [{ m: "calls", k: "line" }, { m: "rating", k: "bar" }, { m: "handle", k: "number" }];
    return `<div class="empty"><div class="art"><i></i><i></i><i></i><i></i><i></i></div><h2>Build this dashboard</h2><p>Add metrics your team already tracks, or create a card from scratch. Everyone you share it with sees the same view.</p><div style="display:flex;gap:8px"><button class="btn dark" type="button" data-act="start-edit">${ic.plus}Add from library</button><button class="btn" type="button" data-act="custom">Create a card</button></div></div>
      <div class="section-head"><h2>Suggested for you</h2></div>
      <div class="suggest">${picks.map((p) => `<article class="card widget" data-act="quick" data-m="${p.m}" data-k="${p.k}" tabindex="0" role="button" aria-label="Add ${M[p.m].name}"><div class="w-head"><h3>${M[p.m].name}</h3><span class="more">${ic.plus}</span></div>${widgetInner({ m: p.m, k: p.k }, 7).replace(/<div class="legend">[\s\S]*?<\/div>/, "")}</article>`).join("")}</div>`;
  }
  function countUp(els) {
    els.forEach((el) => {
      const target = +el.dataset.count;
      if (!target || calm) return;
      const t0 = performance.now();
      const step = (t) => { const p = Math.min(1, (t - t0) / 800), e = 1 - (1 - p) ** 3; el.textContent = fmt(target * e); if (p < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
  }
  function refreshData() {
    dashTopbar();
    if (S.editing) showUnsaved(true);
    $(".kpis", view).innerHTML = kpiHTML();
    countUp($$(".kpis [data-count]", view));
    $$(".widget[data-w]", view).forEach((el) => { const wd = findW(el.dataset.w); if (wd) el.outerHTML = widgetHTML(wd); });
  }
  const findW = (id) => { for (const s of S.sections) { const w = s.w.find((x) => x.id === id); if (w) return w; } };

  /* Edit mode: unsaved bar in the top bar, a library panel, drag to reorder */
  function showUnsaved(instant) {
    $(".right", topbar).style.visibility = "hidden";
    topbar.insertAdjacentHTML("beforeend", `<div class="unsaved" style="${instant ? "animation:none" : ""}">${ic.edit}Unsaved changes<button class="btn" type="button" data-act="discard">Discard</button><button class="btn save" type="button" data-act="save">Save</button></div>`);
  }
  function enterEdit() {
    if (S.editing || !$(".dash", view)) return;
    S.editing = true;
    S.snap = JSON.parse(JSON.stringify(S.sections));
    if (!S.sections.length) S.sections.push({ id: "s" + ++uid, title: "Support", w: [] });
    S.target = S.sections[0].id;
    app.classList.add("editing-app");
    renderLibrary();
    $(".dash", view).classList.add("editing");
    $(".sections", view).innerHTML = S.sections.map(sectionHTML).join("");
    $(".sections", view).insertAdjacentHTML("afterend", `<div class="add-section"><button class="btn dark" type="button" data-act="add-section">${ic.plus}Add section</button></div>`);
    showUnsaved();
    markAdded();
  }
  function exitEdit(save) {
    if (!save) S.sections = S.snap;
    S.editing = false;
    app.classList.remove("editing-app");
    $(".unsaved", topbar)?.classList.add("out");
    setTimeout(renderDashboard, 180);
    toast(save ? "Dashboard saved" : "Changes discarded");
  }
  function renderLibrary() {
    const groups = {};
    Object.entries(M).forEach(([k, m]) => (groups[m.cat] ||= []).push([k, m]));
    $("#library").innerHTML = `<label class="input">${ic.search}<input type="search" placeholder="Search metrics" aria-label="Search metrics" data-lib-q></label>
      <div class="lib-list">${Object.entries(groups).map(([g, list]) => `<div class="lib-group">${g}</div>${list.map(([k, m]) => `<button class="lib-item" type="button" data-lib="${k}" data-name="${m.name.toLowerCase()}"><span class="glyph">${glyph[m.kind]}</span>${m.name}<span class="add">${ic.plus}</span></button>`).join("")}`).join("")}</div>
      <button class="btn" type="button" data-act="custom">${ic.plus}Create a card</button>`;
  }
  function markAdded() { const on = new Set(S.sections.flatMap((s) => s.w.map((w) => w.m))); $$(".lib-item").forEach((b) => { b.classList.toggle("added", on.has(b.dataset.lib)); $(".add", b).innerHTML = on.has(b.dataset.lib) ? ic.check.replace("i tick", "i") : ic.plus; }); }
  function addWidget(sid, wd, at) {
    const s = S.sections.find((x) => x.id === sid) || S.sections[S.sections.length - 1];
    at = at ?? s.w.length;
    s.w.splice(at, 0, wd);
    const grid = $(`.section[data-s="${s.id}"] .grid`, view);
    $(".drop-hint", grid)?.remove();
    const html = widgetHTML(wd, { enter: true }), ref = grid.children[at];
    ref ? ref.insertAdjacentHTML("beforebegin", html) : grid.insertAdjacentHTML("beforeend", html);
    const el = $(`[data-w="${wd.id}"]`, grid);
    el.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "nearest" });
    markAdded();
    return el;
  }
  function removeWidget(el, quiet) {
    const sec = el.closest(".section"), s = S.sections.find((x) => x.id === sec.dataset.s), at = s.w.findIndex((w) => w.id === el.dataset.w), [wd] = s.w.splice(at, 1);
    el.classList.add("leave");
    setTimeout(() => { el.remove(); if (!s.w.length && S.editing) $(".grid", sec).innerHTML = dropHint(); }, 250);
    markAdded();
    if (!quiet) toast(`${M[wd.m].name} removed`, () => addWidget(s.id, wd, at));
  }
  function addSection() {
    const s = { id: "s" + ++uid, title: "New section", w: [] };
    S.sections.push(s);
    S.target = s.id;
    $(".sections", view).insertAdjacentHTML("beforeend", sectionHTML(s).replace('class="section"', 'class="section" style="animation:card-in .4s var(--ease) both"'));
    $(`.section[data-s="${s.id}"]`, view).scrollIntoView({ behavior: "smooth", block: "center" });
  }

  /* Drag to reorder within a section; the other cards slide (FLIP) */
  view.addEventListener("pointerdown", (e) => {
    const h = e.target.closest(".handle");
    if (!h || !S.editing) return;
    e.preventDefault();
    const card = h.closest(".widget"), grid = card.parentElement, s = S.sections.find((x) => x.id === card.closest(".section").dataset.s);
    const start = { x: e.clientX, y: e.clientY };
    card.classList.add("dragging");
    h.setPointerCapture(e.pointerId);
    const flip = (fn) => {
      const items = [...grid.children].filter((c) => c !== card), first = new Map(items.map((c) => [c, c.getBoundingClientRect()]));
      fn();
      items.forEach((c) => { const a = first.get(c), b = c.getBoundingClientRect(); if (a.left !== b.left || a.top !== b.top) c.animate([{ transform: `translate(${a.left - b.left}px, ${a.top - b.top}px)` }, { transform: "none" }], { duration: 320, easing: "cubic-bezier(.2,.7,.2,1)" }); });
    };
    const move = (ev) => {
      card.style.transform = "";
      const home = card.getBoundingClientRect();
      const over = [...grid.children].find((c) => c !== card && c.classList.contains("widget") && (() => { const r = c.getBoundingClientRect(); return ev.clientX > r.left && ev.clientX < r.right && ev.clientY > r.top && ev.clientY < r.bottom; })());
      if (over) {
        const before = [...grid.children].indexOf(over) < [...grid.children].indexOf(card);
        flip(() => (before ? over.before(card) : over.after(card)));
        const now = card.getBoundingClientRect();
        start.x += now.left - home.left; start.y += now.top - home.top;
      }
      card.style.transform = `translate(${ev.clientX - start.x}px, ${ev.clientY - start.y}px) rotate(.5deg)`;
    };
    const up = () => {
      h.removeEventListener("pointermove", move);
      card.classList.remove("dragging");
      if (card.style.transform) card.animate([{ transform: card.style.transform }, { transform: "none" }], { duration: 260, easing: "cubic-bezier(.2,.7,.2,1)" });
      card.style.transform = "";
      s.w = [...grid.children].filter((c) => c.dataset.w).map((c) => s.w.find((w) => w.id === c.dataset.w));
    };
    h.addEventListener("pointermove", move);
    h.addEventListener("pointerup", up, { once: true });
  });

  /* Create a card: metric, visualization and range, with a live preview */
  function openCreate(preset = {}) {
    const m0 = preset.m || "chats";
    const b = { m: m0, k: preset.k || (M[m0].kind === "breakdown" ? "bar" : M[m0].kind), n: S.range === "30" ? "30" : "7" };
    const scrim = document.createElement("div"), md = document.createElement("div");
    scrim.className = "scrim"; md.className = "modal"; md.setAttribute("role", "dialog"); md.setAttribute("aria-label", "Create a card");
    md.innerHTML = `<header><h2>Create a card</h2><button class="btn ghost icon" type="button" data-x aria-label="Close">${ic.x}</button></header>
      <div class="body"><div class="form">
        <div class="field"><label for="c-m">Metric</label><div class="select"><select id="c-m">${Object.entries(M).filter(([, m]) => m.kind !== "breakdown").map(([k, m]) => `<option value="${k}" ${k === b.m ? "selected" : ""}>${m.name}</option>`).join("")}</select>${ic.cv}</div></div>
        <div class="field"><label>Visualization</label><div class="viz" role="radiogroup">${[["line", "Line", ic.line], ["bar", "Bar", ic.bar], ["number", "Number", ic.num]].map(([k, l, g]) => `<button type="button" role="radio" aria-checked="${k === b.k}" data-k="${k}">${g}${l}</button>`).join("")}</div></div>
        <div class="field"><label>Time range</label><div class="seg" role="radiogroup"><span class="thumb"></span>${[["7", "7 days"], ["30", "30 days"]].map(([k, l]) => `<button type="button" role="radio" aria-checked="${k === b.n}" data-n="${k}">${l}</button>`).join("")}</div></div>
      </div><div class="pv"><span class="label">Preview</span><div class="pv-card"></div></div></div>
      <footer><button class="btn" type="button" data-x>Cancel</button><button class="btn dark" type="button" data-ok>Add card</button></footer>`;
    document.body.append(scrim, md);
    const seg = $(".seg", md);
    const thumb = () => { const on = $('[aria-checked="true"]', seg), t = $(".thumb", seg); t.style.width = on.offsetWidth + "px"; t.style.transform = `translateX(${on.offsetLeft - 2}px)`; };
    const draw = () => { $(".pv-card", md).innerHTML = widgetHTML({ id: "pv", m: b.m, k: b.k }, { n: +b.n }).replace(/<button class="handle"[\s\S]*?<\/button>/, "").replace(/<button class="more"[\s\S]*?<\/button>/, ""); };
    thumb(); draw();
    $("#c-m", md).addEventListener("change", (e) => { b.m = e.target.value; draw(); });
    md.addEventListener("click", (e) => {
      const k = e.target.closest("[data-k]"), n = e.target.closest("[data-n]");
      if (k) { b.k = k.dataset.k; $$("[data-k]", md).forEach((x) => x.setAttribute("aria-checked", x === k)); draw(); }
      if (n) { b.n = n.dataset.n; $$("[data-n]", md).forEach((x) => x.setAttribute("aria-checked", x === n)); thumb(); draw(); }
      if (e.target.closest("[data-x]")) close();
      if (e.target.closest("[data-ok]")) {
        close();
        setTimeout(() => {
          if (!S.editing) enterEdit();
          setTimeout(() => { const el = addWidget(S.target, { id: "w" + ++uid, m: b.m, k: b.k }); toast(`${M[b.m].name} added`, () => removeWidget(el, true)); }, 120);
        }, 160);
      }
    });
    const onKey = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    function close() { md.classList.add("out"); scrim.classList.add("out"); setTimeout(() => { md.remove(); scrim.remove(); }, 180); document.removeEventListener("keydown", onKey); }
    scrim.addEventListener("click", close);
    setTimeout(() => $("#c-m", md).focus(), 50);
  }

  /* Chart hover: crosshair, dot, and a tooltip comparing both periods */
  document.addEventListener("pointermove", (e) => {
    const svg = e.target.closest?.("svg.chart"), card = svg?.closest(".widget[data-m]");
    if (!svg || !card) return;
    const id = card.dataset.m, n = +card.dataset.n, cur = vals(id, n), prev = S.compare ? vals(id, n, 1) : null, m = M[id];
    const vb = svg.viewBox.baseVal, r = svg.getBoundingClientRect(), [L, R2, T, Bt, mn, mx] = svg.dataset.plot.split(",").map(Number);
    const px = ((e.clientX - r.left) / r.width) * vb.width, kind = svg.dataset.kind;
    const i = kind === "line" ? Math.round(((px - L) / (R2 - L)) * (n - 1)) : Math.floor(((px - L) / (R2 - L)) * n);
    if (i < 0 || i >= n) return;
    let cx;
    if (kind === "line") {
      cx = L + (i * (R2 - L)) / (n - 1);
      const cy = T + (1 - (cur[i] - mn) / (mx - mn)) * (Bt - T);
      $(".hl", svg).setAttribute("x1", cx); $(".hl", svg).setAttribute("x2", cx);
      $(".hd", svg).setAttribute("cx", cx); $(".hd", svg).setAttribute("cy", cy);
    } else { cx = L + ((i + 0.5) * (R2 - L)) / n; $$(".bar", svg).forEach((b, j) => b.classList.toggle("dim", j !== i)); }
    const tip = $(".tip", card), cr = card.getBoundingClientRect();
    tip.innerHTML = `<div class="t">${longDate(n - 1 - i)}</div><div class="r"><span><i></i>${kind === "line" && prev ? "This period" : m.name}</span><b>${m.f(cur[i])}</b></div>${prev && kind === "line" ? `<div class="r"><span><i class="c"></i>${short(dateOf(2 * n - 1 - i))}</span><b>${m.f(prev[i])}</b></div>` : ""}`;
    tip.style.left = `${r.left - cr.left + (cx / vb.width) * r.width}px`;
    tip.style.top = `${r.top - cr.top + 16}px`;
    tip.classList.add("show");
  });
  document.addEventListener("pointerout", (e) => {
    const svg = e.target.closest?.("svg.chart");
    if (!svg || svg.contains(e.relatedTarget)) return;
    $(".tip", svg.closest(".card"))?.classList.remove("show");
    $(".hl", svg)?.setAttribute("x1", -99); $(".hl", svg)?.setAttribute("x2", -99); $(".hd", svg)?.setAttribute("cx", -99);
    $$(".bar", svg).forEach((b) => b.classList.remove("dim"));
  });

  /* ---------------------------------------------------------------- audit log */
  const ACTIONS = [["user.login", "Signed in"], ["user.login_failed", "Sign-in failed"], ["role.granted", "Role granted"], ["metric.updated", "Metric updated"], ["dashboard.shared", "Dashboard shared"], ["export.created", "Export created"], ["apikey.created", "API key created"]];
  const PEOPLE = [["Cara Carter", "CC", "", "cara"], ["Jo Miller", "JM", "b", "jo"], ["Ana Delgado", "AD", "c", "ana"], ["Tom Nguyen", "TN", "d", "tom"], ["Ifeoma Okafor", "IO", "e", "ifeoma"]];
  const TARGETS = ["Operations overview", "Call / Duration", "Field service / Job", "Viewer → Editor", "weekly-export.csv", "Production key"];
  const EVENTS = (() => {
    const r = rng(42), out = [];
    for (let day = 29; day >= 0; day--) {
      const n = Math.round(7 + r() * 9 + (day === 9 ? 24 : 0) - (day % 7 < 2 ? 4 : 0));
      for (let k = 0; k < n; k++) {
        const fail = r() < (day === 9 ? 0.45 : 0.07), a = fail ? ACTIONS[1] : ACTIONS[[0, 0, 2, 3, 4, 5, 6][Math.floor(r() * 7)]], p = PEOPLE[Math.floor(r() * PEOPLE.length)];
        const d = dateOf(day); d.setHours(7 + Math.floor(r() * 12), Math.floor(r() * 60), Math.floor(r() * 60));
        out.push({ id: "evt_" + (2400000 + out.length * 37).toString(36), day: 29 - day, date: d, a, p, fail, target: a[0].startsWith("user") ? "Web app" : TARGETS[Math.floor(r() * TARGETS.length)], ip: `10.24.${Math.floor(r() * 255)}.${Math.floor(r() * 255)}`, ua: ["Chrome 141 · macOS", "Edge 140 · Windows", "Safari 19 · iOS"][Math.floor(r() * 3)] });
      }
    }
    return out.reverse();
  })();
  const AU = { from: null, to: null, q: "", act: "all", who: "all", shown: 14, sel: null };
  function renderAudit() {
    topbar.innerHTML = `<div class="crumbs">Data<span class="sep">/</span><b>Audit log</b></div><div class="right"><button class="btn ghost icon" type="button" data-act="toast" data-msg="Up to date" aria-label="Refresh">${ic.refresh}</button><button class="btn" type="button" data-act="toast" data-msg="Export started · ${EVENTS.length} events">${ic.down}Export</button></div>`;
    view.innerHTML = `<div class="page"><div class="title"><div><h1>Audit log</h1><p>Every sign-in and change in this workspace, kept for 30 days.</p></div></div>
      <div class="card activity"><div class="top"><b>Activity</b><span class="legend"><span><i></i>Succeeded</span><span><i class="f"></i>Failed</span></span><span class="hint">Drag across the chart to filter</span></div><svg viewBox="0 0 900 96" preserveAspectRatio="none" aria-label="Events per day. Drag to filter by date."></svg><div class="xa">${[29, 22, 15, 8, 0].map((b) => `<span>${short(dateOf(b))}</span>`).join("")}</div><div class="tip"></div></div>
      <div class="filters"><label class="input">${ic.search}<input type="search" placeholder="Search events" aria-label="Search events" data-au-q value="${esc(AU.q)}"></label>
        <button class="chip ${AU.act !== "all" ? "set" : ""}" type="button" data-act="au-action">Action <b data-lbl="act">${AU.act === "all" ? "All" : ACTIONS.find((x) => x[0] === AU.act)[1]}</b>${ic.cv}</button><button class="chip ${AU.who !== "all" ? "set" : ""}" type="button" data-act="au-who">Person <b data-lbl="who">${AU.who === "all" ? "Anyone" : PEOPLE.find((p) => p[3] === AU.who)[0]}</b>${ic.cv}</button><span data-range-chip></span><span class="count"></span></div>
      <div class="split"><div class="card table" role="table"><div class="tr th" role="row"><span>Event${ic.sort}</span><span>Actor</span><span>Target</span><span>IP address</span><span style="justify-content:flex-end">Time${ic.sort}</span></div><div class="rows"></div><div class="tfoot au-foot"></div></div><div class="inspector"></div></div></div>`;
    drawActivity(); drawRows();
    const svg = $(".activity svg", view), box = $(".activity", view);
    let start = null;
    const dayAt = (e) => { const r = svg.getBoundingClientRect(); return Math.max(0, Math.min(29, Math.floor(((e.clientX - r.left) / r.width) * 30))); };
    const setDays = (a, b) => { AU.from = a; AU.to = b; AU.shown = 14; drawActivity(); drawRows(); };
    svg.addEventListener("pointerdown", (e) => { start = dayAt(e); svg.setPointerCapture(e.pointerId); setDays(start, start); });
    svg.addEventListener("pointermove", (e) => {
      const d = dayAt(e);
      if (start != null) setDays(Math.min(start, d), Math.max(start, d));
      const evs = EVENTS.filter((x) => x.day === d), f = evs.filter((x) => x.fail).length, r = svg.getBoundingClientRect(), br = box.getBoundingClientRect(), tip = $(".tip", box);
      tip.innerHTML = `<div class="t">${longDate(29 - d)}</div><div class="r"><span><i></i>Succeeded</span><b>${evs.length - f}</b></div><div class="r"><span><i style="background:var(--down)"></i>Failed</span><b>${f}</b></div><div class="r" style="border-top:1px solid var(--line);margin-top:4px;padding-top:4px"><span>Total</span><b>${evs.length}</b></div>`;
      tip.style.left = `${r.left - br.left + ((d + 0.5) / 30) * r.width}px`; tip.style.top = `${r.top - br.top + 8}px`; tip.classList.add("show");
    });
    svg.addEventListener("pointerleave", () => $(".tip", box).classList.remove("show"));
    svg.addEventListener("pointerup", () => (start = null));
  }
  function drawActivity() {
    const svg = $(".activity svg", view), box = $(".activity", view), max = Math.max(...Array.from({ length: 30 }, (_, d) => EVENTS.filter((x) => x.day === d).length)), bw = 30, sel = AU.from != null;
    box.classList.toggle("brushed", sel);
    svg.innerHTML = (sel ? `<rect class="brush" x="${AU.from * bw}" y="0" width="${(AU.to - AU.from + 1) * bw}" height="96" rx="4"/>` : "") + Array.from({ length: 30 }, (_, d) => {
      const evs = EVENTS.filter((x) => x.day === d), f = evs.filter((x) => x.fail).length, h = (evs.length / max) * 88, hf = (f / max) * 88;
      return `<g class="col ${sel && d >= AU.from && d <= AU.to ? "in" : ""}"><rect class="hb" x="${d * bw + 7}" y="${94 - h}" width="${bw - 14}" height="${Math.max(0, h - hf - 1)}" rx="2"/><rect class="hf" x="${d * bw + 7}" y="${94 - hf}" width="${bw - 14}" height="${hf}" rx="2"/></g>`;
    }).join("");
    $("[data-range-chip]", view).innerHTML = sel ? `<button class="chip set" type="button" data-act="au-clear">${short(dateOf(29 - AU.from))}${AU.to !== AU.from ? ` – ${short(dateOf(29 - AU.to))}` : ""}<span class="x">${ic.x.replace('class="i"', 'class="i" style="width:12px;height:12px"')}</span></button>` : "";
  }
  const auList = () => EVENTS.filter((e) => (AU.from == null || (e.day >= AU.from && e.day <= AU.to)) && (AU.act === "all" || e.a[0] === AU.act) && (AU.who === "all" || e.p[3] === AU.who) && (!AU.q || `${e.a[0]} ${e.a[1]} ${e.p[0]} ${e.target}`.toLowerCase().includes(AU.q.toLowerCase())));
  function drawRows(append) {
    const list = auList(), rows = $(".rows", view), from = append ? rows.children.length : 0;
    const html = list.slice(from, AU.shown).map((e, i) => `<div class="tr row ${AU.sel === e.id ? "sel" : ""}" role="row" tabindex="0" style="--i:${i}" data-id="${e.id}"><span><span class="tag ${e.fail ? "bad" : e.a[0] === "role.granted" ? "warn" : ""}"><i></i>${e.a[1]}</span></span><span class="actor"><span class="avatar ${e.p[2]}">${e.p[1]}</span><span style="min-width:0"><b>${e.p[0]}</b><small>${e.p[3]}@example.com</small></span></span><span class="cell-muted">${e.target}</span><span class="mono cell-muted">${e.ip}</span><span class="when">${short(e.date)}, ${e.date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}</span></div>`).join("");
    if (append) rows.insertAdjacentHTML("beforeend", html); else rows.innerHTML = html || `<div class="tfoot" style="justify-content:center;border:0;height:80px">No events match these filters.</div>`;
    $(".count", view).textContent = `${fmt(list.length)} events`;
    $(".au-foot", view).innerHTML = `<span>Showing ${Math.min(AU.shown, list.length)} of ${fmt(list.length)}</span>${AU.shown < list.length ? '<button class="btn ghost" type="button" data-act="au-more">Load more</button>' : ""}`;
  }
  const json = (o) => esc(JSON.stringify(o, null, 2)).replace(/&quot;([^&]+?)&quot;:/g, '<span class="k">"$1"</span>:').replace(/: &quot;(.*?)&quot;/g, ': <span class="s">"$1"</span>').replace(/: (\d+|true|false)/g, ': <span class="n">$1</span>');
  function inspect(id) {
    const e = EVENTS.find((x) => x.id === id);
    AU.sel = id;
    $$(".row", view).forEach((r) => r.classList.toggle("sel", r.dataset.id === id));
    $(".split", view).classList.add("open");
    const payload = { id: e.id, type: e.a[0], outcome: e.fail ? "failure" : "success", actor: { name: e.p[0], email: `${e.p[3]}@example.com` }, target: e.target, ip: e.ip, user_agent: e.ua, occurred_at: e.date.toISOString() };
    $(".inspector", view).innerHTML = `<div class="card"><div class="insp-head"><span class="tag ${e.fail ? "bad" : ""}"><i></i>${e.a[1]}</span><span class="right"><button class="btn ghost icon" type="button" data-act="copy" aria-label="Copy JSON">${ic.copy}</button><button class="btn ghost icon" type="button" data-act="insp-close" aria-label="Close">${ic.x}</button></span></div>
      <div class="kv"><span>Actor</span><span class="actor"><span class="avatar ${e.p[2]}">${e.p[1]}</span>${e.p[0]}</span><span>Target</span><span>${e.target}</span><span>When</span><span>${e.date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</span><span>Client</span><span>${e.ua}</span></div>
      <pre class="json">${json(payload)}</pre><div class="insp-foot"><kbd>↑</kbd><kbd>↓</kbd>move between events<span style="margin-left:auto" class="mono">${e.id}</span></div></div>`;
  }
  function closeInspector() { AU.sel = null; $(".split", view)?.classList.remove("open"); $$(".row.sel", view).forEach((r) => r.classList.remove("sel")); }

  /* ------------------------------------------------------------------ catalog */
  const TREE = [{ id: "support", name: "Support", kids: [{ id: "call", name: "Call", m: ["calls", "delay", "handle", "rating"] }, { id: "chat", name: "Chat", m: ["chats"] }, { id: "callback", name: "Callback", m: ["callbacks"] }] }, { id: "field", name: "Field service", kids: [{ id: "job", name: "Job", m: ["jobs", "arrive"] }] }];
  const CAT = { node: "all", q: "", shut: new Set(), metric: null, tab: "overview" };
  const stat = (k) => { const r = rng(M[k].seed); return { records: Math.round(1.1e6 + r() * 1.6e6), cov: +(93 + r() * 6.5).toFixed(1), back: Math.round(56 + r() * 44), upd: Math.round(2 + r() * 50) }; };
  const icn = (svg) => svg.replace('class="i"', 'class="i ic"');
  function renderCatalog(metric) {
    CAT.metric = metric && M[metric] ? metric : null;
    if (CAT.metric) CAT.tab = "overview";
    topbar.innerHTML = `<div class="crumbs">Data<span class="sep">/</span>${CAT.metric ? `<span>Catalog</span><span class="sep">/</span><b>${M[CAT.metric].name}</b>` : "<b>Catalog</b>"}</div><div class="right"><button class="btn dark" type="button" data-act="toast" data-msg="Not part of this prototype">${ic.plus}New metric</button></div>`;
    view.innerHTML = `<div class="page"><div class="title"><div><h1>Catalog</h1><p>What the platform collects, how it's measured, and how complete it is.</p></div></div>
      <div class="explorer"><div class="card tree"><label class="input">${ic.search}<input type="search" placeholder="Filter" aria-label="Filter catalog" data-cat-q value="${esc(CAT.q)}"></label><div class="tree-body"></div></div><div class="cat-pane"></div></div></div>`;
    drawTree(); drawPane();
  }
  const hl = (s) => { if (!CAT.q) return esc(s); const i = s.toLowerCase().indexOf(CAT.q.toLowerCase()); return i < 0 ? esc(s) : `${esc(s.slice(0, i))}<mark>${esc(s.slice(i, i + CAT.q.length))}</mark>${esc(s.slice(i + CAT.q.length))}`; };
  function drawTree() {
    const q = CAT.q.toLowerCase(), ok = (k) => !q || M[k].name.toLowerCase().includes(q);
    const node = (id, name, count, kids, icon) => `<button class="node ${CAT.node === id && !CAT.metric ? "sel" : ""}" type="button" data-node="${id}" aria-expanded="${!CAT.shut.has(id) || !!q}">${kids != null ? ic.tw : '<span style="width:13px"></span>'}${icon}${hl(name)}<span class="n">${count}</span></button>${kids != null ? `<div class="kids ${CAT.shut.has(id) && !q ? "shut" : ""}"><div>${kids}</div></div>` : ""}`;
    $(".tree-body", view).innerHTML = node("all", "All metrics", Object.keys(M).filter(ok).length, null, icn(ic.db)) + TREE.map((c) => {
      const recs = c.kids.filter((r) => r.m.some(ok));
      if (!recs.length) return "";
      return node(c.id, c.name, recs.reduce((a, r) => a + r.m.filter(ok).length, 0), recs.map((r) => node(r.id, r.name, r.m.filter(ok).length, r.m.filter(ok).map((k) => `<button class="node ${CAT.metric === k ? "sel" : ""}" type="button" data-metric="${k}"><span style="width:13px"></span>${icn(glyph[M[k].kind])}${hl(M[k].name)}</button>`).join(""), icn(ic.folder))).join(""), icn(ic.folder));
    }).join("");
  }
  function inNode(k) {
    if (CAT.node === "all") return true;
    const c = TREE.find((x) => x.id === CAT.node);
    if (c) return c.kids.some((r) => r.m.includes(k));
    const r = TREE.flatMap((x) => x.kids).find((x) => x.id === CAT.node);
    return r ? r.m.includes(k) : true;
  }
  function drawPane() {
    const pane = $(".cat-pane", view);
    if (!CAT.metric) {
      const list = Object.keys(M).filter((k) => inNode(k) && (!CAT.q || M[k].name.toLowerCase().includes(CAT.q.toLowerCase())));
      pane.innerHTML = `<div class="pane"><div class="card table mt"><div class="tr th"><span>Name${ic.sort}</span><span>Source</span><span>Coverage</span><span>Status</span><span style="justify-content:flex-end">Updated</span></div>${list.map((k, i) => { const s = stat(k); return `<div class="tr row" role="row" tabindex="0" style="--i:${i}" data-open="${k}"><span class="metric-name"><span class="glyph">${glyph[M[k].kind]}</span>${M[k].name}</span><span class="cell-muted">${M[k].cat} / ${M[k].rec}</span><span class="cov"><span class="bar ${s.cov < 95 ? "w" : ""}"><i style="width:${s.cov}%"></i></span><span>${s.cov}%</span></span><span>${s.back < 100 ? '<span class="tag warn"><i></i>Backfilling</span>' : '<span class="tag ok"><i></i>Active</span>'}</span><span class="when">${s.upd}m ago</span></div>`; }).join("")}<div class="tfoot"><span>${list.length} metrics</span></div></div></div>`;
      return;
    }
    const k = CAT.metric, m = M[k], s = stat(k);
    pane.innerHTML = `<div class="pane"><button class="back" type="button" data-act="cat-back">${ic.back}All metrics</button>
      <div class="title" style="margin-bottom:0"><div><h1 style="display:flex;align-items:center;gap:10px">${m.name}${s.back < 100 ? '<span class="tag warn"><i></i>Backfilling</span>' : '<span class="tag ok"><i></i>Active</span>'}</h1><p>${m.def}</p></div><button class="btn dark" type="button" data-act="cat-add" data-m="${k}">${ic.plus}Add to dashboard</button></div>
      <div class="tabs" role="tablist"><span class="ink"></span>${[["overview", "Overview"], ["schema", "Schema"], ["usage", "Used in"]].map(([t, l]) => `<button type="button" role="tab" aria-selected="${CAT.tab === t}" data-tab="${t}">${l}</button>`).join("")}</div>
      <div class="tab-body"></div></div>`;
    drawTab();
  }
  function drawTab() {
    const k = CAT.metric, s = stat(k), body = $(".tab-body", view), tabs = $(".tabs", view), on = $('[aria-selected="true"]', tabs), ink = $(".ink", tabs);
    ink.style.width = on.offsetWidth + "px"; ink.style.transform = `translateX(${on.offsetLeft}px)`;
    if (CAT.tab === "overview") body.innerHTML = `<div class="pane"><div class="stats3"><div class="card"><span>Records, 30 days</span><b data-count="${s.records}">${fmt(s.records)}</b></div><div class="card"><span>Coverage</span><b>${s.cov}%</b><div class="meter ${s.cov < 95 ? "w" : ""}"><i style="width:${s.cov}%"></i></div></div><div class="card"><span>Backfill</span><b>${s.back}%</b><div class="meter w"><i style="width:${s.back}%"></i></div></div></div>
      <div class="card widget draw" data-m="${k}" data-n="30" data-w="cat"><div class="w-head"><h3>Last 30 days</h3></div>${widgetInner({ m: k, k: M[k].kind === "bar" ? "bar" : "line", wide: true }, 30)}<div class="tip"></div></div></div>`;
    if (CAT.tab === "schema") body.innerHTML = `<div class="pane card" style="overflow:hidden"><pre class="json">${json({ $schema: "record/v2", record_type: `${M[k].cat}.${M[k].rec}`, required: ["id", "agent_id", "occurred_at"], fields: { id: "string", agent_id: "string", occurred_at: "timestamp", [k]: "number" }, retention_days: 395 })}</pre></div>`;
    if (CAT.tab === "usage") body.innerHTML = `<div class="pane card used">${[["Operations overview", "Cara Carter", "", "CC"], ["Weekly operations", "Jo Miller", "b", "JM"], ["Leadership summary", "Ana Delgado", "c", "AD"]].map(([d, o, c, a]) => `<a href="#/dashboard"><span class="avatar ${c}">${a}</span>${d}<small>${o}</small></a>`).join("")}</div>`;
    countUp($$("[data-count]", body));
  }

  /* ------------------------------------------------------------------ palette */
  function openPalette() {
    if ($(".cmdk")) return;
    const items = [
      ...[["Operations overview", "#/dashboard", ic.list], ["Catalog", "#/catalog", ic.db], ["Audit log", "#/audit", ic.filter]].map(([l, h, g]) => ({ g: "Go to", l, icon: g, run: () => (location.hash = h) })),
      ...Object.entries(M).map(([k, m]) => ({ g: "Metrics", l: m.name, hint: `${m.cat} / ${m.rec}`, icon: glyph[m.kind], run: () => (location.hash = "#/catalog/" + k) })),
      { g: "Actions", l: "Edit dashboard", icon: ic.edit, run: () => { location.hash = "#/dashboard"; setTimeout(enterEdit, 60); } },
      { g: "Actions", l: "Create a card", icon: ic.plus, run: () => openCreate() },
      { g: "Actions", l: "Toggle appearance", icon: ic.refresh, run: () => toggleTheme() },
    ];
    const scrim = document.createElement("div"), box = document.createElement("div");
    scrim.className = "scrim"; box.className = "cmdk"; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "Search");
    box.innerHTML = `<div class="q">${ic.search}<input type="text" placeholder="Search metrics, pages and actions…" aria-label="Search"><kbd>esc</kbd></div><ul role="listbox"></ul><div class="foot"><span><kbd>↑</kbd><kbd>↓</kbd>navigate</span><span><kbd>↵</kbd>open</span></div>`;
    document.body.append(scrim, box);
    const input = $("input", box), ul = $("ul", box);
    let list = [], at = 0;
    const draw = () => {
      const q = input.value.toLowerCase();
      list = items.filter((i) => !q || i.l.toLowerCase().includes(q) || (i.hint || "").toLowerCase().includes(q));
      at = Math.min(at, Math.max(0, list.length - 1));
      let g = "";
      ul.innerHTML = list.map((i, n) => `${i.g !== g ? `<li class="g">${(g = i.g)}</li>` : ""}<li class="it" role="option" data-n="${n}" aria-selected="${n === at}">${i.icon}${esc(i.l)}${i.hint ? `<small>${i.hint}</small>` : ""}</li>`).join("") || '<li class="g" style="text-align:center;padding:24px">No results</li>';
      $('[aria-selected="true"]', ul)?.scrollIntoView({ block: "nearest" });
    };
    const close = () => { box.classList.add("out"); scrim.classList.add("out"); setTimeout(() => { box.remove(); scrim.remove(); }, 140); };
    const run = (n) => { const it = list[n]; close(); if (it) setTimeout(it.run, 100); };
    input.addEventListener("input", () => { at = 0; draw(); });
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { at = Math.min(list.length - 1, at + 1); draw(); e.preventDefault(); }
      if (e.key === "ArrowUp") { at = Math.max(0, at - 1); draw(); e.preventDefault(); }
      if (e.key === "Enter") run(at);
      if (e.key === "Escape") close();
    });
    ul.addEventListener("pointermove", (e) => { const li = e.target.closest(".it"); if (li && +li.dataset.n !== at) { at = +li.dataset.n; $$(".it", ul).forEach((x) => x.setAttribute("aria-selected", +x.dataset.n === at)); } });
    ul.addEventListener("click", (e) => { const li = e.target.closest(".it"); if (li) run(+li.dataset.n); });
    scrim.addEventListener("click", close);
    draw(); input.focus();
  }
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openPalette(); }
    if (AU.sel && (e.key === "ArrowDown" || e.key === "ArrowUp") && !e.target.closest?.("input")) {
      const ids = $$(".row[data-id]", view).map((r) => r.dataset.id), i = ids.indexOf(AU.sel), next = ids[i + (e.key === "ArrowDown" ? 1 : -1)];
      if (next) { e.preventDefault(); inspect(next); const row = $(`.row[data-id="${next}"]`, view); row.focus({ preventScroll: true }); row.scrollIntoView({ block: "nearest" }); }
    }
    if (e.key === "Escape" && AU.sel && !$(".cmdk")) closeInspector();
    if ((e.key === "Enter" || e.key === " ") && e.target.matches?.(".row, .suggest .widget")) { e.preventDefault(); e.target.click(); }
  });
  $("[data-cmdk]").addEventListener("click", openPalette);

  /* -------------------------------------------------------------------- theme */
  function toggleTheme() {
    const flip = () => { const dark = document.documentElement.dataset.theme !== "dark"; dark ? (document.documentElement.dataset.theme = "dark") : delete document.documentElement.dataset.theme; try { localStorage.setItem("signal-theme", dark ? "dark" : "light"); } catch {} };
    const b = $("[data-theme-toggle]").getBoundingClientRect();
    document.documentElement.style.setProperty("--vx", `${b.left + 18}px`);
    document.documentElement.style.setProperty("--vy", `${b.top + b.height / 2}px`);
    if (!document.startViewTransition || calm) return flip();
    document.startViewTransition(flip);
  }
  $("[data-theme-toggle]").addEventListener("click", toggleTheme);

  /* ------------------------------------------------------------- delegation */
  document.addEventListener("click", (e) => {
    const t = e.target.closest("button, [data-act], .row, .lib-item");
    if (!t || t.closest(".menu, .modal, .cmdk, .toast")) return;
    const a = t.dataset.act;
    if (a === "range") return menu(t, [["1", "Today"], ["7", "Last 7 days"], ["30", "Last 30 days"]].map(([v, l]) => ({ v, l, on: S.range === v })), (v) => { S.range = v; refreshData(); });
    if (a === "compare") { S.compare = !S.compare; return refreshData(); }
    if (a === "share") return toast("Link copied · anyone in Operations can view");
    if (a === "edit" || a === "start-edit") return enterEdit();
    if (a === "save") return exitEdit(true);
    if (a === "discard") return exitEdit(false);
    if (a === "custom") return openCreate();
    if (a === "add-section") return addSection();
    if (a === "remove") return removeWidget(t.closest(".widget"));
    if (a === "del-section") { const sec = t.closest(".section"); S.sections = S.sections.filter((s) => s.id !== sec.dataset.s); sec.animate([{ opacity: 1 }, { opacity: 0, transform: "scale(.98)" }], { duration: 220, fill: "forwards" }); setTimeout(() => sec.remove(), 220); return toast("Section deleted"); }
    if (a === "card-menu") return menu(t, [{ v: "catalog", l: "Open in catalog", icon: ic.db }, { v: "edit", l: "Edit dashboard", icon: ic.edit }], (v) => (v === "catalog" ? (location.hash = "#/catalog/" + t.closest(".widget").dataset.m) : enterEdit()));
    if (a === "quick") { if (!S.sections.length) S.sections.push({ id: "s" + ++uid, title: "Support", w: [] }); S.sections[0].w.push({ id: "w" + ++uid, m: t.dataset.m, k: t.dataset.k }); renderDashboard(); return toast(`${M[t.dataset.m].name} added`); }
    if (t.classList.contains("lib-item")) { const k = t.dataset.lib, el = addWidget(S.target, { id: "w" + ++uid, m: k, k: M[k].kind }); return toast(`${M[k].name} added`, () => removeWidget(el, true)); }
    if (a === "toast") return toast(t.dataset.msg);
    if (a === "au-action") return menu(t, [{ v: "all", l: "All actions", on: AU.act === "all" }, "-", ...ACTIONS.map(([v, l]) => ({ v, l, on: AU.act === v, meta: EVENTS.filter((ev) => ev.a[0] === v).length }))], (v) => { AU.act = v; AU.shown = 14; $('[data-lbl="act"]', view).textContent = v === "all" ? "All" : ACTIONS.find((x) => x[0] === v)[1]; t.classList.toggle("set", v !== "all"); drawRows(); });
    if (a === "au-who") return menu(t, [{ v: "all", l: "Anyone", on: AU.who === "all" }, "-", ...PEOPLE.map((p) => ({ v: p[3], l: p[0], on: AU.who === p[3] }))], (v) => { AU.who = v; AU.shown = 14; $('[data-lbl="who"]', view).textContent = v === "all" ? "Anyone" : PEOPLE.find((p) => p[3] === v)[0]; t.classList.toggle("set", v !== "all"); drawRows(); });
    if (a === "au-clear") { AU.from = AU.to = null; drawActivity(); return drawRows(); }
    if (a === "au-more") { AU.shown += 14; return drawRows(true); }
    if (a === "insp-close") return closeInspector();
    if (a === "copy") { navigator.clipboard?.writeText($(".inspector pre", view).textContent).catch(() => {}); return toast("Event JSON copied"); }
    if (t.dataset.id && t.classList.contains("row")) return inspect(t.dataset.id);
    if (t.dataset.open) return (location.hash = "#/catalog/" + t.dataset.open);
    if (a === "cat-back") return (location.hash = "#/catalog");
    if (a === "cat-add") { const k = t.dataset.m; location.hash = "#/dashboard"; setTimeout(() => { enterEdit(); setTimeout(() => openCreate({ m: k, k: M[k].kind === "breakdown" ? "bar" : M[k].kind }), 350); }, 80); return; }
    if (t.dataset.tab) { CAT.tab = t.dataset.tab; $$("[data-tab]", view).forEach((b) => b.setAttribute("aria-selected", b === t)); return drawTab(); }
    if (t.dataset.node) {
      const id = t.dataset.node, kids = t.nextElementSibling?.classList.contains("kids") ? t.nextElementSibling : null;
      if (kids && CAT.node === id && !CAT.metric) { CAT.shut.has(id) ? CAT.shut.delete(id) : CAT.shut.add(id); t.setAttribute("aria-expanded", !CAT.shut.has(id)); kids.classList.toggle("shut", CAT.shut.has(id)); return; }
      CAT.node = id;
      if (CAT.metric) { history.replaceState(null, "", "#/catalog"); renderCatalog(); return; }
      $$(".node", view).forEach((n) => n.classList.toggle("sel", n === t));
      return drawPane();
    }
    if (t.dataset.metric && t.classList.contains("node")) return (location.hash = "#/catalog/" + t.dataset.metric);
  });
  document.addEventListener("input", (e) => {
    if (e.target.matches("[data-au-q]")) { AU.q = e.target.value; AU.shown = 14; drawRows(); }
    if (e.target.matches("[data-cat-q]")) { CAT.q = e.target.value; drawTree(); drawPane(); }
    if (e.target.matches("[data-lib-q]")) { const q = e.target.value.toLowerCase(); $$(".lib-item").forEach((b) => (b.hidden = !!q && !b.dataset.name.includes(q))); }
  });
  view.addEventListener("pointerdown", (e) => { const sec = e.target.closest(".section"); if (sec && S.editing) S.target = sec.dataset.s; }, true);

  /* ------------------------------------------------------------------- router */
  function route() {
    const [, page = "dashboard", arg] = location.hash.split("/");
    closeMenu();
    if (S.editing) { S.editing = false; S.sections = S.snap; app.classList.remove("editing-app"); }
    $$(".side a.nav").forEach((a) => a.classList.toggle("on", a.dataset.nav === (page === "dashboard" && arg === "new" ? "new" : page)));
    if (page === "audit") { AU.sel = null; renderAudit(); }
    else if (page === "catalog") renderCatalog(arg);
    else if (page === "admin") { topbar.innerHTML = `<div class="crumbs">Settings<span class="sep">/</span><b>Admin</b></div>`; view.innerHTML = `<div class="page"><div class="empty"><div class="art"><i></i><i></i><i></i><i></i><i></i></div><h2>Not part of this prototype</h2><p>Users, API keys and maintenance windows were left out of this rebuild.</p></div></div>`; }
    else { if (arg === "new") S.sections = []; else if (!S.sections.length) S.sections = seed(); renderDashboard(); }
    scroller.scrollTo(0, 0);
  }
  addEventListener("hashchange", route);
  route();
})();
