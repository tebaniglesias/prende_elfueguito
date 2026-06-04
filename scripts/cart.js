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

const CUPONES = {
  'FUEGO10': 0.10,
  'ASADO20': 0.20,
};

const ENVIO_GRATIS_DESDE = 10000;


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
  actualizarDescuento(); // Recalcula el descuento si es que hay un cupón aplicado
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

// ─── FUNCION ACTUALIZAR CALCULO DESCUENTO ─────────────────────
//
//  Si el usuario cambia la cantidad de un producto después de aplicar un cupón,
//  el monto del descuento podría quedar desactualizado. Esta función recalcula
//  el descuento basado en el subtotal actual y el código de cupón guardado.
//  Se llama desde cambiarCantidad() para mantener el descuento correcto en todo momento.
//

function actualizarDescuento() {
  if (descuentoActual > 0) {
    const carrito = obtenerCarrito();
    const { subtotal } = calcularTotales(carrito);
    descuentoActual = Math.round(subtotal * (CUPONES[JSON.parse(localStorage.getItem(DISCOUNT_KEY))?.codigo] || 0));
    localStorage.setItem(DISCOUNT_KEY, JSON.stringify({ monto: descuentoActual, codigo: JSON.parse(localStorage.getItem(DISCOUNT_KEY))?.codigo || '' }));
    renderizarCarrito();
  }
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

  // 1. Lista de productos: "Nombre x cantidad ........... $subtotal"
  itemsEl.innerHTML = carrito.map(item => `
    <div class="resumen-item">
      <span>${item.nombre} <strong>x ${item.cantidad}</strong></span>
      <span>${formatPrecio(item.precio * item.cantidad)}</span>
    </div>
  `).join('');

  // 🔴 COPIA ESTO: Traemos de forma segura el cupón desde LocalStorage AL INICIO
  const cuponGuardado = JSON.parse(localStorage.getItem(DISCOUNT_KEY)) || null;
  
  // Si había un cupón guardado con un monto válido, actualizamos la variable local para el cálculo
  const descuentoParaCalculo = cuponGuardado ? cuponGuardado.monto : 0;

  // 2. Calculamos los totales pasándole el descuento real recuperado del Storage
  const { subtotal, envio, descuento, total } = calcularTotales(carrito, descuentoParaCalculo);

  const elSubtotal = document.getElementById('checkout-subtotal');
  const elEnvio    = document.getElementById('checkout-envio');
  const elTotal    = document.getElementById('checkout-total');
  const filaDesc   = document.getElementById('checkout-fila-descuento');
  const elDesc     = document.getElementById('checkout-descuento');
  const elCupon    = document.getElementById('checkout-cupon');

  if (elSubtotal) elSubtotal.textContent = formatPrecio(subtotal);
  if (elEnvio)    elEnvio.textContent    = envio === 0 ? 'Gratis' : formatPrecio(envio);
  if (elTotal)    elTotal.textContent    = formatPrecio(total);

  // 3. Control de la fila de descuento (Ahora 'descuento' sí va a ser mayor a 0)
  if (filaDesc && elDesc) {
    filaDesc.style.display = descuento > 0 ? 'flex' : 'none';
    elDesc.textContent     = `−${formatPrecio(descuento)}`;
  }

  // 4. Control del texto del cupón
  if (elCupon) {
    if (cuponGuardado && cuponGuardado.codigo) {
      elCupon.textContent = `(${cuponGuardado.codigo})`;
    } else {
      elCupon.textContent = '';
    }
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

  // — 🔴 NUEVO GUARDIÁN: Estado vacío (Corregido para eliminar el cupón) —
  if (carrito.length === 0) {
    
    // Al no haber productos, limpiamos por completo el cupón del disco y de la memoria
    localStorage.removeItem(DISCOUNT_KEY); 
    descuentoActual = 0;                  

    contenedor.innerHTML = `
      <div style="text-align:center; padding:3rem 1rem; color:#8C7560;">
        <i class="fa-solid fa-cart-shopping" style="font-size:2.5rem; color:#D4C4B0; display:block; margin-bottom:1rem;"></i>
        <p style="font-size:1rem; margin-bottom:1.5rem;">Tu carrito está vacío</p>
        <a href="index.html" style="display:inline-block; padding:10px 24px; background:#C67C3A; color:#fff; border-radius:8px; font-weight:700; text-decoration:none;">
          Ver productos
        </a>
      </div>`;
    
    if (tituloContador) tituloContador.textContent = '0 productos';
    
    // Esto va a actualizar el bloque de precios de la derecha dejándolo todo en $0 y ocultando la fila de descuentos
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

  // 💡 LA SOLUCIÓN: Convertimos el ID de string a número entero
  const id = parseInt(btn.dataset.id); 

  if (isNaN(id)) return; // Seguridad por si no es un número válido

  if (btn.classList.contains('btn-eliminar')) eliminarDelCarrito(id);
  if (btn.classList.contains('btn-menos'))    cambiarCantidad(id, -1);
  if (btn.classList.contains('btn-mas'))     cambiarCantidad(id, +1);

  actualizarDescuento(); // Recalcula el descuento si es que hay un cupón aplicado
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
  console.log("Resumen actualizado:", { subtotal, envio, descuento, total });
}


// ─── PASO 12: DELEGACIÓN DE EVENTOS PARA BOTONES "AGREGAR" ───
//
// Al traer los productos de Supabase de forma asíncrona, los botones no existen 
// al cargar la página. Escuchamos los clicks a nivel global y filtramos por .btn-agregar.
//
function iniciarListenersProductos() {
  document.addEventListener('click', e => {
    // Buscamos si el click (o su ícono interno) pertenece a un botón .btn-agregar
    const btn = e.target.closest('.btn-agregar');
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();

    // Buscamos la card que contiene los data attributes del producto
    const card = btn.closest('[data-id]');
    if (!card) return;

    const producto = {
      id:       parseInt(card.dataset.id), // Aseguramos que el ID sea numérico
      nombre:   card.dataset.nombre,
      precio:   parseFloat(card.dataset.precio),
      unidad:   card.dataset.unidad || 'uds.',
      imagen:   card.dataset.imagen || '',
      cantidad: 1,
    };

    agregarAlCarrito(producto);

    // Feedback visual
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '✓ Agregado';
    btn.disabled = true;
    setTimeout(() => {
      btn.innerHTML = textoOriginal;
      btn.disabled = false;
    }, 1200);
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


// ─── ACTUALIZACION PRECIOS EN CARRITO ─────────────────────
//
//  Esta función se llama al cargar carrito.html para asegurarnos de que los precios  
//  estén actualizados con la base de datos. Lee el carrito del LocalStorage,
//  obtiene la lista de productos desde la BD, y si encuentra alguna
//  diferencia de precios, actualiza el carrito y vuelve a renderizar.
//
//  Es importante hacer esto al cargar carrito.html porque el usuario
//  podría haber dejado productos en el carrito hace días y los precios
//  podrían haber cambiado. Así nos aseguramos de que siempre se muestre
//  el precio correcto antes de que el usuario confirme su pedido.
//


function actualizarPreciosBD() {
    const carrito = obtenerCarrito();
    if (carrito.length === 0) {
      console.log("El carrito está vacío. No se actualizan precios.");
      return;
    }
    obtenerProductos().then(productos => {
      const productosMap = {};
      productos.forEach(p => {
        productosMap[p.id] = p.precio;
      });

      let preciosActualizados = false;

      carrito.forEach(item => {
        const precioActual = productosMap[item.id];
        if (precioActual && precioActual !== item.precio) {
          console.log(`Actualizando precio de "${item.nombre}" de $${item.precio} a $${precioActual}`);
          item.precio = precioActual;
          preciosActualizados = true;
        }
      });

      if (preciosActualizados) {
        guardarCarrito(carrito);
        renderizarCarrito();
      }
    }).catch(error => {
      console.error("Error al obtener productos para actualizar precios:", error);
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
    actualizarPreciosBD();
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

 // index.html / catálogo: escuchar los botones "Agregar" vía delegación
  // Ya no validamos el length, activamos el listener global directamente
  iniciarListenersProductos();

  // articulo.html: escuchar el botón del detalle (este se puede quedar igual si el HTML es estático)
  if (document.querySelector('.btn-agregar-carrito')) {
    iniciarListenerArticulo();
  }

  if (document.getElementById('checkout-items')) {
    renderizarResumenCheckout();
  }

});
