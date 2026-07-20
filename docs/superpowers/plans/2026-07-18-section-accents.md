# Section Accents Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three small Blender-modeled ornaments (glass strata, lattice cube, broken ring) idle-drifting beside the Work, Projects, and Music section headers on desktop, in the hero crystal's material language.

**Architecture:** One `accents.glb` holds all three meshes (named `AccentWork`, `AccentProjects`, `AccentMusic`, ember faces marked by a second material slot). A tiny loader (`section-accents.js`) gates by viewport width and dynamically imports `section-accents-scene.js`, which fetches the glb once and spins up one small parked renderer per section header. Hero files are not touched.

**Tech Stack:** Blender 5.2 via Blender MCP, three.js 0.170.0 via the existing import map (no build step — static GitHub Pages, in-browser Babel; NEVER use Vite), Playwright MCP for verification.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-18-section-accents-design.md`.
- Work on branch `feat/section-accents` off `main`.
- `hero-crystal.js` and `hero-crystal-scene.js` must not be modified.
- Desktop gate: the scene module and glb download only when `window.innerWidth >= 901`.
- Reduced motion (`prefers-reduced-motion: reduce`): accents do not render at all — no canvas, no glb fetch.
- glb failure / WebGL failure: silently no accents; page unaffected.
- `public/models/accents.glb` target <15KB; +Y up export.
- Cache-bust chain: `index.html` → `section-accents.js?v=N` → `section-accents-scene.js?v=M` (inside loader) → `accents.glb?v=K` (inside scene). When you edit a file, bump its URL in its PARENT.
- Accent color comes from the CSS var `--accent` (#b94a2b) at runtime, never hard-coded.
- Motion: calm idle drift only — oscillating sweep (never full revolutions), vertical float, ember breathing. No scroll coupling, no pointer reaction, no audio reactivity.
- DPR capped at 1.5. Each canvas parks (loop stopped) while its host is off-screen or the tab is hidden.
- Accent hosts are `aria-hidden="true"`, `pointer-events: none`.

---

### Task 1: Blender modeling + accents.glb export

**Files:**
- Create: `public/models/accents.glb`

**Interfaces:**
- Produces: `public/models/accents.glb` containing exactly three top-level mesh objects named `AccentWork`, `AccentProjects`, `AccentMusic`, each at the world origin, each using two materials named `AccentGlass` (most faces) and `AccentEmber` (marker faces). glTF export splits material slots into primitives; three.js identifies ember primitives by `material.name === 'AccentEmber'`.

This task runs in the connected Blender instance via `mcp__blender__execute_blender_code`. The scene already contains the hero objects (`Crystal`, `Core`, archived `*_v1`) — do not modify or delete them. Blender is Z-up; export handles the +Y-up conversion.

- [ ] **Step 1: Create shared marker materials and the three meshes**

Run via `mcp__blender__execute_blender_code`:

```python
import bpy, bmesh, math, random
from mathutils import Vector, Matrix

def get_mat(name):
    m = bpy.data.materials.get(name)
    if m is None:
        m = bpy.data.materials.new(name)
    return m

glass = get_mat('AccentGlass')
ember = get_mat('AccentEmber')

def new_obj(name, mesh):
    old = bpy.data.objects.get(name)
    if old:
        bpy.data.objects.remove(old, do_unlink=True)
    ob = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(ob)
    ob.data.materials.append(glass)   # slot 0
    ob.data.materials.append(ember)   # slot 1
    return ob

def finish(bm, mesh):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()

# ---- AccentWork: 5 thin offset strata (middle stratum = ember) ----
random.seed(31)
bm = bmesh.new()
for i in range(5):
    z = (i - 2) * 0.18
    ret = bmesh.ops.create_cube(bm, size=1.0)
    verts = ret['verts']
    ang = math.radians(random.uniform(-9, 9))
    off = Vector((random.uniform(-0.12, 0.12), random.uniform(-0.10, 0.10), z))
    scale = Matrix.Diagonal((1.15 - i * 0.06, 0.62 - i * 0.03, 0.06)).to_4x4()
    rot = Matrix.Rotation(ang, 4, 'Z')
    for v in verts:
        v.co = rot @ scale @ v.co + off
    if i == 2:
        for f in bm.faces:
            if all(v in verts for v in f.verts):
                f.material_index = 1
