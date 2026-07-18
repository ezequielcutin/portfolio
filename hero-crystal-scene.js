// Hero crystal scene — an amber glass gem holding court over its own
// accretion disk: orbital dust and sparks circling the crystal's gravity,
// streak rings tracing their paths. Ambient with a light cursor touch;
// no scroll choreography. Loaded dynamically by hero-crystal.js on
// desktop viewports only.
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
  panel(0xfff1e2, 12, 0.35, 2.6, [-2.5, -3.5, 2], [0, 0, 0]); // thin warm streak low-left
  panel(0xd98a4a, 5, 5, 3, [0, -4.5, 0.5], [0, 0, 0]);        // warm floor bounce for pavilion facets
  return env;
}

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function getAccent() {
  const hex = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#4488ff';
  return new THREE.Color(hex);
}

function showPoster(host) {
  const img = document.createElement('img');
  img.className = 'pf-hero-crystal-poster';
  img.alt = '';
  img.setAttribute('aria-hidden', 'true');
  img.src = 'public/models/crystal-poster.png?v=2';
  img.onload = () => img.classList.add('active');
  img.onerror = () => img.remove();
  host.appendChild(img);
}

// Stylized glass: plain alpha transparency instead of physical
// transmission. On a black page it reads more luminous (the disk and the
// glowing core show straight through) and it removes the per-frame
// full-viewport transmission pass — the scene's biggest GPU cost.
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
    iridescence: 0.7,
    iridescenceIOR: 1.6,
    envMapIntensity: 2.2,
    emissive: accent,
    emissiveIntensity: 0.12,
    flatShading: true,
    // Every facet fills from any angle; back faces read through the glass.
    side: THREE.DoubleSide,
  });
}

