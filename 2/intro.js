// Home page intro. The <head> script adds html.intro before first paint when
// the intro should play; this file runs the timeline and always ends by
// removing that class, so the page can never stay hidden.
(() => {
  const root = document.documentElement;
  const replay = document.querySelector("[data-replay]");
  replay?.addEventListener("click", () => {
    try { sessionStorage.removeItem("intro-seen"); } catch {}
    // Browsers restore the old scroll position (or jump to a #hash) on reload,
    // so drop both before reloading; the head script then starts at the top.
    history.replaceState(null, "", location.pathname);
    history.scrollRestoration = "manual";
    scrollTo({ top: 0, behavior: "instant" });
    location.reload();
  });

  if (!root.classList.contains("intro")) return;

  const h1 = document.querySelector(".hero h1");
  const wrap = document.querySelector(".hero .wrap");
  const timers = [];
  const at = (ms, fn) => timers.push(setTimeout(fn, ms));
  let finished = false;

  // Wrap each word so it can resolve on its own.
  const words = [];
  for (const node of [...h1.childNodes]) {
    if (node.nodeType === Node.TEXT_NODE) {
      const frag = document.createDocumentFragment();
      for (const part of node.textContent.split(/(\s+)/)) {
        if (!part) continue;
        if (/^\s+$/.test(part)) { frag.append(" "); continue; }
        const span = document.createElement("span");
        span.className = "w";
        span.textContent = part;
        words.push(span);
        frag.append(span);
      }
      node.replaceWith(frag);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      node.classList.add("w");
      words.push(node);
    }
  }
  const em = h1.querySelector("em");
  const emText = em.textContent;
  em.style.width = `${em.getBoundingClientRect().width}px`; // hold the layout while it shows code

  // Design-tool chrome: a selection frame and a named cursor.
  const box = (el) => {
    const a = el.getBoundingClientRect(), b = wrap.getBoundingClientRect();
    return { x: a.left - b.left, y: a.top - b.top, w: a.width, h: a.height };
  };
  const hb = box(h1);
  const frame = document.createElement("div");
  frame.className = "intro-frame";
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = `left:${hb.x - 12}px;top:${hb.y - 8}px;width:${hb.w + 24}px;height:${hb.h + 16}px`;
  frame.innerHTML = `<i></i><i></i><i></i><i></i><b>H1 · Hero</b><u>${Math.round(hb.w)} × ${Math.round(hb.h)}</u>`;
  const cursor = document.createElement("div");
  cursor.className = "intro-cursor";
  cursor.setAttribute("aria-hidden", "true");
  cursor.innerHTML = `<svg viewBox="0 0 24 24"><path d="M4 2.5 19.5 11l-7 1.8L9.2 20z" fill="#4f7cff" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg><span>Aryan</span>`;
  const moveCursor = (x, y) => (cursor.style.transform = `translate(${x}px, ${y}px)`);
  moveCursor(hb.x + hb.w * 0.82, hb.y + hb.h + 40);
  wrap.append(frame, cursor);

  const finish = () => {
    if (finished) return;
    finished = true;
    timers.forEach(clearTimeout);
    em.textContent = emText;
    em.classList.remove("code");
    words.forEach((w) => w.classList.add("on"));
    frame.classList.remove("show");
    cursor.classList.remove("show");
    root.classList.remove("intro");
    try { sessionStorage.setItem("intro-seen", "1"); } catch {}
    history.scrollRestoration = "auto";
    setTimeout(() => {
      frame.remove();
      cursor.remove();
      em.style.width = "";
      root.classList.remove("intro-anim");
    }, 1400);
    ["pointerdown", "keydown", "wheel", "touchstart"].forEach((e) => removeEventListener(e, finish));
  };
  ["pointerdown", "keydown", "wheel", "touchstart"].forEach((e) => addEventListener(e, finish, { passive: true }));

  // Timeline
  scrollTo({ top: 0, behavior: "instant" });
  root.classList.add("intro-anim");
  at(120, () => frame.classList.add("show"));
  at(220, () => cursor.classList.add("show"));

  const emIndex = words.indexOf(em);
  let t = 520;
  words.forEach((w, i) => {
    if (i === emIndex) {
      const eb = box(em);
      at(t - 380, () => moveCursor(eb.x + eb.w * 0.6, eb.y + eb.h * 0.62));
      at(t, () => { em.textContent = "<builds />"; em.classList.add("code"); });
      at(t + 430, () => cursor.classList.add("click"));
      at(t + 560, () => {
        cursor.classList.remove("click");
        em.textContent = emText;
        em.classList.remove("code");
        em.classList.add("on");
      });
      t += 660;
    } else {
      at(t, () => w.classList.add("on"));
      t += 120;
    }
  });

  at(t + 260, () => {
    frame.classList.remove("show");
    moveCursor(hb.x + hb.w + 60, hb.y + hb.h + 80);
    cursor.classList.remove("show");
  });
  at(t + 420, finish);
})();
