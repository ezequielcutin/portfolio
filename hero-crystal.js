// Hero crystal — three.js glass shard layered above the particle canvas.
// Ships a procedural placeholder mesh until public/models/crystal.glb exists.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

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
  pivot.scale.setScalar(0.5);
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
