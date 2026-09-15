import { CASES, EXPERIENCE, EDUCATION, SKILLS, PROFILE } from "./content.js";

/* =========================================================================
   Detail pages rendered into the reader overlay.
   ========================================================================= */

const pad2 = (n) => String(n).padStart(2, "0");

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
function parseMonth(str) {
  if (/present/i.test(str)) return new Date();
  const [m, y] = str.trim().split(/\s+/);
  return new Date(Number(y), MONTHS.indexOf(m.slice(0, 3).toLowerCase()), 1);
}
function duration(start, end) {
  const a = parseMonth(start);
  const b = parseMonth(end);
  const months = (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth() + 1;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y && `${y} yr${y > 1 ? "s" : ""}`, m && `${m} mo${m > 1 ? "s" : ""}`].filter(Boolean).join(" ");
}

function readTime(c) {
  const text = [c.lede, ...c.sections.flatMap((s) => [s.heading, s.callout, ...(s.body || []), ...(s.list || [])])]
    .concat(c.reflection?.learnings.map((l) => l.text) || [])
    .join(" ");
  return Math.max(1, Math.round(text.split(/\s+/).length / 220));
}

function topBar(crumb, prev, next) {
  const arrow = (href, label, d) =>
    href
      ? `<a class="r-icon" href="${href}" aria-label="${label}"><svg viewBox="0 0 24 24"><path d="${d}"/></svg></a>`
      : "";
  return `
    <div class="r-top">
      <button class="r-back" data-close>
        <svg viewBox="0 0 24 24"><path d="M14.5 6 8.5 12l6 6"/></svg>
        Back
      </button>
      <span class="r-crumb">${crumb}</span>
      <span class="r-top-right">
        <span class="r-hint">🤏 drag to scroll · ✊ close</span>
        ${arrow(prev, "Previous", "M14.5 6 8.5 12l6 6")}
        ${arrow(next, "Next", "m9.5 6 6 6-6 6")}
      </span>
    </div>`;
}

function figureHTML(fig) {
  const f = typeof fig === "string" ? { caption: fig } : fig;
  const media = f.src
    ? `<img src="${f.src}" alt="${f.alt || f.caption || ""}" loading="lazy" />`
    : `<div class="r-ph"><span>Image placeholder</span></div>`;
  return `<figure class="r-figure">${media}${f.caption ? `<figcaption>${f.caption}</figcaption>` : ""}</figure>`;
}

function sectionHTML(s, id) {
  return `
    <section class="r-section"${id ? ` id="${id}"` : ""}>
      ${s.eyebrow ? `<p class="r-eyebrow">${s.eyebrow}</p>` : ""}
      ${s.heading ? `<h2>${s.heading}</h2>` : ""}
      ${s.callout ? `<blockquote class="r-callout">${s.callout}</blockquote>` : ""}
      ${(s.body || []).map((p) => `<p>${p}</p>`).join("")}
      ${s.list ? `<ul class="r-list">${s.list.map((li) => `<li>${li}</li>`).join("")}</ul>` : ""}
      ${
        s.gallery
          ? `<div class="r-gallery">${s.gallery
              .map(
                (g) => `
            <figure>
              <img class="r-shot" src="${g.src}" alt="${g.alt || g.caption || ""}" loading="lazy" />
              ${g.caption ? `<figcaption>${g.caption}</figcaption>` : ""}
            </figure>`
              )
              .join("")}</div>`
          : ""
      }
      ${s.figure ? figureHTML(s.figure) : ""}
      ${
        s.compare
          ? `<div class="r-compare">${s.compare
              .map(
                (c) => `
            <figure class="r-figure">
              <div class="r-ph"><span class="r-verdict ${c.good ? "good" : "bad"}">${c.verdict}</span></div>
              <figcaption>${c.caption}</figcaption>
            </figure>`
              )
              .join("")}</div>`
          : ""
      }
    </section>`;
}

