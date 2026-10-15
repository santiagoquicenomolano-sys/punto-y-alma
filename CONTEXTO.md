# Punto & Alma — Hoja de contexto

> Documento de referencia del proyecto. Sirve para retomar el trabajo sin releer todo el código.
> Última actualización: **9 de octubre de 2026**.

---

## 1. Qué es

Tienda de **crochet artesanal colombiano** (Manizales). Sitio estático: HTML, CSS y JavaScript sin
frameworks, sin build y sin servidor. Todo lo que la clienta hace (carrito, pedidos, publicaciones,
cuentas) vive en el `localStorage` de su navegador.

Lo que la artesana puede hacer desde el **panel de ventas**: ver cuántos productos se vendieron, saber
quién subió cada creación y cada mensaje del foro, administrar el catálogo, moderar contenido y
configurar el asistente Alma.

Desde el 9 de octubre el panel también trae tres secciones nuevas: **bitácora automática de
registros** (cada cuenta, suscripción al boletín y pedido se anotan solos), **contenido del sitio**
(textos de la portada, secciones visibles y carrusel del hero) y **boletín y clientas** (suscriptores
cruzados con cuentas y compras). La imagen junto al titular de la portada es ahora un **carrusel que
pasa los 11 productos uno por uno**, configurable desde el panel.

---

## 2. Cómo levantarlo y probarlo

```powershell
cd "C:\Users\ELECTRONICA6\Desktop\mi primer pagina\tienda-crochet"
python -m http.server 8765 --bind 127.0.0.1
Start-Process "http://127.0.0.1:8765/index.html"
```

- Node v24.21.0 disponible para las comprobaciones (no se necesita para servir el sitio).
- El servidor local muere con la sesión de terminal.
- **El navegador integrado de OpenCode suele estar desconectado** (`[browser.disconnected]`): para abrir
  la página se usa `Start-Process` con el navegador del sistema.

### Rutas útiles

| Ruta | Para qué |
|---|---|
| `index.html` | Tienda (portada, categorías, productos, FAQ, historia) |
| `producto.html?id=<id>` | Ficha de un producto; el SEO se reescribe en vivo |
| `perfil.html` | Perfil, creaciones y foro (exige sesión) |
| `acceso.html` | Entrar o crear cuenta |
| `admin.html` | Panel de ventas (exige cuenta de administración) |
| `ayuda.html` | Centro de ayuda generado desde las guías de Alma |
| `privacidad.html` · `terminos.html` · `cookies.html` | Legal |
| `404.html` · `offline.html` | Utilidad |

---

## 3. Datos del negocio

- **Dominio canónico:** `https://puntoyalma.co/` (usado en canonical, OG, sitemap y CSP).
- **Contacto:** WhatsApp / teléfono `313 638 4065` · `santiagoquicenomolano@gmail.com` · Manizales, Colombia.
- **Pagos:** Nequi, Daviplata, Bancolombia, Visa/Mastercard, contra entrega.
- **Envío:** 24–72 h, gratis desde $150.000. **Devoluciones:** 15 días.

---

## 4. Estructura de archivos

### Páginas
`index.html` · `producto.html` · `perfil.html` · `admin.html` · `ayuda.html` · `acceso.html` ·
`privacidad.html` · `terminos.html` · `cookies.html` · `404.html` · `offline.html`

