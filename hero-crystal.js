// Hero crystal loader. Mobile never shows the crystal, so this tiny gate
// keeps three.js (and the scene module) from downloading there at all.
if (window.innerWidth >= 901) {
  import('./hero-crystal-scene.js?v=1');
}
