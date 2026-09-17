# Featured Projects Stage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put a layered, CSS-3D stage between the Projects header and the terminal that shows one of two featured projects at a time, with a switcher that pushes the old scene back into depth.

**Architecture:** A new `FeaturedStage` component in `components.jsx` renders one absolutely-positioned scene per featured project inside a shared `perspective` box. Each scene is a plate, a screenshot, and a front layer (text chip or portrait inset), separated with `translateZ`. `LayoutStacked` mounts it above `ProjectsTerminal` and owns the terminal's `openId` so the stage's "read the file" link can open an entry. Which projects are featured is data, not code: any project in `data.js` with a `featured` block appears on the stage.

**Tech Stack:** Classic-script JSX (React 18 globals) compiled by `scripts/build.mjs` (esbuild) into the committed `app.bundle.js`; plain CSS in `style.css`; headless Playwright (installed in `/tmp/shots`) for verification.

**Spec:** `docs/superpowers/specs/2026-09-17-featured-projects-stage-design.md`

## Global Constraints

- **No new dependencies, no CDN, no WebGL.** Commit `054c557` removed a WebGL hero because it failed behind corporate proxies and made the page feel like a demo. DOM plus CSS transforms only.
- **No layout shift.** Commit `9270de9` removed hover lift for this reason. The stage box is reserved with `aspect-ratio`; only `transform`, `opacity`, and `filter` animate. Switching projects must not change the height of `#block-projects`.
- **`.jsx` files are classic scripts, not modules.** No `import`/`export`. All top-level names share one global scope, so every new top-level name must be unique across `icons.jsx`, `components.jsx`, `layouts.jsx`, `app.jsx`. `layouts.jsx` aliases its hooks as `useStateL` / `useEffectL`; use those inside `layouts.jsx` and plain `useState` / `useEffect` / `useRef` inside `components.jsx`.
- **The bundle is committed.** After any `.jsx` change run `node scripts/build.mjs` and commit `app.bundle.js` together with the source. The script rewrites the `app.bundle.js?v=` key in `index.html` itself; the `data.js?v=` key is bumped by hand.
- **Colours come from theme tokens only** (`--bg`, `--bg-alt`, `--fg`, `--fg-soft`, `--muted`, `--rule`, `--accent`, `--card`). Four themes exist: default/`paper` and `snow` (light) and `dark`. No hard-coded hex values except in shadows (`rgba(0,0,0,…)`), matching the existing terminal CSS.
- **Class prefix:** every new class starts with `pf-stage`.
- **Git identity is not configured on this machine.** Commit with `git -c user.name=ezequielcutin -c user.email=ezecutin@umich.edu commit …`. Do not change the global config.
- **Every commit message ends with:** `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`
- **Do not push.** The user pushes, or asks for a push, separately.

## File Structure

| File | Change | Responsibility |
| --- | --- | --- |
| `featured/shader-tool.webp` | create | Main shot for the Shader Tool scene (1600px wide) |
| `featured/quietly-build.webp` | create | Main shot for Quietly Build (Ideas web, 1082px wide) |
| `featured/quietly-build-hearth.webp` | create | Portrait inset for Quietly Build (700px wide) |
| `shader-tool-editor.png` | delete | Replaced by the 1600px WebP, which the terminal entry also uses |
| `data.js` | modify | `featured` blocks on the two projects; terminal image src |
| `components.jsx` | modify | New `FeaturedStage`; `ProjectsTerminal` gains optional controlled props |
| `layouts.jsx` | modify | `LayoutStacked` mounts the stage and owns the terminal's open id |
| `style.css` | modify | `pf-stage` section after the terminal block; print rule |
| `index.html` | modify | `data.js?v=` cache key |
| `app.bundle.js` | rebuild | Committed build output |

Verification scripts live in `/tmp/shots/` and are **not** committed — Playwright is not a repo dependency.

---

## Task 1: Encode the featured images

The repo has no image tooling, so the resizing happens in headless Chromium's canvas. This task also installs `esbuild`, which is missing (`npm run build` currently fails with `Cannot find package 'esbuild'`).

**Files:**
- Create: `featured/shader-tool.webp`, `featured/quietly-build.webp`, `featured/quietly-build-hearth.webp`
- Delete: `shader-tool-editor.png`
- Script (not committed): `/tmp/shots/encode.mjs`

**Interfaces:**
- Consumes: source PNGs staged in `.assets-src/quietly-build/` (gitignored) and the tracked `shader-tool-editor.png`.
- Produces: three WebP files under `featured/`, referenced by `data.js` in Task 2.

- [ ] **Step 1: Install the build dependency**

```bash
cd /home/ezecutin/src/portfolio
npm install
node scripts/build.mjs
```

Expected: `built app.bundle.js — <size> KB, v=<hash>, <n>ms`. If `index.html` changed (a new hash), that is normal — leave it; it gets committed with the first bundle change in Task 3. If it changed but the bundle content is identical to the committed one, `git checkout index.html` to keep this task's diff clean.

- [ ] **Step 2: Confirm the sources are where the plan expects**

```bash
cd /home/ezecutin/src/portfolio
file shader-tool-editor.png .assets-src/quietly-build/ideas-web.png .assets-src/quietly-build/hearth-intentions.png
```

Expected: `2880 x 1800`, `1082 x 879`, `773 x 1237`. If `.assets-src/` is missing, the screenshots were not staged — stop and ask.

- [ ] **Step 3: Write the encoder**

Create `/tmp/shots/encode.mjs`:

