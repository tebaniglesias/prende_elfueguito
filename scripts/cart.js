// =============================================================
//  cart.js — Carrito de compras · Prendé el Fueguito
//  Vanilla JS puro — sin dependencias externas
// =============================================================


// ─── PASO 1: LA CLAVE DE LOCALSTORAGE ───────────────────────
//
//  LocalStorage es un diccionario clave→valor que el navegador
//  guarda de forma permanente (no se borra al cerrar la pestaña).
//
//  Usamos una constante para la clave en lugar de escribir el
//  string "carrito" en cada llamada. Si algún día necesitamos
//  cambiar el nombre, lo hacemos en un único lugar.
//
const STORAGE_KEY  = 'fueguito_carrito';
const DISCOUNT_KEY = 'fueguito_descuento'; // persiste el cupón entre páginas


// ─── PASO 2: LEER Y GUARDAR EN LOCALSTORAGE ─────────────────
//
//  LocalStorage solo acepta strings. Entonces:
//    • Al GUARDAR: convertimos el array JS → string con JSON.stringify()
//    • Al LEER:    convertimos el string   → array JS con JSON.parse()
//
//  Si la clave todavía no existe (primera visita), JSON.parse devuelve
//  null, por eso el "|| []" asegura que siempre devolvemos un array.
//
function obtenerCarrito() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
}

function guardarCarrito(carrito) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(carrito));
}


// ─── PASO 3: AGREGAR UN PRODUCTO ────────────────────────────
//
//  Recibe un objeto "producto" con esta forma:
//    { id, nombre, precio, unidad, imagen, cantidad }
//
//  Lógica:
//    1. Buscamos si ya hay un item con el mismo id.
//    2. Si EXISTE → sumamos la cantidad nueva a la existente.
//    3. Si NO EXISTE → lo agregamos al final del array.
//  Después guardamos y actualizamos el badge del header.
//
function agregarAlCarrito(producto) {
  const carrito   = obtenerCarrito();
  const existente = carrito.find(item => item.id === producto.id);

  if (existente) {
    existente.cantidad += producto.cantidad;
  } else {
    carrito.push(producto);
  }

  guardarCarrito(carrito);
  actualizarBadge();
}


// ─── PASO 4: EL BADGE DEL HEADER ────────────────────────────
//
//  El badge es el numerito naranja sobre el ícono del carrito.
//  Muestra la cantidad TOTAL de items (suma de cantidades de todos
//  los productos, no la cantidad de tipos de producto).
//
//  Funciona en TODAS las páginas porque busca .carrito-count
//  en el DOM actual. Si hay más de uno (por ejemplo, mobile + desktop),
//  los actualiza todos con querySelectorAll.
//
function actualizarBadge() {
  const carrito   = obtenerCarrito();
  const totalItems = carrito.reduce((acc, item) => acc + item.cantidad, 0);

  document.querySelectorAll('.carrito-count').forEach(badge => {
    badge.textContent = totalItems;
  });
}


// ─── PASO 5: ELIMINAR UN PRODUCTO ───────────────────────────
//
//  Array.filter() devuelve un NUEVO array con solo los items
//  cuyo id sea DISTINTO al que queremos borrar. No mutamos
//  el array original directamente.
//
//  Después de guardar, actualizamos el badge y volvemos a
//  renderizar el carrito para que la fila desaparezca.
//
function eliminarDelCarrito(id) {
  const carrito = obtenerCarrito().filter(item => item.id !== id);
  guardarCarrito(carrito);
  actualizarBadge();
  renderizarCarrito();
}


// ─── PASO 6: CAMBIAR LA CANTIDAD ────────────────────────────
//
//  delta es +1 (botón "+") o -1 (botón "−").
//
//  Si después de restar la cantidad queda en 0 o menos,
//  directamente eliminamos el producto del carrito. Esto evita
//  tener items con cantidad 0 que no se muestran pero ocupan lugar.
//
function cambiarCantidad(id, delta) {
  const carrito = obtenerCarrito();
  const item    = carrito.find(i => i.id === id);
  if (!item) return;

  item.cantidad += delta;

  if (item.cantidad <= 0) {
    eliminarDelCarrito(id);
    return;
  }

  guardarCarrito(carrito);
  actualizarBadge();
  renderizarCarrito();
}


// ─── PASO 7: CALCULAR TOTALES Y FORMATEAR PRECIOS ───────────
//
//  El envío es gratis si el subtotal supera ENVIO_GRATIS_DESDE.
//  Si no, sumamos un costo fijo de $3.500.
//
//  calcularTotales() devuelve un objeto con los cuatro valores
//  que necesita el resumen: subtotal, envio, descuento y total.
//
//  formatPrecio() convierte un número como 12990
//  al string "$12.990" usando el locale argentino.
//
const ENVIO_GRATIS_DESDE = 10000;

