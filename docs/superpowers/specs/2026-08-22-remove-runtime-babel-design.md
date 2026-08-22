# Remove runtime Babel

Date: 2026-08-22
Status: approved, implementing

## Problem

`index.html` loads React UMD, ReactDOM UMD, and `@babel/standalone` from
unpkg, then hands four `.jsx` files to Babel as `type="text/babel"`. Every
visitor downloads a ~2.8MB transpiler and pays to compile ~85KB of JSX in the
browser before the page renders.

Three costs:

1. **Speed.** Transpilation happens on every page load, on the main thread,
   before first paint.
2. **Fragility.** Three CDN requests that can fail independently. jsdelivr
   returned 403 during this project's sandbox work and the hero silently lost
   its 3D scene; a corporate proxy blocking unpkg would blank the whole site.
3. **Credibility.** The audience is engineers. A transpiler shipped to
   production is visible in devtools.

## Constraints discovered

- The `.jsx` files contain **no `import`/`export`**. They are classic scripts
  relying on globals and cross-file function hoisting. This is a JSX transform
  and concatenation problem, not a module bundling problem — no source
  refactor is required.
- `components.jsx:2` and `layouts.jsx:2` destructure hooks off the `React`
  global. React must be assigned before either runs.
- Three ReactDOM APIs are used and come from two entry points:
  `createRoot` (`react-dom/client`), `createPortal` and `flushSync`
  (`react-dom`).
- 47 top-level names across the four files, **no collisions**, so
  concatenating them into a single shared scope is safe. `layouts.jsx`
  already aliases its hooks to `useStateL`/`useEffectL` for this reason.
- `esbuild` is already present as a Vite transitive dependency; it will be
  added as an explicit devDependency rather than relied on implicitly.

## Approach

Chosen: **commit the built bundle.** GitHub Pages keeps serving `main`
directly, no CI, deploy stays instant.

Rejected:
- *GitHub Actions build + deploy* — no artifact in git and no way to ship
  stale output, but it costs a workflow to maintain and pushes stop deploying
  instantly. Disproportionate for a static personal site.
- *Full Vite build* — conventional, but requires converting the `.jsx` files
  to ES modules and splits local dev from the production path. `CLAUDE.md`
  already records that Vite breaks local dev here.

React and ReactDOM are bundled in rather than left on CDN, so the site has
zero external script dependencies and cannot be broken by a CDN outage or a
blocking proxy. Costs roughly 45KB gzipped against the ~700KB gzipped of
Babel being removed.

## Design

`scripts/build.mjs`:

1. Bundle a vendor prelude: an entry importing `react`, `react-dom`, and
   `react-dom/client`, assigning `globalThis.React` and `globalThis.ReactDOM`
   (the latter merged so `createRoot`, `createPortal`, and `flushSync` all
   resolve).
2. Transform each `.jsx` with esbuild's JSX loader — transform, not bundle.
3. Concatenate: vendor, `icons`, `components`, `layouts`, `app`.
4. Minify, write `app.bundle.js`, and inject its content hash into
   `index.html` as `app.bundle.js?v=<hash>`.

`--watch` rebuilds on `.jsx` change and is started by `dev-start.sh`, so local
dev stays a single command.

### index.html

Removes: two React UMD tags, the Babel Standalone tag, four `text/babel` tags.
Adds: one `app.bundle.js` tag.

`data.js`, `header-ambience.js`, and `audio-visualizer.js` are unchanged and
must keep loading before the bundle — `app.jsx` reads `window.PORTFOLIO_DATA`
and calls `initHeaderAmbience` / `initAudioVisualizer` as globals.

### Cache busting

Content-hash injection replaces manual `?v=` bumping, which is recorded as a
recurring footgun and caused stale-code confusion repeatedly during this
project. `style.css` keeps its manual version for now; only the bundle is
hashed.

### Stale-bundle guard

A pre-commit hook rebuilds and fails the commit if `app.bundle.js` is out of
date. This is the single real weakness of committing the artifact, so it is
part of the change, not a follow-up.

## Verification

- Page renders, all sections present, no console errors
- Theme toggle, work deck, dossier, projects terminal, music block, resume
  modal all still function
- No `text/babel` or Babel request remains
- Payload measured before and after

Real-world load improvement cannot be confirmed from the sandbox; its paint
metrics are unreliable. Payload size is measurable, timing is not.

## Out of scope

Converting `.jsx` to ES modules. Bundling `data.js`, `header-ambience.js`, or
`audio-visualizer.js`. Hashing `style.css`.
