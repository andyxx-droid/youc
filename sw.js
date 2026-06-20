// ══════════════════════════════════════════════════════════════
// YouC — Service Worker
// Strategia: Cache First per le risorse statiche (app shell + Google APIs)
//            Network First per le chiamate Google Calendar API
// ══════════════════════════════════════════════════════════════

const CACHE_NAME    = 'youc-shell-v1';
const CACHE_TIMEOUT = 4000; // ms prima di rinunciare alla rete e usare cache

// Risorse dell'app shell da pre-cachare all'installazione
const SHELL_URLS = [
  './',           // index.html
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// Risorse esterne da cachare al primo utilizzo (runtime caching)
// Le API Google devono essere disponibili offline per far partire l'app
const RUNTIME_CACHE_ORIGINS = [
  'https://apis.google.com',
  'https://accounts.google.com',
  'https://ssl.gstatic.com',
  'https://www.gstatic.com',
];

// ── INSTALL: pre-cacha l'app shell ───────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Prova a cachare ogni risorsa; se una fallisce non blocca le altre
      return Promise.allSettled(
        SHELL_URLS.map(url =>
          cache.add(url).catch(e => console.warn('[SW] Cache fallita per:', url, e))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: rimuovi cache vecchie ──────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: strategia differenziata per tipo di risorsa ───────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Ignora richieste non-GET e chrome-extension
  if(event.request.method !== 'GET') return;
  if(url.protocol === 'chrome-extension:') return;

  // ── Chiamate Google Calendar API → Network First, nessuna cache ──
  // (i dati del calendario cambiano continuamente)
  if(url.hostname === 'www.googleapis.com' && url.pathname.startsWith('/calendar')){
    event.respondWith(fetch(event.request));
    return;
  }

  // ── Risorse esterne Google (script JS, CSS) → Cache First con aggiornamento in background ──
  const isGoogleScript = RUNTIME_CACHE_ORIGINS.some(o => event.request.url.startsWith(o));
  if(isGoogleScript){
    event.respondWith(cacheFirstWithUpdate(event.request));
    return;
  }

  // ── App shell (index.html, manifest, icone) → Cache First ──
  event.respondWith(cacheFirst(event.request));
});

// Cache First: serve dalla cache se disponibile, altrimenti rete + aggiorna cache
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if(cached) return cached;

  try {
    const networkResp = await fetch(request);
    if(networkResp && networkResp.status === 200){
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResp.clone());
    }
    return networkResp;
  } catch(e) {
    // Rete non disponibile e nessuna cache: restituisce 503
    return new Response('Offline — risorsa non in cache', { status: 503 });
  }
}

// Cache First + aggiornamento silenzioso in background (Stale While Revalidate)
async function cacheFirstWithUpdate(request) {
  const cache  = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  // Aggiornamento in background (non blocca la risposta)
  const fetchPromise = fetch(request).then(networkResp => {
    if(networkResp && networkResp.status === 200){
      cache.put(request, networkResp.clone());
    }
    return networkResp;
  }).catch(() => null);

  return cached || fetchPromise;
}