### Scripts (`scripts/`)
| Archivo | Responsabilidad |
|---|---|
| `auth.js` | **Cuentas y sesión.** Se carga **sin `defer` en el `<head>`** para que los guardas en línea puedan correr de forma síncrona |
| `sitio.js` | Comportamiento común: saltar al contenido, volver arriba, aviso de datos, registrar el service worker |
| `comun.js` | Utilidades compartidas: `esc`, `precio`, tarjetas de producto, favoritos, vistos, avisos |
| `catalogo.js` | Catálogo base + ediciones del panel (`localStorage`) |
| `contenido.js` | **Textos, secciones visibles y carrusel del hero** (`pa_contenido`) |
| `registro.js` | **Bitácora automática**: cuentas, boletín y pedidos se anotan solos (`pa_registros`) |
| `db.js` | **Nube Supabase**: enlaza las 8 claves `pa_*` a la tabla `tienda_datos`, guardado automático (ver `supabase.sql`) |
| `carrito.js` | Carrito lateral y creación de pedidos |
| `ia.js` | Motor de Alma: catálogo, referencias de estilo, guías y conexión opcional a una IA real |
| `asistente.js` | Ventana de chat y cuestionario de preferencias |
| `app.js` | Portada: buscador, filtros, orden, favoritos, cuenta regresiva |
| `producto.js` | Ficha del producto + SEO dinámico + relacionados |
| `perfil.js` | Perfil, creaciones y foro por cuenta |
| `admin.js` | Panel: ventas, pedidos, catálogo, moderación, comunidad, asistente |
| `ayuda.js` | Arma `ayuda.html` a partir de `PAIA.GUIAS` |
| `acceso.js` | Página de acceso (pestañas, primer admin, destino) |

### Estilos (`estilos/`)
`style.css` (sistema de diseño + cabecera + carrito inyectado + UX) · `texturas.css` · `tienda.css` ·
`carrusel.css` (**carrusel del hero**: marco, diapositivas, ficha, barra de progreso, puntos, flechas) ·
`producto.css` · `perfil.css` · `admin.css` · `ayuda.css` · `acceso.css` · `legal.css` · `asistente.css`

### Infraestructura
`sw.js` · `sitemap.xml` · `robots.txt` · `_headers` (Netlify/Cloudflare) · `.htaccess` (Apache) ·
`humans.txt` · `.well-known/security.txt` · `sitio.webmanifest`

### Recursos
`recursos/favicon.svg` · `recursos/img/` (14 fotos + iconos PNG generados)

---

## 5. Modelo de datos (todo en `localStorage`)

| Clave | Contenido |
|---|---|
| `pa_usuarios` | `[{ id, nombre, email, clave, rol: 'cliente'\|'admin', foto, tipo, creado }]` |
| `pa_sesion` | `{ usuarioId, desde, recordar }` — en `localStorage` si "recordarme", en `sessionStorage` si no |
| `pa_carrito` | Ítems del carrito |
| `pa_pedidos` | Pedidos; cada ítem lleva `cantidad` (base del cálculo de unidades vendidas) |
| `pa_creaciones` | `{ id, autorId, autor, titulo, imagen, descripcion, tipo, fecha, aprobada? }` |
| `pa_foro` | `{ id, autorId, autor, foto, texto, fecha, meGusta, aprobada? }` |
| `pa_favoritos` · `pa_vistos` | Ids de productos |
| `pa_preferencias` · `ia_historial` | Gustos de Alma y conversación |
| `pa_catalogo_overrides` | Ediciones del catálogo hechas en el panel |
| `pa_registros` | **Bitácora** `[{ id, tipo: 'cuenta'|'boletin'|'pedido', fecha, nombre, correo, detalle, donde }]` (máx. 600; sin contraseñas) |
| `pa_contenido` | **Contenido del sitio** `{ textos: {clave: valor}, secciones: {id: bool}, hero: {activo, autoplay, ms, orden, excluir, mostrarNombre, mostrarPrecio} }` |
| `pa_ia` | Configuración de la IA remota |
| `pa_nube` | **Nube**: `{ proveedor, url, anon, tabla, auto, ultimoPush, ultimoPull }` (la key anon vive solo en este navegador) |
| `pa_nube_meta` | **Nube**: `{ clave: actualizado }` para no pisar lo nuevo al mezclar |
| `pa_boletin` | Suscripción al boletín: ahora `[{ correo, fecha }]` (**tolera la lista plana de strings de la versión anterior**) |
| `pa_aviso_datos` | Si ya se cerró el aviso de datos |
| `pa_perfil` | **Legacy.** Se migra a la cuenta al entrar al perfil; ya no se escribe |

`autorId` es la clave que permite al panel saber **quién subió cada creación y cada mensaje**.

---

## 6. Cuentas y sesión — `window.PAAuth`

