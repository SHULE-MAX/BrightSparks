// ════════════════════════════════════════════════════════════════════════════
//  Service worker for the Bright Sparks Website Manager.
//
//  What it is for: staff install the dashboard on a phone or laptop, it opens
//  in its own window, and it starts instantly on a slow connection because the
//  shell is already on the device.
//
//  What it deliberately does NOT do: cache anything from Supabase. Every piece
//  of content in this app is live data that other staff may have just changed,
//  and a stale answer is worse than an honest error. Only the app's own files
//  are cached.
//
//  Raise VERSION to throw away every cached file on the next deploy. Editing
//  this file at all is what tells browsers a new worker exists, which is what
//  produces the "new version is ready" prompt in the dashboard.
// ════════════════════════════════════════════════════════════════════════════

const VERSION = 'v1';
const CACHE = `bsjs-manager-${VERSION}`;

// Files that are not referenced from index.html and so have to be listed.
const PRECACHE = [
  '/offline.html',
  '/manifest.webmanifest',
  '/logo.webp',
  '/logo-small.webp',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-192.png',
  '/icons/maskable-512.png',
  '/icons/apple-touch-icon.png',
];

// The compiled JavaScript and CSS have hashed names that change on every
// build, so they cannot be hard-coded here. Instead the worker fetches
// index.html and reads the names out of it.
const ASSET_HREF = /(?:src|href)="(\/assets\/[^"]+)"/g;

function assetsIn(html) {
  return [...html.matchAll(ASSET_HREF)].map((m) => m[1]);
}

/** Store index.html plus everything it loads, so a cold start works offline. */
async function cacheShell(cache) {
  // cache: 'reload' — never build the offline copy out of the HTTP cache.
  const res = await fetch('/', { cache: 'reload' });
  if (!res.ok) return;
  const html = await res.clone().text();
  await cache.put('/', res);
  await Promise.all(assetsIn(html).map((url) => cache.add(url).catch(() => {})));
}

/** Drop the JavaScript and CSS of previous builds; the shell names the current ones. */
async function pruneAssets(cache) {
  const shell = await cache.match('/');
  if (!shell) return;
  const keep = new Set(assetsIn(await shell.text()));
  for (const req of await cache.keys()) {
    const { pathname } = new URL(req.url);
    if (pathname.startsWith('/assets/') && !keep.has(pathname)) await cache.delete(req);
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(PRECACHE);
      await cacheShell(cache);
    })()
  );
  // No skipWaiting() here on purpose: replacing the worker underneath a page
  // that is mid-edit would be rude. The dashboard offers a Reload button
  // instead, which sends the message handled at the bottom of this file.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => n.startsWith('bsjs-manager-') && n !== CACHE).map((n) => caches.delete(n))
      );
      await pruneAssets(await caches.open(CACHE));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Supabase, the public website, TikTok embeds: straight to the network.
  if (url.origin !== self.location.origin) return;

  // The health check must reflect the real server, never a cached "ok".
  if (url.pathname === '/healthz') return;

  // Page loads: always try the network so a new deploy is picked up, and fall
  // back to the stored shell. The server answers every route with the same
  // index.html, so one cached copy under "/" serves /news, /gallery and the
  // rest.
  if (req.mode === 'navigate') {
    event.respondWith(navigation(req));
    return;
  }

  // The Supabase keys are generated per request by the server. Fresh when we
  // can, cached when we cannot — without it the app cannot even start offline.
  if (url.pathname === '/config.js') {
    event.respondWith(networkFirst(req));
    return;
  }

  // Hashed filenames can never go stale: a change means a new name.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(req));
    return;
  }

  event.respondWith(staleWhileRevalidate(req));
});

async function navigation(req) {
  const cache = await caches.open(CACHE);
  try {
    const fresh = await fetch(req);
    if (fresh.ok) cache.put('/', fresh.clone());
    return fresh;
  } catch {
    return (await cache.match('/')) || (await cache.match('/offline.html')) || Response.error();
  }
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const fresh = await fetch(req);
    if (fresh.ok) cache.put(req, fresh.clone());
    return fresh;
  } catch {
    return (await cache.match(req)) || Response.error();
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  const network = fetch(req)
    .then((res) => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => hit || Response.error());
  return hit || network;
}

// Sent by the dashboard when someone presses Reload on the update prompt.
self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});
