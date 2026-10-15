/* ============================================================
   PUNTO & ALMA · Carrito, cajón de compra y pedidos
   - Carrito en localStorage (pa_carrito) compartido en todo el sitio.
   - Cajón lateral para revisar el pedido y finalizarlo.
   - Cada pedido confirmado queda en pa_pedidos para que lo
     administren desde el Panel de ventas (admin.html).
   ============================================================ */
(function () {
  const LLAVE_CARRITO = 'pa_carrito';
  const LLAVE_PEDIDOS = 'pa_pedidos';

  /* ---------- Almacenamiento ---------- */
  const leer = () => {
    try {
      const datos = JSON.parse(localStorage.getItem(LLAVE_CARRITO));
      return Array.isArray(datos) ? datos : [];
    } catch {
      return [];
    }
  };

  const guardar = (carrito) => {
    try {
      localStorage.setItem(LLAVE_CARRITO, JSON.stringify(carrito));
    } catch {
      /* sin almacenamiento disponible */
    }
  };

  const formatearPrecio = (n) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(Number(n) || 0);

  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const infoProducto = (id) => {
    /* window.PACatalogo es la vía segura: los `const` de nivel superior
       no se cuelgan en window, así que buscar el catálogo directamente
       en window hacía que todo cayera al respaldo "Producto / $0". */
    const api = window.PACatalogo;
    const p = api && typeof api.buscarProducto === 'function' ? api.buscarProducto(id) : null;
    if (p) {
      return {
        nombre: p.nombre,
        precio: Number(p.precio) || 0,
        imagen: p.imagen || '',
      };
    }
    return { nombre: 'Producto', precio: 0, imagen: '' };
  };

  /* ---------- Operaciones del carrito ---------- */
  const contar = () => leer().reduce((total, item) => total + (Number(item.cantidad) || 0), 0);

  const totalDe = (carrito) =>
    carrito.reduce((t, item) => t + (Number(item.precio) || 0) * (Number(item.cantidad) || 0), 0);

  const emitir = () => window.dispatchEvent(new CustomEvent('pa:carrito'));

  const agregar = (id, cantidad) => {
    const carrito = leer();
    const actual = carrito.find((item) => item.id === id);
    const info = infoProducto(id);
    const item = {
      id,
      cantidad: Number(cantidad) || 1,
      nombre: info.nombre,
      precio: info.precio,
      imagen: info.imagen,
    };
    if (actual) {
      actual.cantidad += item.cantidad;
    } else {
      carrito.push(item);
    }
    guardar(carrito);
    emitir();
    return carrito;
  };

  const cambiarCantidad = (id, delta) => {
    const carrito = leer();
    const actual = carrito.find((item) => item.id === id);
    if (!actual) return carrito;
    actual.cantidad = Math.max(1, (Number(actual.cantidad) || 1) + Number(delta));
    guardar(carrito);
    emitir();
    return carrito;
  };

  const quitar = (id) => {
    const carrito = leer().filter((item) => item.id !== String(id));
    guardar(carrito);
    emitir();
    return carrito;
  };

  const vaciar = () => {
    guardar([]);
    emitir();
  };

  /* ---------- Pedidos (los administra el panel de ventas) ---------- */
  const leerPedidos = () => {
    try {
      const datos = JSON.parse(localStorage.getItem(LLAVE_PEDIDOS));
      return Array.isArray(datos) ? datos : [];
    } catch {
      return [];
    }
  };

  const guardarPedidos = (pedidos) => {
    try {
      localStorage.setItem(LLAVE_PEDIDOS, JSON.stringify(pedidos));
    } catch {
      /* sin almacenamiento disponible */
    }
  };

  const crearPedido = (cliente) => {
    const carrito = leer();
    if (!carrito.length) return null;
    const pedido = {
      id: Date.now(),
      fecha: new Date().toISOString(),
      cliente,
      items: carrito.map((item) => ({
        nombre: item.nombre || 'Producto',
        cantidad: Number(item.cantidad) || 1,
        precio: Number(item.precio) || 0,
      })),
      total: totalDe(carrito),
      estado: 'pendiente',
    };
    const pedidos = leerPedidos();
    pedidos.unshift(pedido);
    guardarPedidos(pedidos);
    vaciar();
    /* La bitácora (registro.js) escucha este evento y anota la compra. */
    try {
      window.dispatchEvent(new CustomEvent('pa:pedido', { detail: pedido }));
    } catch {
      /* sin dispatch */
    }
    return pedido;
  };

  /* ============================================================
     CAJÓN DEL CARRITO (se inyecta solo en cualquier página)
     ============================================================ */
  let velo = null;
  let drawer = null;
  let lista = null;
  let pie = null;

  const construir = () => {
    if (document.getElementById('carrito-drawer')) return;

    const contenedor = document.createElement('div');
    contenedor.innerHTML = `
      <div class="carrito-velo" id="carrito-velo" hidden></div>
      <aside class="carrito-drawer" id="carrito-drawer" aria-label="Carrito de compras" hidden>
        <div class="carrito-head">
          <h3><i class="fa-solid fa-cart-shopping" aria-hidden="true"></i> Tu carrito</h3>
          <button class="carrito-cierra" id="carrito-cierra" type="button" aria-label="Cerrar carrito"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
        </div>
        <div class="carrito-list" id="carrito-list"></div>
        <div class="carrito-pie" id="carrito-pie"></div>
      </aside>`;
    document.body.appendChild(contenedor);

    velo = document.getElementById('carrito-velo');
    drawer = document.getElementById('carrito-drawer');
    lista = document.getElementById('carrito-list');
    pie = document.getElementById('carrito-pie');

    document.getElementById('carrito-cierra').addEventListener('click', cerrar);
    velo.addEventListener('click', cerrar);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !drawer.hidden) cerrar();
    });

    lista.addEventListener('click', (e) => {
      const botonCambia = e.target.closest('[data-cambia]');
      const botonQuita = e.target.closest('[data-quita]');
      if (botonCambia) {
        cambiarCantidad(botonCambia.dataset.cambia, botonCambia.dataset.delta);
        pintar();
      } else if (botonQuita) {
        quitar(botonQuita.dataset.quita);
        pintar();
      }
    });

    pie.addEventListener('click', (e) => {
      const confirmar = e.target.closest('#pedido-confirmar');
      const seguir = e.target.closest('#carrito-seguir');
      if (seguir) {
        cerrar();
        return;
      }
      if (!confirmar) return;

      const nombre = document.getElementById('pedido-nombre').value.trim();
      const telefono = document.getElementById('pedido-telefono').value.trim();
      const error = document.getElementById('carrito-error');

      if (!nombre || !telefono) {
        error.hidden = false;
        error.textContent = 'Cuéntanos tu nombre y tu teléfono para confirmar el pedido.';
        return;
      }

      crearPedido({
        nombre,
        telefono,
        direccion: document.getElementById('pedido-direccion').value.trim() || 'Recojo en Manizales',
      });

      lista.innerHTML = `
        <div class="carrito-exito">
          <i class="fa-solid fa-circle-check" aria-hidden="true"></i>
          <h4>¡Pedido registrado!</h4>
          <p>Te contactaremos al <b>${esc(telefono)}</b> para confirmar el pago y el envío.</p>
          <p>Puedes pagar por <b>Nequi 3136384065</b>.</p>
        </div>`;
      pie.innerHTML = `<button class="boton carrito-seguir" id="carrito-seguir" type="button">Seguir comprando</button>`;
    });
  };

  const pintar = () => {
    if (!drawer) return;
    const carrito = leer();

    if (!carrito.length) {
      lista.innerHTML = `
        <div class="carrito-vacio">
          <i class="fa-solid fa-heart" aria-hidden="true"></i>
          <p>Tu carrito está vacío.</p>
          <a class="boton" href="index.html#productos">Ver la tienda</a>
        </div>`;
      pie.innerHTML = '';
      return;
    }

    lista.innerHTML = carrito
      .map(
        (item) => `
        <article class="carrito-item">
          ${item.imagen
            ? `<img src="${item.imagen}" alt="${esc(item.nombre)}">`
            : `<span class="carrito-item-sin" aria-hidden="true"><i class="fa-solid fa-heart"></i></span>`}
          <div class="carrito-item-info">
            <b>${esc(item.nombre)}</b>
            <span class="carrito-item-precio">${formatearPrecio(item.precio)}</span>
            <div class="carrito-item-cur">
              <button type="button" data-cambia="${esc(item.id)}" data-delta="-1" aria-label="Disminuir cantidad">−</button>
              <span>${item.cantidad}</span>
              <button type="button" data-cambia="${esc(item.id)}" data-delta="1" aria-label="Aumentar cantidad">+</button>
            </div>
          </div>
          <button class="carrito-item-quita" type="button" data-quita="${esc(item.id)}" aria-label="Quitar del carrito"><i class="fa-solid fa-trash-can" aria-hidden="true"></i></button>
        </article>`
      )
      .join('');

    pie.innerHTML = `
      <div class="carrito-total"><span>Total</span><b>${formatearPrecio(totalDe(carrito))}</b></div>
      <div class="carrito-form">
        <input type="text" id="pedido-nombre" placeholder="Tu nombre" maxlength="60" autocomplete="name" aria-label="Tu nombre">
        <input type="tel" id="pedido-telefono" placeholder="Tu teléfono" maxlength="20" autocomplete="tel" aria-label="Tu teléfono">
        <input type="text" id="pedido-direccion" placeholder="Dirección o “recojo en Manizales”" maxlength="140" autocomplete="street-address" aria-label="Dirección">
        <p class="carrito-error" id="carrito-error" hidden></p>
        <button class="boton carrito-confirmar" id="pedido-confirmar" type="button"><i class="fa-solid fa-check" aria-hidden="true"></i> Finalizar pedido</button>
        <p class="carrito-pago">Paga con Nequi <b>3136384065</b> · te confirmamos por WhatsApp</p>
      </div>`;
  };

  const abrir = () => {
    construir();
    pintar();
    velo.hidden = false;
    drawer.hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => drawer.classList.add('abierto'));
  };

  const cerrar = () => {
    if (!drawer) return;
    drawer.classList.remove('abierto');
    velo.hidden = true;
    drawer.hidden = true;
    document.body.style.overflow = '';
  };

  /* Cualquier elemento con .carrito abre el cajón */
  document.addEventListener('click', (e) => {
    const boton = e.target.closest('.carrito');
    if (boton) {
      e.preventDefault();
      abrir();
    }
  });

  window.PACarrito = {
    leer,
    guardar,
    contar,
    agregar,
    cambiarCantidad,
    quitar,
    vaciar,
    totalDe,
    crearPedido,
    leerPedidos,
    guardarPedidos,
    formatearPrecio,
    abrirCarrito: abrir,
    TELEFONO: '313 638 4065',
  };
})();