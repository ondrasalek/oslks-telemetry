const CACHE_NAME = 'oslks-radar-v2';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/icon.svg',
    '/icon.jpg',
    '/manifest.json',
];

// Install: Cache essential assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        }),
    );
    self.skipWaiting();
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                }),
            );
        }),
    );
    self.clients.claim();
});

// Fetch: Network First for navigation, Stale-While-Revalidate for others
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Bypass cache for API, WebSockets, and Collector routes
    if (
        url.pathname.startsWith('/api/') ||
        url.pathname.startsWith('/ws') ||
        url.pathname.startsWith('/assets/v1/') ||
        event.request.method !== 'GET'
    ) {
        return;
    }

    // Network First for navigation (ensures latest dashboard/login code)
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(
                () =>
                    caches.match('/index.html') || caches.match(event.request),
            ),
        );
        return;
    }

    // Stale-While-Revalidate for static assets
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then(
                (networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return networkResponse;
                },
            );
            return cachedResponse || fetchPromise;
        }),
    );
});
