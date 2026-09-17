# Featured Projects Stage — layered 3D showcase above the terminal

Date: 2026-09-17
Status: approved (brainstorm 2026-09-17)
Builds on: the `~/projects` terminal explorer (`ProjectsTerminal`) and the
lessons of `054c557` (WebGL crystal and section accents removed) and
`9270de9` (hover lift removed for layout shift)

## Summary

A single large stage sits between the Projects header and the terminal. It
shows one featured project at a time as a layered, CSS-3D scene, with a
switcher between the two featured projects: Universal Shader Tool and
Quietly Build. Switching pushes the current scene back into depth and brings
the next one forward. The terminal stays below as the full archive, and both
featured projects remain in it.

The depth is there to present real screenshots of the work, not to decorate.
No WebGL, no three.js, no new dependencies, no layout shift.

## Constraints from history

- `054c557`: decorative 3D made the page "feel like a WebGL demo rather than
  a portfolio", and a CDN dependency failed behind corporate proxies. The
  stage uses DOM layers and CSS transforms only, and every layer is either
  a real screenshot or real project text.
- `9270de9`: transforms on project entries caused layout shift. The stage
  reserves its box with a fixed aspect ratio, and only `transform`,
  `opacity`, and `filter` animate.

## Structure

- New component `FeaturedStage` in `components.jsx`.
- Rendered only by `LayoutStacked` (the layout `app.jsx` mounts), inside
  `#block-projects`, between the `pf-blockHead` header and
  `ProjectsTerminal`.
- `ProjectsTerminal` accepts optional `openId` and `onOpenChange` props.
  When they are passed, the terminal is controlled by `LayoutStacked`, which
  lets the stage's "read the file" link open a project. When they are
  omitted, the terminal keeps its own state exactly as today.
- `PrintProjects` is unchanged. The stage is hidden in print.

## Data

Featured projects are marked in `data.js`, not in the component. Each
featured project gets a `featured` block:

```js
featured: {
  line: "Wire a node graph, watch WebGL recompile, export standalone code.",
  shot: { src: "featured/shader-tool.webp", alt: "Universal Shader Tool editor" },
  chip: "30 node types · 525 tests",
}
```

- `line`: the one-sentence pitch shown beside the stage.
- `shot`: one desktop screenshot. The stage uses desktop screenshots only;
  no floating phone layer.
- `chip`: optional short text that floats in front of the screenshot.

The stage renders every project with a `featured` block, in `data.js`
order. Initial set:

| Project | Shot | Chip |
| --- | --- | --- |
| Universal Shader Tool | editor screenshot (existing `shader-tool-editor.png`, re-encoded) | `30 node types · 525 tests` |
| Quietly Build | quietly.build landing page, desktop, cookie banner dismissed | `Rituals · focus · reflection` |

Quietly Build's landing-page shot is a placeholder. It gets replaced with an
in-app desktop screenshot later; that swap is a data and asset change only.

## Scene composition

Each scene is three layers inside a `perspective` container with
`transform-style: preserve-3d`:

1. **Plate** (`translateZ(0)`): rounded panel with a soft warm radial
   gradient and a hairline border. Colours come from theme tokens so it
   works in light and dark.
2. **Shot** (`translateZ(~40px)`): the desktop screenshot in a thin frame
   with a deep, soft shadow. `object-fit: cover`, anchored top-left.
3. **Chip** (`translateZ(~100px)`): small mono-type HTML label, card
   background, accent-coloured emphasis. Omitted when `chip` is absent.

Resting pose: roughly `rotateX(8deg) rotateY(-10deg)`.

Beside the stage (below it on mobile), a text column:

- Mono label `featured · 1 / 2`
- Title
- `featured.line`
- The project's existing `links`, rendered with the same link button style
  the terminal uses
- `read the file ↓`: opens this project in `ProjectsTerminal` and scrolls
  the terminal into view

Above the stage, a switcher styled like the terminal (mono type, accent for
the active item), labelled with the project ids: `shader-tool`,
`quietly-build`.

## Motion

- **Pointer tilt (fine pointers only):** stage rotates toward the pointer,
  capped at ±8° on each axis, eased so it trails the pointer slightly.
  Returns to the resting pose on pointer leave. Updates run through
  `requestAnimationFrame`.
- **Switch transition (~500ms, site easing):** outgoing scene moves to
  `translateZ(-120px)`, fades out, and blurs slightly; incoming scene moves
  from behind to its resting pose and fades in. Both scenes are absolutely
  positioned in the same reserved box, so nothing reflows.
- **No autoplay.** The stage changes only when the user asks.

## Mobile (under 760px)

- Stage sits above the text column at the fixed resting angle. No tilt.
- Tapping the switcher or swiping horizontally on the stage runs the same
  depth transition.
- The stage keeps its aspect ratio at full column width.

## Accessibility

- Switcher follows the tabs pattern: `role="tablist"`, `role="tab"`,
  `aria-selected`, roving `tabindex`, ←/→ to move, Home/End.
- The text column is the `tabpanel` and carries the content. Stage layers
  are `aria-hidden`; the screenshot's alt text is exposed once through the
  panel instead.
- `prefers-reduced-motion: reduce`: no tilt, no depth motion; switching is a
  plain crossfade.
- Swipe is an enhancement; the tabs remain the primary control.

## Assets and performance

- Screenshots re-encoded to 1600px wide WebP under `featured/` (the site
  already ships `headshot_budapest.webp`, so no fallback). This machine has
  no image tools, so encode with headless Chromium's canvas
  `toBlob("image/webp")` from the Playwright setup used for screenshots. The current 2880px
  `shader-tool-editor.png` is replaced by the resized version and the
  terminal entry points at it too.
- The first scene's image loads eagerly; the second loads on first hover or
  focus of its tab, or on first switch.
- Bump the cache keys on `data.js` and `app.bundle.js` in `index.html`
  (the bundle key is rewritten by `scripts/build.mjs`).

## Verification

The repo has no automated test harness, so verification is in a real
browser (headless Playwright, as for earlier changes):

- Screenshots: desktop 1440×900 and mobile 390×844, dark and light theme,
  each featured project selected.
- Page height and the terminal's position do not change when switching.
- Reduced-motion run: no transforms beyond the resting pose, crossfade only.
- Keyboard: Tab reaches the switcher, ←/→ switches, focus stays visible.
- "read the file ↓" opens the matching entry in the terminal on desktop and
  mobile.
- Print preview: stage absent, print list unchanged.

## Out of scope

- In-app Quietly Build screenshots (follow-up asset swap).
- More than two featured projects, or any change to the terminal's own
  design.
- Scroll-driven motion.
