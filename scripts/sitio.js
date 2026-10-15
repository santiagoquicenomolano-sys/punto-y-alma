/* ============================================================
   PUNTO & ALMA · Sitio (UX e infraestructura compartida)
   - Enlace "saltar al contenido" y foco en <main>
   - Botón "volver arriba"
   - Registro del service worker (PWA, funciona sin conexión)
   - Aviso honesto de datos (se guarda en pa_aviso_datos)
   - Enlaces externos con rel="noopener noreferrer"
   ============================================================ */

(() => {
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  /* ---------- Saltar al contenido ---------- */
  const saltar = $('.saltar-contenido');
  const main = $('main');
  if (saltar && main) {
    saltar.addEventListener('click', (e) => {
      e.preventDefault();
      main.focus();
      main.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  /* ---------- Volver arriba ---------- */
  const botonSubir = document.createElement('button');
  botonSubir.className = 'volver-arriba';
  botonSubir.type = 'button';
  botonSubir.setAttribute('aria-label', 'Volver arriba');
  botonSubir.innerHTML = '<i class="fa-solid fa-arrow-up" aria-hidden="true"></i>';
  botonSubir.hidden = true;
  document.body.appendChild(botonSubir);
  const alternarSubir = () => {
    botonSubir.hidden = window.scrollY < 600;
  };
  window.addEventListener('scroll', alternarSubir, { passive: true });
  alternarSubir();
  botonSubir.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  /* ---------- Service worker (PWA) ---------- */
  if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }

  /* ---------- Enlaces externos ---------- */
  $$('a[target="_blank"]').forEach((a) => {
    const rel = (a.getAttribute('rel') || '').split(/\s+/);
    if (!rel.includes('noopener')) rel.push('noopener');
    if (!rel.includes('noreferrer')) rel.push('noreferrer');
    a.setAttribute('rel', rel.join(' ').trim());
  });

  /* ---------- Aviso honesto de datos ---------- */
  const CLAVE = 'pa_aviso_datos';
  const leer = (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  };
  const guardar = (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* sin almacenamiento: el aviso simplemente no se recuerda */
    }
  };

  const banner = document.createElement('div');
  banner.className = 'aviso-datos';
  banner.id = 'aviso-datos';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'Aviso de datos');
  banner.innerHTML = `
    <div class="aviso-datos-caja">
      <i class="fa-solid fa-shield-halved" aria-hidden="true"></i>
      <p><strong>Tu información se queda aquí.</strong> No usamos cookies de rastreo ni analítica.
      Guardamos tu carrito, tus creaciones y tu cuenta solo en este navegador.
      <a href="cookies.html" class="aviso-datos-enlace">Mira qué guardamos</a>.</p>
      <button type="button" class="aviso-datos-cerrar" aria-label="Cerrar aviso">
        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
      </button>
    </div>`;
  document.body.appendChild(banner);

  const cerrar = () => {
    banner.hidden = true;
    guardar(CLAVE, '1');
  };
  if (!leer(CLAVE)) banner.hidden = false;
  banner.querySelector('.aviso-datos-cerrar').addEventListener('click', cerrar);
  banner.querySelector('.aviso-datos-enlace').addEventListener('click', cerrar);
})();
