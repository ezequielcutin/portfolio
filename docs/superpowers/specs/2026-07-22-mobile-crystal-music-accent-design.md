# Mobile 3D — Hero Crystal Stage + Music Accent Pin

Date: 2026-07-22
Status: approved (brainstorm 2026-07-22)
Builds on: `2026-07-16-hero-crystal-design.md`, `2026-07-18-section-accents-design.md`

## Summary

Bring two existing Blender/three.js ornaments to mobile with **different jobs**
than desktop — not a port of the desktop gutter layout into a vertical stack.

| Asset | Desktop today | Mobile (this spec) |
|-------|---------------|--------------------|
| Hero crystal | Beside tagline in the hero | Signature craft beat: short full-bleed **stage** between hero and Work |
| Work accent | Beside Work header | **Out of scope** — stays desktop-only |
| Projects accent | Beside Projects header | **Out of scope** — stays desktop-only |
| Music accent | Beside Music header | Quiet **section marker** pinned to the Music heading |

Approach locked: **Stage + pin**. Rendering: **live three.js**, idle drift only.

## Goals

- Give mobile a memorable “this site is crafted” moment before Work, without
  competing with name, photo, or bio.
- Extend the crystal’s design language into Music with a small accent, not a
  second stage.
- Keep first paint usable; fail quietly if CDN/GLB/WebGL is unavailable.
- Leave desktop (≥901px) behavior unchanged.

## Non-goals

- Work / Projects accents on mobile.
- Cursor lean, scroll-jacking, or audio-reactive motion for these ornaments.
- Replacing the headshot or becoming a second hero.
- Poster-only or tap-to-activate (live idle was explicitly chosen).

## Composition (mobile ≤900px)

### Crystal stage

- **Placement:** Between the hero block and the Work section — its own short
  full-bleed band (edge-to-edge within the shell, not inset beside copy).
- **Height:** ~160px (balanced). Enough room for gem + accretion disk silhouette;
  not tall enough to read as a second hero.
- **Layout role:** Signature handoff: intro (name → person) → craft beat → Work.
- **Visual treatment:** Centered gem; soft vertical fade into page ground so the
  band does not read as a hard card. Decorative only (`aria-hidden`).

### Music accent pin

- **Placement:** Top-right of the Music `pf-blockHead` (section marker).
- **Size:** ~84px host — marker scale, not a stage.
- **Layout role:** Ornament tied to the Music heading; must not collide with the
  visualizer toggle or crowd the subtitle.
- **Visual treatment:** Same mesh/flourish language as desktop Music accent
  (frozen waveform / ripples), scaled down. Decorative only (`aria-hidden`).

### Projects / Work

- No 3D accents on mobile. Headers remain text-only as today.

## Behavior & loading

### Gates

- **Desktop (`≥901px`):** Existing loaders unchanged — hero crystal in hero;
  all three section accents beside headers.
- **Mobile (`≤900px`):** New path mounts only:
  1. Hero crystal scene into the **stage** host
  2. Music accent into the **Music heading** host  
  Work/Projects accent init stays skipped on mobile.

### Motion

- Idle drift only (oscillation / float / ember / Music bar flourishes as on
  desktop). No pointer lean required on coarse pointers.
- `prefers-reduced-motion: reduce`: pause animation; keep a static craft frame
  (or poster) so the signature is still present — do not strip the signal.

### Load strategy

- Keep dynamic `import()` of scene modules (no eager three.js on every page).
- Prefer **near-viewport / idle** load so GLB + three do not block first paint.
- Pause render loops when off-screen (`IntersectionObserver`).
- Cap device pixel ratio on mobile (e.g. `Math.min(devicePixelRatio, 2)`, lower
  if profiling demands).
- Share GLB/material paths where practical; do not load Work/Projects accent
  meshes on mobile.

### Failure

- If CDN, GLB, or WebGL fails: leave stage/host empty. No error chrome.
  Page content remains fully usable (same quiet degrade as desktop).

## Architecture (implementation sketch)

No code in this doc — guidance for the plan:

1. **DOM hosts**
   - Crystal: dedicated stage element between hero and Work in `LayoutStacked`
     (or equivalent), visible only on mobile via CSS / mount logic.
   - Music: reuse accent host pattern on `#block-music .pf-blockHead`, shown on
     mobile at pin size; hide Work/Projects hosts on mobile (already hidden).

2. **Loaders**
   - Split or extend `hero-crystal.js` / `section-accents.js` gates so mobile
     can load crystal + Music only, with correct mount targets and camera/fit
     for stage vs pin.

3. **CSS**
   - Stage: ~160px, full-bleed, fade masks, `pointer-events: none`.
   - Music pin: ~84px, top-right of Music header; verify clearance vs visualizer
     toggle at narrow widths.
   - Desktop rules for in-hero crystal and three accents remain authoritative
     above 900px.

## Accessibility

- Both ornaments are decorative: `aria-hidden="true"`, no new focusables.
- Do not steal scroll or trap pointer.
- Reduced motion as above.
- Content hierarchy (name, bio, Work/Projects/Music copy) must remain readable
  if 3D never appears.

## Testing / QA

- Visual: ~390px and ~768px widths — stage height, Music pin clearance.
- Desktop ≥901px: crystal still in hero; all three accents still present;
  no mobile stage visible.
- Reduced motion: static craft, no continuous animation.
- Off-screen: render loop pauses; resumes when stage/accent re-enter view.
- Failure: block three.js CDN or GLB — empty hosts, rest of page intact.
- Music: pin does not overlap visualizer toggle or truncate subtitle.

## Decisions log

| Decision | Choice |
|----------|--------|
| Scope | Hero crystal + Music accent only |
| Crystal purpose on mobile | Signature craft moment before Work |
| Crystal placement | Full-bleed band between hero and Work |
| Approach | Stage + pin |
| Stage height | ~160px balanced |
| Music role | Section marker at Music heading |
| Rendering | Live three.js, idle drift only |

## Open for implementation plan (not blocking)

Exact loader API shape (one mobile entry vs dual gates), shared vs duplicated
PMREM/env bake, and precise DPR cap — defer to implementation plan / profiling.
