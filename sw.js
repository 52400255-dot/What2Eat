/* Cache only the public app shell. Never cache PHP pages, API responses, uploads or map data. */
'use strict';

const CACHE_NAME = 'what2eat-shell-v5';
const STATIC_PATHS = new Set([
  '/manifest.json',
  '/offline.html',
  '/assets/img/what2eat.svg',
  '/assets/img/what2eat-192.png',
  '/assets/img/what2eat-512.png',
  '/assets/css/style.css',
  '/assets/css/auth.css',
  '/assets/css/live-data.css',
  '/assets/js/site.js',
  '/assets/js/app.js',
  '/assets/js/restaurant-map.js',
]);

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll([...STATIC_PATHS])));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith('what2eat-shell-') && key !== CACHE_NAME).map((key) => caches.delete(key)),
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (/^\/(?:api|admin|storage|includes|tiles)(?:\/|$)/i.test(url.pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => {
      const offline = await caches.match('/offline.html');
      return offline || Response.error();
    }));
    return;
  }

  if (!STATIC_PATHS.has(url.pathname)) return;
  event.respondWith(fetch(request).then((response) => {
    if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
    return response;
  }).catch(async () => (await caches.match(request)) || Response.error()));
});
