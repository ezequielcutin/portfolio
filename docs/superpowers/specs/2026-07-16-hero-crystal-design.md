# Hero Crystal — Blender-modeled 3D centerpiece

**Date:** 2026-07-16
**Status:** Approved approach — three.js live 3D (Option A)

## Goal

Add a signature 3D object to the portfolio hero: an abstract faceted crystal/shard
modeled in Blender, rendered live in the browser with three.js. It should feel
native to the page — layered with the existing particle canvas, colored by the
site's accent token, reacting to the cursor — not like an embedded viewer widget.

## Context & constraints

- The site is a **static GitHub Pages app with no build step**: React + Babel run
  in the browser via CDN script tags (`index.html`). Any 3D library must load the
  same way (CDN `<script type="module">` + import map). Vite must not be used.
- The hero already has a particle-network canvas (`header-ambience.js`,
  `#header-ambience`) with spring-physics drag interaction. The crystal layers
  **in front of** it on its own transparent canvas.
- Theme: dark, synthwave-adjacent; accent color exposed as CSS custom property
  `--accent` on `:root`.
- Blender is driven live via **Blender MCP** (user is installing it); the model
  is exported as a compressed `.glb` checked into the repo.

## The asset (Blender side)

- **Shape:** irregular faceted crystal/shard — low-ish poly count (roughly
  200–800 triangles) so each facet catches light as a distinct plane. Built via
  Blender MCP in the user's live Blender session (e.g. subdivided + displaced
  icosphere or bisected cube, then flat-shaded), with the user art-directing.
- **Materials:** geometry only needs sensible normals and smooth/flat shading
  splits; the glass look is created **in three.js at runtime**, not baked in
  Blender. (Blender's Cycles glass does not survive glTF export as-is.)
- **Export:** glTF Binary (`.glb`), +Y up, meters, no lights/cameras, Draco or
  meshopt compression if the file exceeds ~150 KB (target: well under 100 KB).
  Saved to `public/models/crystal.glb`.
- **Poster render:** one Cycles still of the crystal (transparent background,
  matching angle/lighting mood) exported as an optimized PNG/WebP,
  `public/models/crystal-poster.png` — used for all fallbacks.

## Runtime architecture (web side)

### New files

| File | Role |
|------|------|
| `hero-crystal.js` | ES module: three.js scene, loader, material, interaction loop |
| `public/models/crystal.glb` | The Blender-exported mesh |
| `public/models/crystal-poster.png` | Static fallback image |

### index.html changes

- Import map pinning `three` and `three/addons/` to a CDN (jsdelivr/unpkg),
  matching the site's existing pinned-version style.
- `<script type="module" src="hero-crystal.js?v=1">` after the existing scripts.
- No new markup in HTML; the module creates and inserts its own canvas.

### Scene

- Transparent-background `WebGLRenderer` (`alpha: true`), DPR capped at 2
  (1.5 on small viewports, same heuristic as `header-ambience.js`).
- Canvas absolutely positioned inside the hero host element, above
  `#header-ambience`, `pointer-events: none` (the particle canvas keeps its
  drag interaction; the crystal reads cursor position from `window` events).
- Crystal positioned center-right, offset from the name/text block.
- **Material:** `MeshPhysicalMaterial` — high transmission, low roughness,
  slight thickness for refraction; environment map from
  `RoomEnvironment`/`PMREMGenerator` (procedural, no HDRI download); subtle
  accent-colored emissive core so it reads on the dark background.
- **Lighting:** accent-colored rim/point light + neutral key; accent read from
  CSS `--accent` at init (same `getComputedStyle` pattern as
  `header-ambience.js`) so a theme change only needs a reload.

### Motion

- Idle: slow continuous rotation + gentle vertical bob (sine drift).
- Cursor: crystal tilts toward the pointer with spring damping — tuned to feel
  like the existing particle spring physics (stiffness/damping in the same
  ballpark as `header-ambience.js` constants).
- Scroll: subtle parallax (crystal translates/rotates slightly as the hero
  scrolls out); animation loop pauses entirely when the hero is off-screen
  (IntersectionObserver) and when the tab is hidden.

### Fallbacks & failure modes

All fallbacks render the poster image (an absolutely-positioned `<img>` in the
same slot) instead of the live canvas:

- `prefers-reduced-motion: reduce`
- No WebGL / context creation failure
- `.glb` fetch or parse failure
- Small viewports (< 901px wide, same breakpoint as `header-ambience.js`) —
  poster keeps mobile cheap; can be revisited later if perf allows

If even the poster fails to load, nothing breaks: the element hides and the
particle hero remains exactly as today.

### Performance budget

- three.js core module: ~170 KB gzipped (CDN-cached).
- Model: < 100 KB target, < 150 KB hard limit (else compress).
- Steady state: single render loop, no per-frame allocations, paused when
  off-screen; no measurable impact on scroll/audio-visualizer performance.

## Testing / verification

- Local dev server (`./scripts/dev-start.sh`), verify in browser via Playwright:
  crystal renders, tilts with cursor, particles still draggable beneath.
- Toggle `prefers-reduced-motion` emulation → poster shows, no WebGL context.
- Block the `.glb` request → poster shows, console clean of uncaught errors.
- Narrow viewport (< 901px) → poster shows.
- Lighthouse/devtools check: no long tasks from the render loop; loop stops
  when hero is scrolled away.

## Out of scope (YAGNI)

- Audio-reactive crystal (possible later via the music section's analyser).
- Theme switching without reload.
- Replacing the existing 3D timeline cube or particle canvas.
- Draco decoding infrastructure unless the model actually needs it.