```js
import { chromium } from "playwright";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const ROOT = "/home/ezecutin/src/portfolio";
const JOBS = [
  { in: `${ROOT}/shader-tool-editor.png`, out: `${ROOT}/featured/shader-tool.webp`, width: 1600, quality: 0.86 },
  { in: `${ROOT}/.assets-src/quietly-build/ideas-web.png`, out: `${ROOT}/featured/quietly-build.webp`, width: 1082, quality: 0.9 },
  { in: `${ROOT}/.assets-src/quietly-build/hearth-intentions.png`, out: `${ROOT}/featured/quietly-build-hearth.webp`, width: 700, quality: 0.9 },
];

const browser = await chromium.launch();
const page = await browser.newPage();

for (const job of JOBS) {
  const b64 = (await readFile(job.in)).toString("base64");
  const out = await page.evaluate(async ({ b64, width, quality }) => {
    const img = new Image();
    img.src = "data:image/png;base64," + b64;
    await img.decode();
    const w = Math.min(width, img.naturalWidth);
    const h = Math.round((img.naturalHeight / img.naturalWidth) * w);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d").drawImage(img, 0, 0, w, h);
    const blob = await new Promise((r) => canvas.toBlob(r, "image/webp", quality));
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let s = "";
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return { b64: btoa(s), w, h };
  }, { b64, width: job.width, quality: job.quality });

  await mkdir(dirname(job.out), { recursive: true });
  await writeFile(job.out, Buffer.from(out.b64, "base64"));
  console.log(`${job.out} — ${out.w}x${out.h}`);
}

await browser.close();
```

- [ ] **Step 4: Run it and check the output**

```bash
cd /tmp/shots && node encode.mjs
cd /home/ezecutin/src/portfolio && file featured/*.webp && ls -l featured/
```

Expected: three `RIFF … Web/P image` files at `1600x1000`, `1082x879`, `700x1120`. Each must be under 200 KB; if `shader-tool.webp` is larger, re-run with `quality: 0.8`.

- [ ] **Step 5: Look at them**

Open each WebP and confirm it is the right screenshot, not a blank or half-drawn canvas: the shader tool editor with its node graph, the Quietly Build idea web with labelled nodes, and the Hearth "What matters today?" screen.

- [ ] **Step 6: Drop the oversized PNG and commit**

```bash
cd /home/ezecutin/src/portfolio
git rm --cached shader-tool-editor.png && rm -f shader-tool-editor.png
git add featured/
git -c user.name=ezequielcutin -c user.email=ezecutin@umich.edu commit -m "$(cat <<'MSG'
assets: add featured-stage screenshots as webp

The 2880px shader tool PNG is replaced by a 1600px webp; the two Quietly
Build shots are encoded from the in-app captures. Encoded through headless
Chromium's canvas because this machine has no image tooling.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
)"
```

Note: the site still points at `shader-tool-editor.png` until Task 2, so the terminal's preview image is broken between these two commits. That is why Task 2 follows immediately.

---

## Task 2: Mark the featured projects in data.js

**Files:**
- Modify: `data.js` (the `shader-tool` and `quietly-build` entries)
- Modify: `index.html:137` (the `data.js?v=` cache key)
- Script (not committed): `/tmp/shots/lib.mjs`, `/tmp/shots/t2-data.mjs`

**Interfaces:**
- Consumes: the WebP files from Task 1.
- Produces: `project.featured = { line: string, shot: { src, alt }, chip?: string, inset?: { src, alt } }`. Every later task reads exactly these property names. A featured block carries `chip` or `inset`, never both.

- [ ] **Step 1: Write the shared test helper**

Create `/tmp/shots/lib.mjs`:

```js
import { chromium } from "playwright";

export const SITE = "http://localhost:5173/";

export async function withPage(opts, fn) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: opts.viewport || { width: 1440, height: 900 },
    deviceScaleFactor: opts.scale || 2,
    reducedMotion: opts.reducedMotion || "no-preference",
    hasTouch: !!opts.touch,
    isMobile: !!opts.touch,
  });
  if (opts.theme) {
    await ctx.addInitScript((t) => {
      try { localStorage.setItem("pf-theme", t); } catch (e) {}
    }, opts.theme);
  }
  const page = await ctx.newPage();
  await page.goto(SITE, { waitUntil: "networkidle" });
  await page.locator("#block-projects").scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  try {
    await fn(page);
  } finally {
    await browser.close();
  }
}

export function assert(cond, msg) {
  if (cond) console.log("pass: " + msg);
  else { console.error("FAIL: " + msg); process.exitCode = 1; }
}
```

- [ ] **Step 2: Write the failing test**

Create `/tmp/shots/t2-data.mjs`:

```js
import { withPage, assert } from "./lib.mjs";

await withPage({}, async (page) => {
  const data = await page.evaluate(() => {
    const byId = {};
    for (const p of window.PORTFOLIO_DATA.projects) byId[p.id] = p;
    return {
      shader: byId["shader-tool"],
      quietly: byId["quietly-build"],
      featuredIds: window.PORTFOLIO_DATA.projects.filter((p) => p.featured).map((p) => p.id),
    };
  });

  assert(
    data.featuredIds.join(",") === "shader-tool,quietly-build",
    "exactly two projects are featured, shader-tool first"
  );
  assert(!!data.shader.featured.line && !!data.quietly.featured.line, "both have a line");
  assert(data.shader.featured.shot.src === "featured/shader-tool.webp", "shader shot points at the webp");
  assert(!!data.shader.featured.chip && !data.shader.featured.inset, "shader uses a chip, not an inset");
  assert(!!data.quietly.featured.inset && !data.quietly.featured.chip, "quietly uses an inset, not a chip");
  assert(
    data.shader.images[0].src === "featured/shader-tool.webp",
    "the terminal entry uses the resized webp too"
  );

  const missing = await page.evaluate(async () => {
    const srcs = [
      "featured/shader-tool.webp",
      "featured/quietly-build.webp",
      "featured/quietly-build-hearth.webp",
    ];
    const bad = [];
    for (const src of srcs) {
      const res = await fetch(src, { method: "HEAD" });
      if (!res.ok) bad.push(src);
    }
    return bad;
  });
  assert(missing.length === 0, "all three images are fetchable: " + (missing.join(", ") || "none missing"));
});
```

- [ ] **Step 3: Run it and watch it fail**

```bash
cd /home/ezecutin/src/portfolio && npm run dev
cd /tmp/shots && node t2-data.mjs
```