export function caseStudyPage(slug) {
  const i = CASES.findIndex((c) => c.slug === slug);
  if (i < 0) return null;
  const c = CASES[i];
  // Previous / next only make sense once there is more than one case study
  const prev = CASES.length > 1 ? CASES[i - 1] : null;
  const next = CASES.length > 1 ? CASES[(i + 1) % CASES.length] : null;
  const [a, b] = c.accent || ["#2a2722", "#a39a8c"];

  // Table of contents: one entry per section, keyed by element id
  const slugify = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const sectionIds = c.sections.map((s, k) => `sec-${k + 1}-${slugify(s.eyebrow || s.heading || "section")}`);
  const toc = [
    { id: "sec-overview", label: "Overview" },
    { id: "sec-impact", label: "Impact" },
    ...c.sections.map((s, k) => ({ id: sectionIds[k], label: s.eyebrow || s.heading })),
    c.reflection && { id: "sec-reflection", label: "Reflection" },
    c.next && { id: "sec-next", label: "What's next" },
  ].filter(Boolean);
  const tocHTML = `
    <nav class="r-toc" aria-label="On this page">
      <p class="r-eyebrow">On this page</p>
      <ol>
        ${toc
          .map((t, k) => `<li><button data-jump="${t.id}" data-toc="${t.id}"><span>${pad2(k + 1)}</span>${t.label}</button></li>`)
          .join("")}
      </ol>
      <p class="r-toc-meta">${readTime(c)} min read · ${c.year}</p>
      <button class="r-toc-top" data-jump="sec-overview">↑ Back to top</button>
    </nav>`;

  const hero = c.heroShots
    ? c.heroShots.map((src) => `<img src="${src}" alt="" />`).join("")
    : c.hero
    ? `<img src="${c.hero}" alt="${c.title}" />`
    : `<span class="r-hero-chip">Hero image placeholder</span>
       <span class="r-hero-title">${c.title}</span>`;

  return {
    title: `${c.title} — ${PROFILE.name}`,
    html: `
      ${topBar(`Case study ${pad2(i + 1)} / ${pad2(CASES.length)}`, prev && `#/work/${prev.slug}`, next && `#/work/${next.slug}`)}
      <div class="r-layout">
      ${tocHTML}
      <article class="r-page">
        <div class="r-hero${c.heroShots ? " r-hero-shots" : ""}" id="sec-overview" style="--a:${a};--b:${b}">${hero}</div>

        <div class="r-tags">${c.tags.map((t) => `<span>${t}</span>`).join("")}</div>
        <h1 tabindex="-1">${c.title} — ${c.subtitle}</h1>
        <p class="r-lede">${c.lede}</p>
        <div class="r-actions">
          ${c.link ? `<a class="r-btn" href="${c.link.href}" target="_blank" rel="noopener">${c.link.label} <span>→</span></a>` : ""}
          <span class="r-muted">${readTime(c)} min read · ${c.year}</span>
        </div>

        <dl class="r-meta">
          ${Object.entries(c.meta)
            .map(([k, v]) => `<div><dt>${k}</dt>${v.map((x) => `<dd>${x}</dd>`).join("")}</div>`)
            .join("")}
        </dl>

        <section class="r-section r-section-tight" id="sec-impact">
          <p class="r-eyebrow">Impact</p>
          <div class="r-impact">
            ${c.impact.map(([v, k]) => `<div><b>${v}</b><span>${k}</span></div>`).join("")}
          </div>
        </section>

        ${c.sections.map((s, k) => sectionHTML(s, sectionIds[k])).join("")}

        ${
          c.reflection
            ? `<section class="r-section" id="sec-reflection">
                <p class="r-eyebrow">Reflection</p>
                <h2>${c.reflection.heading}</h2>
                <ol class="r-learn">
                  ${c.reflection.learnings.map((l) => `<li><h3>${l.title}</h3><p>${l.text}</p></li>`).join("")}
                </ol>
              </section>`
            : ""
        }

        ${c.next ? sectionHTML({ eyebrow: "What's next", heading: c.next.heading, body: [c.next.body] }, "sec-next") : ""}

        ${
          next
            ? `<a class="r-next" href="#/work/${next.slug}">
                <span class="r-eyebrow">Next up</span>
                <strong>${next.title}</strong>
                <span>${next.subtitle}</span>
                <em>Read next →</em>
              </a>`
            : `<a class="r-next" href="#/experience">
                <span class="r-eyebrow">Keep reading</span>
                <strong>Experience</strong>
                <span>Roles, education and skills</span>
                <em>View experience →</em>
              </a>`
        }
      </article>
      </div>`,
  };
}

export function experiencePage() {
  const current = EXPERIENCE.find((e) => /present/i.test(e.end)) || EXPERIENCE[0];
  const first = EXPERIENCE[EXPERIENCE.length - 1];
  const years = Math.floor(
    (Date.now() - parseMonth(first.start).getTime()) / (365.25 * 24 * 3600 * 1000)
  );
  const total = years >= 1 ? `${years}+ years` : duration(first.start, "Present");

  const facts = [
    ["Currently", `${current.role}<br/><span class="r-muted">${current.company}</span>`],
    ["Experience", total],
    ["Based in", PROFILE.location],
    ["Availability", PROFILE.availability],
  ];

  return {
    title: `Experience — ${PROFILE.name}`,
    html: `
      ${topBar("Experience")}
      <article class="r-page r-exp">
        <p class="r-eyebrow">Experience</p>
        <h1 tabindex="-1">${PROFILE.headline}</h1>
        <p class="r-lede">${PROFILE.summary}</p>
        <div class="r-actions">
          <a class="r-btn primary" href="${PROFILE.resume}" download>Download résumé <span>↓</span></a>
          <a class="r-btn" href="mailto:${PROFILE.email}">Email me</a>
          <a class="r-btn" href="${PROFILE.linkedin}" target="_blank" rel="noopener">LinkedIn</a>
          <a class="r-btn" href="${PROFILE.github}" target="_blank" rel="noopener">GitHub</a>
          <button class="r-btn" data-print>Print</button>
        </div>

        <dl class="r-facts">
          ${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}
        </dl>

        <section class="r-section r-section-tight">
          <p class="r-eyebrow">At a glance</p>
          <ol class="r-glance">
            ${EXPERIENCE.map(
              (e) => `
              <li><button data-jump="exp-${e.id}">
                <span><strong>${e.role}</strong> · ${e.company}</span>
                <span class="r-muted">${e.start} – ${e.end}</span>
              </button></li>`
            ).join("")}
          </ol>
        </section>

        <section class="r-section">
          <p class="r-eyebrow">Roles</p>
          ${EXPERIENCE.map((e) => {
            const cs = e.caseStudy && CASES.find((c) => c.slug === e.caseStudy);
            return `
            <article class="r-role" id="exp-${e.id}">
              <div class="r-role-side">
                <span>${e.start} – ${e.end}</span>
                <span class="r-muted">${duration(e.start, e.end)}</span>
                <span class="r-muted">${e.location}</span>
                <span class="r-pill">${e.type}</span>
              </div>
              <div class="r-role-main">
                <h2>${e.role}</h2>
                <p class="r-company">${e.company}</p>
                <p>${e.summary}</p>
                <ul class="r-bullets">${e.highlights.map((h) => `<li>${h}</li>`).join("")}</ul>
                <div class="r-tags small">${e.skills.map((s) => `<span>${s}</span>`).join("")}</div>
                ${cs ? `<a class="r-link" href="#/work/${cs.slug}">Read the ${cs.title} case study →</a>` : ""}
              </div>
            </article>`;
          }).join("")}
        </section>

        <section class="r-section">
          <p class="r-eyebrow">Education</p>
          ${EDUCATION.map(
            (ed) => `
            <article class="r-role">
              <div class="r-role-side"><span>${ed.start ? `${ed.start} – ` : ""}${ed.end}</span></div>
              <div class="r-role-main">
                <h2>${ed.degree}</h2>
                <p class="r-company">${ed.school}</p>
                ${ed.notes ? `<p>${ed.notes}</p>` : ""}
              </div>
            </article>`
          ).join("")}
        </section>

        <section class="r-section">
          <p class="r-eyebrow">Skills</p>
          <div class="r-skills">
            ${SKILLS.map(
              (g) => `<div><h3>${g.group}</h3><ul>${g.items.map((s) => `<li>${s}</li>`).join("")}</ul></div>`
            ).join("")}
          </div>
        </section>

        <a class="r-next" href="#/work/${CASES[0].slug}">
          <span class="r-eyebrow">See the work</span>
          <strong>${CASES[0].title}</strong>
          <span>${CASES[0].subtitle}</span>
          <em>Read case study →</em>
        </a>
      </article>`,
  };
}
