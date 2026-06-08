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

async function obtenerNombreUsuario() {
    // 1. Le pedimos a Supabase el objeto del usuario actual en sesión
    const { data: { user }, error } = await supabaseClient.auth.getUser();

    if (error) {
        console.error('Error al obtener el usuario:', error.message);
        return null;
    }

    // 2. Si hay un usuario logueado, procesamos su interfaz
    if (user) {
        const iconMiCuenta = document.getElementById('icon-mi-cuenta');
        const spanMiCuenta = document.getElementById('span-mi-cuenta');

        // Capturamos el nombre real
        const nombre = user.user_metadata?.nombre || 'Hola ' + user.user_metadata?.full_name || 'Usuario';

        // Cambiamos el ícono a usuario logueado
        if (iconMiCuenta) {
            iconMiCuenta.className = "fa-solid fa-user"; 
        }

        if (spanMiCuenta) {
            spanMiCuenta.textContent = nombre;
        }
        
        return nombre; // Retorna el string por si otra función lo necesita

    } else {
        console.log('No hay ningún usuario con sesión activa.');
        return null;
    }
}

// Usamos el evento 'load' global para asegurarnos de que TODO el HTML
// y los scripts de Supabase ya existan en la memoria del navegador.
window.addEventListener('load', () => {
    const botonMiCuenta = document.getElementById('btn-mi-cuenta');    
    
    if (botonMiCuenta) {

        console.log("🎯 Botón 'Mi cuenta' vinculado con éxito desde el JS externo.");

        botonMiCuenta.addEventListener('click', async (e) => {
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
    //console.error("No se encontró el contenedor para los productos con id 'p-grid'.");
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
            
            <a href="articulo.html?id=${p.id}">
            <div class="producto-imagen">
                <img src="${p.imagen_ppal || `img/placeholder_${nombreCategoria}.png`}" alt="${p.descripcion || 'Sin descripción.'}">
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

// ── LÓGICA DE FILTRADO DE PRODUCTOS ──
// Esta sección se encarga de traer las categorías desde Supabase, inyectar los botones de filtro en el HTML,
// y escuchar los clics para filtrar el catálogo en tiempo real sin recargar la página.

async function traerCategorias() {
    const contenedorDesktop = document.getElementById('filtros-productos');
    const contenedorMobile = document.getElementById('filtrosDropdownMenu');
    
    const urlCategorias = `${SUPABASE_URL}/rest/v1/categoria_producto?select=id,nombre`;

    try {
        const response = await fetch(urlCategorias, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });

        if (!response.ok) throw new Error('No se pudieron obtener las categorías para el catálogo');
        const categorias = await response.json();

        // 1. POBLAR VISTA DESKTOP
        if (contenedorDesktop) {
            // Reiniciamos dejando solo la opción predeterminada de "Todos"
            contenedorDesktop.innerHTML = '<li><a href="#todos" class="filter-btn active" data-id="todos">Todos</a></li>';
            
            categorias.forEach(cat => {
                // Creamos un slug amigable para el href (ej: "Carnes" -> "carnes")
                const slug = cat.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                
                contenedorDesktop.innerHTML += `
                    <li>
                        <a href="#${slug}" class="filter-btn" data-id="${cat.id}">${cat.nombre}</a>
                    </li>
                `;
            });
        }

        // 2. POBLAR VISTA MOBILE
        if (contenedorMobile) {
            // Reiniciamos dejando solo la opción predeterminada de "Todos"
            contenedorMobile.innerHTML = '<li><a href="#todos" class="filtro-option active" data-label="Todos" data-id="todos">Todos</a></li>';
            
            categorias.forEach(cat => {
                const slug = cat.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                
                contenedorMobile.innerHTML += `
                    <li>
                        <a href="#${slug}" class="filtro-option" data-label="${cat.nombre}" data-id="${cat.id}">${cat.nombre}</a>
                    </li>
                `;
            });
        }

        //Ejecutar nuevamente la función que escucha los clics de los filtros recién cargados.
        if (typeof iniciarListenersFiltros === 'function') {
            iniciarListenersFiltros();
        }

    } catch (error) {
        console.error('Error al obtener las categorías:', error);
    }
}

// --- FIN LÓGICA DE FILTRADO DE PRODUCTOS ---

// --- LÓGICA DE FILTRADO DE PRODUCTOS ---
// Esta función se encarga de iniciar los listeners de los filtros, tanto para desktop como para mobile.

function iniciarListenersFiltros() {
    const contenedorDesktop = document.getElementById('filtros-productos');
    const contenedorMobile = document.getElementById('filtrosDropdownMenu');
    const btnMobile = document.getElementById('btnFiltrosMobile');
    const filtroSeleccionadoTxt = document.getElementById('filtroSeleccionado');

    // --- 1. LÓGICA PARA DESKTOP ---
    if (contenedorDesktop) {
        contenedorDesktop.addEventListener('click', (e) => {
            // Buscamos si el clic fue en un enlace de filtro
            const targetLink = e.target.closest('.filter-btn');
            if (!targetLink) return;

            e.preventDefault(); // Evitamos que el # hash altere la barra de direcciones de golpe

            // Quitamos la clase 'active' de todos los botones de desktop
            contenedorDesktop.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            // Se la ponemos al que clickeamos
            targetLink.classList.add('active');

            // Capturamos el ID (puede ser "todos" o un número entero)
            const categoriaId = targetLink.dataset.id;
            
            // Sincronizamos la vista mobile por las dudas (buena práctica si achican la pantalla)
            sincronizarFiltroMobile(categoriaId, targetLink.textContent);

            // 🔴 DISPARAMOS EL FILTRADO REAL
            ejecutarFiltroCatalogo(categoriaId);
        });
    }

    // --- 2. LÓGICA PARA MOBILE (Dropdown) ---
    if (contenedorMobile && btnMobile) {
        // Toggle del menú desplegable al tocar el botón principal de mobile
        btnMobile.addEventListener('click', (e) => {
            e.stopPropagation(); // Evita que el click se propague
            contenedorMobile.classList.toggle('active'); // O la clase CSS que uses para mostrar el dropdown
        });

        contenedorMobile.addEventListener('click', (e) => {
            const targetOption = e.target.closest('.filtro-option');
            if (!targetOption) return;

            e.preventDefault();

            // Actualizamos clases visuales en mobile
            contenedorMobile.querySelectorAll('.filtro-option').forEach(opt => opt.classList.remove('active'));
            targetOption.classList.add('active');

            // Cambiamos el texto del botón desplegable por la opción elegida
            if (filtroSeleccionadoTxt) {
                filtroSeleccionadoTxt.textContent = targetOption.dataset.label;
            }

            // Cerramos el menú desplegable
            contenedorMobile.classList.remove('active');

            const categoriaId = targetOption.dataset.id;

            // Sincronizamos la vista desktop
            sincronizarFiltroDesktop(categoriaId);

            // 🔴 DISPARAMOS EL FILTRADO REAL
            ejecutarFiltroCatalogo(categoriaId);
        });

        // Cerrar el dropdown si hacen clic en cualquier otra parte de la pantalla
        document.addEventListener('click', () => {
            contenedorMobile.classList.remove('active');
        });
    }
}

// --- FIN LÓGICA DE FILTRADO DE PRODUCTOS Y ANIMACION DROP DE FILTROS MOBILE---

// --- FUNCIONES AUXILIARES DE SINCRONIZACIÓN ---
// Dropdown filtros mobile
   
    const btnFiltros = document.getElementById('btnFiltrosMobile');
    const menuFiltros = document.getElementById('filtrosDropdownMenu');
    const labelFiltro = document.getElementById('filtroSeleccionado');

    btnFiltros.addEventListener('click', function (e) {
      e.stopPropagation();
      menuFiltros.classList.toggle('open');
      btnFiltros.classList.toggle('abierto');
    });

    document.querySelectorAll('.filtro-option').forEach(function (link) {
      link.addEventListener('click', function () {
        document.querySelectorAll('.filtro-option').forEach(function (l) { l.classList.remove('active'); });
        link.classList.add('active');
        labelFiltro.textContent = link.dataset.label;
        menuFiltros.classList.remove('open');
        btnFiltros.classList.remove('abierto');
      });
    });

// estas funciones sincronizan el estado de los filtros entre la vista desktop y 
// mobile para que siempre reflejen la misma categoría seleccionada, independientemente de dónde se haya hecho clic.

function sincronizarFiltroMobile(id, texto) {
    const contenedorMobile = document.getElementById('filtrosDropdownMenu');
    const filtroSeleccionadoTxt = document.getElementById('filtroSeleccionado');
    if (!contenedorMobile) return;
    
    contenedorMobile.querySelectorAll('.filtro-option').forEach(opt => {
        if (opt.dataset.id === id) opt.classList.add('active');
        else opt.classList.remove('active');
    });
    if (filtroSeleccionadoTxt) filtroSeleccionadoTxt.textContent = texto;
}

function sincronizarFiltroDesktop(id) {
    const contenedorDesktop = document.getElementById('filtros-productos');
    if (!contenedorDesktop) return;

    contenedorDesktop.querySelectorAll('.filter-btn').forEach(btn => {
        if (btn.dataset.id === id) btn.classList.add('active');
        else btn.classList.remove('active');
    });
}
// --- FIN FUNCIONES AUXILIARES ---

// --- FUNCIÓN PRINCIPAL DE FILTRADO ---

function ejecutarFiltroCatalogo(categoriaId) {
    // Si categoriaId es "todos", el array filtrado es exactamente igual al array original
    // Si no, filtramos numéricamente comparando p.categoria_id contra el ID del botón
    const productosFiltrados = categoriaId === "todos" 
        ? productos 
        : productos.filter(p => parseInt(p.categoria_id) === parseInt(categoriaId));

    // 🕵️‍♂️ LOG DE CONTROL: Para que veas en la consola cuántos cortes sobrevivieron
    // console.log(`Filtrando catálogo. Categoría elegida: ${categoriaId} | Sobrevivieron: ${productosFiltrados.length} productos.`);

    // Llamamos a tu función encargada de dibujar las tarjetas en el index.html
    // Asegurate de pasarle el array filtrado. 
    if (typeof renderArticulos === 'function') {
        renderArticulos(productosFiltrados);
    } else {
        console.warn("⚠️ No se encontró la función encargada de renderizar las tarjetas del catálogo.");
    }
}

// --- FIN LÓGICA DE FILTRADO ---


document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 1. Vamos a buscar las categorías a Supabase e inyectamos los botones.
        // Al final de 'traerCategorias()', esta llamará automáticamente a 'iniciarListenersFiltros()'
        await traerCategorias();

        // 2. Traemos los productos listos para la venta desde Supabase (solo los activos)
        // Reutilizá tu fetch de productos agregando el filtro de estado si corresponde
        productos = await await obtenerProductos(); 

        // 3. Dibujamos la grilla inicial con los 40 productos
        if (typeof renderArticulos === 'function') { //el typeof es para evitar errores si por alguna razón tu función se llama diferente o no se cargó bien.
            renderArticulos(productos);
        }

        await obtenerNombreUsuario();

    } catch (error) {
        console.error('Error al inicializar la tienda:', error);
    }
});



//document.addEventListener('DOMContentLoaded', async () => {
//
//  renderArticulos(await obtenerProductos());
//  traerCategorias();
//
//});