Expected: FAIL on the featured-ids assertion (no project has a `featured` block yet). The dev server keeps running for the rest of the plan; `npm run dev:stop` shuts it down.

- [ ] **Step 4: Add the featured block to `shader-tool`**

In `data.js`, inside the `shader-tool` entry, change the `images` line and add `featured` after `stack`:

```js
      stack: ["React", "TypeScript", "WebGL", "GLSL", "React Flow", "Vite", "Vitest", "IndexedDB"],
      images: [{ src: "featured/shader-tool.webp", alt: "Universal Shader Tool editor: a node graph beside a live shader stage" }],
      featured: {
        line: "Wire a node graph, watch WebGL recompile, export standalone code.",
        shot: { src: "featured/shader-tool.webp", alt: "Universal Shader Tool editor: a node graph beside a live shader stage" },
        chip: "30 node types · 525 tests",
      },
```

- [ ] **Step 5: Add the featured block to `quietly-build`**

In the `quietly-build` entry, after `stack`:

```js
      featured: {
        line: "Daily rituals instead of task lists, with an idea graph that links what you are thinking about.",
        shot: {
          src: "featured/quietly-build.webp",
          alt: "Quietly Build's idea web: eleven ideas as glowing nodes, grouped and linked",
        },
        inset: {
          src: "featured/quietly-build-hearth.webp",
          alt: "Quietly Build's hearth screen asking what matters today, with an intentions field",
        },
      },
```

- [ ] **Step 6: Bump the data cache key**

In `index.html`, change `<script src="data.js?v=content5"></script>` to `data.js?v=content6`.

- [ ] **Step 7: Run the test again**

```bash
cd /tmp/shots && node t2-data.mjs
```

Expected: every line prints `pass:`.

- [ ] **Step 8: Commit**

```bash
cd /home/ezecutin/src/portfolio
git add data.js index.html
git -c user.name=ezequielcutin -c user.email=ezecutin@umich.edu commit -m "$(cat <<'MSG'
feat(projects): mark the two featured projects in data

Which projects reach the stage is data, not code: a featured block holds
the one-line pitch, the main shot, and either a text chip or a portrait
inset.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
)"
```

---

## Task 3: The stage itself

Markup, styles, and switching. No pointer tilt and no swipe yet — those are Task 4. The depth transition on switch is pure CSS, so it lands here.

**Files:**
- Modify: `components.jsx` (new `FeaturedStage`, placed just before the `// ───────── Projects terminal` comment at line 240)
- Modify: `layouts.jsx` (inside `#block-projects`, between `PrintProjects` and `ProjectsTerminal`)
- Modify: `style.css` (new section before `/* ═══════════ THEME TOGGLE ═══════════ */` at line 3842)
- Rebuild: `app.bundle.js`
- Script (not committed): `/tmp/shots/t3-stage.mjs`

**Interfaces:**
- Consumes: `project.featured` from Task 2.
- Produces:
  - `FeaturedStage({ items, onOpenProject })` — `items` is the full projects array (it filters for `featured` itself); `onOpenProject` is an optional `(id: string) => void`. It renders nothing when no project is featured. The "read the file ↓" button renders only when `onOpenProject` is given, so Task 5 turns it on.
  - DOM contract later tasks rely on: `.pf-stage`, `.pf-stage__tabs`, `.pf-stage__tab` (one per featured project, `.is-active` on the current one), `.pf-stage__scene`, `.pf-stage__deck`, `.pf-stage__card` (`.is-active` / `.is-prev`), `.pf-stage__panel` (one per project, `hidden` on inactive ones).
  - CSS custom properties `--pf-rx` and `--pf-ry` on `.pf-stage__deck` drive the tilt; the default resting pose lives in the stylesheet, so Task 4 only sets and clears them.

- [ ] **Step 1: Write the failing test**

Create `/tmp/shots/t3-stage.mjs`:

```js
import { withPage, assert } from "./lib.mjs";

await withPage({}, async (page) => {
  assert(await page.locator(".pf-stage").count() === 1, "the stage renders once");

  const tabs = page.locator(".pf-stage__tab");
  assert(await tabs.count() === 2, "two tabs");
  assert((await tabs.nth(0).textContent()).trim() === "shader-tool", "first tab is shader-tool");

  const stageTop = await page.locator(".pf-stage").boundingBox();
  const termTop = await page.locator(".pf-term").boundingBox();
  assert(stageTop.y < termTop.y, "the stage sits above the terminal");

  assert(
    await page.locator(".pf-stage__card.is-active .pf-stage__chip").count() === 1,
    "the shader scene shows its chip"
  );

  const before = await page.locator("#block-projects").boundingBox();
  await tabs.nth(1).click();
  await page.waitForTimeout(800);
  const after = await page.locator("#block-projects").boundingBox();
  assert(Math.abs(before.height - after.height) < 1, "switching does not change the section height");

  assert(await page.locator(".pf-stage__card.is-active").count() === 1, "exactly one active card");
  const title = await page.locator(".pf-stage__panel:not([hidden]) .pf-stage__title").textContent();
  assert(title.trim() === "Quietly Build", "the panel follows the tab");
  assert(
    await page.locator(".pf-stage__card.is-active .pf-stage__inset img").count() === 1,
    "the quietly scene shows its portrait inset"
  );
  assert(
    await tabs.nth(1).getAttribute("aria-selected") === "true" &&
    await tabs.nth(0).getAttribute("aria-selected") === "false",
    "aria-selected tracks the active tab"
  );

  // translateZ scales layers outward under perspective, so a layer can reach
  // past its own box by design. What must not happen is the page gaining a
  // horizontal scrollbar.
  const noScroll = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 1
  );
  assert(noScroll, "the stage adds no horizontal page scroll");
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
cd /tmp/shots && node t3-stage.mjs
```

Expected: FAIL on "the stage renders once" (0 found).

- [ ] **Step 3: Add the component**

In `components.jsx`, immediately above the line `// ───────── Projects terminal (~/projects explorer) ─────────`, insert:

```jsx
// ───────── Featured projects stage (layered 3D showcase) ─────────
// Depth here is in service of the screenshots: a plate, the shot, and one
// front layer, separated with translateZ inside a shared perspective box.
// Every scene is absolutely positioned in the same reserved box, so
// switching moves pixels and never reflows (see 9270de9).
function FeaturedStage({ items, onOpenProject }) {
  const featured = items.filter((p) => p.featured);
  const [activeId, setActiveId] = useState(featured[0] ? featured[0].id : null);
  const [prevId, setPrevId] = useState(null);
  // Only the first scene's images load up front; the rest wait for intent.
  const [loaded, setLoaded] = useState(featured[0] ? [featured[0].id] : []);
  const tabsRef = useRef(null);

  const preload = (id) => setLoaded((l) => (l.indexOf(id) < 0 ? l.concat(id) : l));
  const select = (id) => {
    if (id === activeId) return;
    setPrevId(activeId);
    setActiveId(id);
    preload(id);
  };

  const activeIdx = Math.max(0, featured.findIndex((p) => p.id === activeId));

  const onTabKeyDown = (e) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    let next = null;
    if (step) next = (activeIdx + step + featured.length) % featured.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = featured.length - 1;
    if (next === null) return;
    e.preventDefault();
    select(featured[next].id);
    const rows = tabsRef.current && tabsRef.current.querySelectorAll(".pf-stage__tab");
    if (rows && rows[next]) rows[next].focus();
  };

  if (!featured.length) return null;

  return (
    <div className="pf-stage">
      <div
        className="pf-stage__tabs"
        role="tablist"
        aria-label="Featured projects"
        ref={tabsRef}
        onKeyDown={onTabKeyDown}
      >
        {featured.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            id={`pf-stage-tab-${p.id}`}
            aria-selected={p.id === activeId ? "true" : "false"}
            aria-controls={`pf-stage-panel-${p.id}`}
            tabIndex={p.id === activeId ? 0 : -1}
            className={`pf-stage__tab ${p.id === activeId ? "is-active" : ""}`}
            onClick={() => select(p.id)}
            onMouseEnter={() => preload(p.id)}
            onFocus={() => preload(p.id)}
          >
            {p.id}
          </button>
        ))}
      </div>

      <div className="pf-stage__body">
        {/* Decorative: the panel carries the same information as text. */}
        <div className="pf-stage__scene" aria-hidden="true">
          <div className="pf-stage__deck">
            {featured.map((p) => {
              const state = p.id === activeId ? "is-active" : p.id === prevId ? "is-prev" : "";
              const show = loaded.indexOf(p.id) >= 0;
              return (
                <div key={p.id} className={`pf-stage__card ${state}`}>
                  <div className="pf-stage__plate" />
                  <div className="pf-stage__shot">
                    {show && <img src={p.featured.shot.src} alt="" decoding="async" />}
                  </div>
                  {p.featured.chip && <p className="pf-stage__chip">{p.featured.chip}</p>}
                  {p.featured.inset && (
                    <div className="pf-stage__inset">
                      {show && <img src={p.featured.inset.src} alt="" decoding="async" />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {featured.map((p, i) => (
          <div
            key={p.id}
            className="pf-stage__panel"
            id={`pf-stage-panel-${p.id}`}
            role="tabpanel"
            aria-labelledby={`pf-stage-tab-${p.id}`}
            tabIndex={0}
            hidden={p.id !== activeId}
          >
            <p className="pf-stage__meta">featured · {i + 1} / {featured.length}</p>
            <h3 className="pf-stage__title">{p.title}</h3>
            <p className="pf-stage__line">{p.featured.line}</p>
            {/* The scene is aria-hidden, so the shot is described once here. */}
            <p className="pf-sr-only">{p.featured.shot.alt}</p>
            {p.links && (
              <div className="pf-stage__links">
                {p.links.map((l, li) => (
                  <a
                    key={li}
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pf-term__link"
                  >
                    <span>{l.label}</span>
                    <span className="pf-term__link__arrow" aria-hidden="true">↗</span>
                  </a>
                ))}
              </div>
            )}
            {onOpenProject && (
              <button
                type="button"
                className="pf-stage__read"
                onClick={() => onOpenProject(p.id)}
              >
                read the file <span aria-hidden="true">↓</span>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Mount it in the layout**

In `layouts.jsx`, inside the `#block-projects` section, add the stage between `PrintProjects` and `ProjectsTerminal`:

```jsx
          <PrintProjects items={data.projects} />
          <FeaturedStage items={data.projects} />
          <ProjectsTerminal items={data.projects} />
```

- [ ] **Step 5: Add the styles**

In `style.css`, immediately before the line `/* ═══════════ THEME TOGGLE ═══════════ */`, insert:

```css
/* ═══════════ Featured projects stage (layered 3D showcase) ═══════════ */
.pf-stage { margin-top: 34px; }

.pf-stage__tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.pf-stage__tab {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--fg-soft);
  background: transparent;
  border: 1px solid var(--rule);
  border-radius: 8px;
  padding: 6px 12px;
  cursor: pointer;
  transition: border-color 160ms ease, color 160ms ease, background-color 160ms ease;
}
.pf-stage__tab:hover { color: var(--accent); border-color: var(--accent); }
.pf-stage__tab.is-active {
  color: var(--accent);
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, transparent);
}

.pf-stage__body {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
  gap: 30px;
  align-items: center;
}

/* The scene's box is reserved by aspect-ratio so switching scenes cannot
   move the terminal below it. */
.pf-stage__scene { perspective: 1100px; }
.pf-stage__deck {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  transform-style: preserve-3d;
  transform: rotateX(var(--pf-rx, 8deg)) rotateY(var(--pf-ry, -10deg));
  transition: transform 420ms cubic-bezier(0.2, 0.7, 0.2, 1);
}

.pf-stage__card {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transform: translateZ(-120px);
  opacity: 0;
  filter: blur(4px);
  pointer-events: none;
  transition:
    transform 500ms cubic-bezier(0.2, 0.7, 0.2, 1),
    opacity 500ms ease,
    filter 500ms ease;
}
.pf-stage__card.is-active { transform: translateZ(0); opacity: 1; filter: none; }

.pf-stage__plate {
  position: absolute;
  inset: 0;
  border-radius: 16px;
  border: 1px solid var(--rule);
  background: radial-gradient(
    120% 90% at 30% 15%,
    color-mix(in srgb, var(--accent) 14%, var(--bg-alt)),
    var(--bg-alt) 70%
  );
  transform: translateZ(0);
}

/* Both products have dark UIs, so the frame keeps the shot reading as a
   screen on a surface rather than a hole in a light page. */
.pf-stage__shot {
  position: absolute;
  left: 6%;
  top: 13%;
  width: 79%;
  height: 72%;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--rule);
  background: var(--card);
  box-shadow: 0 30px 60px -20px rgba(0, 0, 0, 0.55);
  transform: translateZ(40px);
}
.pf-stage__shot img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top left;
}

.pf-stage__chip {
  position: absolute;
  right: 4%;
  bottom: 6%;
  margin: 0;
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1.4;
  color: var(--fg-soft);
  background: var(--card);
  border: 1px solid var(--rule);
  border-radius: 8px;
  padding: 8px 11px;
  box-shadow: 0 18px 40px -12px rgba(0, 0, 0, 0.6);
  transform: translateZ(100px);
}

.pf-stage__inset {
  position: absolute;
  right: 4%;
  top: 20%;
  width: 21%;
  height: 84%;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid var(--rule);
  background: var(--card);
  box-shadow: 0 22px 46px -14px rgba(0, 0, 0, 0.65);
  transform: translateZ(100px);
}
.pf-stage__inset img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
}

.pf-stage__panel[hidden] { display: none; }
.pf-stage__meta {
  margin: 0 0 8px;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--muted);
}
.pf-stage__title { margin: 0 0 8px; font-size: 22px; font-weight: 600; color: var(--fg); }
.pf-stage__line { margin: 0; color: var(--fg-soft); font-size: 14px; line-height: 1.55; }
.pf-stage__links { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
.pf-stage__read {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 14px;
  padding: 0;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--muted);
  background: none;
  border: 0;
  cursor: pointer;
  transition: color 160ms ease;
}
.pf-stage__read:hover { color: var(--accent); }
```

- [ ] **Step 6: Build and re-run the test**

```bash
cd /home/ezecutin/src/portfolio && node scripts/build.mjs
cd /tmp/shots && node t3-stage.mjs
```

Expected: every line prints `pass:`. If the height assertion fails, something in the scene is sized by content rather than by the reserved box — check that `.pf-stage__deck` kept its `aspect-ratio` and that no layer sets `position: static`.

- [ ] **Step 7: Look at it**

```bash
cd /tmp/shots && cat > t3-shot.mjs <<'EOF'
import { withPage } from "./lib.mjs";
for (const theme of ["dark", "paper"]) {
  await withPage({ theme }, async (page) => {
    await page.locator(".pf-stage").screenshot({ path: `stage-${theme}.png` });
  });
}
EOF
node t3-shot.mjs
```

Open `stage-dark.png` and `stage-paper.png`. Check that the shot is legible, the chip does not sit on top of anything important, and the plate reads as a surface in both themes.

- [ ] **Step 8: Commit**

```bash
cd /home/ezecutin/src/portfolio
git add components.jsx layouts.jsx style.css index.html app.bundle.js
git -c user.name=ezequielcutin -c user.email=ezecutin@umich.edu commit -m "$(cat <<'MSG'
feat(projects): add the featured stage above the terminal

One layered scene per featured project in a shared perspective box, with a
tab switcher. Scenes are stacked in the same reserved box, so switching
moves only transform, opacity, and filter.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
)"
```

---

## Task 4: Pointer tilt, swipe, and reduced motion

**Files:**
- Modify: `components.jsx` (`FeaturedStage` — add the tilt effect and touch handlers)
- Modify: `style.css` (reduced-motion block appended to the `pf-stage` section)
- Rebuild: `app.bundle.js`
- Script (not committed): `/tmp/shots/t4-motion.mjs`

**Interfaces:**
- Consumes: `.pf-stage__scene` / `.pf-stage__deck` and the `--pf-rx` / `--pf-ry` custom properties from Task 3.
- Produces: no new exported names. The effect sets `--pf-rx` / `--pf-ry` as inline styles on the deck and removes them on pointer leave.

- [ ] **Step 1: Write the failing test**

Create `/tmp/shots/t4-motion.mjs`:

```js
import { withPage, assert } from "./lib.mjs";

// Pointer tilt on a fine pointer.
await withPage({}, async (page) => {
  const deck = page.locator(".pf-stage__deck");
  const box = await page.locator(".pf-stage__scene").boundingBox();

  await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.2);
  await page.waitForTimeout(250);
  const rx = await deck.evaluate((el) => el.style.getPropertyValue("--pf-rx"));
  const ry = await deck.evaluate((el) => el.style.getPropertyValue("--pf-ry"));
  assert(rx !== "" && ry !== "", `pointer move tilts the deck (rx=${rx}, ry=${ry})`);

  const deg = (v) => parseFloat(v);
  assert(Math.abs(deg(rx) - 8) <= 8.01, "rotateX stays within 8deg of rest");
  assert(Math.abs(deg(ry) + 10) <= 8.01, "rotateY stays within 8deg of rest");

  await page.mouse.move(box.x - 60, box.y - 60);
  await page.waitForTimeout(250);
  assert(
    (await deck.evaluate((el) => el.style.getPropertyValue("--pf-rx"))) === "",
    "the deck returns to its resting pose on pointer leave"
  );
});

// Swipe on a touch device switches scenes.
await withPage({ touch: true, viewport: { width: 390, height: 844 } }, async (page) => {
  const first = await page.locator(".pf-stage__tab.is-active").textContent();
  await page.locator(".pf-stage__scene").evaluate((el) => {
    const mk = (type, x) => {
      const t = new Touch({ identifier: 1, target: el, clientX: x, clientY: 160 });
      return new TouchEvent(type, {
        touches: type === "touchend" ? [] : [t],
        changedTouches: [t],
        bubbles: true,
      });
    };
    el.dispatchEvent(mk("touchstart", 300));
    el.dispatchEvent(mk("touchend", 90));
  });
  await page.waitForTimeout(800);
  const next = await page.locator(".pf-stage__tab.is-active").textContent();
  assert(first.trim() !== next.trim(), `swiping left advances the stage (${first.trim()} -> ${next.trim()})`);
});

// Reduced motion: flat, and no tilt listeners.
await withPage({ reducedMotion: "reduce" }, async (page) => {
  const deck = page.locator(".pf-stage__deck");
  const t = await deck.evaluate((el) => getComputedStyle(el).transform);
  assert(t === "none" || t === "matrix(1, 0, 0, 1, 0, 0)", `deck is flat under reduced motion (${t})`);

  const box = await page.locator(".pf-stage__scene").boundingBox();
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.3);
  await page.waitForTimeout(250);
  assert(
    (await deck.evaluate((el) => el.style.getPropertyValue("--pf-rx"))) === "",
    "no tilt is applied under reduced motion"
  );

  await page.locator(".pf-stage__tab").nth(1).click();
  await page.waitForTimeout(500);
  const card = await page.locator(".pf-stage__card.is-active").evaluate((el) => getComputedStyle(el).transform);
  assert(card === "none" || card === "matrix(1, 0, 0, 1, 0, 0)", `switching is a flat crossfade (${card})`);
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
cd /tmp/shots && node t4-motion.mjs
```

Expected: FAIL on "pointer move tilts the deck" (the property is empty) and on the swipe assertion.

- [ ] **Step 3: Add the tilt effect**

In `FeaturedStage`, add two refs beside `tabsRef`:

```jsx
  const deckRef = useRef(null);
  const frameRef = useRef(0);
  const touchRef = useRef(null);
```

and put the effect after the `select` / `preload` definitions:

```jsx
  // Tilt toward the pointer, capped at 8deg from the resting pose on each
  // axis, and only where a real pointer exists. Writes go through rAF so a
  // burst of pointermove events costs one style write per frame.
  useEffect(() => {
    const deck = deckRef.current;
    const scene = deck && deck.parentElement;
    if (!scene) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let pending = null;
    const apply = () => {
      frameRef.current = 0;
      if (!pending) return;
      deck.style.setProperty("--pf-rx", pending.rx.toFixed(2) + "deg");
      deck.style.setProperty("--pf-ry", pending.ry.toFixed(2) + "deg");
    };
    const onMove = (e) => {
      const r = scene.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      pending = { rx: 8 - y * 16, ry: -10 + x * 16 };
      if (!frameRef.current) frameRef.current = requestAnimationFrame(apply);
    };
    const onLeave = () => {
      pending = null;
      if (frameRef.current) { cancelAnimationFrame(frameRef.current); frameRef.current = 0; }
      deck.style.removeProperty("--pf-rx");
      deck.style.removeProperty("--pf-ry");
    };

    scene.addEventListener("pointermove", onMove);
    scene.addEventListener("pointerleave", onLeave);
    return () => {
      scene.removeEventListener("pointermove", onMove);
      scene.removeEventListener("pointerleave", onLeave);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);
```

- [ ] **Step 4: Add the swipe handlers**

Next to `onTabKeyDown`, add:

```jsx
  // Swipe is an enhancement; the tabs stay the primary control.
  const onTouchStart = (e) => {
    const t = e.touches[0];
    touchRef.current = t ? { x: t.clientX, y: t.clientY } : null;
  };
  const onTouchEnd = (e) => {
    const start = touchRef.current;
    touchRef.current = null;
    const t = e.changedTouches && e.changedTouches[0];
    if (!start || !t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    // Ignore taps and anything closer to a vertical scroll than a swipe.
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const step = dx < 0 ? 1 : -1;
    select(featured[(activeIdx + step + featured.length) % featured.length].id);
  };
```

Wire them and the ref onto the scene:

```jsx
        <div
          className="pf-stage__scene"
          aria-hidden="true"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className="pf-stage__deck" ref={deckRef}>
```

- [ ] **Step 5: Add the reduced-motion rules**

Append to the `pf-stage` section in `style.css`:

```css
@media (prefers-reduced-motion: reduce) {
  /* Flat stack, plain crossfade: the layering survives as overlap, the
     depth motion does not. */
  .pf-stage__deck { transform: none; transition: none; }
  .pf-stage__card {
    transform: none;
    filter: none;
    transition: opacity 180ms linear;
  }
  .pf-stage__card.is-active { transform: none; }
  .pf-stage__plate,
  .pf-stage__shot,
  .pf-stage__chip,
  .pf-stage__inset { transform: none; }
}
```

- [ ] **Step 6: Build and re-run the test**

```bash
cd /home/ezecutin/src/portfolio && node scripts/build.mjs
cd /tmp/shots && node t4-motion.mjs
```

Expected: every line prints `pass:`.

- [ ] **Step 7: Commit**

```bash
cd /home/ezecutin/src/portfolio
git add components.jsx style.css index.html app.bundle.js
git -c user.name=ezequielcutin -c user.email=ezecutin@umich.edu commit -m "$(cat <<'MSG'
feat(projects): tilt the stage toward the pointer, swipe on touch

Tilt is capped at 8deg from rest, runs through rAF, and only attaches on
fine pointers. Reduced motion flattens the stack to a crossfade.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
)"
```

---

## Task 5: "read the file" opens the terminal entry

**Files:**
- Modify: `components.jsx` (`ProjectsTerminal` — optional controlled props)
- Modify: `layouts.jsx` (`LayoutStacked` — own the open id, pass the handler)
- Rebuild: `app.bundle.js`
- Script (not committed): `/tmp/shots/t5-open.mjs`

