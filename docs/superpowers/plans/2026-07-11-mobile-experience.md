# Mobile Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make mobile feel as crafted as desktop: swipeable Work timeline deck, single-pane Projects terminal, docked music mini-player, tighter hero rhythm.

**Architecture:** This is a static GitHub Pages site — React 18 + Babel run **in the browser** via CDN (`index.html`); components live at repo root as plain `.jsx` files that attach to `window` (no modules, no imports, no build). All new UI goes into the existing files following that pattern. There is **no test framework**: each task's test cycle is an explicit browser verification against the local dev server.

**Tech Stack:** React 18 (global `React`, hooks destructured at file top), in-browser Babel JSX, vanilla CSS in `style.css` (design tokens as CSS variables), vanilla JS canvas in `header-ambience.js`.

**Spec:** `docs/superpowers/specs/2026-07-11-mobile-experience-design.md`

## Global Constraints

- **Never hijack vertical scroll on mobile.** Horizontal swipe zones use native CSS scroll-snap only; no wheel/touch capture.
- **Desktop ≥ 1280px must be pixel-unchanged.** All new behavior lives behind `@media (max-width: ...)` queries or JS matchMedia checks that are false on desktop.
- **Touch targets ≥ 44px** on every new interactive control.
- **Respect `prefers-reduced-motion: reduce`:** no slide/expand animations (instant state change), no equalizer bar motion.
- **Design tokens only:** colors via `var(--accent)`, `var(--rule)`, `var(--card)`, `var(--fg)`, `var(--fg-soft)`, `var(--muted)`, `var(--bg-alt)`; mono metadata via `var(--font-mono)` 11px / letter-spacing 0.1em; easing `ease` / `cubic-bezier(0.22, 1, 0.36, 1)` at 160–360ms. No new hex colors, no bounce easing.
- **No build step:** never introduce `import`/`export` in the root `.jsx` files; components are attached to `window` via the existing `Object.assign(window, {...})` blocks.
- **Dev server:** start with `./scripts/dev-start.sh` → http://localhost:5173/ (do NOT use Vite; it breaks in-browser Babel). It may already be running — the script is idempotent.
- **Commit messages:** end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

## File Structure

No new files. All work modifies:

| File | Changes |
|------|---------|
| `components.jsx` | `WorkTimeline` gains a third render mode (swipe deck) + new `WorkDeckCard`; `ProjectsTerminal` gains single-pane mobile view; `NowPlayingHero` gains mini-player |
| `layouts.jsx` | Work block subcopy: Scroll/Swipe variant spans |
| `style.css` | New `.pf-tl--deck`, `.pf-term` mobile single-pane, `.pf-mini` rules; hero/block mobile padding tightening |
| `header-ambience.js` | DPR + particle count caps on small viewports |

Verification viewports: **mobile 375×812**, **desktop 1280×800**. With the Claude Browser tools: `resize_window` presets `mobile` / `desktop`. With Playwright MCP: `browser_resize`.

---

### Task 1: Work — swipe timeline deck

**Files:**
- Modify: `components.jsx:478-644` (WorkTimeline; line numbers pre-change)
- Modify: `layouts.jsx:491` (subcopy)
- Modify: `style.css` (append deck rules after line ~2277, the `.pf-tl` reduced-motion block; add subcopy variant rules)

**Interfaces:**
- Consumes: existing globals `Stack`, `_railLabel`, `_initials`, `_startSort` (all already defined in `components.jsx` above `WorkTimeline`).
- Produces: `WorkTimeline` renders one of three modes — `pinned` (unchanged desktop scroll-jack), `deck` (new, viewport ≤ 900px), `stacked` (unchanged fallback for wide-but-not-pinned, e.g. desktop reduced-motion). New component `WorkDeckCard({ w, i, n, active })` used only by WorkTimeline. New CSS classes: `.pf-tl--deck`, `.pf-tl__deckRail`, `.pf-tl__deckMeta`, `.pf-tl__deckYears`, `.pf-tl__deckNow`, `.pf-tl__cardPreview`, `.pf-tl__cardMore`. Task 5 verifies against these.

