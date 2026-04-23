// Service Worker pour le cache des ressources statiques
const CACHE_NAME = 'eversun-v1';
const STATIC_CACHE_URLS = [
  '/',
  '/_next/static/',
  '/api/clients',
];

// Installation du service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_CACHE_URLS);
    })
  );
  // Forcer l'activation immédiate
  self.skipWaiting();
});

// Activation du service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Prendre le contrôle immédiatement
  self.clients.claim();
});

// Interception des requêtes
self.addEventListener('fetch', (event) => {
  // Ne cache que les requêtes GET
  if (event.request.method !== 'GET') return;

  // Stratégie Cache First pour les ressources statiques
  if (event.request.url.includes('/_next/static/') ||
      event.request.url.includes('.css') ||
      event.request.url.includes('.js')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((response) => {
          // Cache la réponse pour les futures requêtes
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        });
      })
    );
  }

  // Network First pour les API (avec fallback au cache)
  else if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache les réponses API réussies
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback au cache si réseau indisponible
          return caches.match(event.request);
        })
    );
  }
});