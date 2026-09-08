// Service Worker de MeGa (portal inquilino) — MeGa Consultora
// Estrategia: "network-first" para todo. Como esta app cambia seguido,
// siempre se intenta traer la versión más nueva de la red primero; la
// caché solo se usa como respaldo si no hay conexión.
const CACHE_NAME = 'mega-inquilinos-v2';
const ARCHIVOS_BASICOS = ['./', './index.html', './manifest.json'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ARCHIVOS_BASICOS).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nombres) =>
      Promise.all(nombres.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((respuesta) => {
        const copia = respuesta.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia)).catch(() => {});
        return respuesta;
      })
      .catch(() => caches.match(event.request))
  );
});

// --- Notificaciones push ---
self.addEventListener('push', (event) => {
  let datos = { title: 'MeGa Consultora', body: 'Tenés una novedad en el portal.' };
  try { if (event.data) datos = { ...datos, ...event.data.json() }; } catch (e) {}
  event.waitUntil(
    self.registration.showNotification(datos.title, {
      body: datos.body,
      icon: 'icon-192.png',
      badge: 'icon-96.png',
      data: { url: datos.url || './' },
      tag: datos.tag || undefined
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || './';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((lista) => {
      for (const c of lista) {
        if (c.url.includes(self.registration.scope) && 'focus' in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
