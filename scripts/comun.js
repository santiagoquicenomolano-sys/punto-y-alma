/* ============================================================
   PUNTO & ALMA · Utilidades compartidas de la tienda
   Se carga después de catalogo.js en todas las páginas.

   Qué resuelve:
   - Escapar texto antes de meterlo en el HTML.
   - Pintar la tarjeta de producto una sola vez (tienda, relacionados,
     favoritos y el asistente de IA usan la misma).
   - Lista de favoritos y productos vistos recientemente.
   - Añadir al carrito con aviso, animación y badge sincronizado.
   - Delegación de eventos, para que los botones funcionen aunque
     el HTML se genere después.
   ============================================================ */
(() => {
  /* ---------- Texto seguro y formato ---------- */
  const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

  const precio = (n) => '$' + Number(n || 0).toLocaleString('es-CO');

  const normalizar = (s) =>
    String(s ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const api = () => window.PACatalogo;

  const estrellasHTML = (rating) => {
    const n = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
    let html = '';
    for (let i = 1; i <= 5; i++) {
      html += i <= n
        ? '<i class="fa-solid fa-star" aria-hidden="true"></i>'
        : '<i class="fa-regular fa-star" aria-hidden="true"></i>';
    }
    return html;
  };

  const descuentoDe = (p) =>
    p.precioAntes && p.precioAntes > p.precio
      ? Math.round((1 - p.precio / p.precioAntes) * 100)
      : 0;

  /* ---------- Insignias y precios ---------- */
  const claseInsignia = (p) => {
    if (p.tipo === 'digital') return 'insignia-digital';
    if (descuentoDe(p)) return 'insignia-oferta';
    if (p.insignia === 'Más vendido') return 'insignia-popular';
    return '';
  };

  const insigniaHTML = (p) =>
    p.insignia ? `<span class="insignia ${claseInsignia(p)}">${esc(p.insignia)}</span>` : '';

  const precioHTML = (p, clases = 'precio') => {
    const dto = descuentoDe(p);
    return `<p class="${clases}">
      ${precio(p.precio)}
      ${p.precioAntes ? `<s>${precio(p.precioAntes)}</s>${dto ? `<span class="precio-dto">-${dto}%</span>` : ''}` : ''}
    </p>`;
  };

  /* ---------- Tarjeta de producto (un solo lugar, tres usos) ---------- */
  const tarjetaProductoHTML = (p, opciones = {}) => {
    const { compacta = false, motivo = '' } = opciones;
    const guardado = esFavorito(p.id);

    return `
      <article class="producto reveal visible" data-id="${esc(p.id)}">
        <a class="producto-imagen" href="producto.html?id=${encodeURIComponent(p.id)}"
           aria-label="Ver detalles de ${esc(p.nombre)}">
           <picture><source srcset="${esc(p.imagen.replace(/\.jpg$/i, '.webp'))}" type="image/webp"><img src="${esc(p.imagen)}" alt="${esc(p.nombre)}" loading="lazy" width="600" height="600" decoding="async"></picture>
          ${insigniaHTML(p)}
          <button class="btn-mirar" type="button" data-mirar="${esc(p.id)}"
                  aria-label="Vista rápida de ${esc(p.nombre)}" title="Vista rápida">
            <i class="fa-solid fa-eye" aria-hidden="true"></i>
          </button>
          <button class="btn-fav ${guardado ? 'activo' : ''}" type="button" data-fav="${esc(p.id)}"
                  aria-pressed="${guardado}"
                  aria-label="${guardado ? 'Quitar de favoritos' : 'Guardar en favoritos'}"
                  title="${guardado ? 'Quitar de favoritos' : 'Guardar en favoritos'}">
            <i class="${guardado ? 'fa-solid' : 'fa-regular'} fa-heart" aria-hidden="true"></i>
          </button>
        </a>
        <div class="producto-info">
          <p class="producto-cat">${esc(p.categoria)}</p>
          <h3><a href="producto.html?id=${encodeURIComponent(p.id)}">${esc(p.nombre)}</a></h3>
          <div class="producto-valoracion">
            <div class="estrellas" aria-label="${p.rating} de 5">${estrellasHTML(p.rating)}</div>
            ${Number(p.reseñas) ? `<span class="conteo-resenas">(${Number(p.reseñas)})</span>` : ''}
          </div>
          ${motivo ? `<p class="producto-motivo">${esc(motivo)}</p>` : ''}
          ${compacta ? '' : `<p class="producto-stock"><i class="fa-solid fa-box-open" aria-hidden="true"></i> ${esc(p.stock || '')}</p>`}
          <div class="producto-pie">
            ${precioHTML(p)}
            <button class="btn-agregar" type="button" data-agregar="${esc(p.id)}" data-nombre="${esc(p.nombre)}">
              <i class="fa-solid fa-cart-plus" aria-hidden="true"></i><span>Añadir</span>
            </button>
          </div>
        </div>
      </article>`;
  };

  /* ---------- Favoritos ---------- */
  const CLAVE_FAVS = 'pa_favoritos';

  const leerFavs = () => {
    try {
      const datos = JSON.parse(localStorage.getItem(CLAVE_FAVS));
      return Array.isArray(datos) ? datos : [];
    } catch {
      return [];
    }
  };

  const guardarFavs = (lista) => {
    try {
      localStorage.setItem(CLAVE_FAVS, JSON.stringify(lista));
    } catch {
      /* sin almacenamiento */
    }
    window.dispatchEvent(new CustomEvent('pa:favoritos'));
  };

  const esFavorito = (id) => leerFavs().includes(String(id));

  const alternarFav = (id) => {
    const clave = String(id);
    const lista = leerFavs();
    const i = lista.indexOf(clave);
    if (i >= 0) lista.splice(i, 1);
    else lista.push(clave);
    guardarFavs(lista);
    return i < 0;
  };

  /* ---------- Vistos recientemente ---------- */
  const CLAVE_MIRADOS = 'pa_vistos';

  const registrarVisto = (id) => {
    try {
      const clave = String(id);
      const lista = JSON.parse(localStorage.getItem(CLAVE_MIRADOS)) || [];
      const limpio = lista.filter((x) => x !== clave);
      limpio.unshift(clave);
      localStorage.setItem(CLAVE_MIRADOS, JSON.stringify(limpio.slice(0, 8)));
    } catch {
      /* sin almacenamiento */
    }
    window.dispatchEvent(new CustomEvent('pa:visto'));
  };

  const vistos = () => {
    try {
      const lista = JSON.parse(localStorage.getItem(CLAVE_MIRADOS)) || [];
      const productos = api() ? api().obtener() : [];
      return lista.map((id) => productos.find((p) => p.id === id)).filter(Boolean);
    } catch {
      return [];
    }
  };

  /* ---------- Aviso (toast) ---------- */
  const obtenerToast = () => {
    let t = document.getElementById('toast');
    if (!t) {
      t = document.createElement('div');
      t.className = 'toast';
      t.id = 'toast';
      t.setAttribute('role', 'status');
      t.setAttribute('aria-live', 'polite');
      t.hidden = true;
      document.body.appendChild(t);
    }
    return t;
  };

  let temporizadorToast = null;
  const aviso = (mensaje, icono = 'fa-circle-check') => {
    const t = obtenerToast();
    if (!t) return;
    t.innerHTML = `<i class="fa-solid ${icono}" aria-hidden="true"></i> ${mensaje}`;
    t.hidden = false;
    requestAnimationFrame(() => t.classList.add('mostrar'));
    clearTimeout(temporizadorToast);
    temporizadorToast = setTimeout(() => {
      t.classList.remove('mostrar');
      setTimeout(() => {
        t.hidden = true;
      }, 380);
    }, 2600);
  };

  /* ---------- Carrito ---------- */
  const obtenerBadge = () => document.querySelector('.contador-carrito');

  const pintarBadge = (conPop) => {
    const badge = obtenerBadge();
    if (!badge || !window.PACarrito) return;
    badge.textContent = window.PACarrito.contar();
    if (conPop) {
      badge.classList.remove('pop');
      void badge.offsetWidth;
      badge.classList.add('pop');
    }
  };

  const agregarAlCarrito = (id, cantidad = 1, opciones = {}) => {
    if (!window.PACarrito) return;
    const carrito = window.PACarrito.agregar(id, cantidad);
    pintarBadge(true);
    if (!opciones.silencioso) {
      const p = api() ? api().buscarProducto(id) : null;
      const nombre = (p && p.nombre) || opciones.nombre || 'tu pieza';
      aviso(`¡${nombre} añadido a tu carrito!`);
    }
    return carrito;
  };

  /* ---------- Delegación global ---------- */
  document.addEventListener('click', (e) => {
    const botonFav = e.target.closest('[data-fav]');
    if (botonFav) {
      e.preventDefault();
      e.stopPropagation();
      const id = botonFav.dataset.fav;
      const ahoraEsFav = alternarFav(id);
      // Refleja el cambio en todas las tarjetas del mismo producto.
      document.querySelectorAll(`[data-fav="${CSS.escape(id)}"]`).forEach((b) => {
        b.classList.toggle('activo', ahoraEsFav);
        b.setAttribute('aria-pressed', String(ahoraEsFav));
        const icono = b.querySelector('i');
        if (icono) icono.className = `${ahoraEsFav ? 'fa-solid' : 'fa-regular'} fa-heart`;
      });
      const p = api() ? api().buscarProducto(id) : null;
      aviso(
        ahoraEsFav ? `Guardé ${p ? p.nombre : 'esa pieza'} en favoritos.` : 'Lo quité de tus favoritos.',
        ahoraEsFav ? 'fa-heart' : 'fa-circle-info'
      );
      return;
    }

    const botonAdd = e.target.closest('[data-agregar]');
    if (botonAdd) {
      e.preventDefault();
      agregarAlCarrito(botonAdd.dataset.agregar, 1, { nombre: botonAdd.dataset.nombre });
    }
  });

  window.addEventListener('pa:carrito', () => pintarBadge(false));
  document.addEventListener('DOMContentLoaded', () => pintarBadge(false));

  /* ---------- Boletín ----------
     El correo se guarda en pa_boletin y además queda anotado en la
     bitácora (pa_registros) para que el panel vea quién se inscrió. */
  const CLAVE_BOLETIN = 'pa_boletin';

  const boletin = () => {
    try {
      const crudo = localStorage.getItem(CLAVE_BOLETIN);
      const datos = crudo ? JSON.parse(crudo) : [];
      return Array.isArray(datos) ? datos : [];
    } catch {
      return [];
    }
  };

  /* Devuelve 'nuevo', 'repetido' o 'invalido'. */
  const suscribirBoletin = (correo, opciones = {}) => {
    const registro = window.PARegistro;
    if (registro && registro.suscribir) return registro.suscribir(correo, opciones);

    /* Respaldo por si la bitácora no llegó a cargar. */
    const limpio = String(correo || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpio)) return 'invalido';
    const lista = boletin();
    const yaEsta = lista.some((x) => String(typeof x === 'string' ? x : x.correo) === limpio);
    if (!yaEsta) {
      try {
        localStorage.setItem(
          CLAVE_BOLETIN,
          JSON.stringify([...lista, { correo: limpio, fecha: new Date().toISOString() }])
        );
      } catch {
        /* sin almacenamiento */
      }
    }
    return yaEsta ? 'repetido' : 'nuevo';
  };

  /* ---------- API pública ---------- */
  window.PAComun = {
    esc,
    precio,
    normalizar,
    estrellasHTML,
    descuentoDe,
    claseInsignia,
    insigniaHTML,
    precioHTML,
    tarjetaProductoHTML,
    esFavorito,
    alternarFav,
    favs: leerFavs,
    registrarVisto,
    vistos,
    aviso,
    pintarBadge,
    agregarAlCarrito,
    boletin,
    suscribirBoletin,
    CLAVE_FAVS,
    CLAVE_BOLETIN,
  };
})();