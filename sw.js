const CACHE_NAME = 'office-attendance-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js',
  '/style.css'  // যদি আলাদা style ফাইল হয়
];

// Install SW and cache files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Activate SW
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
});

// Fetch from cache first
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(res => res || fetch(event.request))
      .catch(()=> new Response("You are offline", {status: 503, statusText: 'Offline'}))
  );
});

// Push notification event
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {title:"Attendance", body:"Check your attendance"};
  event.waitUntil(
    self.registration.showNotification(data.title, {body: data.body, icon:'/icon-192.png'})
  );
});

// Notification click
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
