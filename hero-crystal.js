// Hero crystal loader.
// Desktop (≥901px): in-hero crystal beside the tagline (existing scene).
// Mobile (<901px): centered stage band between hero and Work (separate scene, lazy).
const DESKTOP = window.innerWidth >= 901;

if (DESKTOP) {
  import('./hero-crystal-scene.js?v=23').catch(() => {});
} else {
  function bootStage() {
    const host = document.getElementById('hero-crystal-stage');
    if (!host) {
      requestAnimationFrame(bootStage);
      return;
    }
    const load = () => import('./hero-crystal-stage-scene.js?v=7').catch(() => {});
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        if ('requestIdleCallback' in window) {
          requestIdleCallback(load, { timeout: 2500 });
        } else {
          setTimeout(load, 600);
        }
      },
      { rootMargin: '160px 0px' }
    );
    io.observe(host);
  }
  bootStage();
}
