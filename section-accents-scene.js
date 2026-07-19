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
// phases so the three never move in sync. restZ lets a piece balance
// off-axis (the Projects cube stands on a corner).
const DEFS = [
  { mesh: 'AccentWork',     header: '#block-work .pf-blockHead',     oscPeriod: 15, oscAmp: 0.5,  floatPeriod: 10, phase: 0,   restX: 0.5,  restY: 0.15, restZ: 0 },
  { mesh: 'AccentProjects', header: '#block-projects .pf-blockHead', oscPeriod: 18, oscAmp: 0.6,  floatPeriod: 12, phase: 2.1, restX: 0.62, restY: 0.5,  restZ: 0.62, fit: 1.85, flourish: 'fireflies' },
  { mesh: 'AccentMusic',    header: '#block-music .pf-blockHead',    oscPeriod: 13, oscAmp: 0.55, floatPeriod: 9,  phase: 4.2, restX: 1.05, restY: 0.1,  restZ: 0, flourish: 'ripples' },
];

const EMBER_PERIOD = 7;   // s — same breathing as the hero core
const EMBER_MID = 0.75;
const EMBER_AMP = 0.3;
const FLOAT_AMP = 0.09;   // world units of vertical float

// Soft round sprite so points read as glowing motes, not squares.
function makeDustSprite() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.5)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

// Section-specific flourishes. Each returns an update(tm) called per frame.
const FLOURISHES = {
  // Projects: ember fireflies drifting inside the lattice — experiments
  // caught mid-flight in their jar.
  fireflies(obj, accent) {
    const COUNT = 14;
    const posArr = new Float32Array(COUNT * 3);
    const seed = [];
    for (let i = 0; i < COUNT; i++) {
      seed.push([
        0.18 + Math.random() * 0.34,          // orbit radius (inside the frame)
        Math.random() * Math.PI * 2,          // start angle
        0.25 + Math.random() * 0.35,          // angular speed
        (Math.random() - 0.5) * 0.8,          // vertical band
        Math.random() * Math.PI * 2,          // bob phase
      ]);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      color: accent,
      size: 0.13,
      map: makeDustSprite(),
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    obj.add(pts);
    return (tm) => {
      for (let i = 0; i < COUNT; i++) {
        const [r, a0, w, yBand, ph] = seed[i];
        const a = a0 + tm * w;
        posArr[i * 3] = Math.cos(a) * r;
        posArr[i * 3 + 1] = yBand + Math.sin(tm * 0.5 + ph) * 0.14;
        posArr[i * 3 + 2] = Math.sin(a) * r;
      }
      geo.attributes.position.needsUpdate = true;
    };
  },
  // Music: concentric ripple rings breathing outward from the broken
  // ring — sound leaving the fracture.
  ripples(obj, accent) {
    const rings = [];
    for (let k = 0; k < 3; k++) {
      const radius = 1.08 + k * 0.12;  // stays inside the small canvas even at max swell
      const segs = 64;
      const arr = new Float32Array((segs + 1) * 3);
      for (let s = 0; s <= segs; s++) {
        const a = (s / segs) * Math.PI * 2;
        arr[s * 3] = Math.cos(a) * radius;
        arr[s * 3 + 1] = 0;
        arr[s * 3 + 2] = Math.sin(a) * radius;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      const mat = new THREE.LineBasicMaterial({
        color: accent,
        transparent: true,
        opacity: 0.1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const line = new THREE.LineLoop(g, mat);
      obj.add(line);
      rings.push({ line, mat, k });
    }
    return (tm) => {
      for (const { line, mat, k } of rings) {
        // Each ring swells and fades slightly out of phase with the next,
        // so the set reads as a slow outward pulse.
        const ph = tm * (Math.PI * 2 / 6) - k * 1.1;
        line.scale.setScalar(1 + 0.05 * Math.sin(ph));
        mat.opacity = 0.05 + 0.07 * (0.5 + 0.5 * Math.sin(ph));
      }
    };
  },
};

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
  // Normalize to a consistent on-screen size (fit shrinks pieces whose
  // pose swings their diagonal toward the canvas edge).
  const size = new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3());
  obj.scale.multiplyScalar((def.fit || 2.4) / Math.max(size.x, size.y, size.z));

  const pivot = new THREE.Group();
  pivot.rotation.x = def.restX;   // rest pose: tipped toward the viewer
  pivot.rotation.y = def.restY;
  pivot.rotation.z = def.restZ;
  pivot.add(obj);
  scene.add(pivot);

  const updateFlourish = def.flourish ? FLOURISHES[def.flourish](obj, accent) : null;

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
    if (updateFlourish) updateFlourish(tm);
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