API: `registrar`, `entrar`, `salir`, `actual`, `esAdmin`, `puedeAdmin`, `hayAdmin`, `listar`, `porId`,
`porEmail`, `actualizar`, `promover`, `quitar`, `firmar`, `protegerAdmin`, `requiereSesion`,
`pintarCabecera`.

- **El primer ingreso al panel crea la cuenta de administración.** No hay admin predefinido.
- `protegerAdmin()` redirige a `acceso.html?modo=crear-admin` si no existe admin, o `?modo=admin` si existe.
- Contraseñas con **hash con sal** (`firmar`). **No es criptografía real** — es demostración.
- Cualquier enlace con `data-salir` cierra sesión (delegación global en `document`).
- Evento `pa:sesion` para reaccionar a cambios de sesión.
- Tras abrir sesión, `pintarCabecera()` reemplaza `.acciones a.usuario` por el widget de cuenta.
  **Ojo:** el botón de favoritos en `index.html` también usa la clase `usuario`, por eso el selector
  es `a.usuario` y no `.usuario`.

---

## 7. Módulos expuestos en `window`

| Módulo | API principal |
|---|---|
| `PAComun` | `esc`, `precio`, `normalizar`, `estrellasHTML`, `descuentoDe`, `tarjetaProductoHTML`, `esFavorito`, `alternarFav`, `registrarVisto`, `vistos`, `aviso`, `pintarBadge`, `agregarAlCarrito`, `boletin`, `suscribirBoletin` |
| `PACatalogo` | `obtener`, `base`, `buscarProducto`, `formatearPrecio`, `agregarProducto`, `actualizarProducto`, `eliminarProducto`, `restaurarCatalogo`, `leerOverrides`, `guardarOverrides`, `catalogoEditado` |
| `PARegistro` | **Bitácora**: `TIPOS`, `anotar`, `listar`, `quitar`, `vaciar`, `resumen`, `boletin`, `suscribir`, `quitarBoletin`. Escucha `pa:cuenta` y `pa:pedido` |
| `PANube` | **Nube Supabase**: `leerConfig`, `guardarConfig`, `configurado`, `push`, `pull`, `sincronizar`, `programarPush`, `estado`. Envuelve `localStorage.setItem` para subir solo cada cambio en `pa_*`; eventos `pa:nube` y `pa:nube-bajada` |
| `PAContenido` | **Contenido**: `CAMPOS` (15 textos con su `original`), `SECCIONES` (11), `ORDENES`, `leer`, `hero`, `guardar`, `restaurar`, `cambios`, `aplicar`. Los textos editables llevan `data-texto`, las secciones apagables `data-seccion` |
| `PACarrito` | `contar`, `leerPedidos`, `guardarPedidos`, y el resto del flujo de compra |
| `PAIA` | `saludar`, `responder`, `guiasPorGrupo`, `guiaPorId`, `listaGuias`, `renderPasos`, `renderProductos`, `referencias`, `leerPrefs`, `guardarPrefs`, `borrarPrefs`, `recomendar`, `buscarProductos`, `referenciasDe`, `leerConfigIA`, `guardarConfigIA`, `consultarRemoto` |
| `PAAuth` | Ver sección 6 |
| `PAAcceso` | `mostrarPanel`, `rolCrear` (solo en `acceso.html`) |
| `PAFC` | **Extensión sin usar.** `app.js` la consulta de forma defensiva; nadie la define |

### Motor de Alma
- Sin clave: motor local por reglas sobre `PAIA.GUIAS` y el catálogo. **Nunca se queda sin asistente.**
- Con clave: `consultarRemoto()` llama a cualquier endpoint compatible con `/chat/completions`
  (se configura en el panel).requiere `connect-src https:` en la CSP.
- Las guías viven en `PAIA.GUIAS` y son **la única fuente de verdad**: las usa el chat **y** `ayuda.html`.
  El `id` de cada guía se convierte en el ancla `#id`.
- Enrutado por `palabrasGuia`: **el orden de las claves importa** (gana la primera que coincide).
- `recomendar(prefs)` devuelve `[]` sin preferencias, y `responder` manda al cuestionario: es intencional.

---

## 8. Sistema de diseño

