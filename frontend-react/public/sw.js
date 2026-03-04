const CACHE_NAME = 'oslks-radar-v1';
const ASSETS = [
    '/',
    '/install',
    '/login',
    '/dashboard',
    '/icon.svg',
    '/icon.jpg',
];

self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((response) => {
            return response || fetch(e.request);
        }),
    );
});