function calcularTotales(carrito, descuento = 0) {
  const subtotal = carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0);
  const envio    = subtotal >= ENVIO_GRATIS_DESDE ? 0 : 3500;
  const total    = subtotal - descuento + envio;
  return { subtotal, envio, descuento, total };
}

function formatPrecio(n) {
  return '$' + Math.round(n).toLocaleString('es-AR');
}


// ─── PASO 8: CUPONES DE DESCUENTO ───────────────────────────
//
//  Los cupones viven en un objeto: clave = código, valor = porcentaje.
//  descuentoActual guarda el monto calculado para ese pedido.
//
//  aplicarCupon() busca el código (ignorando mayúsculas/espacios),
//  calcula el monto de descuento y devuelve { ok, mensaje }
//  para que la UI pueda mostrar el resultado al usuario.
//
const CUPONES = {
  'FUEGO10': 0.10,
  'ASADO20': 0.20,
};

let descuentoActual = 0;

function aplicarCupon(codigo) {
  const pct = CUPONES[codigo.toUpperCase().trim()];

  if (!pct) {
    return { ok: false, mensaje: 'El cupón no es válido.' };
  }

  const { subtotal } = calcularTotales(obtenerCarrito());
  descuentoActual    = Math.round(subtotal * pct);
  localStorage.setItem(DISCOUNT_KEY, JSON.stringify({ monto: descuentoActual, codigo: codigo.toUpperCase().trim() }));

  return { ok: true, mensaje: `Cupón aplicado: ${pct * 100}% de descuento` };
}


// ─── PASO 9A: CARGAR DESCUENTO GUARDADO ─────────────────────
//
//  Al navegar de carrito.html a checkout.html se pierde la variable
//  descuentoActual porque el módulo se recarga. Esta función la
//  restaura desde localStorage para que el cupón aplicado persista.
//
function cargarDescuento() {
  const saved = JSON.parse(localStorage.getItem(DISCOUNT_KEY));
  if (saved) descuentoActual = saved.monto;
}


// ─── PASO 9B: VACIAR EL CARRITO ─────────────────────────────
//
//  Se llama al confirmar el pedido. Elimina el carrito Y el descuento
//  de localStorage y resetea la variable en memoria.
//
function vaciarCarrito() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(DISCOUNT_KEY);
  descuentoActual = 0;
  actualizarBadge();
}


// ─── PASO 9C: RESUMEN DEL CHECKOUT ──────────────────────────
//
//  Construye la lista de items y los totales en checkout.html.
//  Si el carrito está vacío, redirige a carrito.html para evitar
//  que el usuario confirme un pedido sin productos.
//
function renderizarResumenCheckout() {
  const itemsEl = document.getElementById('checkout-items');
  if (!itemsEl) return;

  const carrito = obtenerCarrito();

  if (carrito.length === 0) {
    window.location.href = 'carrito.html';
    return;
  }

  // Lista de productos: "Nombre x cantidad ........... $subtotal"
  itemsEl.innerHTML = carrito.map(item => `
    <div class="resumen-item">
      <span>${item.nombre} <strong>x ${item.cantidad}</strong></span>
      <span>${formatPrecio(item.precio * item.cantidad)}</span>
    </div>
  `).join('');

  // Totales
  const { subtotal, envio, descuento, total } = calcularTotales(carrito, descuentoActual);

  const elSubtotal = document.getElementById('checkout-subtotal');
  const elEnvio    = document.getElementById('checkout-envio');
  const elTotal    = document.getElementById('checkout-total');
  const filaDesc   = document.getElementById('checkout-fila-descuento');
  const elDesc     = document.getElementById('checkout-descuento');

  if (elSubtotal) elSubtotal.textContent = formatPrecio(subtotal);
  if (elEnvio)    elEnvio.textContent    = envio === 0 ? 'Gratis' : formatPrecio(envio);
  if (elTotal)    elTotal.textContent    = formatPrecio(total);

  if (filaDesc && elDesc) {
    filaDesc.style.display = descuento > 0 ? 'flex' : 'none';
    elDesc.textContent     = `−${formatPrecio(descuento)}`;
  }
}


