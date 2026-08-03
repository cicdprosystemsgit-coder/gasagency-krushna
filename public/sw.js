// Service Worker for Gas Agency PWA
const CACHE_NAME = "gas-agency-v1";
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/offline",
];

function isCacheable(request) {
  const url = new URL(request.url);
  return url.protocol === "http:" || url.protocol === "https:";
}

// Install — cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network-first for API routes, skip local dev and external scripts
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip localhost / dev mode, non-GET, API routes, and external domains (e.g. google translate)
  if (
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    request.method !== "GET" ||
    url.pathname.startsWith("/api/") ||
    !isCacheable(request)
  ) {
    return;
  }

  // Cache-first for local static assets (production only)
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (isCacheable(request)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }))
    );
    return;
  }

  // Network-first for pages
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && isCacheable(request)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request).then((matched) => matched || caches.match("/offline")))
  );
});
