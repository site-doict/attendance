const CACHE_NAME = 'office-attendance-v2';

// Only cache static assets - NOT html files
const STATIC_CACHE = [
  'icon-192.png',
  'icon-512.png',
  'manifest.json',
  'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js'
];

// Install - cache only static files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_CACHE))
  );
  self.skipWaiting();
});

// Activate - remove old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

// Fetch - NETWORK FIRST for HTML, cache first for static assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always fetch HTML from network (prevents login bypass)
  if(event.request.destination === 'document' ||
     url.pathname.endsWith('.html') ||
     url.pathname === '/'){
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // For Google Scripts API - always network
  if(url.hostname.includes('script.google.com') ||
     url.hostname.includes('docs.google.com')){
    event.respondWith(fetch(event.request));
    return;
  }

  // For static assets - cache first
  event.respondWith(
    caches.match(event.request)
      .then(res => res || fetch(event.request)
        .then(fetchRes => {
          const clone = fetchRes.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return fetchRes;
        })
      )
      .catch(() => new Response("You are offline", {status: 503}))
  );
});

// Push notification
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {title:"Attendance", body:"Check your attendance"};
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png'
    })
  );
});

// Notification click
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
