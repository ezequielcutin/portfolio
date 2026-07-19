// Section accents loader. Same gate as the hero crystal: mobile never
// shows the accents, so nothing downloads there at all.
if (window.innerWidth >= 901) {
  // catch: if the CDN is unreachable the accents quietly don't appear.
  import('./section-accents-scene.js?v=4').catch(() => {});
}
