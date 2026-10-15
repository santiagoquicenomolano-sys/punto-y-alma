/* ============================================================
   PUNTO & ALMA · Catálogo de productos (compartido)
   Se carga antes que app.js y producto.js
   ============================================================ */

const formatearPrecio = (valor) =>
  '$' + Number(valor).toLocaleString('es-CO');

const CATALOGO_BASE = [
  {
    id: 'pulpo-sensorial',
    nombre: 'Pulpo Sensorial',
    categoria: 'Amigurumi',
    precio: 110000,
    precioAntes: null,
    rating: 5,
    reseñas: 128,
    insignia: 'Más vendido',
    tipo: 'fisico',
    stock: 'Solo quedan 4',
    imagen: 'recursos/img/producto-pulpo.jpg',
    imagenes: ['recursos/img/producto-pulpo.jpg', 'recursos/img/amigurumi.jpg', 'recursos/img/ganchos.jpg'],
    descripcion: 'El clásico pulpo sensorial diseñado para manos pequeñas y corazones grandes. Cada tentáculo tiene un tacto distinto que estimula los sentidos y acompaña a los bebés en su exploración.',
    beneficios: [
      'Algodón hipoalergénico, seguro para bebés desde el nacimiento',
      'Tentáculos con texturas variadas para estimular el tacto',
      'Ojos bordados a mano: sin piezas sueltas ni riesgos',
      'Lavable a mano, conserva su forma y suavidad'
    ],
    detalles: ['Alto: 28 cm aprox.', 'Algodón premium + relleno antialérgico', 'Hecho 100% a mano en Manizales'],
    cuidados: 'Lavar a mano con agua fría y jabón suave. Secar a la sombra, sin retorcer.',
    envio: 'Listo para despachar en 24-72 h con guía de seguimiento.',
    digital: false
  },
  {
    id: 'oso-peluche',
    nombre: 'Oso de Peluche',
    categoria: 'Amigurumi',
    precio: 95000,
    precioAntes: null,
    rating: 5,
    reseñas: 84,
    insignia: 'Nuevo',
    tipo: 'fisico',
    stock: 'Disponible',
    imagen: 'recursos/img/producto-oso.jpg',
    imagenes: ['recursos/img/producto-oso.jpg', 'recursos/img/amigurumi.jpg', 'recursos/img/producto-ovillos.jpg'],
    descripcion: 'Un osito abrazable con lana súper suave que invita a los abrazos de las buenas. Su pancita redondita es el refugio perfecto para las siestas.',
    beneficios: [
      'Lana suave al tacto, ideal para pieles sensibles',
      'Pancita redonda con relleno firme y abrazable',
      'Detalles bordados a mano, color a color',
      'Regalo perfecto para cumpleaños y baby showers'
    ],
    detalles: ['Alto: 32 cm aprox.', 'Mezcla de algodón y lana premium', 'Hecho 100% a mano en Colombia'],
    cuidados: 'Lavar a mano con agua fría y secar a la sombra.',
    envio: 'Listo para despachar en 24-72 h con guía de seguimiento.',
    digital: false
  },
  {
    id: 'conejo-simon',
    nombre: 'Conejo Simón',
    categoria: 'Amigurumi',
    precio: 82000,
    precioAntes: null,
    rating: 5,
    reseñas: 61,
    insignia: null,
    tipo: 'fisico',
    stock: 'Disponible',
    imagen: 'recursos/img/producto-conejo.jpg',
    imagenes: ['recursos/img/producto-conejo.jpg', 'recursos/img/amigurumi.jpg'],
    descripcion: 'Simón es el conejito de orejas largas que llega a conquistar miradas. Su expresión tierna y su tejido apretadito lo hacen un compañero fiel para niños y adultos.',
    beneficios: [
      'Orejas largas suaves para abrazar y acurrucar',
      'Algodón hipoalergénico, amigable con los más pequeños',
      'Tejido apretado que resiste el juego',
      'Ideal para cumpleaños, Pascua o simplemente regalar amor'
    ],
    detalles: ['Alto: 30 cm aprox. de oreja a pie', 'Algodón premium', 'Hecho 100% a mano'],
    cuidados: 'Lavar a mano con agua fría y jabón neutro.',
    envio: 'Listo para despachar en 24-72 h con guía de seguimiento.',
    digital: false
  },
  {
    id: 'gato-halloween',
    nombre: 'Gato Halloween',
    categoria: 'Amigurumi',
    precio: 98000,
    precioAntes: null,
    rating: 5,
    reseñas: 73,
    insignia: 'Edición',
    tipo: 'fisico',
    stock: 'Solo quedan 6',
    imagen: 'recursos/img/producto-gato.jpg',
    imagenes: ['recursos/img/producto-gato.jpg', 'recursos/img/amigurumi.jpg'],
    descripcion: 'El felino de edición limitada con espíritu halloweenesco: misterioso, juguetón y con el toque artesanal que lo hace irrepetible. ¡No hay dos iguales!',
    beneficios: [
      'Edición limitada tejida una a una',
      'Detalles bordados con carácter propio',
      'Lana suave con acabados cuidados',
      'Se agota: cuando se va, no vuelve igual'
    ],
    detalles: ['Alto: 26 cm aprox.', 'Algodón premium + acentos de lana', 'Hecho 100% a mano'],
    cuidados: 'Lavar a mano, secar a la sombra.',
    envio: 'Listo para despachar en 24-72 h con guía de seguimiento.',
    digital: false
  },
  {
    id: 'cobija-atardecer',
    nombre: 'Cobija "Atardecer"',
    categoria: 'Cobijas & Hogar',
    precio: 185000,
    precioAntes: 220000,
    rating: 5,
    reseñas: 146,
    insignia: '-16%',
    tipo: 'fisico',
    stock: 'Disponible',
    imagen: 'recursos/img/producto-cobija.jpg',
    imagenes: ['recursos/img/producto-cobija.jpg', 'recursos/img/producto-flor.jpg', 'recursos/img/producto-ovillos.jpg'],
    descripcion: 'Una cobija tejida punto a punto que guarda los colores del atardecer colombiano. Liviana en verano, cálida en invierno: la manta de todos los días.',
    beneficios: [
      'Tejido a punto completo con lana suave y resistente',
      'Apta para bebés: sin quimicos ni tintes agresivos',
      'Medida generosa para cobijar de a dos',
      'Incluye empaque de regalo con tarjeta personalizada'
    ],
    detalles: ['Medidas: 130 × 160 cm', 'Lana premium lavable', 'Hecho 100% a mano'],
    cuidados: 'Lavar en ciclo suave con agua fría. Secar plano.',
    envio: 'Listo para despachar en 24-72 h con guía de seguimiento.',
    digital: false
  },
  {
    id: 'bolso-campo',
    nombre: 'Bolso de Campo',
    categoria: 'Bolsos & Accesorios',
    precio: 135000,
    precioAntes: null,
    rating: 5,
    reseñas: 52,
    insignia: null,
    tipo: 'fisico',
    stock: 'Disponible',
    imagen: 'recursos/img/producto-bolso.jpg',
    imagenes: ['recursos/img/producto-bolso.jpg', 'recursos/img/producto-flor.jpg'],
    descripcion: 'El bolso que acompaña tus días de campo y ciudad. Tejido con punto firme, forrado por dentro y con la resistencia de una pieza bien hecha.',
    beneficios: [
      'Forro interior y bolsillos para organizar todo',
      'Manijas de cuerda tejidas para colgar cómodo',
      'Punto firme que mantiene la forma',
      'Combinable con cualquier outfit artesanal'
    ],
    detalles: ['Alto: 32 cm · Ancho: 38 cm', 'Algodón grueso forrado', 'Hecho 100% a mano'],
    cuidados: 'Limpiar con paño húmedo. No sumergir.',
    envio: 'Listo para despachar en 24-72 h con guía de seguimiento.',
    digital: false
  },
  {
    id: 'bufanda-nordica',
    nombre: 'Bufanda Nórdica',
    categoria: 'Bolsos & Accesorios',
    precio: 75000,
    precioAntes: null,
    rating: 5,
    reseñas: 40,
    insignia: 'Nuevo',
    tipo: 'fisico',
    stock: 'Disponible',
    imagen: 'recursos/img/producto-bufanda.jpg',
    imagenes: ['recursos/img/producto-bufanda.jpg', 'recursos/img/producto-ovillos.jpg'],
    descripcion: 'Abrazo de invierno en forma de bufanda. Tejida con lana cálida y los acabados que solo la mano artesanal consigue.',
    beneficios: [
      'Lana cálida sin picazón, cómoda todo el día',
      'Punto doble: gruesa, suave y duradera',
      'Colores que combinan con todo',
      'Ideal para regalar en temporada fría'
    ],
    detalles: ['Largo: 170 cm · Ancho: 22 cm', 'Lana premium', 'Hecho 100% a mano'],
    cuidados: 'Lavar a mano con agua fría y secar plano.',
    envio: 'Listo para despachar en 24-72 h con guía de seguimiento.',
    digital: false
  },
  {
    id: 'set-posavasos',
    nombre: 'Set Posavasos x4',
    categoria: 'Cobijas & Hogar',
    precio: 45000,
    precioAntes: null,
    rating: 4,
    reseñas: 28,
    insignia: null,
    tipo: 'fisico',
    stock: 'Disponible',
    imagen: 'recursos/img/producto-posavasos.jpg',
    imagenes: ['recursos/img/producto-posavasos.jpg', 'recursos/img/producto-flor.jpg'],
    descripcion: 'Cuatro posavasos tejidos con punto circular que protegen tu mesa con estilo. El detalle artesanal perfecto para reuniones en casa.',
    beneficios: [
      'Protegen mesas y superficies con elegancia',
      'Punto grueso que aísla el calor',
      'Set de 4 piezas a juego',
      'Empaque listo para regalar'
    ],
    detalles: ['Diámetro: 11 cm por pieza', 'Algodón grueso', 'Hecho 100% a mano'],
    cuidados: 'Limpiar con paño húmedo.',
    envio: 'Listo para despachar en 24-72 h con guía de seguimiento.',
    digital: false
  },
  {
    id: 'patron-encanto-bebe',
    nombre: 'Patrón "Encanto Bebé"',
    categoria: 'Patrones & Kits',
    precio: 15000,
    precioAntes: null,
    rating: 5,
    reseñas: 190,
    insignia: 'Digital',
    tipo: 'digital',
    stock: 'Descarga inmediata',
    imagen: 'recursos/img/patrones.jpg',
    imagenes: ['recursos/img/patrones.jpg', 'recursos/img/producto-ovillos.jpg', 'recursos/img/producto-flor.jpg'],
    descripcion: 'Patrón PDF paso a paso para tejer un amigurumi de bebé adorable. Con fotos en cada vuelta, diagrama de puntadas y video tutorial incluido.',
    beneficios: [
      'Descarga inmediata: recibe el PDF en tu correo',
      'Fotos paso a paso y video tutorial',
      'Nivel: principiante con paciencia',
      'Asesoría por WhatsApp incluida'
    ],
    detalles: ['PDF de 24 páginas ilustradas', 'Nivel principiante', 'Idioma español'],
    cuidados: 'Guarda la copia: accede siempre que quieras. Descarga ilimitada.',
    envio: 'Entrega digital inmediata tras el pago.',
    digital: true
  },
  {
    id: 'kit-primer-punto',
    nombre: 'Kit "Primer Punto"',
    categoria: 'Patrones & Kits',
    precio: 89000,
    precioAntes: null,
    rating: 5,
    reseñas: 95,
    insignia: 'Kit',
    tipo: 'digital',
    stock: 'Disponible',
    imagen: 'recursos/img/hero.jpg',
    imagenes: ['recursos/img/hero.jpg', 'recursos/img/producto-ovillos.jpg', 'recursos/img/ganchos.jpg'],
    descripcion: 'Todo lo que necesitas para tu primera pieza de crochet: ovillos, ganchillos, marcadores, tijeras y el patrón guiado para crear tu primer amigurumi.',
    beneficios: [
      'Incluye el patrón para principiantes con video',
      'Materiales seleccionados por nuestras tejedoras',
      'Empaque con instrucciones claras',
      'Idea de regalo para quien quiere empezar'
    ],
    detalles: ['2 ovillos + ganchillos + accesorios', 'Nivel: principiante', 'Incluye manual digital'],
    cuidados: 'Incluye guía de cuidado de materiales.',
    envio: 'Envío nacional en 24-72 h + acceso digital inmediato.',
    digital: true
  },
  {
    id: 'pack-ovillos',
    nombre: 'Pack de ovillos suaves',
    categoria: 'Patrones & Kits',
    precio: 38000,
    precioAntes: null,
    rating: 5,
    reseñas: 64,
    insignia: 'Lanas',
    tipo: 'digital',
    stock: 'Disponible',
    imagen: 'recursos/img/producto-ovillos.jpg',
    imagenes: ['recursos/img/producto-ovillos.jpg', 'recursos/img/producto-flor.jpg'],
    descripcion: 'Tres ovillos de lana suave en colores armónicos para tus proyectos. La materia prima que usamos en nuestras propias piezas.',
    beneficios: [
      'Lana suave de alta calidad, sin picazón',
      'Colores que combinan entre sí',
      'Cantidad ideal para proyectos medianos',
      'Hecha para durar lavado tras lavado'
    ],
    detalles: ['3 ovillos de 100 g c/u', 'Lana premium', 'Elección de colores casual'],
    cuidados: 'Lavar prendas tejidas a mano con agua fría.',
    envio: 'Envío nacional en 24-72 h.',
    digital: true
  }
];

