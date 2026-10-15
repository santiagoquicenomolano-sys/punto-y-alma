/* ============================================================
   PUNTO & ALMA · Textos, secciones y carrusel del sitio
   El panel de administración guarda aquí todo lo que cambias de
   la página y este módulo lo aplica al abrir cada sitio.

   - En el HTML cada texto editable lleva data-texto="clave" y
     cada sección que se puede apagar lleva data-seccion="id".
   - Nada de esto toca el código: el HTML original sigue siendo
     la fuente de verdad y "restaurar" lo deja intacto.

   Clave:
   - pa_contenido → { textos: {clave: valor}, secciones: {id: bool}, hero: {...} }
   ============================================================ */

(() => {
  const CLAVE = 'pa_contenido';

  /* ---------- Catálogo de textos editables ----------
     La clave debe coincidir con el data-texto del HTML.
     `original` es el texto que está hoy en el HTML: el panel lo
     muestra para que se pueda editar sin volver a escribirlo, y
     sirve para saber si un campo quedó igual (y no guardarlo).
     Si cambias el texto en el HTML, actualiza el original aquí. */
  const CAMPOS = [
    {
      clave: 'hero-titulo',
      etiqueta: 'Titular del hero',
      tipo: 'titulo',
      seccion: 'hero',
      original: 'Tejido con amor,\npara regalar alma.',
    },
    {
      clave: 'hero-sub',
      etiqueta: 'Párrafo del hero',
      tipo: 'parrafo',
      seccion: 'hero',
      original:
        'Amigurumis que abrazan, cobijas que arropan y patrones para que tú también crees. Cada pieza es única, hecha 100% a mano con materiales premium.',
    },
    { clave: 'categorias-titulo', etiqueta: 'Título de categorías', tipo: 'titulo', seccion: 'categorias', original: 'Encuentra tu pieza ideal' },
    { clave: 'productos-titulo', etiqueta: 'Título de productos', tipo: 'titulo', seccion: 'productos', original: 'Productos estrella' },
    { clave: 'productos-texto', etiqueta: 'Párrafo de productos', tipo: 'parrafo', seccion: 'productos', original: 'Piezas únicas tejidas una por una. Al agotarse, no se repiten igual.' },
    { clave: 'oferta-titulo', etiqueta: 'Título de la oferta', tipo: 'titulo', seccion: 'oferta', original: '20% OFF en cobijas y mantas' },
    { clave: 'oferta-texto', etiqueta: 'Párrafo de la oferta', tipo: 'parrafo', seccion: 'oferta', original: 'La calidez que tu hogar necesita, con precio de abrazo. Solo hasta el 31 de octubre.' },
    { clave: 'patrones-titulo', etiqueta: 'Título de patrones', tipo: 'titulo', seccion: 'patrones', original: 'Patrones & kits para crear' },
    { clave: 'patrones-texto', etiqueta: 'Párrafo de patrones', tipo: 'parrafo', seccion: 'patrones', original: 'Instrucciones claras paso a paso, con fotos y video. Descargas que se convierten en tesoros.' },
    { clave: 'beneficios-titulo', etiqueta: 'Título de beneficios', tipo: 'titulo', seccion: 'beneficios', original: 'Compra con el corazón tranquilo' },
    { clave: 'testimonios-titulo', etiqueta: 'Título de testimonios', tipo: 'titulo', seccion: 'testimonios', original: 'Clientas que ya tejieron su historia' },
    { clave: 'historia-titulo', etiqueta: 'Título de la historia', tipo: 'titulo', seccion: 'historia', original: 'De un ovillo nació Punto & Alma' },
    { clave: 'faq-titulo', etiqueta: 'Título de preguntas', tipo: 'titulo', seccion: 'faq', original: 'Preguntas frecuentes' },
    { clave: 'boletin-titulo', etiqueta: 'Título del boletín', tipo: 'titulo', seccion: 'boletin', original: '10% OFF en tu primer pedido' },
    { clave: 'boletin-texto', etiqueta: 'Párrafo del boletín', tipo: 'parrafo', seccion: 'boletin', original: 'Recibe un patrón gratis, estrenos y ofertas exclusivas. Sin spam, solo buena lana.' },
  ];

  /* Secciones que el panel puede mostrar u ocultar. */
  const SECCIONES = [
    { id: 'hero', etiqueta: 'Hero (titular e imagen)', obligatoria: true },
    { id: 'cinta', etiqueta: 'Cinta de beneficios' },
    { id: 'categorias', etiqueta: 'Categorías' },
    { id: 'productos', etiqueta: 'Productos', obligatoria: true },
    { id: 'oferta', etiqueta: 'Oferta con cuenta regresiva' },
    { id: 'patrones', etiqueta: 'Patrones y kits' },
    { id: 'beneficios', etiqueta: 'Beneficios' },
    { id: 'testimonios', etiqueta: 'Testimonios' },
    { id: 'historia', etiqueta: 'Nuestra historia' },
    { id: 'faq', etiqueta: 'Preguntas frecuentes' },
    { id: 'boletin', etiqueta: 'Boletín' },
  ];

  /* Cómo se comporta el carrusel del hero si el panel no dice nada. */
  const HERO_POR_DEFECTO = {
    activo: true,
    autoplay: true,
    ms: 3200,
    orden: 'catalogo',
    excluir: [],
    mostrarNombre: true,
    mostrarPrecio: true,
  };

  /* Tope de duración para que nunca se vea ni un fogonazo ni una diapositiva eterna. */
  const MS_MIN = 1200;
  const MS_MAX = 9000;

  const ORDENES = [
    { id: 'catalogo', etiqueta: 'Como aparecen en la tienda' },
    { id: 'destacados', etiqueta: 'Más destacados primero' },
    { id: 'precio-asc', etiqueta: 'Del más barato al más caro' },
    { id: 'precio-desc', etiqueta: 'Del más caro al más barato' },
    { id: 'alfabetico', etiqueta: 'Por nombre (A-Z)' },
  ];

  /* ---------- Almacenamiento ---------- */
  const leerBruto = () => {
    try {
      const crudo = localStorage.getItem(CLAVE);
      const valor = crudo ? JSON.parse(crudo) : null;
      return valor && typeof valor === 'object' ? valor : {};
    } catch {
      return {};
    }
  };

  const guardarBruto = (valor) => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(valor));
      return true;
    } catch {
      return false;
    }
  };

  const soloTexto = (valor) =>
    valor && typeof valor === 'object' && !Array.isArray(valor) ? valor : {};

  const listaDe = (valor) => (Array.isArray(valor) ? valor.map(String) : []);

  const limitar = (n, min, max) => {
    const numero = Math.round(Number(n));
    if (!Number.isFinite(numero)) return min;
    return Math.min(max, Math.max(min, numero));
  };

  /* ---------- Lectura ya normalizada ---------- */
  const hero = () => {
    const crudo = soloTexto(soloTexto(leerBruto()).hero);
    const ordenes = ORDENES.map((o) => o.id);
    return {
      activo: crudo.activo !== false,
      autoplay: crudo.autoplay !== false,
      ms: crudo.ms === undefined ? HERO_POR_DEFECTO.ms : limitar(crudo.ms, MS_MIN, MS_MAX),
      orden: ordenes.includes(crudo.orden) ? crudo.orden : HERO_POR_DEFECTO.orden,
      excluir: listaDe(crudo.excluir),
      mostrarNombre: crudo.mostrarNombre !== false,
      mostrarPrecio: crudo.mostrarPrecio !== false,
    };
  };

  const textos = () => {
    const crudo = soloTexto(leerBruto().textos);
    const salida = {};
    CAMPOS.forEach((campo) => {
      const valor = crudo[campo.clave];
      if (typeof valor === 'string' && valor.trim()) salida[campo.clave] = valor;
    });
    return salida;
  };

  const secciones = () => {
    const crudo = soloTexto(leerBruto().secciones);
    const salida = {};
    SECCIONES.forEach((s) => {
      if (crudo[s.id] === false) salida[s.id] = false;
      else if (crudo[s.id] === true) salida[s.id] = true;
    });
    return salida;
  };

  const leer = () => ({ textos: textos(), secciones: secciones(), hero: hero() });

  /* ---------- Guardado ---------- */
  /* Solo se guarda lo que se aparta del valor original, así la clave
     no se llena de basura y "restaurar" es borrar una sola línea. */
  const guardar = (parcial = {}) => {
    const actual = leerBruto();

    if (parcial.textos) {
      const destino = soloTexto(actual.textos);
      CAMPOS.forEach((campo) => {
        const valor = parcial.textos[campo.clave];
        if (valor === undefined) return;
        const limpio = String(valor).replace(/\r\n/g, '\n').trim();
        /* Vacío o igual al original: se borra el cambio, no se guarda. */
        if (!limpio || limpio === campo.original.trim()) delete destino[campo.clave];
        else destino[campo.clave] = limpio;
      });
      actual.textos = destino;
    }

    if (parcial.secciones) {
      const destino = soloTexto(actual.secciones);
      SECCIONES.forEach((s) => {
        const valor = parcial.secciones[s.id];
        if (valor === undefined) return;
        if (valor === false) destino[s.id] = false;
        else delete destino[s.id];
      });
      actual.secciones = destino;
    }

    if (parcial.hero) {
      const destino = hero();
      const nuevo = parcial.hero;
      if (nuevo.activo !== undefined) destino.activo = Boolean(nuevo.activo);
      if (nuevo.autoplay !== undefined) destino.autoplay = Boolean(nuevo.autoplay);
      if (nuevo.mostrarNombre !== undefined) destino.mostrarNombre = Boolean(nuevo.mostrarNombre);
      if (nuevo.mostrarPrecio !== undefined) destino.mostrarPrecio = Boolean(nuevo.mostrarPrecio);
      if (nuevo.orden !== undefined && ORDENES.some((o) => o.id === nuevo.orden)) {
        destino.orden = nuevo.orden;
      }
      if (nuevo.ms !== undefined) destino.ms = limitar(nuevo.ms, MS_MIN, MS_MAX);
      if (nuevo.excluir !== undefined) destino.excluir = listaDe(nuevo.excluir);
      actual.hero = destino;
    }

    guardarBruto(actual);
    return leer();
  };

  /* Vuelve todo a como está en el HTML. */
  const restaurar = () => {
    try {
      localStorage.removeItem(CLAVE);
    } catch {
      /* sin almacenamiento */
    }
    return leer();
  };

  const hayCambios = () => Boolean(leerBruto().textos || leerBruto().secciones || leerBruto().hero);

  /* Cuántas cosas se apartaron del original: lo usa el panel. */
  const cambios = () => {
    const guardado = leer();
    let total = Object.keys(guardado.textos).length;
    total += Object.values(guardado.secciones).filter((v) => v === false).length;
    Object.keys(HERO_POR_DEFECTO).forEach((clave) => {
      const antes = HERO_POR_DEFECTO[clave];
      const ahora = guardado.hero[clave];
      const iguales = Array.isArray(antes) ? antes.join('|') === ahora.join('|') : antes === ahora;
      if (!iguales) total += 1;
    });
    return total;
  };

  /* ---------- Aplicar en la página ---------- */
  const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const escapar = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

  /* Un salto de línea en el panel se vuelve un <br> en la página. */
  const comoHtml = (valor) => escapar(valor).replace(/\r?\n/g, '<br>');

  const aplicar = () => {
    const guardado = leerBruto();

    const listaTextos = soloTexto(guardado.textos);
    document.querySelectorAll('[data-texto]').forEach((el) => {
      const valor = listaTextos[el.dataset.texto];
      if (typeof valor !== 'string' || !valor.trim()) return;
      el.innerHTML = comoHtml(valor);
      el.dataset.editado = '1';
    });

    const listaSecciones = soloTexto(guardado.secciones);
    document.querySelectorAll('[data-seccion]').forEach((el) => {
      const visible = listaSecciones[el.dataset.seccion];
      if (visible === false) {
        el.hidden = true;
        el.dataset.apagada = '1';
      } else if (visible === true) {
        el.hidden = false;
        delete el.dataset.apagada;
      }
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', aplicar);
  } else {
    aplicar();
  }

  window.PAContenido = {
    CLAVE,
    CAMPOS,
    SECCIONES,
    ORDENES,
    HERO_POR_DEFECTO,
    MS_MIN,
    MS_MAX,
    leer,
    hero,
    textos,
    secciones,
    guardar,
    restaurar,
    hayCambios,
    cambios,
    aplicar,
  };
})();