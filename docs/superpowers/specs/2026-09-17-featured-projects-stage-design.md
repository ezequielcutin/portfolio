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
- `shot`: the main landscape screenshot that fills most of the plate.
- `chip`: optional short text that floats in front of the screenshot.
- `inset`: optional second screenshot that floats in front instead of a
  chip — a portrait view of the same product, shown as a narrow panel. A
  featured block uses `chip` or `inset`, never both.

The stage renders every project with a `featured` block, in `data.js`
order. Initial set:

| Project | Shot | Front layer | Line |
| --- | --- | --- | --- |
| Universal Shader Tool | editor screenshot (existing `shader-tool-editor.png`, re-encoded) | chip: `30 node types · 525 tests` | Wire a node graph, watch WebGL recompile, export standalone code. |
| Quietly Build | Ideas web, celestial view (`ideas-web.png`, 1082×879) | inset: Hearth intentions (`hearth-intentions.png`, 773×1237) | Daily rituals instead of task lists, with an idea graph that links what you are thinking about. |

Both Quietly Build screenshots are real in-app views supplied on
2026-09-17, so no landing-page placeholder is needed. The Ideas web is the
widest and most legible view; the Hearth panel is portrait, which makes it
read as a second surface rather than a duplicate. Two further shots are
staged and unused for now: `breathe.png` (1007×759) and `session-timer.png`
(606×837).

## Scene composition

Each scene is three layers inside a `perspective` container with
`transform-style: preserve-3d`:

1. **Plate** (`translateZ(0)`): rounded panel with a soft warm radial
   gradient and a hairline border. Colours come from theme tokens so it
   works in light and dark.
2. **Shot** (`translateZ(~40px)`): the main screenshot in a thin frame with
   a deep, soft shadow. `object-fit: cover`, anchored top-left.
3. **Front layer** (`translateZ(~100px)`), one of:
   - **Chip**: small mono-type HTML label, card background, accent-coloured
     emphasis.
   - **Inset**: the portrait screenshot in a narrow rounded frame with its
     own shadow, overlapping the main shot's right edge and running past
     the plate's bottom edge so the depth is unmistakable.

   Omitted when the featured block has neither.

Resting pose: roughly `rotateX(8deg) rotateY(-10deg)`.

Both products have dark UIs, so in light theme the screenshots stay dark
against a light plate. The frame around each shot carries a neutral border
and the plate tint stays subtle, so the shots read as screens on a surface
rather than as holes in the page. Contrast is checked in both themes.

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

- Source screenshots are staged, uncommitted, in `.assets-src/` (gitignored).
  Only the encoded output ships.
- Screenshots re-encoded to WebP under `featured/` (the site already ships
  `headshot_budapest.webp`, so no fallback): main shots at 1600px wide,
  insets at 700px wide. This machine has no image tools, so encode with
  headless Chromium's canvas `toBlob("image/webp")` from the Playwright
  setup used for screenshots. The current 2880px `shader-tool-editor.png` is
  replaced by the resized version and the terminal entry points at it too.
- The Quietly Build sources are already small (1082×879 and 773×1237), so
  they are re-encoded at their native size rather than upscaled.
- The first scene's images load eagerly; the second scene's load on first
  hover or focus of its tab, or on first switch.
- Bump the cache keys on `data.js` and `app.bundle.js` in `index.html`
  (the bundle key is rewritten by `scripts/build.mjs`).

## Verification

The repo has no automated test harness, so verification is in a real
browser (headless Playwright, as for earlier changes):

- Screenshots: desktop 1440×900 and mobile 390×844, dark and light theme,
  each featured project selected.
- The Quietly Build inset stays legible and does not collide with the text
  column at any breakpoint.
- Page height and the terminal's position do not change when switching.
- Reduced-motion run: no transforms beyond the resting pose, crossfade only.
- Keyboard: Tab reaches the switcher, ←/→ switches, focus stays visible.
- "read the file ↓" opens the matching entry in the terminal on desktop and
  mobile.
- Print preview: stage absent, print list unchanged.

## Out of scope

- Using the remaining staged Quietly Build shots (`breathe`,
  `session-timer`), or any carousel of shots within one scene.
- More than two featured projects, or any change to the terminal's own
  design.
- Scroll-driven motion.