- [ ] **Step 1: Replace the `pinned` boolean with a three-way `mode`**

In `components.jsx`, inside `WorkTimeline`, replace:

```jsx
  // Desktop pinned mode only when there's room, a fine pointer, and motion is allowed.
  const [pinned, setPinned] = useState(false);
```

with:

```jsx
  // Three modes: "pinned" desktop scroll-jack, "deck" mobile swipe rail,
  // "stacked" fallback (wide viewport but coarse pointer / reduced motion).
  const [mode, setMode] = useState("stacked");
  const pinned = mode === "pinned";
```

and replace the matchMedia effect:

```jsx
  useEffect(() => {
    const mq = window.matchMedia(
      "(min-width: 901px) and (pointer: fine) and (prefers-reduced-motion: no-preference)"
    );
    const apply = () => setPinned(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
```

with:

```jsx
  useEffect(() => {
    const pinnedMq = window.matchMedia(
      "(min-width: 901px) and (pointer: fine) and (prefers-reduced-motion: no-preference)"
    );
    const deckMq = window.matchMedia("(max-width: 900px)");
    const apply = () =>
      setMode(pinnedMq.matches ? "pinned" : deckMq.matches ? "deck" : "stacked");
    apply();
    pinnedMq.addEventListener("change", apply);
    deckMq.addEventListener("change", apply);
    return () => {
      pinnedMq.removeEventListener("change", apply);
      deckMq.removeEventListener("change", apply);
    };
  }, []);
```

All other `pinned` references inside the component (`useEffect(() => { if (!pinned) return; ...`, `jumpTo`, the `is-active` class on panels, the final `if (!pinned)` return) keep working via the `const pinned` alias — do not change them beyond Step 3.

- [ ] **Step 2: Add `WorkDeckCard` above `WorkTimeline`**

Insert directly before the `function WorkTimeline({ items }) {` line:

```jsx
/** Mobile deck card: same panel anatomy as pinned, but bullets + stack sit
 *  behind a tap-expand so the deck stays one viewport tall. */
function WorkDeckCard({ w, i, n, active }) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = `tl-deck-details-${w.id}`;
  return (
    <article
      role="listitem"
      id={`tl-panel-${w.id}`}
      className={`pf-tl__panel ${w.current ? "is-current" : ""} ${active ? "is-active" : ""}`}
      aria-current={w.current ? "true" : undefined}
    >
      <div className="pf-tl__panelTop">
        <span className={`pf-tl__logo ${w.logoBleed ? "is-bleed" : ""}`}>
          <span className="pf-tl__logoFallback" aria-hidden="true">{_initials(w.org)}</span>
          <img
            className="pf-tl__logoImg"
            src={w.logo || `logos/${w.id}.svg`}
            alt={`${w.org} logo`}
            loading="lazy"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        </span>
        <div className="pf-tl__topRight">
          <span className="pf-tl__index">{String(i + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}</span>
          {w.current ? (
            <span className="pf-tl__nowTag">
              <span className="pf-live" aria-hidden="true"><span className="pf-live__core" /></span>
              current
            </span>
          ) : null}
        </div>
      </div>
      <div className="pf-tl__year">{_railLabel(w.date)}</div>
      <h3 className="pf-tl__role">{w.title}</h3>
      <div className="pf-tl__org">{w.org}</div>
      <div className="pf-tl__meta">{w.date} · {w.location}</div>
      {!expanded && <p className="pf-tl__cardPreview">{w.bullets[0]}</p>}
      <div id={detailsId} hidden={!expanded}>
        <ul className="pf-tl__bullets">
          {w.bullets.map((b, bi) => <li key={bi}>{b}</li>)}
        </ul>
        <Stack items={w.stack} />
      </div>
      <button
        type="button"
        className="pf-tl__cardMore"
        aria-expanded={expanded}
        aria-controls={detailsId}
        onClick={() => setExpanded((e) => !e)}
      >
        <span className="pf-chev" aria-hidden="true">+</span>
        {expanded ? "less" : "details"}
      </button>
    </article>
  );
}
```