**Interfaces:**
- Consumes: `FeaturedStage`'s `onOpenProject` prop from Task 3.
- Produces: `ProjectsTerminal({ items, openId, onOpenChange })`. Both new props are optional. When `openId` is `undefined` the terminal keeps its own state and behaves exactly as before; when it is a string the parent owns the value and `onOpenChange(id)` fires on every selection the terminal makes itself.

- [ ] **Step 1: Write the failing test**

Create `/tmp/shots/t5-open.mjs`:

```js
import { withPage, assert } from "./lib.mjs";

const readsQuietly = async (page) => {
  await page.locator(".pf-stage__tab").nth(1).click();
  await page.waitForTimeout(700);
  await page.locator(".pf-stage__panel:not([hidden]) .pf-stage__read").click();
  await page.waitForTimeout(900);
  return (await page.locator(".pf-term__title").textContent()).trim();
};

// Desktop: the terminal opens the matching entry and is on screen.
await withPage({}, async (page) => {
  assert(await page.locator(".pf-stage__read").count() > 0, "the read link renders");
  assert((await readsQuietly(page)) === "Quietly Build", "read the file opens the matching entry");
  const onScreen = await page.locator(".pf-term").evaluate((el) => {
    const r = el.getBoundingClientRect();
    return r.top < window.innerHeight && r.bottom > 0;
  });
  assert(onScreen, "the terminal is in view afterwards");

  // Clicking inside the terminal still works while it is controlled.
  await page.locator(".pf-term__item").first().click();
  await page.waitForTimeout(400);
  const title = (await page.locator(".pf-term__title").textContent()).trim();
  assert(title === "Universal Shader Tool", "the terminal's own rows still switch the entry");
});

// Mobile: the same link lands on the reading pane, not the file list.
await withPage({ touch: true, viewport: { width: 390, height: 844 } }, async (page) => {
  // The terminal is controlled from the moment it mounts, which must not
  // read as "open this entry" — a fresh load still shows the file list.
  const onLoad = await page.locator(".pf-term").evaluate((el) => el.classList.contains("is-reading"));
  assert(!onLoad, "mobile: a fresh load shows the file list, not a README");

  assert((await readsQuietly(page)) === "Quietly Build", "mobile: the entry opens");
  const reading = await page.locator(".pf-term").evaluate((el) => el.classList.contains("is-reading"));
  assert(reading, "mobile: the terminal shows the reading pane, not the list");
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
cd /tmp/shots && node t5-open.mjs
```

Expected: FAIL on "the read link renders" — `onOpenProject` is not passed yet, so the button is not rendered.

- [ ] **Step 3: Make `ProjectsTerminal` optionally controlled**

Replace the first two lines of the component:

```jsx
function ProjectsTerminal({ items, openId: openIdProp, onOpenChange }) {
  const [openIdOwn, setOpenIdOwn] = useState(items[0] && items[0].id);
  // Controlled only when a parent passes openId; on its own the terminal
  // keeps the behaviour it has always had.
  const controlled = openIdProp != null;
  const openId = controlled ? openIdProp : openIdOwn;
  const setOpenId = (id) => {
    setOpenIdOwn(id);
    if (onOpenChange) onOpenChange(id);
  };
```

Every existing `setOpenId(...)` call site keeps working unchanged. Then add one effect directly after the existing `[openId]` scroll effect:

```jsx
  // A controlled change means something outside asked to read this entry —
  // on mobile the README has to replace the file list, the same as a tap.
  // The mount pass is not a request: on load the file list has to win.
  const ctlMountRef = useRef(false);
  useEffect(() => {
    if (!controlled) return;
    if (!ctlMountRef.current) { ctlMountRef.current = true; return; }
    setMobileView("reading");
  }, [openIdProp]);
```

- [ ] **Step 4: Wire the layout**

In `layouts.jsx`, at the top of `LayoutStacked` (before the `return`), add:

```jsx
  const [termOpenId, setTermOpenId] = useStateL(data.projects[0] && data.projects[0].id);
  const openInTerminal = (id) => {
    setTermOpenId(id);
    const term = document.querySelector(".pf-term");
    if (!term) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    term.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };
```

and update the projects block:

```jsx
          <FeaturedStage items={data.projects} onOpenProject={openInTerminal} />
          <ProjectsTerminal items={data.projects} openId={termOpenId} onOpenChange={setTermOpenId} />
```

- [ ] **Step 5: Build and re-run the test**

```bash
cd /home/ezecutin/src/portfolio && node scripts/build.mjs
cd /tmp/shots && node t5-open.mjs
```

Expected: every line prints `pass:`.

- [ ] **Step 6: Re-run the earlier tests**

```bash
cd /tmp/shots && node t2-data.mjs && node t3-stage.mjs && node t4-motion.mjs
```

Expected: all still pass. The terminal is controlled now, so this is the run that would catch a regression in its own row clicks or keyboard nav.

- [ ] **Step 7: Commit**

```bash
cd /home/ezecutin/src/portfolio
git add components.jsx layouts.jsx index.html app.bundle.js
git -c user.name=ezequielcutin -c user.email=ezecutin@umich.edu commit -m "$(cat <<'MSG'
feat(projects): let the stage open an entry in the terminal

ProjectsTerminal takes an optional openId/onOpenChange pair; with neither
passed it keeps its own state exactly as before.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
)"
```

---

## Task 6: Print, keyboard, and the full verification pass

**Files:**
- Modify: `style.css` (print block at line ~4067, and the mobile media query)
- Rebuild: `app.bundle.js` only if a `.jsx` file changes
- Script (not committed): `/tmp/shots/t6-final.mjs`

**Interfaces:**
- Consumes: everything above. Produces no new names.

- [ ] **Step 1: Write the failing test**

Create `/tmp/shots/t6-final.mjs`:

