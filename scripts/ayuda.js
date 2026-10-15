/* ============================================================
   PUNTO & ALMA · Página de guías y ayuda
   Reutiliza las mismas guías del asistente "Alma" para que la
   documentación nunca se quede desactualizada: una sola fuente
   de verdad, dos formas de leerla (chat y página completa).
   ============================================================ */
(() => {
  const C = window.PAComun;
  const IA = window.PAIA;
  const esc = (s) => C.esc(s);
  if (!IA) return;

  const $ = (s) => document.querySelector(s);

  /* ============================================================
     1. GUÍAS
     ============================================================ */
  const grupos = [
    { clave: 'cliente', icono: 'fa-heart' },
    { clave: 'admin', icono: 'fa-user-shield' },
    { clave: 'tecnico', icono: 'fa-code' },
  ];

  const textoDeGuia = (g) =>
    [
      g.titulo,
      g.resumen,
      ...(g.pasos || []).map((p) => `${p.titulo} ${p.texto}`),
      ...(g.tips || []),
    ]
      .join(' ');

  const guiaHTML = (g) => `
    <article class="guia" id="${esc(g.id)}" data-buscar="${esc(C.normalizar(textoDeGuia(g)))}">
      <header class="guia-cab">
        <span class="guia-icono" aria-hidden="true"><i class="fa-solid ${esc(g.icono)}"></i></span>
        <div>
          <h3>${esc(g.titulo)}</h3>
          <p>${esc(g.resumen)}</p>
        </div>
        <button class="guia-enlace" type="button" data-copiar="${esc(g.id)}"
                title="Copiar el enlace de esta guía" aria-label="Copiar el enlace de la guía ${esc(g.titulo)}">
          <i class="fa-solid fa-link" aria-hidden="true"></i>
        </button>
      </header>
      ${IA.renderPasos(g)}
    </article>`;

  const pintarGuias = () => {
    grupos.forEach(({ clave }) => {
      const cont = document.querySelector(`.lista-guias[data-grupo="${clave}"]`);
      if (!cont) return;
      const lista = IA.listaGuias(clave);
      cont.innerHTML = lista.map(guiaHTML).join('');
    });
  };

  /* ============================================================
     2. ÍNDICE LATERAL
     ============================================================ */
  const pintarIndice = () => {
    const cont = $('#indice-guias');
    if (!cont) return;
    const bloques = grupos
      .map(({ clave }) => {
        const items = IA.listaGuias(clave);
        if (!items.length) return '';
        return `
          <div class="indice-grupo">
            <p class="indice-titulo">${clave === 'cliente' ? 'Clientas' : clave === 'admin' ? 'Panel' : 'Por dentro'}</p>
            ${items
              .map(
                (g) => `<a href="#${esc(g.id)}" data-indice="${esc(g.id)}">
                  <i class="fa-solid ${esc(g.icono)}" aria-hidden="true"></i> ${esc(g.titulo)}
                </a>`
              )
              .join('')}
          </div>`;
      })
      .join('');
    cont.innerHTML = bloques;
  };

  /* ============================================================
     3. BÚSQUEDA
     ============================================================ */
  const buscador = $('#buscar-ayuda');
  const aplicarFiltro = () => {
    const q = C.normalizar(buscador ? buscador.value : '').trim();
    let visibles = 0;

    document.querySelectorAll('.guia').forEach((nodo) => {
      const coincide = !q || (nodo.dataset.buscar || '').includes(q);
      nodo.hidden = !coincide;
      if (coincide) visibles += 1;
    });

    /* Oculta los grupos que se quedaron sin guías */
    document.querySelectorAll('.grupo-guias').forEach((grupo) => {
      const visiblesGrupo = grupo.querySelectorAll('.guia:not([hidden])').length;
      grupo.classList.toggle('sin-resultados', visiblesGrupo === 0);
    });

    const vacio = $('#indice-vacio');
    if (vacio) vacio.hidden = visibles !== 0;
    const indice = $('#indice-guias');
    if (indice) indice.hidden = visibles === 0;

    /* Resalta en el índice lo que se está mostrando */
    document.querySelectorAll('[data-indice]').forEach((enlace) => {
      const guia = document.getElementById(enlace.dataset.indice);
      enlace.hidden = Boolean(guia && guia.hidden);
    });

    if (q && visibles) {
      const primero = document.querySelector('.guia:not([hidden])');
      if (primero) primero.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (buscador) {
    let t = null;
    buscador.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(aplicarFiltro, 200);
    });
  }

  /* ============================================================
     4. MAPA DE ARCHIVOS
     ============================================================ */
  const MAPA = [
    ['index.html', 'La portada y la tienda: buscador, filtros, oferta y boletín.', 'Si vas a cambiar la estructura de la portada.'],
    ['producto.html', 'La ficha de cada pieza. Se rellena sola según el producto.', 'Rara vez: todo sale del catálogo.'],
    ['perfil.html', 'Tu espacio: ajustes, creaciones y foro.', 'Si quieres agregar campos al perfil.'],
    ['acceso.html', 'Entrar o crear tu cuenta (clienta o administradora).', 'Si cambias el formulario de acceso.'],
    ['admin.html', 'El panel de ventas, catálogo y moderación.', 'Si quieres nuevas herramientas de administración.'],
    ['ayuda.html', 'Esta guía completa.', 'Al añadir una guía nueva al asistente, aparece aquí sola.'],
    ['privacidad.html', 'Política de privacidad: qué datos guardamos y cómo los borras.', 'Antes de publicar: llena los marcadores [NOMBRE], [NIT] y [CORREO].'],
    ['terminos.html', 'Términos y condiciones: compras, envíos, devoluciones y propiedad.', 'Antes de publicar: llena los marcadores [NOMBRE], [NIT] y [DIRECCIÓN].'],
    ['cookies.html', 'Aviso de cookies y datos: qué queda guardado en el navegador.', 'Si cambias lo que guardamos, actualiza la tabla.'],
    ['404.html', 'La página que se muestra cuando una dirección no existe.', 'Para personalizar el mensaje de error.'],
    ['offline.html', 'Lo que se ve si abres el sitio sin conexión.', 'Para el modo sin internet.'],
    ['sitemap.xml', 'El mapa del sitio: qué páginas ven los buscadores.', 'Cada vez que agregues o cambies una página pública.'],
    ['robots.txt', 'Qué puede leer un buscador y dónde está el sitemap.', 'Para ocultar páginas internas del índice.'],
    ['sw.js', 'El service worker: deja el sitio funcionando sin conexión.', 'Al publicar cambios, sube CACHE a punto-alma-v2, v3...'],
    ['_headers', 'Cabeceras de seguridad y caché para Netlify o Cloudflare Pages.', 'Si publicas en esos servicios.'],
    ['.htaccess', 'Lo mismo para servidores Apache (caché, compresión, 404).', 'Si tu hosting usa Apache.'],
    ['humans.txt', 'Quiénes somos y cómo contactarnos, en texto simple.', 'Para presentar el proyecto.'],
    ['.well-known/security.txt', 'A dónde escribir si alguien encuentra un fallo de seguridad.', 'Para reportar problemas de seguridad.'],
    ['estilos/style.css', 'El sistema de diseño: colores, tipografías, botones y secciones.', 'Para cambiar el look general.'],
    ['estilos/texturas.css', 'Detalles decorativos y texturas de fondo.', 'Para ajustar ambientes visuales.'],
    ['estilos/tienda.css', 'Buscador, filtros, favoritos y vista rápida.', 'Para retocar la experiencia de compra.'],
    ['estilos/producto.css', 'Estilos de la ficha de producto.', 'Para cambiar la galería o la zona de compra.'],
    ['estilos/perfil.css', 'Estilos del perfil, las creaciones y el foro.', 'Para la vitrina de clientas.'],
    ['estilos/admin.css', 'Estilos del panel, el editor y la moderación.', 'Para la administración.'],
    ['estilos/asistente.css', 'La burbuja de chat de Alma.', 'Para ajustar el asistente.'],
    ['estilos/ayuda.css', 'Estilos de esta página de guías.', 'Para la documentación.'],
    ['estilos/acceso.css', 'Estilos de la página para entrar o crear cuenta.', 'Para la pantalla de acceso.'],
    ['estilos/legal.css', 'Estilos de privacidad, términos y cookies.', 'Para el texto legal.'],
    ['scripts/catalogo.js', 'Los productos y las funciones para agregarlos, editarlos o quitarlos.', 'Para partir de otro catálogo base.'],
    ['scripts/comun.js', 'Tarjeta de producto, favoritos, avisos y precios: lo compartido por todas las páginas.', 'Al crear componentes reutilizables.'],
    ['scripts/carrito.js', 'El carrito, el panel lateral y los pedidos guardados.', 'Para cambiar el flujo de compra.'],
    ['scripts/app.js', 'La portada: buscador, filtros, orden, favoritos y cuenta regresiva.', 'Para la experiencia de tienda.'],
    ['scripts/producto.js', 'Construye la ficha y los productos relacionados.', 'Para la página de detalle.'],
    ['scripts/perfil.js', 'Perfil, subida de creaciones y foro.', 'Para lo que publican las clientas.'],
    ['scripts/auth.js', 'Las cuentas y la sesión: registro, entrada, salida y roles.', 'Para cambiar cómo funciona el acceso.'],
    ['scripts/acceso.js', 'La lógica de la página de acceso (pestañas, avisos y destino).', 'Para el flujo de entrada.'],
    ['scripts/admin.js', 'Estadísticas, pedidos, catálogo, moderación y asistente.', 'Para la administración.'],
    ['scripts/ia.js', 'El cerebro de Alma: catálogo, referencias de estilo y todas las guías.', 'Para enseñarle cosas nuevas.'],
    ['scripts/asistente.js', 'La ventana de chat y el quiz de preferencias.', 'Para la conversación.'],
    ['scripts/ayuda.js', 'Arma esta página a partir de las guías del asistente.', 'Casi nunca: se actualiza sola.'],
    ['scripts/sitio.js', 'Lo que comparten todas las páginas: saltar al contenido, volver arriba, aviso de datos y el service worker.', 'Para el comportamiento general del sitio.'],
    ['recursos/img/', 'Las fotografías de productos y del taller.', 'Al subir fotos nuevas (idealmente menos de 150 KB cada una).'],
    ['recursos/favicon.svg', 'El icono que aparece en la pestaña del navegador.', 'Si cambias el logo.'],
    ['recursos/img/icono-512.png', 'Icono grande de la app (PWA) e imagen para redes sociales.', 'Al cambiar el color o el símbolo.'],
    ['recursos/img/icono-maskable-512.png', 'Icono con margen extra para máscaras circulares de Android.', 'Igual que el anterior, pero más pequeño.'],
    ['recursos/img/apple-touch-icon.png', 'El icono que usan los iPhone al guardar la página.', 'Al cambiar el logo.'],
    ['sitio.webmanifest', 'Datos para instalar la página como app en el celular.', 'Si cambias el nombre o los colores.'],
  ];

  const pintarMapa = () => {
    const tbody = $('#tabla-mapa');
    if (!tbody) return;
    tbody.innerHTML = MAPA.map(
      ([archivo, que, cuando]) => `
      <tr>
        <td><code>${esc(archivo)}</code></td>
        <td>${esc(que)}</td>
        <td class="celda-suave">${esc(cuando)}</td>
      </tr>`
    ).join('');
  };

  /* ============================================================
     5. PREGUNTAS FRECUENTES
     ============================================================ */
  const FAQ = [
    ['¿Cuánto tarda mi pedido?', 'Despachamos entre 24 y 72 horas después de confirmar el pago. Luego depende de la transportadora: entre 1 y 5 días hábiles según la ciudad. Te mandamos la guía de seguimiento por WhatsApp.'],
    ['¿Los envíos tienen costo?', 'El envío es gratis en pedidos desde $150.000. Si tu compra es menor, te cotizamos según el destino antes de que pagues.'],
    ['¿Puedo pagar al recibir?', 'Sí, el pago contra entrega está disponible en Manizales y municipios cercanos. Fuera de esa zona manejamos Nequi, Daviplata, transferencia o tarjeta.'],
    ['¿Las piezas son iguales a las fotos?', 'Son iguales en diseño y materiales, pero al ser tejidas a mano cada una tiene su carácter. Si un color se agotó, te escribimos antes de tejer para ofrecerte una alternativa.'],
    ['¿Hacen piezas personalizadas?', 'Claro. Escríbenos por WhatsApp con tu idea, los colores y el tamaño, y te cotizamos. Los pedidos personalizados tardan entre 5 y 15 días.'],
    ['¿Qué incluye un patrón digital?', 'Un PDF ilustrado con fotos paso a paso, la lista de materiales, la tensión de la muestra y asesoría por WhatsApp si te trabas. Lo recibes por correo apenas se confirma el pago.'],
    ['¿Cómo subo una creación a mi perfil?', 'Entra a Mi perfil, baja a “Mis creaciones”, toca el recuadro de la nube, elige tu foto, escríbele un título y elige el tipo de crochet. Después pulsa “Publicar creación”.'],
    ['¿Puedo editar o borrar lo que publiqué?', 'Sí. En tu perfil, la papelera de cada tarjeta borra la creación o la publicación del foro. Para editarla, bórrala y vuelve a subirla con los datos corregidos.'],
    ['¿Dónde se guarda lo que subo?', 'En tu propio navegador, no en la nube. Se mantiene mientras no borres los datos del sitio. Para una tienda con varias usuarias de verdad hace falta un servidor.'],
    ['¿Cómo agrego un producto a la tienda?', 'Abre el panel de ventas, entra a “Catálogo y contenido”, pulsa “Nuevo producto”, llena la ficha y guarda. Aparece al instante en la tienda, en la ficha y en el carrito.'],
    ['¿Puedo quitar un producto sin perderlo para siempre?', 'Sí. Al eliminarlo queda en la pestaña “Eliminados” y puedes restaurarlo cuando quieras. El botón “Restaurar catálogo” devuelve todo al estado original.'],
    ['¿Cómo reviso lo que publican mis clientas?', 'En el panel, debajo del catálogo, están las listas de creaciones y de publicaciones del foro. Puedes aprobarlas con la paloma o eliminarlas con la papelera.'],
    ['¿El asistente Alma necesita internet?', 'No. Funciona sin conexión porque trae el catálogo y las guías incorporadas. Si tienes una clave de un proveedor de IA, puedes conectarlo desde el panel.'],
    ['¿Es seguro poner mi clave de IA en el panel?', 'La clave se guarda solo en ese navegador y viaja directo de tu computador al proveedor. Aun así, evita usarla en un equipo compartido y nunca la subas a un repositorio público.'],
  ];

  const pintarFaq = () => {
    const cont = $('#lista-faq');
    if (!cont) return;
    cont.innerHTML = FAQ.map(
      ([pregunta, respuesta], i) => `
      <details class="faq-item" ${i === 0 ? 'open' : ''}>
        <summary>
          <span>${esc(pregunta)}</span>
          <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
        </summary>
        <div class="faq-respuesta"><p>${esc(respuesta)}</p></div>
      </details>`
    ).join('');
  };

  /* ============================================================
     6. GLOSARIO
     ============================================================ */
  const GLOSARIO = [
    ['Amigurumi', 'Muñeco tejido a crochet, normalmente en espiral y relleno de fibra. Viene del japonés.'],
    ['Anillo mágico', 'Un inicio ajustable que cierra un círculo apretado. Es la base de casi todo amigurumi.'],
    ['Punto bajo', 'El punto más usado en amigurumis. Bajito y firme, deja el tejido tupido.'],
    ['Medio punto', 'Un punto un poco más alto que el bajo. Da textura y avanza más rápido.'],
    ['Vareta', 'Punto alto que crea tejido suelto y calado. Se usa en cobijas y prendas.'],
    ['Aumento', 'Tejer dos puntos en el mismo lugar para ensanchar.'],
    ['Disminución', 'Unir dos puntos en uno para angostar. Se hace invisible si tomas solo la hebra de adelante.'],
    ['Vuelta o hilera', 'Una pasada completa de puntos. En amigurumi se teje en espiral; en cobijas, en hileras.'],
    ['Granny square', 'El clásico cuadro de abuela: un motivo cuadrado que se une con otros para formar cobijas.'],
    ['Tensión o muestra', 'Cuántos puntos y vueltas caben en 10 cm. Si tu muestra no coincide, cambia el número de gancho.'],
    ['Gancho o aguja', 'La herramienta con la que se teje. Su número cambia por completo el tamaño final.'],
    ['Hilo o hebra', 'La parte del punto donde metes el gancho. Se dice hebra de adelante y hebra de atrás.'],
    ['Bordado de ojos', 'La técnica segura para bebés: en vez de ojos plásticos, se bordan con hilo. Nada que se suelte.'],
    ['Algodón hipoalergénico', 'Fibra suave y segura para piel sensible, ideal para piezas de bebé.'],
    ['Bloqueo', 'Humedecer y estirar la pieza para que asiente y las puntadas queden parejas.'],
    ['Deshilachado', 'Cuando el hilo se separa. Se evita rematando bien los extremos.'],
  ];

  const pintarGlosario = () => {
    const cont = $('#grid-glosario');
    if (!cont) return;
    cont.innerHTML = GLOSARIO.map(
      ([termino, definicion], i) => `
      <article class="glosario-item reveal" style="transition-delay:${(i % 8) * 40}ms">
        <h3>${esc(termino)}</h3>
        <p>${esc(definicion)}</p>
      </article>`
    ).join('');
  };

  /* ============================================================
     7. CUIDADOS
     ============================================================ */
  const CUIDADOS = [
    ['Algodón', 'A mano, agua fría, jabón suave.', 'En plano, a la sombra.', 'No usar blanqueador ni secadora.'],
    ['Lana', 'A mano, agua tibia, sin frotar.', 'En plano sobre una toalla.', 'El agua caliente la encoge (fieltrado).'],
    ['Amigurumi', 'A mano y con suavidad, sin sumergir mucho.', 'En plano, moldeando con las manos.', 'No retorcer: se deforma el relleno.'],
    ['Cobija', 'A mano o lavadora en ciclo delicado y frío.', 'Extendida a la sombra.', 'No colgar mojada: se estira.'],
    ['Bolso', 'Paño húmedo y jabón neutro.', 'Colgado en un lugar ventilado.', 'No exponer al sol directo por días.'],
  ];

  const pintarCuidados = () => {
    const tbody = $('#tabla-cuidados');
    if (!tbody) return;
    tbody.innerHTML = CUIDADOS.map(
      ([material, lavado, secado, ojo]) => `
      <tr>
        <td><b>${esc(material)}</b></td>
        <td>${esc(lavado)}</td>
        <td>${esc(secado)}</td>
        <td class="celda-suave">${esc(ojo)}</td>
      </tr>`
    ).join('');
  };

  /* ============================================================
     8. INTERACCIONES
     ============================================================ */
  const aviso = (mensaje, icono) => C.aviso(mensaje, icono);

  document.addEventListener('click', (e) => {
    /* Copiar enlace de una guía */
    const copiar = e.target.closest('[data-copiar]');
    if (copiar) {
      const url = `${location.origin}${location.pathname}#${copiar.dataset.copiar}`;
      const listo = () => aviso('Enlace copiado. Compártelo con quien lo necesite.', 'fa-link');
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(listo).catch(() => aviso(url, 'fa-link'));
      } else {
        aviso(url, 'fa-link');
      }
    }
  });

  /* Abrir el asistente desde los botones de la portada */
  const abrirAlma = (chipTexto) => {
    const fab = document.getElementById('ia-fab');
    if (fab) fab.click();
    if (chipTexto) {
      setTimeout(() => {
        const chip = Array.from(document.querySelectorAll('#ia-chips .ia-chip')).find(
          (c) => c.dataset.chip === chipTexto
        );
        if (chip) chip.click();
      }, 420);
    }
  };
  const b1 = $('#preguntar-alma');
  if (b1) b1.addEventListener('click', () => abrirAlma('Guías de la página'));
  const b2 = $('#preguntar-alma-2');
  if (b2) b2.addEventListener('click', () => abrirAlma('Empezar el quiz'));

  /* Resaltar en el índice la guía visible */
  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((entrada) => {
          if (!entrada.isIntersecting) return;
          document.querySelectorAll('[data-indice]').forEach((enlace) => {
            enlace.classList.toggle('activo', enlace.dataset.indice === entrada.target.id);
          });
        });
      },
      { rootMargin: '-25% 0px -65% 0px' }
    );
    document.querySelectorAll('.guia').forEach((g) => obs.observe(g));
  }

  /* ============================================================
     9. COMPORTAMIENTOS GENERALES
     ============================================================ */
  const botonMenu = $('#boton-menu');
  const menu = $('#menu');
  if (botonMenu && menu) {
    botonMenu.addEventListener('click', () => {
      const abierto = menu.classList.toggle('abierto');
      botonMenu.setAttribute('aria-expanded', String(abierto));
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

  /* ============================================================
     ARRANQUE
     ============================================================ */
  pintarGuias();
  pintarIndice();
  pintarMapa();
  pintarFaq();
  pintarGlosario();
  pintarCuidados();
  observarRevelar();
  C.pintarBadge(false);
})();
