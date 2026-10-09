// Sidelyne Sports service worker: makes the site installable and keeps the app shell available offline.
// Network-first, so you always get the newest deploy when online. Live data (/api, /.netlify/functions) is never cached.
const CACHE = 'sidelyne-v5';
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/', '/icons/icon-192.png'])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/') || u.pathname.startsWith('/.netlify/')) return;
  e.respondWith(
    fetch(r).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(r, copy)); } return res; })
      .catch(() => caches.match(r).then((hit) => hit || (r.mode === 'navigate' ? caches.match('/') : Response.error())))
  );
});
