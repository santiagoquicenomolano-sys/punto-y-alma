/* ============================================================
   PUNTO & ALMA · Página de detalle de producto
   Toma el id de la URL (?id=...), busca en el catálogo vivo y
   construye la ficha: galería, precio, beneficios, compra y
   productos relacionados.
   ============================================================ */
(() => {
  const C = window.PAComun;
  const IA = window.PAIA;
  const api = window.PACatalogo;
  const esc = (s) => C.esc(s);
  const precio = (n) => C.precio(n);

  /* ---------- Badge del carrito ---------- */
  const pintarBadge = () => C.pintarBadge(false);
  pintarBadge();
  window.addEventListener('pa:carrito', pintarBadge);

  /* ---------- Animaciones ---------- */
  const observarRevelar = () => {
    const elementos = document.querySelectorAll('.reveal:not(.visible)');
    if (!elementos.length) return;
    if (!('IntersectionObserver' in window)) {
      elementos.forEach((el) => el.classList.add('visible'));
      return;
    }
    const obs = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((entrada) => {
          if (entrada.isIntersecting) {
            entrada.target.classList.add('visible');
            obs.unobserve(entrada.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    elementos.forEach((el) => obs.observe(el));
  };

  /* ---------- Comportamientos del encabezado ---------- */
  const botonMenu = document.getElementById('boton-menu');
  const menu = document.getElementById('menu');
  if (botonMenu && menu) {
    botonMenu.addEventListener('click', () => {
      const abierto = menu.classList.toggle('abierto');
      botonMenu.setAttribute('aria-expanded', abierto ? 'true' : 'false');
      botonMenu.innerHTML = abierto
        ? '<i class="fa-solid fa-xmark" aria-hidden="true"></i>'
        : '<i class="fa-solid fa-bars" aria-hidden="true"></i>';
    });
    menu.querySelectorAll('a').forEach((enlace) => {
      enlace.addEventListener('click', () => {
        menu.classList.remove('abierto');
        botonMenu.setAttribute('aria-expanded', 'false');
        botonMenu.innerHTML = '<i class="fa-solid fa-bars" aria-hidden="true"></i>';
      });
    });
  }

  const encabezado = document.querySelector('.encabezado');
  if (encabezado) {
    window.addEventListener(
      'scroll',
      () => encabezado.classList.toggle('con-sombra', window.scrollY > 10),
      { passive: true }
    );
  }

  const formBoletin = document.getElementById('form-boletin');
  const mensajeBoletin = document.getElementById('mensaje-boletin');
  if (formBoletin) {
    formBoletin.addEventListener('submit', (e) => {
      e.preventDefault();
      const correo = formBoletin.querySelector('input');
      if (!correo.checkValidity()) {
        correo.reportValidity();
        return;
      }
      /* Guardar el correo también lo apunta en la bitácora del panel. */
      if (window.PAComun && window.PAComun.suscribirBoletin) {
        window.PAComun.suscribirBoletin(correo.value, { donde: 'Boletín de la ficha' });
      }
      mensajeBoletin.hidden = false;
      correo.value = '';
      setTimeout(() => {
        mensajeBoletin.hidden = true;
      }, 6000);
    });
  }

  /* ---------- Buscar el producto en la URL ---------- */
  const params = new URLSearchParams(location.search);
  const id = (params.get('id') || '').toLowerCase();
  const producto = id ? api.buscarProducto(id) : null;
  const contenedor = document.getElementById('detalle-producto');

  if (!producto) {
    contenedor.innerHTML = `
      <div class="no-encontrado">
        <i class="fa-solid fa-heart-crack" aria-hidden="true"></i>
        <h2>Este tesoro se nos extravió</h2>
        <p>No encontramos ese producto. Vuelve a la tienda y elige tu próxima pieza favorita.</p>
        <a class="boton" href="index.html#productos">Volver a la tienda</a>
      </div>`;
    observarRevelar();
    return;
  }

  document.title = `${producto.nombre} · Punto & Alma`;
  C.registrarVisto(producto.id);

  /* ---------- SEO de la ficha: título, canonical y datos estructurados ---------- */
  const BASE = 'https://puntoyalma.co/';
  const absoluta = (ruta) => (/^https?:/i.test(ruta) ? ruta : BASE + String(ruta || '').replace(/^\.?\//, ''));
  const urlProducto = `${BASE}producto.html?id=${encodeURIComponent(producto.id)}`;
  const resumen = String(producto.descripcion || '').slice(0, 158);
  const tituloSEO = `${producto.nombre} · Punto & Alma`;

  const ponerMeta = (selector, valor, atributo = 'content') => {
    const el = document.querySelector(selector);
    if (el) el.setAttribute(atributo, valor);
  };

  document.title = tituloSEO;
  ponerMeta('meta[name="description"]', resumen);
  ponerMeta('link[rel="canonical"]', urlProducto, 'href');
  ponerMeta('meta[property="og:title"]', tituloSEO);
  ponerMeta('meta[property="og:description"]', resumen);
  ponerMeta('meta[property="og:url"]', urlProducto);
  ponerMeta('meta[property="og:image"]', absoluta(producto.imagen));
  ponerMeta('meta[name="twitter:title"]', tituloSEO);
  ponerMeta('meta[name="twitter:description"]', resumen);
  ponerMeta('meta[name="twitter:image"]', absoluta(producto.imagen));

  const datosSchema = document.createElement('script');
  datosSchema.type = 'application/ld+json';
  datosSchema.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: producto.nombre,
    description: producto.descripcion,
    image: [absoluta(producto.imagen)],
    sku: producto.id,
    category: producto.categoria,
    brand: { '@type': 'Brand', name: 'Punto & Alma' },
    url: urlProducto,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: producto.rating,
      reviewCount: Number(producto.reseñas) || 0,
    },
    offers: {
      '@type': 'Offer',
      url: urlProducto,
      price: producto.precio,
      priceCurrency: 'COP',
      availability: 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: 'Punto & Alma' },
    },
  });
  document.head.appendChild(datosSchema);

  /* ---------- Construir la ficha ---------- */
  const descuento = C.descuentoDe(producto);

  const insigniaHTML = producto.insignia
    ? `<span class="insignia ${C.claseInsignia(producto)}">${esc(producto.insignia)}</span>`
    : '';

  const listaImagenes =
    producto.imagenes && producto.imagenes.length ? producto.imagenes : [producto.imagen];

  const miniaturasHTML = listaImagenes
    .map(
      (src, i) => `
      <button type="button" data-src="${esc(src)}" class="${i === 0 ? 'activo' : ''}"
              aria-label="Ver imagen ${i + 1} de ${esc(producto.nombre)}">
        <img src="${esc(src)}" alt="Vista ${i + 1} de ${esc(producto.nombre)}" loading="lazy" width="120" height="120" decoding="async">
      </button>`
    )
    .join('');

  const beneficiosHTML = (producto.beneficios || [])
    .map((b) => `<li><i class="fa-solid fa-circle-check" aria-hidden="true"></i> ${esc(b)}</li>`)
    .join('');

  const detallesHTML = (producto.detalles || [])
    .map((d) => `<li><i class="fa-solid fa-circle-dot" aria-hidden="true"></i> ${esc(d)}</li>`)
    .join('');

  const precioHTML = `
    <p class="precio-detalle">
      ${precio(producto.precio)}
      ${producto.precioAntes ? `<s>${precio(producto.precioAntes)}</s>${descuento ? `<span class="precio-dto">-${descuento}%</span>` : ''}` : ''}
    </p>`;

  const notaDigital =
    producto.tipo === 'digital'
      ? `<p class="nota-digital"><i class="fa-solid fa-download" aria-hidden="true"></i> Entrega digital inmediata tras el pago: lo recibes en tu correo en minutos.</p>`
      : `<div class="detalle-bloque">
           <h3><i class="fa-solid fa-shield-heart" aria-hidden="true"></i> Cuidados</h3>
           <p class="texto-gris">${esc(producto.cuidados)}</p>
         </div>`;

  const confianza =
    producto.tipo === 'digital'
      ? `<span><i class="fa-solid fa-lock" aria-hidden="true"></i> Pago seguro</span>
         <span><i class="fa-solid fa-download" aria-hidden="true"></i> Descarga inmediata</span>
         <span><i class="fa-solid fa-rotate-left" aria-hidden="true"></i> Devoluciones 15 días</span>
         <span><i class="fa-solid fa-heart" aria-hidden="true"></i> Asesoría incluida</span>`
      : `<span><i class="fa-solid fa-lock" aria-hidden="true"></i> Pago seguro</span>
         <span><i class="fa-solid fa-truck-fast" aria-hidden="true"></i> Envío 24-72 h</span>
         <span><i class="fa-solid fa-rotate-left" aria-hidden="true"></i> Devoluciones 15 días</span>
         <span><i class="fa-solid fa-gift" aria-hidden="true"></i> Empaque de regalo</span>`;

  const avisosIA = IA
    ? `<button class="btn-whats btn-ia" type="button" data-preguntar-ia="${esc(
        `¿Me cuentas más sobre ${producto.nombre}?`
      )}"><i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i> Pregúntale a Alma</button>`
    : '';

  contenedor.innerHTML = `
    <nav class="ruta" aria-label="Ruta de navegación">
      <a href="index.html">Inicio</a>
      <i class="fa-solid fa-angle-right" aria-hidden="true"></i>
      <a href="index.html#productos">Tienda</a>
      <i class="fa-solid fa-angle-right" aria-hidden="true"></i>
      <span>${esc(producto.nombre)}</span>
    </nav>

    <div class="detalle-grid">
      <div class="galeria">
        <div class="galeria-principal">
          <picture><source id="imagen-principal-webp" srcset="${esc(String(producto.imagen).replace(/\.jpg$/i, '.webp'))}" type="image/webp"><img id="imagen-principal" src="${esc(producto.imagen)}" alt="${esc(producto.nombre)}" width="800" height="800" fetchpriority="high" decoding="async"></picture>
          ${insigniaHTML}
          <button class="btn-fav ${C.esFavorito(producto.id) ? 'activo' : ''}" type="button"
                  data-fav="${esc(producto.id)}"
                  aria-pressed="${C.esFavorito(producto.id)}"
                  aria-label="Guardar en favoritos" title="Guardar en favoritos">
            <i class="${C.esFavorito(producto.id) ? 'fa-solid' : 'fa-regular'} fa-heart" aria-hidden="true"></i>
          </button>
        </div>
        <div class="galeria-mini" id="galeria-mini">${miniaturasHTML}</div>
      </div>

      <div class="detalle-info">
        <p class="producto-cat">${esc(producto.categoria)}</p>
        <h1>${esc(producto.nombre)}</h1>
        <div class="fila-resena">
          <div class="estrellas" aria-label="${producto.rating} de 5">${C.estrellasHTML(producto.rating)}</div>
          <p class="total-resenas">${producto.rating}.0 · ${Number(producto.reseñas) || 0} reseñas</p>
        </div>

        ${precioHTML}

        <p class="descripcion-detalle">${esc(producto.descripcion)}</p>
        <ul class="beneficios-lista">${beneficiosHTML}</ul>

        <div class="detalle-bloque">
          <h3>Especificaciones</h3>
          <ul>${detallesHTML}</ul>
        </div>

        ${notaDigital}

        <div class="comprar">
          <div class="cantidad" aria-label="Cantidad">
            <button type="button" id="cantidad-menos" aria-label="Disminuir cantidad"><i class="fa-solid fa-minus" aria-hidden="true"></i></button>
            <input id="cantidad-input" type="number" value="1" min="1" max="10" aria-label="Cantidad">
            <button type="button" id="cantidad-mas" aria-label="Aumentar cantidad"><i class="fa-solid fa-plus" aria-hidden="true"></i></button>
          </div>
          <button class="boton boton-comprar" type="button" id="agregar-carrito">
            <i class="fa-solid fa-cart-shopping" aria-hidden="true"></i> Añadir al carrito
          </button>
          <a class="btn-whats" id="comprar-whats" target="_blank" rel="noopener">
            <i class="fa-brands fa-whatsapp" aria-hidden="true"></i> Comprar ya
          </a>
          ${avisosIA}
        </div>

        <p class="stock"><i class="fa-solid ${producto.tipo === 'digital' ? 'fa-bolt' : 'fa-box-open'}" aria-hidden="true"></i> ${esc(producto.stock || '')}</p>

        <div class="confianza">${confianza}</div>
      </div>
    </div>`;

  /* ---------- Galería ---------- */
  const imagenPrincipal = document.getElementById('imagen-principal');
  const imagenPrincipalWebp = document.getElementById('imagen-principal-webp');
  const galeriaMini = document.getElementById('galeria-mini');

  galeriaMini.querySelectorAll('button').forEach((boton) => {
    boton.addEventListener('click', () => {
      galeriaMini.querySelectorAll('button').forEach((b) => b.classList.remove('activo'));
      boton.classList.add('activo');
      imagenPrincipal.classList.add('galeria-pop');
      imagenPrincipal.src = boton.dataset.src;
      if (imagenPrincipalWebp) imagenPrincipalWebp.srcset = String(boton.dataset.src || '').replace(/\.jpg$/i, '.webp');
      requestAnimationFrame(() => imagenPrincipal.classList.remove('galeria-pop'));
    });
  });

  /* ---------- Cantidad ---------- */
  const entradaCantidad = document.getElementById('cantidad-input');
  const botonMenos = document.getElementById('cantidad-menos');
  const botonMas = document.getElementById('cantidad-mas');

  const ajustarCantidad = (delta) => {
    const actual = Number(entradaCantidad.value) || 1;
    entradaCantidad.value = Math.min(10, Math.max(1, actual + delta));
  };

  botonMenos.addEventListener('click', () => ajustarCantidad(-1));
  botonMas.addEventListener('click', () => ajustarCantidad(1));
  entradaCantidad.addEventListener('change', () => {
    entradaCantidad.value = Math.min(10, Math.max(1, Number(entradaCantidad.value) || 1));
  });

  /* ---------- Añadir al carrito ---------- */
  document.getElementById('agregar-carrito').addEventListener('click', () => {
    C.agregarAlCarrito(producto.id, Number(entradaCantidad.value) || 1);
  });

  /* ---------- Preguntar a Alma sobre este producto ---------- */
  const botonIA = contenedor.querySelector('[data-preguntar-ia]');
  if (botonIA) {
    botonIA.addEventListener('click', () => {
      const fab = document.getElementById('ia-fab');
      if (fab) fab.click();
      setTimeout(() => {
        const chip = Array.from(document.querySelectorAll('#ia-chips .ia-chip')).find((c) =>
          /recomend/i.test(c.dataset.chip || '')
        );
        if (chip) chip.click();
      }, 400);
    });
  }

  /* ---------- Comprar por WhatsApp ---------- */
  const mensajeWhats = `¡Hola Punto & Alma! 🌿 Me interesa comprar *${producto.nombre}* (${precio(
    producto.precio
  )}). ¿Está disponible?`;
  document.getElementById('comprar-whats').href =
    'https://wa.me/573136384065?text=' + encodeURIComponent(mensajeWhats);

  /* ---------- Productos relacionados ---------- */
  const relacionados = api
    .obtener()
    .filter((p) => p.id !== producto.id)
    .sort((a, b) => {
      const mismaA = a.categoria === producto.categoria ? 1 : 0;
      const mismaB = b.categoria === producto.categoria ? 1 : 0;
      return mismaB - mismaA || (b.reseñas || 0) - (a.reseñas || 0);
    })
    .slice(0, 3);

  const grid = document.getElementById('relacionados-grid');
  grid.innerHTML = relacionados
    .map((p) =>
      C.tarjetaProductoHTML(p, { motivo: p.categoria === producto.categoria ? 'De la misma colección' : '' })
    )
    .join('');

  observarRevelar();
})();