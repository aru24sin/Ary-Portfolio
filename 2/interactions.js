// Interaction layer for every page. Each block is independent and exits
// quietly when its elements are missing, so pages only pay for what they use.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const onView = (els, fn, opts = { rootMargin: "0px 0px -10% 0px" }) => {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { fn(e.target); io.unobserve(e.target); }
    }, opts);
    els.forEach((el) => io.observe(el));
  };

  /* 1. Reading progress and current section (case studies) */
  const blocks = $$(".cs .block");
  if (blocks.length) {
    const bar = document.createElement("div");
    bar.className = "progress";
    bar.setAttribute("aria-hidden", "true");
    document.body.append(bar);

    const here = document.createElement("div");
    here.className = "nav-here mono";
    here.setAttribute("aria-hidden", "true");
    $(".nav .brand").after(here);
    const labels = blocks.map((b) => {
      const m = $(":scope > .mono", b);
      const strong = $("b", m)?.textContent.trim() ?? "";
      return { strong, rest: m.textContent.replace(strong, "").trim() };
    });
    let current = -1, ticking = false;
    const update = () => {
      ticking = false;
      const max = document.documentElement.scrollHeight - innerHeight;
      bar.style.setProperty("--p", max > 0 ? clamp(scrollY / max, 0, 1) : 0);
      let idx = -1;
      blocks.forEach((b, i) => { if (b.getBoundingClientRect().top < innerHeight * 0.4) idx = i; });
      if (idx === current) return;
      current = idx;
      if (idx < 0) return here.classList.remove("show");
      here.classList.add("swap");
      setTimeout(() => {
        here.innerHTML = `<b>${labels[idx].strong}</b>${labels[idx].rest}`;
        here.classList.remove("swap");
        here.classList.add("show");
      }, calm ? 0 : 160);
    };
    addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  /* 2. Groups arrive one item at a time */
  if (!calm) {
    const groups = $$(".gallery, .cards, .options, .ba, .skills, .impact, .vocab, .shifts, .wide.pair, .wide.three, .facts .wrap, .meta, .case-stats, .tags");
    groups.forEach((g) => {
      g.classList.add("stagger");
      [...g.children].forEach((c, i) => c.style.setProperty("--i", Math.min(i, 8)));
    });
    onView(groups, (g) => g.classList.add("in"));
  }

  /* 3. Numbers count up the first time they are seen */
  if (!calm) {
    const nums = $$(".impact b, .case-stats b").filter((el) => /^\D{0,2}\d+(\.\d+)?(?![\d–-])/.test(el.textContent.trim()) && !/[–-]\d/.test(el.textContent));
    nums.forEach((el) => {
      const [, pre, num, post] = el.textContent.trim().match(/^(\D*)(\d+(?:\.\d+)?)(.*)$/);
      const target = parseFloat(num), decimals = (num.split(".")[1] || "").length;
      if (!target) return;
      el.dataset.final = el.textContent;
      el.textContent = `${pre}${(0).toFixed(decimals)}${post}`;
      onView([el], () => {
        const start = performance.now(), dur = 1100;
        const tick = (now) => {
          const p = clamp((now - start) / dur, 0, 1), eased = 1 - Math.pow(1 - p, 3);
          el.textContent = p === 1 ? el.dataset.final : `${pre}${(target * eased).toFixed(decimals)}${post}`;
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    });
  }

  /* 4. Project cards: parallax art and a label that follows the pointer */
  const cases = $$(".case");
  if (cases.length && fine && !calm) {
    const tip = document.createElement("div");
    tip.className = "case-cursor";
    tip.setAttribute("aria-hidden", "true");
    tip.textContent = "View case study ↗";
    document.body.append(tip);
    document.documentElement.classList.add("has-case-cursor");
    let x = 0, y = 0, tx = 0, ty = 0, raf = 0;
    const follow = () => {
      x += (tx - x) * 0.2; y += (ty - y) * 0.2;
      tip.style.transform = `translate(${x + 14}px, ${y + 14}px)`;
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.2 ? requestAnimationFrame(follow) : 0;
    };
    cases.forEach((card) => {
      const art = $(".case-art", card);
      card.addEventListener("pointerenter", (e) => { x = tx = e.clientX; y = ty = e.clientY; tip.classList.add("show"); });
      card.addEventListener("pointermove", (e) => {
        tx = e.clientX; ty = e.clientY;
        if (!raf) raf = requestAnimationFrame(follow);
        const r = art.getBoundingClientRect();
        art.style.setProperty("--tx", (clamp((e.clientX - r.left) / r.width, 0, 1) - 0.5) * -14);
        art.style.setProperty("--ty", (clamp((e.clientY - r.top) / r.height, 0, 1) - 0.5) * -10);
      });
      card.addEventListener("pointerleave", () => {
        tip.classList.remove("show");
        art.style.setProperty("--tx", 0); art.style.setProperty("--ty", 0);
      });
    });
  }

  /* 5. Primary buttons lean toward the pointer */
  if (fine && !calm) {
    $$(".btn").forEach((btn) => {
      btn.addEventListener("pointermove", (e) => {
        const r = btn.getBoundingClientRect();
        btn.style.setProperty("--mx", `${((e.clientX - r.left) / r.width - 0.5) * 8}px`);
        btn.style.setProperty("--my", `${((e.clientY - r.top) / r.height - 0.5) * 6}px`);
      });
      btn.addEventListener("pointerleave", () => { btn.style.setProperty("--mx", "0px"); btn.style.setProperty("--my", "0px"); });
    });
  }

  /* 6. Dark panels: the glow follows the pointer */
  if (fine && !calm) {
    $$(".contact, .takeaway").forEach((panel) => {
      panel.classList.add("track");
      panel.addEventListener("pointermove", (e) => {
        const r = panel.getBoundingClientRect();
        panel.style.setProperty("--gx", `${((e.clientX - r.left) / r.width) * 100}%`);
        panel.style.setProperty("--gy", `${((e.clientY - r.top) / r.height) * 100}%`);
      });
    });
  }

  /* 7. Copy the email address */
  const mail = $(".contact .mail");
  if (mail && navigator.clipboard) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "copy";
    btn.textContent = "Copy";
    btn.setAttribute("aria-label", "Copy email address");
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(mail.textContent.trim());
        btn.textContent = "Copied ✓"; btn.classList.add("done");
        setTimeout(() => { btn.textContent = "Copy"; btn.classList.remove("done"); }, 1800);
      } catch {}
    });
    mail.after(btn);
  }

  /* 8. Images open in a lightbox; arrow keys move between them */
  const shots = $$(".cs figure img, .cover img").filter((img) => !img.closest(".slider"));
  if (shots.length && typeof HTMLDialogElement !== "undefined") {
    const box = document.createElement("dialog");
    box.className = "lightbox";
    box.innerHTML = `<figure><img alt="" /><figcaption></figcaption></figure>
      <button class="lb-prev" aria-label="Previous image">←</button>
      <button class="lb-next" aria-label="Next image">→</button>
      <button class="lb-close" aria-label="Close">✕</button>`;
    document.body.append(box);
    const big = $("img", box), cap = $("figcaption", box);
    let at = 0;
    const show = (i) => {
      at = (i + shots.length) % shots.length;
      const img = shots[at];
      big.src = img.currentSrc || img.src;
      big.alt = img.alt;
      cap.textContent = img.closest("figure")?.querySelector("figcaption")?.textContent || img.alt;
    };
    shots.forEach((img, i) => {
      img.classList.add("zoomable");
      img.tabIndex = 0;
      img.setAttribute("role", "button");
      img.setAttribute("aria-label", `Enlarge image: ${img.alt}`);
      const open = () => { show(i); box.showModal(); };
      img.addEventListener("click", open);
      img.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
    });
    $(".lb-prev", box).addEventListener("click", (e) => { e.stopPropagation(); show(at - 1); });
    $(".lb-next", box).addEventListener("click", (e) => { e.stopPropagation(); show(at + 1); });
    box.addEventListener("click", () => box.close());
    big.addEventListener("click", (e) => e.stopPropagation());
    box.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") show(at - 1);
      if (e.key === "ArrowRight") show(at + 1);
    });
  }

  /* 9. Before/after slider: a range input does the work, so keyboard and touch come free */
  $$(".slider").forEach((s) => {
    const input = $("input", s);
    const set = (v) => s.style.setProperty("--pos", `${v}%`);
    input.addEventListener("input", () => { s.classList.remove("auto"); set(input.value); });
    if (calm) return;
    onView([s], () => {                       // one small sweep to show it moves
      s.classList.add("auto");
      [[300, 74], [1300, 30], [2300, 50]].forEach(([ms, v]) => setTimeout(() => {
        if (s.classList.contains("auto")) { set(v); input.value = v; }
      }, ms));
      setTimeout(() => s.classList.remove("auto"), 3400);
    }, { threshold: 0.6 });
  });

  /* 11. Nav: the link for the section on screen stays underlined, and a section
        you jump to announces itself when the scroll lands */
  const hashLinks = $$('.nav-links a[href*="#"], .brand[href*="#"], .cta a[href^="#"], .skip').filter((l) => {
    const u = new URL(l.href);
    return u.pathname === location.pathname && u.hash.length > 1 && document.getElementById(u.hash.slice(1));
  });
  const arrive = (target) => {
    if (calm || !target || target.id === "top") return;
    target.classList.remove("arrive");
    void target.offsetWidth; // restart the animation if it is already there
    target.classList.add("arrive");
    clearTimeout(target._arrive);
    target._arrive = setTimeout(() => target.classList.remove("arrive"), 1300);
  };
  hashLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const target = document.getElementById(new URL(link.href).hash.slice(1));
      link.classList.add("tapped");
      setTimeout(() => link.classList.remove("tapped"), 500);
      let done = false;
      const land = () => { if (!done) { done = true; arrive(target); } };
      if ("onscrollend" in window) addEventListener("scrollend", land, { once: true });
      setTimeout(land, 900); // fallback, and for jumps that need no scrolling
    });
  });
  if (location.hash && !document.documentElement.classList.contains("intro")) {
    addEventListener("load", () => setTimeout(() => arrive(document.getElementById(location.hash.slice(1))), 350));
  }
  const spyLinks = $$('.nav-links a[href^="#"]:not(.btn)');
  if (spyLinks.length) {
    const byId = new Map(spyLinks.map((l) => [l.getAttribute("href").slice(1), l]));
    const spy = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        spyLinks.forEach((l) => l.removeAttribute("aria-current"));
        byId.get(e.target.id)?.setAttribute("aria-current", "true");
      }
    }, { rootMargin: "-45% 0px -50% 0px" });
    byId.forEach((_, id) => { const el = document.getElementById(id); if (el) spy.observe(el); });
    const top = document.getElementById("top");
    if (top) new IntersectionObserver(([e]) => { if (e.isIntersecting) spyLinks.forEach((l) => l.removeAttribute("aria-current")); }, { threshold: 0.6 }).observe(top);
  }

  /* 10. The flow video plays while it is on screen */
  $$(".phone-video, .clip").forEach((v) => {
    if (calm) return;
    new IntersectionObserver(([e]) => { e.isIntersecting ? v.play().catch(() => {}) : v.pause(); }, { threshold: 0.5 }).observe(v);
  });
})();
