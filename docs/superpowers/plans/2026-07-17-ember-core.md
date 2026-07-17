# Ember Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a jagged opaque "ember" gem inside the existing glass hull crystal — counter-rotating, with accent-emissive facets breathing on a 7s sine — per `docs/superpowers/specs/2026-07-17-ember-core-design.md`.

**Architecture:** A second Blender-modeled mesh (`Core`, two material slots as face markers) is exported alongside the hull into a single `public/models/crystal.glb`. `hero-crystal-scene.js` loads meshes by name, adds the core to the `lay` group as a sibling of the hull, styles its two primitives (matte coal / emissive ember), counter-rolls it in `frame()`, and drives the ember `emissiveIntensity` with a sine. All existing behavior (flick physics, journey, mobile gating, reduced motion) is untouched.

**Tech Stack:** Blender 5.2 via official Blender MCP (`mcp__blender__execute_blender_code`), three.js 0.170.0 (CDN import map), Playwright MCP for verification. No build step; static GitHub Pages.

## Global Constraints

- Branch: `feat/hero-crystal` (already checked out). Never merge/push to `main` — it deploys production.
- No Vite, no bundler. Site is static; JSX via in-browser Babel (irrelevant here, but do not touch the React pipeline).
- Blender is Z-up; glTF export is +Y up (`export_yup=True`). The hull's long axis is Blender Z → three.js Y.
- Accent color: `#b94a2b` (read at runtime from `--accent`; do not hardcode in JS).
- glb target < 10KB; poster target ~120KB.
- No hover/pointer coupling on the ember glow (spec: "No hover coupling").
- Cache busting: any change to `hero-crystal-scene.js` requires bumping its `?v=` in `hero-crystal.js`; any change to `hero-crystal.js` requires bumping its `?v=` in `index.html`.
- Dev server: `./scripts/dev-start.sh` → http://localhost:5173/ (check it's running before Playwright steps: `curl -s -o /dev/null -w '%{http_code}' http://localhost:5173/`).
- Existing Blender scene objects: `Crystal` (the hull, vertical orientation), `PosterCam`, Rim/Key lights, hidden default `Cube`. Do not modify `Crystal` geometry.

---

### Task 1: Blender — model the ember core

**Files:** none (Blender scene state only; export happens in Task 2)

**Interfaces:**
- Consumes: existing Blender object `Crystal`.
- Produces: Blender object `Core` — convex-hull gem, max dimension ≈ 0.42 × Crystal's, centered on Crystal's origin, two material slots named exactly `CoreDark` (slot 0) and `CoreEmber` (slot 1), 4–7 faces assigned to slot 1. Task 2 exports it; Task 3 finds it by these exact names.

- [ ] **Step 1: Build the core mesh** via `mcp__blender__execute_blender_code`:

```python
import bpy, bmesh, random
from mathutils import Vector

# Fresh start if re-running
old = bpy.data.objects.get("Core")
if old:
    bpy.data.objects.remove(old, do_unlink=True)

random.seed(47)  # different character than the hull's seed 11
mesh = bpy.data.meshes.new("Core")
obj = bpy.data.objects.new("Core", mesh)
bpy.context.collection.objects.link(obj)

bm = bmesh.new()
pts = []
for i in range(34):                      # more points than the hull -> busier facets
    v = Vector((random.uniform(-1, 1), random.uniform(-1, 1), random.uniform(-1, 1)))
    if v.length < 1e-6:
        continue
    v.normalize()
    v *= 0.5 + 0.5 * random.random()     # wide radius spread -> jagged silhouette
    v.z *= 1.9                           # elongate along Z (Blender Z-up = hull's long axis)
    pts.append(bm.verts.new(v))
hull = bmesh.ops.convex_hull(bm, input=pts)
interior = [v for v in hull["geom_interior"] if isinstance(v, bmesh.types.BMVert)]
bmesh.ops.delete(bm, geom=interior, context='VERTS')
bm.to_mesh(mesh)
bm.free()

# Size: 42% of the hull's max dimension, centered on the hull's origin
crystal = bpy.data.objects["Crystal"]
bpy.context.view_layer.update()
s = (max(crystal.dimensions) * 0.42) / max(obj.dimensions)
obj.scale = (s, s, s)
obj.location = crystal.location
bpy.context.view_layer.objects.active = obj
obj.select_set(True)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
print("Core dims:", tuple(obj.dimensions), "Crystal dims:", tuple(crystal.dimensions))
print("faces:", len(mesh.polygons))
```

