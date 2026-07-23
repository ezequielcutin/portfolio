// Mobile crystal stage — centered amber glass gem + accretion disk in the
// handoff band between hero and Work. Idle drift only; no cursor lean.
// Loaded lazily by hero-crystal.js on viewports < 901px.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const DPR_CAP = 2;

function getAccent() {
  const hex = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#4488ff';
  return new THREE.Color(hex);
}

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

function createCrystalMaterial(accent) {
  return new THREE.MeshPhysicalMaterial({
    color: 0x6b3517,
    metalness: 0,
    roughness: 0.05,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    iridescence: 0.4,
    iridescenceIOR: 1.6,
    envMapIntensity: 1.15,
    emissive: accent,
    emissiveIntensity: 0.02,
    flatShading: true,
    side: THREE.DoubleSide,
  });
}

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

function makeEdges(mesh) {
  const e = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry, 10),
    new THREE.LineBasicMaterial({
      color: 0xffd9b0,
      transparent: true,
      opacity: 0.1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  mesh.add(e);
  return e;
}

function initCrystalStage() {
  const host = document.getElementById('hero-crystal-stage');
  if (!host) return false;

  const canvas = document.createElement('canvas');
  canvas.className = 'pf-crystal-stage__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(canvas);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch {
    return true;
  }

  const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
  camera.position.set(0, 0.36, 5.7);
  camera.lookAt(0, -0.1, 0.18);

  const accent = getAccent();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(makeStudioEnv(accent), 0.05).texture;
  pmrem.dispose();

  const lamp = new THREE.PointLight(accent, 10);
  lamp.position.set(-3.5, -1.2, 2.5);
  scene.add(lamp);
  const fill = new THREE.PointLight(0x5a6a8a, 5);
  fill.position.set(4, 2, -1.5);
  scene.add(fill);
  const key = new THREE.DirectionalLight(0xfff2e0, 0.3);
  key.position.set(2, 3, 4);
  scene.add(key);
  const back = new THREE.PointLight(accent, 5);
  back.position.set(0.5, 0.8, -3.5);
  scene.add(back);

  let crystal = null;
  let core = null;
  let emberMat = null;

  const lay = new THREE.Group();
  lay.rotation.x = 1.05;
  lay.rotation.z = 0.02;
  lay.scale.set(1.08, 0.92, 1.08);
  lay.position.z = -0.1;
  const pivot = new THREE.Group();
  pivot.rotation.x = -0.2;
  pivot.add(lay);
  pivot.scale.set(0.58, 0.46, 0.58);
  pivot.position.y = -0.18;
  scene.add(pivot);

  const disk = new THREE.Group();
  disk.rotation.x = 1.22;
  disk.rotation.z = 0.06;
  disk.scale.set(0.92, 1, 0.92);
  disk.position.set(0, 0, 0.16);
  pivot.add(disk);

  const sprite = makeDustSprite();
  const makeOrbiters = (count, sizePx, color, opacity, rMin, rSpan) => {
    const posArr = new Float32Array(count * 3);
    const seed = [];
    for (let i = 0; i < count; i++) {
      const r = rMin + rSpan * Math.pow(Math.random(), 0.65);
      seed.push([
        r,
        Math.random() * Math.PI * 2,
        0.5 / Math.pow(r, 1.5),
        (Math.random() - 0.5) * (0.05 + r * 0.06),
        Math.random() * Math.PI * 2,
      ]);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      color,
      size: sizePx,
      map: sprite,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    disk.add(pts);
    return { geo, posArr, seed, count };
  };
  const dust = makeOrbiters(520, 0.032, accent, 0.35, 1.1, 2.4);
  const sparks = makeOrbiters(80, 0.065, 0xffd9b0, 0.55, 1.0, 2.2);

  const RINGS = 16;
  for (let i = 0; i < RINGS; i++) {
    const r = 1.15 + 2.3 * Math.pow(Math.random(), 0.7);
    const span = (0.35 + Math.random() * 0.65) * Math.PI * 2;
    const a0 = Math.random() * Math.PI * 2;
    const segs = 64;
    const arc = new Float32Array((segs + 1) * 3);
    const yOff = (Math.random() - 0.5) * (0.04 + r * 0.05);
    for (let s = 0; s <= segs; s++) {
      const a = a0 + (s / segs) * span;
      arc[s * 3] = Math.cos(a) * r;
      arc[s * 3 + 1] = yOff + Math.sin(a * 3 + i) * 0.02;
      arc[s * 3 + 2] = Math.sin(a) * r;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(arc, 3));
    disk.add(new THREE.Line(g, new THREE.LineBasicMaterial({
      color: accent,
      transparent: true,
      opacity: 0.03 + Math.random() * 0.04,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })));
  }

  new GLTFLoader().load(
    'public/models/crystal.glb?v=4',
    (gltf) => {
      const hull = gltf.scene.getObjectByName('Crystal');
      if (!hull || !hull.isMesh) { canvas.remove(); return; }
      hull.material = createCrystalMaterial(accent);
      const size = new THREE.Box3().setFromObject(hull).getSize(new THREE.Vector3());
      const norm = 3.4 / Math.max(size.x, size.y, size.z);
      hull.scale.multiplyScalar(norm);
      lay.add(hull);
      crystal = hull;
      makeEdges(hull);

      const loadedCore = gltf.scene.getObjectByName('Core');
      if (loadedCore) {
        loadedCore.scale.multiplyScalar(norm);
        loadedCore.traverse((o) => {
          if (!o.isMesh) return;
          const isEmber = o.material && o.material.name === 'CoreEmber';
          o.material = new THREE.MeshStandardMaterial({
            color: isEmber ? 0x35160a : 0x2a1208,
            roughness: 0.5,
            metalness: 0,
            flatShading: true,
            emissive: accent,
            emissiveIntensity: isEmber ? 0.32 : 0.1,
          });
          if (isEmber) emberMat = o.material;
        });
        lay.add(loadedCore);
        core = loadedCore;
      }
      reveal();
    },
    undefined,
    () => { canvas.remove(); }
  );

  let W = 0;
  let H = 0;
  function layout() {
    W = host.clientWidth;
    H = host.clientHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H || 1;
    camera.updateProjectionMatrix();
  }
  layout();
  window.addEventListener('resize', layout);

  const OSC_CENTER = 0.12;
  const OSC_AMP = 0.42;
  const OSC_PERIOD = 11.5;
  const YAW_SWAY = 0.04;
  const ELLIPSE_X = 0.18;
  const ELLIPSE_Y = 0.025;
  const ELLIPSE_SPEED = 0.14;
  const CORE_ROLL_RATIO = -0.6;
  const EMBER_PERIOD = 7;
  const EMBER_MID = 0.32;
  const EMBER_AMP = 0.1;
  const DISK_DRIFT = 0.01;
  const LAMP_ORBIT_X = 0.22;
  const LAMP_ORBIT_Y = 0.28;

  let animId = null;
  let lastT = 0;
  function frame(t) {
    animId = requestAnimationFrame(frame);
    const dt = Math.min((t - lastT) / 1000, 0.05) || 0.016;
    lastT = t;
    const tm = t / 1000;

    const sweep = OSC_CENTER + OSC_AMP * Math.sin(tm * (Math.PI * 2 / OSC_PERIOD));
    if (crystal) crystal.rotation.y = sweep;
    if (core) {
      core.rotation.y = CORE_ROLL_RATIO * sweep;
      if (emberMat) {
        emberMat.emissiveIntensity = EMBER_MID + EMBER_AMP * Math.sin(tm * (Math.PI * 2 / EMBER_PERIOD));
      }
    }

    lamp.position.set(-3.5 + Math.sin(tm * LAMP_ORBIT_X) * 1.4, -1.2 + Math.cos(tm * LAMP_ORBIT_Y) * 0.9, 2.5);
    pivot.rotation.y = YAW_SWAY * Math.sin(tm * 0.23);
    pivot.position.x = Math.cos(tm * ELLIPSE_SPEED) * ELLIPSE_X;
    pivot.position.y = -0.18 + Math.sin(tm * ELLIPSE_SPEED) * ELLIPSE_Y;

    disk.rotation.y += DISK_DRIFT * dt;
    for (const sys of [dust, sparks]) {
      const { posArr, seed, count, geo } = sys;
      for (let i = 0; i < count; i++) {
        const [r, a0, w, yOff, ph] = seed[i];
        const a = a0 + tm * w;
        posArr[i * 3] = Math.cos(a) * r;
        posArr[i * 3 + 1] = yOff + Math.sin(a * 2 + ph) * 0.03;
        posArr[i * 3 + 2] = Math.sin(a) * r;
      }
      geo.attributes.position.needsUpdate = true;
    }

    renderer.render(scene, camera);
  }
  function startLoop() {
    if (REDUCED_MOTION) return;
    if (animId === null) { lastT = performance.now(); animId = requestAnimationFrame(frame); }
  }
  function stopLoop() {
    if (animId !== null) { cancelAnimationFrame(animId); animId = null; }
  }

  let stageVisible = true;
  const io = new IntersectionObserver(([entry]) => {
    stageVisible = entry.isIntersecting;
    if (stageVisible && !document.hidden) startLoop();
    else stopLoop();
  });
  io.observe(host);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopLoop();
    else if (stageVisible) startLoop();
  });

  window.__crystalStageRunning = () => animId !== null;

  function reveal() {
    renderer.compileAsync(scene, camera).catch(() => {}).then(() => {
      renderer.render(scene, camera);
      canvas.classList.add('active');
      if (REDUCED_MOTION) return;
      if (stageVisible && !document.hidden) startLoop();
    });
  }
  return true;
}

(function waitForStage(triesLeft = 300) {
  if (initCrystalStage() || triesLeft <= 0) return;
  requestAnimationFrame(() => waitForStage(triesLeft - 1));
})();