mesh = bpy.data.meshes.new('AccentWork')
finish(bm, mesh)
new_obj('AccentWork', mesh)

# ---- AccentProjects: cube frame + small ember gem inside ----
random.seed(47)
frame = bpy.data.meshes.new('AccentProjectsFrame')
bm = bmesh.new()
bmesh.ops.create_cube(bm, size=1.4)
finish(bm, frame)
frame_ob = new_obj('AccentProjects', frame)
wf = frame_ob.modifiers.new('wf', 'WIREFRAME')
wf.thickness = 0.12
wf.use_even_offset = True
bpy.context.view_layer.objects.active = frame_ob
for o in bpy.context.selected_objects:
    o.select_set(False)
frame_ob.select_set(True)
bpy.ops.object.modifier_apply(modifier='wf')

# gem: convex hull of random points, all faces ember
bm = bmesh.new()
pts = [bmesh.ops.create_vert(bm, co=(random.uniform(-0.32, 0.32),
                                     random.uniform(-0.32, 0.32),
                                     random.uniform(-0.4, 0.4)))['vert'][0]
       for _ in range(14)]
hull = bmesh.ops.convex_hull(bm, input=list(bm.verts))
bmesh.ops.delete(bm, geom=[g for g in hull['geom_interior'] if isinstance(g, bmesh.types.BMVert)], context='VERTS')
for f in bm.faces:
    f.material_index = 1
gem_mesh = bpy.data.meshes.new('AccentProjectsGem')
finish(bm, gem_mesh)
gem_ob = bpy.data.objects.new('AccentProjectsGem', gem_mesh)
bpy.context.collection.objects.link(gem_ob)
gem_ob.data.materials.append(glass)
gem_ob.data.materials.append(ember)

# join gem into frame → one object 'AccentProjects'
for o in bpy.context.selected_objects:
    o.select_set(False)
gem_ob.select_set(True)
frame_ob.select_set(True)
bpy.context.view_layer.objects.active = frame_ob
bpy.ops.object.join()

# ---- AccentMusic: faceted broken torus, ember at the fracture ----
random.seed(59)
bm = bmesh.new()
# no torus op in bmesh — build the ring manually so we can leave a gap
MAJOR, MINOR = 0.85, 0.2
MAJ_SEG, MIN_SEG = 18, 6
GAP_CENTER, GAP_HALF = math.radians(90), math.radians(28)
rings = []
kept_angles = []
for i in range(MAJ_SEG + 1):
    a = (i / MAJ_SEG) * math.tau
    # skip ring positions inside the gap
    d = abs((a - GAP_CENTER + math.pi) % math.tau - math.pi)
    if d < GAP_HALF:
        rings.append(None)
        continue
    ring = []
    for j in range(MIN_SEG):
        b = (j / MIN_SEG) * math.tau
        jr = 1 + random.uniform(-0.08, 0.08)
        r = MAJOR + MINOR * jr * math.cos(b)
        z = MINOR * jr * math.sin(b)
        ring.append(bm.verts.new((math.cos(a) * r, math.sin(a) * r, z)))
    rings.append(ring)
    kept_angles.append((i, a))
faces = []
for i in range(MAJ_SEG):
    r0, r1 = rings[i], rings[i + 1]
    if r0 is None or r1 is None:
        continue
    for j in range(MIN_SEG):
        jn = (j + 1) % MIN_SEG
        f = bm.faces.new((r0[j], r0[jn], r1[jn], r1[j]))
        faces.append((f, i))
# cap the two exposed ends and mark fracture faces as ember
end_indices = set()
for i in range(MAJ_SEG + 1):
    if rings[i] is not None and ((i > 0 and rings[i-1] is None) or (i < MAJ_SEG and rings[i+1] is None)):
        end_indices.add(i)
        try:
            bm.faces.new(rings[i])
        except ValueError:
            pass
