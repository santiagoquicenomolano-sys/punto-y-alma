/* ============================================================
   PUNTO & ALMA · Base de datos en la nube (Supabase)
   Enlaza todo el panel a una sola tabla y guarda solo:
   clientes, pedidos, boletin, bitacora, creaciones, foro,
   catalogo y contenido del sitio.

   Como funciona:
   - Todo sigue guardandose al instante en este navegador
     (localStorage), para que la tienda nunca se detenga.
   - Cada cambio en una clave pa_* programa un envio a
     Supabase (2 s de espera para no saturar).
   - Al abrir cualquier pagina, baja lo que haya en la nube
     y lo mezcla sin borrar lo nuevo que tengas aqui.
   - Sin internet, los cambios quedan pendientes y se envian
     solos al volver la conexion.

   Tabla esperada (ver supabase.sql):
   - tienda_datos(clave TEXT PK, valor JSONB, actualizado TIMESTAMPTZ)

   Clave local de configuracion:
   - pa_nube → { proveedor, url, anon, tabla, auto }
   - pa_nube_meta → { clave: actualizado } (para no pisar lo nuevo)
   ============================================================ */

(() => {
  const CLAVE_CONFIG = 'pa_nube';
  const CLAVE_META = 'pa_nube_meta';
  const TABLA_DEFECTO = 'tienda_datos';

  /* Todo lo del panel que se guarda solo en la nube. */
  const CLAVES_SINC = [
    'pa_usuarios',
    'pa_pedidos',
    'pa_registros',
    'pa_boletin',
    'pa_creaciones',
    'pa_foro',
    'pa_catalogo_overrides',
    'pa_contenido',
  ];

  const estadoMemoria = {
    estado: 'local',
    detalle: 'Solo en este navegador',
    ocupado: false,
    sucio: false,
    temporizador: null,
  };

  /* ---------- Utilidades ---------- */
  const sinBarra = (url) => String(url || '').trim().replace(/\/+$/, '');

  const leerJSON = (clave, respaldo) => {
    try {
      const crudo = localStorage.getItem(clave);
      if (crudo === null || crudo === undefined) return respaldo;
      return JSON.parse(crudo);
    } catch {
      return respaldo;
    }
  };

  const escribirJSON = (clave, valor) => {
    try {
      localStorage.setItem(clave, JSON.stringify(valor));
      return true;
    } catch {
      return false;
    }
  };

  const leerConfig = () => {
    const crudo = leerJSON(CLAVE_CONFIG, null);
    const URL_DEFECTO = 'https://rvzybihhsvbgrhweusid.supabase.co';
    if (!crudo || typeof crudo !== 'object') {
      return { proveedor: 'supabase', url: URL_DEFECTO, anon: '', tabla: TABLA_DEFECTO, auto: true };
    }
    return {
      proveedor: 'supabase',
      url: sinBarra(crudo.url) || URL_DEFECTO,
      anon: String(crudo.anon || '').trim(),
      tabla: String(crudo.tabla || TABLA_DEFECTO).trim() || TABLA_DEFECTO,
      auto: crudo.auto !== false,
    };
  };

  const guardarConfig = (parcial = {}) => {
    const actual = leerConfig();
    const siguiente = {
      proveedor: 'supabase',
      url: parcial.url !== undefined ? sinBarra(parcial.url) : actual.url,
      anon: parcial.anon !== undefined ? String(parcial.anon).trim() : actual.anon,
      tabla: parcial.tabla !== undefined ? String(parcial.tabla).trim() || TABLA_DEFECTO : actual.tabla,
      auto: parcial.auto !== undefined ? Boolean(parcial.auto) : actual.auto,
    };
    escribirJSON(CLAVE_CONFIG, siguiente);
    pintarEstado();
    return siguiente;
  };

  const configurado = () => {
    const cfg = leerConfig();
    return Boolean(cfg.url && cfg.anon && /^https:\/\//.test(cfg.url));
  };

  const leerMeta = () => {
    const m = leerJSON(CLAVE_META, {});
    return m && typeof m === 'object' ? m : {};
  };

  const guardarMeta = (meta) => escribirJSON(CLAVE_META, meta);

  const fijarEstado = (estado, detalle) => {
    estadoMemoria.estado = estado;
    estadoMemoria.detalle = detalle;
    window.dispatchEvent(new CustomEvent('pa:nube', { detail: { estado, detalle } }));
    pintarEstado();
  };

  /* ---------- Cliente REST de Supabase (sin dependencias) ---------- */
  const cabeceras = (cfg, extra = {}) => ({
    apikey: cfg.anon,
    Authorization: `Bearer ${cfg.anon}`,
    'Content-Type': 'application/json',
    ...extra,
  });

  const urlTabla = (cfg, consulta = '') => `${cfg.url}/rest/v1/${encodeURIComponent(cfg.tabla)}${consulta}`;

  /* Sube todas las claves pa_* de una vez (upsert por clave). */
  const push = async () => {
    if (estadoMemoria.ocupado) {
      estadoMemoria.sucio = true;
      return false;
    }
    if (!configurado()) {
      fijarEstado('local', 'Solo en este navegador · pega tu URL y API key abajo');
      return false;
    }
    const cfg = leerConfig();
    if (!cfg.auto && !push.forzado) {
      fijarEstado('pausado', 'Sincronización automática apagada');
      return false;
    }
    estadoMemoria.ocupado = true;
    fijarEstado('subiendo', 'Guardando en la nube…');
    try {
      const ahora = new Date().toISOString();
      const filas = CLAVES_SINC.map((clave) => {
        let valor = null;
        try {
          const crudo = localStorage.getItem(clave);
          valor = crudo === null ? null : JSON.parse(crudo);
        } catch {
          valor = null;
        }
        return { clave, valor, actualizado: ahora };
      }).filter((f) => f.valor !== null && f.valor !== undefined);

      if (!filas.length) {
        fijarEstado('nube', 'Nube conectada · nada nuevo que guardar');
        estadoMemoria.ocupado = false;
        return true;
      }

      const res = await fetch(urlTabla(cfg, '?on_conflict=clave'), {
        method: 'POST',
        headers: cabeceras(cfg, { Prefer: 'resolution=merge-duplicates' }),
        body: JSON.stringify(filas),
      });
      if (!res.ok) {
        const texto = await res.text().catch(() => '');
        throw new Error(`Supabase respondió ${res.status} ${texto.slice(0, 120)}`);
      }
      const meta = leerMeta();
      filas.forEach((f) => { meta[f.clave] = f.actualizado; });
      guardarMeta(meta);
      escribirJSON(CLAVE_CONFIG, { ...cfg, ultimoPush: ahora });
      fijarEstado('nube', `Guardado automático en la nube · ${new Date().toLocaleString('es-CO')}`);
      estadoMemoria.sucio = false;
      estadoMemoria.ocupado = false;
      if (estadoMemoria.sucio) programarPush(1500);
      return true;
    } catch (error) {
      estadoMemoria.ocupado = false;
      estadoMemoria.sucio = true;
      fijarEstado('error', `Sin conexión a la nube (${error.message || 'red'}). Reintento solo.`);
      programarPush(15000);
      return false;
    }
  };

  /* Baja lo de la nube y lo mezcla sin borrar lo nuevo local. */
  const pull = async () => {
    if (!configurado()) return false;
    const cfg = leerConfig();
    try {
      const res = await fetch(urlTabla(cfg, '?select=clave,valor,actualizado'), {
        headers: cabeceras(cfg),
      });
      if (!res.ok) throw new Error(`Supabase respondió ${res.status}`);
      const filas = await res.json();
      if (!Array.isArray(filas)) return false;
      const meta = leerMeta();
      let aplicadas = 0;
      const originales = {};
      filas.forEach((f) => {
        if (!f || !CLAVES_SINC.includes(f.clave)) return;
        const remotoEn = Date.parse(f.actualizado || '') || 0;
        const localEn = Date.parse(meta[f.clave] || '') || 0;
        /* Si la nube trae algo igual o más viejo que lo último que
           subimos, no tocamos lo local. */
        if (remotoEn && localEn && remotoEn <= localEn) return;
        try {
          originales[f.clave] = localStorage.getItem(f.clave);
          escrituraLocal.write(f.clave, JSON.stringify(f.valor));
          meta[f.clave] = f.actualizado || new Date().toISOString();
          aplicadas += 1;
        } catch {
          /* se ignora esa clave */
        }
      });
      guardarMeta(meta);
      if (aplicadas) {
        window.dispatchEvent(new CustomEvent('pa:nube-bajada', { detail: { aplicadas, originales } }));
        /* Los módulos vivos (catálogo, contenido) releen del storage. */
        try {
          if (window.PACatalogo) window.PACatalogo.reaplicar();
          if (window.PAContenido) window.PAContenido.aplicar();
        } catch { /* nada */ }
      }
      escribirJSON(CLAVE_CONFIG, { ...cfg, ultimoPull: new Date().toISOString() });
      return aplicadas;
    } catch {
      return false;
    }
  };

  /* Sube y luego baja: el botón "Sincronizar ahora". */
  const sincronizar = async () => {
    push.forzado = true;
    try {
      await push();
      await pull();
      fijarEstado('nube', `Todo sincronizado · ${new Date().toLocaleString('es-CO')}`);
      return true;
    } finally {
      push.forzado = false;
    }
  };

  const programarPush = (ms = 2000) => {
    estadoMemoria.sucio = true;
    if (!configurado() || !leerConfig().auto) {
      pintarEstado();
      return;
    }
    clearTimeout(estadoMemoria.temporizador);
    estadoMemoria.temporizador = setTimeout(() => {
      estadoMemoria.sucio = false;
      push();
    }, ms);
  };

  /* ---------- Interceptar cada guardado local ----------
     Todos los módulos (auth, registro, carrito, catálogo…)
     escriben con localStorage.setItem. Lo envolvemos para que
     cada cambio en pa_* se suba solo, sin tocar esos archivos. */
  const escrituraLocal = {
    original: Storage.prototype.setItem,
    write(clave, valor) {
      return this.original.call(localStorage, clave, valor);
    },
  };

  let parcheado = false;
  const parcharStorage = () => {
    if (parcheado) return;
    parcheado = true;
    const originalSet = localStorage.setItem.bind(localStorage);
    escrituraLocal.original = Storage.prototype.setItem;
    escrituraLocal.write = (clave, valor) => originalSet(clave, valor);
    localStorage.setItem = (clave, valor) => {
      const resultado = originalSet(clave, valor);
      if (typeof clave === 'string' && (CLAVES_SINC.includes(clave) || clave === 'pa_sesion')) {
        if (CLAVES_SINC.includes(clave)) programarPush(2000);
      }
      return resultado;
    };
    const originalRemove = localStorage.removeItem.bind(localStorage);
    localStorage.removeItem = (clave) => {
      const resultado = originalRemove(clave);
      if (CLAVES_SINC.includes(clave)) programarPush(2000);
      return resultado;
    };
  };

  /* ---------- Estado visible en el panel ---------- */
  const pintarEstado = () => {
    const pastilla = document.getElementById('nube-estado') || document.getElementById('estado-nube');
    if (pastilla) {
      pastilla.textContent =
        estadoMemoria.estado === 'nube' ? '● Nube conectada'
        : estadoMemoria.estado === 'subiendo' ? '● Guardando…'
        : estadoMemoria.estado === 'error' ? '● Sin conexión (reintento solo)'
        : estadoMemoria.estado === 'pausado' ? '● Pausada'
        : '○ Solo local';
      pastilla.classList.toggle('activo', estadoMemoria.estado === 'nube');
    }
    const detalle = document.getElementById('nube-detalle');
    if (detalle) detalle.textContent = estadoMemoria.detalle;
    const url = document.getElementById('nube-url');
    const anon = document.getElementById('nube-anon');
    const tabla = document.getElementById('nube-tabla');
    const auto = document.getElementById('nube-auto');
    if (url && !document.activeElement?.closest?.('#form-nube')) {
      const cfg = leerConfig();
      if (!url.value) url.value = cfg.url || '';
      if (anon && !anon.value) anon.value = cfg.anon || '';
      if (tabla && !tabla.value) tabla.value = cfg.tabla || TABLA_DEFECTO;
      if (auto) auto.checked = cfg.auto;
    }
  };

  const conectarFormulario = () => {
    const form = document.getElementById('form-nube');
    if (!form) return;
    const cfg = leerConfig();
    const url = document.getElementById('nube-url');
    const anon = document.getElementById('nube-anon');
    const tabla = document.getElementById('nube-tabla');
    const auto = document.getElementById('nube-auto');
    if (url) url.value = cfg.url || '';
    if (anon) anon.value = cfg.anon || '';
    if (tabla) tabla.value = cfg.tabla || TABLA_DEFECTO;
    if (auto) auto.checked = cfg.auto;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      guardarConfig({
        url: url ? url.value : '',
        anon: anon ? anon.value : '',
        tabla: tabla ? tabla.value : TABLA_DEFECTO,
        auto: auto ? auto.checked : true,
      });
      if (!configurado()) {
        fijarEstado('local', 'Revisa la URL (https://…) y la API key.');
        return;
      }
      fijarEstado('subiendo', 'Probando conexión…');
      const ok = await push();
      if (ok) await pull();
      else fijarEstado('error', 'No se pudo conectar. Revisa URL, key y la tabla tienda_datos.');
    });

    const btnSinc = document.getElementById('nube-sincronizar');
    if (btnSinc) btnSinc.addEventListener('click', async () => {
      if (!configurado()) {
        fijarEstado('local', 'Primero guarda tu URL y API key.');
        return;
      }
      fijarEstado('subiendo', 'Sincronizando…');
      await sincronizar();
    });

    const btnBajar = document.getElementById('nube-bajar');
    if (btnBajar) btnBajar.addEventListener('click', async () => {
      if (!configurado()) return;
      fijarEstado('subiendo', 'Bajando de la nube…');
      const n = await pull();
      fijarEstado('nube', n ? `Se trajeron ${n} datos de la nube.` : 'La nube no tenía nada nuevo.');
      try { window.location.reload(); } catch { /* nada */ }
    });

    const btnOff = document.getElementById('nube-desconectar');
    if (btnOff) btnOff.addEventListener('click', () => {
      if (!window.confirm('¿Desconectar la nube? Tus datos locales no se borran.')) return;
      try { localStorage.removeItem(CLAVE_CONFIG); } catch { /* nada */ }
      fijarEstado('local', 'Solo en este navegador');
      pintarEstado();
    });

    if (auto) auto.addEventListener('change', () => {
      guardarConfig({ auto: auto.checked });
      fijarEstado(auto.checked ? 'nube' : 'pausado', auto.checked ? 'Guardado automático activado.' : 'Guardado automático apagado.');
      if (auto.checked) programarPush(1000);
    });
  };

  /* ---------- Arranque ---------- */
  parcharStorage();

  /* Cada evento del sitio (cuenta, pedido, registro, carrito)
     dispara un guardado. */
  ['pa:cuenta', 'pa:pedido', 'pa:registro', 'pa:carrito', 'pa:contenido', 'pa:nuevo-pedido'].forEach((ev) => {
    window.addEventListener(ev, () => programarPush(2000));
  });
  window.addEventListener('online', () => {
    if (estadoMemoria.sucio || configurado()) {
      programarPush(1000);
      pull();
    }
  });
  /* Otra pestaña cambió algo: también se sube. */
  window.addEventListener('storage', (e) => {
    if (e && e.key && CLAVES_SINC.includes(e.key)) programarPush(2500);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      conectarFormulario();
      pintarEstado();
      if (configurado() && leerConfig().auto) {
        pull().then(() => programarPush(4000));
        fijarEstado('subiendo', 'Conectando con la nube…');
      } else {
        pintarEstado();
      }
    });
  } else {
    conectarFormulario();
    pintarEstado();
    if (configurado() && leerConfig().auto) pull();
  }

  /* Respaldo cada 60 s por si algo escribió sin pasar por setItem. */
  setInterval(() => {
    if (configurado() && leerConfig().auto && estadoMemoria.sucio && !estadoMemoria.ocupado) push();
  }, 60000);

  window.PANube = {
    CLAVE_CONFIG,
    CLAVES_SINC,
    TABLA_DEFECTO,
    leerConfig,
    guardarConfig,
    configurado,
    push,
    pull,
    sincronizar,
    programarPush,
    estado: () => ({ ...estadoMemoria }),
  };
})();
