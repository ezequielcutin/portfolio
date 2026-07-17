// Hero crystal — three.js glass shard layered above the particle canvas.
// Ships a procedural placeholder mesh until public/models/crystal.glb exists.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Night-session studio environment: near-black room, one hot terracotta
// softbox, one cool slate strip. Facets reflect colored streaks with real
// darkness between glints instead of an even white room.
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
  panel(accent, 5, 6, 2.2, [-4, 1.5, 3], [0, 0, 0]);          // warm lamp softbox
  panel(0x8a97b8, 1.6, 5, 1.2, [4.5, -1, -2], [0, 0, 0]);     // cool slate strip
  panel(0xffffff, 7, 1.1, 0.35, [0.5, 4.5, 1.5], [0, 0, 0]);  // narrow white glint bar
  return env;
}

const SMALL_VIEWPORT = window.innerWidth < 901;
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function getAccent() {
  const hex = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#4488ff';
  return new THREE.Color(hex);
}

// Poster fallback — image lands in Task 5; until then onerror removes it quietly.
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
function createCrystalMesh(accent) {
  let geo = new THREE.IcosahedronGeometry(1, 1);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const stretch = 1 + 0.55 * Math.abs(v.y);
    const jitter = 0.82 + 0.36 * Math.sin(v.x * 7.3 + v.y * 5.1 + v.z * 3.7);
    v.multiplyScalar(jitter).setY(v.y * stretch * 1.6);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo = geo.toNonIndexed();
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, createCrystalMaterial(accent));
}

