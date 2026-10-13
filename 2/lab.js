// Motion & interaction studies. Each component is self-contained: it wires
// its own pointer and keyboard input and exposes a short demo() that plays
// once when the tile scrolls into view, unless the visitor got there first.
(() => {
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const demos = new Map();

  /* 1. Hold to record: a deliberate hold fills the ring; letting go early springs back */
  $$(".lab-hold").forEach((el) => {
    const ring = $(".ring", el), hint = $(".lab-hint", el.closest(".lab-stage")), HOLD = 1500;
    let raf = 0, start = 0, busy = false;
    const setP = (p) => ring.style.setProperty("--p", p);
    const begin = () => {
      if (busy || raf) return;
      el.classList.remove("springing");
      el.classList.add("holding");
      start = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - start) / HOLD);
        setP(p);
        if (p < 1) return (raf = requestAnimationFrame(tick));
        raf = 0; finish();
      };
      raf = requestAnimationFrame(tick);
    };
    const cancel = () => {
      if (!raf) return;
      cancelAnimationFrame(raf); raf = 0;
      el.classList.remove("holding");
      el.classList.add("springing");
      setP(0);
    };
    const finish = async () => {
      busy = true;
      el.classList.remove("holding"); el.classList.add("done");
      if (hint) hint.textContent = "Recorded";
      await wait(1700);
      el.classList.remove("done"); el.classList.add("springing"); setP(0);
      if (hint) hint.textContent = "Hold to record";
      busy = false;
    };
    ring.addEventListener("pointerdown", (e) => { ring.setPointerCapture(e.pointerId); begin(); });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach((t) => ring.addEventListener(t, cancel));
    ring.addEventListener("keydown", (e) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); begin(); } });
    ring.addEventListener("keyup", (e) => { if (e.key === " " || e.key === "Enter") cancel(); });
    ring.addEventListener("contextmenu", (e) => e.preventDefault());
    demos.set(el.closest(".lab-tile"), async () => { begin(); });
  });

  /* 2. Focus follows: whatever you point at is sharp; everything else goes quiet */
  $$(".lab-focus").forEach((el) => {
    const wins = $$("button", el);
    const focus = (w) => wins.forEach((x) => x.classList.toggle("on", x === w));
    wins.forEach((w) => ["pointerenter", "focus", "click"].forEach((t) => w.addEventListener(t, () => focus(w))));
    demos.set(el.closest(".lab-tile"), async (live) => {
      for (const i of [1, 2, 0]) { await wait(750); if (!live()) return; focus(wins[i]); }
    });
  });

  /* 3. Slide to submit: drag past the threshold to commit; fall short and it springs back */
  $$(".lab-slide").forEach((el) => {
    const thumb = $(".thumb", el);
    let max = 0, startX = 0, x = 0, dragging = false, sent = false;
    const set = (v) => { x = Math.max(0, Math.min(max, v)); el.style.setProperty("--x", x); el.style.setProperty("--t", max ? x / max : 0); };
    const measure = () => (max = el.clientWidth - 64);
    const send = async () => {
      sent = true; el.classList.add("sent");
      await wait(1900);
      el.classList.remove("sent"); el.classList.add("back"); set(0); sent = false;
    };
    const release = () => {
      if (!dragging) return;
      dragging = false;
      if (x >= max * 0.86) return send();
      el.classList.add("back"); set(0);
    };
    thumb.addEventListener("pointerdown", (e) => {
      if (sent) return;
      measure(); dragging = true; startX = e.clientX - x;
      el.classList.remove("back"); thumb.setPointerCapture(e.pointerId);
    });
    thumb.addEventListener("pointermove", (e) => { if (dragging) set(e.clientX - startX); });
    ["pointerup", "pointercancel"].forEach((t) => thumb.addEventListener(t, release));
    thumb.addEventListener("keydown", (e) => {
      if (sent) return;
      measure();
      if (e.key === "ArrowRight") { el.classList.add("back"); set(x + max / 4); if (x >= max) send(); }
      if (e.key === "ArrowLeft") { el.classList.add("back"); set(x - max / 4); }
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); el.classList.add("back"); set(max); send(); }
    });
    demos.set(el.closest(".lab-tile"), async (live) => {
      measure(); el.classList.add("back"); set(max * 0.5);
      await wait(600); if (!live()) return; set(0);
      await wait(700); if (!live()) return; set(max); send();
    });
  });

  /* 4. Segmented control: one pill slides between options and overshoots slightly */
  $$(".lab-seg").forEach((el) => {
    const opts = $$("button", el), pill = $(".pill", el);
    const select = (btn, focus) => {
      opts.forEach((o) => { const on = o === btn; o.setAttribute("aria-checked", on); o.tabIndex = on ? 0 : -1; });
      pill.style.setProperty("--l", btn.offsetLeft);
      pill.style.setProperty("--w", btn.offsetWidth);
      if (focus) btn.focus();
    };
    opts.forEach((o, i) => {
      o.addEventListener("click", () => select(o));
      o.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight") select(opts[(i + 1) % opts.length], true);
        if (e.key === "ArrowLeft") select(opts[(i - 1 + opts.length) % opts.length], true);
      });
    });
    const init = () => select(opts.find((o) => o.getAttribute("aria-checked") === "true") || opts[0]);
    init(); addEventListener("resize", init); document.fonts?.ready.then(init);
    demos.set(el.closest(".lab-tile"), async (live) => {
      for (const i of [1, 2, 0]) { await wait(650); if (!live()) return; select(opts[i]); }
    });
  });

  /* 5. Live pill: a compact status grows into its controls and shrinks back */
  $$(".lab-island").forEach((el) => {
    const time = $(".time", el), mini = $(".mini-time", el);
    let secs = 3, timer = 0;
    const show = () => { const t = `0:${String(secs).padStart(2, "0")}`; time.textContent = t; mini.textContent = t; };
    const toggle = (open = !el.classList.contains("open")) => {
      el.classList.toggle("open", open);
      el.setAttribute("aria-expanded", open);
    };
    timer = setInterval(() => { secs = secs >= 10 ? 0 : secs + 1; show(); }, 1000);
    el.addEventListener("click", () => toggle());
    show();
    demos.set(el.closest(".lab-tile"), async (live) => {
      await wait(500); if (!live()) return; toggle(true);
      await wait(2200); if (!live()) return; toggle(false);
    });
  });

  /* 6. Status flip: the chip turns over and a small burst marks the change */
  $$(".lab-row").forEach((el) => {
    const hint = $(".lab-hint", el.closest(".lab-stage"));
    const flip = (ok = !el.classList.contains("ok")) => {
      el.classList.toggle("ok", ok);
      el.setAttribute("aria-pressed", ok);
      if (hint) hint.textContent = ok ? "Tap to undo" : "Tap to verify";
    };
    el.addEventListener("click", () => flip());
    demos.set(el.closest(".lab-tile"), async (live) => { await wait(700); if (!live()) return; flip(true); });
  });

  /* Each tile plays its demo once, in turn, when the section comes into view */
  if (!calm && demos.size) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        const tile = e.target, i = [...demos.keys()].indexOf(tile);
        let touched = false;
        tile.addEventListener("pointerdown", () => (touched = true), { once: true, capture: true });
        tile.addEventListener("keydown", () => (touched = true), { once: true, capture: true });
        setTimeout(() => { if (!touched) demos.get(tile)(() => !touched); }, 400 + (i % 3) * 450);
      }
    }, { threshold: 0.55 });
    demos.forEach((_, tile) => io.observe(tile));
  }
})();
