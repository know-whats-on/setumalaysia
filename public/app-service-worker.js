const params = new URL(self.location.href).searchParams;
const rawVariant = params.get('variant') || 'ghar';
const normalizedVariant = String(rawVariant).trim().toLowerCase().replace(/-/g, '_');
const appVariant = ['ghar', 'burb_mate', 'setu_china', 'jom_settle'].includes(normalizedVariant)
  ? normalizedVariant
  : 'ghar';
const STATIC_CACHE_VERSION = 'static-v3';
const CACHE_NAME = `${appVariant}-${STATIC_CACHE_VERSION}`;
const MANAGED_CACHE_PREFIXES = ['ghar-', 'burb_mate-', 'setu_china-', 'jom_settle-'];

function isManagedOldCache(key) {
  return MANAGED_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix)) && key !== CACHE_NAME;
}

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter(isManagedOldCache).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.pathname.includes('/functions/') || url.hostname !== self.location.hostname) return;

  const acceptsHtml = event.request.headers.get('accept')?.includes('text/html');
  const isNavigation = event.request.mode === 'navigate' || acceptsHtml;
  if (isNavigation) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

  const cacheableDestination = ['script', 'style', 'image', 'font', 'manifest'].includes(event.request.destination);
  const cacheablePath = url.pathname.startsWith('/assets/') || /\.(?:js|css|png|jpg|jpeg|webp|gif|svg|ico|woff2?)$/i.test(url.pathname);
  if (!cacheableDestination && !cacheablePath) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    }),
  );
});
