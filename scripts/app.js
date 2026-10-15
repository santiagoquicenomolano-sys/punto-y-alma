/* ============================================================
   PUNTO & ALMA · Portada de la tienda
   Pinta el catálogo desde el código (o desde el panel), aplica
   búsqueda, filtros y orden, y suma favoritos y vista rápida.
   ============================================================ */
(() => {
  const C = window.PAComun;
  const $ = (sel) => document.querySelector(sel);
  const api = () => window.PACatalogo;
  const todos = () => (api() ? api().obtener() : []);

  /* ---------- 1. Aparición al hacer scroll ---------- */
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

  /* ---------- 2. Estado de la tienda ---------- */
  const estado = {
    busqueda: '',
    categoria: 'todas',
    orden: 'destacados',
    soloStock: false,
  };

  const categoriasUnicas = () => [...new Set(todos().map((p) => p.categoria))];

  /* Un número alto = más interesante para mostrarlo primero. */
  const puntaje = (p) => {
    let s = Number(p.reseñas) || 0;
    if (p.insignia === 'Más vendido') s += 400;
    if (p.insignia === 'Nuevo') s += 300;
    if (p.insignia === 'Edición') s += 250;
    s += C.descuentoDe(p) * 6;
    s += (Number(p.rating) || 0) * 40;
    return s;
  };

  const coincide = (p) => {
    if (estado.categoria !== 'todas' && p.categoria !== estado.categoria) return false;
    if (estado.soloStock && /solo quedan/i.test(p.stock || '')) return false;
    const q = C.normalizar(estado.busqueda).trim();
    if (!q) return true;
    const palabras = q.split(/\s+/).filter(Boolean);
    const texto = C.normalizar(
      [p.nombre, p.categoria, p.descripcion, p.stock, (p.beneficios || []).join(' ')].join(' ')
    );
    return palabras.every((palabra) => texto.includes(palabra));
  };

  const ordenar = (lista) => {
    const l = [...lista];
    switch (estado.orden) {
      case 'precio-asc':
        return l.sort((a, b) => a.precio - b.precio);
      case 'precio-desc':
        return l.sort((a, b) => b.precio - a.precio);
      case 'calificacion':
        return l.sort((a, b) => b.rating - a.rating || puntaje(b) - puntaje(a));
      case 'novedades':
        return l.sort((a, b) => puntaje(b) - puntaje(a));
      case 'resenas':
        return l.sort((a, b) => (b.reseñas || 0) - (a.reseñas || 0));
      default:
        return l.sort((a, b) => puntaje(b) - puntaje(a));
    }
  };

  /* ---------- 3. Pintar la rejilla ---------- */
  const gridProductos = $('#grid-productos');
  const gridPatrones = $('#grid-patrones');
  const contadorResultados = $('#contador-resultados');

  const mensajeVacio = (texto, sub) => `
    <div class="vacio-busqueda">
      <i class="fa-solid fa-magnifying-glass-minus" aria-hidden="true"></i>
      <b>${C.esc(texto)}</b>
      <span>${C.esc(sub)}</span>
    </div>`;

  const pintarTienda = () => {
    if (!gridProductos || !gridPatrones) return;

    const filtrados = ordenar(todos().filter((p) => p.tipo !== 'digital' && coincide(p)));
    const digitales = ordenar(todos().filter((p) => p.tipo === 'digital' && coincide(p)));

    gridProductos.innerHTML = filtrados.length
      ? filtrados.map((p) => C.tarjetaProductoHTML(p)).join('')
      : mensajeVacio('No encontramos piezas con eso', 'Prueba con otra palabra o quita los filtros.');

    gridPatrones.innerHTML = digitales.length
      ? digitales.map((p) => C.tarjetaProductoHTML(p)).join('')
      : mensajeVacio('Sin patrones por ahora', 'Todavía no hay patrones que coincidan con tu búsqueda.');

    const total = filtrados.length + digitales.length;
    if (contadorResultados) {
      contadorResultados.textContent =
        total === 0
          ? 'Sin resultados'
          : `${total} ${total === 1 ? 'pieza' : 'piezas'}`;
    }

    if (typeof window.PAFC === 'function') window.PAFC().pintar(estado);
    observarRevelar();
  };

  /* ---------- 4. Barra de herramientas ---------- */
  const pintarCategorias = () => {
    const cont = $('#filtro-categorias');
    if (!cont) return;
    const cats = categoriasUnicas();
    const opciones = [{ valor: 'todas', etiqueta: 'Todo', icono: 'fa-border-all' }].concat(
      cats.map((c) => ({ valor: c, etiqueta: c.replace(/\s*&\s*/g, ' y '), icono: 'fa-tag' }))
    );
    cont.innerHTML = opciones
      .map(
        (o) => `
        <button class="chip ${o.valor === estado.categoria ? 'activo' : ''}" type="button"
                data-categoria="${C.esc(o.valor)}" aria-pressed="${o.valor === estado.categoria}">
          <i class="fa-solid ${o.icono}" aria-hidden="true"></i> ${C.esc(o.etiqueta)}
        </button>`
      )
      .join('');
  };

  const campoBusqueda = $('#buscar-producto');
  const envolturaBuscador = $('#buscador-envoltura');
  const botonLimpiarBusqueda = $('#limpiar-busqueda');
  const marcarBusqueda = () => {
    if (envolturaBuscador) {
      envolturaBuscador.classList.toggle('con-busqueda', Boolean(campoBusqueda && campoBusqueda.value));
    }
  };
  if (campoBusqueda) {
    campoBusqueda.addEventListener('input', marcarBusqueda);
    marcarBusqueda();
  }
  if (botonLimpiarBusqueda) {
    botonLimpiarBusqueda.addEventListener('click', () => {
      if (!campoBusqueda) return;
      campoBusqueda.value = '';
      estado.busqueda = '';
      marcarBusqueda();
      pintarTienda();
      campoBusqueda.focus();
    });
  }

  const selOrden = $('#ordenar-productos');
  const chkStock = $('#solo-disponibles');

  if (campoBusqueda) {
    let t = null;
    campoBusqueda.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => {
        estado.busqueda = campoBusqueda.value;
        pintarTienda();
      }, 220);
    });
  }

  if (selOrden) {
    selOrden.addEventListener('change', () => {
      estado.orden = selOrden.value;
      pintarTienda();
    });
  }

  if (chkStock) {
    chkStock.addEventListener('change', () => {
      estado.soloStock = chkStock.checked;
      pintarTienda();
    });
  }

  const contenedorChips = $('#filtro-categorias');
  if (contenedorChips) {
    contenedorChips.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-categoria]');
      if (!chip) return;
      estado.categoria = chip.dataset.categoria;
      contenedorChips.querySelectorAll('.chip').forEach((c) => {
        const activo = c === chip;
        c.classList.toggle('activo', activo);
        c.setAttribute('aria-pressed', String(activo));
      });
      pintarTienda();
    });
  }

  const botonLimpiar = $('#limpiar-filtros');
  if (botonLimpiar) {
    botonLimpiar.addEventListener('click', () => {
      estado.busqueda = '';
      estado.categoria = 'todas';
      estado.orden = 'destacados';
      estado.soloStock = false;
      if (campoBusqueda) campoBusqueda.value = '';
      if (selOrden) selOrden.value = 'destacados';
      if (chkStock) chkStock.checked = false;
      pintarCategorias();
      pintarTienda();
      C.aviso('Listo, te devolví el catálogo completo.', 'fa-filter-circle-xmark');
    });
  }

  /* Las tarjetas de categoría llevan el filtro puesto al llegar */
  document.addEventListener('click', (e) => {
    const tarjeta = e.target.closest('[data-ir-categoria]');
    if (!tarjeta) return;
    const cat = tarjeta.dataset.irCategoria;
    estado.categoria = categoriasUnicas().includes(cat) ? cat : 'todas';
    estado.busqueda = '';
    if (campoBusqueda) {
      campoBusqueda.value = '';
      marcarBusqueda();
    }
    pintarCategorias();
    pintarTienda();
  });

  /* ---------- 5. Panel de favoritos ---------- */
  const panelFavs = $('#panel-favoritos');
  const veloFavs = $('#velo-favoritos');
  const cuerpoFavs = $('#lista-favoritos');

  const pintarFavoritos = () => {
    if (!cuerpoFavs) return;
    const ids = C.favs();
    const productos = todos().filter((p) => ids.includes(p.id));
    const contador = $('#contador-favoritos');
    if (contador) {
      contador.textContent = productos.length;
      contador.hidden = productos.length === 0;
    }
    const boton = $('#boton-favoritos');
    if (boton) boton.classList.toggle('activo', productos.length > 0);

    cuerpoFavs.innerHTML = productos.length
      ? productos.map((p) => C.tarjetaProductoHTML(p, { compacta: true })).join('')
      : `<div class="vacio-busqueda">
           <i class="fa-regular fa-heart" aria-hidden="true"></i>
           <b>Aún no guardas piezas</b>
           <span>Toca el corazón de cualquier producto y aparecerá aquí para compararlo tranquilo.</span>
         </div>`;
  };

  const abrirFavoritos = () => {
    if (!panelFavs) return;
    pintarFavoritos();
    veloFavs.hidden = false;
    panelFavs.hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => panelFavs.classList.add('abierto'));
  };

  const cerrarFavoritos = () => {
    if (!panelFavs) return;
    panelFavs.classList.remove('abierto');
    veloFavs.hidden = true;
    panelFavs.hidden = true;
    document.body.style.overflow = '';
  };

  const botonFavs = $('#boton-favoritos');
  if (botonFavs) botonFavs.addEventListener('click', abrirFavoritos);
  if (veloFavs) veloFavs.addEventListener('click', cerrarFavoritos);
  const cerrarFavsBtn = $('#cerrar-favoritos');
  if (cerrarFavsBtn) cerrarFavsBtn.addEventListener('click', cerrarFavoritos);
  if (panelFavs) {
    panelFavs.addEventListener('click', (e) => {
      if (e.target.closest('#ir-a-favoritos')) {
        cerrarFavoritos();
        window.scrollTo({ top: document.getElementById('productos').offsetTop - 90, behavior: 'smooth' });
      }
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panelFavs && !panelFavs.hidden) cerrarFavoritos();
  });
  window.addEventListener('pa:favoritos', pintarFavoritos);

  /* ---------- 6. Vista rápida ---------- */
  const modalVista = $('#modal-vista');
  const cuerpoVista = $('#vista-cuerpo');

  const abrirVista = (id) => {
    const p = api() ? api().buscarProducto(id) : null;
    if (!p || !modalVista) return;
    C.registrarVisto(id);
    const guardado = C.esFavorito(id);
    cuerpoVista.innerHTML = `
      <div class="vista-rapida">
        <div class="vista-media">
          <img src="${C.esc(p.imagen)}" alt="${C.esc(p.nombre)}">
          ${C.insigniaHTML(p)}
        </div>
        <div class="vista-datos">
          <p class="producto-cat">${C.esc(p.categoria)}</p>
          <h3>${C.esc(p.nombre)}</h3>
          <div class="producto-valoracion">
            <div class="estrellas" aria-label="${p.rating} de 5">${C.estrellasHTML(p.rating)}</div>
            <span class="conteo-resenas">${Number(p.reseñas) || 0} reseñas</span>
          </div>
          ${C.precioHTML(p, 'precio-detalle')}
          <p class="vista-descripcion">${C.esc(p.descripcion)}</p>
          <ul class="beneficios-lista">
            ${(p.beneficios || []).slice(0, 3).map((b) => `<li><i class="fa-solid fa-circle-check" aria-hidden="true"></i> ${C.esc(b)}</li>`).join('')}
          </ul>
          <p class="producto-stock"><i class="fa-solid fa-box-open" aria-hidden="true"></i> ${C.esc(p.stock || '')}</p>
          <div class="vista-acciones">
            <button class="boton" type="button" data-agregar="${C.esc(p.id)}" data-nombre="${C.esc(p.nombre)}">
              <i class="fa-solid fa-cart-plus" aria-hidden="true"></i> Añadir al carrito
            </button>
            <button class="btn-fav ${guardado ? 'activo' : ''}" type="button" data-fav="${C.esc(p.id)}"
                    aria-pressed="${guardado}" aria-label="Guardar en favoritos">
              <i class="${guardado ? 'fa-solid' : 'fa-regular'} fa-heart" aria-hidden="true"></i>
            </button>
            <a class="boton boton-claro" href="producto.html?id=${encodeURIComponent(p.id)}">
              Ver ficha completa
            </a>
          </div>
        </div>
      </div>`;
    modalVista.hidden = false;
    document.body.style.overflow = 'hidden';
  };

  const cerrarVista = () => {
    if (!modalVista) return;
    modalVista.hidden = true;
    document.body.style.overflow = '';
  };

  document.addEventListener('click', (e) => {
    const mirar = e.target.closest('[data-mirar]');
    if (mirar) {
      e.preventDefault();
      e.stopPropagation();
      abrirVista(mirar.dataset.mirar);
    }
  });

  if (modalVista) {
    modalVista.addEventListener('click', (e) => {
      if (e.target === modalVista || e.target.closest('#cerrar-vista')) cerrarVista();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalVista && !modalVista.hidden) cerrarVista();
  });

  /* ---------- 7. Vistos recientemente ---------- */
  const pintarVistos = () => {
    const cont = $('#grid-vistos');
    if (!cont) return;
    const lista = C.vistos().slice(0, 4);
    cont.innerHTML = lista.length
      ? lista.map((p) => C.tarjetaProductoHTML(p, { compacta: true })).join('')
      : '';
    const seccion = $('#vistos');
    if (seccion) seccion.hidden = !lista.length;
  };
  window.addEventListener('pa:visto', pintarVistos);

  /* ---------- 8. Cuenta regresiva de la oferta ---------- */
  /* La fecha vive en la cabecera como data-oferta para poder cambiarla
     sin tocar código. Si no existe, la oferta queda siempre activa. */
  const nodoOferta = document.querySelector('[data-oferta-fin]');
  const FIN_OFERTA = nodoOferta
    ? new Date(nodoOferta.dataset.ofertaFin)
    : new Date(Date.now() + 1000 * 60 * 60 * 24 * 12);

  const dos = (n) => String(n).padStart(2, '0');

  const actualizarCuenta = () => {
    const falta = FIN_OFERTA - new Date();
    const cajas = {
      dia: document.getElementById('dia'),
      hora: document.getElementById('hora'),
      minuto: document.getElementById('minuto'),
      segundo: document.getElementById('segundo'),
    };
    if (!cajas.dia) return;

    if (falta <= 0) {
      Object.values(cajas).forEach((c) => {
        c.textContent = '00';
      });
      const titulo = document.getElementById('oferta-titulo');
      if (titulo && !titulo.dataset.caducada) {
        titulo.dataset.caducada = '1';
        titulo.textContent = 'La oferta terminó, pero los descuentos siguen aquí';
      }
      return;
    }

    const dias = Math.floor(falta / 86400000);
    const horas = Math.floor((falta % 86400000) / 3600000);
    const minutos = Math.floor((falta % 3600000) / 60000);
    const segundos = Math.floor((falta % 60000) / 1000);

    cajas.dia.textContent = dos(dias);
    cajas.hora.textContent = dos(horas);
    cajas.minuto.textContent = dos(minutos);
    cajas.segundo.textContent = dos(segundos);
  };

  actualizarCuenta();
  setInterval(actualizarCuenta, 1000);

  /* ---------- 9. Boletín ---------- */
  const formBoletin = $('#form-boletin');
  const mensajeBoletin = $('#mensaje-boletin');
  if (formBoletin) {
    formBoletin.addEventListener('submit', (e) => {
      e.preventDefault();
      const correo = formBoletin.querySelector('input');
      if (!correo.checkValidity()) {
        correo.reportValidity();
        return;
      }
      /* Guardar el correo también lo apunta en la bitácora del panel. */
      C.suscribirBoletin(correo.value, {
        nombre: (window.PAAuth && window.PAAuth.actual() ? window.PAAuth.actual().nombre : ''),
        donde: 'Boletín de la portada',
      });
      mensajeBoletin.hidden = false;
      correo.value = '';
      setTimeout(() => {
        mensajeBoletin.hidden = true;
      }, 6000);
    });
  }

  /* ---------- 10. Menú móvil ---------- */
  const botonMenu = $('#boton-menu');
  const menu = $('#menu');
  if (botonMenu && menu) {
    botonMenu.addEventListener('click', () => {
      const abierto = menu.classList.toggle('abierto');
      botonMenu.setAttribute('aria-expanded', abierto ? 'true' : 'false');
      botonMenu.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
      botonMenu.innerHTML = abierto
        ? '<i class="fa-solid fa-xmark" aria-hidden="true"></i>'
        : '<i class="fa-solid fa-bars" aria-hidden="true"></i>';
    });
    menu.querySelectorAll('a').forEach((enlace) => {
      enlace.addEventListener('click', () => {
        menu.classList.remove('abierto');
        botonMenu.setAttribute('aria-expanded', 'false');
        botonMenu.setAttribute('aria-label', 'Abrir menú');
        botonMenu.innerHTML = '<i class="fa-solid fa-bars" aria-hidden="true"></i>';
      });
    });
  }

  /* ---------- 11. Sombra del encabezado ---------- */
  const encabezado = document.querySelector('.encabezado');
  if (encabezado) {
    let ticking = false;
    window.addEventListener(
      'scroll',
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          encabezado.classList.toggle('con-sombra', window.scrollY > 10);
          ticking = false;
        });
      },
      { passive: true }
    );
  }

  /* ---------- 12. Carrusel del hero ----------
     La imagen que está al lado del titular pasa producto por
     producto. Todo sale del catálogo y de lo que se haya
     configurado en el panel (pa_contenido → hero). */
  const pintarHeroCarrusel = () => {
    const marco = $('#hero-marco');
    if (!marco) return;

    const cfg = window.PAContenido ? window.PAContenido.hero() : null;

    /* Sin carrusel: la foto fija de siempre. */
    if (!cfg || !cfg.activo) {
      marco.outerHTML =
        '<img class="hero-estatica" src="recursos/img/ganchos.jpg" alt="Manos tejiendo a crochet un punto de inicio" width="600" height="700" fetchpriority="high">';
      return;
    }

    const excluidos = cfg.excluir.map(String);
    let lista = todos().filter((p) => !excluidos.includes(String(p.id)));

    if (cfg.orden === 'precio-asc') lista.sort((a, b) => a.precio - b.precio);
    else if (cfg.orden === 'precio-desc') lista.sort((a, b) => b.precio - a.precio);
    else if (cfg.orden === 'alfabetico') lista.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    else if (cfg.orden === 'destacados') lista = ordenar(lista);

    if (!lista.length) {
      marco.innerHTML = `
        <div class="carrusel-vacio">
          <i class="fa-solid fa-box-open" aria-hidden="true"></i>
          <p>Aún no hay productos para mostrar.</p>
        </div>`;
      return;
    }

    marco.style.setProperty('--carrusel-ms', `${cfg.ms}ms`);
    marco.innerHTML = `
      <div class="carrusel-pista">
        ${lista
          .map(
            (p, i) => `
          <a class="carrusel-slide${i === 0 ? ' activa' : ''}"
             href="producto.html?id=${encodeURIComponent(p.id)}"
             role="group" aria-roledescription="diapositiva"
             aria-label="${i + 1} de ${lista.length}: ${C.esc(p.nombre)}"
             aria-hidden="${i === 0 ? 'false' : 'true'}"
             ${i === 0 ? '' : 'tabindex="-1"'}>
            <img src="${C.esc(p.imagen)}" alt="${C.esc(p.nombre)}" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">
            <div class="carrusel-datos">
              ${p.insignia ? `<span class="carrusel-etiqueta">${C.esc(p.insignia)}</span>` : ''}
              ${cfg.mostrarNombre ? `<b class="carrusel-nombre">${C.esc(p.nombre)}</b>` : ''}
              ${
                cfg.mostrarPrecio
                  ? `<span class="carrusel-precio">
                       ${C.precio(p.precio)}
                       ${p.precioAntes ? `<s>${C.precio(p.precioAntes)}</s>` : ''}
                     </span>`
                  : ''
              }
              <span class="carrusel-ver">Ver la pieza <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></span>
            </div>
          </a>`
          )
          .join('')}
      </div>

      <div class="carrusel-progreso${cfg.autoplay ? ' activo' : ''}" aria-hidden="true"><i></i></div>

      <button class="carrusel-pausa" type="button" hidden
              aria-label="Pausar el carrusel" title="Pausar el carrusel">
        <i class="fa-solid fa-pause" aria-hidden="true"></i>
      </button>

      ${
        lista.length > 1
          ? `
      <button class="carrusel-flecha previa" type="button" aria-label="Producto anterior">
        <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
      </button>
      <button class="carrusel-flecha siguiente" type="button" aria-label="Producto siguiente">
        <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
      </button>
      <div class="carrusel-puntos" role="tablist" aria-label="Elegir producto">
        ${lista
          .map(
            (p, i) =>
              `<button class="carrusel-punto${i === 0 ? ' activo' : ''}" type="button"
                 role="tab" data-ir="${i}" aria-selected="${i === 0 ? 'true' : 'false'}"
                 aria-label="${C.esc(p.nombre)}" title="${C.esc(p.nombre)}"></button>`
          )
          .join('')}
      </div>`
          : ''
      }`;

    /* Un solo producto no necesita puntos, flechas ni reloj. */
    if (lista.length < 2) return;

    /* Consultas limitadas al marco, para no chocar con el resto de la página. */
    const q = (sel) => marco.querySelector(sel);

    const slides = [...marco.querySelectorAll('.carrusel-slide')];
    const puntos = [...marco.querySelectorAll('.carrusel-punto')];
    const progreso = q('.carrusel-progreso');
    const pausa = q('.carrusel-pausa');

    /* Si la visita pide menos movimiento, no movemos nada solo. */
    const sinAnimacion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let corriendo = cfg.autoplay && !sinAnimacion;
    let indice = 0;
    let reloj = null;

    const pintarIndice = () => {
      slides.forEach((slide, i) => {
        const activa = i === indice;
        slide.classList.toggle('activa', activa);
        slide.setAttribute('aria-hidden', String(!activa));
        slide.tabIndex = activa ? 0 : -1;
      });
      puntos.forEach((punto, i) => {
        const activa = i === indice;
        punto.classList.toggle('activo', activa);
        punto.setAttribute('aria-selected', String(activa));
      });
      /* Reiniciamos la barrita para que el tiempo se vea. */
      if (progreso) {
        progreso.classList.remove('caminando');
        void progreso.offsetWidth;
        if (corriendo) progreso.classList.add('caminando');
      }
    };

    const parar = () => {
      clearTimeout(reloj);
      reloj = null;
      if (progreso) progreso.classList.remove('caminando');
    };

    const avanzar = (salto = 1) => {
      indice = (indice + salto + slides.length) % slides.length;
      pintarIndice();
    };

    const arrancar = () => {
      parar();
      if (!corriendo) return;
      /* Se rearma solo: el carrusel no se detiene tras el primer paso. */
      reloj = setTimeout(() => {
        avanzar(1);
        arrancar();
      }, cfg.ms);
    };

    const cambiar = (salto) => {
      avanzar(salto);
      arrancar();
    };

    if (pausa) {
      pausa.hidden = false;
      pausa.addEventListener('click', () => {
        corriendo = !corriendo;
        pausa.innerHTML = `<i class="fa-solid fa-${corriendo ? 'pause' : 'play'}" aria-hidden="true"></i>`;
        pausa.setAttribute('aria-label', corriendo ? 'Pausar el carrusel' : 'Reanudar el carrusel');
        pausa.title = corriendo ? 'Pausar el carrusel' : 'Reanudar el carrusel';
        if (progreso) progreso.classList.toggle('activo', corriendo);
        arrancar();
      });
    }

    q('.carrusel-flecha.previa').addEventListener('click', () => cambiar(-1));
    q('.carrusel-flecha.siguiente').addEventListener('click', () => cambiar(1));

    q('.carrusel-puntos').addEventListener('click', (e) => {
      const punto = e.target.closest('[data-ir]');
      if (!punto) return;
      indice = Number(punto.dataset.ir) || 0;
      pintarIndice();
      arrancar();
    });

    /* Al pasar el mouse o el teclado encima se detiene: nadie lee
       un texto que se le está moviendo debajo. */
    ['mouseenter', 'focusin'].forEach((evento) =>
      marco.addEventListener(evento, () => {
        parar();
        if (progreso) progreso.classList.remove('activo');
      })
    );

    ['mouseleave', 'focusout'].forEach((evento) =>
      marco.addEventListener(evento, (e) => {
        if (evento === 'focusout' && marco.contains(e.relatedTarget)) return;
        if (progreso) progreso.classList.toggle('activo', corriendo);
        arrancar();
      })
    );

    /* Las flechas del teclado mueven el carrusel. */
    marco.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        cambiar(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        cambiar(1);
      }
    });

    /* Si la pestaña queda escondida no gastamos el reloj. */
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) parar();
      else arrancar();
    });

    pintarIndice();
    arrancar();
  };

  /* ---------- Arranque ---------- */
  pintarCategorias();
  pintarTienda();
  pintarFavoritos();
  pintarVistos();
  pintarHeroCarrusel();
  observarRevelar();
})();