/* ============================================================
   CATÁLOGO VIVO + CAPA DE ADMINISTRACIÓN
   CATALOGO_BASE es la fuente original del código.
   CATALOGO es el arreglo vivo que todos los scripts comparten
   por referencia: lo que el panel agregue, edite o elimine
   se refleja al instante en la tienda, el carrito y el buscador.
   ============================================================ */
const CLAVE_CATALOGO = 'pa_catalogo_overrides';

const leerOverrides = () => {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE_CATALOGO));
    return datos && typeof datos === 'object' ? datos : {};
  } catch {
    return {};
  }
};

const guardarOverrides = (datos) => {
  try {
    localStorage.setItem(CLAVE_CATALOGO, JSON.stringify(datos));
  } catch {
    /* sin almacenamiento disponible */
  }
};

/* Valores por defecto para productos creados desde el panel */
const IMAGEN_RESPALDO = 'recursos/img/producto-ovillos.jpg';

const productoVacio = (id, datos = {}) => {
  const base = {
    id,
    nombre: 'Nueva pieza',
    categoria: 'Amigurumi',
    precio: 0,
    precioAntes: null,
    rating: 5,
    reseñas: 0,
    insignia: null,
    tipo: 'fisico',
    stock: 'Disponible',
    imagen: IMAGEN_RESPALDO,
    imagenes: [IMAGEN_RESPALDO],
    descripcion: 'Describe esta pieza tejida a mano, sus materiales y lo que la hace especial.',
    beneficios: ['Hecho 100% a mano', 'Materiales premium'],
    detalles: ['Añade las especificaciones de la pieza'],
    cuidados: 'Lavar a mano con agua fría y jabón suave. Secar a la sombra.',
    envio: 'Listo para despachar en 24-72 h con guía de seguimiento.',
    digital: false,
  };
  const producto = { ...base, ...datos, id };
  if (!Array.isArray(producto.imagenes) || !producto.imagenes.length) {
    producto.imagenes = [producto.imagen || IMAGEN_RESPALDO];
  }
  producto.digital = producto.tipo === 'digital';
  return producto;
};