- [ ] **Step 3: Add the deck render branch + active-card observer**

Inside `WorkTimeline`, add a ref alongside the existing refs (`const maxXRef = useRef(0);`):

```jsx
  const deckRef = useRef(null);
```

Add this effect after the pinned scroll-jack effect (after the `}, [pinned, n]);` line):

```jsx
  // Deck mode: track which card is snapped so the progress line + counter follow.
  useEffect(() => {
    if (mode !== "deck") return;
    const rail = deckRef.current;
    if (!rail || typeof IntersectionObserver === "undefined") return;
    const cards = Array.from(rail.querySelectorAll(".pf-tl__panel"));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          const idx = cards.indexOf(en.target);
          if (idx >= 0) setActive(idx);
        });
      },
      { root: rail, threshold: 0.6 }
    );
    cards.forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, [mode, n]);
```

Then replace the fallback return:

```jsx
  if (!pinned) {
    return (
      <div className="pf-tl pf-tl--stacked">
        <div className="pf-tl__panels">{Panels}</div>
      </div>
    );
  }
```

with:

```jsx
  if (mode === "deck") {
    return (
      <div className="pf-tl pf-tl--deck">
        <div
          className="pf-tl__deckRail"
          ref={deckRef}
          role="list"
          aria-label="Work timeline, swipe horizontally"
        >
          {ordered.map((w, i) => (
            <WorkDeckCard key={w.id} w={w} i={i} n={n} active={i === active} />
          ))}
        </div>
        <div className="pf-tl__deckMeta">
          <div className="pf-tl__railLine" aria-hidden="true">
            <div
              className="pf-tl__railFill"
              style={{ transform: `scaleX(${n > 1 ? active / (n - 1) : 1})` }}
            />
          </div>
          <div className="pf-tl__deckYears">
            <span aria-hidden="true">{_railLabel(ordered[0].date)}</span>
            <span className="pf-tl__deckNow" aria-live="polite">
              {String(active + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
            </span>
            <span aria-hidden="true">{_railLabel(ordered[n - 1].date)}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!pinned) {
    return (
      <div className="pf-tl pf-tl--stacked">
        <div className="pf-tl__panels">{Panels}</div>
      </div>
    );
  }
```

