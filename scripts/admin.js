/* ============================================================
   PUNTO & ALMA · Panel de ventas y pedidos
   Los pedidos llegan de pa_pedidos (creados al finalizar el
   carrito o desde el formulario de venta manual) y se pueden
   cambiar de estado o eliminar desde aquí.
   ============================================================ */

(() => {
  const PAC = window.PACarrito;
  const $ = (id) => document.getElementById(id);

  /* ---------- Puerta de entrada: solo administración ---------- */
  const PAAuth = window.PAAuth;
  if (!PAAuth || !PAAuth.puedeAdmin()) {
    if (PAAuth) PAAuth.protegerAdmin();
    return;
  }

  const ESTADOS = {
    pendiente: { etiqueta: 'Pendiente' },
    pagado: { etiqueta: 'Pagado' },
    enviado: { etiqueta: 'Enviado' },
    entregado: { etiqueta: 'Entregado' },
    cancelado: { etiqueta: 'Cancelado' },
  };
  const ORDEN_ESTADOS = ['pendiente', 'pagado', 'enviado', 'entregado', 'cancelado'];

  /* ---------- Utilidades ---------- */
  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* Un solo lugar para bajar cualquier lista como CSV: así el archivo
     sale con el mismo formato de siempre, con BOM y separador de coma. */
  const descargarCSV = (nombre, cabeceras, filas) => {
    if (!filas || !filas.length) {
      mostrarToast('No hay nada para descargar todavía.');
      return false;
    }
    const celda = (valor) => `"${String(valor ?? '').replace(/"/g, '""')}"`;
    const csv = [cabeceras.join(','), ...filas.map((fila) => fila.map(celda).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(blob);
    enlace.download = nombre;
    enlace.click();
    URL.revokeObjectURL(enlace.href);
    mostrarToast('Reporte descargado.');
    return true;
  };

  const toast = $('toast');
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

  const formatoFechaLarga = (iso) =>
    new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });

  const esValido = (pedido) => pedido.estado !== 'cancelado';

  let pedidos = PAC.leerPedidos();
  if (!Array.isArray(pedidos)) pedidos = [];

  const guardarPedidos = () => PAC.guardarPedidos(pedidos);

  /* ---------- Badge del carrito ---------- */
  $('contador-carrito').textContent = PAC.contar();
  window.addEventListener('pa:carrito', () => {
    $('contador-carrito').textContent = PAC.contar();
  });

  /* ---------- Quién está usando el panel ---------- */
  const sesion = PAAuth.actual();
  if (sesion && $('sesion-admin')) {
    $('sesion-admin').innerHTML =
      `<i class="fa-solid fa-circle-user" aria-hidden="true"></i> ${esc(sesion.nombre)}`;
  }

  /* ---------- Resumen ---------- */
  const pintarResumen = () => {
    const validos = pedidos.filter(esValido);
    const ingresos = validos.reduce((t, p) => t + (Number(p.total) || 0), 0);
    const porDespachar = pedidos.filter((p) => ['pendiente', 'pagado'].includes(p.estado)).length;
    const entregados = pedidos.filter((p) => p.estado === 'entregado').length;
    const ticket = validos.length ? Math.round(ingresos / validos.length) : 0;
    /* Cuántos productos se vendieron: se suman las unidades de cada pedido válido. */
    const unidades = validos.reduce(
      (t, p) => t + (p.items || []).reduce((s, i) => s + (Number(i.cantidad) || 1), 0),
      0
    );

    $('stats-panel').innerHTML = `
      <div class="stat-grande azul">
        <i class="fa-solid fa-receipt" aria-hidden="true"></i>
        <b>${pedidos.length}</b>
        <span>Pedidos totales</span>
        <p>${pedidos.filter((p) => p.estado === 'cancelado').length} cancelados</p>
      </div>
      <div class="stat-grande salvia">
        <i class="fa-solid fa-basket-shopping" aria-hidden="true"></i>
        <b>${unidades}</b>
        <span>Productos vendidos</span>
        <p>Unidades en pedidos válidos</p>
      </div>
      <div class="stat-grande terracota">
        <i class="fa-solid fa-sack-dollar" aria-hidden="true"></i>
        <b>${PAC.formatearPrecio(ingresos)}</b>
        <span>Ingresos</span>
        <p>Pedidos válidos: ${validos.length}</p>
      </div>
      <div class="stat-grande salvia">
        <i class="fa-solid fa-truck-fast" aria-hidden="true"></i>
        <b>${porDespachar}</b>
        <span>Por despachar</span>
        <p>${entregados} entregados</p>
      </div>
      <div class="stat-grande miel">
        <i class="fa-solid fa-scale-balanced" aria-hidden="true"></i>
        <b>${PAC.formatearPrecio(ticket)}</b>
        <span>Ticket promedio</span>
        <p>Sin contabilizar cancelados</p>
      </div>`;
  };

  /* ---------- Ventas por semana (barras) ---------- */
  const pintarBarras = () => {
    const contenedor = $('barras-ventas');
    const semanas = [];
    const ahora = new Date();
    const lunesDe = (fecha) => {
      const d = new Date(fecha);
      const dia = (d.getDay() + 6) % 7;
      d.setDate(d.getDate() - dia);
      d.setHours(0, 0, 0, 0);
      return d;
    };
    for (let i = 7; i >= 0; i -= 1) {
      const inicio = lunesDe(ahora);
      inicio.setDate(inicio.getDate() - 7 * i);
      const fin = new Date(inicio);
      fin.setDate(fin.getDate() + 7);
      semanas.push({ inicio, fin });
    }

    const etiquetaCorta = (d) =>
      d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });

    const porSemana = semanas.map(({ inicio, fin }) =>
      pedidos
        .filter((p) => esValido(p))
        .filter((p) => {
          const fecha = new Date(p.fecha);
          return fecha >= inicio && fecha < fin;
        })
        .reduce((t, p) => t + (Number(p.total) || 0), 0)
    );

    const maximo = Math.max(1, ...porSemana);
    const esSemanaActual = (i) => i === semanas.length - 1;

    if (!pedidos.some(esValido)) {
      contenedor.innerHTML = `<p class="barra-vacio">Aún no hay ventas para graficar. Cuando lleguen los primeros pedidos, aquí verás el movimiento semanal.</p>`;
      return;
    }

    contenedor.innerHTML = porSemana
      .map((valor, i) => `
        <div class="barra" data-vacia="${valor ? 0 : 1}" title="${PAC.formatearPrecio(valor)}">
          <span class="barra-valor">${valor ? Math.round(valor / 1000) + 'k' : '—'}</span>
          <div class="barra-fill" style="height: ${Math.max(3, Math.round((valor / maximo) * 150))}px;"></div>
          <span class="barra-nombre">${esSemanaActual(i) ? 'esta sem.' : etiquetaCorta(semanas[i].inicio)}</span>
        </div>`)
      .join('');
  };

  /* ---------- Productos más vendidos ---------- */
  const pintarTop = () => {
    const contenedor = $('top-productos');
    const agregados = {};
    pedidos
      .filter(esValido)
      .forEach((p) =>
        (p.items || []).forEach((item) => {
          const nombre = item.nombre || 'Producto';
          if (!agregados[nombre]) agregados[nombre] = { cantidad: 0, total: 0 };
          agregados[nombre].cantidad += Number(item.cantidad) || 1;
          agregados[nombre].total += (Number(item.precio) || 0) * (Number(item.cantidad) || 1);
        })
      );
    const top = Object.entries(agregados)
      .sort((a, b) => b[1].cantidad - a[1].cantidad)
      .slice(0, 5);

    if (!top.length) {
      contenedor.innerHTML = `<li class="top-vacio">Los favoritos aparecerán aquí.</li>`;
      return;
    }

    contenedor.innerHTML = top
      .map(
        ([nombre, datos], i) => `
        <li>
          <span class="top-num">${i + 1}</span>
          <span class="top-info">
            <b>${esc(nombre)}</b>
            <span>${datos.cantidad} ${datos.cantidad === 1 ? 'unidad' : 'unidades'}</span>
          </span>
          <span class="top-total">${PAC.formatearPrecio(datos.total)}</span>
        </li>`
      )
      .join('');
  };

  /* ---------- Tabla de pedidos ---------- */
  const pintarTabla = () => {
    const contenedor = $('tabla-pedidos');
    if (!pedidos.length) {
      contenedor.innerHTML = `
        <div class="tabla-vacio">
          <i class="fa-solid fa-box-open" aria-hidden="true"></i>
          <p>No tienes pedidos todavía. Los pedidos que confirmen tus clientes en el carrito (o los que registres manualmente) aparecerán aquí.</p>
        </div>`;
      return;
    }

    contenedor.innerHTML = `
      <table class="tabla-pedidos">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Cliente</th>
            <th>Productos</th>
            <th>Total</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${pedidos
            .map(
              (p) => `
            <tr>
              <td class="tabla-fecha">${formatoFechaLarga(p.fecha)}</td>
              <td class="tabla-cliente">
                <b>${esc(p.cliente?.nombre || 'Cliente')}</b>
                <span>${esc(p.cliente?.telefono || '')}${p.cliente?.direccion ? ' · ' + esc(p.cliente.direccion) : ''}</span>
              </td>
              <td>
                <ul class="tabla-items">
                  ${(p.items || [])
                    .map((item) => `<li>${esc(item.nombre)} × ${item.cantidad}</li>`)
                    .join('')}
                </ul>
              </td>
              <td class="tabla-total">${PAC.formatearPrecio(p.total)}</td>
              <td><select class="estado estado-${esc(p.estado)}" data-estado data-id="${p.id}">
                ${ORDEN_ESTADOS.map(
                  (e) => `<option value="${e}" ${e === p.estado ? 'selected' : ''}>${ESTADOS[e].etiqueta}</option>`
                ).join('')}
              </select></td>
              <td><button class="tabla-quita" type="button" data-eliminar="${p.id}" aria-label="Eliminar pedido"><i class="fa-solid fa-trash-can" aria-hidden="true"></i></button></td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>`;
  };

  $('tabla-pedidos').addEventListener('change', (e) => {
    const select = e.target.closest('[data-estado]');
    if (!select) return;
    const pedido = pedidos.find((p) => p.id === Number(select.dataset.id));
    if (!pedido) return;
    pedido.estado = select.value;
    guardarPedidos();
    select.className = `estado estado-${esc(pedido.estado)}`;
    pintarResumen();
    mostrarToast(`Pedido marcado como “${ESTADOS[pedido.estado].etiqueta}”.`);
  });

  $('tabla-pedidos').addEventListener('click', (e) => {
    const boton = e.target.closest('[data-eliminar]');
    if (!boton) return;
    const id = Number(boton.dataset.eliminar);
    const pedido = pedidos.find((p) => p.id === id);
    if (!pedido) return;
    if (!window.confirm('¿Eliminar este pedido? Esta acción no se puede deshacer.')) return;
    pedidos = pedidos.filter((p) => p.id !== id);
    guardarPedidos();
    pintarTodo();
    mostrarToast('Pedido eliminado.');
  });

  /* ---------- Registrar venta manual ---------- */
  $('form-manual').addEventListener('submit', (e) => {
    e.preventDefault();
    const cliente = $('venta-cliente').value.trim();
    const concepto = $('venta-concepto').value.trim();
    const total = Math.max(0, Number($('venta-total').value) || 0);

    if (!cliente || !concepto || !total) {
      mostrarToast('Completa cliente, producto y total para registrar la venta.');
      return;
    }

    pedidos.unshift({
      id: Date.now(),
      fecha: new Date().toISOString(),
      cliente: {
        nombre: cliente,
        telefono: $('venta-telefono').value.trim(),
        direccion: '',
      },
      items: [{ nombre: concepto, cantidad: 1, precio: total }],
      total,
      estado: $('venta-estado').value,
    });
    guardarPedidos();
    $('form-manual').reset();
    pintarTodo();
    mostrarToast('Venta registrada.');
  });

  /* ---------- Descargar reporte CSV ---------- */
  $('descargar-csv').addEventListener('click', () => {
    const cabeceras = ['Fecha', 'Cliente', 'Telefono', 'Direccion', 'Productos', 'Total', 'Estado'];
    const filas = pedidos.map((p) => [
      new Date(p.fecha).toLocaleString('es-CO'),
      p.cliente?.nombre || '',
      p.cliente?.telefono || '',
      p.cliente?.direccion || '',
      (p.items || []).map((i) => `${i.nombre} x${i.cantidad}`).join(' / '),
      String(p.total || 0),
      ESTADOS[p.estado]?.etiqueta || p.estado,
    ]);
    descargarCSV(`pedidos-punto-alma-${new Date().toISOString().slice(0, 10)}.csv`, cabeceras, filas);
  });

  /* ============================================================
     GESTIÓN DEL CATÁLOGO
     Agregar, editar y quitar productos sin tocar el código.
     ============================================================ */
  const CAT = window.PACatalogo;
  const IA = window.PAIA;

  const vistaCatalogo = { vista: 'todos', busqueda: '' };
  let editandoId = null;

  /* Los cambios del panel se guardan como una capa aparte del código,
     así que "restaurar" siempre devuelve el catálogo original intacto. */
  const overrides = () => {
    try {
      const d = JSON.parse(localStorage.getItem(CAT.CLAVE_CATALOGO));
      return d && typeof d === 'object' ? d : {};
    } catch {
      return {};
    }
  };

  const porId = (id) => CAT.obtener().find((p) => p.id === id) || null;
  const eliminados = () => {
    const ids = overrides().eliminados || [];
    return ids.map((id) => CAT.base().find((p) => p.id === id)).filter(Boolean);
  };

  /* ---------- Lista de productos ---------- */
  const listaCoincide = (p, q) => {
    if (!q) return true;
    const n = esc(p.nombre || '').toLowerCase() + ' ' + esc(p.categoria || '').toLowerCase();
    return q
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .every((palabra) => n.includes(palabra));
  };

  const pintarCatalogo = () => {
    const cont = $('lista-productos-admin');
    if (!cont) return;

    const q = vistaCatalogo.busqueda;
    const ov = overrides();

    let lista = [];
    let vacio = '';

    if (vistaCatalogo.vista === 'eliminados') {
      lista = eliminados().filter((p) => listaCoincide(p, q));
      vacio = 'No hay productos eliminados.';
    } else if (vistaCatalogo.vista === 'nuevos') {
      lista = (ov.agregados || []).filter((p) => listaCoincide(p, q));
      vacio = 'Aún no agregas productos nuevos.';
    } else if (vistaCatalogo.vista === 'editados') {
      const ids = Object.keys(ov.actualizados || {});
      lista = ids.map((id) => porId(id)).filter((p) => p && listaCoincide(p, q));
      vacio = 'No has editado ningún producto del catálogo original.';
    } else {
      lista = CAT.obtener().filter((p) => listaCoincide(p, q));
      vacio = 'Ningún producto coincide con tu búsqueda.';
    }

    $('aviso-edicion').hidden = !CAT.catalogoEditado();

    /* Sugerencias de categoría para el editor */
    const datalist = $('lista-categorias');
    if (datalist) {
      const cats = [...new Set(CAT.obtener().map((p) => p.categoria))].sort();
      datalist.innerHTML = cats.map((c) => `<option value="${esc(c)}"></option>`).join('');
    }

    if (!lista.length) {
      cont.innerHTML = `<p class="lista-vacia">${esc(vacio)}</p>`;
      return;
    }

    cont.innerHTML = lista
      .map((p) => {
        const esNuevo = (ov.agregados || []).some((x) => x.id === p.id);
        const esEditado = Boolean((ov.actualizados || {})[p.id]);
        const borrado = (overrides().eliminados || []).includes(p.id);
        const marcas = [
          esNuevo ? '<span class="marca-item nueva">Nuevo</span>' : '',
          esEditado ? '<span class="marca-item editada">Editado</span>' : '',
          borrado ? '<span class="marca-item borrada">Eliminado</span>' : '',
        ].join('');
        return `
          <div class="item-producto ${borrado ? 'eliminado' : ''}">
            <img src="${esc(p.imagen)}" alt="${esc(p.nombre)}" loading="lazy" onerror="this.src='recursos/img/producto-ovillos.jpg'">
            <div class="item-datos">
              <b>${esc(p.nombre)} ${marcas}</b>
              <span>${esc(p.categoria)} · ${CAT.formatearPrecio(p.precio)}${
                p.tipo === 'digital' ? ' · Digital' : ''
              }</span>
              <code>${esc(p.id)}</code>
            </div>
            <div class="item-acciones">
              ${
                borrado
                  ? `<button class="item-btn restaurar" type="button" data-restaurar="${esc(
                      p.id
                    )}" title="Restaurar"><i class="fa-solid fa-rotate-left" aria-hidden="true"></i> Restaurar</button>`
                  : `<button class="item-btn editar" type="button" data-editar="${esc(
                      p.id
                    )}" title="Editar"><i class="fa-solid fa-pen" aria-hidden="true"></i> Editar</button>
                     <a class="item-btn ver" href="producto.html?id=${encodeURIComponent(
                       p.id
                     )}" target="_blank" title="Ver en la tienda"><i class="fa-solid fa-eye" aria-hidden="true"></i></a>
                     <button class="item-btn borrar" type="button" data-borrar="${esc(
                       p.id
                     )}" title="Quitar de la tienda"><i class="fa-solid fa-trash-can" aria-hidden="true"></i></button>`
              }
            </div>
          </div>`;
      })
      .join('');
  };

  $('lista-productos-admin').addEventListener('click', (e) => {
    const editar = e.target.closest('[data-editar]');
    if (editar) return abrirEditor(editar.dataset.editar);

    const borrar = e.target.closest('[data-borrar]');
    if (borrar) {
      const id = borrar.dataset.borrar;
      const p = porId(id);
      if (!p) return;
      if (!window.confirm(`¿Quitar “${p.nombre}” de la tienda?\nPodrás restaurarlo después desde la pestaña “Eliminados”.`)) return;
      CAT.eliminarProducto(id);
      pintarCatalogo();
      mostrarToast(`“${p.nombre}” salió de la tienda.`);
      return;
    }

    const restaurar = e.target.closest('[data-restaurar]');
    if (restaurar) {
      const id = restaurar.dataset.restaurar;
      const ov = overrides();
      ov.eliminados = (ov.eliminados || []).filter((x) => x !== id);
      CAT.guardarOverrides(ov);
      CAT.reaplicar();
      pintarCatalogo();
      mostrarToast('Producto restaurado.');
    }
  });

  /* ---------- Editor de producto ---------- */
  const modalProducto = $('modal-producto');
  const formProducto = $('form-producto');

  const campos = {
    id: $('p-id'),
    nombre: $('p-nombre'),
    categoria: $('p-categoria'),
    tipo: $('p-tipo'),
    precio: $('p-precio'),
    precioAntes: $('p-precio-antes'),
    rating: $('p-rating'),
    resenas: $('p-resenas'),
    insignia: $('p-insignia'),
    insigniaOtro: $('p-insignia-otro'),
    campoOtro: $('campo-insignia-otro'),
    stock: $('p-stock'),
    imagen: $('p-imagen'),
    imagenes: $('p-imagenes'),
    descripcion: $('p-descripcion'),
    beneficios: $('p-beneficios'),
    detalles: $('p-detalles'),
    cuidados: $('p-cuidados'),
    envio: $('p-envio'),
  };

  const previa = $('previa-producto');

  const actualizarPrevia = () => {
    const ruta = (campos.imagen.value || '').trim() || 'recursos/img/producto-ovillos.jpg';
    previa.src = ruta;
  };
  campos.imagen.addEventListener('input', actualizarPrevia);

  const mostrarOtro = () => {
    const esOtro = campos.insignia.value === '__otro';
    campos.campoOtro.hidden = !esOtro;
    if (esOtro) campos.insigniaOtro.focus();
  };
  campos.insignia.addEventListener('change', mostrarOtro);

  const abrirEditor = (id) => {
    editandoId = id || null;
    formProducto.reset();
    mostrarOtro();

    if (id) {
      const p = porId(id);
      if (!p) return mostrarToast('Ese producto ya no existe.');
      $('modal-producto-titulo').textContent = `Editar: ${p.nombre}`;
      campos.id.value = p.id;
      campos.nombre.value = p.nombre || '';
      campos.categoria.value = p.categoria || '';
      campos.tipo.value = p.tipo || 'fisico';
      campos.precio.value = Number(p.precio) || 0;
      campos.precioAntes.value = p.precioAntes || '';
      campos.rating.value = Number(p.rating) || 5;
      campos.resenas.value = Number(p.reseñas) || 0;
      const ins = p.insignia || '';
      campos.insignia.value = ['Nuevo', 'Más vendido', 'Edición', 'Digital', 'Kit', 'Lanas'].includes(ins)
        ? ins
        : ins
        ? '__otro'
        : '';
      campos.insigniaOtro.value = ins && campos.insignia.value === '__otro' ? ins : '';
      campos.stock.value = p.stock || '';
      campos.imagen.value = p.imagen || '';
      campos.imagenes.value = (p.imagenes || []).join(', ');
      campos.descripcion.value = p.descripcion || '';
      campos.beneficios.value = (p.beneficios || []).join('\n');
      campos.detalles.value = (p.detalles || []).join('\n');
      campos.cuidados.value = p.cuidados || '';
      campos.envio.value = p.envio || '';
      actualizarPrevia();
      mostrarOtro();
    } else {
      $('modal-producto-titulo').textContent = 'Nuevo producto';
      campos.id.value = '';
      campos.tipo.value = 'fisico';
      campos.rating.value = 5;
      campos.resenas.value = 0;
      campos.imagen.value = 'recursos/img/producto-ovillos.jpg';
      actualizarPrevia();
    }

    modalProducto.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => campos.nombre.focus(), 60);
  };

  const cerrarEditor = () => {
    modalProducto.hidden = true;
    document.body.style.overflow = '';
    editandoId = null;
  };

  $('nuevo-producto').addEventListener('click', () => abrirEditor(null));
  $('cerrar-producto').addEventListener('click', cerrarEditor);
  $('cancelar-producto').addEventListener('click', cerrarEditor);
  modalProducto.addEventListener('click', (e) => {
    if (e.target === modalProducto) cerrarEditor();
  });

  const lineas = (texto) =>
    String(texto || '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

  const rutas = (texto) =>
    String(texto || '')
      .split(',')
      .map((l) => l.trim())
      .filter(Boolean);

  formProducto.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!campos.nombre.value.trim()) {
      campos.nombre.focus();
      return mostrarToast('El producto necesita un nombre.');
    }

    const datos = {
      nombre: campos.nombre.value.trim(),
      categoria: campos.categoria.value.trim() || 'Amigurumi',
      tipo: campos.tipo.value,
      precio: Math.max(0, Number(campos.precio.value) || 0),
      precioAntes: campos.precioAntes.value ? Math.max(0, Number(campos.precioAntes.value)) : null,
      rating: Math.min(5, Math.max(1, Number(campos.rating.value) || 5)),
      reseñas: Math.max(0, Number(campos.resenas.value) || 0),
      insignia:
        campos.insignia.value === '__otro'
          ? campos.insigniaOtro.value.trim()
          : campos.insignia.value || null,
      stock: campos.stock.value.trim() || 'Disponible',
      imagen: campos.imagen.value.trim() || 'recursos/img/producto-ovillos.jpg',
      descripcion: campos.descripcion.value.trim(),
      beneficios: lineas(campos.beneficios.value),
      detalles: lineas(campos.detalles.value),
      cuidados: campos.cuidados.value.trim(),
      envio: campos.envio.value.trim(),
    };
    datos.imagenes = rutas(campos.imagenes.value);
    if (!datos.imagenes.length) datos.imagenes = [datos.imagen];

    if (editandoId) {
      CAT.actualizarProducto(editandoId, datos);
      mostrarToast(`“${datos.nombre}” quedó actualizado en toda la tienda.`);
    } else {
      const idSugerido = campos.id.value.trim() || CAT.normalizarSlug(datos.nombre);
      const nuevo = CAT.agregarProducto({ ...datos, id: idSugerido });
      mostrarToast(`“${nuevo.nombre}” ya está en la tienda.`);
    }

    cerrarEditor();
    pintarCatalogo();
  });

  /* ---------- Respaldos ---------- */
  $('exportar-catalogo').addEventListener('click', () => {
    const datos = {
      exportado: new Date().toISOString(),
      tienda: 'Punto & Alma',
      overrides: overrides(),
    };
    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(blob);
    enlace.download = `catalogo-punto-alma-${new Date().toISOString().slice(0, 10)}.json`;
    enlace.click();
    URL.revokeObjectURL(enlace.href);
    mostrarToast('Respaldo descargado. Guárdalo en tu computador.');
  });

  $('importar-catalogo').addEventListener('click', () => $('archivo-catalogo').click());

  $('archivo-catalogo').addEventListener('change', (e) => {
    const archivo = e.target.files && e.target.files[0];
    if (!archivo) return;
    const lector = new FileReader();
    lector.onload = () => {
      try {
        const datos = JSON.parse(String(lector.result));
        const nuevo = datos && datos.overrides ? datos.overrides : datos;
        if (!nuevo || typeof nuevo !== 'object') throw new Error('formato');
        CAT.guardarOverrides({
          agregados: nuevo.agregados || [],
          actualizados: nuevo.actualizados || {},
          eliminados: nuevo.eliminados || [],
        });
        CAT.reaplicar();
        pintarCatalogo();
        mostrarToast('Catálogo restaurado desde el respaldo.');
      } catch {
        mostrarToast('Ese archivo no es un respaldo válido.');
      }
      e.target.value = '';
    };
    lector.readAsText(archivo);
  });

  $('restaurar-catalogo').addEventListener('click', () => {
    if (
      !window.confirm(
        '¿Restaurar el catálogo original?\n\nSe perderán los productos nuevos, las ediciones y los productos quitados.'
      )
    )
      return;
    CAT.restaurarCatalogo();
    pintarCatalogo();
    mostrarToast('Catálogo original restaurado.');
  });

  /* ---------- Filtros del panel ---------- */
  $('pestanas-catalogo').addEventListener('click', (e) => {
    const pestana = e.target.closest('[data-vista]');
    if (!pestana) return;
    vistaCatalogo.vista = pestana.dataset.vista;
    $('pestanas-catalogo')
      .querySelectorAll('.pestana')
      .forEach((b) => {
        const activa = b === pestana;
        b.classList.toggle('activa', activa);
        b.setAttribute('aria-selected', String(activa));
      });
    pintarCatalogo();
  });

  $('buscar-admin').addEventListener('input', (e) => {
    vistaCatalogo.busqueda = e.target.value;
    pintarCatalogo();
  });

  /* ============================================================
     MODERACIÓN DE CONTENIDO DE USUARIOS
     ============================================================ */
  const CLAVE_CREACIONES = 'pa_creaciones';
  const CLAVE_FORO = 'pa_foro';

  const leerJson = (clave, porDefecto) => {
    try {
      const d = JSON.parse(localStorage.getItem(clave));
      return d === null || d === undefined ? porDefecto : d;
    } catch {
      return porDefecto;
    }
  };

  const guardarJson = (clave, valor) => {
    try {
      localStorage.setItem(clave, JSON.stringify(valor));
      return true;
    } catch {
      mostrarToast('El almacenamiento está lleno. Quita algunas fotos.');
      return false;
    }
  };

  /* Quién subió cada cosa: se busca la cuenta por su identificador. */
  const cuentaDe = (autorId) => (PAAuth ? PAAuth.porId(autorId) : null);
  const nombreDe = (autorId, respaldo = '') => {
    const u = cuentaDe(autorId);
    return u ? u.nombre : respaldo || 'Sin cuenta';
  };
  const correoDe = (autorId) => {
    const u = cuentaDe(autorId);
    return u ? u.email : '';
  };

  const pintarCreaciones = () => {
    const cont = $('lista-creaciones');
    const lista = leerJson(CLAVE_CREACIONES, []);
    if (!Array.isArray(lista) || !lista.length) {
      cont.innerHTML = `<p class="lista-vacia">Ninguna clienta ha publicado creaciones en este navegador.</p>`;
      return;
    }
    cont.innerHTML = lista
      .map(
        (c) => `
        <div class="item-moderacion">
          <img src="${esc(c.imagen || 'recursos/img/producto-ovillos.jpg')}" alt="" loading="lazy">
          <div class="item-datos">
            <b>${esc(c.titulo)} ${c.aprobada ? '<span class="marca-item editada">Aprobada</span>' : ''}</b>
            <span>${esc(nombreDe(c.autorId, c.autor))}${
          correoDe(c.autorId) ? ' · ' + esc(correoDe(c.autorId)) : ''
        } · ${esc(c.descripcion ? String(c.descripcion).slice(0, 70) + '…' : 'Sin descripción')}</span>
          </div>
          <div class="item-acciones">
            ${
              c.aprobada
                ? ''
                : `<button class="item-btn restaurar" type="button" data-aprobar="${
                    c.id
                  }" title="Aprobar"><i class="fa-solid fa-check" aria-hidden="true"></i></button>`
            }
            <button class="item-btn borrar" type="button" data-quitar-creacion="${c.id}" title="Eliminar"><i class="fa-solid fa-trash-can" aria-hidden="true"></i></button>
          </div>
        </div>`
      )
      .join('');
  };

  const pintarForo = () => {
    const cont = $('lista-foro');
    const lista = leerJson(CLAVE_FORO, []);
    if (!Array.isArray(lista) || !lista.length) {
      cont.innerHTML = `<p class="lista-vacia">No hay publicaciones en el foro de este navegador.</p>`;
      return;
    }
    cont.innerHTML = lista
      .map(
        (f) => `
        <div class="item-moderacion">
          <div class="item-avatar" aria-hidden="true">${esc((nombreDe(f.autorId, f.autor) || '?').charAt(0))}</div>
          <div class="item-datos">
            <b>${esc(nombreDe(f.autorId, f.autor))} ${
          f.aprobada ? '<span class="marca-item editada">Visible</span>' : ''
        }${correoDe(f.autorId) ? ` <span class="item-correo">${esc(correoDe(f.autorId))}</span>` : ''}</b>
            <span>${esc(String(f.texto || '').slice(0, 90))}${String(f.texto || '').length > 90 ? '…' : ''}</span>
          </div>
          <div class="item-acciones">
            ${
              f.aprobada
                ? ''
                : `<button class="item-btn restaurar" type="button" data-aprobar-foro="${
                    f.id
                  }" title="Marcar como visible"><i class="fa-solid fa-check" aria-hidden="true"></i></button>`
            }
            <button class="item-btn borrar" type="button" data-quitar-foro="${f.id}" title="Eliminar"><i class="fa-solid fa-trash-can" aria-hidden="true"></i></button>
          </div>
        </div>`
      )
      .join('');
  };

  const refrescarContenidoUsuarios = () => {
    pintarCreaciones();
    pintarForo();
    window.dispatchEvent(new CustomEvent('pa:contenido'));
  };

  $('lista-creaciones').addEventListener('click', (e) => {
    const aprobar = e.target.closest('[data-aprobar]');
    if (aprobar) {
      const lista = leerJson(CLAVE_CREACIONES, []);
      const item = lista.find((c) => String(c.id) === aprobar.dataset.aprobar);
      if (!item) return;
      item.aprobada = true;
      guardarJson(CLAVE_CREACIONES, lista);
      refrescarContenidoUsuarios();
      return mostrarToast(`“${item.titulo}” aprobada.`);
    }
    const quitar = e.target.closest('[data-quitar-creacion]');
    if (quitar) {
      const lista = leerJson(CLAVE_CREACIONES, []);
      const item = lista.find((c) => String(c.id) === quitar.dataset.quitarCreacion);
      if (!item) return;
      if (!window.confirm(`¿Eliminar la creación “${item.titulo}”?`)) return;
      guardarJson(
        CLAVE_CREACIONES,
        lista.filter((c) => String(c.id) !== quitar.dataset.quitarCreacion)
      );
      refrescarContenidoUsuarios();
      mostrarToast('Creación eliminada.');
    }
  });

  $('lista-foro').addEventListener('click', (e) => {
    const aprobar = e.target.closest('[data-aprobar-foro]');
    if (aprobar) {
      const lista = leerJson(CLAVE_FORO, []);
      const item = lista.find((f) => String(f.id) === aprobar.dataset.aprobarForo);
      if (!item) return;
      item.aprobada = true;
      guardarJson(CLAVE_FORO, lista);
      refrescarContenidoUsuarios();
      return mostrarToast('Publicación marcada como visible.');
    }
    const quitar = e.target.closest('[data-quitar-foro]');
    if (quitar) {
      const lista = leerJson(CLAVE_FORO, []);
      const item = lista.find((f) => String(f.id) === quitar.dataset.quitarForo);
      if (!item) return;
      if (!window.confirm('¿Eliminar esta publicación del foro?')) return;
      guardarJson(
        CLAVE_FORO,
        lista.filter((f) => String(f.id) !== quitar.dataset.quitarForo)
      );
      refrescarContenidoUsuarios();
      mostrarToast('Publicación eliminada.');
    }
  });

  $('vaciar-creaciones').addEventListener('click', () => {
    const lista = leerJson(CLAVE_CREACIONES, []);
    if (!Array.isArray(lista) || !lista.length) return mostrarToast('No hay creaciones que borrar.');
    if (!window.confirm(`¿Eliminar las ${lista.length} creaciones de este navegador?`)) return;
    guardarJson(CLAVE_CREACIONES, []);
    refrescarContenidoUsuarios();
    mostrarToast('Se borraron todas las creaciones.');
  });

  $('vaciar-foro').addEventListener('click', () => {
    const lista = leerJson(CLAVE_FORO, []);
    if (!Array.isArray(lista) || !lista.length) return mostrarToast('No hay publicaciones que borrar.');
    if (!window.confirm(`¿Eliminar las ${lista.length} publicaciones del foro?`)) return;
    guardarJson(CLAVE_FORO, []);
    refrescarContenidoUsuarios();
    mostrarToast('Se vació el foro.');
  });

  /* ============================================================
     COMUNIDAD · cuántas usuarias hay y quién subió cada cosa
     ============================================================ */
  const pintarComunidad = () => {
    const contStats = $('comunidad-stats');
    const contTabla = $('tabla-usuarios');
    if (!contStats || !contTabla) return;

    const usuarios = PAAuth.listar();
    const listaC = leerJson(CLAVE_CREACIONES, []);
    const listaF = leerJson(CLAVE_FORO, []);
    const creaciones = Array.isArray(listaC) ? listaC : [];
    const publicaciones = Array.isArray(listaF) ? listaF : [];

    const cuantas = (autorId, lista) =>
      lista.filter((x) => String(x.autorId) === String(autorId)).length;
    const admins = usuarios.filter((u) => u.rol === 'admin').length;

    contStats.innerHTML = `
      <div class="stat-grande azul">
        <i class="fa-solid fa-users" aria-hidden="true"></i>
        <b>${usuarios.length}</b>
        <span>Usuarias</span>
        <p>${admins} administradora${admins === 1 ? '' : 's'}</p>
      </div>
      <div class="stat-grande terracota">
        <i class="fa-solid fa-images" aria-hidden="true"></i>
        <b>${creaciones.length}</b>
        <span>Creaciones subidas</span>
        <p>Contadas en este navegador</p>
      </div>
      <div class="stat-grande salvia">
        <i class="fa-solid fa-comments" aria-hidden="true"></i>
        <b>${publicaciones.length}</b>
        <span>Publicaciones del foro</span>
        <p>Contadas en este navegador</p>
      </div>`;

    if (!usuarios.length) {
      contTabla.innerHTML = `
        <div class="tabla-vacio">
          <i class="fa-solid fa-user-plus" aria-hidden="true"></i>
          <p>Todavía no hay cuentas registradas.</p>
        </div>`;
      return;
    }

    contTabla.innerHTML = `
      <table class="tabla-pedidos">
        <thead>
          <tr>
            <th>Usuaria</th>
            <th>Correo</th>
            <th>Rol</th>
            <th>Creaciones</th>
            <th>Foro</th>
            <th>Registro</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${usuarios
            .map(
              (u) => `
            <tr>
              <td class="tabla-cliente"><b>${esc(u.nombre)}</b></td>
              <td class="tabla-correo">${esc(u.email)}</td>
              <td><span class="marca-item ${u.rol === 'admin' ? 'editada' : ''}">${
                u.rol === 'admin' ? 'Administradora' : 'Clienta'
              }</span></td>
              <td>${cuantas(u.id, creaciones)}</td>
              <td>${cuantas(u.id, publicaciones)}</td>
              <td class="tabla-fecha">${formatoFechaLarga(u.creado)}</td>
              <td>${
                u.rol === 'admin'
                  ? ''
                  : `<button class="item-btn restaurar" type="button" data-promover="${esc(
                      u.id
                    )}" title="Dar acceso de administración"><i class="fa-solid fa-user-shield" aria-hidden="true"></i></button>`
              }</td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>`;
  };

  const tablaUsuarios = $('tabla-usuarios');
  if (tablaUsuarios) {
    tablaUsuarios.addEventListener('click', (e) => {
      const boton = e.target.closest('[data-promover]');
      if (!boton) return;
      const u = PAAuth.porId(boton.dataset.promover);
      if (!u) return;
      if (!window.confirm(`¿Dar acceso de administración a ${u.nombre}?`)) return;
      PAAuth.promover(u.id);
      pintarComunidad();
      mostrarToast(`${u.nombre} ahora es administradora.`);
    });
  }

  /* ============================================================
     ASISTENTE DE IA
     ============================================================ */
  if (IA) {
    const cfg = IA.leerConfigIA();
    const remoto = $('ia-remoto');
    remoto.checked = cfg.modo === 'remoto';
    $('ia-endpoint').value = cfg.endpoint || '';
    $('ia-clave').value = cfg.clave || '';
    $('ia-modelo').value = cfg.modelo || 'gpt-4o-mini';

    const pintarEstadoIA = () => {
      const activo = remoto.checked;
      $('estado-ia').textContent = activo ? 'IA real conectada' : 'Modo local';
      $('estado-ia').classList.toggle('activo', activo);
      $('ia-estado-texto').textContent = activo
        ? 'Alma enviará tus preguntas y el catálogo al proveedor que configuraste.'
        : 'El asistente responde con su base local de catálogo y guías.';
    };
    pintarEstadoIA();
    remoto.addEventListener('change', pintarEstadoIA);

    $('form-ia').addEventListener('submit', (e) => {
      e.preventDefault();
      IA.guardarConfigIA({
        modo: remoto.checked ? 'remoto' : 'local',
        endpoint: $('ia-endpoint').value.trim(),
        clave: $('ia-clave').value.trim(),
        modelo: $('ia-modelo').value.trim() || 'gpt-4o-mini',
      });
      pintarEstadoIA();
      mostrarToast('Configuración del asistente guardada.');
    });

    $('probar-ia').addEventListener('click', async () => {
      if (!remoto.checked) {
        mostrarToast('Activa “Usar IA real” para probar la conexión.');
        return;
      }
      IA.guardarConfigIA({
        modo: 'remoto',
        endpoint: $('ia-endpoint').value.trim(),
        clave: $('ia-clave').value.trim(),
        modelo: $('ia-modelo').value.trim() || 'gpt-4o-mini',
      });
      const boton = $('probar-ia');
      boton.disabled = true;
      boton.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Probando…';
      try {
        const respuesta = await IA.consultarRemoto('Hola, ¿qué vendes?');
        if (respuesta) {
          window.alert(`¡Conexión exitosa!\n\n${respuesta}`);
          pintarEstadoIA();
        } else {
          mostrarToast('El proveedor respondió vacío. Revisa el modelo.');
        }
      } catch (error) {
        mostrarToast(`No se pudo conectar: ${error.message}`);
      } finally {
        boton.disabled = false;
        boton.innerHTML = '<i class="fa-solid fa-paper-plane" aria-hidden="true"></i> Probar';
      }
    });
  }

  /* ============================================================
     BITÁCORA DE REGISTROS
     La llena registro.js solo: cuentas nuevas, suscripciones al
     boletín y compras. Aquí no se escribe nada, solo se lee,
     se filtra y se baja en CSV.
     ============================================================ */
  const PAReg = window.PARegistro;
  const PACont = window.PAContenido;

  const filtroRegistros = { tipo: 'todos', busqueda: '' };

  const mensajeVacio = (icono, texto) => `
    <div class="tabla-vacio">
      <i class="fa-solid ${icono}" aria-hidden="true"></i>
      <p>${esc(texto)}</p>
    </div>`;

  const pintarRegistros = () => {
    const contStats = $('registros-stats');
    const contTabla = $('tabla-registros');
    if (!contStats || !contTabla) return;

    if (!PAReg) {
      contTabla.innerHTML = mensajeVacio('fa-triangle-exclamation', 'No se pudo cargar la bitácora.');
      return;
    }

    const resumen = PAReg.resumen();
    const todos = PAReg.listar();

    contStats.innerHTML = `
      <div class="stat-grande salvia">
        <i class="fa-solid fa-fingerprint" aria-hidden="true"></i>
        <b>${resumen.total}</b>
        <span>Movimientos</span>
        <p>${resumen.semana} en los últimos 7 días</p>
      </div>
      <div class="stat-grande azul">
        <i class="fa-solid fa-user-plus" aria-hidden="true"></i>
        <b>${resumen.cuentas}</b>
        <span>Cuentas nuevas</span>
        <p>Registradas desde el acceso</p>
      </div>
      <div class="stat-grande terracota">
        <i class="fa-solid fa-envelope" aria-hidden="true"></i>
        <b>${resumen.boletin}</b>
        <span>Suscripciones</span>
        <p>Al boletín de la tienda</p>
      </div>
      <div class="stat-grande miel">
        <i class="fa-solid fa-bag-shopping" aria-hidden="true"></i>
        <b>${resumen.pedidos}</b>
        <span>Compras anotadas</span>
        <p>Desde el carrito</p>
      </div>
      <div class="stat-grande azul">
        <i class="fa-solid fa-at" aria-hidden="true"></i>
        <b>${resumen.correos}</b>
        <span>Correos distintos</span>
        <p>Sin repetir</p>
      </div>`;

    const q = filtroRegistros.busqueda.trim().toLowerCase();
    const filtrados = todos.filter((r) => {
      if (filtroRegistros.tipo !== 'todos' && r.tipo !== filtroRegistros.tipo) return false;
      if (!q) return true;
      return `${r.nombre} ${r.correo} ${r.detalle} ${r.donde}`.toLowerCase().includes(q);
    });

    if (!filtrados.length) {
      contTabla.innerHTML = mensajeVacio(
        'fa-clipboard-list',
        todos.length ? 'Ningún movimiento coincide con el filtro.' : 'Todavía no hay nada anotado aquí.'
      );
      return;
    }

    contTabla.innerHTML = `
      <table class="tabla-pedidos">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Tipo</th>
            <th>Nombre</th>
            <th>Correo</th>
            <th>Detalle</th>
            <th>Origen</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${filtrados
            .map((r) => {
              const tipo = PAReg.TIPOS[r.tipo];
              return `
              <tr>
                <td class="tabla-fecha">${formatoFechaLarga(r.fecha)}</td>
                <td>
                  <span class="marca-item ${tipo.clase}">
                    <i class="fa-solid ${tipo.icono}" aria-hidden="true"></i> ${tipo.etiqueta}
                  </span>
                </td>
                <td class="tabla-cliente"><b>${esc(r.nombre || '—')}</b></td>
                <td class="tabla-correo">${esc(r.correo || '—')}</td>
                <td>${esc(r.detalle || '—')}</td>
                <td><span class="origen-movimiento">${esc(r.donde || '—')}</span></td>
                <td>
                  <button class="item-btn borrar" type="button" data-quitar-registro="${esc(r.id)}"
                          title="Quitar este movimiento de la bitácora">
                    <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                  </button>
                </td>
              </tr>`;
            })
            .join('')}
        </tbody>
      </table>`;
  };

  const tablaRegistros = $('tabla-registros');
  if (tablaRegistros && PAReg) {
    tablaRegistros.addEventListener('click', (e) => {
      const boton = e.target.closest('[data-quitar-registro]');
      if (!boton) return;
      PAReg.quitar(boton.dataset.quitarRegistro);
      mostrarToast('Movimiento quitado.');
      pintarRegistros();
    });
  }

  const pestanasRegistros = $('registros-pestanas');
  if (pestanasRegistros) {
    pestanasRegistros.addEventListener('click', (e) => {
      const boton = e.target.closest('[data-tipo]');
      if (!boton) return;
      filtroRegistros.tipo = boton.dataset.tipo;
      pestanasRegistros.querySelectorAll('[data-tipo]').forEach((b) => {
        const activo = b === boton;
        b.classList.toggle('activa', activo);
        b.setAttribute('aria-selected', String(activo));
      });
      pintarRegistros();
    });
  }

  const buscarRegistros = $('registros-buscar');
  if (buscarRegistros) {
    buscarRegistros.addEventListener('input', (e) => {
      filtroRegistros.busqueda = e.target.value;
      pintarRegistros();
    });
  }

  const csvRegistros = $('registros-csv');
  if (csvRegistros) {
    csvRegistros.addEventListener('click', () => {
      const lista = PAReg ? PAReg.listar() : [];
      descargarCSV(
        `bitacora-registros-${new Date().toISOString().slice(0, 10)}.csv`,
        ['Fecha', 'Tipo', 'Nombre', 'Correo', 'Detalle', 'Origen'],
        lista.map((r) => [
          new Date(r.fecha).toLocaleString('es-CO'),
          PAReg.TIPOS[r.tipo]?.etiqueta || r.tipo,
          r.nombre,
          r.correo,
          r.detalle,
          r.donde,
        ])
      );
    });
  }

  const vaciarRegistros = $('registros-vaciar');
  if (vaciarRegistros) {
    vaciarRegistros.addEventListener('click', () => {
      if (!PAReg || !PAReg.listar().length) {
        mostrarToast('La bitácora ya está vacía.');
        return;
      }
      if (!window.confirm('¿Borrar todos los movimientos anotados? Las cuentas y los pedidos no se tocan.')) return;
      PAReg.vaciar();
      mostrarToast('Bitácora vacía.');
      pintarRegistros();
    });
  }

  /* ============================================================
     CONTENIDO DEL SITIO
     Textos de la portada, secciones visibles y carrusel del titular.
     Lo que se guarda aquí vive en pa_contenido.
     ============================================================ */
  const pintarContenido = () => {
    const listaTextos = $('lista-textos');
    const listaSecciones = $('lista-secciones');
    const listaProductos = $('hero-productos');
    const heroOrden = $('hero-orden');
    const estado = $('contenido-estado');
    if (!listaTextos || !listaSecciones || !listaProductos || !heroOrden || !PACont) return;

    const guardado = PACont.leer();

    /* Textos: partimos del original y encima va lo guardado. */
    listaTextos.innerHTML = PACont.CAMPOS.map(
      (campo) => `
      <div class="campo-form">
        <label for="txt-${campo.clave}">${esc(campo.etiqueta)}</label>
        <textarea id="txt-${campo.clave}" data-clave="${campo.clave}" rows="${campo.tipo === 'parrafo' ? 3 : 2}"
                  maxlength="260">${esc(guardado.textos[campo.clave] ?? campo.original)}</textarea>
      </div>`
    ).join('');

    /* Secciones: el titular y los productos nunca se apagan. */
    listaSecciones.innerHTML = PACont.SECCIONES.map(
      (s) => `
      <label class="check-linea${s.obligatoria ? ' fija' : ''}">
        <input type="checkbox" data-seccion="${esc(s.id)}" ${guardado.secciones[s.id] === false ? '' : 'checked'} ${s.obligatoria ? 'disabled' : ''}>
        <span>${esc(s.etiqueta)}</span>
        ${s.obligatoria ? '<em>siempre visible</em>' : ''}
      </label>`
    ).join('');

    /* Productos que pasan en el carrusel. */
    const excluidos = guardado.hero.excluir.map(String);
    listaProductos.innerHTML = window.PACatalogo
      .obtener()
      .map(
        (p) => `
      <label class="check-linea">
        <input type="checkbox" data-producto="${esc(p.id)}" ${excluidos.includes(String(p.id)) ? '' : 'checked'}>
        <span>${esc(p.nombre)}</span>
      </label>`
      )
      .join('');

    heroOrden.innerHTML = PACont.ORDENES.map(
      (o) => `<option value="${o.id}" ${guardado.hero.orden === o.id ? 'selected' : ''}>${esc(o.etiqueta)}</option>`
    ).join('');

    $('hero-activo').checked = guardado.hero.activo;
    $('hero-autoplay').checked = guardado.hero.autoplay;
    $('hero-nombre').checked = guardado.hero.mostrarNombre;
    $('hero-precio').checked = guardado.hero.mostrarPrecio;
    $('hero-ms').value = guardado.hero.ms;
    pintarVelocidadHero(guardado.hero.ms);

    const total = PACont.cambios();
    estado.textContent = total ? `${total} cambio${total === 1 ? '' : 's'}` : 'Sin cambios';
    estado.classList.toggle('activo', total > 0);
  };

  const pintarVelocidadHero = (ms) => {
    const salida = $('hero-ms-valor');
    if (salida) salida.textContent = `${(Number(ms) / 1000).toFixed(1)} s`;
  };

  const velocidadHero = $('hero-ms');
  if (velocidadHero) {
    velocidadHero.addEventListener('input', (e) => pintarVelocidadHero(e.target.value));
  }

  const formContenido = $('form-contenido');
  if (formContenido && PACont) {
    formContenido.addEventListener('submit', (e) => {
      e.preventDefault();

      const textos = {};
      formContenido.querySelectorAll('#lista-textos [data-clave]').forEach((area) => {
        textos[area.dataset.clave] = area.value;
      });

      const secciones = {};
      formContenido.querySelectorAll('#lista-secciones [data-seccion]').forEach((caja) => {
        secciones[caja.dataset.seccion] = caja.checked;
      });

      const excluir = [...formContenido.querySelectorAll('#hero-productos [data-producto]')]
        .filter((caja) => !caja.checked)
        .map((caja) => caja.dataset.producto);

      PACont.guardar({
        textos,
        secciones,
        hero: {
          activo: $('hero-activo').checked,
          autoplay: $('hero-autoplay').checked,
          mostrarNombre: $('hero-nombre').checked,
          mostrarPrecio: $('hero-precio').checked,
          orden: $('hero-orden').value,
          ms: Number($('hero-ms').value),
          excluir,
        },
      });

      mostrarToast('Contenido guardado. Mira la portada.');
      pintarContenido();
    });
  }

  const restaurarContenido = $('contenido-restaurar');
  if (restaurarContenido && PACont) {
    restaurarContenido.addEventListener('click', () => {
      if (!window.confirm('¿Restaurar textos, secciones y carrusel al original del código?')) return;
      PACont.restaurar();
      mostrarToast('Todo volvió al original.');
      pintarContenido();
    });
  }

  /* ============================================================
     BOLETÍN Y CLIENTAS
     Suscriptores del boletín cruzados con cuentas y compras.
     ============================================================ */
  const filtroBoletin = { busqueda: '' };

  /* Junta en una sola fila cada correo: cuenta, boletín y compras. */
  const leerClientas = () => {
    const mapa = new Map();
    /* Se lee del almacenamiento en cada pintada, no de la copia que se
       cargó al abrir el panel: así una compra recién hecha aparece sola. */
    const frescos = PAC.leerPedidos();
    const listaPedidos = Array.isArray(frescos) ? frescos : [];
    const filaDe = (correo) => {
      const clave = String(correo || '').trim().toLowerCase();
      if (!clave) return null;
      if (!mapa.has(clave)) {
        mapa.set(clave, {
          correo: clave,
          nombre: '',
          cuenta: false,
          rol: '',
          registro: '',
          telefono: '',
          direccion: '',
          compras: 0,
          unidades: 0,
          gasto: 0,
          ultimo: '',
        });
      }
      return mapa.get(clave);
    };

    PAAuth.listar().forEach((u) => {
      const fila = filaDe(u.email);
      if (!fila) return;
      fila.nombre = u.nombre || fila.nombre;
      fila.cuenta = true;
      fila.rol = u.rol || '';
      fila.registro = u.creado || fila.registro;
    });

    listaPedidos.filter(esValido).forEach((p) => {
      const fila = filaDe(p.cliente?.email);
      if (!fila) return;
      fila.nombre = p.cliente?.nombre || fila.nombre;
      fila.telefono = fila.telefono || p.cliente?.telefono || '';
      fila.direccion = fila.direccion || p.cliente?.direccion || '';
      fila.compras += 1;
      fila.unidades += (p.items || []).reduce((t, i) => t + (Number(i.cantidad) || 1), 0);
      fila.gasto += Number(p.total) || 0;
      if (!fila.ultima || String(p.fecha) > String(fila.ultima)) fila.ultima = p.fecha;
    });

    /* Un correo que solo se suscrito al boletín también es clienta. */
    const suscritos = PAReg ? PAReg.boletin() : [];
    const mapaBoletin = new Map(suscritos.map((s) => [s.correo, s.fecha]));
    mapaBoletin.forEach((fecha, correo) => {
      const fila = filaDe(correo);
      if (fila) fila.boletin = fecha;
    });
    [...mapa.values()].forEach((f) => {
      if (!('boletin' in f)) f.boletin = mapaBoletin.get(f.correo) || '';
    });

    return [...mapa.values()].sort(
      (a, b) => b.gasto - a.gasto || String(b.ultima).localeCompare(String(a.ultima))
    );
  };

  const pintarBoletin = () => {
    const contStats = $('boletin-stats');
    const tablaSuscritos = $('tabla-boletin');
    const tablaClientas = $('tabla-clientas');
    if (!contStats || !tablaSuscritos || !tablaClientas) return;

    const suscritos = PAReg ? PAReg.boletin() : [];
    const clientas = leerClientas();
    const correosBoletin = new Set(suscritos.map((s) => s.correo));
    const correosCuenta = new Set(PAAuth.listar().map((u) => String(u.email).toLowerCase()));
    const yaCompraron = clientas.filter((c) => c.compras > 0).length;
    const sinComprar = [...correosBoletin].filter(
      (correo) => !clientas.some((c) => c.correo === correo && c.compras > 0)
    ).length;

    contStats.innerHTML = `
      <div class="stat-grande terracota">
        <i class="fa-solid fa-envelope" aria-hidden="true"></i>
        <b>${suscritos.length}</b>
        <span>Suscriptores</span>
        <p>Del boletín de la tienda</p>
      </div>
      <div class="stat-grande azul">
        <i class="fa-solid fa-user-plus" aria-hidden="true"></i>
        <b>${correosCuenta.size}</b>
        <span>Cuentas creadas</span>
        <p>Con nombre y contraseña</p>
      </div>
      <div class="stat-grande salvia">
        <i class="fa-solid fa-basket-shopping" aria-hidden="true"></i>
        <b>${yaCompraron}</b>
        <span>Clientas que compraron</span>
        <p>Con al menos un pedido</p>
      </div>
      <div class="stat-grande miel">
        <i class="fa-solid fa-bullhorn" aria-hidden="true"></i>
        <b>${sinComprar}</b>
        <span>Por convencer</span>
        <p>Se suscribieron pero no compran</p>
      </div>`;

    /* --- Suscriptores --- */
    const q = filtroBoletin.busqueda.trim().toLowerCase();
    const listaSuscritos = suscritos.filter((s) => !q || s.correo.includes(q));

    if (!listaSuscritos.length) {
      tablaSuscritos.innerHTML = mensajeVacio(
        'fa-envelope-open-text',
        suscritos.length ? 'Ningún correo coincide con la búsqueda.' : 'Nadie se ha suscrito al boletín todavía.'
      );
    } else {
      const compraDe = (correo) => clientas.find((c) => c.correo === correo);
      tablaSuscritos.innerHTML = `
        <table class="tabla-pedidos">
          <thead>
            <tr>
              <th>Correo</th>
              <th>Se suscribió</th>
              <th>¿Tiene cuenta?</th>
              <th>¿Ha comprado?</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${listaSuscritos
              .map((s) => {
                const fila = compraDe(s.correo);
                const compro = Boolean(fila && fila.compras > 0);
                return `
                <tr>
                  <td class="tabla-cliente"><b>${esc(s.correo)}</b></td>
                  <td class="tabla-fecha">${s.fecha ? formatoFechaLarga(s.fecha) : '—'}</td>
                  <td>
                    <span class="marca-item ${correosCuenta.has(s.correo) ? 'editada' : ''}">
                      ${correosCuenta.has(s.correo) ? 'Sí' : 'No'}
                    </span>
                  </td>
                  <td>
                    <span class="marca-item ${compro ? 'nueva' : 'borrada'}">${compro ? 'Sí' : 'Todavía no'}</span>
                  </td>
                  <td>
                    <button class="item-btn borrar" type="button" data-quitar-boletin="${esc(s.correo)}"
                            title="Quitar del boletín">
                      <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                    </button>
                  </td>
                </tr>`;
              })
              .join('')}
          </tbody>
        </table>`;
    }

    /* --- Clientas --- */
    const listaClientas = q ? clientas.filter((c) => `${c.nombre} ${c.correo}`.toLowerCase().includes(q)) : clientas;

    if (!listaClientas.length) {
      tablaClientas.innerHTML = mensajeVacio(
        'fa-users-slash',
        'Todavía no hay cuentas ni compras que mostrar.'
      );
      return;
    }

    tablaClientas.innerHTML = `
      <table class="tabla-pedidos">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Correo</th>
            <th>Contacto</th>
            <th>Compras</th>
            <th>Piezas</th>
            <th>Gastado</th>
            <th>Último pedido</th>
            <th>Boletín</th>
          </tr>
        </thead>
        <tbody>
          ${listaClientas
            .map(
              (c) => `
            <tr>
              <td class="tabla-cliente">
                <b>${esc(c.nombre || 'Sin nombre')}</b>
                ${c.rol === 'admin' ? '<span>Administradora</span>' : ''}
              </td>
              <td class="tabla-correo">${esc(c.correo)}</td>
              <td>
                ${c.telefono ? `<span class="origen-movimiento">${esc(c.telefono)}</span>` : '—'}
                ${c.direccion ? `<br><span class="origen-movimiento">${esc(c.direccion)}</span>` : ''}
              </td>
              <td>${c.compras}</td>
              <td>${c.unidades}</td>
              <td><b class="tabla-total">${PAC.formatearPrecio(c.gasto)}</b></td>
              <td class="tabla-fecha">${c.ultima ? formatoFechaLarga(c.ultima) : '—'}</td>
              <td>
                <span class="marca-item ${c.boletin ? 'nueva' : ''}">${c.boletin ? 'Sí' : 'No'}</span>
              </td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>`;
  };

  const tablaBoletin = $('tabla-boletin');
  if (tablaBoletin && PAReg) {
    tablaBoletin.addEventListener('click', (e) => {
      const boton = e.target.closest('[data-quitar-boletin]');
      if (!boton) return;
      const correo = boton.dataset.quitarBoletin;
      if (!window.confirm(`¿Quitar ${correo} del boletín?`)) return;
      PAReg.quitarBoletin(correo);
      mostrarToast('Se quitó del boletín.');
      pintarBoletin();
    });
  }

  const buscarBoletin = $('boletin-buscar');
  if (buscarBoletin) {
    buscarBoletin.addEventListener('input', (e) => {
      filtroBoletin.busqueda = e.target.value;
      pintarBoletin();
    });
  }

  const formBoletinAdmin = $('form-boletin-admin');
  if (formBoletinAdmin && PAReg) {
    formBoletinAdmin.addEventListener('submit', (e) => {
      e.preventDefault();
      const campo = $('boletin-correo');
      const resultado = PAReg.suscribir(campo.value, { donde: 'Agregado desde el panel' });
      if (resultado === 'invalido') {
        mostrarToast('Ese correo no parece válido.');
        return;
      }
      if (resultado === 'repetido') {
        mostrarToast('Ese correo ya estaba en el boletín.');
        return;
      }
      campo.value = '';
      mostrarToast('Suscrito al boletín.');
      pintarBoletin();
      pintarRegistros();
    });
  }

  const csvBoletin = $('boletin-csv');
  if (csvBoletin) {
    csvBoletin.addEventListener('click', () => {
      const suscritos = PAReg ? PAReg.boletin() : [];
      const clientas = leerClientas();
      descargarCSV(
        `boletin-${new Date().toISOString().slice(0, 10)}.csv`,
        ['Correo', 'Suscrito', 'Tiene cuenta', 'Compras', 'Gastado'],
        suscritos.map((s) => {
          const fila = clientas.find((c) => c.correo === s.correo);
          return [
            s.correo,
            s.fecha ? new Date(s.fecha).toLocaleString('es-CO') : '',
            fila && fila.cuenta ? 'Sí' : 'No',
            fila ? fila.compras : 0,
            fila ? fila.gasto : 0,
          ];
        })
      );
    });
  }

  const csvClientas = $('clientas-csv');
  if (csvClientas) {
    csvClientas.addEventListener('click', () => {
      descargarCSV(
        `clientas-${new Date().toISOString().slice(0, 10)}.csv`,
        ['Nombre', 'Correo', 'Telefono', 'Direccion', 'Cuenta', 'Boletin', 'Compras', 'Piezas', 'Gastado', 'Ultimo pedido'],
        leerClientas().map((c) => [
          c.nombre,
          c.correo,
          c.telefono,
          c.direccion,
          c.cuenta ? 'Sí' : 'No',
          c.boletin ? 'Sí' : 'No',
          c.compras,
          c.unidades,
          c.gasto,
          c.ultima ? new Date(c.ultima).toLocaleString('es-CO') : '',
        ])
      );
    });
  }

  /* ---------- Re-pintar todo ---------- */
  const pintarTodo = () => {
    /* Por si otra pestaña cambió algo mientras tanto. */
    const frescos = PAC.leerPedidos();
    pedidos = Array.isArray(frescos) ? frescos : [];
    pintarResumen();
    pintarBarras();
    pintarTop();
    pintarTabla();
    pintarCatalogo();
    pintarCreaciones();
    pintarForo();
    pintarComunidad();
    pintarRegistros();
    pintarContenido();
    pintarBoletin();
  };

  /* ---------- Menú móvil, sombra y apariciones ---------- */
  const botonMenu = $('boton-menu');
  const menu = $('menu');
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

  /* ---------- Arranque ---------- */
  pintarTodo();
  observarRevelar();
})();