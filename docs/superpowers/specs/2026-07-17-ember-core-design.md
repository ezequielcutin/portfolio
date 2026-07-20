# Ember Core — hero crystal upgrade

Date: 2026-07-17
Status: approved (brainstorm 2026-07-17)
Builds on: `2026-07-16-hero-crystal-design.md` (shipped on `feat/hero-crystal`)

## Summary

Add a second Blender-modeled structure — a jagged, opaque "ember" gem — floating
inside the existing glass hull crystal. The hull's transmission material refracts
it, so the crystal stops reading as a single surface and becomes a container.
The core counter-rotates against the hull's roll and its marked facets breathe
with a slow emissive pulse in the site accent (#b94a2b). No new interactions;
existing flick physics, scroll journey, mobile gating, and reduced-motion paths
are unchanged in behavior.

## Blender work

- Model a second convex-hull gem in the existing Blender scene:
  - More jagged than the hull: higher seed point count and sharper displacement,
    different random seed than the outer crystal (seed 11).
  - Sized to occupy roughly 40–45% of the outer crystal's interior once both are
    normalized in three.js.
  - Mesh named `Core`; outer mesh keeps the name `Crystal`.
- Assign two material slots on the core, used only as face markers for export:
  - `CoreDark` on most faces.
  - `CoreEmber` on a small hand-picked set of facets (target 4–7 faces, chosen
    for visibility across rotation).
  - glTF export splits material slots into separate primitives, which is how
    three.js distinguishes them. Slot names must survive export (check
    `material.name` on the loaded primitives).
- Export both meshes into a single `public/models/crystal.glb` (v2), +Y up,
  same settings as v1. One fetch, atomic upgrade; v1 stays in git history.
- Re-render `public/models/crystal-poster.png` with the core inside (Cycles
  glass shows it properly). Same pose, resolution, and file budget (~120KB)
  as the current poster.

## three.js integration (`hero-crystal-scene.js`)

### Loading

- Loader stops assuming a single mesh: traverse the scene and pick meshes by
  name (`Crystal`, `Core`).
- Hull: unchanged — existing glass material, normalize to `3.2 / maxDim`,
  `scale.y *= 0.72`, edges rebuilt.
- Core: added to the `lay` group as a **sibling** of the hull (not a child), so
  it inherits journey pitch/yaw and pivot travel but owns its local rotation.
  Its scale derives from the same normalization pass so the 40–45% ratio holds.
- If the glb has no `Core` mesh (stale cache, partial deploy), the hull works
  exactly as today — core code paths are all conditional on the mesh existing.

### Materials

- `CoreDark` primitive: `MeshStandardMaterial`, color near-black (~0x080405),
  `roughness ~0.5`, `metalness 0`, `flatShading: true`. Matte coal against the
  glossy hull.
- `CoreEmber` primitive: same base plus `emissive: accent` (#b94a2b),
  `emissiveIntensity` driven per frame (see Glow).
- No transmission, no clearcoat on the core — its job is contrast.

### Motion

- Core rolls on its local Y at approximately `-0.6 ×` the hull's roll rate:
  idle component `-0.6 * IDLE_ROLL`, plus `-0.6 ×` a damped fraction of flick
  `rollVel` (reuse the existing decayed velocity — no separate spring).
- Flick the hull right → the ember visibly drifts left inside the glass.
- No response to yaw is required; hull yaw already changes the viewing angle
  through the glass.

### Glow

- Ember facets breathe on a ~7-second sine:
  `emissiveIntensity = 0.475 + 0.225 * sin(t * 2π / 7)` (range ~0.25–0.7).
- Fully independent of pointer and scroll. No hover coupling — that was
  deliberately removed from the hull and stays removed.

## Unchanged behavior (explicit)

- Mobile (<901px): loader gate untouched; nothing new downloads or renders.
- Reduced motion: poster path untouched (poster itself is re-rendered).
- Scroll journey, fade at the work section, loop stop/start, lamp prowl,
  motes: untouched.
- Cache busting: bump `hero-crystal.js?v=` in `index.html` and the scene
  module query inside `hero-crystal.js`.

## Verification

- Playwright desktop pass: core visible through the hull, counter-rotation
  observable across timed screenshots, breathing glow changes across ~4s
  screenshots, no console errors beyond the pre-existing SoundCloud ones.
- Playwright mobile pass (800px): still zero fetches of three.js / scene / glb.
- glb stays small (target <10KB; v1 was 3.7KB).

## Cost

~40 extra triangles, two extra materials, one sine evaluation per frame.
No new draw-call-heavy features. Not measurable against the current scene.