(The per-card `01 / 07` top-right index is the spec's counter; the `.pf-tl__deckNow` under the rail mirrors it next to the progress line.)

- [ ] **Step 4: Deck CSS**

In `style.css`, append after the `.pf-tl--stacked` block's trailing `@media (prefers-reduced-motion: reduce) { .pf-tl__hintArrow { animation: none; } }` rule (~line 2277):

```css
/* ---- Deck (mobile swipe rail) ---- */
.pf-tl--deck { padding: 0; }
.pf-tl__deckRail {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  padding: 4px 24px 18px;
  scrollbar-width: none;
}
.pf-tl__deckRail::-webkit-scrollbar { display: none; }
.pf-tl--deck .pf-tl__panel {
  flex: 0 0 84vw;
  max-width: 460px;
  width: auto;
  max-height: none;
  overflow: visible;
  scroll-snap-align: center;
  opacity: 0.55;
  transform: none;
  transition: opacity 240ms ease, border-color 240ms ease;
  padding: 24px 22px;
}
.pf-tl--deck .pf-tl__panel.is-active {
  opacity: 1;
  border-color: color-mix(in srgb, var(--rule) 60%, var(--fg) 14%);
}
.pf-tl--deck .pf-tl__panel.is-current.is-active {
  border-color: color-mix(in srgb, var(--accent) 45%, var(--rule));
}
.pf-tl__cardPreview {
  margin: 0 0 4px;
  color: var(--fg-soft);
  font-size: 14px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.pf-tl__cardMore {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  margin-top: 4px;
  padding: 0 4px 0 0;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
  transition: color 200ms ease;
}
.pf-tl__cardMore .pf-chev {
  display: inline-block;
  transition: transform 200ms ease, color 200ms ease;
}
.pf-tl__cardMore[aria-expanded="true"] .pf-chev {
  transform: rotate(45deg);
  color: var(--accent);
}
.pf-tl__cardMore:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
  border-radius: 3px;
}
.pf-tl__deckMeta { padding: 0 24px 8px; }
.pf-tl__deckMeta .pf-tl__railLine { margin-bottom: 10px; }
.pf-tl__deckMeta .pf-tl__railFill {
  transform-origin: left center;
  transition: transform 240ms ease;
}
.pf-tl__deckYears {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  color: var(--muted);
}
.pf-tl__deckNow { color: var(--fg); }
@media (prefers-reduced-motion: reduce) {
  .pf-tl--deck .pf-tl__panel,
  .pf-tl__deckMeta .pf-tl__railFill,
  .pf-tl__cardMore .pf-chev { transition: none; }
}
```

Note: `.pf-tl__railLine` / `.pf-tl__railFill` are reused from the pinned rail (defined at ~style.css:2163-2175); only the overrides above are new.

- [ ] **Step 5: Subcopy Scroll→Swipe swap**

In `layouts.jsx`, replace:

```jsx
            <p className="pf-blockHead__sub">Mortgage tooling, quant trading, autonomy ops, and a few detours in between. Scroll the timeline from Detroit to now.</p>
```

with:

```jsx
            <p className="pf-blockHead__sub">
              Mortgage tooling, quant trading, autonomy ops, and a few detours in between.{" "}
              <span className="pf-sub--desktop">Scroll the timeline from Detroit to now.</span>
              <span className="pf-sub--mobile">Swipe the timeline from Detroit to now.</span>
            </p>
```

In `style.css`, add next to the deck rules:

```css
/* Copy variants: desktop says scroll, mobile says swipe. */
.pf-sub--mobile { display: none; }
@media (max-width: 900px) {
  .pf-sub--desktop { display: none; }
  .pf-sub--mobile { display: inline; }
}
```

- [ ] **Step 6: Verify in browser (mobile)**

Run: `./scripts/dev-start.sh` (idempotent). Open http://localhost:5173/ at **375×812**. Hard-reload. Check:

1. Work section shows a horizontal card rail, one card mostly filling the width with the next card peeking.
2. Swiping/scrolling the rail horizontally snaps card-to-card; the `01 / 07` counter and progress line advance; page vertical scroll still works normally over the cards.
3. Cards show year/role/org/meta + 2-line preview; tapping `+ details` expands bullets and stack chips; tapping again (`+` rotated) collapses.
4. Subcopy reads "Swipe the timeline…".
5. Measure section height: run JS `document.getElementById('block-work').offsetHeight` — expect roughly 700–1100px (was 4446).

Expected: all pass; no console errors (`read_console_messages` / equivalent).

- [ ] **Step 7: Verify desktop unchanged**

Resize to **1280×800**, reload. Scroll into Work: pinned horizontal scroll-jack behaves exactly as before (panels translate, rail ticks, hint). Subcopy reads "Scroll the timeline…". No layout shift vs `main`.

- [ ] **Step 8: Commit**

```bash
git add components.jsx layouts.jsx style.css
git commit -m "feat(mobile): work timeline swipe deck with tap-expand cards

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Projects — single-pane terminal

**Files:**
- Modify: `components.jsx:242-452` (ProjectsTerminal; line numbers pre-Task-1)
- Modify: `style.css:2635-2651` (existing 760px terminal media query) + append new rules

**Interfaces:**
- Consumes: existing `ProjectsTerminal` internals (`openId`, `runCmd`, `paneRef`, `rootRef`).
- Produces: root `.pf-term` gains `is-reading` class; new elements `.pf-term__back` (button) rendered inside the pane. Mobile-only behavior scoped to `@media (max-width: 760px)`. Task 5 verifies against these.

- [ ] **Step 1: Add view state and wire taps**

In `ProjectsTerminal`, after `const [hint, setHint] = useState(false);` add:

```jsx
  // Mobile single-pane: "list" shows ls output, "reading" shows the README.
  // Desktop ignores this (CSS only applies it under 760px).
  const [mobileView, setMobileView] = useState("list");
```

Change the root div's className from:

```jsx
    <div className={`pf-term ${hint ? "is-hinting" : ""}`} ref={rootRef} role="group" aria-label="Projects explorer">
```

to:

```jsx
    <div className={`pf-term ${hint ? "is-hinting" : ""} ${mobileView === "reading" ? "is-reading" : ""}`} ref={rootRef} role="group" aria-label="Projects explorer">
```

Change the list item's `onClick` from:

```jsx
              onClick={() => setOpenId(p.id)}
```

to:

```jsx
              onClick={() => { setOpenId(p.id); setMobileView("reading"); }}
```

(Leave `onFocus` as-is — keyboard focus browsing on desktop must not flip mobile state visibly, and under 760px a tap fires focus then click, landing on the same result.)

- [ ] **Step 2: `cd ..` — button and command**

At the top of the pane, right before `<p className="pf-term__cmd">…cat…</p>`, add:

```jsx
          <button
            type="button"
            className="pf-term__back"
            onClick={() => setMobileView("list")}
            aria-label="Back to project list"
          >
            <span className="pf-term__pfx" aria-hidden="true">$</span> cd ..
          </button>
```

In `runCmd`, after the `if (verb === "clear")` line, add:

```jsx
    if (verb === "cd" && (arg === ".." || arg === "")) { setErr(false); setMsg(null); setCmd(""); setMobileView("list"); return; }
```

(This must come before the generic OPENERS lookup — `cd` is in OPENERS, so `cd ..` would otherwise error with "no such project: ..".)

- [ ] **Step 3: Fix the project-switch scroll effect for single-pane**

Replace the body of the existing `useEffect(..., [openId])` (the one starting `if (!mountedRef.current)`) with:

```jsx
    if (!mountedRef.current) { mountedRef.current = true; return; }
    if (paneRef.current) paneRef.current.scrollTop = 0;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia("(max-width: 760px)").matches;
    if (mobile) {
      // Single-pane: the README replaces the list in place; just make sure the
      // terminal frame's top (with the cd .. row) is on screen.
      if (rootRef.current) {
        const top = rootRef.current.getBoundingClientRect().top;
        if (top < 0) rootRef.current.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      }
    } else {
      const row = listRef.current && listRef.current.querySelector(".pf-term__item.is-open");
      if (row && row.scrollIntoView) row.scrollIntoView({ block: "nearest" });
    }
```

- [ ] **Step 4: Mobile terminal CSS**

In `style.css`, replace the existing mobile terminal block (currently at ~2635-2651):

```css
/* Mobile: stack list above the reading pane and flow at natural height
   (no inner scrolling on small screens). */
@media (max-width: 760px) {
  .pf-term__body {
    grid-template-columns: 1fr;
    height: auto;
  }
  .pf-term__body::after { display: none; }
  .pf-term__list {
    border-right: none;
    border-bottom: 1px solid var(--rule);
    flex-direction: column;
    overflow-y: visible;
  }
  .pf-term__pane { padding: 20px 18px 24px; overflow-y: visible; }
  .pf-term__hint { display: none; }
}
```

with:

```css
/* Back row exists only on mobile (base rule must precede the media query). */
.pf-term__back { display: none; }

/* Mobile: single-pane terminal. The list IS the terminal; opening a project
   swaps in the README (cat), and "$ cd .." returns. Real terminals are
   single-pane — the split view is a desktop luxury. */
@media (max-width: 760px) {
  .pf-term__body {
    grid-template-columns: 1fr;
    height: auto;
  }
  .pf-term__body::after { display: none; }
  .pf-term__list {
    border-right: none;
    flex-direction: column;
    overflow-y: visible;
  }
  .pf-term__pane { padding: 0 18px 24px; overflow-y: visible; }
  .pf-term__hint { display: none; }

  /* One view at a time */
  .pf-term.is-reading .pf-term__list { display: none; }
  .pf-term:not(.is-reading) .pf-term__pane { display: none; }

  /* README view: bounded frame with internal scroll so a long README doesn't
     turn the page into a wall; overscroll-behavior keeps page scroll free. */
  .pf-term.is-reading .pf-term__body { max-height: 70vh; }
  .pf-term.is-reading .pf-term__pane {
    overflow-y: auto;
    overscroll-behavior: contain;
    scroll-margin-top: 76px;
  }
  .pf-term.is-reading .pf-term__body::after { display: block; }

  .pf-term__back {
    position: sticky;
    top: 0;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 8px;
    width: calc(100% + 36px);
    margin: 0 -18px 12px;
    padding: 14px 18px;
    min-height: 44px;
    border: none;
    border-bottom: 1px solid var(--rule);
    background: var(--card);
    cursor: pointer;
    font-family: var(--font-mono);
    font-size: 13px;
    text-align: left;
    color: var(--fg);
  }
  .pf-term__back:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
}
```

(The `.pf-term__back` rule inside the media query already sets `display: flex`, overriding the base `display: none` — no further rules needed.)

- [ ] **Step 5: Verify in browser (mobile)**

At **375×812**, reload, scroll to Projects:

1. Terminal shows only the `ls projects/` listing (no README below).
2. Tap `gobank/` → README fills the terminal with the `$ cat gobank/README.md` line and slide-in; `$ cd ..` row pinned at top of the frame.
3. README scrolls internally inside a ~70vh frame; scrolling past its end does not trap the page (page scrolls on).
4. Tap `$ cd ..` → back to listing. Repeat for a second project (`fractal/`).
5. In the prompt, type `open spotify` + Enter → README view opens; type `cd ..` + Enter → listing returns.

Expected: all pass; no console errors.

- [ ] **Step 6: Verify desktop unchanged**

At **1280×800**: split-pane terminal (list left, README right) exactly as before; no `$ cd ..` row visible; clicking projects updates the right pane; command prompt works.

- [ ] **Step 7: Commit**

```bash
git add components.jsx style.css
git commit -m "feat(mobile): single-pane projects terminal with cd .. navigation

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Music — sticky mini-player

**Files:**
- Modify: `components.jsx:730-1003` (NowPlayingHero; line numbers pre-Task-1/2)
- Modify: `style.css` (append `.pf-mini` rules after the `.pf-mh` block, ~line 1760)

**Interfaces:**
- Consumes: `NowPlayingHero`'s existing `playing` state, `togglePlay`, `trackLabel`, `PlayingBars` component; `#block-music` section id from `layouts.jsx`.
- Produces: `.pf-mini` fixed bar rendered inside NowPlayingHero's root; hidden ≥ 901px via CSS. Task 5 verifies against it.

- [ ] **Step 1: Track music-section visibility**

In `NowPlayingHero`, after `const iframeRef = useRef(null);` add:

```jsx
  const heroRef = useRef(null);
  const [heroInView, setHeroInView] = useState(true);
```

Add this effect after the widget-init effect (`}, []);` of the `ensureSCWidget` one):

```jsx
  // Mini-player: know when the music hero has scrolled off screen.
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const el = heroRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((en) => setHeroInView(en.isIntersecting)),
      { threshold: 0.1 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
```

Attach the ref to the root: change `<div className="pf-mh">` to `<div className="pf-mh" ref={heroRef}>`.

- [ ] **Step 2: Render the docked bar**

Just before the closing `</div>` of the `.pf-mh` root (after the `<iframe …/>`), add:

```jsx
      {playing && !heroInView ? (
        <div className="pf-mini" role="group" aria-label="Now playing">
          <PlayingBars />
          <button
            type="button"
            className="pf-mini__title"
            onClick={() => {
              const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
              document.getElementById("block-music")?.scrollIntoView({
                behavior: reduce ? "auto" : "smooth",
                block: "start",
              });
            }}
            aria-label={`Now playing ${trackLabel}. Jump to player`}
          >
            {trackLabel}
          </button>
          <button
            type="button"
            className="pf-mini__toggle"
            onClick={togglePlay}
            aria-label={`Pause ${trackLabel}`}
          >
            ❚❚
          </button>
        </div>
      ) : null}
```

(Pause → `playing` flips false → the bar unmounts. That's the spec: bar exists only while audio plays away from the deck.)

- [ ] **Step 3: Mini-player CSS**

In `style.css`, append after the `.pf-mh__iframe` rule (~line 1758):

```css
/* ---- Mini-player: docked bar while music plays off-screen (mobile) ---- */
.pf-mini {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  z-index: 80;
  display: none;
  align-items: center;
  gap: 12px;
  padding: 6px 6px 6px 18px;
  background: var(--card);
  border: 1px solid var(--rule);
  border-radius: 999px;
  box-shadow: 0 14px 34px -14px rgba(0, 0, 0, 0.65);
  animation: pf-mini-in 240ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (max-width: 900px) {
  .pf-mini { display: flex; }
}
.pf-mini .pf-mh__bars { flex: none; }
.pf-mini__title {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 10px 0;
  text-align: left;
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.04em;
  color: var(--fg);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pf-mini__toggle {
  flex: none;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--accent) 55%, var(--rule));
  border-radius: 50%;
  background: transparent;
  color: var(--accent);
  font-size: 12px;
  cursor: pointer;
}
.pf-mini__toggle:focus-visible,
.pf-mini__title:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
@keyframes pf-mini-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  .pf-mini { animation: none; }
  .pf-mini .pf-mh__bars span { animation: none; }
}
```

- [ ] **Step 4: Verify in browser (mobile)**

At **375×812**, scroll to Music, tap play (SoundCloud widget needs network; if it errors, the fallback status line shows — then verify the bar logic by the `playing` state not activating, and note it):

1. While playing, scroll up to Work → mini bar docks bottom with animated bars + track title + pause button.
2. Tap the title → page scrolls back to the Music block; bar disappears once the deck is in view.
3. Scroll away again, tap pause on the bar → bar disappears; scroll back — deck shows paused state.
4. No bar when nothing is playing.

- [ ] **Step 5: Verify desktop unchanged**

At **1280×800**: play a track, scroll away — **no** mini bar (hidden ≥ 901px). Music section behaves as before.

- [ ] **Step 6: Commit**

```bash
git add components.jsx style.css
git commit -m "feat(mobile): docked mini-player while music plays off-screen

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Hero rhythm + ambience performance

**Files:**
- Modify: `style.css:866-921` (block/hero paddings, photo frame)
- Modify: `header-ambience.js:15,33` (DPR + particle caps)

**Interfaces:**
- Consumes: nothing new.
- Produces: tightened mobile spacing; no API changes.

- [ ] **Step 1: Tighten mobile block + hero rhythm**

In `style.css`, the existing 720px rule (~line 918):

```css
@media (max-width: 720px) {
  .pf-stacked__heroGrid { grid-template-columns: 1fr; gap: 28px; padding-top: 32px; }
  .pf-stacked__photoFrame { max-width: 300px; }
}
```

becomes:

```css
@media (max-width: 720px) {
  .pf-block { padding: 56px 24px; }
  .pf-block--hero { padding: 56px 24px 40px; }
  .pf-stacked__tagline { margin-bottom: 36px; }
  .pf-stacked__heroGrid { grid-template-columns: 1fr; gap: 24px; padding-top: 28px; }
  .pf-stacked__photoFrame { max-width: 240px; }
  .pf-stacked__bio { margin-bottom: 24px; font-size: 17px; }
}
```

(Values follow DESIGN.md's `block-y-mobile: 56px` token. `.pf-stacked__bio` currently has `margin: 0 0 32px` and 18px size at all widths; `.pf-stacked__tagline` has `margin: 0 0 64px`.)

- [ ] **Step 2: Cap canvas cost on small viewports**

In `header-ambience.js`, replace:

```js
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
```

with:

```js
    // Small screens: cheaper canvas — fewer device pixels, fewer particles.
    const smallViewport = Math.min(window.innerWidth, window.innerHeight) < 720;
    const dpr = Math.min(window.devicePixelRatio || 1, smallViewport ? 1.5 : 2);
```

and replace:

```js
    const PARTICLE_COUNT = 80;
```

with:

```js
    const PARTICLE_COUNT = smallViewport ? 42 : 80;
```

- [ ] **Step 3: Verify in browser**

At **375×812**, reload:

1. Hero: name, tagline, photo, bio all present; noticeably less dead space; the Work section's start is reachable within ~1 swipe past the hero content.
2. Ambience canvas still animates with visibly fewer nodes; drag interaction still works.
3. Run JS `document.body.scrollHeight` — expect total page height well under the original 9063 (roughly 5000–6500 with Tasks 1-2 in).
4. At **1280×800**: hero spacing unchanged (paddings 80/96px, photo 220px column), particle count 80 (visually dense as before).

- [ ] **Step 4: Commit**

```bash
git add style.css header-ambience.js
git commit -m "feat(mobile): tighter hero rhythm + cheaper ambience canvas on small screens

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Full verification pass (spec checklist)

**Files:** none modified unless a check fails (fix in place, then re-verify).

**Interfaces:** consumes everything Tasks 1-4 produced; produces sign-off against the spec's Testing section.

- [ ] **Step 1: Mobile end-to-end (375×812, fresh reload)**

1. Swipe the full Work timeline end to end (7 cards); counter reaches `07 / 07`, progress line fills; tap-expand on ≥ 2 cards; vertical page scroll never traps anywhere on the rail.
2. Projects: enter/leave ≥ 2 READMEs via tap and `$ cd ..`; internal README scroll works; page scroll never traps.
3. Music: play → scroll away → mini bar; pause from bar → hides; title tap → returns to deck.
4. Sticky nav still tracks and jumps to all three sections (Work jump lands on the deck, not past it).

- [ ] **Step 2: Reduced-motion pass**

Emulate `prefers-reduced-motion: reduce` (browser devtools or via JS matchMedia check where emulation is unavailable — with Playwright MCP: `browser_run_code_unsafe` is not needed; use `browser_navigate` after setting emulation, or verify the CSS rules exist and the JS `reduce` branches fire). Check: no card/README slide animations, no equalizer motion in the mini bar, ambience canvas does not start (existing behavior, header-ambience.js:12). Note: on desktop widths reduced-motion also disables the pinned timeline (existing `stacked` fallback) — that is pre-existing and correct.

- [ ] **Step 3: Touch-target audit**

Run in the browser console at 375×812 and confirm every returned entry is ≥ 44px in both dimensions or a documented pre-existing control:

```js
[...document.querySelectorAll('.pf-tl__cardMore, .pf-term__back, .pf-term__item, .pf-mini__toggle, .pf-mh__transMain, .pf-mh__transSm')]
  .map(el => { const r = el.getBoundingClientRect(); return `${el.className.split(' ')[0]}: ${Math.round(r.width)}x${Math.round(r.height)}`; })
```

- [ ] **Step 4: Desktop regression (1280×800)**

Full-page pass: hero, pinned Work timeline scroll-jack, split-pane terminal, music deck. Everything identical to `main` (compare against production https://ezequielcutin.com or a checkout of `main` if in doubt). No mini bar, no `$ cd ..`, no deck.

- [ ] **Step 5: Tablet sanity (768×1024)**

768px < 900px → deck + mini-player active; 768px > 760px → terminal stays split-pane (per breakpoints). Confirm the split terminal is comfortable at 768px and the deck cards cap at 460px width.

- [ ] **Step 6: Lint + commit any fixes**

```bash
npm run lint
```

Expected: no new errors introduced by this branch (pre-existing warnings acceptable). If fixes were needed during this task:

```bash
git add -A
git commit -m "fix(mobile): verification pass fixes

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```