/* Arreglo vivo: se rellena desde CATALOGO_BASE + las edition del panel */
const CATALOGO = [];

const reaplicarCatalogo = () => {
  const ov = leerOverrides();
  const eliminados = Array.isArray(ov.eliminados) ? ov.eliminados : [];
  const actualizados = ov.actualizados || {};
  const agregados = Array.isArray(ov.agregados) ? ov.agregados : [];

  const resultado = CATALOGO_BASE
    .filter((p) => !eliminados.includes(p.id))
    .map((p) => (actualizados[p.id] ? { ...p, ...actualizados[p.id] } : { ...p }));

  agregados.forEach((p) => {
    const final = actualizados[p.id] ? { ...p, ...actualizados[p.id] } : p;
    const i = resultado.findIndex((x) => x.id === p.id);
    if (i >= 0) resultado[i] = final;
    else resultado.push(final);
  });

  CATALOGO.length = 0;
  CATALOGO.push(...resultado);
};

reaplicarCatalogo();

const buscarProducto = (id) => CATALOGO.find((p) => p.id === id);
const estrellasHTML = (rating) => {
  let html = '';
  for (let i = 1; i <= 5; i++) {
    html += i <= rating
      ? '<i class="fa-solid fa-star" aria-hidden="true"></i>'
      : '<i class="fa-regular fa-star" aria-hidden="true"></i>';
  }
  return html;
};

