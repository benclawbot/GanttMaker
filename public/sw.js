// Minimal service worker — just enough to make the app PWA-installable
// All assets are served from the network; this SW doesn't cache anything.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', () => {
  // Pass through — no caching
});
