    function mostrarModalConfirmacion() {
        document.getElementById('modal-confirmacion').style.display = 'flex';
        setTimeout(function() {
            window.location.href = 'index.html';
        }, 5000);
    }

    /* ── Altura dinámica del header para sticky panels ── */
    function actualizarAlturaHeader() {
        const header = document.querySelector('.header');
        if (!header) return;
        const h = header.getBoundingClientRect().height;
        document.documentElement.style.setProperty('--header-height', h + 'px');
    }
    document.addEventListener('DOMContentLoaded', actualizarAlturaHeader);
    window.addEventListener('load', actualizarAlturaHeader); //[cite: 3]
    window.addEventListener('resize', actualizarAlturaHeader); //[cite: 3]




    // ── TOAST ───────────────────────────────────────────
    function mostrarToast(mensaje, tipo = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = mensaje;
        toast.className = `toast toast-${tipo} toast-visible`;
        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(() => {
            toast.className = 'toast';
        }, 3200);
    }

// scripts/scripts.js (o tu archivo JS externo real)

// Usamos el evento 'load' global para asegurarnos de que TODO el HTML
// y los scripts de Supabase ya existan en la memoria del navegador.
window.addEventListener('load', () => {
    const botonMiCuenta = document.getElementById('btn-mi-cuenta');

    if (botonMiCuenta) {
        console.log("🎯 Botón 'Mi cuenta' vinculado con éxito desde el JS externo.");

        botonMiCuenta.addEventListener('click', async (e) => {
            // Frenamos el redireccionamiento por defecto del '#'
            e.preventDefault();

            // Verificación de seguridad por si falló la carga de Supabase
            if (typeof supabaseClient === 'undefined') {
                console.error("Supabase no está disponible. Redirigiendo a login por defecto.");
                window.location.href = 'login.html';
                return;
            }

            try {
                // Le pedimos el usuario actual a Supabase
                const { data: { user }, error } = await supabaseClient.auth.getUser();

                if (user && !error) {
                    // ¡Está logueado! Leemos su rol para saber a dónde mandarlo
                    const userRole = user.user_metadata?.role;
                    
                    if (userRole === 'admin') {
                        window.location.href = 'panel_admin.html';
                    } else {
                        window.location.href = 'panel_usuario.html';
                    }
                } else {
                    // No está logueado, va directo a identificarse
                    window.location.href = 'login.html';
                }
            } catch (err) {
                console.error("Error en la redirección inteligente:", err);
                window.location.href = 'login.html';
            }
        });
    } else {
        console.warn("⚠️ Advertencia: No se encontró el botón con id 'btn-mi-cuenta' en esta página.");
    }
});


window.addEventListener('load', () => {
    const botonCerrarSesion = document.getElementById('btn-cerrarsesion');

    if (botonCerrarSesion) {
        console.log("🎯 Botón 'Cerrar sesión' vinculado con éxito desde el JS externo.");

        botonCerrarSesion.addEventListener('click', async (e) => {
            // Frenamos el redireccionamiento por defecto del '#'
            e.preventDefault();

            // Verificación de seguridad por si falló la carga de Supabase
            if (typeof supabaseClient === 'undefined') {
                console.error("Supabase no está disponible. Redirigiendo a login por defecto.");
                window.location.href = 'login.html';
                return;
            }

            try {
                // Le pedimos el usuario actual a Supabase
                const { data: { user }, error } = await supabaseClient.auth.getUser();

                if (user && !error) {
                    // ¡Está logueado! Procedemos a cerrar sesión
                    await cerrarSesionCliente();
                } else {
                    // No está logueado, va directo a identificarse
                    window.location.href = 'login.html';
                }
            } catch (err) {
                console.error("Error al intentar cerrar sesión:", err);
                window.location.href = 'login.html';
            }
        });
    } else {
        console.warn("⚠️ Advertencia: No se encontró el botón con id 'btn-cerrarsesion' en esta página.");
    }
}); 



//Cargar todos los articulos en el index.html, para luego mostrar solo los que correspondan a cada categoria.

async function obtenerProductos() {
  // Construimos la URL apuntando a la tabla 'producto'
  // El parámetro select permite traer campos de las tablas relacionadas
  const url = `${SUPABASE_URL}/rest/v1/producto?select=*,categoria_producto(nombre),estado_producto(nombre)`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Error en la petición: ${response.statusText}`);
    }

    const productos = await response.json();
    console.log('Productos obtenidos:', productos);
  
    return productos;
  
  } catch (error) {
    console.error('Error al conectar con Supabase:', error);
  }
}

function renderArticulos(lista) {
  const productos_grid = document.getElementById('p-grid');

  if (!productos_grid) {
    console.log("No se encontró 'p-grid' en esta página. No se renderizan artículos.");
    return; 
  }

  if (!lista || !lista.length) {
    productos_grid.innerHTML = '';
    return;
  }

  productos_grid.innerHTML = lista.map(p => {
    // 💡 Extraemos de forma segura el nombre de la categoría y del estado.
    // Usamos el operador '?.' para evitar errores si por alguna razón la relación viene null.
    const nombreCategoria = p.categoria_producto?.nombre || 'Sin categoría';
    const idCategoria = p.categoria_producto?.id;

    return `
        <article class="producto-card"
            data-id="${p.id}" 
            data-nombre="${p.nombre}"
            data-precio="${p.precio}" 
            data-unidad="unidad"
            data-imagen="${p.imagen_ppal || `img/placeholder_${nombreCategoria}.png`}">
            
            <a href="articulo.html">
            <div class="producto-imagen">
                <img src="${p.imagen_ppal || `img/placeholder_${nombreCategoria}.png`}" alt="${p.nombre}">
                <span class="categoria">${nombreCategoria}</span>
            </div>
            </a>
            
            <div class="producto-info">
            <h3>${p.nombre}</h3>
            <p class="descripcion">${p.descripcion || 'Sin descripción.'}</p>
            <div class="producto-footer">
                <div class="precio-wrapper">
                <span class="precio">$${p.precio?.toLocaleString('es-AR')}</span>
                <span class="unidad-medida">x unidad</span>
                </div>
                
                <button class="btn-agregar">Agregar</button>
            </div>
            </div>
        </article>
        `;
    }).join('');
}

function mostrarModalConfirmacion() {
    localStorage.removeItem('fueguito_carrito');
    localStorage.removeItem('fueguito_descuento');
    
    if (typeof actualizarBadge === 'function') {
        actualizarBadge();
    }

    document.getElementById('modal-confirmacion').style.display = 'flex';
    
    setTimeout(function() {
        window.location.href = 'index.html';
    }, 5000);
}


document.addEventListener('DOMContentLoaded', async () => {

  renderArticulos(await obtenerProductos());
 
});