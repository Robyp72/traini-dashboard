// TRAINI SE — Service Worker v1
// Strategia: cache-first per app shell, cache aggiornata in background

const CACHE_NAME = 'traini-se-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  // Librerie esterne (CDN) — cachate per uso offline dopo il primo caricamento
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

// ── INSTALL: precache app shell ──
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // addAll fallisce se anche solo UNA risorsa non risponde;
      // usiamo Promise.allSettled per non bloccare l'installazione
      // se una CDN esterna è temporaneamente irraggiungibile
      return Promise.allSettled(
        CORE_ASSETS.map(url => cache.add(url).catch(() => null))
      );
    })
  );
});

// ── ACTIVATE: pulizia cache vecchie versioni ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: cache-first, poi network, con aggiornamento in background ──
self.addEventListener('fetch', event => {
  // Solo richieste GET (evita di intercettare POST/altre)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      const networkFetch = fetch(event.request).then(response => {
        // Aggiorna la cache in background con la versione fresca
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached); // offline → usa la cache se la rete fallisce

      // Se in cache, rispondi subito (veloce) e aggiorna dietro le quinte;
      // altrimenti aspetta la rete
      return cached || networkFetch;
    })
  );
});