/* ---------- Administración del catálogo (desde admin.html) ---------- */
const normalizarSlug = (texto) =>
  String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'producto';

const idUnico = (base) => {
  let id = base;
  let n = 2;
  while (CATALOGO.some((p) => p.id === id)) {
    id = `${base}-${n}`;
    n += 1;
  }
  return id;
};

const agregarProducto = (datos = {}) => {
  const ov = leerOverrides();
  ov.agregados = Array.isArray(ov.agregados) ? ov.agregados : [];
  const idPedido = String(datos.id || normalizarSlug(datos.nombre));
  const nuevo = productoVacio(idUnico(idPedido), datos);
  ov.agregados.push(nuevo);
  guardarOverrides(ov);
  reaplicarCatalogo();
  return nuevo;
};

const actualizarProducto = (id, cambios) => {
  const ov = leerOverrides();
  ov.agregados = Array.isArray(ov.agregados) ? ov.agregados : [];
  ov.actualizados = ov.actualizados || {};
  const enAgregados = ov.agregados.find((p) => p.id === id);
  if (enAgregados) {
    Object.assign(enAgregados, cambios);
  } else {
    ov.actualizados[id] = { ...(ov.actualizados[id] || {}), ...cambios };
  }
  guardarOverrides(ov);
  reaplicarCatalogo();
  return buscarProducto(id);
};

const eliminarProducto = (id) => {
  const ov = leerOverrides();
  ov.agregados = (ov.agregados || []).filter((p) => p.id !== id);
  ov.eliminados = [...new Set([...(ov.eliminados || []), String(id)])];
  guardarOverrides(ov);
  reaplicarCatalogo();
};

const restaurarCatalogo = () => {
  try {
    localStorage.removeItem(CLAVE_CATALOGO);
  } catch {
    /* nada que hacer */
  }
  reaplicarCatalogo();
};

const catalogoEditado = () => {
  const ov = leerOverrides();
  return Boolean(
    (ov.agregados || []).length ||
    (ov.eliminados || []).length ||
    Object.keys(ov.actualizados || {}).length
  );
};

/* ---------- API pública ---------- */
window.PACatalogo = {
  obtener: () => CATALOGO,
  base: () => CATALOGO_BASE,
  buscarProducto,
  estrellasHTML,
  formatearPrecio,
  normalizarSlug,
  productoVacio,
  agregarProducto,
  actualizarProducto,
  eliminarProducto,
  restaurarCatalogo,
  reaplicar: reaplicarCatalogo,
  leerOverrides,
  guardarOverrides,
  catalogoEditado,
  CLAVE_CATALOGO,
};