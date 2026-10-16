/* ============================================================
   PUNTO & ALMA · Service Worker
   Estrategia:
   - Instalación: guarda la "carcasa" (HTML, CSS, JS, iconos).
   - Navegación: primero la red; si falla, lo guardado; si no hay, offline.html.
   - Recursos estáticos: primero la caché y la actualiza en segundo plano.
   - CDN (Google Fonts, Font Awesome): red, con caché de respaldo.

   Para publicar una versión nueva: sube CACHE a punto-alma-v2, v3...
   ============================================================ */

const CACHE = 'punto-alma-v5';

const SHELL = [
  'index.html',
  'producto.html',
  'ayuda.html',
  'privacidad.html',
  'terminos.html',
  'cookies.html',
  'offline.html',
  '404.html',
  'estilos/style.css',
  'estilos/texturas.css',
  'estilos/tienda.css',
  'estilos/carrusel.css',
  'estilos/asistente.css',
  'estilos/ayuda.css',
  'estilos/acceso.css',
  'estilos/perfil.css',
  'estilos/admin.css',
  'estilos/producto.css',
  'estilos/legal.css',
  'scripts/auth.js',
  'scripts/catalogo.js',
  'scripts/contenido.js',
  'scripts/db.js',
  'scripts/comun.js',
  'scripts/registro.js',
  'scripts/carrito.js',
  'scripts/ia.js',
  'scripts/asistente.js',
  'scripts/app.js',
  'scripts/producto.js',
  'scripts/perfil.js',
  'scripts/admin.js',
  'scripts/ayuda.js',
  'scripts/acceso.js',
  'scripts/sitio.js',
  'recursos/favicon.svg',
  'recursos/img/icono-512.png',
  'recursos/img/icono-192.png',
  'recursos/img/icono-maskable-512.png',
  'recursos/img/apple-touch-icon.png',
  'recursos/img/icono-32.png',
  'sitio.webmanifest',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Navegación: red primero, caché como respaldo.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copia));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('offline.html')))
    );
    return;
  }

  // Recursos estáticos: caché primero, actualiza en segundo plano.
  e.respondWith(
    caches.match(req).then((cached) => {
      const red = fetch(req)
        .then((res) => {
          if (res && (res.status === 200 || res.type === 'opaque')) {
            const copia = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copia));
          }
          return res;
        })
        .catch(() => cached);
      return cached || red;
    })
  );
});
