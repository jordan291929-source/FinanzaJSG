/* Service worker: deja la app usable sin internet.
   Sube CACHE cada vez que edites index.html o el vendor. */
const CACHE = 'finanzas-v3.0.0';
const SHELL = [
  './', './index.html', './manifest.webmanifest',
  './vendor/chart.umd.min.js', './vendor/jspdf.umd.min.js',
  './vendor/jspdf.plugin.autotable.min.js', './vendor/xlsx.full.min.js',
  './fonts/inter.css',
  './fonts/inter-latin-400-normal.woff2', './fonts/inter-latin-500-normal.woff2',
  './fonts/inter-latin-600-normal.woff2', './fonts/inter-latin-700-normal.woff2',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.allSettled(SHELL.map(u => c.add(new Request(u, {cache:'reload'})))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                      // el sync a Google es POST: pasa directo
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;       // nada de terceros

  // navegación: red primero, cache como respaldo (así ves los deploys nuevos)
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req)
      .then(r => { caches.open(CACHE).then(c => c.put(req, r.clone())); return r; })
      .catch(() => caches.match('./index.html').then(r => r || caches.match('./'))));
    return;
  }

  // estáticos: cache primero
  e.respondWith(caches.match(req).then(hit => hit || fetch(req)
    .then(r => { if (r.ok) caches.open(CACHE).then(c => c.put(req, r.clone())); return r; })));
});
