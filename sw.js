"use strict";
// Service worker: makes Go Fish work offline once installed.
// Strategy: answer from the cache instantly, then refresh the cache from the network,
// so a new version you publish shows up on the next launch.

const CACHE = 'go-fish-v1';
const FILES = [
  './', './index.html', './characters.js', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  const network = fetch(req).then(res => {
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then(cache => cache.put(req, copy));
    }
    return res;
  });
  event.waitUntil(network.then(() => {}, () => {}));
  event.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || network));
});
