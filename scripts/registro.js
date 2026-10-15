/* ============================================================
   PUNTO & ALMA · Bitácora automática de registros
   Cada cuenta nueva, cada suscripción al boletín y cada pedido
   dejan anotación solos, sin que nadie llene nada a mano. El
   panel de administración lee esta bitácora, la filtra y la
   exporta a CSV.

   Aquí nunca se guardan contraseñas ni claves: solo el nombre,
   el correo y un resumen corto de lo que pasó.

   Claves:
   - pa_registros → [{ id, tipo, fecha, nombre, correo, detalle, donde }]
   - pa_boletin   → correos suscritos (también los lee el panel)
   ============================================================ */

(() => {
  const CLAVE_REGISTROS = 'pa_registros';
  const CLAVE_BOLETIN = 'pa_boletin';
  const MAXIMO = 600;

  /* Cada tipo de anotación con su etiqueta, su icono y su color.
     El panel pinta las tablas a partir de esta lista. */
  const TIPOS = {
    cuenta: {
      etiqueta: 'Cuenta nueva',
      icono: 'fa-user-plus',
      clase: 'nueva',
      nota: 'Se registró sola desde el formulario de acceso',
    },
    boletin: {
      etiqueta: 'Boletín',
      icono: 'fa-envelope',
      clase: 'editada',
      nota: 'Dejó su correo para recibir estrenos y ofertas',
    },
    pedido: {
      etiqueta: 'Pedido',
      icono: 'fa-bag-shopping',
      clase: 'borrada',
      nota: 'Compró desde el carrito',
    },
  };

  const ORDEN_TIPOS = ['cuenta', 'boletin', 'pedido'];

  /* ---------- Almacenamiento ---------- */
  const leer = (clave, porDefecto) => {
    try {
      const crudo = localStorage.getItem(clave);
      const valor = crudo ? JSON.parse(crudo) : porDefecto;
      return valor ?? porDefecto;
    } catch {
      return porDefecto;
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

  const normalizarCorreo = (correo) => String(correo || '').trim().toLowerCase();

  const correoValido = (correo) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);

  /* ---------- Bitácora ---------- */
  const listar = () => {
    const datos = leer(CLAVE_REGISTROS, []);
    const lista = Array.isArray(datos) ? datos : [];
    /* Dejamos solo lo que se parece a una anotación para que un dato
       raro guardado a mano no rompa el panel. */
    return lista
      .filter((r) => r && typeof r === 'object' && TIPOS[r.tipo])
      .map((r) => ({
        id: String(r.id || ''),
        tipo: r.tipo,
        fecha: r.fecha || new Date().toISOString(),
        nombre: String(r.nombre || ''),
        correo: normalizarCorreo(r.correo),
        detalle: String(r.detalle || ''),
        donde: String(r.donde || ''),
      }))
      .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  };

  /* Apuntar una anotación. Devuelve la anotación o null si no se pudo. */
  const anotar = (tipo, datos = {}) => {
    if (!TIPOS[tipo]) return null;

    const anotacion = {
      id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      tipo,
      fecha: new Date().toISOString(),
      nombre: String(datos.nombre || '').trim(),
      correo: normalizarCorreo(datos.correo),
      detalle: String(datos.detalle || '').trim(),
      donde: String(datos.donde || '').trim(),
    };

    const lista = listar();
    /* Si es el mismo correo del mismo tipo en el mismo minuto, no repetimos. */
    const repetido = lista.some(
      (r) =>
        r.tipo === tipo &&
        r.correo === anotacion.correo &&
        r.detalle === anotacion.detalle &&
        Math.abs(new Date(r.fecha) - new Date(anotacion.fecha)) < 60000
    );
    if (repetido) return null;

    lista.unshift(anotacion);
    guardar(CLAVE_REGISTROS, lista.slice(0, MAXIMO));
    window.dispatchEvent(new CustomEvent('pa:registro', { detail: anotacion }));
    return anotacion;
  };

  const quitar = (id) => {
    const lista = listar().filter((r) => r.id !== String(id));
    guardar(CLAVE_REGISTROS, lista);
    return lista.length;
  };

  const vaciar = () => {
    guardar(CLAVE_REGISTROS, []);
  };

  /* Números rápidos para las tarjetas del panel. */
  const resumen = () => {
    const lista = listar();
    const cuenta = (tipo) => lista.filter((r) => r.tipo === tipo).length;
    const desde = Date.now() - 7 * 86400000;
    const semana = lista.filter((r) => new Date(r.fecha).getTime() >= desde).length;
    const correos = new Set(lista.map((r) => r.correo).filter(Boolean));

    return {
      total: lista.length,
      cuentas: cuenta('cuenta'),
      boletin: cuenta('boletin'),
      pedidos: cuenta('pedido'),
      semana,
      correos: correos.size,
      ultimo: lista[0] || null,
    };
  };

  /* ---------- Boletín ---------- */
  const boletin = () => {
    const datos = leer(CLAVE_BOLETIN, []);
    const lista = Array.isArray(datos) ? datos : [];
    /* Normalizamos a objetos {correo, fecha} y toleramos la lista plana
       que guardaba la versión anterior del formulario. */
    return lista
      .map((item) => {
        if (typeof item === 'string') {
          return { correo: normalizarCorreo(item), fecha: '' };
        }
        if (item && typeof item === 'object' && item.correo) {
          return { correo: normalizarCorreo(item.correo), fecha: String(item.fecha || '') };
        }
        return null;
      })
      .filter(Boolean)
      .filter((item, i, arr) => arr.findIndex((x) => x.correo === item.correo) === i)
      .filter((item) => correoValido(item.correo));
  };

  const guardarBoletin = (lista) => guardar(CLAVE_BOLETIN, lista);

  /* Suscribe un correo y deja la anotación en la bitácora.
     Devuelve 'nuevo', 'repetido' o 'invalido'. */
  const suscribir = (correo, opciones = {}) => {
    const limpio = normalizarCorreo(correo);
    if (!correoValido(limpio)) return 'invalido';

    const lista = boletin();
    const yaEsta = lista.some((x) => x.correo === limpio);

    if (!yaEsta) {
      lista.push({ correo: limpio, fecha: new Date().toISOString() });
      guardarBoletin(lista);
      anotar('boletin', {
        correo: limpio,
        nombre: opciones.nombre || '',
        detalle: opciones.detalle || '',
        donde: opciones.donde || 'Boletín de la portada',
      });
    }
    return yaEsta ? 'repetido' : 'nuevo';
  };

  const quitarBoletin = (correo) => {
    const limpio = normalizarCorreo(correo);
    guardarBoletin(boletin().filter((x) => x.correo !== limpio));
    return limpiarEnBitacora(limpio);
  };

  /* Borra de la bitácora todas las anotaciones de un correo. */
  const limpiarEnBitacora = (correo) => {
    const limpio = normalizarCorreo(correo);
    guardar(
      CLAVE_REGISTROS,
      listar().filter((r) => r.correo !== limpio)
    );
  };

  /* ---------- Escucha lo que pasa en el resto del sitio ---------- */
  /* auth.js lanza pa:cuenta al crear una cuenta y carrito.js lanza
     pa:pedido al confirmar la compra. Así la bitácora se llena sola
     sin tocar esos archivos más que con un dispatch. */
  window.addEventListener('pa:cuenta', (e) => {
    const u = (e && e.detail) || {};
    anotar('cuenta', {
      nombre: u.nombre,
      correo: u.email,
      detalle: u.rol === 'admin' ? 'Cuenta de administración' : 'Cuenta de clienta',
      donde: 'Formulario de acceso',
    });
  });

  window.addEventListener('pa:pedido', (e) => {
    const pedido = (e && e.detail) || {};
    const cliente = pedido.cliente || {};
    const unidades = (pedido.items || []).reduce(
      (t, i) => t + (Number(i.cantidad) || 1),
      0
    );
    anotar('pedido', {
      nombre: cliente.nombre || 'Compradora invitada',
      correo: cliente.email || '',
      detalle: `${unidades} ${unidades === 1 ? 'pieza' : 'piezas'} · ${Number(pedido.total || 0).toLocaleString('es-CO')}`,
      donde: 'Carrito de la tienda',
    });
  });

  window.PARegistro = {
    CLAVE_REGISTROS,
    CLAVE_BOLETIN,
    MAXIMO,
    TIPOS,
    ORDEN_TIPOS,
    anotar,
    listar,
    quitar,
    vaciar,
    resumen,
    boletin,
    suscribir,
    quitarBoletin,
    limpiarEnBitacora,
  };
})();