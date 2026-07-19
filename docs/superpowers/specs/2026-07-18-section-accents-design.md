# Section Accents — ambient 3D ornaments beyond the hero

Date: 2026-07-18
Status: approved (brainstorm 2026-07-18)
Builds on: `2026-07-17-ember-core-design.md` and the shipped hero crystal
(`hero-crystal-scene.js` on `main`)

## Summary

Three small Blender-modeled ornaments float beside the Work, Projects, and
Music section headers on desktop, extending the hero crystal's design
language down the page. They are ambient accents — small, quiet, calm idle
drift only — not competing anchors. The hero crystal remains the star.

- **Work** ("Where I've been spending my hours" / "Seven roles, four
  cities"): a stack of thin tilted glass strata — offset slabs like
  sediment layers, one layer carrying ember faces.
- **Projects** ("Builds, experiments, and side quests"): an open lattice
  cube — a scaffold-like frame with one small solid gem caught inside.
- **Music** ("Techno, house, and ambient"): a frozen waveform — seven
  faceted glass bars mirrored around the midline like the section's own
  player, two bars ember-lit, with faint concentric ripple rings
  breathing outward. (Revised 2026-07-19 from the original broken-ring
  concept, which read poorly at accent size.)

## Design language (shared with hero)

- Glass: the hero's alpha-glass material — MeshPhysicalMaterial, base color
  0x6b3517, `transparent: true`, `opacity 0.58`, `depthWrite: false`,
  `side: DoubleSide`, `flatShading: true`, clearcoat 1, iridescence 0.7,
  `envMapIntensity 2.2`, faint accent emissive (0.12).
- Edges: EdgesGeometry lines, color 0xffd9b0, additive, opacity ~0.28.
- Ember faces: MeshStandardMaterial, near-black base, emissive #b94a2b,
  intensity breathing on a ~7s sine (reuse the hero's EMBER constants).
- Environment: the hero's `makeStudioEnv` panel rig. The panel scene is
  defined once, but each accent renderer bakes its own PMREM env texture
  from it (GPU textures cannot be shared across WebGL contexts). Three
  small one-time bakes; each PMREM generator disposed after baking.

## Motion (calm idle drift only)

- Oscillating rotation sweep on the object's main axis — sine, never full
  revolutions (same trick as the hero, so silhouettes never turn end-on).
  Period ~14–18s, amplitude ~0.4–0.6 rad; give each accent a different
  period/phase so they never move in sync.
- Gentle vertical float: ±4–6px equivalent, ~9–12s sine.
- Ember breathing as above.
- Explicitly NOT: scroll coupling, pointer reaction, audio reactivity.

## Blender work

- Model all three in the existing Blender scene (alongside Crystal/Core),
  each low-poly and flat-shaded:
  - `AccentWork`: 4–5 thin slabs (scaled, beveled boxes or flattened
    hulls), each offset and tilted a few degrees from the one below;
    footprint roughly 2:1 wide.
  - `AccentProjects`: cube frame (wireframe-style solid struts, e.g.
    a cube with faces inset/deleted leaving edge beams) plus one small
    convex-hull gem floating inside, parented into one object or exported
    as one mesh with two material zones.
  - `AccentMusic`: seven thin upright bars (widths ~0.32, heights
    0.6–2.2 mirrored around the midline like a waveform), slight
    per-bar tilt/jitter; two bars (indices 3 and 5) fully ember.
- Two material slots per accent, used only as face markers for export:
  `AccentGlass` (most faces) and `AccentEmber` (a small hand-picked set:
  one stratum's faces on Work, the inner gem on Projects, two whole
  bars on Music). glTF splits slots into primitives;
  three.js distinguishes them by `material.name` containing "Ember".
- Export all three meshes into a single `public/models/accents.glb`,
  +Y up, same settings as crystal.glb. Target ~16KB total (final: 16.3KB — the waveform bars cost ~1.3KB over the original 15KB goal, accepted).
- Recalculate normals before export (lesson from the tip-gem hole bug).

## Placement & CSS

- The live layout is `LayoutStacked`: headers are `header.pf-blockHead`
  inside `#block-work`, `#block-projects`, `#block-music`. Each of those
  three headers gets a child `<div class="pf-section-accent">` host:
  `position: absolute`, ~160×160px, at the header's right edge, roughly
  level with the heading, `pointer-events: none`. All three sit on the
  right side (rhythm with the hero's top-right crystal).
- `.pf-blockHead` gains `position: relative`. The Music header
  (`.pf-blockHead--music`) is a flex row with the visualizer toggle on
  its right; the Music accent gets an adjusted offset so it never
  overlaps the toggle.
- Canvas fades in with the hero's pattern: `opacity: 0` →
  `.active { opacity: 1 }`, ~1s ease transition.
- The accent must not overlap header text at any desktop width
  (901px–ultrawide); if the header row is too narrow at some width, the
  accent hides (CSS media query) rather than overlapping.

## Runtime architecture

- New files: `section-accents.js` (tiny loader, same shape as
  `hero-crystal.js`) and `section-accents-scene.js` (module).
- `index.html` loads `section-accents.js?v=1` as a module script; the
  loader dynamically imports the scene module only when
  `window.innerWidth >= 901`. Mobile downloads nothing new.
- Version-busting chain discipline: index.html → `section-accents.js?v=` →
  `section-accents-scene.js?v=` (inside loader) → `accents.glb?v=`
  (inside scene). Bump the parent when a child changes.
- The scene module:
  - Waits for the React-rendered headers to exist (rAF poll, like the
    hero's waitForHero).
  - Fetches `accents.glb` once with GLTFLoader; defines the studio panel
    scene once and PMREM-bakes it per renderer (see Design language).
  - Creates one small renderer + scene + camera per accent host
    (three total), `alpha: true`, DPR capped at 1.5.
  - Per-canvas IntersectionObserver: an accent renders only while its
    host is on screen; `visibilitychange` pauses all.
  - `renderer.compileAsync` before first reveal, then `.active` fade-in.
- three.js comes from the existing import map (`three`,
  `three/addons/`); no new dependencies.

## Degradation & accessibility

- `prefers-reduced-motion: reduce`: accents do not render at all — no
  canvas, no glb fetch, no static fallback. They are purely decorative.
- glb fetch/parse failure or WebGL unavailable: silently no accents;
  the page is visually unaffected (hosts stay empty and invisible).
- Mobile (<901px): the loader gate means zero additional downloads.
- Accent hosts are `aria-hidden="true"`.

## Explicitly unchanged

- `hero-crystal.js` / `hero-crystal-scene.js`: untouched. Shared code
  (env rig, materials) is duplicated into the accents module rather than
  refactoring the shipped hero file; the hero stays exactly as deployed.
- The audio visualizer, header ambience, and all React components.

## Verification

- Playwright desktop pass: all three accents render with correct
  silhouettes; scrolling parks off-screen accents (loop stops) and wakes
  them on return; drift and ember breathing visible across timed
  screenshots; no console errors beyond the pre-existing SoundCloud 403.
- Playwright mobile pass (800px): zero fetches of accents.glb or the
  accent modules.
- Reduced-motion pass: no accent canvases in the DOM.
- Header overlap check at 901px, ~1280px, and ~1920px widths.

## Cost

Three meshes of a few hundred triangles each, rendered at ~160×160 with
at most two visible at once. One extra glb fetch (<15KB) and one PMREM
bake on desktop. Not measurable against the hero scene.
