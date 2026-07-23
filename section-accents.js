// Section accents loader.
// Desktop (≥901px): Work, Projects, and Music accents beside headers.
// Mobile (<901px): Music accent pin only, lazy-loaded near viewport.
const DESKTOP = window.innerWidth >= 901;

function loadScene() {
  import('./section-accents-scene.js?v=8').catch(() => {});
}

if (DESKTOP) {
  loadScene();
} else {
  function bootMusicPin() {
    const header = document.querySelector('#block-music .pf-blockHead');
    if (!header) {
      requestAnimationFrame(bootMusicPin);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        if ('requestIdleCallback' in window) {
          requestIdleCallback(loadScene, { timeout: 3000 });
        } else {
          setTimeout(loadScene, 800);
        }
      },
      { rootMargin: '120px 0px' }
    );
    io.observe(header);
  }
  bootMusicPin();
}
