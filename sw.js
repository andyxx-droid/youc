// ══════════════════════════════════════════════════════════════
// YouC — Service Worker
// Strategia: Network First (con timeout) per l'app shell (index.html,
//            manifest, icone) — così vedi sempre l'ultima versione online
//            Cache First con aggiornamento in background per le Google APIs
//            Network First puro (nessuna cache) per le chiamate Calendar API
// ══════════════════════════════════════════════════════════════

// ⚠️ AGGIORNA questo timestamp ad OGNI deploy (anche di un solo file).
// È l'unico modo per far accorgere i browser/PWA installate che c'è
// una nuova versione: cambia il contenuto di questo file, che i
// browser ricontrollano periodicamente byte-per-byte.
// Formato libero, basta che sia diverso dal precedente — es. data e ora
// del deploy: "2026-07-19-1830" (anno-mese-giorno-oraminuti).
const CACHE_VERSION = "v2.1.260719-2248";
const CACHE_NAME    = `youc-shell-v${CACHE_VERSION}`;
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

  // ── App shell (index.html, manifest, icone) → Network First con timeout ──
  // Prova sempre la rete per prima: così, quando sei online, vedi sempre
  // l'ultima versione pubblicata. La cache è usata solo come fallback
  // (rete lenta oltre CACHE_TIMEOUT, o offline).
  event.respondWith(networkFirst(event.request));
});

// Network First con timeout: prova la rete, altrimenti usa la cache
async function networkFirst(request) {
  try {
    const networkResp = await fetchWithTimeout(request, CACHE_TIMEOUT);
    if(networkResp && networkResp.status === 200){
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResp.clone());
    }
    return networkResp;
  } catch(e) {
    // Rete non disponibile/lenta: usa la cache come fallback
    const cached = await caches.match(request);
    if(cached) return cached;
    return new Response('Offline — risorsa non in cache', { status: 503 });
  }
}

function fetchWithTimeout(request, timeout) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), timeout);
    fetch(request).then(resp => {
      clearTimeout(timer);
      resolve(resp);
    }).catch(err => {
      clearTimeout(timer);
      reject(err);
    });
  });
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