// ─── PASO 9: RENDERIZAR LA PÁGINA DEL CARRITO ───────────────
//
//  Esta función construye el HTML de la lista de productos en
//  carrito.html a partir del array guardado en LocalStorage.
//  Se llama cada vez que algo cambia (agregar, eliminar, cambiar cantidad).
//
//  Template literals (backticks) nos permiten escribir el HTML
//  interpolando variables JS directamente con ${...}.
//
//  Si el carrito está vacío mostramos un estado vacío con un
//  link para volver a los productos.
//
function renderizarCarrito() {
  const contenedor    = document.getElementById('carrito-items');
  const tituloContador = document.querySelector('.carrito-cantidad');
  if (!contenedor) return; // no estamos en carrito.html

  const carrito = obtenerCarrito();

  // — Estado vacío —
  if (carrito.length === 0) {
    contenedor.innerHTML = `
      <div style="text-align:center; padding:3rem 1rem; color:#8C7560;">
        <i class="fa-solid fa-cart-shopping" style="font-size:2.5rem; color:#D4C4B0; display:block; margin-bottom:1rem;"></i>
        <p style="font-size:1rem; margin-bottom:1.5rem;">Tu carrito está vacío</p>
        <a href="index.html" style="display:inline-block; padding:10px 24px; background:#C67C3A; color:#fff; border-radius:8px; font-weight:700; text-decoration:none;">
          Ver productos
        </a>
      </div>`;
    if (tituloContador) tituloContador.textContent = '0 productos';
    actualizarResumen(carrito);
    return;
  }

  // — Actualiza el contador del título ("X productos") —
  const totalItems = carrito.reduce((acc, i) => acc + i.cantidad, 0);
  if (tituloContador) {
    tituloContador.textContent = `${totalItems} producto${totalItems !== 1 ? 's' : ''}`;
  }

  // — Construye una fila por cada item —
  contenedor.innerHTML = carrito.map(item => `
    <div class="carrito-item">
      <img src="${item.imagen}" alt="${item.nombre}">
      <div class="item-info">
        <p class="item-nombre">${item.nombre}</p>
        <p class="item-unidad">${item.unidad}</p>
        <p class="item-precio">${formatPrecio(item.precio)}</p>
      </div>
      <div class="item-controles">
        <button class="btn-eliminar" data-id="${item.id}">
          <i class="fa-solid fa-trash"></i>
        </button>
        <div class="cantidad-control">
          <button class="btn-menos" data-id="${item.id}">−</button>
          <span>${item.cantidad}</span>
          <button class="btn-mas"  data-id="${item.id}">+</button>
        </div>
        <p class="item-subtotal">${formatPrecio(item.precio * item.cantidad)}</p>
      </div>
    </div>
  `).join('');

  actualizarResumen(carrito);
}


// ─── PASO 10: DELEGACIÓN DE EVENTOS EN EL CARRITO ───────────
//
//  En vez de agregar un addEventListener a cada botón (que se
//  recrean al re-renderizar), ponemos UN SOLO listener en el
//  contenedor padre. Cuando el usuario hace click en cualquier
//  hijo, el evento "sube" hasta el contenedor (esto se llama
//  event bubbling) y acá lo atrapamos.
//
//  e.target.closest('[data-id]') busca el elemento más cercano
//  con el atributo data-id, sea el propio botón o un padre suyo
//  (útil cuando el botón tiene un <i> dentro y el click cae en el ícono).
//
function handleCarritoClick(e) {
  const btn = e.target.closest('[data-id]');
  if (!btn) return;

  const id = btn.dataset.id;

  if (btn.classList.contains('btn-eliminar')) eliminarDelCarrito(id);
  if (btn.classList.contains('btn-menos'))   cambiarCantidad(id, -1);
  if (btn.classList.contains('btn-mas'))     cambiarCantidad(id, +1);
}


// ─── PASO 11: ACTUALIZAR EL RESUMEN DE PRECIOS ──────────────
//
//  Lee los elementos del resumen por ID y actualiza su contenido.
//  La fila de descuento permanece oculta hasta que se aplica un cupón.
//
function actualizarResumen(carrito) {
  const { subtotal, envio, descuento, total } = calcularTotales(carrito, descuentoActual);

  const elSubtotal  = document.getElementById('resumen-subtotal');
  const elEnvio     = document.getElementById('resumen-envio');
  const elTotal     = document.getElementById('resumen-total');
  const filaDesc    = document.getElementById('fila-descuento');
  const elDescuento = document.getElementById('resumen-descuento');

  if (elSubtotal) elSubtotal.textContent = formatPrecio(subtotal);
  if (elEnvio)    elEnvio.textContent    = envio === 0 ? 'Gratis' : formatPrecio(envio);
  if (elTotal)    elTotal.textContent    = formatPrecio(total);

  if (filaDesc && elDescuento) {
    filaDesc.style.display    = descuento > 0 ? 'flex' : 'none';
    elDescuento.textContent   = `−${formatPrecio(descuento)}`;
  }
}


