var CACHE_NAME = 'pochitto-diary-v3';
var ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './prompt-template.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  var url = new URL(event.request.url);

  // Never intercept calls to AI APIs, Supabase, or font hosts. These must
  // always hit the network directly and must never be cached.
  if (
    url.hostname.indexOf('anthropic.com') !== -1 ||
    url.hostname.indexOf('generativelanguage.googleapis.com') !== -1 ||
    url.hostname.indexOf('supabase.co') !== -1 ||
    url.hostname.indexOf('fonts.g') !== -1
  ) {
    return;
  }

  // Only handle GET requests for same-origin app shell files.
  if (event.request.method !== 'GET' || url.origin !== location.origin) {
    return;
  }

  // Network-first: while online, always fetch the latest app code so a
  // freshly-deployed update is never masked by a stale cached copy. Only
  // fall back to the cache when the network is unavailable (offline use).
  event.respondWith(
    fetch(event.request)
      .then(function (res) {
        var resClone = res.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, resClone); });
        return res;
      })
      .catch(function () {
        return caches.match(event.request);
      })
  );
});