```js
import { withPage, assert } from "./lib.mjs";

// Print: the stage is a screen thing; PrintProjects is the paper version.
await withPage({}, async (page) => {
  await page.emulateMedia({ media: "print" });
  assert(!(await page.locator(".pf-stage").isVisible()), "the stage is hidden in print");
  assert(!(await page.locator(".pf-term").isVisible()), "the terminal is still hidden in print");
  const printed = await page.locator(".pf-printProjects .pf-printEntry").count();
  const total = await page.evaluate(() => window.PORTFOLIO_DATA.projects.length);
  assert(printed === total, `the print list still has every project (${printed}/${total})`);
  await page.emulateMedia({ media: "screen" });
});

// Keyboard: the tablist is reachable and arrow keys move it.
await withPage({}, async (page) => {
  await page.locator(".pf-stage__tab.is-active").focus();
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(600);
  const active = (await page.locator(".pf-stage__tab.is-active").textContent()).trim();
  assert(active === "quietly-build", `ArrowRight moves the tab (${active})`);
  const focused = await page.evaluate(() => document.activeElement.textContent.trim());
  assert(focused === "quietly-build", "focus follows the selection");
  await page.keyboard.press("Home");
  await page.waitForTimeout(600);
  assert(
    (await page.locator(".pf-stage__tab.is-active").textContent()).trim() === "shader-tool",
    "Home returns to the first tab"
  );
  const roving = await page.locator(".pf-stage__tab").evaluateAll((els) =>
    els.map((e) => e.tabIndex).join(",")
  );
  assert(roving === "0,-1", `roving tabindex is correct (${roving})`);
});

// Mobile layout: the stage stacks above the text and nothing overflows.
await withPage({ touch: true, viewport: { width: 390, height: 844 } }, async (page) => {
  const scene = await page.locator(".pf-stage__scene").boundingBox();
  const panel = await page.locator(".pf-stage__panel:not([hidden])").boundingBox();
  assert(scene.y + scene.height <= panel.y + 4, "the scene stacks above the text column");
  const doc = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  assert(doc, "no horizontal overflow on mobile");
});

// Screenshots for review.
for (const theme of ["dark", "paper", "snow"]) {
  for (const [name, viewport] of [["desktop", { width: 1440, height: 900 }], ["mobile", { width: 390, height: 844 }]]) {
    await withPage({ theme, viewport, touch: name === "mobile" }, async (page) => {
      await page.locator(".pf-stage").screenshot({ path: `final-${name}-${theme}-1.png` });
      await page.locator(".pf-stage__tab").nth(1).click();
      await page.waitForTimeout(900);
      await page.locator(".pf-stage").screenshot({ path: `final-${name}-${theme}-2.png` });
    });
  }
}
console.log("screenshots written to /tmp/shots/final-*.png");
```

- [ ] **Step 2: Run it and watch it fail**

```bash
cd /tmp/shots && node t6-final.mjs
```

Expected: FAIL on "the stage is hidden in print" — no print rule exists yet. The rest may already pass.

- [ ] **Step 3: Hide the stage in print**

In `style.css`, in the print block, extend the existing rule and its comment:

```css
  /* Neither interactive surface prints. The work deck is a sticky
     horizontal track, the projects browser is a terminal that expands one
     entry at a time, and the featured stage is a pointer-driven 3D
     showcase; PrintWork and PrintProjects render the same data as plain
     lists instead. See the component comments for why overriding these
     layouts was abandoned. */
  .pf-tl,
  .pf-stage,
  .pf-term { display: none !important; }
```

- [ ] **Step 4: Add the mobile rules**

Append to the `pf-stage` section (before the reduced-motion block):

```css
@media (max-width: 760px) {
  .pf-stage { margin-top: 26px; }
  .pf-stage__body { grid-template-columns: minmax(0, 1fr); gap: 20px; }
  .pf-stage__scene { perspective: 900px; }
  /* Fixed angle on touch: there is no pointer to follow. */
  .pf-stage__deck { transform: rotateX(6deg) rotateY(-7deg); }
  .pf-stage__inset { width: 25%; }
  .pf-stage__chip { font-size: 10px; padding: 6px 9px; }
  .pf-stage__title { font-size: 19px; }
}
```

- [ ] **Step 5: Re-run the test**

```bash
cd /tmp/shots && node t6-final.mjs
```

Expected: every line prints `pass:`, then the screenshot paths.

- [ ] **Step 6: Look at all twelve screenshots**

Open `/tmp/shots/final-*.png`. For each: the shot is legible, the chip or inset does not cover anything that matters, text has enough contrast against the plate, and nothing is clipped at the edges. `snow` is the harshest case — its accent is near-black, so check the plate gradient still looks intentional there.

- [ ] **Step 7: Run every check one last time**

```bash
cd /tmp/shots && node t2-data.mjs && node t3-stage.mjs && node t4-motion.mjs && node t5-open.mjs && node t6-final.mjs
```

Expected: no `FAIL:` lines anywhere.

- [ ] **Step 8: Commit and stop the dev server**

```bash
cd /home/ezecutin/src/portfolio
git add style.css index.html app.bundle.js
git -c user.name=ezequielcutin -c user.email=ezecutin@umich.edu commit -m "$(cat <<'MSG'
feat(projects): finish the stage with print and mobile rules

The stage does not print (PrintProjects is the paper version) and holds a
fixed angle on touch, where there is no pointer to follow.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
)"
npm run dev:stop
git status --short
```

Expected: a clean tree. Report the screenshots to the user and leave the push to them.

---

## Notes for whoever executes this

- **The dev server is the test fixture.** `npm run dev` builds once, starts a watcher, and serves on 5173. If a test fails in a way that makes no sense, check that the watcher actually rebuilt: `ls -l app.bundle.js`.
- **If a scene layer looks flat,** the usual cause is a missing `transform-style: preserve-3d` on an ancestor, or a `filter` / `overflow: hidden` on one — both flatten a 3D context. `.pf-stage__card` needs `preserve-3d` for its children's `translateZ` to read as depth.
- **Do not add a `will-change`** to the deck or cards unless a screenshot shows tearing. The page already carries several animated surfaces.
