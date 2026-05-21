const CACHE = 'youc-v1';
const ASSETS = ['/', '/index.html', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys=>
    Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e=>{
  // Non intercettare le chiamate Google API
  if(e.request.url.includes('googleapis.com')||
     e.request.url.includes('google.com')||
     e.request.url.includes('gstatic.com')) return;
  e.respondWith(
    caches.match(e.request).then(cached=>cached||fetch(e.request))
  );
});
