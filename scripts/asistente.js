/* ============================================================
   PUNTO & ALMA · Burbuja del asistente de IA "Alma"
   Se inyecta sola en cualquier pagina. Incluye:
   - Chat con historial guardado en el navegador.
   - Atajos rapidos y guia de estilos paso a paso.
   - Quiz de preferencias que arma una recomendacion a medida.
   - Uso opcional de una IA real si el panel la deja configurada.
   ============================================================ */
(() => {
  const IA = window.PAIA;
  const C = window.PAComun;
  if (!IA || !C) return;

  const $ = (s) => document.querySelector(s);
  const esc = (s) => C.esc(s);

  /* ---------- Montaje del widget ---------- */
  const contenedor = document.createElement('div');
  contenedor.id = 'ia-root';
  contenedor.innerHTML = `
    <button class="ia-fab" id="ia-fab" type="button"
            aria-label="Abrir la asesora Alma" aria-expanded="false" aria-controls="ia-panel">
      <i class="fa-solid fa-comment-dots" aria-hidden="true"></i>
      <span class="ia-fab-etiqueta">¿Te ayudo?</span>
    </button>

    <div class="ia-panel" id="ia-panel" role="dialog" aria-label="Asesora Alma" hidden>
      <header class="ia-cab">
        <div class="ia-avatar" aria-hidden="true"><i class="fa-solid fa-heart"></i></div>
        <div class="ia-cab-datos">
          <b>Alma</b>
          <span id="ia-estado"><i class="fa-solid fa-circle" aria-hidden="true"></i> Asesora de la tienda</span>
        </div>
        <button class="ia-icono" id="ia-limpiar" type="button" title="Empezar de nuevo" aria-label="Empezar la conversación de nuevo">
          <i class="fa-solid fa-rotate-left" aria-hidden="true"></i>
        </button>
        <button class="ia-icono" id="ia-cerrar" type="button" title="Cerrar" aria-label="Cerrar el asistente">
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      </header>

      <div class="ia-hilo" id="ia-hilo" role="log" aria-live="polite" aria-atomic="false"></div>

      <div class="ia-chips" id="ia-chips"></div>

      <form class="ia-form" id="ia-form">
        <input type="text" id="ia-input" placeholder="Escribe tu pregunta…"
               autocomplete="off" aria-label="Escribe tu pregunta para Alma" maxlength="300">
        <button type="submit" aria-label="Enviar mensaje">
          <i class="fa-solid fa-paper-plane" aria-hidden="true"></i>
        </button>
      </form>

      <p class="ia-pie">
        <i class="fa-solid fa-shield-heart" aria-hidden="true"></i> Responder en Manizales · Nequi 313 638 4065
        · <a href="ayuda.html">Ver todas las guías</a>
      </p>
    </div>`;
  document.body.appendChild(contenedor);

  const fab = $('#ia-fab');
  const panel = $('#ia-panel');
  const hilo = $('#ia-hilo');
  const chips = $('#ia-chips');
  const form = $('#ia-form');
  const input = $('#ia-input');
  const estado = $('#ia-estado');

  const CLAVE_HISTORIAL = 'ia_historial';

  /* ---------- Historial ---------- */
  const leerHistorial = () => {
    try {
      const h = JSON.parse(localStorage.getItem(CLAVE_HISTORIAL));
      return Array.isArray(h) ? h.slice(-30) : [];
    } catch {
      return [];
    }
  };

  const guardarHistorial = () => {
    try {
      localStorage.setItem(CLAVE_HISTORIAL, JSON.stringify(leerHistorial().slice(-30)));
    } catch {
      /* sin almacenamiento */
    }
  };

  /* ---------- Pintar mensajes ---------- */
  const burbuja = (quien, html) => {
    const fila = document.createElement('div');
    fila.className = `ia-fila ia-${quien}`;
    fila.innerHTML = `<div class="ia-burbuja">${html}</div>`;
    hilo.appendChild(fila);
    hilo.scrollTop = hilo.scrollHeight;
    return fila;
  };

  const yoDigo = (texto) => {
    burbuja('yo', esc(texto));
    leerHistorial().push({ quien: 'yo', texto });
    guardarHistorial();
  };

  const almaDice = (html) => {
    const fila = burbuja('alma', html);
    leerHistorial().push({ quien: 'alma', html });
    guardarHistorial();
    return fila;
  };

  const escribiendo = () => {
    const fila = burbuja(
      'alma',
      '<span class="ia-puntos" aria-label="Alma está escribiendo"><i></i><i></i><i></i></span>'
    );
    return fila;
  };

  const setChips = (lista = []) => {
    chips.innerHTML = lista
      .map((c) => `<button class="ia-chip" type="button" data-chip="${esc(c)}">${esc(c)}</button>`)
      .join('');
  };

  const espera = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ============================================================
     QUIZ DE PREFERENCIAS
     ============================================================ */
  const QUIZ = [
    {
      pregunta: '¿Para quién buscas la pieza?',
      opciones: [
        { texto: 'Un bebé', prefs: { para: 'bebe' } },
        { texto: 'La casa', prefs: { para: 'casa' } },
        { texto: 'Un regalo', prefs: { para: 'regalo' } },
        { texto: 'Para mí', prefs: { para: 'yo' } },
      ],
    },
    {
      pregunta: '¿Qué estilo te gusta más?',
      opciones: [
        { texto: 'Pastel y suave', prefs: { estilo: 'pastel' } },
        { texto: 'Cálido de hogar', prefs: { estilo: 'calido' } },
        { texto: 'Minimalista', prefs: { estilo: 'minimalista' } },
        { texto: 'Vintage', prefs: { estilo: 'vintage' } },
        { texto: 'Divertido', prefs: { estilo: 'expresivo' } },
      ],
    },
    {
      pregunta: '¿En qué rango quieres invertir?',
      opciones: IA.PRESUPUESTOS.map((r) => ({ texto: r.etiqueta, prefs: { presupuesto: r.id } })),
    },
    {
      pregunta: '¿Prefieres piezas para tener o patrones para tejer?',
      opciones: [
        { texto: 'Piezas listas', prefs: { categoria: '' } },
        { texto: 'Patrones y kits', prefs: { soloDigital: true } },
      ],
    },
  ];

  let quizAbierto = false;

  const pintarPasoQuiz = (i) => {
    const paso = QUIZ[i];
    const esUltimo = i === QUIZ.length - 1;
    quizAbierto = true;
    setChips(paso.opciones.map((o) => o.texto));
    setTimeout(() => {
      almaDice(
        `<p class="ia-pregunta">${esc(paso.pregunta)}</p>
         <p class="ia-nota">Puedes responder con un clic. Yo guardo tu gusto para no preguntarte cada vez.</p>`
      );
    }, 180);
    chips.dataset.paso = String(i);
    chips.dataset.esUltimo = esUltimo ? '1' : '0';
  };

  const cerrarQuiz = () => {
    quizAbierto = false;
    chips.dataset.paso = '';
    chips.dataset.esUltimo = '0';
  };

  const avanzarQuiz = (texto) => {
    const paso = Number(chips.dataset.paso || 0);
    const opcion = QUIZ[paso].opciones.find((o) => o.texto === texto);
    if (!opcion) return;
    const prefs = { ...opcion.prefs };
    if (prefs.soloDigital) prefs.categoria = 'Patrones & Kits';
    IA.guardarPrefs(prefs);
    const siguiente = paso + 1;
    if (siguiente < QUIZ.length) {
      setChips(QUIZ[siguiente].opciones.map((o) => o.texto));
      chips.dataset.paso = String(siguiente);
      chips.dataset.esUltimo = siguiente === QUIZ.length - 1 ? '1' : '0';
      yoDigo(texto);
      setTimeout(() => {
        almaDice(`<p class="ia-pregunta">${esc(QUIZ[siguiente].pregunta)}</p>`);
      }, 200);
    } else {
      cerrarQuiz();
      yoDigo(texto);
      mostrarRecomendacion();
    }
  };

  const mostrarRecomendacion = () => {
    const prefs = IA.leerPrefs();
    const lista = prefs.soloDigital
      ? IA.buscarProductos('patron kit digital', 3)
      : IA.recomendar(prefs, 3);
    const usados = lista.length
      ? lista
      : (window.PACatalogo ? window.PACatalogo.obtener() : []).slice(0, 3);

    almaDice(
      `<p>Listo, ya tengo tu perfil de gusto. Esto es lo que te va a encantar:</p>
       ${IA.renderProductos(usados, 'Mi selección para ti')}
       <p class="ia-nota">Guardé tus preferencias. Puedes cambiarlas cuando quieras con el botón de abajo.</p>`
    );
    setChips(['Cambiar mis preferencias', 'Ver todos los productos', 'Guía: cómo comprar']);
  };

  /* ============================================================
     Responder
     ============================================================ */
  const SaludoInicial = () => `
    ${IA.saludar}
    <div class="ia-sugerencias">
      <button class="ia-chip" type="button" data-chip="Empezar el quiz">✨ Quiero recomendaciones</button>
      <button class="ia-chip" type="button" data-chip="Cómo subo mi creación">📸 Subir mi creación</button>
      <button class="ia-chip" type="button" data-chip="Cómo edito un producto">⚙️ Administrar productos</button>
      <button class="ia-chip" type="button" data-chip="Guías de la página">📚 Todas las guías</button>
    </div>`;

  const ACCIONES = {
    'Empezar el quiz': () => {
      const paso = QUIZ[0];
      almaDice(`<p class="ia-pregunta">${esc(paso.pregunta)}</p>`);
      pintarPasoQuiz(0);
      // pintarPasoQuiz vuelve a preguntar; evitamos duplicado
      hilo.querySelectorAll('.ia-alma .ia-pregunta').forEach((n, i, arr) => {
        if (i < arr.length - 1) n.remove();
      });
    },
    'Cambiar mis preferencias': () => {
      IA.borrarPrefs();
      almaDice('<p>Listo, borré tu perfil de gusto. Vamos de nuevo:</p>');
      pintarPasoQuiz(0);
    },
    'Ver todos los productos': () => {
      window.location.href = 'index.html#productos';
    },
    'Ver productos': () => {
      window.location.href = 'index.html#productos';
    },
    'Hablar con la artesana': () => {
      almaDice(
        `<p>Claro. Escríbele por WhatsApp a <b>313 638 4065</b> o al correo
         <b>santiagoquicenomolano@gmail.com</b>. Atiende de Manizales.</p>`
      );
      window.open('https://wa.me/573136384065', '_blank', 'noopener');
    },
    'Siguiente guía': () => {
      const ids = IA.listaGuias('cliente').map((g) => g.id);
      const i = ids.indexOf(ultimaGuia);
      const siguiente = ids[(i + 1) % ids.length];
      if (siguiente) ACCIONES[IA.guiaPorId(siguiente).titulo] ? null : mostrarGuia(siguiente);
    },
    'Ver otra guía': () => ACCIONES['Guías de la página'],
    'Guias del panel': () => ACCIONES['Guías de la página'],
  };

  let ultimaGuia = null;

  const mostrarGuia = (id) => {
    const g = IA.guiaPorId(id);
    if (!g) return;
    ultimaGuia = id;
    almaDice(IA.renderPasos(g));
    const extra =
      g.para === 'admin'
        ? ['Abrir el panel', 'Ver otra guía']
        : ['Siguiente guía', 'Ver los productos', 'Hablar con la artesana'];
    setChips(extra);
  };

  const responder = async (texto) => {
    // Atajos internos
    if (ACCIONES[texto]) return ACCIONES[texto]();
    if (/^Guardar estilo/i.test(texto)) {
      const ref = IA.referencias.find((r) => texto.toLowerCase().includes(C.normalizar(r.titulo)));
      if (ref) {
        IA.guardarPrefs({ estilo: ref.id });
        almaDice(
          `<p>¡Listo! Guardé <b>${esc(ref.titulo)}</b> como tu estilo. Te lo voy a tener en cuenta siempre. 🤍</p>`
        );
        setChips(['Recomendaciones para mí', 'Ver productos', 'Cambiar mis preferencias']);
        return;
      }
    }
    if (texto === 'Abrir el panel') {
      window.location.href = 'admin.html';
      return;
    }
    if (/^Ver (la ficha|precios)/i.test(texto)) {
      window.location.href = 'index.html#productos';
      return;
    }

    // Si hay IA real configurada, se intenta primero
    const cfg = IA.leerConfigIA();
    if (cfg.modo === 'remoto' && cfg.endpoint && cfg.clave) {
      const puntos = escribiendo();
      try {
        const textoIA = await IA.consultarRemoto(texto);
        puntos.remove();
        if (textoIA) {
          estado.innerHTML = '<i class="fa-solid fa-circle" aria-hidden="true"></i> IA real conectada';
          almaDice(
            `${esc(textoIA).replace(/\n/g, '<br>')}<span class="ia-marca">respondido por IA real</span>`
          );
          setChips(['Guía: cómo comprar', 'Ver productos', 'Hablar con la artesana']);
          return;
        }
      } catch {
        puntos.remove();
        estado.innerHTML = '<i class="fa-solid fa-circle" aria-hidden="true"></i> Asesora de la tienda';
        almaDice('<p class="ia-nota">No pude conectarme con la IA configurada, así que te respondo con mi base local. 🙂</p>');
      }
    }

    const puntos = escribiendo();
    const r = IA.responder(texto);
    await espera(Math.min(900, 260 + texto.length * 8));
    puntos.remove();

    almaDice(r.html);
    if (r.accion === 'quiz') pintarPasoQuiz(0);
    setChips(r.chips || []);
    if (r.sugerenciasAyuda) {
      const g = IA.guiaPorId('subir-creacion');
      setTimeout(() => setChips([...r.chips, 'Ver guía: subir creación']), 10);
    }
  };

  /* ---------- Interacción ---------- */
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const texto = input.value.trim();
    if (!texto) return;
    input.value = '';
    yoDigo(texto);
    responder(texto);
  });

  document.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-chip]');
    if (chip) {
      const texto = chip.dataset.chip;
      if (quizAbierto && chips.dataset.paso !== '' && QUIZ[Number(chips.dataset.paso)]?.opciones.some((o) => o.texto === texto)) {
        avanzarQuiz(texto);
        return;
      }
      yoDigo(texto);
      responder(texto);
      return;
    }
    const botonGuia = e.target.closest('[data-guia]');
    if (botonGuia) {
      yoDigo(botonGuia.textContent.trim());
      mostrarGuia(botonGuia.dataset.guia);
    }
  });

  /* Abrir / cerrar */
  const abrir = () => {
    panel.hidden = false;
    document.body.style.overflow = '';
    fab.classList.add('ia-fab-oculto');
    requestAnimationFrame(() => panel.classList.add('abierto'));
    fab.setAttribute('aria-expanded', 'true');
    if (!hilo.childElementCount) {
      almaDice(SaludoInicial());
      setChips(['Empezar el quiz', 'Cómo subo mi creación', 'Guías de la página', 'Formas de pago']);
    }
    setTimeout(() => input.focus(), 200);
  };

  const cerrar = () => {
    panel.classList.remove('abierto');
    fab.classList.remove('ia-fab-oculto');
    setTimeout(() => {
      panel.hidden = true;
    }, 300);
    fab.setAttribute('aria-expanded', 'false');
  };

  fab.addEventListener('click', abrir);
  $('#ia-cerrar').addEventListener('click', cerrar);
  $('#ia-limpiar').addEventListener('click', () => {
    hilo.innerHTML = '';
    try {
      localStorage.removeItem(CLAVE_HISTORIAL);
    } catch {}
    cerrarQuiz();
    almaDice(SaludoInicial());
    setChips(['Empezar el quiz', 'Cómo subo mi creación', 'Guías de la página', 'Formas de pago']);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) cerrar();
  });
})();