Expected: `Core dims` max ≈ 0.42 × `Crystal dims` max; faces roughly 30–60.

- [ ] **Step 2: Create material-slot markers and assign ember faces:**

```python
import bpy
obj = bpy.data.objects["Core"]
mesh = obj.data

for name in ("CoreDark", "CoreEmber"):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    if name not in [m.name for m in mesh.materials]:
        mesh.materials.append(mat)

# Real shader values so the Cycles poster (Task 5) shows the ember properly
dark = bpy.data.materials["CoreDark"]
bsdf = dark.node_tree.nodes["Principled BSDF"]
bsdf.inputs["Base Color"].default_value = (0.008, 0.004, 0.005, 1)
bsdf.inputs["Roughness"].default_value = 0.5
ember = bpy.data.materials["CoreEmber"]
bsdf = ember.node_tree.nodes["Principled BSDF"]
bsdf.inputs["Base Color"].default_value = (0.05, 0.01, 0.005, 1)
bsdf.inputs["Emission Color"].default_value = (0.484, 0.0685, 0.0241, 1)  # accent, linear
bsdf.inputs["Emission Strength"].default_value = 2.0

# Pick 6 ember faces spread around the gem: sort by area, take every 5th of the top 30
faces = sorted(mesh.polygons, key=lambda p: -p.area)[:30]
for i, p in enumerate(faces):
    p.material_index = 1 if i % 5 == 0 else p.material_index
print("ember faces:", sum(1 for p in mesh.polygons if p.material_index == 1))
```

Expected: `ember faces: 6` (5–7 acceptable; if 0 or >7, adjust the modulo).

- [ ] **Step 3: Visual check** — render the viewport with both objects visible via `mcp__blender__render_viewport_to_path` (or `bpy.ops.render.opengl` to the scratchpad) and confirm: core sits inside the hull silhouette, reads jagged, ember faces distributed (not clustered on one side). Iterate seed/face picks with the user if it looks off.

---

### Task 2: Export combined glb v2

**Files:**
- Modify: `public/models/crystal.glb` (overwrite)

**Interfaces:**
- Consumes: Blender objects `Crystal`, `Core` (Task 1).
- Produces: `public/models/crystal.glb` containing mesh `Crystal` (as before) plus object `Core` whose primitives carry materials named `CoreDark` / `CoreEmber`. Task 3's loader depends on those three names exactly.

- [ ] **Step 1: Export both objects:**

```python
import bpy
for o in bpy.data.objects:
    o.select_set(o.name in ("Crystal", "Core"))
bpy.context.view_layer.objects.active = bpy.data.objects["Crystal"]
bpy.ops.export_scene.gltf(
    filepath="/Volumes/X10 Pro/dev/portfolio/public/models/crystal.glb",
    export_format='GLB',
    use_selection=True,
    export_yup=True,
    export_materials='EXPORT',   # names must survive; three.js replaces the materials anyway
    export_apply=True,
)
```

- [ ] **Step 2: Verify names and size on disk:**

```bash
ls -la "/Volumes/X10 Pro/dev/portfolio/public/models/crystal.glb"
strings "/Volumes/X10 Pro/dev/portfolio/public/models/crystal.glb" | grep -o '"name":"[^"]*"' | sort -u
```

Expected: file < 10KB; names include `Crystal`, `Core`, `CoreDark`, `CoreEmber`.

- [ ] **Step 3: Commit:**

```bash
git add public/models/crystal.glb
git commit -m "feat(hero): export ember core into crystal.glb"
```

---

### Task 3: Load the core in three.js (static, visible through the glass)

**Files:**
- Modify: `hero-crystal-scene.js` (GLTFLoader callback, ~line 191)
- Modify: `hero-crystal.js` (bump scene `?v=1` → `?v=2`)
- Modify: `index.html` (bump `hero-crystal.js?v=12` → `?v=13`)

**Interfaces:**
- Consumes: `crystal.glb` with `Crystal` / `Core` / `CoreDark` / `CoreEmber` names (Task 2); existing `lay` group, `accent`, `createCrystalMaterial`.
- Produces: init-scope `let core = null; let emberMat = null;` — Task 4's `frame()` additions read both. Core is a child of `lay`, sibling of `crystal`.

- [ ] **Step 1: Add state declarations** just above the `new GLTFLoader().load(` call (`hero-crystal-scene.js:191`):

```js
  // Ember core: opaque gem living inside the hull, loaded from the same glb.
  let core = null;      // THREE.Object3D (Group or Mesh named "Core")
  let emberMat = null;  // material of the emissive facets, driven in frame()
```