for f in bm.faces:
    center = f.calc_center_median()
    a = math.atan2(center.y, center.x) % math.tau
    d = abs((a - GAP_CENTER + math.pi) % math.tau - math.pi)
    f.material_index = 1 if d < GAP_HALF + math.radians(14) else 0
mesh = bpy.data.meshes.new('AccentMusic')
finish(bm, mesh)
new_obj('AccentMusic', mesh)

print('created:', [o.name for o in bpy.data.objects if o.name.startswith('Accent')])
```

Expected print: `created: ['AccentWork', 'AccentProjects', 'AccentMusic']` (order may vary; `AccentProjectsGem` must NOT appear — it was joined).

- [ ] **Step 2: Visual check**

Use `mcp__blender__render_viewport_to_path` (or `get_screenshot_of_area_as_image`) to confirm each object reads as: layered slabs / open cube frame with a shard inside / a chipped faceted ring. If a silhouette is mushy (e.g. gem poking through the frame, gap too small to read), adjust the numbers in Step 1 and re-run.

- [ ] **Step 3: Export accents.glb**

```python
import bpy
for o in bpy.context.selected_objects:
    o.select_set(False)
names = ['AccentWork', 'AccentProjects', 'AccentMusic']
for n in names:
    ob = bpy.data.objects[n]
    ob.location = (0, 0, 0)
    ob.select_set(True)
bpy.context.view_layer.objects.active = bpy.data.objects[names[0]]
bpy.ops.export_scene.gltf(
    filepath='/Volumes/X10 Pro/dev/portfolio/public/models/accents.glb',
    export_format='GLB',
    use_selection=True,
    export_yup=True,
    export_apply=True,
)
print('exported')
```

- [ ] **Step 4: Verify the file**

Run: `ls -la "/Volumes/X10 Pro/dev/portfolio/public/models/accents.glb"`
Expected: file exists, size < 15000 bytes. If larger, reduce segment counts in Step 1 and re-export.

- [ ] **Step 5: Commit**

```bash
cd "/Volumes/X10 Pro/dev/portfolio"
git add public/models/accents.glb
git commit -m "feat(accents): model and export section accent meshes"
```

---

### Task 2: Loader, index.html wiring, CSS

**Files:**
- Create: `section-accents.js`
- Modify: `index.html` (after the `hero-crystal.js` script tag, ~line 54)
- Modify: `style.css` (append at end)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `section-accents.js` dynamically imports `./section-accents-scene.js?v=1` (Task 3 creates it); CSS classes `.pf-section-accent` (host div) and `.pf-section-accent canvas` / `.active` (fade-in) that Task 3's module relies on; `.pf-blockHead` becomes `position: relative`.

- [ ] **Step 1: Create the loader**

Create `section-accents.js`:

```js
// Section accents loader. Same gate as the hero crystal: mobile never
// shows the accents, so nothing downloads there at all.
if (window.innerWidth >= 901) {
  // catch: if the CDN is unreachable the accents quietly don't appear.
  import('./section-accents-scene.js?v=1').catch(() => {});
}
```

- [ ] **Step 2: Wire into index.html**

In `index.html`, directly below the existing line:

```html
<script type="module" src="hero-crystal.js?v=32"></script>
```

add:

```html
<script type="module" src="section-accents.js?v=1"></script>
```

- [ ] **Step 3: Add CSS**

Append to `style.css`:

```css
/* ═══════════ SECTION ACCENTS ═══════════ */
.pf-blockHead { position: relative; }
.pf-section-accent {
  position: absolute;
  top: -36px;
  right: 0;
  width: 160px;
  height: 160px;
  pointer-events: none;
  z-index: 2;
}
/* Music header is a flex row with the visualizer toggle at its right;
   lift the accent clear of the toggle. */
