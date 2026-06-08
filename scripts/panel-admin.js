  verificarAdmin(); // 👈 esto va primero, antes de todo lo demás

  let productos = []; // 🔴 LA CORRECCIÓN: Nace vacía acá arriba para que sea GLOBAL
  let editandoId = null;

  //TREAER FILTROS DESDE SUPABASE
async function cargarFiltros() {
  // 1. Capturamos los selectores de la Barra de Herramientas (Filtros)
  const selectFiltroCategoria = document.getElementById('filtro-categoria');
  const selectFiltroEstado = document.getElementById('filtro-estado');

  // 2. Capturamos también los selectores del Modal (Alta/Edición)
  const selectModalCategoria = document.getElementById('p-categoria');
  const selectModalEstado = document.getElementById('p-estado');

  const urlCategorias = `${SUPABASE_URL}/rest/v1/categoria_producto?select=id,nombre`;
  const urlEstados = `${SUPABASE_URL}/rest/v1/estado_producto?select=id,nombre`;

  try {
    // --- PETICIÓN DE CATEGORÍAS ---
    const responseCategorias = await fetch(urlCategorias, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    if (!responseCategorias.ok) throw new Error('No se pudieron obtener las categorías');
    const categorias = await responseCategorias.json();

    // --- PETICIÓN DE ESTADOS ---
    const responseEstados = await fetch(urlEstados, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    if (!responseEstados.ok) throw new Error('No se pudieron obtener los estados');
    const estados = await responseEstados.json();


    // 3. POBLAMOS SELECTORES DE CATEGORÍAS (Toolbar y Modal)
    if (selectFiltroCategoria) {
      selectFiltroCategoria.innerHTML = '<option value="">Todas las categorías</option>';
      categorias.forEach(cat => {
        selectFiltroCategoria.innerHTML += `<option value="${cat.id}">${cat.nombre}</option>`;
      });
    }
    // 🟢 NUEVO: Aprovechamos los mismos datos para el modal de alta/edición
    if (selectModalCategoria) {
      selectModalCategoria.innerHTML = '<option value="">Selecciona una categoría...</option>';
      categorias.forEach(cat => {
        selectModalCategoria.innerHTML += `<option value="${cat.id}">${cat.nombre}</option>`;
      });
    }


    // 4. POBLAMOS SELECTORES DE ESTADOS (Toolbar y Modal)
    if (selectFiltroEstado) {
      selectFiltroEstado.innerHTML = '<option value="">Todos los estados</option>';
      estados.forEach(est => {
        selectFiltroEstado.innerHTML += `<option value="${est.id}">${est.nombre}</option>`;
      });
    }
    // 🟢 NUEVO: Aprovechamos los mismos datos para el modal de alta/edición
    if (selectModalEstado) {
      selectModalEstado.innerHTML = '<option value="">Selecciona un estado...</option>';
      estados.forEach(est => {
        selectModalEstado.innerHTML += `<option value="${est.id}">${est.nombre}</option>`;
      });
    }

  } catch (error) {
    console.error('Error general al cargar los filtros del sistema:', error);
  }
}

//TREAER PRODUCTOS DESDE SUPABASE
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

  /* ─── HELPERS ─── */
  function formatPrecio(v) {
    return '$' + Number(v).toLocaleString('es-AR');
  }

  function stockClass(s) {
    if (s === 0) return 'stock-zero';
    if (s <= 10) return 'stock-low';
    return 'stock-ok';
  }

  function badgeEstado(e) {
    const map = {
      'activo':    '<span class="badge badge-activo">Activo</span>',
      'inactivo':  '<span class="badge badge-inactivo">Inactivo</span>',
      'sin-stock': '<span class="badge badge-sin-stock">Sin stock</span>',
    };
    return map[e] || e;
  }

  /* ─── RENDER ─── */
function renderTabla(lista) {
  const tbody = document.getElementById('tabla-productos');
  const empty = document.getElementById('empty-state');
  const count = document.getElementById('product-count');

  if (!lista || !lista.length) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    count.textContent = '';
    return;
  }

  empty.style.display = 'none';
  count.textContent = `${lista.length} producto${lista.length !== 1 ? 's' : ''}`;

  tbody.innerHTML = lista.map(p => {
    // 💡 Extraemos de forma segura el nombre de la categoría y del estado.
    // Usamos el operador '?.' para evitar errores si por alguna razón la relación viene null.
    const nombreCategoria = p.categoria_producto?.nombre || 'Sin categoría';
    const nombreEstado = p.estado_producto?.nombre || 'Inactivo';

    return `
      <tr>
        <td>
          <div class="product-name-cell">
            <div class="td-icon"><i class="fa-solid fa-fire-flame-curved"></i></div>
            <strong>${p.nombre}</strong>
          </div>
        </td>
        <td><span class="badge badge-categoria">${nombreCategoria}</span></td>
        <td style="font-weight:700">${formatPrecio(p.precio)}</td>
        <td>
          <span class="${stockClass(p.stock)}">${p.stock}</span> 
          <span style="font-size:0.8rem;color:var(--gray)">uds.</span>
        </td>
        <td>${badgeEstado(nombreEstado)}</td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn-small btn-primary" onclick="editarProducto(${p.id})">
              <i class="fa-solid fa-pen"></i> Editar
            </button>
            <button class="btn-small btn-ghost" onclick="eliminarProducto(${p.id})">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filtrarProductos() {
  const q = document.getElementById('buscador').value.toLowerCase().trim();
  const catValue = document.getElementById('filtro-categoria').value;
  const estValue = document.getElementById('filtro-estado').value;

  const catIdSelected = catValue !== "" ? parseInt(catValue) : null;
  const estIdSelected = estValue !== "" ? parseInt(estValue) : null;

    const filtrados = productos.filter(p => {
    const nombreProducto = p.nombre ? p.nombre.toLowerCase() : '';
    const nombreCategoria = p.categoria_producto?.nombre ? p.categoria_producto.nombre.toLowerCase() : '';
    
    const matchQ = nombreProducto.includes(q) || nombreCategoria.includes(q);
    
    const matchCat = catIdSelected === null || parseInt(p.categoria_id) === catIdSelected;
    const matchEst = estIdSelected === null || parseInt(p.estado_id) === estIdSelected;
    
    return matchQ && matchCat && matchEst;
  });

  //console.log(`Filtros -> Cat Seleccionada: ${catIdSelected} | Productos que sobrevivieron: ${filtrados.length}`);

  renderTabla(filtrados);
}

/* ─── MODAL ─── */
async function editarProducto(id) {
  // 1. Definimos la URL de Supabase para este ID específico
  const url = `${SUPABASE_URL}/rest/v1/producto?id=eq.${id}&select=*,categoria_producto(nombre),estado_producto(nombre)`;
  
  try {
    // 2. Hacemos la petición real a la base de datos
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error('No se pudo obtener el producto');

    const datos = await response.json();
    
    const producto = datos[0]; 

    if (!producto) {
      alert('Producto no encontrado');
      return;
    }

    // 3. Guardamos el ID que estamos editando en tu variable global
    editandoId = id; 
    
    // Extraemos los nombres de las relaciones con el resguardo por si son null
    const nombreCategoria = producto.categoria_producto?.nombre || 'Sin categoría';
    const nombreEstado = producto.estado_producto?.nombre || 'Inactivo';

    // 4. Rellenamos el formulario del modal con los datos reales de 'producto'
    document.getElementById('p-nombre').value      = producto.nombre || '';
    document.getElementById('p-precio').value      = producto.precio || 0;
    document.getElementById('p-stock').value       = producto.stock || 0;
    document.getElementById('p-descripcion').value = producto.descripcion || '';
    
    // Rellenamos los Selectores (vinculados a tus FK y estados)
    document.getElementById('p-categoria').value   = producto.categoria_id || '';
    document.getElementById('p-estado').value      = producto.estado_id || '';

    // NUEVOS CAMPOS: Rellenamos la URL de la imagen
    document.getElementById('p-imagen').value      = producto.imagen_ppal || '';

    // Primero desmarcamos todos los checkboxes por seguridad
    document.querySelectorAll('input[name="p-caracteristicas"]').forEach(cb => cb.checked = false);

    // Si el producto viene con características guardadas (array), las tildamos en el modal
    if (producto.caracteristicas && Array.isArray(producto.caracteristicas)) {
      document.querySelectorAll('input[name="p-caracteristicas"]').forEach(cb => {
        if (producto.caracteristicas.includes(cb.value)) {
          cb.checked = true;
        }
      });
    }
    
    // 5. Finalmente, abrimos el modal
    abrirModal();

  } catch (error) {
    console.error('Error al cargar datos del producto para editar:', error);
    alert('Hubo un error al conectar con la base de datos.');
  }
}
  function abrirModal() {
    document.getElementById('modal-producto').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

function abrirModalAlta() {
    editandoId = null;
    document.getElementById('modal-titulo').textContent = 'Nuevo Producto';
    limpiarForm();
    abrirModal();
  }

  function cerrarModal() {
    document.getElementById('modal-producto').classList.remove('open');
    document.body.style.overflow = '';
  }

  function limpiarForm() {
    ['p-nombre','p-precio','p-stock','p-descripcion'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('p-categoria').value = '';
    document.getElementById('p-estado').value    = 'activo';
    document.getElementById('p-imagen').value = '';
  document.querySelectorAll('input[name="p-caracteristicas"]').forEach(cb => {
    cb.checked = false;
    });
  }

  /* ─── GUARDAR ─── */
 async function guardarProducto(event) {
    // Evitamos que la página se recargue (comportamiento por defecto de los formularios)
    if (event) event.preventDefault();

    // 1. Capturamos los valores directamente desde los inputs del modal
    const nombre = document.getElementById('p-nombre').value.trim();
    const precio = parseFloat(document.getElementById('p-precio').value) || 0;
    const stock = parseInt(document.getElementById('p-stock').value) || 0;
    const categoria_id = parseInt(document.getElementById('p-categoria').value) || null;
    const estado_id = parseInt(document.getElementById('p-estado').value) || null;
    const descripcion = document.getElementById('p-descripcion').value.trim();
    const imagen_ppal = document.getElementById('p-imagen').value.trim() || null;
    const caracteristicas = Array.from(document.querySelectorAll('input[name="p-caracteristicas"]:checked')).map(cb => cb.value);

    // Validación básica por si se olvidan del nombre
    if (!nombre) {
        alert('El nombre del producto es obligatorio.');
        return;
    }

    // 2. Armamos el objeto con los datos estructurados para Supabase
    const productoData = {
        nombre,
        precio,
        stock,
        categoria_id,
        estado_id,
        descripcion,
        imagen_ppal,
        caracteristicas 
    };

    // 3. Definimos variables dinámicas según si editamos o creamos
    let url = `${SUPABASE_URL}/rest/v1/producto`;
    let metodo = 'POST'; 

    if (editandoId) {
        metodo = 'PATCH';
        url += `?id=eq.${editandoId}`; 
    }

    try {
        // 4. Ejecutamos la petición HTTP
        const response = await fetch(url, {
            method: metodo,
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation' 
            },
            body: JSON.stringify(productoData)
        });

        if (!response.ok) {
            throw new Error(`Error al guardar: ${response.statusText}`);
        }

        // 5. Todo salió bien: Cerramos, limpiamos y refrescamos la interfaz
        alert(editandoId ? '¡Producto actualizado con éxito!' : '¡Producto creado con éxito!');
        
        cerrarModal(); 

        // Primero actualizamos nuestra memoria RAM global trayendo los 40 productos frescos de Supabase
        productos = await obtenerProductos(); 
        
        // Segundo: En vez de llamar a renderTabla directo, llamamos a filtrarProductos().
        // Esto hace que la tabla se redibuje con el producto editado, pero sin romper 
        // la búsqueda o el filtro de categorías que el admin tenga puesto en ese instante.
        filtrarProductos(); 
        
    } catch (error) {
        console.error('Error en guardarProducto:', error);
        alert('Hubo un error al intentar guardar el producto.');
    }
}

  /* ─── ELIMINAR ─── */
  async function eliminarProducto(id) {
    if (!confirm('¿Confirmás que querés eliminar este producto?')) return;

        let url = `${SUPABASE_URL}/rest/v1/producto`;
        url += `?id=eq.${id}`; // Le indicamos a Supabase QUÉ fila eliminar
   
        try {
        const response = await fetch(url, {
        method: 'DELETE',
        headers: {   
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
        }
        }); 
    } catch (error) {
        console.error('Error al eliminar el producto:', error);
        alert('Hubo un error al intentar eliminar el producto.');
    } 
    alert('Producto eliminado con éxito!');
    productos = await obtenerProductos(); 
    filtrarProductos();
  }       

  /* ─── CERRAR MODAL AL CLICK EN OVERLAY ─── */
  document.getElementById('modal-producto').addEventListener('click', function(e) {
    if (e.target === this) cerrarModal();
  });

 /* ─── INIT ─── */
document.addEventListener('DOMContentLoaded', async () => {
  
  // 1. Una sola función carga e hidrata los 4 selectores de toda la página en paralelo
  await cargarFiltros(); 
  
  // 2. Guardamos los productos en la RAM global
  productos = await obtenerProductos(); 
  
  // 3. Renderizamos la tabla inicial
  renderTabla(productos);

});

