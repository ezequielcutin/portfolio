# Footer Screen Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add TouchDesigner-style GPU frame feedback to the footer WebGL panel so pointer movement paints persistent, flowing trails.

**Architecture:** Render each frame into one of two alternating texture-backed framebuffers while sampling the other. Then copy the newly written texture over the stable theme gradient to the visible canvas. JavaScript owns resource allocation, pass order, frame-delta normalization, lifecycle pausing, resize clearing, and context restoration.

**Tech Stack:** WebGL 1, GLSL ES 1.00, browser `requestAnimationFrame`, generated `shaders.js`, static JavaScript.

## Global Constraints

- Do not add a runtime dependency or fetch shader files at runtime.
- Do not edit generated `shaders.js` directly; regenerate it with `npm run build`.
- Never sample a texture attached to the currently bound write framebuffer.
- Use `LINEAR` filtering and `CLAMP_TO_EDGE` wrapping for non-power-of-two textures.
- Clamp frame delta to `1 / 15` second.
- Target an initial feedback half-life of approximately 1.5 seconds.
- Target inward UV-scale movement of approximately 0.06 units per second.
- Keep continuous rendering paused while the panel is outside the observer range.
- Under `prefers-reduced-motion`, use event-driven static rendering without persistent feedback animation.

---

### Task 1: Feedback and display shaders

**Files:**
- Modify: `shaders/screen.frag`
- Create: `shaders/display.vert`
- Create: `shaders/display.frag`
- Generated: `shaders.js`
- Generated hash update: `index.html`

**Interfaces:**
- Consumes: `v_uv`, `u_previous`, `u_mouse`, `u_delta`, and `u_resolution`.
- Produces: a feedback shader pair named `screen.vert`/`screen.frag` and a display shader pair named `display.vert`/`display.frag`, all exposed through `window.PF_SHADERS`.

- [ ] **Step 1: Record the pre-change shader build**

Run: `npm run build`

Expected: the current two shaders build; this establishes the baseline because the repository has no standalone shader unit-test command.

- [ ] **Step 2: Replace the screen fragment shader with the feedback equation**

Implement these exact responsibilities in `shaders/screen.frag`:

```glsl
uniform sampler2D u_previous;
uniform vec2 u_mouse;
uniform float u_delta;
uniform vec2 u_resolution;

vec2 aspectSpace(vec2 uv) {
    vec2 point = uv;
    point.x *= u_resolution.x / max(u_resolution.y, 1.0);
    return point;
}

void main() {
    float frameScale = u_delta * 60.0;
    float retention = pow(0.5, u_delta / 1.5);
    float inwardScale = pow(1.0 - (0.06 / 60.0), frameScale);
    vec2 previousUv = (v_uv - 0.5) / inwardScale + 0.5;
    vec3 history = texture2D(u_previous, previousUv).rgb * retention;

    float distanceToMouse = distance(aspectSpace(v_uv), aspectSpace(u_mouse));
    float core = smoothstep(0.08, 0.0, distanceToMouse);
    float halo = smoothstep(0.16, 0.03, distanceToMouse);
    vec3 brush = vec3(0.08, 0.28, 1.0) * core
        + vec3(0.878, 0.502, 0.333) * halo * 0.28;

    gl_FragColor = vec4(min(history + brush * min(frameScale, 1.0), 1.0), 1.0);
}
```

The implementation may adjust the UV transform direction if browser verification shows outward rather than inward flow, but it must remain centered and delta-normalized.

- [ ] **Step 3: Add an explicit display shader pair**

`shaders/display.vert` must expose the same `v_uv` contract as `screen.vert`. `shaders/display.frag` must sample `u_feedback`, construct the existing `#100f0d` to `#e08055` vertical gradient, and combine it with feedback:

```glsl
precision mediump float;

varying vec2 v_uv;
uniform sampler2D u_feedback;

const vec3 colorA = vec3(0.063, 0.059, 0.051);
const vec3 colorB = vec3(0.878, 0.502, 0.333);

void main() {
    vec3 base = mix(colorA, colorB, v_uv.y);
    vec3 feedback = texture2D(u_feedback, v_uv).rgb;
    gl_FragColor = vec4(min(base + feedback, 1.0), 1.0);
}
```

- [ ] **Step 4: Build and validate both shader programs**

Run: `npm run build`

Expected: output reports four shaders and two validated programs when optional headless WebGL is available; otherwise it reports validation skipped without failing. `shaders.js` contains all four shader names and `index.html` receives the new `shaders.js?v=<hash>`.

---

### Task 2: Ping-pong renderer and lifecycle

**Files:**
- Modify: `footer-screen.js`

