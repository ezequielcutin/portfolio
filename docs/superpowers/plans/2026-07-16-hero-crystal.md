# Hero Crystal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Blender-modeled faceted glass crystal floating in the portfolio hero, rendered live with three.js, tilting toward the cursor, layered above the existing particle canvas.

**Architecture:** A single self-initializing ES module (`hero-crystal.js`) creates a transparent WebGL canvas inside `.pf-block--hero`, above `#header-ambience` and the text content, with `pointer-events: none`. It first ships with a procedurally faceted placeholder mesh; a later task swaps in the Blender-exported `public/models/crystal.glb`. All degraded paths (reduced motion, no WebGL, small viewport, load failure) show a static poster image instead.

**Tech Stack:** three.js (CDN import map, no build step), Blender via Blender MCP for the asset, Playwright MCP for browser verification.

**Spec:** `docs/superpowers/specs/2026-07-16-hero-crystal-design.md`

## Global Constraints

- No build step: the site is static GitHub Pages; React/Babel run in-browser. three.js loads via `<script type="module">` + import map only. **Never use Vite.**
- three.js pinned to one exact version in the import map (use `0.170.0`); all three imports go through the import map (`three`, `three/addons/`).
- Small-viewport breakpoint is `window.innerWidth < 901` (same as `header-ambience.js`).
- DPR cap: 2 desktop, 1.5 small viewports (same heuristic as `header-ambience.js`).
- Accent color read from CSS custom property `--accent` at init.
- Model budget: `crystal.glb` target < 100 KB, hard limit 150 KB.
- Render loop must pause when hero is off-screen (IntersectionObserver) and when tab hidden.
- No test framework exists in this repo; every task is verified in the real browser via the dev server (`./scripts/dev-start.sh`, http://localhost:5173/) and Playwright MCP tools.
- Cache-busting: this repo versions assets with `?v=` query strings in `index.html`; bump the version when changing a shipped file.

## File Structure

| File | Responsibility |
|------|----------------|
| `hero-crystal.js` (create) | Entire crystal feature: gating/fallbacks, scene setup, placeholder mesh, glb loading, motion, lifecycle |
| `index.html` (modify) | Import map + module script tag |
| `style.css` (modify) | `.pf-hero-crystal` canvas and `.pf-hero-crystal-poster` img positioning |
| `public/models/crystal.glb` (create, Task 4) | Blender-exported mesh |
| `public/models/crystal-poster.png` (create, Task 5) | Static fallback image |

---

### Task 1: Crystal canvas scaffold with placeholder mesh

**Files:**
- Create: `hero-crystal.js`
- Modify: `index.html` (after line 45, the `app.jsx` script tag)
- Modify: `style.css` (after the `.pf-header-ambience.active` rule, ~line 888)

**Interfaces:**
- Consumes: `.pf-block--hero` host element rendered by React (`layouts.jsx:376`); CSS var `--accent`.
- Produces: `initHeroCrystal()` self-invoked; internal functions `createCrystalMesh()` (returns `THREE.Mesh`, replaced in Task 4) and `showPoster()` (poster fallback, completed in Task 5). Canvas element `canvas.pf-hero-crystal` inside the hero block.

- [ ] **Step 1: Add import map and module script to `index.html`**

Insert before the React CDN scripts (before line 35):

```html
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"
  }
}
</script>
```

Insert after the `app.jsx` script tag (after line 45):

```html
<script type="module" src="hero-crystal.js?v=1"></script>
```

- [ ] **Step 2: Add CSS for the crystal layers**

In `style.css`, immediately after `.pf-header-ambience.active { opacity: 1; }`:

```css
.pf-hero-crystal,
.pf-hero-crystal-poster {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 2;
  opacity: 0;
  transition: opacity 1.2s ease;
  mask-image: linear-gradient(to bottom, black 55%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, black 55%, transparent 100%);
}
.pf-hero-crystal.active,
.pf-hero-crystal-poster.active { opacity: 1; }
.pf-hero-crystal-poster { object-fit: contain; object-position: 78% 40%; }
```

Bump the stylesheet version in `index.html` line 29 (`style.css?v=mini16` → `style.css?v=crystal1`).

- [ ] **Step 3: Write `hero-crystal.js` with gating, scene, and placeholder mesh**

```js
// Hero crystal — three.js glass shard layered above the particle canvas.
// Ships a procedural placeholder mesh until public/models/crystal.glb exists (Task 4).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const SMALL_VIEWPORT = window.innerWidth < 901;
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function getAccent() {
  const hex = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#4488ff';
  return new THREE.Color(hex);
}

// Poster fallback — completed in Task 5 (image does not exist yet; hide on error).
function showPoster(host) {
  const img = document.createElement('img');
  img.className = 'pf-hero-crystal-poster';
  img.alt = '';
  img.setAttribute('aria-hidden', 'true');
  img.src = 'public/models/crystal-poster.png';
  img.onload = () => img.classList.add('active');
  img.onerror = () => img.remove();
  host.appendChild(img);
}

// Placeholder shard: displaced icosahedron, flat-shaded so facets read as planes.
// Replaced by the Blender glb in Task 4.
function createCrystalMesh(accent) {
  let geo = new THREE.IcosahedronGeometry(1, 1);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const stretch = 1 + 0.55 * Math.abs(v.y);          // elongate vertically
    const jitter = 0.82 + 0.36 * Math.sin(v.x * 7.3 + v.y * 5.1 + v.z * 3.7);
    v.multiplyScalar(jitter).setY(v.y * stretch * 1.6);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo = geo.toNonIndexed();          // unshared vertices → true flat shading
  geo.computeVertexNormals();
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0x0a0a12,
    metalness: 0,
    roughness: 0.18,
    transmission: 0.85,
    thickness: 1.4,
    ior: 1.5,
    envMapIntensity: 1.4,
    emissive: accent,
    emissiveIntensity: 0.08,
    flatShading: true,
  });
  return new THREE.Mesh(geo, mat);
}

function initHeroCrystal() {
  const host = document.querySelector('.pf-block--hero');
  if (!host) return false;

  if (REDUCED_MOTION || SMALL_VIEWPORT) { showPoster(host); return true; }

  const canvas = document.createElement('canvas');
  canvas.className = 'pf-hero-crystal';
  canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(canvas);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch {
    canvas.remove();
    showPoster(host);
    return true;
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  camera.position.set(0, 0, 7);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const accent = getAccent();
  const rim = new THREE.PointLight(accent, 30);
  rim.position.set(-3, 2, -2);
  scene.add(rim);
  const key = new THREE.DirectionalLight(0xffffff, 0.6);
  key.position.set(2, 3, 4);
  scene.add(key);

  const crystal = createCrystalMesh(accent);
  const pivot = new THREE.Group();
  pivot.add(crystal);
  scene.add(pivot);

  function layout() {
    const W = host.clientWidth, H = host.clientHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    // Place the crystal center-right: ~28% of the visible width to the right.
    const halfW = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z * camera.aspect;
    pivot.position.x = halfW * 0.56;
    pivot.position.y = 0.2;
  }
  layout();
  window.addEventListener('resize', layout);

  renderer.render(scene, camera);           // first frame before fade-in
  canvas.classList.add('active');

  // Motion + lifecycle wired in Task 2; static single render until then.
  return true;
}

// The hero is rendered by React after mount — poll briefly until it exists.
(function waitForHero(triesLeft = 300) {
  if (initHeroCrystal() || triesLeft <= 0) return;
  requestAnimationFrame(() => waitForHero(triesLeft - 1));
})();
```

- [ ] **Step 4: Verify in the browser**

Run: `./scripts/dev-start.sh`, then with Playwright MCP: `browser_navigate` to `http://localhost:5173/`, `browser_take_screenshot`.

Expected: dark faceted shard visible center-right of the hero, glassy facets with accent-colored glow, name/text unobstructed, particle canvas still animating behind it. `browser_console_messages` shows no errors.

Check pointer passthrough: `browser_evaluate` → `getComputedStyle(document.querySelector('.pf-hero-crystal')).pointerEvents` → `"none"`, and dragging a particle anchor still works.

- [ ] **Step 5: Verify small-viewport and reduced-motion gates**

With Playwright MCP: `browser_resize` to 800×900, reload. Expected: no `canvas.pf-hero-crystal` in DOM (`browser_evaluate` → `!!document.querySelector('.pf-hero-crystal')` → `false`); poster `<img>` was attempted and removed itself (poster file doesn't exist yet — `onerror` path). No console errors. Resize back to 1400×900.

- [ ] **Step 6: Commit**

```bash
git add hero-crystal.js index.html style.css
git commit -m "feat(hero): add three.js crystal scaffold with placeholder mesh"
```

---

### Task 2: Motion — idle drift, cursor spring tilt, scroll parallax

**Files:**
- Modify: `hero-crystal.js`

**Interfaces:**
- Consumes: `pivot` (THREE.Group), `crystal` (THREE.Mesh), `renderer`, `scene`, `camera`, `host` from Task 1's `initHeroCrystal` scope.
- Produces: internal `startLoop()` / `stopLoop()` controlled by IntersectionObserver + `visibilitychange`. No external API changes.

- [ ] **Step 1: Replace the single static render with the animation system**

In `initHeroCrystal()`, replace:

```js
  renderer.render(scene, camera);           // first frame before fade-in
  canvas.classList.add('active');

  // Motion + lifecycle wired in Task 2; static single render until then.
  return true;
```

with:

```js
  // --- Motion state ---
  const IDLE_SPIN = 0.22;          // rad/s around Y
  const BOB_AMPLITUDE = 0.12;
  const BOB_SPEED = 0.7;
  const TILT_MAX = 0.35;           // rad, toward cursor
  const SPRING_STIFFNESS = 0.045;  // same feel family as header-ambience
  const SPRING_DAMPING = 0.88;
  const PARALLAX_Y = 1.1;          // world units over one hero height of scroll

  let targetTiltX = 0, targetTiltZ = 0;
  let tiltX = 0, tiltZ = 0, tiltVX = 0, tiltVZ = 0;
  let baseY = pivot.position.y;

  window.addEventListener('pointermove', (e) => {
    const r = host.getBoundingClientRect();
    const nx = (e.clientX / window.innerWidth) * 2 - 1;   // -1..1
    const ny = ((e.clientY - r.top) / Math.max(r.height, 1)) * 2 - 1;
    targetTiltZ = -nx * TILT_MAX;
    targetTiltX = ny * TILT_MAX;
  });

  let animId = null;
  let lastT = 0;
  function frame(t) {
    animId = requestAnimationFrame(frame);
    const dt = Math.min((t - lastT) / 1000, 0.05) || 0.016;
    lastT = t;

    crystal.rotation.y += IDLE_SPIN * dt;

    tiltVX = (tiltVX + (targetTiltX - tiltX) * SPRING_STIFFNESS) * SPRING_DAMPING;
    tiltVZ = (tiltVZ + (targetTiltZ - tiltZ) * SPRING_STIFFNESS) * SPRING_DAMPING;
    tiltX += tiltVX; tiltZ += tiltVZ;
    pivot.rotation.x = tiltX;
    pivot.rotation.z = tiltZ;

    const rect = host.getBoundingClientRect();
    const scrollProgress = Math.min(Math.max(-rect.top / Math.max(rect.height, 1), 0), 1);
    pivot.position.y = baseY + Math.sin(t / 1000 * BOB_SPEED) * BOB_AMPLITUDE + scrollProgress * PARALLAX_Y;

    renderer.render(scene, camera);
  }
  function startLoop() {
    if (animId === null) { lastT = performance.now(); animId = requestAnimationFrame(frame); }
  }
  function stopLoop() {
    if (animId !== null) { cancelAnimationFrame(animId); animId = null; }
  }

  const io = new IntersectionObserver(
    (entries) => { entries[0].isIntersecting && !document.hidden ? startLoop() : stopLoop(); },
    { threshold: 0 }
  );
  io.observe(host);
  document.addEventListener('visibilitychange', () => {
    document.hidden ? stopLoop() : startLoop();
  });

  renderer.render(scene, camera);           // first frame before fade-in
  canvas.classList.add('active');
  startLoop();
  return true;
```

- [ ] **Step 2: Verify motion in the browser**

Reload the dev server page with Playwright MCP. Expected:
- Crystal rotates slowly and bobs without pointer input.
- `browser_evaluate` moving the mouse (`window.dispatchEvent(new PointerEvent('pointermove', {clientX: 100, clientY: 100}))` then a second call at `{clientX: 1300, clientY: 400}`) followed by two screenshots ~1s apart shows the tilt visibly changing toward the pointer side.
- Scroll to the Work section, then `browser_evaluate` → confirm loop paused: read `document.querySelector('.pf-hero-crystal')` still exists, and check via `browser_console_messages` there are no errors. (Loop pause is observable: add a temporary `console.log('crystal loop', animId)`? No — instead verify by CPU: scroll away, `browser_evaluate` → `performance.now()` twice around a 500ms wait and confirm no `requestAnimationFrame` churn is required; practical check: screenshot the hero after scrolling back — animation resumes.)
- Bump `hero-crystal.js?v=1` → `?v=2` in `index.html`.

- [ ] **Step 3: Commit**

```bash
git add hero-crystal.js index.html
git commit -m "feat(hero): crystal idle drift, cursor spring tilt, scroll parallax"
```

---

### Task 3: Blender MCP — model the crystal and export crystal.glb

This task is interactive: it drives the user's live Blender session via Blender MCP tools (`mcp__blender__*`, available once the user's Blender addon server is running and the MCP server is registered). The user art-directs between steps.

**Files:**
- Create: `public/models/crystal.glb`

**Interfaces:**
- Consumes: running Blender MCP connection.
- Produces: `public/models/crystal.glb` — single mesh named `Crystal`, +Y up, ≤ 150 KB, no lights/cameras/materials required by the web side (three.js applies its own material).

- [ ] **Step 1: Verify Blender MCP connection**

Use the Blender MCP scene-info tool (e.g. `get_scene_info`). Expected: current scene data returns without error. If the tool namespace differs, list available `mcp__blender__` tools first and adapt.

- [ ] **Step 2: Build the crystal base mesh via Blender Python**

Execute in Blender (via the MCP `execute_blender_code` tool) — a fresh collection with a displaced, faceted shard:

```python
import bpy, bmesh, random, math

# Clean slate for this asset
for obj in list(bpy.data.objects):
    if obj.name.startswith("Crystal"):
        bpy.data.objects.remove(obj, do_unlink=True)

mesh = bpy.data.meshes.new("Crystal")
obj = bpy.data.objects.new("Crystal", mesh)
bpy.context.collection.objects.link(obj)

bm = bmesh.new()
bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.0)

random.seed(7)
for v in bm.verts:
    stretch = 1.0 + 0.55 * abs(v.co.y)
    jitter = 0.82 + 0.36 * math.sin(v.co.x * 7.3 + v.co.y * 5.1 + v.co.z * 3.7)
    v.co *= jitter
    v.co.y *= stretch * 1.6

# Planar-decimate into large flat facets
bm.to_mesh(mesh)
bm.free()
mod = obj.modifiers.new("facet", "DECIMATE")
mod.decimate_type = "DISSOLVE"
mod.angle_limit = math.radians(12)
bpy.context.view_layer.objects.active = obj
bpy.ops.object.modifier_apply(modifier="facet")

# Flat shading, sane scale/origin
for p in mesh.polygons:
    p.use_smooth = False
obj.location = (0, 0, 0)
print("Crystal tris:", sum(len(p.vertices) - 2 for p in mesh.polygons))
```

Expected print: a triangle count in the low hundreds (roughly 150–600).

- [ ] **Step 3: User art-direction checkpoint**

Take a Blender viewport screenshot via MCP and show the user. Iterate on Step 2's parameters (seed, jitter amplitude, decimate angle, stretch) until the user likes the silhouette. **Do not proceed without user approval of the shape.**

- [ ] **Step 4: Export glb**

Execute via MCP:

```python
import bpy, os
out = "/Volumes/X10 Pro/dev/portfolio/public/models/crystal.glb"
os.makedirs(os.path.dirname(out), exist_ok=True)
bpy.ops.object.select_all(action="DESELECT")
bpy.data.objects["Crystal"].select_set(True)
bpy.ops.export_scene.gltf(
    filepath=out,
    use_selection=True,
    export_format="GLB",
    export_yup=True,
    export_apply=True,
    export_materials="NONE",
    export_animations=False,
    export_cameras=False,
    export_lights=False,
)
print("size KB:", os.path.getsize(out) / 1024)
```

Expected: file exists, printed size < 100. If 100–150 KB, acceptable; if > 150 KB, increase the decimate `angle_limit` and re-export.

- [ ] **Step 5: Commit**

```bash
git add public/models/crystal.glb
git commit -m "feat(hero): add Blender-modeled crystal glb"
```

---

### Task 4: Load the glb, replace the placeholder mesh

**Files:**
- Modify: `hero-crystal.js`
- Modify: `index.html` (version bump)

**Interfaces:**
- Consumes: `public/models/crystal.glb` (mesh named `Crystal`) from Task 3; `createCrystalMesh(accent)` material from Task 1.
- Produces: async mesh swap inside `initHeroCrystal`; placeholder remains the instant-render fallback while the glb loads, poster is NOT used for glb failure while a placeholder is already live (spec's "glb failure → poster" applies only when nothing renders; with the placeholder live, staying on it is strictly better — note this as a conscious spec deviation in the commit message).

- [ ] **Step 1: Add the loader import and swap logic**

Add to the imports in `hero-crystal.js`:

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
```

Extract the material out of `createCrystalMesh` so both meshes share it:

```js
function createCrystalMaterial(accent) {
  return new THREE.MeshPhysicalMaterial({
    color: 0x0a0a12,
    metalness: 0,
    roughness: 0.18,
    transmission: 0.85,
    thickness: 1.4,
    ior: 1.5,
    envMapIntensity: 1.4,
    emissive: accent,
    emissiveIntensity: 0.08,
    flatShading: true,
  });
}

function createCrystalMesh(accent) {
  /* geometry code unchanged from Task 1 */
  return new THREE.Mesh(geo, createCrystalMaterial(accent));
}
```

In `initHeroCrystal()`, after `pivot.add(crystal); scene.add(pivot);`, add:

```js
  new GLTFLoader().load(
    'public/models/crystal.glb',
    (gltf) => {
      const loaded = gltf.scene.getObjectByProperty('isMesh', true);
      if (!loaded) return;                       // keep placeholder
      loaded.material = createCrystalMaterial(accent);
      // Match the placeholder's footprint so layout/motion tuning holds.
      const size = new THREE.Box3().setFromObject(loaded).getSize(new THREE.Vector3());
      loaded.scale.multiplyScalar(3.2 / Math.max(size.x, size.y, size.z));
      loaded.rotation.copy(crystal.rotation);    // continue the spin seamlessly
      pivot.remove(crystal);
      crystal.geometry.dispose();
      pivot.add(loaded);
      crystal = loaded;
    },
    undefined,
    () => { /* glb failed — placeholder stays, no user-visible error */ }
  );
```

Change `const crystal = createCrystalMesh(accent);` to `let crystal = ...` so the swap can reassign it, and make Task 2's `frame()` reference `crystal` (it already does).

- [ ] **Step 2: Verify in the browser**

Bump `hero-crystal.js?v=2` → `?v=3` in `index.html`. Reload via Playwright MCP.

Expected: Blender crystal renders (silhouette differs from the placeholder — compare screenshot against Task 1's), motion identical, no console errors, network tab (`browser_network_requests`) shows `crystal.glb` fetched with 200.

Failure path: `browser_evaluate` cannot easily block a request — instead temporarily rename the path in `hero-crystal.js` to `crystal-missing.glb`, reload, expect the placeholder shard to render with a 404 in the network log but no uncaught console error. Revert the rename.

- [ ] **Step 3: Commit**

```bash
git add hero-crystal.js index.html
git commit -m "feat(hero): load Blender crystal glb, keep placeholder as fallback"
```

---

### Task 5: Poster render and final fallback verification

**Files:**
- Create: `public/models/crystal-poster.png`
- Modify: `index.html` (version bump if `hero-crystal.js` changed)

**Interfaces:**
- Consumes: Blender MCP session with the `Crystal` object from Task 3; `showPoster()` from Task 1 (already wired to `public/models/crystal-poster.png`).
- Produces: the poster image; no code changes expected.

- [ ] **Step 1: Render the poster in Blender via MCP**

Execute via MCP (transparent background, accent-ish rim light, angle matching the web scene):

```python
import bpy, math

scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 128
scene.render.film_transparent = True
scene.render.resolution_x = 1200
scene.render.resolution_y = 900

# Camera roughly matching the web view (fov 35, z=7)
cam_data = bpy.data.cameras.new("PosterCam")
cam_data.angle = math.radians(35)
cam = bpy.data.objects.new("PosterCam", cam_data)
cam.location = (0, -7, 0.3)
cam.rotation_euler = (math.radians(90), 0, 0)
bpy.context.collection.objects.link(cam)
scene.camera = cam

# Simple glass material for the render only (web material is three.js-side)
mat = bpy.data.materials.new("CrystalGlass")
mat.use_nodes = True
bsdf = mat.node_tree.nodes["Principled BSDF"]
bsdf.inputs["Transmission Weight"].default_value = 0.85
bsdf.inputs["Roughness"].default_value = 0.18
bsdf.inputs["IOR"].default_value = 1.5
obj = bpy.data.objects["Crystal"]
obj.data.materials.clear()
obj.data.materials.append(mat)

# Accent rim light (match the site accent color before running)
light_data = bpy.data.lights.new("Rim", "POINT")
light_data.energy = 800
light_data.color = (0.8, 0.35, 0.2)  # replace with actual --accent RGB
light = bpy.data.objects.new("Rim", light_data)
light.location = (-3, -2, 2)
bpy.context.collection.objects.link(light)

scene.render.filepath = "/Volumes/X10 Pro/dev/portfolio/public/models/crystal-poster.png"
bpy.ops.render.render(write_still=True)
print("done")
```

Note: read the real `--accent` value from `style.css` first and convert hex → linear RGB for `light_data.color`. Show the render to the user; iterate once if needed.

- [ ] **Step 2: Optimize the PNG**

Run: `sips -Z 1200 "/Volumes/X10 Pro/dev/portfolio/public/models/crystal-poster.png" && ls -la "/Volumes/X10 Pro/dev/portfolio/public/models/"`

Expected: poster under ~300 KB. If much larger, re-render at 900×675 or convert to WebP (`cwebp` if available) and update the path in `showPoster()` + bump the JS version.

- [ ] **Step 3: Verify every fallback path in the browser**

With Playwright MCP against the dev server:
1. Narrow viewport: `browser_resize` 800×900, reload → poster image visible center-right, no WebGL canvas, no console errors.
2. Reduced motion: emulate via `browser_run_code_unsafe`/CDP (`Emulation.setEmulatedMedia` with `prefers-reduced-motion: reduce`), reload at 1400×900 → poster shown, no canvas.
3. Normal desktop: reload → live crystal, poster absent.

- [ ] **Step 4: Full-page sanity check**

Screenshot the whole page top to bottom; confirm the audio visualizer section and timeline cube still behave (scroll through, no console errors, no jank reported in devtools performance quick check).

- [ ] **Step 5: Commit**

```bash
git add public/models/crystal-poster.png hero-crystal.js index.html
git commit -m "feat(hero): add Cycles poster render for crystal fallbacks"
```

---

## Deploy note

The live site serves `main` directly (no build). After the final task, pushing `main` ships it. Verify on the production URL after push; CDN import-map fetch (jsdelivr) must be reachable — if the user prefers zero third-party runtime deps later, vendoring `three.module.js` into the repo is a follow-up, not part of this plan.