- [ ] **Step 2: Replace the loader success callback** (the whole `(gltf) => { ... }` block) with:

```js
    (gltf) => {
      const hull = gltf.scene.getObjectByName('Crystal');
      if (!hull || !hull.isMesh) return;         // keep placeholder
      hull.material = createCrystalMaterial(accent);
      // Match the placeholder's footprint so layout/motion tuning holds.
      const size = new THREE.Box3().setFromObject(hull).getSize(new THREE.Vector3());
      const norm = 3.2 / Math.max(size.x, size.y, size.z);
      hull.scale.multiplyScalar(norm);
      // Chunkier read: shorten the long axis so the horizontal pose keeps
      // visible depth instead of flattening into a sliver.
      hull.scale.y *= 0.72;
      hull.rotation.copy(crystal.rotation);      // continue the spin seamlessly
      lay.remove(crystal);
      crystal.geometry.dispose();
      edges.geometry.dispose();
      lay.add(hull);
      crystal = hull;
      edges = makeEdges(hull);

      // Ember core: sibling of the hull inside lay, so it shares the journey
      // but owns its local roll. Refraction through the hull does the rest.
      const loadedCore = gltf.scene.getObjectByName('Core');
      if (loadedCore) {
        loadedCore.scale.multiplyScalar(norm);   // same pass -> 42% ratio holds
        loadedCore.position.set(0, 0, 0);
        loadedCore.traverse((o) => {
          if (!o.isMesh) return;
          const isEmber = o.material && o.material.name === 'CoreEmber';
          o.material = new THREE.MeshStandardMaterial({
            color: 0x080405,
            roughness: 0.5,
            metalness: 0,
            flatShading: true,
            ...(isEmber ? { emissive: accent, emissiveIntensity: 0.475 } : {}),
          });
          if (isEmber) emberMat = o.material;
        });
        lay.add(loadedCore);
        core = loadedCore;
      }
    },
```

- [ ] **Step 3: Bump cache-bust versions.** In `hero-crystal.js`: `import('./hero-crystal-scene.js?v=2')`. In `index.html`: `hero-crystal.js?v=13`.

- [ ] **Step 4: Verify in the browser** (dev server running). Navigate Playwright to `http://localhost:5173/`, wait 2s, then screenshot. Also run:

```js
// mcp__playwright__browser_evaluate
() => ({
  running: window.__heroCrystalRunning && window.__heroCrystalRunning(),
  errors: undefined, // check browser_console_messages separately
})
```

Expected: loop running; screenshot shows a darker jagged mass with warm facets visible *inside* the glass hull; only pre-existing SoundCloud console errors. If the core is invisible, check `getObjectByName('Core')` returned a Group (multi-primitive meshes import as a Group with mesh children — the `traverse` handles both shapes).

- [ ] **Step 5: Commit:**

```bash
git add hero-crystal-scene.js hero-crystal.js index.html
git commit -m "feat(hero): load ember core inside the glass hull"
```

---

### Task 4: Counter-roll + breathing glow

**Files:**
- Modify: `hero-crystal-scene.js` (constants block ~line 254, `frame()` ~line 301)
- Modify: `hero-crystal.js` (bump `?v=2` → `?v=3`), `index.html` (`?v=13` → `?v=14`)

**Interfaces:**
- Consumes: `core`, `emberMat` (Task 3); `IDLE_ROLL`, `rollVel`, `dt`, `tm` in `frame()`.
- Produces: final motion behavior; nothing downstream depends on new names.

- [ ] **Step 1: Add constants** to the motion-state block (after `GLOW_IDLE`):

```js
  const CORE_ROLL_RATIO = -0.6;    // core rolls against the hull
  const CORE_FLICK_RATIO = 0.5;    // damped share of flick inertia the core feels
  const EMBER_PERIOD = 7;          // s, breathing sine
  const EMBER_MID = 0.475;         // emissiveIntensity range ~0.25..0.7
  const EMBER_AMP = 0.225;
```

- [ ] **Step 2: Drive the core in `frame()`.** Insert directly after the `yawVel *= Math.pow(0.5, dt);` line:

```js
    // Ember core counter-rolls: flick the hull right, the ember drifts left
    // inside the glass. Its facets breathe on a slow, interaction-free sine.
    if (core) {
      core.rotation.y += CORE_ROLL_RATIO * (IDLE_ROLL + rollVel * CORE_FLICK_RATIO) * dt;
      if (emberMat) {
        emberMat.emissiveIntensity = EMBER_MID + EMBER_AMP * Math.sin(t / 1000 * (Math.PI * 2 / EMBER_PERIOD));
      }
    }
```

