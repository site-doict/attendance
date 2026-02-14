const CACHE_NAME = "ict-attendance-v1";
const urlsToCache = [
    "index.html",
    "dashboard.html",
    "admin.html",
    "manifest.json",
    "icon-192.png",
    "icon-512.png",
    "https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js"
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener("fetch", event => {
    event.respondWith(
        caches.match(event.request).then(response => response || fetch(event.request))
    );
});
