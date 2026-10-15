/* ============================================================
   PUNTO & ALMA · Página de acceso
   Lee los parámetros de la URL (?modo, ?redir, ?motivo) para
   saber si la persona viene a entrar, a crear una cuenta de
   clienta o a crear la cuenta de administradora.
   ============================================================ */

(() => {
  const PAAuth = window.PAAuth;
  const $ = (id) => document.getElementById(id);

  if (!PAAuth) return;

  const parametros = new URLSearchParams(window.location.search);
  /* Solo permitimos redirigir a una página interna (evita enlaces externos). */
  const redirBruto = parametros.get('redir') || '';
  const redir = /^[a-z0-9_-]+\.html$/i.test(redirBruto) ? redirBruto : '';
  const modo = parametros.get('modo') || '';
  const motivo = parametros.get('motivo') || '';

  let rolCrear = 'cliente';

  /* ---------- Aviso flotante ---------- */
  const toast = $('toast');
  let tempToast = null;
  const aviso = (mensaje) => {
    if (!toast) return;
    toast.innerHTML = `<i class="fa-solid fa-circle-check" aria-hidden="true"></i> ${mensaje}`;
    toast.hidden = false;
    requestAnimationFrame(() => toast.classList.add('mostrar'));
    clearTimeout(tempToast);
    tempToast = setTimeout(() => {
      toast.classList.remove('mostrar');
      setTimeout(() => { toast.hidden = true; }, 380);
    }, 2600);
  };

  /* ---------- Pestañas ---------- */
  const paneles = { entrar: $('form-entrar'), crear: $('form-crear') };
  const pestanas = { entrar: $('pestana-entrar'), crear: $('pestana-crear') };

  const mostrarPanel = (nombre) => {
    Object.keys(paneles).forEach((k) => {
      if (!paneles[k]) return;
      paneles[k].hidden = k !== nombre;
      pestanas[k].classList.toggle('activo', k === nombre);
      pestanas[k].setAttribute('aria-selected', String(k === nombre));
    });
    const cambiar = $('acceso-cambiar');
    if (cambiar) {
      cambiar.innerHTML = nombre === 'entrar'
        ? '¿No tienes cuenta? <button type="button" class="enlace" data-ir="crear">Créala gratis</button>'
        : '¿Ya tienes cuenta? <button type="button" class="enlace" data-ir="entrar">Inicia sesión</button>';
    }
    const primero = nombre === 'entrar' ? $('entrar-email') : $('crear-nombre');
    if (primero) setTimeout(() => primero.focus(), 60);
  };

  const mostrarError = (el, texto) => {
    if (!el) return;
    el.textContent = texto || '';
    el.hidden = !texto;
  };

  const limpiarErrores = () => {
    mostrarError($('entrar-error'), '');
    mostrarError($('crear-error'), '');
  };

  const banda = (texto, tipo = 'info') => {
    const el = $('acceso-banda');
    if (!el) return;
    el.innerHTML = texto;
    el.className = `acceso-banda ${tipo}`;
    el.hidden = false;
  };

  /* ---------- Destino tras entrar ---------- */
  const destino = (usuario) => {
    if (redir) return redir;
    return usuario && usuario.rol === 'admin' ? 'admin.html' : 'perfil.html';
  };

  const trasEntrar = (usuario) => {
    aviso(`¡Hola, ${usuario.nombre}!`);
    setTimeout(() => { window.location.href = destino(usuario); }, 550);
  };

  /* ---------- Configuración según la URL ---------- */
  const hayAdmin = PAAuth.hayAdmin();

  if (modo === 'crear-admin' || (modo === 'admin' && !hayAdmin)) {
    rolCrear = 'admin';
    mostrarPanel('crear');
    $('acceso-etiqueta').textContent = 'Primera puesta en marcha';
    $('acceso-titulo').textContent = 'Crea la cuenta de administradora';
    $('acceso-texto').textContent = 'Esta es la cuenta con la que vas a manejar la tienda: catálogo, ventas, pedidos y lo que publican tus clientas. Guárdala bien.';
    $('crear-rol').hidden = false;
    $('crear-rol-nota').hidden = false;
    if (motivo === 'protegido') banda('<i class="fa-solid fa-shield-halved" aria-hidden="true"></i> El panel está protegido. Primero crea tu cuenta de administradora.');
  } else if (modo === 'admin') {
    mostrarPanel('entrar');
    $('entrar-rol').hidden = false;
    $('acceso-titulo').textContent = 'Entra al panel de ventas';
    $('acceso-texto').textContent = 'Acceso exclusivo para la administradora de Punto & Alma. Si eres clienta, puedes entrar desde «Mi perfil».';
    if (motivo === 'protegido') banda('<i class="fa-solid fa-lock" aria-hidden="true"></i> Para abrir el panel necesitas iniciar sesión como administradora.');
  } else if (modo === 'crear' || modo === 'registro') {
    mostrarPanel('crear');
  } else {
    if (motivo === 'sesion') {
      banda('<i class="fa-solid fa-lock" aria-hidden="true"></i> Necesitas una cuenta para ver tu perfil. Entra o créala en un minuto.');
    }
    mostrarPanel('entrar');
  }

  /* ---------- Si ya hay sesión abierta ---------- */
  const ya = PAAuth.actual();
  if (ya && !modo) {
    banda(`<i class="fa-solid fa-circle-check" aria-hidden="true"></i> Ya tienes la sesión abierta como <b>${ya.nombre}</b>. Puedes continuar o cambiar de cuenta.`, 'ok');
  }

  /* ---------- Eventos ---------- */
  document.addEventListener('click', (e) => {
    if (!(e.target instanceof Element)) return;
    const boton = e.target.closest('[data-ir]');
    if (!boton) return;
    e.preventDefault();
    mostrarPanel(boton.dataset.ir);
  });

  if (pestanas.entrar) pestanas.entrar.addEventListener('click', () => mostrarPanel('entrar'));
  if (pestanas.crear) pestanas.crear.addEventListener('click', () => mostrarPanel('crear'));

  const formEntrar = $('form-entrar');
  if (formEntrar) {
    formEntrar.addEventListener('submit', (e) => {
      e.preventDefault();
      limpiarErrores();
      const email = $('entrar-email').value.trim();
      const clave = $('entrar-clave').value;
      if (!email || !clave) return mostrarError($('entrar-error'), 'Escribe tu correo y tu contraseña.');

      const r = PAAuth.entrar(email, clave, $('entrar-recordar').checked);
      if (!r.ok) return mostrarError($('entrar-error'), r.error);

      if (modo === 'admin' && r.usuario.rol !== 'admin') {
        PAAuth.salir();
        return mostrarError($('entrar-error'), 'Esa cuenta es de clienta, no de administración.');
      }
      return trasEntrar(r.usuario);
    });
  }

  const formCrear = $('form-crear');
  if (formCrear) {
    formCrear.addEventListener('submit', (e) => {
      e.preventDefault();
      limpiarErrores();
      const nombre = $('crear-nombre').value.trim();
      const email = $('crear-email').value.trim();
      const clave = $('crear-clave').value;
      const clave2 = $('crear-clave2').value;

      if (clave !== clave2) return mostrarError($('crear-error'), 'Las dos contraseñas no coinciden.');

      const r = PAAuth.registrar({ nombre, email, clave, rol: rolCrear });
      if (!r.ok) return mostrarError($('crear-error'), r.error);

      PAAuth.entrar(email, clave, true);
      return trasEntrar(r.usuario);
    });
  }

  /* ---------- Botón de menú móvil (por consistencia) ---------- */
  const botonMenu = $('boton-menu');
  const menu = $('menu');
  if (botonMenu && menu) {
    botonMenu.addEventListener('click', () => {
      const abierto = menu.classList.toggle('abierto');
      botonMenu.setAttribute('aria-expanded', String(abierto));
    });
  }

  /* ---------- Alma conoce el contexto de acceso ---------- */
  window.PAAcceso = { mostrarPanel, rolCrear: () => rolCrear };
})();