.pf-blockHead--music .pf-section-accent { top: -120px; }
.pf-section-accent canvas {
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 1s ease;
}
.pf-section-accent canvas.active { opacity: 1; }
@media (max-width: 900px) {
  .pf-section-accent { display: none; }
}
```

Then bump the stylesheet's cache-bust query in `index.html`: change `style.css?v=crystal4` to `style.css?v=accents1`.

- [ ] **Step 4: Verify the page still loads**

Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/` → expected `200`. (Dev server: `./scripts/dev-start.sh` if not running.) Do NOT pipe curl output through grep — the rtk hook can silently empty piped output.

- [ ] **Step 5: Commit**

```bash
cd "/Volumes/X10 Pro/dev/portfolio"
git add section-accents.js index.html style.css
git commit -m "feat(accents): loader, wiring, and accent host styles"
```

---

### Task 3: Scene module

**Files:**
- Create: `section-accents-scene.js`

**Interfaces:**
- Consumes: `public/models/accents.glb?v=1` (Task 1: meshes `AccentWork`/`AccentProjects`/`AccentMusic`, ember primitives have `material.name === 'AccentEmber'`); CSS classes from Task 2 (`.pf-section-accent`, canvas `.active` fade).
- Produces: `window.__sectionAccentsRunning()` → number of accent loops currently running (verification hook, mirrors `window.__heroCrystalRunning`).

- [ ] **Step 1: Create `section-accents-scene.js`**

The material/env/edge functions are deliberately duplicated from `hero-crystal-scene.js` (the hero file must not be touched or refactored):