// Soft round sprite so particles read as glowing dust, not squares.
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

  // 1.5 instead of full retina: the glass material re-renders the canvas
  // into a mipmapped MSAA target every frame, so pixels cost double here.
  // On this dark, soft-edged scene the resolution drop reads as nothing.
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

  // Facet ridges: pale-gold edge lines, the bright seams where light
  // catches the cut — a big part of the reference's luminous read.
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

  // pivot: position + cursor tilt · lay: rest pose · the crystal platform
  // turns slowly on its vertical axis like a display turntable. No
  // placeholder: it appears only once the real gem has loaded.
  let crystal = null;
  const lay = new THREE.Group();
  lay.rotation.x = 0.72;                 // tip the table toward the viewer
  lay.rotation.z = 0.06;                 // a hair off-level
  lay.scale.setScalar(1.12);             // crystal dominates its disk slightly
  const pivot = new THREE.Group();
  pivot.add(lay);
  pivot.scale.setScalar(0.55);
  scene.add(pivot);

  // --- Accretion disk: dust and sparks orbiting the crystal's gravity ---
  // A tilted disk group carries everything; particles advance along their
  // orbits Kepler-style (closer in = faster), which is what sells "gravity".
  const disk = new THREE.Group();
  disk.rotation.x = 0.78;                // nearly coplanar with the tipped table
  disk.rotation.z = 0.18;
  pivot.add(disk);

  const sprite = makeDustSprite();
  const makeOrbiters = (count, sizePx, color, opacity, rMin, rSpan) => {
    const posArr = new Float32Array(count * 3);
    const seed = [];                     // [radius, angle0, angSpeed, yOff, wobblePhase]
    for (let i = 0; i < count; i++) {
      const r = rMin + rSpan * Math.pow(Math.random(), 0.65);
      seed.push([
        r,
        Math.random() * Math.PI * 2,
        0.5 / Math.pow(r, 1.5),          // Kepler-ish falloff
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
  const dust = makeOrbiters(900, 0.035, accent, 0.55, 1.15, 2.6);
  const sparks = makeOrbiters(120, 0.075, 0xffd9b0, 0.9, 1.05, 2.4);

  // Streak rings: faint elliptical arcs under the particles — the
  // long-exposure trails of the orbits. Some full loops, some fragments.
  const RINGS = 22;
  for (let i = 0; i < RINGS; i++) {
    const r = 1.2 + 2.5 * Math.pow(Math.random(), 0.7);
    const span = (0.35 + Math.random() * 0.65) * Math.PI * 2;
    const a0 = Math.random() * Math.PI * 2;
    const segs = 72;
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
    const line = new THREE.Line(g, new THREE.LineBasicMaterial({
      color: accent,
      transparent: true,
      opacity: 0.035 + Math.random() * 0.055,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    disk.add(line);
  }

  // Ember core: opaque gem living inside the hull, loaded from the same glb.
  let core = null;
  let emberMat = null;

  new GLTFLoader().load(
    'public/models/crystal.glb?v=4',
    (gltf) => {
      const hull = gltf.scene.getObjectByName('Crystal');
      if (!hull || !hull.isMesh) { canvas.remove(); showPoster(host); return; }
      hull.material = createCrystalMaterial(accent);
      // Normalize the platform's footprint; the modeled proportions
      // (flat rhombus table + upright tip gem) are kept as-is.
      const size = new THREE.Box3().setFromObject(hull).getSize(new THREE.Vector3());
      const norm = 3.6 / Math.max(size.x, size.y, size.z);
      hull.scale.multiplyScalar(norm);
      lay.add(hull);
      crystal = hull;
      makeEdges(hull);

      // Ember core: sibling of the hull inside lay; it owns its local roll.
      // Refraction through the hull does the rest.
      const loadedCore = gltf.scene.getObjectByName('Core');
      if (loadedCore) {
        // Same normalization as the hull. The hull's later 0.72 y-squash makes
        // the long-axis ratio ~58% (short axes stay 42%) — art-directed, keep.
        loadedCore.scale.multiplyScalar(norm);
        loadedCore.position.set(0, 0, 0);
        // The core is the platform's inner light: every face smolders so the
        // glass above it transmits a warm interior instead of darkness.
        loadedCore.traverse((o) => {
          if (!o.isMesh) return;
          const isEmber = o.material && o.material.name === 'CoreEmber';
          o.material = new THREE.MeshStandardMaterial({
            color: isEmber ? 0x35160a : 0x2a1208,
            roughness: 0.5,
            metalness: 0,
            flatShading: true,
            emissive: accent,
            emissiveIntensity: isEmber ? 0.75 : 0.28,
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

  // The canvas fills the hero block (absolute, clipped by the hero's
  // overflow). The crystal renders ON the camera axis — so its pose reads
  // exactly as designed, no off-axis perspective shear — and the camera's
  // view offset slides the frame so the crystal lands beside the tagline.
  let W = 0, H = 0;

  function layout() {
    W = host.clientWidth; H = host.clientHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    let homeX, homeY;                   // hero-local px
    // Top-right corner, level with the title: the piece never reaches down
    // into the bio text. Only the faint disk particles cross the copy.
    const inner = host.querySelector('.pf-block__inner');
    if (inner) {
      const r = inner.getBoundingClientRect();
      const hr = host.getBoundingClientRect();
      homeX = W - 340;
      homeY = Math.max((r.top - hr.top) + r.height * 0.14, 150);
    } else {
      homeX = W - 340;
      homeY = H * 0.2;
    }
    camera.setViewOffset(W, H, W / 2 - homeX, H / 2 - homeY, W, H);
    camera.updateProjectionMatrix();
  }
  layout();
  window.addEventListener('resize', layout);

  // --- Motion state ---
  const OSC_CENTER = 0.18;         // rad; rest angle of the turntable sweep
  const OSC_AMP = 0.5;             // rad; sweep range keeps the broadside facing out
  const OSC_PERIOD = 16;           // s per full back-and-forth
  const YAW_SWAY = 0.07;           // rad; whole-piece lazy sway
  const ELLIPSE_X = 0.2;           // idle drift, world units
  const ELLIPSE_Y = 0.09;
  const ELLIPSE_SPEED = 0.15;      // rad/s along the drift ellipse
  const TILT_MAX = 0.07;           // rad, barely-there lean toward the cursor
  const SPRING_STIFFNESS = 0.016;  // heavy spring: the piece drifts after the
  const SPRING_DAMPING = 0.92;     // cursor in slow motion, never tracks it
  const CORE_ROLL_RATIO = -0.6;    // core rolls against the hull
  const EMBER_PERIOD = 7;          // s, breathing sine
  const EMBER_MID = 0.75;          // emissiveIntensity range ~0.45..1.05
  const EMBER_AMP = 0.3;
  const DISK_DRIFT = 0.012;        // rad/s, whole disk slowly wheels around

  let targetTiltX = 0, targetTiltZ = 0;
  let tiltX = 0, tiltZ = 0, tiltVX = 0, tiltVZ = 0;

  window.addEventListener('pointermove', (e) => {
    const nx = (e.clientX / window.innerWidth) * 2 - 1;   // -1..1
    const ny = (e.clientY / window.innerHeight) * 2 - 1;
    targetTiltZ = -nx * TILT_MAX;
    targetTiltX = ny * TILT_MAX;
  });

  let animId = null;
  let lastT = 0;
  function frame(t) {
    animId = requestAnimationFrame(frame);
    const dt = Math.min((t - lastT) / 1000, 0.05) || 0.016;
    lastT = t;
    const tm = t / 1000;

    // The turntable sweeps back and forth through its flattering arc
    // instead of full revolutions, so the platform never turns end-on.
    const sweep = OSC_CENTER + OSC_AMP * Math.sin(tm * (Math.PI * 2 / OSC_PERIOD));
    if (crystal) crystal.rotation.y = sweep;

    // Ember core counter-sweeps inside the glass; its facets breathe on a
    // slow, interaction-free sine.
    if (core) {
      core.rotation.y = CORE_ROLL_RATIO * sweep;
      if (emberMat) {
        emberMat.emissiveIntensity = EMBER_MID + EMBER_AMP * Math.sin(tm * (Math.PI * 2 / EMBER_PERIOD));
      }
    }

    // Lamp prowls slowly so glints travel across facets even at idle.
    lamp.position.set(-3.5 + Math.sin(tm * 0.14) * 1.7, -1.2 + Math.cos(tm * 0.18) * 1.1, 2.5);

    // Gentle cursor lean — the whole piece (crystal + disk) tips together.
    tiltVX = (tiltVX + (targetTiltX - tiltX) * SPRING_STIFFNESS) * SPRING_DAMPING;
    tiltVZ = (tiltVZ + (targetTiltZ - tiltZ) * SPRING_STIFFNESS) * SPRING_DAMPING;
    tiltX += tiltVX; tiltZ += tiltVZ;
    pivot.rotation.x = tiltX;
    pivot.rotation.z = tiltZ;
    pivot.rotation.y = YAW_SWAY * Math.sin(tm * 0.23);

    // The pivot lives at the origin (the view offset places it on screen);
    // only the small elliptical drift moves it.
    pivot.position.x = Math.cos(tm * ELLIPSE_SPEED) * ELLIPSE_X;
    pivot.position.y = Math.sin(tm * ELLIPSE_SPEED) * ELLIPSE_Y;

    // Orbiters: advance each along its orbit; inner ones outpace outer ones.
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
    if (animId === null) { lastT = performance.now(); animId = requestAnimationFrame(frame); }
  }
  function stopLoop() {
    if (animId !== null) { cancelAnimationFrame(animId); animId = null; }
  }

  // Run only while the hero is on screen and the tab is visible.
  let heroVisible = true;
  const io = new IntersectionObserver(([entry]) => {
    heroVisible = entry.isIntersecting;
    if (heroVisible && !document.hidden) startLoop();
    else stopLoop();
  });
  io.observe(host);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopLoop();
    else if (heroVisible) startLoop();
  });

  window.__heroCrystalRunning = () => animId !== null;

  // Called by the loader once the gem is in the scene. Shaders compile off
  // the main thread first (the transmission material is expensive to build),
  // then one frame renders, the canvas fades in, and the loop starts.
  function reveal() {
    renderer.compileAsync(scene, camera).catch(() => {}).then(() => {
      renderer.render(scene, camera);
      canvas.classList.add('active');
      if (heroVisible && !document.hidden) startLoop();
    });
  }
  return true;
}

// The hero is rendered by React after mount — poll briefly until it exists.
(function waitForHero(triesLeft = 300) {
  if (initHeroCrystal() || triesLeft <= 0) return;
  requestAnimationFrame(() => waitForHero(triesLeft - 1));
})();