- [ ] **Step 3: Bump cache-bust versions** (`?v=3` in `hero-crystal.js`, `?v=14` in `index.html`).

- [ ] **Step 4: Verify motion + breathing** with Playwright timed screenshots:
  - Screenshot at t=0 and t=3.5s (half the breathing period) — ember facet brightness must visibly differ.
  - Confirm counter-rotation: `mcp__playwright__browser_run_code_unsafe` sampling twice, 1s apart — hull `crystal.rotation.y` increases while core decreases. If those objects aren't reachable from the page, verify visually across the timed screenshots (core silhouette shifts opposite the hull).
  - Flick check: dispatch fast pointermove sweeps across the crystal's screen position, screenshot — no console errors, motion still settles.

- [ ] **Step 5: Commit:**

```bash
git add hero-crystal-scene.js hero-crystal.js index.html
git commit -m "feat(hero): ember core counter-roll and breathing glow"
```

---

### Task 5: Poster re-render + full verification

**Files:**
- Modify: `public/models/crystal-poster.png` (overwrite)

**Interfaces:**
- Consumes: Blender scene with `Crystal` (has `CrystalGlass` material), `Core` (Task 1 materials), `PosterCam`, existing lights.
- Produces: final poster used by the reduced-motion path; no code changes.

- [ ] **Step 1: Pose and render in Blender.** The poster pose rotates the crystal to horizontal; the core must ride along, so parent it temporarily:

```python
import bpy
from math import radians
crystal = bpy.data.objects["Crystal"]
core = bpy.data.objects["Core"]
saved = (tuple(crystal.rotation_euler), tuple(core.rotation_euler), core.parent)
core.parent = crystal
core.matrix_parent_inverse = crystal.matrix_world.inverted()
crystal.rotation_euler = (0.28, radians(97), 0)
scene = bpy.context.scene
scene.camera = bpy.data.objects["PosterCam"]
scene.render.engine = 'CYCLES'
scene.render.film_transparent = True
scene.render.resolution_x = 960
scene.render.resolution_y = 560
scene.render.filepath = "/private/tmp/claude-501/-Volumes-X10-Pro-dev-portfolio/5135bb53-5337-4a5a-8450-c6f0a616915d/scratchpad/poster-v2.png"
bpy.ops.render.render(write_still=True)
# Restore scene state
crystal.rotation_euler = saved[0]
core.parent = saved[2]
core.rotation_euler = saved[1]
core.location = crystal.location
print("rendered")
```

- [ ] **Step 2: Inspect the render** (Read the PNG). The core should read as a dark ember mass with warm glints inside the glass. If washed out or invisible, adjust `CoreEmber` Emission Strength (try 1.0–3.0) and re-render.

- [ ] **Step 3: Resize and install:**

```bash
sips -Z 800 "/private/tmp/claude-501/-Volumes-X10-Pro-dev-portfolio/5135bb53-5337-4a5a-8450-c6f0a616915d/scratchpad/poster-v2.png" --out "/Volumes/X10 Pro/dev/portfolio/public/models/crystal-poster.png"
ls -la "/Volumes/X10 Pro/dev/portfolio/public/models/crystal-poster.png"
```

Expected: ~120KB (a bit more is fine; >250KB means re-render at lower quality).

- [ ] **Step 4: Full verification sweep** (Playwright):
  - Desktop 2000px: crystal + core render, loop running, journey fade still works (scroll to work section → canvas opacity 0, loop stops).
  - Mobile 800px: `browser_network_requests` shows no three.js, no scene module, no glb, no poster fetch.
  - Reduced motion (if quick to emulate via CDP): poster displays. Otherwise verify the poster file loads at its URL directly.
  - Console: only pre-existing SoundCloud errors.

- [ ] **Step 5: Commit:**

```bash
git add public/models/crystal-poster.png
git commit -m "feat(hero): re-render poster with ember core"
```

---

## Self-review notes

- Spec coverage: Blender modeling (T1), marker slots + export (T1/T2), name-based loading + sibling placement + materials (T3), counter-roll + breathing (T4), poster + fallbacks + verification (T5). Missing-`Core` graceful degradation is inherent in T3 (`if (loadedCore)`).
- Multi-primitive import shape (Group vs Mesh) handled via `traverse` in T3 and noted in its verification step.
- Cache-bust chain bumped in both code tasks.
