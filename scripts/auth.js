/* ============================================================
   PUNTO & ALMA · Cuentas de usuarias
   Un sistema de registro e inicio de sesión que funciona 100%
   en el navegador (localStorage). Sirve para una tienda real
   solo como demostración: para producción hace falta un
   servidor con autenticación de verdad (mira ayuda.html#cuentas).

   Claves:
   - pa_usuarios → lista de cuentas {id, nombre, email, clave, rol, foto, tipo, creado}
   - pa_sesion   → sesión abierta {usuarioId, desde}
   ============================================================ */

(() => {
  const CLAVE_USUARIOS = 'pa_usuarios';
  const CLAVE_SESION = 'pa_sesion';

  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- Almacenamiento ---------- */
  const leer = (clave, respaldo) => {
    try {
      const crudo = localStorage.getItem(clave);
      return crudo ? JSON.parse(crudo) : respaldo;
    } catch {
      return respaldo;
    }
  };

  const guardar = (clave, valor) => {
    try {
      localStorage.setItem(clave, JSON.stringify(valor));
      return true;
    } catch {
      return false;
    }
  };

  let usuarios = leer(CLAVE_USUARIOS, []);
  if (!Array.isArray(usuarios)) usuarios = [];

  const persistir = () => guardar(CLAVE_USUARIOS, usuarios);

  /* ---------- Firma de la contraseña ----------
     No es criptografía real: es un hash con sal para no guardar
     la contraseña en texto plano. Suficiente para una demostración. */
  const firmar = (texto) => {
    const sal = 'punto&alma::2026';
    const str = `${sal}|${texto}|${sal}`;
    let h1 = 0xdeadbeef ^ str.length;
    let h2 = 0x41c6ce57 ^ str.length;
    for (let i = 0; i < str.length; i += 1) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
  };

  const normalizarEmail = (email) => String(email || '').trim().toLowerCase();
  const emailValido = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  /* ---------- Consultas ---------- */
  const listar = () => usuarios.slice();
  const porId = (id) => usuarios.find((u) => String(u.id) === String(id)) || null;
  const porEmail = (email) => usuarios.find((u) => u.email === normalizarEmail(email)) || null;
  const hayAdmin = () => usuarios.some((u) => u.rol === 'admin');

  const leerSesion = () => {
    let sesion = leer(CLAVE_SESION, null);
    if (!sesion) {
      try {
        sesion = JSON.parse(sessionStorage.getItem(CLAVE_SESION) || 'null');
      } catch {
        sesion = null;
      }
    }
    return sesion;
  };

  const actual = () => {
    const sesion = leerSesion();
    if (!sesion || !sesion.usuarioId) return null;
    const u = porId(sesion.usuarioId);
    if (!u) {
      try {
        localStorage.removeItem(CLAVE_SESION);
      } catch {
        /* nada */
      }
      return null;
    }
    return u;
  };

  const esAdmin = () => {
    const u = actual();
    return Boolean(u && u.rol === 'admin');
  };

  const puedeAdmin = esAdmin;

  const avisar = () => window.dispatchEvent(new CustomEvent('pa:sesion', { detail: { usuario: actual() } }));

  /* ---------- Registrar ---------- */
  const registrar = ({ nombre, email, clave, rol = 'cliente' }) => {
    const limpio = String(nombre || '').trim();
    const correo = normalizarEmail(email);

    if (limpio.length < 2) return { ok: false, error: 'Escribe tu nombre (mínimo 2 letras).' };
    if (!emailValido(correo)) return { ok: false, error: 'Ese correo no parece válido.' };
    if (porEmail(correo)) return { ok: false, error: 'Ya existe una cuenta con ese correo. Inicia sesión.' };
    if (String(clave || '').length < 6) return { ok: false, error: 'La contraseña necesita al menos 6 caracteres.' };

    let roldef = 'cliente';
    if (rol === 'admin') {
      if (hayAdmin() && !esAdmin()) {
        return { ok: false, error: 'Ya existe una administradora. Pídele que te dé acceso.' };
      }
      roldef = 'admin';
    }

    const usuario = {
      id: `u_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      nombre: limpio,
      email: correo,
      clave: firmar(clave),
      rol: roldef,
      foto: '',
      tipo: 'amigurumis',
      creado: new Date().toISOString(),
    };
    usuarios.push(usuario);
    if (!persistir()) {
      usuarios.pop();
      return { ok: false, error: 'No se pudo guardar la cuenta. ¿El navegador está en modo privado?' };
    }
    /* La bitácora (registro.js) escucha este evento y anota el alta
       por su cuenta, así aquí no hay que saber nada de ella. */
    try {
      window.dispatchEvent(new CustomEvent('pa:cuenta', { detail: { ...usuario } }));
    } catch {
      /* sin dispatch */
    }
    return { ok: true, usuario };
  };

  /* ---------- Entrar / salir ---------- */
  const entrar = (email, clave, recordar = true) => {
    const u = porEmail(email);
    if (!u) return { ok: false, error: 'No encontramos una cuenta con ese correo.' };
    if (u.clave !== firmar(clave)) return { ok: false, error: 'La contraseña no coincide. Inténtalo otra vez.' };
    abrirSesion(u, recordar);
    return { ok: true, usuario: u };
  };

  const abrirSesion = (usuario, recordar = true) => {
    const sesion = { usuarioId: usuario.id, desde: new Date().toISOString(), recordar };
    try {
      if (recordar) {
        localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
        sessionStorage.removeItem(CLAVE_SESION);
      } else {
        sessionStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
        localStorage.removeItem(CLAVE_SESION);
      }
    } catch {
      /* nada */
    }
    avisar();
  };

  const salir = () => {
    try {
      localStorage.removeItem(CLAVE_SESION);
      sessionStorage.removeItem(CLAVE_SESION);
    } catch {
      /* nada */
    }
    avisar();
  };

  /* ---------- Actualizar ---------- */
  const actualizar = (id, cambios) => {
    const u = porId(id);
    if (!u) return { ok: false, error: 'Esa cuenta no existe.' };

    let correo = u.email;
    if (cambios.email !== undefined) {
      correo = normalizarEmail(cambios.email);
      if (!emailValido(correo)) return { ok: false, error: 'Ese correo no parece válido.' };
      const repetido = usuarios.find((x) => x.email === correo && String(x.id) !== String(id));
      if (repetido) return { ok: false, error: 'Otra cuenta ya usa ese correo.' };
    }

    if (cambios.clave && String(cambios.clave).length < 6) {
      return { ok: false, error: 'La contraseña necesita 6 caracteres o más.' };
    }

    if (cambios.nombre !== undefined) u.nombre = String(cambios.nombre).trim() || u.nombre;
    if (cambios.foto !== undefined) u.foto = cambios.foto;
    if (cambios.tipo !== undefined) u.tipo = cambios.tipo;
    if (cambios.email !== undefined) u.email = correo;
    if (cambios.clave) u.clave = firmar(cambios.clave);

    persistir();
    avisar();
    return { ok: true, usuario: u };
  };

  const promover = (id) => {
    const u = porId(id);
    if (!u) return { ok: false, error: 'Esa cuenta no existe.' };
    if (u.rol === 'admin') return { ok: true, usuario: u };
    u.rol = 'admin';
    persistir();
    avisar();
    return { ok: true, usuario: u };
  };

  const quitar = (id) => {
    if (String(id) === String((actual() || {}).id)) {
      return { ok: false, error: 'No puedes eliminar tu propia cuenta mientras la usas.' };
    }
    usuarios = usuarios.filter((u) => String(u.id) !== String(id));
    persistir();
    return { ok: true };
  };

  /* ---------- Protección de páginas ---------- */
  const irA = (ruta) => {
    try {
      window.location.replace(ruta);
    } catch {
      window.location.href = ruta;
    }
  };

  const protegerAdmin = () => {
    const redir = encodeURIComponent('admin.html');
    if (!hayAdmin()) return irA(`acceso.html?modo=crear-admin&redir=${redir}`);
    return irA(`acceso.html?modo=admin&redir=${redir}&motivo=protegido`);
  };

  const requiereSesion = (redir = 'perfil.html', motivo = 'sesion') =>
    irA(`acceso.html?redir=${encodeURIComponent(redir)}&motivo=${motivo}`);

  /* ---------- Cabecera (menú de cuenta) ---------- */
  const pintarCabecera = () => {
    /* Ojo: en la tienda el botón de favoritos también usa la clase .usuario.
       La cuenta es siempre un enlace, así que nos fijamos en a.usuario. */
    const viejo = document.querySelector('.acciones a.usuario');
    if (!viejo) return;

    const u = actual();
    const enAcceso = /acceso\.html/.test(window.location.pathname);

    if (!u) {
      viejo.outerHTML = `<a class="usuario" href="acceso.html" aria-label="Iniciar sesión" title="Iniciar sesión"><i class="fa-solid fa-user" aria-hidden="true"></i></a>`;
      return;
    }

    const inicial = String(u.nombre || u.email || '?').trim().charAt(0).toUpperCase();
    const avatar = u.foto ? `<img src="${u.foto}" alt="">` : inicial;

    viejo.outerHTML = `
      <div class="usuario-caja">
        <button class="usuario usuario-activo" type="button" aria-haspopup="true" aria-expanded="false" aria-label="Mi cuenta" title="Mi cuenta">
          <span class="usuario-avatar${u.foto ? ' con-foto' : ''}">${avatar}</span>
        </button>
        <div class="usuario-menu" hidden>
          <p class="usuario-datos">
            <b>${esc(u.nombre)}</b>
            <span>${esc(u.email)}</span>
            <em>${u.rol === 'admin' ? 'Administradora' : 'Clienta'}</em>
          </p>
          ${enAcceso ? '' : '<a href="perfil.html"><i class="fa-solid fa-user" aria-hidden="true"></i> Mi perfil</a>'}
          ${u.rol === 'admin' ? '<a href="admin.html"><i class="fa-solid fa-chart-line" aria-hidden="true"></i> Panel de ventas</a>' : ''}
          <a href="ayuda.html"><i class="fa-solid fa-book-open" aria-hidden="true"></i> Guías y ayuda</a>
          <button type="button" data-salir><i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i> Cerrar sesión</button>
        </div>
      </div>`;

    const caja = document.querySelector('.usuario-caja');
    const boton = caja.querySelector('.usuario-activo');
    const menu = caja.querySelector('.usuario-menu');
    const cerrarMenu = () => {
      menu.hidden = true;
      boton.setAttribute('aria-expanded', 'false');
    };
    boton.addEventListener('click', (e) => {
      e.stopPropagation();
      const abierto = menu.hidden;
      menu.hidden = !abierto;
      boton.setAttribute('aria-expanded', String(abierto));
    });
    document.addEventListener('click', (e) => {
      if (!caja.contains(e.target)) cerrarMenu();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') cerrarMenu();
    });
  };

  const manejarSalir = (e) => {
    if (!(e.target instanceof Element)) return;
    const boton = e.target.closest('[data-salir]');
    if (!boton) return;
    e.preventDefault();
    salir();
    const enAdmin = /admin\.html/.test(window.location.pathname);
    irA(enAdmin ? 'index.html' : window.location.pathname.replace(/[^/]*$/, 'index.html'));
  };

  document.addEventListener('click', manejarSalir);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', pintarCabecera);
  } else {
    pintarCabecera();
  }

  window.PAAuth = {
    CLAVE_USUARIOS,
    CLAVE_SESION,
    registrar,
    entrar,
    salir,
    actual,
    esAdmin,
    puedeAdmin,
    hayAdmin,
    listar,
    porId,
    porEmail,
    actualizar,
    promover,
    quitar,
    firmar,
    protegerAdmin,
    requiereSesion,
    pintarCabecera,
  };
})();
