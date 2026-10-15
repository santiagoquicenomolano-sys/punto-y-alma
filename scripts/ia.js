/* ============================================================
   PUNTO & ALMA · Asistente de IA "Alma"
   Motor local: entiende lo que escribes, busca productos, propone
   referencias de estilo y entrega guías paso a paso.

   También puede conectarse a una IA real (cualquier endpoint
   compatible con /chat/completions). Se configura desde el panel
   de ventas; mientras no haya clave, funciona este motor local,
   así que la tienda nunca se queda sin asistente.
   ============================================================ */
(() => {
  const C = window.PAComun;
  const api = () => window.PACatalogo;
  const esc = (s) => C.esc(s);
  const precio = (n) => C.precio(n);
  const norm = (s) => C.normalizar(s);

  /* ============================================================
     1. REFERENCIAS DE ESTILO
     Lo que la clienta dice que le gusta, traducido a piezas reales.
     ============================================================ */
  const REFERENCIAS = [
    {
      id: 'pastel',
      titulo: 'Paleta pastel',
      claves: ['pastel', 'suave', 'delicado', 'tono', 'claro', 'rosa', 'azul', 'bebe', 'infantil'],
      descripcion: 'Tonos suaves y limpios: funciona perfecto para bebes y piezas de estimulacion.',
      paleta: ['#f6d7d0', '#fbe3c8', '#d8e8e0', '#cfe0f2', '#efe3f5'],
      Consejo: 'Combina un pastel como base y un tono un poco más saturado en los detalles.',
      prefiere: (p) => /pulpo|oso|conejo|posavasos|pack|kit/.test(p.id),
    },
    {
      id: 'calido',
      titulo: 'Calidez de hogar',
      claves: ['cobija', 'casa', 'hogar', 'calido', 'calidez', 'cojin', 'manta', 'invierno', 'frio'],
      descripcion: 'Texturas que invitan a quedarse: lana gruesa, puntos grandes y colores tierra.',
      paleta: ['#c65a3c', '#e0785a', '#f2cc8f', '#7fa388', '#8a6b52'],
      consejo: 'Un punto doble y tres tonos calidos dan una pieza que se siente hecha en casa.',
      prefiere: (p) => /cobija|bufanda|posavasos|bolso/.test(p.id),
    },
    {
      id: 'minimalista',
      titulo: 'Minimalista moderno',
      claves: ['minimalista', 'moderno', 'sobrio', 'elegante', 'neutro', 'sencillo', 'limpio'],
      descripcion: 'Formas limpias y colores neutros. Pocas puntadas, mucha intencion.',
      paleta: ['#faf6ef', '#e8e1d6', '#c9c2b6', '#3d405b', '#7d7368'],
      consejo: 'Un solo color de base y un punto consistente valen mas que cinco colores.',
      prefiere: (p) => /bolso|bufanda|posavasos|patron/.test(p.id),
    },
    {
      id: 'vintage',
      titulo: 'Vintage nostálgico',
      claves: ['vintage', 'clasico', 'retro', 'nostalgia', 'abuela', 'tradicion', 'old'],
      descripcion: 'Grandes squares, tonos apagados y la sensacion de un regazo de abuela.',
      paleta: ['#d9c7a7', '#a98467', '#8c6f5a', '#6d7f6a', '#b5651d'],
      consejo: 'El granny square grande y bicolor es el punto de partida mas facil.',
      prefiere: (p) => /cobija|patron|pack|bufanda/.test(p.id),
    },
    {
      id: 'expresivo',
      titulo: 'Expresivo y divertido',
      claves: ['divertido', 'gracioso', 'cute', 'alegre', 'colorido', 'llamativo', 'halloween', 'malo'],
      descripcion: 'Personalidad al 100%: amnesty eyes, detalles sorpresa y mucho humor.',
      paleta: ['#e0785a', '#3d405b', '#7fa388', '#f2cc8f', '#1b1b1b'],
      consejo: 'Un detalle bordado en contraste (ojos, lazo, boton) define toda la pieza.',
      prefiere: (p) => /pulpo|oso|conejo|gato/.test(p.id),
    },
    {
      id: 'regalo',
      titulo: 'Regalo que emociona',
      claves: ['regalo', 'regalar', 'obsequio', 'cumpleanos', 'aniversario', 'dia de la madre', 'navidad', 'boda'],
      descripcion: 'Piezas que se pueden envolver y entregar sin pensarlo dos veces.',
      paleta: ['#c65a3c', '#f2cc8f', '#7fa388', '#faf6ef', '#8a6b52'],
      consejo: 'Anade tarjeta personalizada y empaque artistico: es lo que hace el cierre.',
      prefiere: (p) => (p.precio || 0) >= 75000,
    },
  ];

  const ESTILOS_TEXTO = [
    { etiqueta: 'Amigurumis', claves: ['amigurumi', 'muneco', 'peluche', 'sonajero', 'juguete', 'bebe', 'nino'] },
    { etiqueta: 'Cobijas y Hogar', claves: ['cobija', 'manta', 'hogar', 'casa', 'cojin', 'posavasos', 'decoracion'] },
    { etiqueta: 'Bolsos y Accesorios', claves: ['bolso', 'cartera', 'bufanda', 'accesorio', 'bolso de viaje', 'moda'] },
    { etiqueta: 'Patrones y Kits', claves: ['patron', 'pdf', 'tutorial', 'aprender', 'ensenar', 'curso', 'kit', 'principiante'] },
  ];

  const PRESUPUESTOS = [
    { id: 'economico', etiqueta: 'Hasta $60.000', min: 0, max: 60000 },
    { id: 'medio', etiqueta: '$60.000 – $120.000', min: 60000, max: 120000 },
    { id: 'alto', etiqueta: 'Mas de $120.000', min: 120000, max: Infinity },
  ];

  /* ============================================================
     2. GUÍAS
     ============================================================ */
  const GUIAS = [
    {
      id: 'que-es',
      titulo: 'Que es Punto & Alma',
      icono: 'fa-store',
      para: 'cliente',
      resumen: 'Un vistazo a como esta construida la tienda.',
      pasos: [
        { titulo: 'Todo es artesanal', texto: 'Cada pieza se teje a mano en Manizales. No hay dos iguales, por eso algunas tienen pocas unidades.' },
        { titulo: 'Hay piezas y descargas', texto: 'Los productos "fisicos" te llegan a la direccion que dejas. Los "digitales" (patrones y kits) se descargan al instante tras el pago.' },
        { titulo: 'El carrito es real', texto: 'Lo que agregas se guarda en tu navegador. Al finalizar el pedido queda registrado en el panel de ventas.' },
        { titulo: 'Hay una comunidad', texto: 'En tu perfil puedes publicar tus creaciones y participar en el foro con otras tejedoras.' },
      ],
      tips: ['Si borras los datos del navegador, se borran tambien tu carrito y tus publicaciones.'],
    },
    {
      id: 'comprar',
      titulo: 'Como comprar paso a paso',
      icono: 'fa-cart-shopping',
      para: 'cliente',
      resumen: 'Agregar, revisar y confirmar un pedido.',
      pasos: [
        { titulo: 'Agrega al carrito', texto: 'Pulsa "Anadir" en cualquier tarjeta o entra a la ficha y elige la cantidad (hasta 10).', enlace: 'index.html#productos', etiqueta: 'Ir a la tienda' },
        { titulo: 'Abre el carrito', texto: 'Toca el icono del carrito en la barra superior para revisar tu pedido.' },
        { titulo: 'Ajusta cantidades', texto: 'Usa los botones + y - de cada linea, o quita el producto con la papelera.' },
        { titulo: 'Finaliza el pedido', texto: 'Escribe tu nombre, tu telefono y tu direccion (o "recojo en Manizales"), luego pulsa "Finalizar pedido".', enlace: 'carrito-abierto', etiqueta: 'Abrir mi carrito' },
        { titulo: 'Te contactamos', texto: 'Recibimos el pedido y te escribimos por WhatsApp para confirmar el pago y el envio.' },
      ],
      tips: ['Envio gratis en pedidos desde $150.000.', 'Guarda el numero 313 638 4065 por si necesitas cambiar la direccion.'],
    },
    {
      id: 'pagar',
      titulo: 'Formas de pago',
      icono: 'fa-money-bill-transfer',
      para: 'cliente',
      resumen: 'Como puedes pagar tu pedido.',
      pasos: [
        { titulo: 'Nequi o Daviplata', texto: 'Transfiere al 313 638 4065 y manda el comprobante por WhatsApp.' },
        { titulo: 'Transferencia bancaria', texto: 'Bancolombia. Te compartimos los datos cuando confirmamos el pedido.' },
        { titulo: 'Tarjeta', texto: 'Visa o Mastercard. Te enviamos el enlace de pago seguro.' },
        { titulo: 'Contra entrega', texto: 'Disponible en Manizales y municipios cercanos.' },
      ],
      tips: ['Los patrones digitales se entregan apenas se confirma el pago.'],
    },
    {
      id: 'envios',
      titulo: 'Envios y tiempos',
      icono: 'fa-truck-fast',
      para: 'cliente',
      resumen: 'Cuando llega tu pedido.',
      pasos: [
        { titulo: 'Se despacha en 24-72 horas', texto: 'Tus piezas se empacan y reciben numero de guia.' },
        { titulo: 'Llega a todo Colombia', texto: 'Envio gratis desde $150.000. Para compras menores te cotizamos el valor.' },
        { titulo: 'Te avisamos por WhatsApp', texto: 'En cuanto salga tu pedido te mandamos el numero de seguimiento.' },
      ],
      tips: ['Las piezas digitales no se envian: te llegan al correo en minutos.'],
    },
    {
      id: 'devoluciones',
      titulo: 'Devoluciones y cambios',
      icono: 'fa-rotate-left',
      para: 'cliente',
      resumen: 'Cambios, devoluciones y garantia.',
      pasos: [
        { titulo: 'Tienes 15 dias', texto: 'Desde que recibes el pedido puedes solicitar cambio o devolucion.' },
        { titulo: 'La pieza debe estar intacta', texto: 'Sin uso, con su etiqueta y en su empaque original.' },
        { titulo: 'Escribenos', texto: 'Mandanos foto por WhatsApp al 313 638 4065 y lo resolvemos.' },
        { titulo: 'Errores de tejido', texto: 'Si una pieza llega con un fallo de tejido, te la cambiamos o te devolvemos el dinero. Sin discusion.' },
      ],
      tips: ['Los productos digitales no admiten devolucion por trata de ser archivos descargables.'],
    },
    {
      id: 'cuidados',
      titulo: 'Cuidado de tus piezas',
      icono: 'fa-soap',
      para: 'cliente',
      resumen: 'Para que tus piezas duren muchos años.',
      pasos: [
        { titulo: 'Lava a mano', texto: 'Agua fria y jabon suave. Nunca en la lavadora salvo que la ficha lo indique.' },
        { titulo: 'Seca a la sombra', texto: 'El sol directo apaga los colores y deforma la lana.' },
        { titulo: 'No lo retuerzas', texto: 'Presiona con una toalla y secala en plano.' },
        { titulo: 'Guardalo con cuidado', texto: 'En una bolsa de tela o una caja para que no se deforme ni se manche.' },
      ],
      tips: ['Cada ficha de producto trae el cuidado especifico de esa pieza.'],
    },
    {
      id: 'patrones',
      titulo: 'Como usar un patron',
      icono: 'fa-book-open',
      para: 'cliente',
      resumen: 'Primeros pasos con un patron PDF.',
      pasos: [
        { titulo: 'Descargalo', texto: 'Lo recibes en tu correo apenas se confirma el pago, con acceso ilimitado.' },
        { titulo: 'Imprimelo o miralo en pantalla', texto: 'Los patrones vienen en PDF ilustrado. Ideal en tablet o computador.' },
        { titulo: 'Reune los materiales', texto: 'La primera pagina indica el ovillo y el numero de gancho que necesitas.' },
        { titulo: 'Sigue las fotos', texto: 'Cada vuelta tiene foto. Si te pierdes, vuelve a la vuelta anterior.' },
        { titulo: 'Pide ayuda', texto: 'Los patrones incluyen asesoria por WhatsApp. No te quedes trabada.' },
      ],
      tips: ['Practica primero con ovillos sobrantes antes de usar tu lana buena.'],
    },
    /* ---------- Contenido del usuario ---------- */
    {
      id: 'subir-creacion',
      titulo: 'Subir una creacion',
      icono: 'fa-cloud-arrow-up',
      para: 'cliente',
      resumen: 'Publicar tu pieza en tu perfil.',
      pasos: [
        { titulo: 'Abre tu perfil', texto: 'Pulsa tu icono de usuario arriba a la derecha, o entra directo a la pagina de perfil.', enlace: 'perfil.html#creaciones', etiqueta: 'Ir a mi perfil' },
        { titulo: 'Sube la foto', texto: 'Haz clic en el recuadro punteado con la nube y elige una imagen de tu telefono o computador. Se reescala sola para no ocupar espacio de mas.' },
        { titulo: 'Ponle titulo', texto: 'Escribe algo corto y bonito: "Mi primera cobija", "Conejo para mi tia"...' },
        { titulo: 'Cuenta la historia', texto: 'La descripcion es opcional: que es, para quien es, cuanto te tardo. Eso es lo mas bonito de leer.' },
        { titulo: 'Elige la categoria', texto: 'Amigurumis, Cobijas y Hogar, Moda y Accesorios, Patrones y Kits, o Todo tipo de crochet.' },
        { titulo: 'Publica', texto: 'Pulsa "Publicar creacion". Aparece al instante en tu vitrina y en tu perfil.' },
      ],
      tips: ['Una foto con buena luz natural hace magia: no uses flash.', 'La imagen se guarda en tu navegador, asi que no se pierde mientras no limpies datos del sitio.'],
    },
    {
      id: 'editar-creacion',
      titulo: 'Editar o borrar una creacion',
      icono: 'fa-pen',
      para: 'cliente',
      resumen: 'Corregir o quitar una publicacion tuya.',
      pasos: [
        { titulo: 'Busca la creacion', texto: 'Abre tu perfil y baja a "Mis creaciones".' },
        { titulo: 'Borrarla', texto: 'Pulsa la papelera de la esquina de la tarjeta. Se elimina de inmediato, sin confirmacion.' },
        { titulo: 'Editarla', texto: 'Borrala y vuelve a subirla con los datos corregidos: es la forma mas rapida hoy.' },
        { titulo: 'Quitar una foto', texto: 'Si no le pones foto, la creacion se muestra con un corazon de placeholder.' },
      ],
      tips: ['La papelera es definitiva. Si solo quieres cambiar el texto, conviene borrar y republicar.'],
    },
    {
      id: 'foro',
      titulo: 'Publicar en el foro',
      icono: 'fa-comments',
      para: 'cliente',
      resumen: 'Compartir ideas y opiniones con la comunidad.',
      pasos: [
        { titulo: 'Baja a la seccion Foro', texto: 'Esta al final de tu pagina de perfil.', enlace: 'perfil.html#foro', etiqueta: 'Ir al foro' },
        { titulo: 'Escribe tu mensaje', texto: 'Pide un consejo, comparte un avance o da tu opinion sobre una pieza.' },
        { titulo: 'Publica', texto: 'Pulsa "Publicar". Aparece arriba de la lista con tu nombre y tu foto.' },
        { titulo: 'Da me encanta', texto: 'El corazon marca tus publicaciones favoritas.' },
      ],
      tips: ['El foro vive en tu navegador: es un espacio personal de practica.'],
    },
    {
      id: 'perfil',
      titulo: 'Editar mi perfil',
      icono: 'fa-user-gear',
      para: 'cliente',
      resumen: 'Nombre, foto y tipo de crochet.',
      pasos: [
        { titulo: 'Pulsa el engranaje', texto: 'Esta en la esquina superior derecha de tu tarjeta de perfil.', enlace: 'perfil.html', etiqueta: 'Ir a mi perfil' },
        { titulo: 'Cambia tu nombre', texto: 'Escribe como quieres que te llamen.' },
        { titulo: 'Sube o quita tu foto', texto: 'Se reescala a 320 px para no pesado.' },
        { titulo: 'Elige tu tipo de crochet', texto: 'Define si haces amigurumis, hogar, moda, patrones o de todo. Adapta tu descripcion.' },
        { titulo: 'Guarda', texto: 'Pulsa "Guardar cambios" y veras todo aplicado al instante.' },
      ],
      tips: ['Mientras no guardes, puedes cerrar la ventana sin perder nada grave: el borrador se reinicia.'],
    },
    {
      id: 'cuentas',
      titulo: 'Cuentas e inicio de sesion',
      icono: 'fa-user-lock',
      para: 'cliente',
      resumen: 'Crear tu cuenta, entrar, salir y cambiar la contrasena.',
      pasos: [
        { titulo: 'Que ganas con una cuenta', texto: 'Tu nombre, tu foto y tu tipo de crochet quedan guardados. Tus creaciones y tus mensajes del foro salen firmados con tu nombre, y el panel de administracion sabe quien subio cada cosa.', enlace: 'acceso.html?modo=crear', etiqueta: 'Crear mi cuenta' },
        { titulo: 'Crear la cuenta', texto: 'En la pagina de acceso, pestana "Crear cuenta", escribe tu nombre, tu correo y una contrasena de 6 caracteres o mas. Al terminar entras sola.' },
        { titulo: 'Entrar y salir', texto: 'Usa el boton de la persona en la barra superior. Si marcas "Mantener mi sesion abierta", seguira abierta aunque cierres el navegador. Para salir, abre ese mismo menu y pulsa "Cerrar sesion".' },
        { titulo: 'Cambiar la contrasena', texto: 'Entra a Mi perfil, pulsa el engranaje y baja hasta "Seguridad". Escribe la contrasena nueva dos veces y guarda.' },
        { titulo: 'La primera administradora', texto: 'La primera vez que alguien abre el Panel de ventas, la pagina pide crear la cuenta de administracion. Esa cuenta maneja la tienda; las clientas solo ven su perfil.' },
      ],
      tips: ['Las cuentas viven solo en este navegador: es una demostracion. Para usarlas en internet hace falta un servidor con autenticacion de verdad.'],
    },
    {
      id: 'privacidad',
      titulo: 'Privacidad, cookies y tus datos',
      icono: 'fa-shield-halved',
      para: 'cliente',
      resumen: 'Que guardamos de ti, donde y como borrarlo.',
      pasos: [
        { titulo: 'No usamos cookies de rastreo', texto: 'La tienda no tiene analitica ni rastreadores. Lo unico que guardamos es lo que tu navegador necesita para que todo funcione.', enlace: 'cookies.html', etiqueta: 'Ver el aviso de cookies' },
        { titulo: 'Que se queda en tu equipo', texto: 'Tu carrito, tus pedidos, tus creaciones, tus favoritos y, si creas cuenta, tu nombre y tu correo. Nada sale a un servidor.' },
        { titulo: 'La contrasena', texto: 'Se guarda con un hash con sal, no en texto plano. Aun asi es una demostracion: para una tienda en internet hace falta autenticacion de verdad.' },
        { titulo: 'Como borrarlo todo', texto: 'En la configuracion de tu navegador borra los datos de este sitio. Tambien puedes entrar en ventana de incognito para no guardar nada.' },
        { titulo: 'Tus derechos', texto: 'Puedes revisar, corregir y borrar tus datos cuando quieras, y dejar de usar la cuenta sin dejar rastro.' },
      ],
      tips: ['La politica completa esta en privacidad.html y los terminos en terminos.html.'],
    },
    {
      id: 'favoritos',
      titulo: 'Mis favoritos',
      icono: 'fa-heart',
      para: 'cliente',
      resumen: 'Guardar piezas para comparar despues.',
      pasos: [
        { titulo: 'Toca el corazon', texto: 'El boton de corazon esta en cada tarjeta de producto y en la ficha.' },
        { titulo: 'Abre tu lista', texto: 'Pulsa el boton de favoritos (corazon) en la barra superior.' },
        { titulo: 'Compara tranquilo', texto: 'Ahi ves todo lo que te gusto, con precio y boton de anadir.' },
        { titulo: 'Quita lo que ya no quieras', texto: 'Vuelve a tocar el corazon para quitarlo de la lista.' },
      ],
      tips: ['Los favoritos no reservan el producto: son solo tu lista deConsulta.'],
    },
    /* ---------- Panel de ventas ---------- */
    {
      id: 'admin-pedidos',
      titulo: 'Administrar pedidos',
      icono: 'fa-list-check',
      para: 'admin',
      resumen: 'Ver, cambiar estado y eliminar pedidos.',
      pasos: [
        { titulo: 'Abre el panel', texto: 'En el pie de la tienda hay un enlace "Panel de ventas", o entra a admin.html.', enlace: 'admin.html', etiqueta: 'Abrir el panel' },
        { titulo: 'Baja a Pedidos', texto: 'Cada pedido trae fecha, cliente, telefono, direccion, productos y total.' },
        { titulo: 'Cambia el estado', texto: 'Usa la lista desplegable de cada fila: Pendiente, Pagado, Enviado, Entregado o Cancelado.' },
        { titulo: 'Suma o resta al resumen', texto: 'Los cancelados no cuentan en ingresos ni en el ticket promedio.' },
        { titulo: 'Borra un pedido', texto: 'La papelera lo elimina. Pedira confirmacion: no se puede deshacer.' },
      ],
      tips: ['"Pagado" es el estado clave: en cuanto lo marcas, el pedido entra en tus ingresos.'],
    },
    {
      id: 'admin-venta',
      titulo: 'Registrar venta manual',
      icono: 'fa-plus',
      para: 'admin',
      resumen: 'Anotar ventas hechas por fuera de la web.',
      pasos: [
        { titulo: 'Abre el panel', texto: 'En admin.html, seccion Pedidos.', enlace: 'admin.html', etiqueta: 'Abrir el panel' },
        { titulo: 'Llena el formulario', texto: 'Cliente, telefono, producto o concepto y el total en pesos.' },
        { titulo: 'Elige el estado', texto: 'Pagado o Pendiente, segun como este.' },
        { titulo: 'Registra', texto: 'Aparece de inmediato en la tabla y en las graficas de la semana.' },
      ],
      tips: ['Sirve para ventas por Nequi, efectivo o marketplaces, sin que la clienta use el carrito.'],
    },
    {
      id: 'admin-csv',
      titulo: 'Descargar reporte CSV',
      icono: 'fa-file-csv',
      para: 'admin',
      resumen: 'Sacar tus pedidos a Excel.',
      pasos: [
        { titulo: 'Pulsa "Descargar reporte"', texto: 'Esta en la parte superior del panel.', enlace: 'admin.html', etiqueta: 'Abrir el panel' },
        { titulo: 'Se guarda el archivo', texto: 'Un CSV llamado pedidos-punto-alma-fecha.csv.' },
        { titulo: 'Abrelo en Excel', texto: 'Incluye fecha, cliente, telefono, direccion, productos, total y estado.' },
      ],
      tips: ['El archivo trae BOM para que Excel reconozca bien los acentos.'],
    },
    /* ---------- Gestion de contenido: la clave ---------- */
    {
      id: 'admin-catalogo',
      titulo: 'Agregar un producto',
      icono: 'fa-circle-plus',
      para: 'admin',
      resumen: 'Publicar una pieza nueva sin tocar codigo.',
      pasos: [
        { titulo: 'Abre Contenido', texto: 'En el panel de ventas, seccion "Catalogo y contenido".', enlace: 'admin.html#catalogo', etiqueta: 'Abrir el panel' },
        { titulo: 'Pulsa "Nuevo producto"', texto: 'Se abre el formulario de edicion.' },
        { titulo: 'Nombre, categoria y precio', texto: 'El identificador (id) se arma solo del nombre. Puedes escribirlo a mano si quieres una URL limpia.' },
        { titulo: 'Elige tipo', texto: "Fisico (se envia) o Digital (se descarga). El tipo decide si el carrito pide direccion o no." },
        { titulo: 'Imagen', texto: 'Escribe la ruta, por ejemplo recursos/img/mi-pieza.jpg. Si la dejas vacia se usa una de respaldo.' },
        { titulo: 'Detalles', texto: 'Los beneficios, especificaciones y cuidado se escriben uno por linea.' },
        { titulo: 'Guarda', texto: 'Aparece al instante en la tienda, en la pagina de detalle, en el buscador y en el carrito.' },
      ],
      tips: ['Puedes poner varias imagenes separadas por coma para la galeria.', 'Todo se guarda en el navegador. Antes de limpiar datos, exporta tu catalogo desde el boton de respaldo.'],
    },
    {
      id: 'admin-editar-producto',
      titulo: 'Editar un producto',
      icono: 'fa-pen-to-square',
      para: 'admin',
      resumen: 'Cambiar precio, nombre, imagen o contenido.',
      pasos: [
        { titulo: 'Busca la pieza', texto: 'En la lista de productos del panel puedes filtrar por nombre o categoria.' },
        { titulo: 'Pulsa el lapiz', texto: 'Se cargan todos los datos en el formulario.' },
        { titulo: 'Cambia lo que necesites', texto: 'Precio, descripcion, imagenes, categoria, insignia...' },
        { titulo: 'Guarda', texto: 'El cambio se refleja en toda la pagina de inmediato.' },
      ],
      tips: ['Para poner oferta, escribe el precio anterior y el nuevo: el descuento se calcula solo.'],
    },
    {
      id: 'admin-eliminar-producto',
      titulo: 'Quitar o restaurar productos',
      icono: 'fa-box-archive',
      para: 'admin',
      resumen: 'Retirar una pieza sin perder el original.',
      pasos: [
        { titulo: 'Pulsa la papelera', texto: 'La pieza desaparece de la tienda, pero queda registrada como eliminada.' },
        { titulo: 'Cambia de vista', texto: 'Usa el filtro "Eliminados" para ver lo que quitaste.' },
        { titulo: 'Restaura', texto: 'El boton de flecha devuelve la pieza exactamente como estaba.' },
        { titulo: 'Restaurar todo', texto: 'Si quieres volver al catalogo original de una vez, pulsa "Restaurar catalogo".' },
      ],
      tips: ['Restaurar catalogo borra tambien los productos nuevos que hayas agregado.'],
    },
    {
      id: 'admin-moderar',
      titulo: 'Moderar contenido de usuarios',
      icono: 'fa-shield-halved',
      para: 'admin',
      resumen: 'Revisar y quitar creaciones y publicaciones del foro.',
      pasos: [
        { titulo: 'Abre la seccion de moderacion', texto: 'Esta justo debajo del catalogo, en el panel.', enlace: 'admin.html#catalogo', etiqueta: 'Abrir el panel' },
        { titulo: 'Revisa las creaciones', texto: 'Ves titulo, autor, tipo y fecha de cada pieza publicada.' },
        { titulo: 'Aprueba o quita', texto: 'El botón de paloma marca la creacion como visible y la papelera la elimina.' },
        { titulo: 'Haz lo mismo con el foro', texto: 'Las publicaciones del foro se listan aparte con su texto completo.' },
        { titulo: 'Borra todo', texto: 'El boton de vaciar limpia una seccion completa. Pide confirmacion.' },
      ],
      tips: ['Aprobar una creacion la hace oficial: la marca queda guardada en la ficha.', 'El contenido de cada visitante vive en SU navegador. El panel solo muestra el de este dispositivo; para una tienda multiusuario hace falta un servidor.'],
    },
    {
      id: 'admin-respaldo',
      titulo: 'Respaldar el catalogo',
      icono: 'fa-download',
      para: 'admin',
      resumen: 'No perder tus productos si limpias el navegador.',
      pasos: [
        { titulo: 'Pulsa "Exportar"', texto: 'Se descarga un archivo JSON con todo lo que agregaste, editaste o quitaste.' },
        { titulo: 'Guardalo en tu computador', texto: 'Ese archivo es tu red de seguridad.' },
        { titulo: 'Restaurar', texto: 'Si borraste algo por error, usa "Importar" y selecciona el JSON.' },
      ],
      tips: ['Exporta antes de limpiar datos del navegador o cambiar de equipo.'],
    },
    {
      id: 'admin-ia',
      titulo: 'Conectar una IA real',
      icono: 'fa-robot',
      para: 'admin',
      resumen: 'Que el asistente use un modelo de verdad.',
      pasos: [
        { titulo: 'Abre la seccion Asistente IA', texto: 'Esta al final del panel.', enlace: 'admin.html#asistente', etiqueta: 'Abrir el panel' },
        { titulo: 'Pega tu endpoint y tu clave', texto: 'Sirve cualquier servicio compatible con /chat/completions.' },
        { titulo: 'Prueba con un mensaje', texto: 'Si responde la IA real, veras la etiqueta "IA real" en el burbujeo del chat.' },
        { titulo: 'Apagala cuando quieras', texto: 'Vuelve al modo "Local" con un clic. El asistente integrado nunca deja de funcionar.' },
      ],
      tips: [
        'La clave queda solo en este navegador y viaja directo desde tu computador al proveedor: nunca pasa por un servidor nuestro.',
        'No pongas la clave en un computador compartido.',
      ],
    },
    {
      id: 'como-funciona',
      titulo: 'Como esta hecha la pagina',
      icono: 'fa-code',
      para: 'tecnico',
      resumen: 'Que archivo hace que, para que sepas donde tocar.',
      pasos: [
        { titulo: 'Las paginas', texto: 'index.html (tienda), producto.html (ficha), perfil.html (tu espacio), acceso.html (entrar o crear cuenta), admin.html (panel), ayuda.html (esta guia).' },
        { titulo: 'Los datos del catalogo', texto: 'scripts/catalogo.js. products por id, precio, imagen, beneficios, especificaciones y cuidado.' },
        { titulo: 'Las cuentas', texto: 'scripts/auth.js guarda las cuentas en pa_usuarios y la sesion abierta en pa_sesion. scripts/acceso.js da vida a la pagina para entrar o crear cuenta.' },
        { titulo: 'El carrito y los pedidos', texto: 'scripts/carrito.js. Guarda el carrito en pa_carrito y los pedidos en pa_pedidos del navegador.' },
        { titulo: 'La logica de la tienda', texto: 'scripts/app.js: buscador, filtros, orden, favoritos y cuenta regresiva.' },
        { titulo: 'Lo compartido', texto: 'scripts/comun.js: tarjeta de producto, favoritos, avisos y formato de precios.' },
        { titulo: 'El asistente', texto: 'scripts/ia.js es el cerebro y scripts/asistente.js la burbuja de chat.' },
        { titulo: 'Los estilos', texto: 'estilos/style.css (base), tienda.css, producto.css, perfil.css, admin.css, asistente.css y ayuda.css.' },
        { titulo: 'Las imagenes', texto: 'Van en recursos/img/. Conviene pesar menos de 150 KB cada foto para que la pagina vuele.' },
      ],
      tips: ['Todo el sitio es HTML, CSS y JavaScript puro. No necesita instalar nada para funcionar.'],
    },
    {
      id: 'tecnico',
      titulo: 'Datos y almacenamiento',
      icono: 'fa-database',
      para: 'tecnico',
      resumen: 'Que se guarda y donde.',
      pasos: [
        { titulo: 'En tu navegador', texto: 'pa_usuarios, pa_sesion, pa_carrito, pa_pedidos, pa_creaciones, pa_foro, pa_favoritos, pa_vistos, pa_catalogo_overrides, pa_boletin, pa_nube y pa_ia.' },
        { titulo: 'Que significa', texto: 'Es memoria del navegador, no una base de datos en la nube. Se borra si limpias datos del sitio o usas otro equipo.' },
        { titulo: 'Nube automatica (Supabase)', texto: 'El panel trae la seccion Nube: pega la URL y la anon key de tu proyecto y corre supabase.sql una vez. Desde ahi cada cuenta, pedido y suscripcion se guarda sola en la tabla tienda_datos.' },
        { titulo: 'Cómo respaldar todo', texto: 'Exporta el catalogo y el reporte CSV desde el panel para no perder trabajo.' },
      ],
      tips: ['Para una tienda real con varios usuarios hace falta un servidor (por ejemplo Supabase o Firebase).'],
    },
    {
      id: 'seo-tecnico',
      titulo: 'SEO, PWA y seguridad',
      icono: 'fa-chart-line',
      para: 'tecnico',
      resumen: 'Como aparece la tienda en Google y como se instala en el celular.',
      pasos: [
        { titulo: 'Lo que lee un buscador', texto: 'Cada pagina tiene su titulo, descripcion, canonical y los datos para redes sociales (og:title, og:image). El mapa del sitio esta en sitemap.xml y robots.txt le dice que puede leer.' },
        { titulo: 'Datos estructurados', texto: 'index.html trae Store, WebSite, FAQPage y BreadcrumbList. producto.html agrega Product con nombre, precio y calificacion, y cambia el titulo segun la pieza que se abre.' },
        { titulo: 'Modo sin conexion', texto: 'sw.js guarda el sitio en el navegador (PWA). Al publicar cambios sube CACHE a punto-alma-v3 para que la gente reciba la version nueva.' },
        { titulo: 'Cabeceras y cache', texto: '_headers (Netlify) y .htaccess (Apache) agregan cache larga, compresion y cabeceras de seguridad como Content-Security-Policy y HSTS.' },
        { titulo: 'Paginas de utilidad', texto: '404.html para direcciones que no existen, offline.html sin internet, humans.txt para presentar el proyecto y .well-known/security.txt para reportar fallos.' },
        { titulo: 'Accesibilidad', texto: 'scripts/sitio.js agrega el enlace de saltar al contenido, el boton de volver arriba y el aviso honesto de datos. Se respeta prefers-reduced-motion.' },
      ],
      tips: ['Antes de publicar, llena los marcadores [NOMBRE], [NIT] y [CORREO] de privacidad.html y terminos.html.'],
    },
  ];

  const guiaPorId = (id) => GUIAS.find((g) => g.id === id);

  /* ============================================================
     3. PREFERENCIAS
     ============================================================ */
  const CLAVE_PREFS = 'pa_preferencias';

  const prefsPorDefecto = () => ({
    categoria: '',
    para: '',
    presupuesto: '',
    estilo: '',
    yaUso: false,
  });

  const leerPrefs = () => {
    try {
      const d = JSON.parse(localStorage.getItem(CLAVE_PREFS));
      return d && typeof d === 'object' ? { ...prefsPorDefecto(), ...d } : prefsPorDefecto();
    } catch {
      return prefsPorDefecto();
    }
  };

  const guardarPrefs = (p) => {
    const actual = { ...leerPrefs(), ...p, yaUso: true };
    try {
      localStorage.setItem(CLAVE_PREFS, JSON.stringify(actual));
    } catch {
      /* sin almacenamiento */
    }
    window.dispatchEvent(new CustomEvent('pa:preferencias'));
    return actual;
  };

  const borrarPrefs = () => {
    try {
      localStorage.removeItem(CLAVE_PREFS);
    } catch {
      /* nada */
    }
    window.dispatchEvent(new CustomEvent('pa:preferencias'));
  };

  /* ============================================================
     4. MOTOR DE RECOMENDACIONES
     ============================================================ */
  const referenciasDe = (texto) => {
    const t = norm(texto);
    if (!t) return [];
    return REFERENCIAS.filter((r) => r.claves.some((k) => t.includes(k)));
  };

  const puntajeProducto = (p, prefs) => {
    let s = 0;
    const cat = norm(p.categoria);

    if (prefs.categoria && cat.includes(norm(prefs.categoria).split(' ')[0])) s += 45;

    // Para que cosa es
    const para = prefs.para;
    if (para === 'bebe') {
      if (/amigurumi/i.test(p.categoria)) s += 30;
      if (/bebe|algodon hipoalergenico|infantil|bebe/i.test(norm(p.descripcion + ' ' + (p.beneficios || []).join(' ')))) s += 28;
      if (/pulpo|oso|conejo|posavasos|cobija/.test(p.id)) s += 12;
    } else if (para === 'casa') {
      if (/cobija|hogar|posavasos/i.test(p.categoria)) s += 34;
    } else if (para === 'regalo') {
      if ((p.precio || 0) >= 75000) s += 26;
      if (/empaque|regalo/i.test(norm(p.descripcion + (p.beneficios || []).join(' ')))) s += 18;
    } else if (para === 'yo') {
      if (/bolso|accesorio|bufanda/i.test(p.categoria)) s += 30;
    }

    // Presupuesto
    const rango = PRESUPUESTOS.find((x) => x.id === prefs.presupuesto);
    if (rango) {
      const precio = Number(p.precio) || 0;
      if (precio >= rango.min && precio <= rango.max) s += 26;
      else s -= 18;
    }

    // Referencia de estilo elegida
    const ref = REFERENCIAS.find((r) => r.id === prefs.estilo);
    if (ref && ref.prefiere(p)) s += 32;

    // Calidad general
    s += (Number(p.rating) || 0) * 9;
    s += Math.min(18, (Number(p.reseñas) || 0) / 8);

    return s;
  };

  const recomendar = (prefs = leerPrefs(), limite = 3) => {
    const productos = api() ? api().obtener() : [];
    const tieneAlgo = prefs.categoria || prefs.para || prefs.presupuesto || prefs.estilo;
    if (!tieneAlgo) return [];
    return [...productos]
      .map((p) => ({ p, s: puntajeProducto(p, prefs) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, limite)
      .map((x) => ({ ...x.p, motivo: motivoDe(x.p, prefs) }));
  };

  const motivoDe = (p, prefs) => {
    if (prefs.para === 'bebe' && /amigurumi/i.test(p.categoria)) return 'Ideal para regalar a un bebe';
    if (prefs.para === 'casa' && /hogar|cobija/i.test(p.categoria)) return 'Para living o alcoba';
    if (prefs.para === 'regalo' && (p.precio || 0) >= 75000) return 'Lista para regalar';
    if (prefs.para === 'yo' && /bolso|accesorio/i.test(p.categoria)) return 'Para tu dia a dia';
    const ref = REFERENCIAS.find((r) => r.id === prefs.estilo);
    if (ref && ref.prefiere(p)) return `Estilo ${ref.titulo.toLowerCase()}`;
    if (C.descuentoDe(p)) return `Con ${C.descuentoDe(p)}% de descuento`;
    return 'De los más vendidos';
  };

  /* ============================================================
     5. BUSQUEDA DE PRODUCTOS POR TEXTO
     ============================================================ */
  const buscarProductos = (texto, limite = 4) => {
    const productos = api() ? api().obtener() : [];
    const palabras = norm(texto).split(/\s+/).filter((w) => w.length > 2);
    if (!palabras.length) return [];
    return productos
      .map((p) => {
        const textoP = norm(
          [p.nombre, p.categoria, p.descripcion, p.stock, (p.beneficios || []).join(' '), (p.detalles || []).join(' ')].join(' ')
        );
        let s = 0;
        palabras.forEach((w) => {
          if (norm(p.nombre).includes(w)) s += 12;
          if (textoP.includes(w)) s += 4;
        });
        s += (Number(p.rating) || 0) * 3;
        return { p, s };
      })
      .filter((x) => x.s > 6)
      .sort((a, b) => b.s - a.s)
      .slice(0, limite)
      .map((x) => x.p);
  };

  /* ============================================================
     6. INTENCIONES
     ============================================================ */
  const listaGuias = (para) => GUIAS.filter((g) => !para || g.para === para);

  const renderProductos = (productos, titulo = 'Te recomiendo') => {
    if (!productos.length) return '';
    return `
      <p class="ia-titulo"><i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i> ${esc(titulo)}</p>
      <div class="ia-productos">
        ${productos
          .map(
            (p) => `
          <a class="ia-producto" href="producto.html?id=${encodeURIComponent(p.id)}">
            <img src="${esc(p.imagen)}" alt="${esc(p.nombre)}" loading="lazy">
            <div>
              <b>${esc(p.nombre)}</b>
              <span>${esc(p.categoria)}</span>
              <strong>${precio(p.precio)}</strong>
              ${p.motivo ? `<em><i class="fa-solid fa-feather" aria-hidden="true"></i> ${esc(p.motivo)}</em>` : ''}
            </div>
          </a>`
          )
          .join('')}
      </div>`;
  };

  const renderPasos = (g) => `
    <p class="ia-titulo"><i class="fa-solid ${esc(g.icono)}" aria-hidden="true"></i> ${esc(g.titulo)}</p>
    <ol class="ia-pasos">
      ${g.pasos
        .map(
          (p, i) => `
        <li>
          <span class="ia-num">${i + 1}</span>
          <div>
            <b>${esc(p.titulo)}</b>
            <p>${esc(p.texto)}</p>
            ${p.enlace && p.enlace !== 'carrito-abierto'
              ? `<a class="ia-enlace" href="${esc(p.enlace)}">${esc(p.etiqueta || 'Abrir')} <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a>`
              : ''}
          </div>
        </li>`
        )
        .join('')}
    </ol>
    ${g.tips && g.tips.length
      ? `<div class="ia-tips"><b><i class="fa-solid fa-lightbulb" aria-hidden="true"></i> Ten en cuenta</b><ul>${g.tips
          .map((t) => `<li>${esc(t)}</li>`)
          .join('')}</ul></div>`
      : ''}`;

  const IA = {
    saludar: `Hola! Soy <b>Alma</b>, la asesora de Punto & Alma. Te puedo recomendar piezas segun lo que te gusta, explicarte como usar la tienda, o guiarte para subir y editar tu contenido. <span class="ia-sugerencia">¿Que te gustaria?</span>`,

    responder(entrada) {
      const texto = String(entrada || '').trim();
      const t = norm(texto);

      if (!t) {
        return { html: 'Dime algo y te ayudo. 🙂', chips: ['Que me recomiendas', 'Como subo mi creacion', 'Como edito un producto', 'Formas de pago'] };
      }

      /* --- Saludar /('--') --- */
      if (/^(hola|holi|buenas|hey|buenos dias|buenas tardes|que mas|hey alma)\b/.test(t) && texto.length < 30) {
        return { html: `${IA.saludar}`, chips: ['Recomendaciones para mi', 'Como subo mi creacion', 'Guias de la pagina', 'Formas de pago'] };
      }

      /* --- Preference quiz trigger --- */
      if (/recomend|pregunte.*gusta|no se que|gustaria|sugerencia|inspir|que me gusto/.test(t)) {
        const prefs = leerPrefs();
        const picks = recomendar(prefs, 3);
        const ref = REFERENCIAS.find((r) => r.id === prefs.estilo);
        if (!prefs.yaUso) {
          return {
            html: `Con gusto. Para no adivinar, responde tres cositas y te armo una seleccion a tu medida.`,
            chips: ['Empezar el quiz', 'Ver todos los productos', 'Guias'],
            accion: 'quiz',
          };
        }
        return {
          html: `${ref ? `Tomando en cuenta que te gusta el estilo <b>${esc(ref.titulo)}</b>: ` : 'Segun lo que me contaste: '}
                 ${renderProductos(picks, 'Tus piezas')}
                 <p class="ia-nota">Puedo afinar la busqueda si me dices: para un bebe, para la casa, un regalo, o cuanto quieres invertir.</p>`,
          chips: ['Es para un bebe', 'Es para la casa', 'Es un regalo', 'Cambiar mis preferencias'],
        };
      }

      /* --- Guias (por titulo o palabras clave) --- */
      const palabrasGuia = {
        'subir-creacion': /creacion|publicar|subir|poseo|mi pieza|vitrina/,
        'editar-creacion': /editar.*creacion|borrar.*creacion|quitar.*creacion|cambiar.*creacion/,
        foro: /foro|comunidad|publicar.*mensaje|opinion|comentario/,
        perfil: /perfil|mi nombre|foto de perfil|ajustes/,
        cuentas: /cuenta|registr|sesion|ingresar|contrasena|clave|login|entrar/,
        privacidad: /privacidad|cookie|dato personal|mis datos|borrar.*dato|informacion personal|aviso de datos/,
        favoritos: /favorit|guardad|guardar.*producto|lista/,
        comprar: /compr|carrito|pedido|finalizar/,
        pagar: /pago|pagar|nequi|daviplata|bancolombia|tarjeta|transferencia/,
        envios: /envio|entrega|cuadre|tiempo.*entrega|despach/,
        devoluciones: /devolucion|cambio|reembolso|garantia/,
        cuidados: /cuidado|lavar|limpieza|manchar|guardar.*pieza/,
        patrones: /patron|pdf|descargar|tutorial|aprender/,
        'seo-tecnico': /seo|google|buscador|sitemap|canonical|robots|indexar|posicionamiento|pwa|sin conexion|offline|service worker|cabecera|seguridad del sitio/,
        'que-es': /que es|como funciona|acerca de|quienes son/,
        'admin-pedidos': /pedido|estado|marcar.*pedido|enviado|entregado|cancelar/,
        'admin-venta': /venta manual|registrar.*venta|anotar/,
        'admin-csv': /csv|excel|reporte|descargar.*dato/,
        'admin-catalogo': /agregar.*producto|nuevo producto|crear.*producto|publicar.*producto/,
        'admin-editar-producto': /editar.*producto|cambiar.*precio|modificar.*producto/,
        'admin-eliminar-producto': /eliminar.*producto|quitar.*producto|restaurar/,
        'admin-moderar': /moder|contenido.*usuario|aprobar|revisar.*creacion|foro.*panel/,
        'admin-respaldo': /respaldo|backup|exportar|importar|perdi/,
        'admin-ia': /ia real|inteligencia artificial|api|clave|conectar.*ia/,
        'como-funciona': /como.*hecha|archivo|carpeta|codigo|estructura|donde.*cambiar/,
        tecnico: /dato|guarda|localstorage|navegador|almacenamiento|base de datos/,
      };

      // Guias de admin tienen prioridad si menciona el panel
      if (/panel|admin/i.test(t)) {
        const match = Object.keys(palabrasGuia).find((k) => k.startsWith('admin-') && palabrasGuia[k].test(t));
        if (match) return { html: renderPasos(guiaPorId(match)), chips: ['Ver otra guia', 'Guias del panel'] };
      }
      const match = Object.keys(palabrasGuia).find((k) => !k.startsWith('admin-') && palabrasGuia[k].test(t));
      if (match) return { html: renderPasos(guiaPorId(match)), chips: ['Siguiente guia', 'Ver los productos', 'Hablar con la artesana'] };

      /* --- Referencias de estilo --- */
      const refs = referenciasDe(texto);
      if (refs.length) {
        const r = refs[0];
        const picks = todosPorEstilo(r.id, 3);
        return {
          html: `
            <p class="ia-titulo"><i class="fa-solid fa-palette" aria-hidden="true"></i> Referencia: ${esc(r.titulo)}</p>
            <p>${esc(r.descripcion)}</p>
            <div class="ia-paleta">${r.paleta.map((c) => `<span style="background:${esc(c)}" title="${esc(c)}"></span>`).join('')}</div>
            <div class="ia-tips"><b><i class="fa-solid fa-lightbulb" aria-hidden="true"></i> Consejo</b><p>${esc(r.consejo)}</p></div>
            ${renderProductos(picks, `Piezas con este aire`)}
            <p class="ia-nota">¿Quieres que guarde este estilo como tu preferencia? Asi te lo recuerdo siempre.</p>`,
          chips: [`Guardar estilo ${r.titulo}`, 'Recomienda para un bebe', 'Ver todos'],
        };
      }

      /* --- Producto puntual por nombre --- */
      const productos = buscarProductos(texto, 3);
      if (productos.length) {
        const p = productos[0];
        return {
          html: `
            <p class="ia-titulo"><i class="fa-solid fa-gem" aria-hidden="true"></i> Esto es lo que encontre</p>
            ${renderProductos(productos, 'Coincide con lo que buscas')}
            <p class="ia-nota"><b>${esc(p.nombre)}</b> — ${esc(p.descripcion)}</p>`,
          chips: ['Ver la ficha', 'Añadirlo al carrito', 'Recomendame similares'],
        };
      }

      /* --- Precio / presupuesto --- */
      if (/precio|barato|economico|cuanto cuesta|presupuesto/.test(t)) {
        const rango = PRESUPUESTOS.find((r) => t.includes(norm(r.etiqueta).split(' ')[0])) || PRESUPUESTOS[0];
        const lista = (api() ? api().obtener() : [])
          .filter((p) => (p.precio || 0) >= rango.min && (p.precio || 0) <= rango.max)
          .sort((a, b) => a.precio - b.precio)
          .slice(0, 3);
        return {
          html: `<p>En el rango <b>${esc(rango.etiqueta)}</b> tienes:</p>${renderProductos(lista, 'Tus opciones')}`,
          chips: PRESUPUESTOS.map((r) => `Ver ${r.etiqueta}`),
        };
      }

      /* --- Guias: listado --- */
      if (/guias|ayuda|documentacion|tutorial|como uso|ensename/.test(t)) {
        return {
          html: `
            <p class="ia-titulo"><i class="fa-solid fa-book" aria-hidden="true"></i> Guias disponibles</p>
            <p>Elige la que necesites:</p>
            <div class="ia-lista-guias">
              ${listaGuias('cliente')
                .map((g) => `<button class="ia-guia" type="button" data-guia="${esc(g.id)}"><i class="fa-solid ${esc(g.icono)}" aria-hidden="true"></i> ${esc(g.titulo)}<small>${esc(g.resumen)}</small></button>`)
                .join('')}
            </div>
            <p class="ia-nota">Y estas son las del <b>panel de ventas</b> (agregar y editar productos, moderar contenido de usuarios, respaldos).</p>`,
          chips: ['Guias del panel', 'Recomendame algo', 'Como comprar'],
        };
      }

      /* --- Saludo de despedida / gracias --- */
      if (/gracias|muchas gracias|genial|perfecto/.test(t)) {
        return { html: '¡Con mucho gusto! 🤍 Si te surge otra duda, aqui ando. Y si compras, me cuentas qué te llegó bien.', chips: ['Ver productos', 'Guias'] };
      }

      /* --- Fallback --- */
      return {
        html: `No estaba segura de entender eso. Te dejo atajos que seguro te sirven:`,
        chips: ['Recomendaciones para mi', 'Como subo mi creacion', 'Como edito un producto', 'Guias de la pagina', 'Formas de pago'],
        sugerenciasAyuda: true,
      };
    },

    /* Todas las guias, agrupadas por publico */
    guiasPorGrupo() {
      const grupos = [
        { clave: 'cliente', titulo: 'Para ti, como clienta', icono: 'fa-heart', items: listaGuias('cliente') },
        { clave: 'admin', titulo: 'Para administrar el panel', icono: 'fa-user-shield', items: listaGuias('admin') },
        { clave: 'tecnico', titulo: 'Como esta construida la pagina', icono: 'fa-code', items: listaGuias('tecnico') },
      ];
      return grupos.filter((g) => g.items.length);
    },

    guiaPorId,
    listaGuias,
    renderPasos,
    renderProductos,
    referencias: REFERENCIAS,
    prefsPorDefecto,
    leerPrefs,
    guardarPrefs,
    borrarPrefs,
    recomendar,
    buscarProductos,
    referenciasDe,
    PRESUPUESTOS,
    ESTILOS_TEXTO,

    /* ---------- Conexion opcional con una IA real ---------- */
    CLAVE_IA: 'pa_ia',
    leerConfigIA() {
      try {
        return JSON.parse(localStorage.getItem('pa_ia')) || { modo: 'local', endpoint: '', clave: '', modelo: 'gpt-4o-mini' };
      } catch {
        return { modo: 'local', endpoint: '', clave: '', modelo: 'gpt-4o-mini' };
      }
    },
    guardarConfigIA(cfg) {
      try {
        localStorage.setItem('pa_ia', JSON.stringify(cfg));
      } catch {
        /* nada */
      }
    },
    async consultarRemoto(pregunta) {
      const cfg = IA.leerConfigIA();
      if (cfg.modo !== 'remoto' || !cfg.endpoint || !cfg.clave) throw new Error('IA remota no configurada');
      const sistema =
        'Eres Alma, la asesora de Punto & Alma, una tienda de crochet artesanal de Manizales, Colombia. ' +
        'Responde en espanol colombiano, con tono calido y breve (maximo 120 palabras). ' +
        'Catalogo disponible: ' +
        JSON.stringify((api() ? api().obtener() : []).map((p) => ({ n: p.nombre, c: p.categoria, pr: p.precio, d: p.descripcion }))) +
        '. Pagos por Nequi/Daviplata 3136384065. Envios 24-72h, devoluciones 15 dias.';
      const res = await fetch(cfg.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.clave}` },
        body: JSON.stringify({
          model: cfg.modelo || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: sistema },
            { role: 'user', content: pregunta },
          ],
          temperature: 0.6,
          max_tokens: 400,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.choices?.[0]?.message?.content || '';
    },
  };

  const todosPorEstilo = (refId, limite) => {
    const ref = REFERENCIAS.find((r) => r.id === refId);
    if (!ref) return [];
    const productos = (api() ? api().obtener() : []).filter(ref.prefiere);
    return productos.slice(0, limite);
  };

  window.PAIA = IA;
})();