Variables en `:root` de `estilos/style.css`:

```
--terracota #e0785a   --terracota-osc #c65a3c   --terracota-claro #f4a98e
--salvia     #7fa388   --salvia-osc     #5c7f66
--azul       #3d405b   --miel           #f2cc8f
--crema      #faf6ef   --marfil         #fffdfa   --tinta #342e2a
--gris       #7d7368   --linea          #eadfce
--radio 18px  --sombra  --sombra-fuerte  --suave  --duracion 0.35s
```

- **Tipografías:** Fraunces (títulos) + Nunito (texto) desde Google Fonts; iconos Font Awesome 6.5.2 (cdnjs).
- Animaciones de entrada con la clase `.reveal` + `IntersectionObserver`.
- Ya existe un bloque `prefers-reduced-motion` en `style.css` (línea ~1055): no duplicarlo.

---

## 9. SEO e infraestructura

- **Canonical, Open Graph y Twitter Card completos en las 9 páginas principales** (`og:image` siempre
  **absoluta**). `404.html` y `offline.html` son pantallas de utilidad: solo llevan `noindex`.
- `robots`: `index, follow, max-image-preview:large` en las públicas; `noindex, nofollow` en
  `perfil.html`, `admin.html` y `acceso.html`.
- **JSON-LD:** `Store`, `WebSite`, `Organization`, `FAQPage`, `BreadcrumbList` en `index.html`;
  `WebPage` en ayuda y legales; `Product` (con `sku`, `brand`, `offers`, `aggregateRating`) inyectado
  por `producto.js`.
- **SEO dinámico:** `producto.js` reescribe `document.title`, description, canonical y OG según el
  producto abierto, para que cada ficha sea indexable por su nombre.
- `sitemap.xml` incluye las 11 fichas de producto. Al agregar una página pública, actualiza el sitemap.
- **Service worker:** al publicar cambios sube `CACHE` en `sw.js` a `punto-alma-v3`, `v4`… si no, la
  gente seguirá viendo la versión vieja.
- Cabeceras de seguridad en `_headers` y `.htaccess`. La CSP es **permisiva a propósito**:
  `unsafe-inline` (hay scripts y estilos en línea) y `connect-src https:` (IA remota configurable).

---

## 10. Seguridad y privacidad (decisiones tomadas)

- **Sin analítica ni cookies de rastreo**, por decisión del dueño. Por eso el aviso de datos es
  **informativo y se cierra con un clic**, no un banner de consentimiento bloqueante.
- Autenticación **solo del lado del cliente**: es demostración. Para producción hace falta servidor.
- `?redir=` en `acceso.html` **solo acepta nombres de página internos** (evita redirección abierta).
- Las cuentas no se borran solas al cerrar sesión, pero la contraseña se guarda hasheada.

---

## 11. Convenciones de código

- **Acentos sí** en HTML, CSS y textos visibles de JS.
- **Claves de datos sin acentos**: `categoria`, `direccion`, `autorId`, `titulo`, `descripcion`.
- `scripts/ia.js` mantiene su estilo **sin tildes** por tradición del archivo. Si lo cambias, revisa
  todo el archivo de una vez.
- Español de Colombia, tono cercano. Comentarios y documentación en español.
- No hay control de versiones (no es repositorio git): todo el trabajo es local y sin commits.

### ⚠️ Riesgo de mojibake
Al escribir texto con tildes por herramientas, `admin.html` ya se corrompió una vez (UTF-8 doble
codificado vía CP1252). **Siempre escanea después de escribir acentos.**

---

## 12. Verificación

Herramientas en `C:\Users\ELECTRONICA6\AppData\Local\Temp\opencode\`:

```powershell
$temp = "C:\Users\ELECTRONICA6\AppData\Local\Temp\opencode"

# 1. Sintaxis de todos los scripts
Get-ChildItem scripts\*.js, sw.js | ForEach-Object { node --check $_.FullName }

# 2. Codificación (mojibake y U+FFFD) en 42 archivos
node "$temp\scan-todo.js" "."

# 3. IDs, anclas, enlaces, JSON-LD, metadatos SEO y enlaces legales
node "$temp\auditar.js" "."

