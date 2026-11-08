// service worker template, built into dist/sw.js by integrations/service-worker.mjs

const VERSION = '__VERSION__';
const PRECACHE = self.__PRECACHE__;

const SCOPE = new URL(self.registration.scope);
const abs = (path) => new URL(path, SCOPE).href;

const SHELL_CACHE = `shell-${VERSION}`;
const PAGE_CACHE = 'pages-v1';
const MEDIA_CACHE = 'media-v1';
const THUMB_CACHE = 'yt-thumbs-v1';
// photos saved with the button, never trimmed
const SAVED_CACHE = 'saved-v1';
const KNOWN = [SHELL_CACHE, PAGE_CACHE, MEDIA_CACHE, THUMB_CACHE, SAVED_CACHE];

const OFFLINE_URL = abs('offline/');
const NAV_TIMEOUT_MS = 3500;
const MAX_MEDIA = 250;
const MAX_THUMBS = 40;

// install: add files one by one (addAll fails on a single dropped request)
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await cache.add(new Request(OFFLINE_URL, { cache: 'reload' }));
      await Promise.allSettled(
        PRECACHE.map((p) => cache.add(new Request(abs(p), { cache: 'reload' }))),
      );
      await self.skipWaiting();
    })(),
  );
});

// activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => !KNOWN.includes(n)).map((n) => caches.delete(n)));
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
      await self.clients.claim();
    })(),
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  // oldest first
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));
}

async function put(cacheName, request, response) {
  if (!response || (!response.ok && response.type !== 'opaque')) return;
  const cache = await caches.open(cacheName);
  await cache.put(request, response);
}

// offline fallback: serve another cached size/format of the same photo
function photoFamily(url) {
  const file = url.pathname.split('/').pop() || '';
  // red-gele.DZ7XkbCQ_Zq2csu.avif -> red-gele.DZ7XkbCQ
  const m = file.match(/^(.*\.[\w-]{8})_[\w-]+\.\w+$/);
  return m ? m[1] : null;
}

async function anyVariantOf(url) {
  const family = photoFamily(url);
  if (!family) return undefined;
  for (const name of [SAVED_CACHE, MEDIA_CACHE, SHELL_CACHE]) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    const hit = keys.find((req) => new URL(req.url).pathname.includes(`/${family}_`));
    if (hit) return cache.match(hit);
  }
  return undefined;
}

async function pageStrategy(event) {
  const { request } = event;
  try {
    const preload = event.preloadResponse ? await event.preloadResponse : undefined;
    const response = preload || (await Promise.race([fetch(request), timeout(NAV_TIMEOUT_MS)]));
    event.waitUntil(put(PAGE_CACHE, request, response.clone()));
    return response;
  } catch {
    const cached =
      (await caches.match(request, { ignoreSearch: true })) ||
      (await caches.match(new URL(request.url).pathname.replace(/\/?$/, '/'), { ignoreSearch: true }));
    if (cached) return cached;
    event.waitUntil(fetch(request).then((r) => put(PAGE_CACHE, request, r)).catch(() => {}));
    return (await caches.match(OFFLINE_URL)) || Response.error();
  }
}

async function cacheFirst(event, cacheName, max) {
  const { request } = event;
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    event.waitUntil(put(cacheName, request, response.clone()).then(() => max && trim(cacheName, max)));
    return response;
  } catch (err) {
    if (request.destination === 'image') {
      const sibling = await anyVariantOf(new URL(request.url));
      if (sibling) return sibling;
    }
    throw err;
  }
}

async function staleWhileRevalidate(event, cacheName) {
  const { request } = event;
  const cached = await caches.match(request);
  const network = fetch(request)
    .then((response) => {
      event.waitUntil(put(cacheName, request, response.clone()));
      return response;
    })
    .catch(() => cached || Response.error());
  return cached || network;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(pageStrategy(event));
    return;
  }

  if (url.hostname === 'i.ytimg.com') {
    event.respondWith(cacheFirst(event, THUMB_CACHE, MAX_THUMBS));
    return;
  }

  // leave the youtube player alone
  if (url.origin !== SCOPE.origin) return;

  if (request.destination === 'image') {
    event.respondWith(cacheFirst(event, MEDIA_CACHE, MAX_MEDIA));
    return;
  }

  if (url.pathname.includes('/_astro/')) {
    event.respondWith(cacheFirst(event, SHELL_CACHE));
    return;
  }

  event.respondWith(staleWhileRevalidate(event, PAGE_CACHE));
});

// "save photos for offline" button. downloads one at a time and reports progress
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type !== 'CACHE_URLS' || !Array.isArray(data.urls)) return;
  const port = event.ports && event.ports[0];

  event.waitUntil(
    (async () => {
      const cache = await caches.open(SAVED_CACHE);
      let done = 0;
      let failed = 0;
      for (const u of data.urls) {
        const href = new URL(u, SCOPE).href;
        if (new URL(href).origin !== SCOPE.origin) continue;
        try {
          if (!(await cache.match(href))) {
            const res = await fetch(href);
            if (!res.ok) throw new Error(String(res.status));
            await cache.put(href, res);
          }
          done++;
        } catch {
          failed++;
        }
        port && port.postMessage({ type: 'progress', done, failed, total: data.urls.length });
      }
      port && port.postMessage({ type: 'complete', done, failed, total: data.urls.length });
    })(),
  );
});