```js
// Section accents — three small ornaments in the hero crystal's design
// language, one beside each section header: glass strata (Work), a
// lattice cube holding an ember gem (Projects), a broken resonant ring
// (Music). Calm idle drift only; loaded on desktop viewports only.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function getAccent() {
  const hex = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#4488ff';
  return new THREE.Color(hex);
}

// Same night-session studio rig as the hero (duplicated on purpose —
// the shipped hero module stays untouched).
function makeStudioEnv(accent) {
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x030303);
  const panel = (color, intensity, w, h, pos, lookAt) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity) })
    );
    m.position.set(...pos);
    m.lookAt(...lookAt);
    env.add(m);
  };
  panel(accent, 9, 3.2, 1.5, [-4, 1.5, 3], [0, 0, 0]);
  panel(0x8a97b8, 2.6, 4, 1.1, [4.5, -1, -2], [0, 0, 0]);
  panel(0xffffff, 10, 1.1, 0.3, [0.5, 4.5, 1.5], [0, 0, 0]);
  panel(0xfff1e2, 12, 0.35, 2.6, [-2.5, -3.5, 2], [0, 0, 0]);
  panel(0xd98a4a, 5, 5, 3, [0, -4.5, 0.5], [0, 0, 0]);
  return env;
}

function createGlassMaterial(accent) {
  return new THREE.MeshPhysicalMaterial({
    color: 0x6b3517,
    metalness: 0,
    roughness: 0.05,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    iridescence: 0.7,
    iridescenceIOR: 1.6,
    envMapIntensity: 2.2,
    emissive: accent,
    emissiveIntensity: 0.12,
    flatShading: true,
    side: THREE.DoubleSide,
  });
}

function createEmberMaterial(accent) {
  return new THREE.MeshStandardMaterial({
    color: 0x35160a,
    roughness: 0.5,
    metalness: 0,
    flatShading: true,
    emissive: accent,
    emissiveIntensity: 0.75,
  });
}

function makeEdges(mesh) {
  const e = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry, 10),
    new THREE.LineBasicMaterial({
      color: 0xffd9b0,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  mesh.add(e);
  return e;
}

// Per-accent placement and motion personality. Different periods and
// phases so the three never move in sync.
const DEFS = [
  { mesh: 'AccentWork',     header: '#block-work .pf-blockHead',     oscPeriod: 15, oscAmp: 0.5,  floatPeriod: 10, phase: 0,   restX: 0.5,  restY: 0.15 },
  { mesh: 'AccentProjects', header: '#block-projects .pf-blockHead', oscPeriod: 18, oscAmp: 0.45, floatPeriod: 12, phase: 2.1, restX: 0.35, restY: 0.5  },
  { mesh: 'AccentMusic',    header: '#block-music .pf-blockHead',    oscPeriod: 13, oscAmp: 0.55, floatPeriod: 9,  phase: 4.2, restX: 0.2,  restY: 0.1  },
];

const EMBER_PERIOD = 7;   // s — same breathing as the hero core
const EMBER_MID = 0.75;
const EMBER_AMP = 0.3;
const FLOAT_AMP = 0.09;   // world units of vertical float

let running = 0;
window.__sectionAccentsRunning = () => running;

function initAccent(def, source, accent) {
  const header = document.querySelector(def.header);
  if (!header) return;

  const host = document.createElement('div');
  host.className = 'pf-section-accent';
  host.setAttribute('aria-hidden', 'true');
  header.appendChild(host);

  const canvas = document.createElement('canvas');
  host.appendChild(canvas);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch {
    host.remove();
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  camera.position.set(0, 0, 5.2);

  // Env textures can't cross WebGL contexts: bake per renderer, once.
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(makeStudioEnv(accent), 0.05).texture;
  pmrem.dispose();

  const lamp = new THREE.PointLight(accent, 14);
  lamp.position.set(-2.5, -1, 2);
  scene.add(lamp);
  const key = new THREE.DirectionalLight(0xfff2e0, 0.5);
  key.position.set(2, 3, 4);
  scene.add(key);

  // Clone the loaded mesh (each accent lives in its own scene/context).
  const obj = source.clone(true);
  let emberMat = null;
  obj.traverse((o) => {
    if (!o.isMesh) return;
    const isEmber = o.material && o.material.name === 'AccentEmber';
    if (isEmber) {
      o.material = createEmberMaterial(accent);
      emberMat = o.material;
    } else {
      o.material = createGlassMaterial(accent);
      makeEdges(o);
    }
  });
  // Normalize to a consistent on-screen size.
  const size = new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3());
  obj.scale.multiplyScalar(2.4 / Math.max(size.x, size.y, size.z));

  const pivot = new THREE.Group();
  pivot.rotation.x = def.restX;   // rest pose: tipped toward the viewer
  pivot.rotation.y = def.restY;
  pivot.add(obj);
  scene.add(pivot);

  function layout() {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h || 1;
    camera.updateProjectionMatrix();
  }
  layout();
  window.addEventListener('resize', layout);

  let animId = null;
  function frame(t) {
    animId = requestAnimationFrame(frame);
    const tm = t / 1000 + def.phase;
    // Oscillating sweep — never a full revolution, same as the hero.
    obj.rotation.y = def.oscAmp * Math.sin(tm * (Math.PI * 2 / def.oscPeriod));
    obj.position.y = FLOAT_AMP * Math.sin(tm * (Math.PI * 2 / def.floatPeriod));
    if (emberMat) {
      emberMat.emissiveIntensity = EMBER_MID + EMBER_AMP * Math.sin(tm * (Math.PI * 2 / EMBER_PERIOD));
    }
    renderer.render(scene, camera);
  }
  function startLoop() {
    if (animId === null) { running++; animId = requestAnimationFrame(frame); }
  }
  function stopLoop() {
    if (animId !== null) { cancelAnimationFrame(animId); animId = null; running--; }
  }

  let visible = false;
  let revealed = false;
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && revealed && !document.hidden) startLoop();
    else stopLoop();
  });
  io.observe(host);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopLoop();
    else if (visible && revealed) startLoop();
  });

  renderer.compileAsync(scene, camera).catch(() => {}).then(() => {
    renderer.render(scene, camera);
    canvas.classList.add('active');
    revealed = true;
    if (visible && !document.hidden) startLoop();
  });
}

function init() {
  if (REDUCED_MOTION) return true;  // decorative: nothing renders at all
  // All three headers are React-rendered; wait until at least one exists.
  if (!document.querySelector('#block-work .pf-blockHead')) return false;

  const accent = getAccent();
  new GLTFLoader().load(
    'public/models/accents.glb?v=1',
    (gltf) => {
      for (const def of DEFS) {
        const source = gltf.scene.getObjectByName(def.mesh);
        if (source) initAccent(def, source, accent);
      }
    },
    undefined,
    () => {}  // glb failed — silently no accents
  );
  return true;
}

(function waitForHeaders(triesLeft = 300) {
  if (init() || triesLeft <= 0) return;
  requestAnimationFrame(() => waitForHeaders(triesLeft - 1));
})();
```

