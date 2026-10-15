/* ============================================================
   PUNTO & ALMA · Perfil, creaciones y foro
   Todo se guarda en localStorage del navegador:
   - pa_usuarios    → cuentas (nombre, correo, clave, foto, tipo)
   - pa_creaciones  → las piezas que sube cada tejedora
   - pa_foro        → opiniones e ideas de la comunidad
   Cada creación y cada mensaje guarda quién lo subió (autorId),
   para que el panel de administración sepa de quién es cada cosa.
   ============================================================ */

(() => {
  const PAAuth = window.PAAuth;
  const usuario = PAAuth ? PAAuth.actual() : null;

  /* El perfil es personal: sin cuenta no hay nada que mostrar.
     La cabecera ya debió redirigir, esto es el seguro. */
  if (!usuario) {
    if (PAAuth) PAAuth.requiereSesion('perfil.html');
    return;
  }
  /* ================= Utilidades ================= */
  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const toast = document.getElementById('toast');
  let temporizadorToast = null;

  const mostrarToast = (mensaje) => {
    toast.innerHTML = `<i class="fa-solid fa-circle-check" aria-hidden="true"></i> ${mensaje}`;
    toast.hidden = false;
    requestAnimationFrame(() => toast.classList.add('mostrar'));
    clearTimeout(temporizadorToast);
    temporizadorToast = setTimeout(() => {
      toast.classList.remove('mostrar');
      setTimeout(() => { toast.hidden = true; }, 380);
    }, 2600);
  };

  const guardar = (clave, dato) => {
    try {
      localStorage.setItem(clave, JSON.stringify(dato));
      return true;
    } catch {
      mostrarToast('El almacenamiento está lleno. Quita algunas fotos y vuelve a intentarlo.');
      return false;
    }
  };

  const leer = (clave, respaldo) => {
    try {
      const crudo = localStorage.getItem(clave);
      return crudo ? JSON.parse(crudo) : respaldo;
    } catch {
      return respaldo;
    }
  };

  const formatoFecha = (iso) =>
    new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });

  /* Redimensiona la imagen para que quepa sin quejarse localStorage */
  const procesarImagen = (archivo, max, callback) => {
    const lector = new FileReader();
    lector.onload = () => {
      const imagen = new Image();
      imagen.onload = () => {
        const escala = Math.min(1, max / Math.max(imagen.width, imagen.height));
        const lienzo = document.createElement('canvas');
        lienzo.width = Math.max(1, Math.round(imagen.width * escala));
        lienzo.height = Math.max(1, Math.round(imagen.height * escala));
        lienzo.getContext('2d').drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
        callback(lienzo.toDataURL('image/jpeg', 0.82));
      };
      imagen.src = lector.result;
    };
    lector.readAsDataURL(archivo);
  };

  /* ================= Tipos de crochet ================= */
  const TIPOS = {
    amigurumis: {
      icono: 'fa-heart',
      etiqueta: 'Amigurumis',
      descripcion: 'Muñecos y peluches tejidos a mano, punto a punto, llenos de ternura.',
    },
    hogar: {
      icono: 'fa-house',
      etiqueta: 'Cobijas y Hogar',
      descripcion: 'Cobijas, posavasos y piezas cálidas que abrazan como en casa.',
    },
    moda: {
      icono: 'fa-bag-shopping',
      etiqueta: 'Moda y Accesorios',
      descripcion: 'Bolsos, bufandas y accesorios con estilo hecho a mano.',
    },
    patrones: {
      icono: 'fa-book-open',
      etiqueta: 'Patrones y Kits',
      descripcion: 'Guías y kits para que otros también descubran el crochet.',
    },
    todo: {
      icono: 'fa-wand-magic-sparkles',
      etiqueta: 'Todo tipo de crochet',
      descripcion: 'Exploro todos los puntos: del amigurumi al hogar, sin miedo.',
    },
  };
  const TIPO_DEFECTO = 'amigurumis';
  const etiquetaDe = (tipo) => (TIPOS[tipo] || TIPOS[TIPO_DEFECTO]).etiqueta;
  const descripcionDe = (tipo) => (TIPOS[tipo] || TIPOS[TIPO_DEFECTO]).descripcion;
  const iconoDe = (tipo) => (TIPOS[tipo] || TIPOS[TIPO_DEFECTO]).icono;

  /* ================= Datos guardados ================= */
  const CLAVE_CREACIONES = 'pa_creaciones';
  const CLAVE_FORO = 'pa_foro';

  /* Si vienes de la versión anterior (sin cuentas), tu nombre, foto y
     tipo vivían en pa_perfil. Se adoptan una sola vez en la cuenta. */
  const legado = leer('pa_perfil', null);
  if (legado && typeof legado === 'object') {
    const rescate = {};
    if (!usuario.foto && legado.foto) rescate.foto = legado.foto;
    if (!usuario.tipo && legado.tipo) rescate.tipo = legado.tipo;
    if (Object.keys(rescate).length) PAAuth.actualizar(usuario.id, rescate);
  }

  /* El perfil es la cuenta con la que se entró. */
  const perfil = {
    nombre: usuario.nombre || 'Tejedora Artesanal',
    foto: usuario.foto || '',
    tipo: usuario.tipo || TIPO_DEFECTO,
  };

  let creaciones = leer(CLAVE_CREACIONES, []);
  if (!Array.isArray(creaciones)) creaciones = [];

  let foro = leer(CLAVE_FORO, []);
  if (!Array.isArray(foro)) foro = [];

  /* Contenido subido antes de que existieran las cuentas
     (autorId 'yo'): se adopta una sola vez. */
  let adopto = false;
  creaciones.forEach((c) => {
    if (c.autorId === 'yo') {
      c.autorId = usuario.id;
      c.autor = perfil.nombre;
      adopto = true;
    }
  });
  foro.forEach((p) => {
    if (p.autorId === 'yo') {
      p.autorId = usuario.id;
      p.autor = perfil.nombre;
      p.foto = p.foto || perfil.foto;
      adopto = true;
    }
  });
  if (adopto) {
    guardar(CLAVE_CREACIONES, creaciones);
    guardar(CLAVE_FORO, foro);
  }

  const esMia = (pieza) => String(pieza.autorId) === String(usuario.id);
  const misCreaciones = () => creaciones.filter(esMia);

  /* ================= Carrito (badge) ================= */
  const contadorCarrito = document.getElementById('contador-carrito');
  contadorCarrito.textContent = window.PACarrito.contar();
  window.addEventListener('pa:carrito', () => {
    contadorCarrito.textContent = window.PACarrito.contar();
  });

  /* ================= Avatar ================= */
  const avatarHTML = (persona, clase = 'avatar') =>
    persona.foto
      ? `<img class="${clase}" src="${persona.foto}" alt="Foto de ${esc(persona.nombre)}">`
      : `<span class="${clase} avatar-vacio" aria-hidden="true"><i class="fa-solid fa-user"></i></span>`;

  /* ================= Perfil ================= */
  const pintarPerfil = () => {
    const tarjeta = document.getElementById('perfil-tarjeta');
    const mias = misCreaciones();
    const participaciones = foro.filter(esMia).length;
    tarjeta.innerHTML = `
      <div class="perfil-principal">
        ${avatarHTML(perfil, 'avatar')}
        <div class="perfil-info">
          <p class="etiqueta">Mi rincón de lana</p>
          <h1>${esc(perfil.nombre)}</h1>
          <p class="perfil-tipo"><i class="fa-solid ${iconoDe(perfil.tipo)}" aria-hidden="true"></i> ${etiquetaDe(perfil.tipo)}</p>
          <p class="perfil-descripcion">${esc(descripcionDe(perfil.tipo))}</p>
          <p class="perfil-cuenta">
            <i class="fa-solid fa-envelope" aria-hidden="true"></i> ${esc(usuario.email)}
            <em>${usuario.rol === 'admin' ? 'Administradora' : 'Clienta'}</em>
          </p>
        </div>
        <button class="boton-ajustes" id="boton-ajustes" type="button" aria-label="Abrir ajustes de perfil" title="Ajustes de perfil">
          <i class="fa-solid fa-gear" aria-hidden="true"></i>
        </button>
      </div>
      <div class="perfil-stats">
        <div class="stat"><b>${mias.length}</b><span>Creaciones</span></div>
        <div class="stat"><b>${participaciones}</b><span>En el foro</span></div>
        <div class="stat"><b>${perfil.foto ? 'Sí' : '—'}</b><span>Foto de perfil</span></div>
      </div>`;
    document.getElementById('boton-ajustes').addEventListener('click', abrirAjustes);
  };

  /* ================= Ventana de ajustes (engranaje) ================= */
  const modalAjustes = document.getElementById('modal-ajustes');
  const campoNombre = document.getElementById('campo-nombre');
  const opcionesTipo = document.getElementById('opciones-tipo');
  const tipoDescripcion = document.getElementById('tipo-descripcion');
  const borrador = { nombre: '', foto: '', tipo: TIPO_DEFECTO };

  const pintarPreview = () => {
    document.getElementById('preview-nombre').textContent = borrador.nombre;
    document.getElementById('preview-tipo').textContent = etiquetaDe(borrador.tipo);
    document.getElementById('preview-foto').innerHTML = borrador.foto
      ? `<img class="avatar-mini" src="${borrador.foto}" alt="Vista previa de tu foto">`
      : `<span class="avatar-mini avatar-vacio" aria-hidden="true"><i class="fa-solid fa-user"></i></span>`;
    tipoDescripcion.textContent = descripcionDe(borrador.tipo);
  };

  const pintarOpcionesTipo = () => {
    opcionesTipo.innerHTML = Object.entries(TIPOS)
      .map(([id, t]) => `
        <label class="opcion-tipo ${borrador.tipo === id ? 'activo' : ''}">
          <input type="radio" name="tipo" value="${id}" ${borrador.tipo === id ? 'checked' : ''}>
          <i class="fa-solid ${t.icono}" aria-hidden="true"></i> ${t.etiqueta}
        </label>`)
      .join('');
    opcionesTipo.querySelectorAll('input[name="tipo"]').forEach((radio) => {
      radio.addEventListener('change', () => {
        borrador.tipo = radio.value;
        opcionesTipo.querySelectorAll('.opcion-tipo').forEach((l) => {
          l.classList.toggle('activo', l.querySelector('input').value === radio.value);
        });
        pintarPreview();
      });
    });
  };

  const abrirAjustes = () => {
    borrador.nombre = perfil.nombre;
    borrador.foto = perfil.foto;
    borrador.tipo = perfil.tipo;
    campoNombre.value = borrador.nombre;
    pintarOpcionesTipo();
    pintarPreview();
    modalAjustes.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => campoNombre.focus(), 80);
  };

  const cerrarAjustes = () => {
    modalAjustes.hidden = true;
    document.body.style.overflow = '';
  };

  document.getElementById('cerrar-ajustes').addEventListener('click', cerrarAjustes);
  document.getElementById('cancelar-ajustes').addEventListener('click', cerrarAjustes);
  modalAjustes.addEventListener('click', (e) => {
    if (e.target === modalAjustes) cerrarAjustes();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modalAjustes.hidden) cerrarAjustes();
  });

  campoNombre.addEventListener('input', () => {
    borrador.nombre = campoNombre.value.trim() || perfil.nombre;
    pintarPreview();
  });

  document.getElementById('subir-foto').addEventListener('change', (e) => {
    const archivo = e.target.files && e.target.files[0];
    if (!archivo) return;
    procesarImagen(archivo, 320, (data) => {
      borrador.foto = data;
      pintarPreview();
    });
  });

  document.getElementById('quitar-foto').addEventListener('click', () => {
    borrador.foto = '';
    document.getElementById('subir-foto').value = '';
    pintarPreview();
    mostrarToast('Foto quitada (recuerda guardar los cambios).');
  });

  document.getElementById('guardar-ajustes').addEventListener('click', () => {
    const nombre = campoNombre.value.trim();
    if (!nombre) {
      mostrarToast('Escribe tu nombre para guardar.');
      campoNombre.focus();
      return;
    }

    const campoClave = document.getElementById('campo-clave');
    const campoClave2 = document.getElementById('campo-clave2');
    const clave = campoClave ? campoClave.value : '';
    const clave2 = campoClave2 ? campoClave2.value : '';

    if (clave || clave2) {
      if (clave.length < 6) {
        mostrarToast('La nueva contraseña necesita 6 caracteres o más.');
        return;
      }
      if (clave !== clave2) {
        mostrarToast('Las dos contraseñas no coinciden.');
        return;
      }
    }

    const cambios = { nombre, foto: borrador.foto, tipo: borrador.tipo };
    if (clave) cambios.clave = clave;

    const resultado = PAAuth.actualizar(usuario.id, cambios);
    if (!resultado.ok) {
      mostrarToast(resultado.error);
      return;
    }

    perfil.nombre = nombre;
    perfil.foto = borrador.foto;
    perfil.tipo = borrador.tipo;
    if (campoClave) campoClave.value = '';
    if (campoClave2) campoClave2.value = '';
    pintarPerfil();
    cerrarAjustes();
    mostrarToast('¡Perfil actualizado!');
  });

  /* ================= Creaciones ================= */
  let fotoCreacion = null;

  const pintarCreaciones = () => {
    const grid = document.getElementById('grid-creaciones');
    const mias = misCreaciones();
    if (!mias.length) {
      grid.innerHTML = `
        <div class="vacio">
          <i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i>
          <p><b>Aún no publicas creaciones.</b><br>Sube tu primera pieza y presume tu punto con la comunidad.</p>
        </div>`;
      return;
    }
    grid.innerHTML = mias
      .map((c) => `
        <article class="creacion reveal">
          <div class="creacion-img">
            ${c.imagen
              ? `<img src="${c.imagen}" alt="${esc(c.titulo)}" loading="lazy">`
              : `<span class="creacion-sin-foto" aria-hidden="true"><i class="fa-solid fa-heart"></i></span>`}
          </div>
          <div class="creacion-info">
            <p class="creacion-tipo"><i class="fa-solid ${iconoDe(c.tipo)}" aria-hidden="true"></i> ${etiquetaDe(c.tipo)}</p>
            <h3>${esc(c.titulo)}</h3>
            ${c.aprobada ? '<span class="creacion-aprobada"><i class="fa-solid fa-circle-check" aria-hidden="true"></i> Aprobada por la artesana</span>' : ''}
            <p class="creacion-texto">${esc(c.descripcion) || 'Una pieza hecha con alma.'}</p>
            <div class="creacion-pie">
              <span><i class="fa-regular fa-calendar" aria-hidden="true"></i> ${formatoFecha(c.fecha)}</span>
              <button class="borrar-creacion" type="button" data-id="${c.id}" aria-label="Eliminar esta creación">
                <i class="fa-solid fa-trash-can" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        </article>`)
      .join('');
    observarRevelar();
  };

  const formSubir = document.getElementById('form-subir');

  document.getElementById('archivo-creacion').addEventListener('change', (e) => {
    const archivo = e.target.files && e.target.files[0];
    if (!archivo) return;
    procesarImagen(archivo, 640, (data) => {
      fotoCreacion = data;
      const vista = document.getElementById('vista-creacion');
      vista.src = data;
      vista.hidden = false;
      document.getElementById('icono-subir').hidden = true;
    });
  });

  formSubir.addEventListener('submit', (e) => {
    e.preventDefault();
    const titulo = document.getElementById('campo-titulo').value.trim();
    if (!titulo) {
      mostrarToast('Ponle un título a tu creación.');
      return;
    }
    creaciones.unshift({
      id: Date.now(),
      autorId: usuario.id,
      autor: perfil.nombre,
      imagen: fotoCreacion || '',
      titulo,
      descripcion: document.getElementById('campo-descripcion').value.trim(),
      tipo: document.getElementById('campo-tipo').value || TIPO_DEFECTO,
      fecha: new Date().toISOString(),
    });
    if (guardar(CLAVE_CREACIONES, creaciones)) {
      pintarCreaciones();
      pintarPerfil();
      formSubir.reset();
      document.getElementById('vista-creacion').hidden = true;
      document.getElementById('icono-subir').hidden = false;
      fotoCreacion = null;
      mostrarToast('¡Creación publicada!');
    }
  });

  document.getElementById('grid-creaciones').addEventListener('click', (e) => {
    const boton = e.target.closest('.borrar-creacion');
    if (!boton) return;
    const id = Number(boton.dataset.id);
    const pieza = creaciones.find((c) => c.id === id);
    if (!pieza || !esMia(pieza)) return;
    creaciones = creaciones.filter((c) => c.id !== id);
    guardar(CLAVE_CREACIONES, creaciones);
    pintarCreaciones();
    pintarPerfil();
    mostrarToast('Creación eliminada.');
  });

  /* ================= Foro ================= */
  const pintarForo = () => {
    const lista = document.getElementById('foro-lista');
    if (!foro.length) {
      lista.innerHTML = `
        <div class="vacio">
          <i class="fa-solid fa-comments" aria-hidden="true"></i>
          <p><b>El foro está empezando.</b><br>Sé la primera en dejar una idea o una opinión.</p>
        </div>`;
      return;
    }
    lista.innerHTML = foro
      .map((p) => `
        <article class="foro-item${esMia(p) ? ' foro-item-mia' : ''} reveal">
          ${avatarHTML({ foto: p.foto, nombre: p.autor }, 'avatar-mini')}
          <div class="foro-cuerpo">
            <div class="foro-cabecera">
              <strong>${esc(p.autor)}${esMia(p) ? ' <em class="foro-tu">(tú)</em>' : ''}</strong>
              <span>${formatoFecha(p.fecha)}</span>
            </div>
            <p>${esc(p.texto)}</p>
            <button class="foro-me-gusta ${p.meGusta ? 'activo' : ''}" type="button" data-id="${p.id}" aria-pressed="${p.meGusta}">
              <i class="fa-solid fa-heart" aria-hidden="true"></i> ${p.meGusta ? 'Te encanta' : 'Me encanta'}
            </button>
          </div>
        </article>`)
      .join('');
    observarRevelar();
  };

  document.getElementById('form-foro').addEventListener('submit', (e) => {
    e.preventDefault();
    const texto = document.getElementById('texto-foro').value.trim();
    if (!texto) {
      mostrarToast('Escribe tu mensaje antes de publicar.');
      return;
    }
    foro.unshift({
      id: Date.now(),
      autorId: usuario.id,
      autor: perfil.nombre,
      foto: perfil.foto,
      texto,
      fecha: new Date().toISOString(),
      meGusta: false,
    });
    if (guardar(CLAVE_FORO, foro)) {
      pintarForo();
      pintarPerfil();
      document.getElementById('form-foro').reset();
      mostrarToast('¡Publicado en el foro!');
    }
  });

  document.getElementById('foro-lista').addEventListener('click', (e) => {
    const boton = e.target.closest('.foro-me-gusta');
    if (!boton) return;
    const id = Number(boton.dataset.id);
    const publicacion = foro.find((p) => p.id === id);
    if (!publicacion) return;
    publicacion.meGusta = !publicacion.meGusta;
    guardar(CLAVE_FORO, foro);
    pintarForo();
  });

  /* ================= Animaciones al aparecer ================= */
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

  /* ================= Menú móvil y sombra del encabezado ================= */
  const botonMenu = document.getElementById('boton-menu');
  const menu = document.getElementById('menu');

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

  const encabezado = document.querySelector('.encabezado');
  window.addEventListener('scroll', () => {
    encabezado.style.boxShadow =
      window.scrollY > 10 ? '0 6px 26px rgba(61, 64, 91, 0.12)' : 'none';
  });

  /* ================= Arranque ================= */
  pintarPerfil();
  pintarCreaciones();
  pintarForo();
  observarRevelar();
})();