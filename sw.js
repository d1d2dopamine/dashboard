/* Сервис-воркер: сайт открывается без интернета.
   Оболочка берётся из кэша, данные — из сети, когда она есть. */

const CACHE = "dashboard-v3";

const SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./stats.js",
  "./sync.js",
  "./manifest.webmanifest",
  "./icon.svg"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // чужие домены (GitHub API, аватарки) — мимо кэша
  if (url.origin !== self.location.origin) return;

  // свежие данные GitHub — сначала сеть
  if (url.pathname.endsWith("data.json") || url.pathname.startsWith("/api/")) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // оболочка — сначала кэш, потом тихое обновление
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => hit);

      return hit || net;
    })
  );
});
