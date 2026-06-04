document.addEventListener('DOMContentLoaded', async () => {
    // 1. Capturamos el ID que viene en la URL
    const params = new URLSearchParams(window.location.search);
    const productoId = parseInt(params.get('id'));

    // 🔴 VALIDACIÓN PRIMERO: Si no hay ID válido, cortamos y volvemos al index
    if (!productoId || isNaN(productoId)) {
        console.error("ID de producto no válido en la URL.");
        window.location.href = 'index.html';
        return;
    }

    // 2. Armamos la URL para pedirle a Supabase el producto principal
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

        // 🔴 6. LLAMADO DE RELACIONADOS: Ahora que 'producto' existe de forma segura,
        // ejecutamos la función pasándole sus atributos reales
        await cargarProductosRelacionados(producto.categoria_id, producto.id);

    } catch (error) {
        console.error('Error en articulo-detalle.js:', error);
        document.getElementById('det-nombre').textContent = 'Producto no encontrado';
    }
});


async function cargarProductosRelacionados(categoriaId, productoIdActual) {
    const gridRelacionados = document.getElementById('relacionados-grid');
    if (!gridRelacionados) return;

    // 1. Petición filtrada a Supabase (mismo categoria_id, distinto id actual, máximo 4)
    const url = `${SUPABASE_URL}/rest/v1/producto?categoria_id=eq.${categoriaId}&id=neq.${productoIdActual}&limit=4&select=*,categoria_producto(nombre)`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Error al traer productos relacionados');

        const relacionados = await response.json();

        // Si es el único producto de la categoría, ocultamos la sección para que no quede vacía
        if (relacionados.length === 0) {
            const seccionRelacionados = document.getElementById('productos-relacionados');
            if (seccionRelacionados) seccionRelacionados.style.display = 'none';
            return;
        }

        // 2. Mapeamos el array inyectando exactamente tu estructura CSS
        gridRelacionados.innerHTML = relacionados.map(p => `
            <a href="articulo.html?id=${p.id}" style="text-decoration: none; color: inherit;">
                <article class="producto-card">
                    <div class="producto-imagen">
                        <img src="${p.imagen_ppal || `img/placeholder_${p.categoria_producto?.nombre}.png`}" alt="${p.nombre}">
                        <span class="categoria">${p.categoria_producto?.nombre || 'General'}</span>
                    </div>
                    <div class="producto-info">
                        <h3>${p.nombre}</h3>
                        <div class="producto-footer">
                            <div class="precio-wrapper">
                                <span class="precio">${typeof formatPrecio === 'function' ? formatPrecio(p.precio) : '$' + p.precio}</span>
                                <span class="unidad-medida">x ${p.unidad || 'un.'}</span>
                            </div>
                        </div>
                    </div>
                </article>
            </a>
        `).join('');

    } catch (error) {
        console.error('Error en cargarProductosRelacionados:', error);
    }
}

