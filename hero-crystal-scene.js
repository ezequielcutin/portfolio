// Hero crystal scene — three.js glass shard layered above the particle canvas.
// Loaded dynamically by hero-crystal.js on desktop viewports only.
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
  panel(accent, 9, 3.2, 1.5, [-4, 1.5, 3], [0, 0, 0]);        // warm lamp softbox, tight and hot
  panel(0x8a97b8, 2.6, 4, 1.1, [4.5, -1, -2], [0, 0, 0]);     // cool slate strip
  panel(0xffffff, 10, 1.1, 0.3, [0.5, 4.5, 1.5], [0, 0, 0]);  // narrow white glint bar
  return env;
}

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

  if (REDUCED_MOTION) { showPoster(host); return true; }

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

  // 1.5 instead of full retina: the glass material re-renders the viewport
  // into a mipmapped MSAA target every frame, so pixels cost double here.
  // On this dark, soft-edged object the resolution drop reads as nothing.
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  camera.position.set(0, 0, 7);

  const accent = getAccent();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(makeStudioEnv(accent), 0.05).texture;
  pmrem.dispose();
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

  // No placeholder: the crystal appears only once the real gem has loaded,
  // so the first thing seen is the final shape at its final size.
  let crystal = null;
  let edges = null;
  const lay = new THREE.Group();
  lay.rotation.z = Math.PI / 2 + 0.12;   // horizontal, a hair off-level
  lay.rotation.x = 0.28;                 // nose toward viewer so facets catch light
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

  // Ember core: opaque gem living inside the hull, loaded from the same glb.
  let core = null;      // THREE.Object3D (Group or Mesh named "Core")
  let emberMat = null;  // material of the emissive facets, driven in frame()

  new GLTFLoader().load(
    'public/models/crystal.glb',
    (gltf) => {
      const hull = gltf.scene.getObjectByName('Crystal');
      if (!hull || !hull.isMesh) { canvas.remove(); showPoster(host); return; }
      hull.material = createCrystalMaterial(accent);
      // Normalize to the footprint the layout/motion tuning was built around.
      const size = new THREE.Box3().setFromObject(hull).getSize(new THREE.Vector3());
      const norm = 3.2 / Math.max(size.x, size.y, size.z);
      hull.scale.multiplyScalar(norm);
      // Chunkier read: shorten the long axis so the horizontal pose keeps
      // visible depth instead of flattening into a sliver.
      hull.scale.y *= 0.72;
      lay.add(hull);
      crystal = hull;
      edges = makeEdges(hull);

      // Ember core: sibling of the hull inside lay, so it shares the journey
      // but owns its local roll. Refraction through the hull does the rest.
      const loadedCore = gltf.scene.getObjectByName('Core');
      if (loadedCore) {
        // Same normalization as the hull. The hull's later 0.72 y-squash makes
        // the long-axis ratio ~58% (short axes stay 42%) — art-directed, keep.
        loadedCore.scale.multiplyScalar(norm);
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
      reveal();
    },
    undefined,
    () => { canvas.remove(); showPoster(host); }  // glb failed — poster instead
  );

  // The canvas is viewport-fixed; the crystal's home sits beside the hero
  // tagline (document space), and scrolling carries it on a journey toward
  // mid-screen, fading out as the Work section arrives.
  let VW = 0, VH = 0, halfW = 0, halfH = 0;
  let anchorDocX = 0, anchorDocY = 0;   // document-space home, px
  let journeyEndY = 1;                  // scrollY where the journey completes
  const workEl = document.getElementById('block-work');

  function layout() {
    VW = window.innerWidth; VH = window.innerHeight;
    renderer.setSize(VW, VH, false);
    camera.aspect = VW / VH;
    camera.updateProjectionMatrix();
    halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    halfW = halfH * camera.aspect;
    const inner = host.querySelector('.pf-block__inner');
    const sy = window.scrollY;
    if (inner) {
      const r = inner.getBoundingClientRect();
      anchorDocX = Math.min(r.right - r.width * 0.1, VW - 180);
      anchorDocY = r.top + sy + r.height * 0.2;
    } else {
      anchorDocX = VW * 0.78;
      anchorDocY = sy + VH * 0.28;
    }
    journeyEndY = workEl
      ? Math.max(workEl.getBoundingClientRect().top + sy - VH * 0.25, 1)
      : Math.max(host.clientHeight - VH * 0.25, 1);
  }
  function pxToWorld(xPx, yPx) {
    return {
      x: ((xPx / VW) * 2 - 1) * halfW,
      y: (1 - (yPx / VH) * 2) * halfH,
    };
  }
  layout();
  window.addEventListener('resize', layout);

  // --- Motion state ---
  const IDLE_ROLL = 0.11;          // rad/s around the long axis
  const IDLE_YAW = 0.07;           // rad/s around the vertical axis
  const ELLIPSE_X = 0.32;          // idle drift: elliptical orbit, world units
  const ELLIPSE_Y = 0.12;
  const ELLIPSE_SPEED = 0.17;      // rad/s along the ellipse
  const TILT_MAX = 0.22;           // rad, toward cursor
  const SPRING_STIFFNESS = 0.045;  // same feel family as header-ambience
  const SPRING_DAMPING = 0.88;
  const JOURNEY_PITCH = 0.5;       // extra pitch over the scroll journey
  const JOURNEY_YAW = 2.4;         // slow horizontal rotation across the journey
  const FLICK_RADIUS = 150;        // px; cursor sweep inside this flicks the crystal
  const GLOW_IDLE = 0.08;
  const CORE_ROLL_RATIO = -0.6;    // core rolls against the hull
  const CORE_FLICK_RATIO = 0.5;    // damped share of flick inertia the core feels
  const EMBER_PERIOD = 7;          // s, breathing sine
  const EMBER_MID = 0.475;         // emissiveIntensity range ~0.25..0.7
  const EMBER_AMP = 0.225;

  let targetTiltX = 0, targetTiltZ = 0;
  let tiltX = 0, tiltZ = 0, tiltVX = 0, tiltVZ = 0;
  let rollVel = 0;                 // flick inertia around the long axis
  let yawVel = 0;                  // flick inertia around the vertical axis
  let yawBase = 0;                 // integrated idle + flick yaw; scroll adds on top
  let moteSwirl = 0;               // accumulated swirl the flicks drag the motes into
  let lastPX = -1e4, lastPY = -1e4, lastPT = 0;

  window.addEventListener('pointermove', (e) => {
    const nx = (e.clientX / VW) * 2 - 1;   // -1..1
    const ny = (e.clientY / VH) * 2 - 1;
    targetTiltZ = -nx * TILT_MAX;
    targetTiltX = ny * TILT_MAX;

    // Project the crystal to screen px. A fast sweep across it spins it:
    // horizontal sweeps yaw it around the vertical axis (spinning a globe),
    // vertical sweeps roll it around its long axis (rolling a log).
    const proj = pivot.position.clone().project(camera);
    const cx = (proj.x + 1) / 2 * VW;
    const cy = (1 - proj.y) / 2 * VH;
    const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
    const now = e.timeStamp;
    if (lastPT && dist < FLICK_RADIUS) {
      const dtp = Math.max(now - lastPT, 1);
      const vx = (e.clientX - lastPX) / dtp;              // px/ms
      const vy = (e.clientY - lastPY) / dtp;
      yawVel = THREE.MathUtils.clamp(yawVel + vx * 0.7, -4, 4);
      rollVel = THREE.MathUtils.clamp(rollVel + vy * 0.7, -4, 4);
    }
    lastPX = e.clientX; lastPY = e.clientY; lastPT = now;
  });

  let animId = null;
  let lastT = 0;
  function frame(t) {
    animId = requestAnimationFrame(frame);
    const dt = Math.min((t - lastT) / 1000, 0.05) || 0.016;
    lastT = t;

    // Dual-axis spin: slow roll around the long axis + slow yaw around the
    // vertical, each carrying its own decaying flick inertia.
    if (crystal) crystal.rotation.y += (IDLE_ROLL + rollVel) * dt;
    yawBase += (IDLE_YAW + yawVel) * dt;
    rollVel *= Math.pow(0.5, dt);                // slow, frame-rate independent decay
    yawVel *= Math.pow(0.5, dt);

    // Ember core counter-rolls: flick the hull right, the ember drifts left
    // inside the glass. Its facets breathe on a slow, interaction-free sine.
    if (core) {
      core.rotation.y += CORE_ROLL_RATIO * (IDLE_ROLL + rollVel * CORE_FLICK_RATIO) * dt;
      if (emberMat) {
        emberMat.emissiveIntensity = EMBER_MID + EMBER_AMP * Math.sin(t / 1000 * (Math.PI * 2 / EMBER_PERIOD));
      }
    }

    // A hard spin shifts the material subtly: slight iridescence lift,
    // blueprint edges whisper in, then everything settles.
    const spinEnergy = Math.min((Math.abs(rollVel) + Math.abs(yawVel)) / 4, 1);
    if (crystal) {
      crystal.material.iridescence = 0.55 + spinEnergy * 0.15;
      edges.material.opacity = 0.04 + spinEnergy * 0.14;
    }

    // Lamp prowls slowly so glints travel across facets even at idle.
    const tl = t / 1000;
    lamp.position.set(-3.5 + Math.sin(tl * 0.1) * 1.4, -1.2 + Math.cos(tl * 0.13) * 0.9, 2.5);

    tiltVX = (tiltVX + (targetTiltX - tiltX) * SPRING_STIFFNESS) * SPRING_DAMPING;
    tiltVZ = (tiltVZ + (targetTiltZ - tiltZ) * SPRING_STIFFNESS) * SPRING_DAMPING;
    tiltX += tiltVX; tiltZ += tiltVZ;
    pivot.rotation.x = tiltX;
    pivot.rotation.z = tiltZ;

    if (crystal) crystal.material.emissiveIntensity = GLOW_IDLE + spinEnergy * 0.08;

    // Scroll journey: home is anchored beside the tagline in document space;
    // as the page scrolls, the crystal detaches and glides toward mid-screen,
    // fading out just before the Work section takes over.
    const sy = window.scrollY;
    const p = Math.min(Math.max(sy / journeyEndY, 0), 1);
    const ease = p * p * (3 - 2 * p);                       // smoothstep
    const homeX = anchorDocX;
    const homeYScreen = anchorDocY - sy;                    // home tracks the page
    const destX = VW * 0.52, destY = VH * 0.55;             // journey destination
    const px = homeX + (destX - homeX) * ease;
    const py = homeYScreen + (destY - homeYScreen) * ease;
    const world = pxToWorld(px, py);
    const tm = t / 1000;
    // Elliptical idle drift layered on top of the journey position.
    pivot.position.x = world.x + Math.cos(tm * ELLIPSE_SPEED) * ELLIPSE_X;
    pivot.position.y = world.y + Math.sin(tm * ELLIPSE_SPEED) * ELLIPSE_Y;
    lay.rotation.x = 0.28 + ease * JOURNEY_PITCH;
    pivot.rotation.y = yawBase + ease * JOURNEY_YAW;

    // Fade out at the end of the journey; pause the loop once invisible.
    const fade = p < 0.75 ? 1 : Math.max(1 - (p - 0.75) / 0.25, 0);
    if (p > 0.01 && canvas.style.transition !== 'none') canvas.style.transition = 'none';
    canvas.style.opacity = fade;
    if (fade === 0) { stopLoop(); return; }

    // Dust motes orbit lazily; a flick drags them into a faster swirl
    // and pushes them outward until the spin settles.
    moteSwirl += (yawVel + rollVel) * dt * 0.12;
    const fling = 1 + spinEnergy * 0.25;
    for (let i = 0; i < MOTES; i++) {
      const dir = i % 2 ? 1 : -1;
      const a = moteSeed[i * 3] + tm * 0.045 * dir + moteSwirl * dir;
      const b = moteSeed[i * 3 + 1] + tm * 0.028 + moteSwirl * 0.4;
      const rad = moteSeed[i * 3 + 2] * 2.28 * fling;
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

  // The journey fade stops the loop itself; scrolling back wakes it.
  window.addEventListener('scroll', () => {
    if (!document.hidden && window.scrollY < journeyEndY) startLoop();
  }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopLoop();
    else if (window.scrollY < journeyEndY) startLoop();
  });

  window.__heroCrystalRunning = () => animId !== null;

  // Called by the loader once the gem is in the scene. Shaders compile off
  // the main thread first (the transmission material is expensive to build),
  // then one frame renders, the canvas fades in, and the loop starts.
  function reveal() {
    renderer.compileAsync(scene, camera).catch(() => {}).then(() => {
      renderer.render(scene, camera);
      canvas.classList.add('active');
      startLoop();
    });
  }
  return true;
}

// The hero is rendered by React after mount — poll briefly until it exists.
(function waitForHero(triesLeft = 300) {
  if (initHeroCrystal() || triesLeft <= 0) return;
  requestAnimationFrame(() => waitForHero(triesLeft - 1));
})();