**Interfaces:**
- Consumes: `window.PF_SHADERS['screen.vert']`, `screen.frag`, `display.vert`, and `display.frag`.
- Produces: two-pass `render(timestamp)` behavior, feedback target allocation, safe target swapping, and reduced-motion static rendering.

- [ ] **Step 1: Add renderer state and explicit shader programs**

Replace the single-program state with `feedbackProgram`, `displayProgram`, a shared quad buffer, both programs' uniform locations, `targets`, `readIndex`, `lastTimestamp`, and:

```js
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const ANIMATE = !reducedMotion;
```

Fail quietly through the existing `is-unsupported` path when any required shader source or program is unavailable.

- [ ] **Step 2: Add feedback-target allocation and cleanup**

Create focused helpers with these contracts:

```js
function destroyTargets() {}
function createTarget(width, height) {
    return { texture, framebuffer };
}
function allocateTargets(width, height) {
    destroyTargets();
    targets = [createTarget(width, height), createTarget(width, height)];
    readIndex = 0;
}
```

Each texture uses RGBA/UNSIGNED_BYTE, `LINEAR`, and `CLAMP_TO_EDGE`. Check every framebuffer with `gl.checkFramebufferStatus(gl.FRAMEBUFFER)` and treat incompleteness as boot/resize failure. Clear both targets to transparent black after allocation, then restore the default framebuffer.

- [ ] **Step 3: Make resize reallocate feedback**

Keep the DPR cap and drawing-buffer sizing. When dimensions change, update the viewport and call `allocateTargets(w, h)`. Return a success/change result that callers can use without rendering against stale resources.

- [ ] **Step 4: Implement the two rendering passes**

`render(timestamp)` must:

1. Compute `delta = min((timestamp - lastTimestamp) / 1000, 1 / 15)` with a `1 / 60` initial fallback.
2. Bind the write target and set the drawing-buffer viewport.
3. Use `feedbackProgram`, bind the read texture to unit 0, set `u_previous`, `u_mouse`, `u_delta`, and `u_resolution`, then draw the quad.
4. Bind the default framebuffer.
5. Use `displayProgram`, bind the write texture to unit 0, set `u_feedback`, then draw the quad.
6. Assign `readIndex` to the completed write target.

The display pass must sample the completed write texture, not the old read texture.

- [ ] **Step 5: Preserve event-driven reduced motion**

For reduced motion, pointer movement, boot, and resize call a static render path that clears both feedback targets before drawing. Do not schedule `requestAnimationFrame`. For normal motion, the observer-controlled loop renders continuously only while in view.

- [ ] **Step 6: Restore context and observer safety**

On context loss, stop the loop and null all GL resource references. On restoration, rebuild both programs, the shared quad, uniform locations, and both targets. Reset `lastTimestamp` whenever the loop starts after a pause so off-screen time does not affect decay. Ensure repeated observer events never create duplicate RAF loops.

- [ ] **Step 7: Run static verification**

Run: `npm run build`

Expected: exit code 0 with both shader programs validated when available.

Run: `git diff --check`

Expected: exit code 0 with no whitespace errors.

---

### Task 3: Browser verification and tuning

**Files:**
- Modify only if evidence requires it: `footer-screen.js`, `shaders/screen.frag`, `shaders/display.frag`
- Regenerate after shader edits: `shaders.js`, `index.html`

**Interfaces:**
- Consumes: the completed footer feedback implementation.
- Produces: verified visual behavior and clean runtime diagnostics.

- [ ] **Step 1: Start the existing development server**

Run: `npm run dev`

Expected: the static site is available at `http://localhost:5173/`.

- [ ] **Step 2: Verify the visible flow**

In a browser, scroll to the footer panel and move the pointer across it.

Expected:
- the original theme gradient remains stable;
- the pointer paints a blue core with an orange halo;
- trails persist, drift gently inward, and fade;
- no black frame or feedback texture alternation is visible.

- [ ] **Step 3: Verify lifecycle behavior**

Scroll the panel out of view and back, resize the viewport, and inspect the console.

Expected:
- rendering pauses off-screen and resumes once;
- resize clears history without stretching;
- no shader, link, framebuffer, or WebGL feedback-loop errors occur.

- [ ] **Step 4: Verify reduced motion**

Emulate `prefers-reduced-motion: reduce`, reload, and move the pointer.

Expected: the panel renders a static gradient and event-driven pointer response with no continuously changing trail.

- [ ] **Step 5: Rebuild after any tuning and inspect final changes**

Run: `npm run build && git diff --check`

Expected: both commands exit 0. Review `git diff -- footer-screen.js shaders shaders.js index.html` and confirm generated files match their sources.