# 4. Los 45 recursos responden 200
node "$temp\smoke.js"

# 5. Suites funcionales
node "$temp\probar-auth.js" "scripts\auth.js"   # cuentas y sesión (27 pruebas)
node "$temp\probar-ia.js"  "."                  # motor de Alma (22 pruebas)
node "$temp\probar-sitio.js" "."                # UX compartida (14 pruebas)

# Utilidades
node "$temp\extracto.js" "scripts\ia.js" "id: 'cuentas'" "];"   # volcar una región
node "$temp\gen-iconos.js" "recursos\img"                        # regenerar iconos PWA
node "$temp\desmojibake2.js"                                     # reparar mojibake a nivel de bytes
```

**Estado actual: todo en verde** — 0 fallos de sintaxis, 0 problemas de codificación, 247 IDs sin
faltantes, 0 enlaces ni anclas rotas, 0 JSON-LD inválidos, recursos nuevos respondiendo 200 y las 3 suites
funcionales pasando, más **86 pruebas nuevas** (`probar-nuevo.js` en Temp con jsdom: carrusel del hero,
bitácora automática, configuración del panel y las 3 secciones del admin).

**Ojo al editar el carrusel o el panel:** `app.js` rearma el temporizador en cada avance (si no, el
carrusel se detiene tras el primer paso) y el botón de pausa debe existir antes de usarlo; en
`admin.js` los identificadores no llevan tildes aunque el texto visible sí (`compro`, no `compró`).

---

## 13. Pendientes y limitaciones conocidas

**Lo que falta hacer (requiere datos del dueño):**
1. Llenar los marcadores `[NOMBRE COMPLETO]`, `[NIT]`, `[DIRECCIÓN]`, `[CORREO]`, `[TELÉFONO]` en
   `privacidad.html` y `terminos.html`.
2. Activar HTTPS antes de que HSTS entre en vigor.
3. Confirmar la CSP en el hosting real antes de publicar.
4. **Conectar la nube Supabase** (código listo, URL prellenada en `scripts/db.js`):
   correr `supabase.sql` en el SQL Editor, pegar la `anon` key en `admin.html` → Nube
   → Conectar y guardar → Sincronizar ahora.

**Pendientes técnicos opcionales:**
4. Imagen social dedicada de 1200×630 (ahora se usa `producto-bolso.jpg`, 960×640).
5. `og-image` por sección si se quiere mejorar el compartilhado.
6. Paginación real en el catálogo (hoy se renderizan todos los productos).

**Limitaciones conocidas:**
- Cuentas y pedidos viven en el navegador: no hay sincronización entre equipos.
- `producto.html` es una plantilla; para SEO ideal cada producto debería tener su propio HTML.
- El hash de contraseñas no es criptografía real.
- Los enlaces sociales de Instagram, TikTok y Facebook están en `#` (pendientes de las URLs reales).

---

## 14. Nota de arquitectura

El orden de los `<script>` importa:

1. `scripts/auth.js` — **en el `<head>`, sin `defer`**, seguido del guarda en línea de `perfil.html`
   y `admin.html`. Así no se alcanza a ver la página protegida antes de redirigir.
2. Al final del `<body>`, los demás scripts **con `defer`** (se mantiene el orden de ejecución):
   `sitio.js` → `catalogo.js` → `contenido.js` → `db.js` → `comun.js` → `registro.js` → `carrito.js` → `ia.js` →
   `asistente.js` → el de la página. `contenido.js` va antes que `comun.js` para que los textos se
   apliquen primero; `registro.js` va antes que `carrito.js` para alcanzar el evento `pa:pedido`.
   `db.js` va justo después de `contenido.js` para envolver `localStorage.setItem` antes de que
   `comun.js`, `registro.js` y `carrito.js` escriban, y así cada guardado se sube solo a Supabase.

`ayuda.html` sí tiene su propio `<main id="contenido">`, pero sus anclas de guía las genera `ayuda.js`
con el `id` de cada guía: por eso existen `#envios`, `#cuentas`, `#faq`… sin estar en el HTML estático.