function createCrystalMaterial(accent) {
  return new THREE.MeshPhysicalMaterial({
    color: 0x0a0608,
    metalness: 0,
    roughness: 0.08,
    transmission: 0.75,
    thickness: 1.6,
    ior: 1.6,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    iridescence: 0.55,
    iridescenceIOR: 1.6,
    envMapIntensity: 1.6,
    emissive: accent,
    emissiveIntensity: 0.08,
    flatShading: true,
  });
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

  const accent = getAccent();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(makeStudioEnv(accent), 0.05).texture;
  // Studio lighting: warm terracotta "desk lamp" low-left, cool faint fill
  // from the right, so facets alternate warm/cool as the crystal turns.
  const lamp = new THREE.PointLight(accent, 24);
  lamp.position.set(-3.5, -1.2, 2.5);
  scene.add(lamp);
  const fill = new THREE.PointLight(0x5a6a8a, 8);
  fill.position.set(4, 2, -1.5);
  scene.add(fill);
  const key = new THREE.DirectionalLight(0xfff2e0, 0.5);
  key.position.set(2, 3, 4);
  scene.add(key);
  // Accent backlight rims the silhouette against the dark ground.
  const back = new THREE.PointLight(accent, 18);
  back.position.set(0.5, 0.8, -3.5);
  scene.add(back);

  // pivot: position + cursor tilt · lay: horizontal rest pose + scroll pitch
  // crystal: spins on its own long axis (rotisserie).
  // Blueprint edges: faint accent wireframe that reveals near the cursor
  // and flashes while the crystal is spinning fast.
  function makeEdges(mesh) {
    const e = new THREE.LineSegments(
      new THREE.EdgesGeometry(mesh.geometry, 10),
      new THREE.LineBasicMaterial({
        color: accent,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    mesh.add(e);
    return e;
  }

  let crystal = createCrystalMesh(accent);
  let edges = makeEdges(crystal);
  const lay = new THREE.Group();
  lay.rotation.z = Math.PI / 2 + 0.12;   // horizontal, a hair off-level
  lay.rotation.x = 0.28;                 // nose toward viewer so facets catch light
  lay.add(crystal);
  const pivot = new THREE.Group();
  pivot.add(lay);
  pivot.scale.setScalar(0.5);
  scene.add(pivot);

  // Dust motes: sparse accent-tinted points drifting around the crystal,
  // echoing the particle field on the canvas behind.
  const MOTES = 42;
  const motePos = new Float32Array(MOTES * 3);
  const moteSeed = new Float32Array(MOTES * 3);
  for (let i = 0; i < MOTES; i++) {
    moteSeed[i * 3] = Math.random() * Math.PI * 2;
    moteSeed[i * 3 + 1] = Math.random() * Math.PI * 2;
    moteSeed[i * 3 + 2] = 0.6 + Math.random() * 0.9;
  }
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  // Soft round sprite so motes read as dust, not pixels.
  const moteCanvas = document.createElement('canvas');
  moteCanvas.width = moteCanvas.height = 64;
  const mctx = moteCanvas.getContext('2d');
  const grad = mctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.5)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  mctx.fillStyle = grad;
  mctx.fillRect(0, 0, 64, 64);
  const motes = new THREE.Points(moteGeo, new THREE.PointsMaterial({
    color: accent,
    size: 0.09,
    map: new THREE.CanvasTexture(moteCanvas),
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  pivot.add(motes);

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
      lay.remove(crystal);
      crystal.geometry.dispose();
      edges.geometry.dispose();
      lay.add(loaded);
      crystal = loaded;
      edges = makeEdges(loaded);
    },
    undefined,
    () => { /* glb failed — placeholder stays, no user-visible error */ }
  );

  let baseY = 0;   // resting height; layout() sets it, the bob orbits it
  function layout() {
    const W = host.clientWidth, H = host.clientHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    const halfW = halfH * camera.aspect;
    // Anchor to the centered content column, not the viewport: park the
    // crystal just inside the column's right edge, in the open space
    // beside the tagline, and never let it clip the hero's right edge.
    const inner = host.querySelector('.pf-block__inner');
    let xPx = W * 0.78;
    if (inner) {
      const r = inner.getBoundingClientRect();
      const hostLeft = host.getBoundingClientRect().left;
      xPx = (r.right - hostLeft) - r.width * 0.1;
    }
    const xWorld = ((xPx / W) * 2 - 1) * halfW;
    pivot.position.x = Math.min(xWorld, halfW - 0.85);
    pivot.position.y = 1.0;
    baseY = pivot.position.y;
  }
  layout();
  window.addEventListener('resize', layout);

  // --- Motion state ---
  const IDLE_SPIN = 0.28;          // rad/s around the long axis
  const BOB_AMPLITUDE = 0.1;
  const BOB_SPEED = 0.6;
  const TILT_MAX = 0.3;            // rad, toward cursor
  const SPRING_STIFFNESS = 0.045;  // same feel family as header-ambience
  const SPRING_DAMPING = 0.88;
  const PARALLAX_Y = 1.3;          // world units over one hero height of scroll
  const SCROLL_PITCH = 0.7;        // rad of pitch as the hero scrolls away
  const FLICK_RADIUS = 150;        // px; cursor sweep inside this flicks the crystal
  const GLOW_IDLE = 0.08, GLOW_NEAR = 0.3;

  let targetTiltX = 0, targetTiltZ = 0;
  let tiltX = 0, tiltZ = 0, tiltVX = 0, tiltVZ = 0;
  let spinVel = 0;                 // flick impulse, decays back to idle
  let moteSwirl = 0;               // accumulated swirl the flick drags the motes into
  let glow = GLOW_IDLE, glowTarget = GLOW_IDLE;
  let lastPX = -1e4, lastPY = -1e4, lastPT = 0;

  window.addEventListener('pointermove', (e) => {
    const r = host.getBoundingClientRect();
    const nx = (e.clientX / window.innerWidth) * 2 - 1;   // -1..1
    const ny = ((e.clientY - r.top) / Math.max(r.height, 1)) * 2 - 1;
    targetTiltZ = -nx * TILT_MAX;
    targetTiltX = ny * TILT_MAX;

    // Project the crystal to screen px; a fast sweep across it spins it.
    const proj = pivot.position.clone().project(camera);
    const cx = (proj.x + 1) / 2 * host.clientWidth;
    const cy = (1 - proj.y) / 2 * host.clientHeight + r.top;
    const dx = e.clientX - cx, dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);
    glowTarget = dist < FLICK_RADIUS * 1.6 ? GLOW_NEAR : GLOW_IDLE;
    const now = e.timeStamp;
    if (lastPT && dist < FLICK_RADIUS) {
      const dtp = Math.max(now - lastPT, 1);
      const vx = (e.clientX - lastPX) / dtp;              // px/ms
      spinVel = THREE.MathUtils.clamp(spinVel + vx * 2.4, -14, 14);
    }
    lastPX = e.clientX; lastPY = e.clientY; lastPT = now;
  });

  let animId = null;
  let lastT = 0;
  function frame(t) {
    animId = requestAnimationFrame(frame);
    const dt = Math.min((t - lastT) / 1000, 0.05) || 0.016;
    lastT = t;

    // Rotisserie spin: idle drift plus decaying flick inertia.
    crystal.rotation.y += (IDLE_SPIN + spinVel) * dt;
    spinVel *= Math.pow(0.35, dt);               // frame-rate independent decay

    // The crystal "charges" while spinning fast: iridescence shifts,
    // core glow rises, blueprint edges flash then settle.
    const spinEnergy = Math.min(Math.abs(spinVel) / 8, 1);
    crystal.material.iridescence = 0.55 + spinEnergy * 0.3;
    const nearT = (glow - GLOW_IDLE) / (GLOW_NEAR - GLOW_IDLE);
    edges.material.opacity = 0.04 + nearT * 0.16 + spinEnergy * 0.3;

    // Lamp prowls slowly so glints travel across facets even at idle.
    const tl = t / 1000;
    lamp.position.set(-3.5 + Math.sin(tl * 0.1) * 1.4, -1.2 + Math.cos(tl * 0.13) * 0.9, 2.5);

    tiltVX = (tiltVX + (targetTiltX - tiltX) * SPRING_STIFFNESS) * SPRING_DAMPING;
    tiltVZ = (tiltVZ + (targetTiltZ - tiltZ) * SPRING_STIFFNESS) * SPRING_DAMPING;
    tiltX += tiltVX; tiltZ += tiltVZ;
    pivot.rotation.x = tiltX;
    pivot.rotation.z = tiltZ;

    // Near-cursor glow breathes up; eases both directions.
    glow += (glowTarget - glow) * Math.min(dt * 4, 1);
    crystal.material.emissiveIntensity = glow + spinEnergy * 0.25;

    const rect = host.getBoundingClientRect();
    const scrollProgress = Math.min(Math.max(-rect.top / Math.max(rect.height, 1), 0), 1);
    pivot.position.y = baseY + Math.sin(t / 1000 * BOB_SPEED) * BOB_AMPLITUDE + scrollProgress * PARALLAX_Y;
    lay.rotation.x = 0.28 + scrollProgress * SCROLL_PITCH;

    // Dust motes orbit lazily; a flick drags them into a faster swirl
    // and pushes them outward until the spin settles.
    moteSwirl += spinVel * dt * 0.3;
    const tm = t / 1000;
    const fling = 1 + spinEnergy * 0.5;
    for (let i = 0; i < MOTES; i++) {
      const dir = i % 2 ? 1 : -1;
      const a = moteSeed[i * 3] + tm * 0.045 * dir + moteSwirl * dir;
      const b = moteSeed[i * 3 + 1] + tm * 0.028 + moteSwirl * 0.4;
      const rad = moteSeed[i * 3 + 2] * (2.2 + glow) * fling;
      motePos[i * 3] = Math.cos(a) * rad * 1.5;
      motePos[i * 3 + 1] = Math.sin(b) * rad * 0.65;
      motePos[i * 3 + 2] = Math.sin(a) * rad * 0.5;
    }
    moteGeo.attributes.position.needsUpdate = true;

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

  window.__heroCrystalRunning = () => animId !== null;

  renderer.render(scene, camera);           // first frame before fade-in
  canvas.classList.add('active');
  startLoop();
  return true;
}

// The hero is rendered by React after mount — poll briefly until it exists.
(function waitForHero(triesLeft = 300) {
  if (initHeroCrystal() || triesLeft <= 0) return;
  requestAnimationFrame(() => waitForHero(triesLeft - 1));
})();
