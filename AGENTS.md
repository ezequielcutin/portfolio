# AGENTS.md

## Cursor Cloud specific instructions

This repository's `main` branch is a **fully static site** (personal portfolio for `ezequielcutin.com`, served via GitHub Pages). There is **no build step and no npm dependencies on `main`**:

- React and Babel are loaded from CDNs; the `.jsx` files are transpiled **in the browser** via `@babel/standalone`. Three.js is loaded through an importmap in `index.html`.
- Do **not** introduce `import`/`export` in the root `.jsx` files. Components are attached to `window` (e.g. via `Object.assign(window, {...})`), matching the existing pattern.
- A Vite/React/TypeScript scaffold exists only on a separate branch and is gitignored on `main` (`package.json`, `vite.config.ts`, etc.). Do not expect those files on `main`.

### Running the site (dev)

Serve the repo root with a plain static HTTP server on port 5173:

```
python3 -m http.server 5173 --bind 0.0.0.0
```

Then open `http://localhost:5173/`. `python3` is preinstalled, so no dependency installation is required.

- **Do NOT use Vite** to serve `main` — it breaks the in-browser Babel transpilation.
- The site depends on external CDNs (unpkg, jsdelivr, Google Fonts) at runtime, so network egress must be available for React/Three.js to load.

### Cache busting

Shipped assets are versioned with `?v=` query strings in `index.html` (and some `.js` files reference other files with `?v=`). When editing a shipped file, bump its `?v=` so the browser picks up the change. This also matters when verifying changes locally.

### Lint / test / build

There is **no lint, test, or build framework on `main`** — verification is done by loading the site in a browser and interacting with it. The three core sections are the `Work`, `Projects`, and `Music` tabs.