// ─── PASO 12: BOTONES "AGREGAR" EN INDEX.HTML ───────────────
//
//  Cada article.producto-card tiene atributos data-* con los
//  datos del producto. Al hacer click en .btn-agregar:
//    1. e.preventDefault() evita que el <a> padre navegue.
//    2. e.stopPropagation() evita que el click llegue al link.
//    3. Leemos los data-* del article más cercano.
//    4. Armamos el objeto producto y lo agregamos al carrito.
//    5. Feedback visual: el botón muestra "✓ Agregado" por 1.2s.
//
function iniciarListenersProductos() {
  document.querySelectorAll('.btn-agregar').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();

      const card = btn.closest('[data-id]');
      if (!card) return;

      const producto = {
        id:       card.dataset.id,
        nombre:   card.dataset.nombre,
        precio:   parseFloat(card.dataset.precio),
        unidad:   card.dataset.unidad,
        imagen:   card.dataset.imagen,
        cantidad: 1,
      };

      agregarAlCarrito(producto);

      btn.textContent = '✓ Agregado';
      btn.disabled    = true;
      setTimeout(() => {
        btn.textContent = 'Agregar';
        btn.disabled    = false;
      }, 1200);
    });
  });
}


// ─── PASO 13: BOTÓN EN ARTICULO.HTML ────────────────────────
//
//  La diferencia con el paso 12 es que acá hay un input #cantidad
//  que el usuario puede modificar. Leemos ese valor para saber
//  cuántas unidades quiere agregar.
//
//  Los datos del producto están en data-* del propio botón.
//
function iniciarListenerArticulo() {
  const btn = document.querySelector('.btn-agregar-carrito');
  if (!btn) return;

  btn.addEventListener('click', e => {
    e.preventDefault();

    const cantidadInput = document.getElementById('cantidad');
    const cantidad      = cantidadInput ? Math.max(1, parseInt(cantidadInput.value) || 1) : 1;

    const producto = {
      id:       btn.dataset.id,
      nombre:   btn.dataset.nombre,
      precio:   parseFloat(btn.dataset.precio),
      unidad:   btn.dataset.unidad,
      imagen:   btn.dataset.imagen,
      cantidad,
    };

    agregarAlCarrito(producto);

    btn.innerHTML = '<i class="fa-solid fa-check"></i> Agregado al carrito';
    setTimeout(() => {
      btn.innerHTML = '<i class="fa-solid fa-cart-shopping"></i> Agregar al Carrito';
    }, 1500);
  });
}


// ─── PASO 14: INICIALIZACIÓN AUTOMÁTICA ─────────────────────
//
//  DOMContentLoaded se dispara cuando el HTML terminó de parsear,
//  antes de que carguen imágenes y recursos externos. Es el momento
//  correcto para empezar a trabajar con el DOM.
//
//  Detectamos en qué página estamos buscando elementos clave:
//    • #carrito-items  → estamos en carrito.html
//    • .btn-agregar    → estamos en index.html (o similar)
//    • .btn-agregar-carrito → estamos en articulo.html
//
//  actualizarBadge() se llama SIEMPRE porque el ícono del carrito
//  existe en todas las páginas y hay que mostrar el número correcto.
//
document.addEventListener('DOMContentLoaded', () => {

  // Siempre: restaurar descuento guardado y actualizar el badge del header
  cargarDescuento();
  actualizarBadge();

  // carrito.html: renderizar items y activar cupón
  const contenedorCarrito = document.getElementById('carrito-items');
  if (contenedorCarrito) {
    renderizarCarrito();
    contenedorCarrito.addEventListener('click', handleCarritoClick);

    // Cupón
    const btnAplicar = document.querySelector('.btn-aplicar');
    if (btnAplicar) {
      btnAplicar.addEventListener('click', () => {
        const input    = document.querySelector('.cupon-input input');
        const msgEl    = document.getElementById('cupon-msg');
        const resultado = aplicarCupon(input?.value || '');

        if (msgEl) {
          msgEl.textContent = resultado.mensaje;
          msgEl.style.color = resultado.ok ? '#2D7A1F' : '#B91C1C';
          msgEl.style.fontSize = '0.82rem';
          msgEl.style.marginTop = '6px';
        }

        if (resultado.ok) renderizarCarrito();
      });
    }
  }

  // index.html: escuchar los botones "Agregar"
  if (document.querySelectorAll('.btn-agregar').length > 0) {
    iniciarListenersProductos();
  }

  // articulo.html: escuchar el botón del detalle
  if (document.querySelector('.btn-agregar-carrito')) {
    iniciarListenerArticulo();
  }

  // checkout.html: renderizar resumen desde LocalStorage
  if (document.getElementById('checkout-items')) {
    renderizarResumenCheckout();
  }

});
