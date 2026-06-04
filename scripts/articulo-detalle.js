document.addEventListener('DOMContentLoaded', async () => {
    // 1. Capturamos el ID que viene en la URL de la barra de navegación (ej: ?id=3)
    const params = new URLSearchParams(window.location.search);
    const productoId = parseInt(params.get('id'));

    // Si no hay ID en la URL, cortamos la ejecución o redirigimos al index
    if (!productoId || isNaN(productoId)) {
        console.error("ID de producto no válido en la URL.");
        window.location.href = 'index.html';
        return;
    }

    // 2. Armamos la URL para pedirle a Supabase un único producto filtrado por ID
    // Usamos select=*,categoria_producto(nombre) para traernos el string real de la categoría asociada
    const url = `${SUPABASE_URL}/rest/v1/producto?id=eq.${productoId}&select=*,categoria_producto(nombre)`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Accept': 'application/vnd.pgrst.object+json' // Le dice a Supabase que devuelva un Objeto directo y no un Array de un solo elemento
            }
        });

        if (!response.ok) {
            throw new Error(`Error al obtener el detalle del producto: ${response.statusText}`);
        }

        const producto = await response.json();

        // 3. Pintamos los datos básicos en el HTML que preparamos en el Paso 1
        document.getElementById('det-nombre').textContent = producto.nombre;
        document.getElementById('det-descripcion').textContent = producto.descripcion || 'Sin descripción disponible.';
        document.getElementById('det-categoria').textContent = producto.categoria_producto?.nombre || 'General';
        document.getElementById('det-unidad').textContent = producto.unidad ? `x ${producto.unidad}` : 'x unidad';
        
        // Usamos la imagen que guardamos en la base, o un placeholder si está vacía
        document.getElementById('det-imagen').src = producto.imagen_ppal || `img/placeholder_${producto.categoria_producto?.nombre}.png`;
        document.getElementById('det-imagen').alt = producto.nombre;

        // Formateamos el precio usando tu función global de cart.js
        if (typeof formatPrecio === 'function') {
            document.getElementById('det-precio').textContent = formatPrecio(producto.precio);
        } else {
            document.getElementById('det-precio').textContent = `$${Math.round(producto.precio)}`;
        }

        // 4. Mapeamos e inyectamos las características con sus respectivos íconos de FontAwesome
        const ulCaracteristicas = document.getElementById('det-caracteristicas');
        ulCaracteristicas.innerHTML = ''; // Limpiamos el contenedor por las dudas

        // Diccionario para saber qué ícono gráfico corresponde a cada string de tu base de datos
        const mapaIconos = {
            'Corte premium': 'fa-star',
            'Fresco del día': 'fa-leaf',
            'Embalaje al vacío': 'fa-bag-shopping',
            'Producción Artesanal': 'fa-award'
        };

        if (producto.caracteristicas && Array.isArray(producto.caracteristicas)) {
            producto.caracteristicas.forEach(texto => {
                const icono = mapaIconos[texto] || 'fa-check'; // Un check por defecto si agregás otro texto
                const li = document.createElement('li');
                li.innerHTML = `<i class="fa-solid ${icono}"></i> ${texto}`;
                ulCaracteristicas.appendChild(li);
            });
        }

        // 5. Inyectamos dinámicamente el botón de compra con los data attributes reales actualizados
        const wrapperBtn = document.getElementById('wrapper-btn-agregar');
        wrapperBtn.innerHTML = `
            <button class="btn-agregar-carrito"
                data-id="${producto.id}"
                data-nombre="${producto.nombre}"
                data-precio="${producto.precio}"
                data-unidad="${producto.unidad || 'unidad'}"
                data-imagen="${producto.imagen_ppal || 'img/carne.jpg'}">
                <i class="fa-solid fa-cart-shopping"></i>
                Agregar al Carrito
            </button>
        `;

        // 6. Volvemos a inicializar el listener del botón que tenés programado en el PASO 13 de tu cart.js
        if (typeof iniciarListenerArticulo === 'function') {
            iniciarListenerArticulo();
        }

    } catch (error) {
        console.error('Error en articulo-detalle.js:', error);
        document.getElementById('det-nombre').textContent = 'Producto no encontrado';
    }
});