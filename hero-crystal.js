// Hero crystal loader. Mobile never shows the crystal, so this tiny gate
// keeps three.js (and the scene module) from downloading there at all.
if (window.innerWidth >= 901) {
  // catch: if the CDN is unreachable the crystal quietly doesn't appear.
  import('./hero-crystal-scene.js?v=9').catch(() => {});
}
