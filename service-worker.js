var CACHE_NAME = 'pochitto-diary-v1';
var ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
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

  // Never intercept calls to the Anthropic API or third-party font hosts.
  // These should always hit the network directly, and must never be cached.
  if (url.hostname.indexOf('anthropic.com') !== -1 || url.hostname.indexOf('fonts.g') !== -1) {
    return;
  }

  // Only handle GET requests for same-origin app shell files.
  if (event.request.method !== 'GET' || url.origin !== location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      var networkFetch = fetch(event.request)
        .then(function (res) {
          var resClone = res.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, resClone); });
          return res;
        })
        .catch(function () { return cached; });
      return cached || networkFetch;
    })
  );
});