- [ ] **Step 2: Bump the chain**

No bump needed: Task 2's loader already points at `section-accents-scene.js?v=1` and this is that file's first version. (If you iterate on this file after it has been served once, bump the `?v=` inside `section-accents.js` AND the loader's own `?v=` in `index.html`.)

- [ ] **Step 3: Browser sanity check**

With the dev server running, load `http://localhost:5173/` in a desktop-sized Playwright page (≥1280px wide). Verify via `browser_evaluate`:

```js
() => ({
  hosts: document.querySelectorAll('.pf-section-accent').length,
  active: document.querySelectorAll('.pf-section-accent canvas.active').length >= 0,
  running: window.__sectionAccentsRunning ? window.__sectionAccentsRunning() : 'missing',
})
```

Expected: `hosts: 3`; after scrolling a section header into view, `running` ≥ 1. Console must show no new errors (the SoundCloud 403 is pre-existing).

- [ ] **Step 4: Commit**

```bash
cd "/Volumes/X10 Pro/dev/portfolio"
git add section-accents-scene.js
git commit -m "feat(accents): three.js scene module for section accents"
```

---

### Task 4: Verification sweep + placement tuning

**Files:**
- Modify (only if placement fixes are needed): `style.css`, `index.html` (style cache-bust bump)

**Interfaces:**
- Consumes: everything from Tasks 1–3.

- [ ] **Step 1: Desktop pass (1280×900 and 1920×1080)**

Playwright: load the page, scroll each of `#block-work`, `#block-projects`, `#block-music` into view. For each: the accent canvas is `.active`, the silhouette matches its concept (strata / lattice+gem / broken ring), drift and ember breathing are visible across two screenshots ~3s apart. Note: the Playwright screenshot tool sometimes times out — fall back to CDP `Page.captureScreenshot` via `browser_evaluate` if needed.

- [ ] **Step 2: Park/wake check**

With all accents scrolled out of view (page top), `window.__sectionAccentsRunning()` returns `0`. Scroll one header into view → returns `1`.

- [ ] **Step 3: Overlap check at 901px, 1280px, 1920px**

At each width, no accent canvas overlaps its header's text or the Music visualizer toggle (compare bounding rects via `browser_evaluate`: accent host rect must not intersect the `.pf-blockHead__title`, `.pf-blockHead__sub`, or `#visualizer-toggle` rects). If an overlap exists, adjust `.pf-section-accent` offsets (`top`/`right`, or a `@media` rule that hides/shrinks at narrow widths) in `style.css`, bump `style.css?v=` in `index.html`, and re-check.

- [ ] **Step 4: Mobile pass (800px viewport)**

Reload at 800px width. `browser_evaluate` on `performance.getEntriesByType('resource')`: zero requests for `section-accents-scene.js` or `accents.glb`.

- [ ] **Step 5: Reduced-motion pass**

Emulate `prefers-reduced-motion: reduce` (Playwright emulation or CDP `Emulation.setEmulatedMedia`), reload at desktop width: `document.querySelectorAll('.pf-section-accent').length === 0` and no `accents.glb` resource entry.

- [ ] **Step 6: Commit any tuning**

```bash
cd "/Volumes/X10 Pro/dev/portfolio"
git add style.css index.html
git commit -m "fix(accents): placement tuning from verification sweep"
```

(Skip the commit if no changes were needed.)
