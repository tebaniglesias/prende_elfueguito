  verificarAdmin(); // 👈 esto va primero, antes de todo lo demás
  
  //TRAER CATEGORIAS DESDE SUPABASE
  async function obtenerCategorias() {
    const url = `${SUPABASE_URL}/rest/v1/categoria_producto?select=*`;

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

      const categorias = await response.json();
      console.log('Categorías obtenidas:', categorias);
      // Aquí puedes llamar a una función para renderizar las categorías en el formulario
      return categorias;

    } catch (error) {
      console.error('Error al conectar con Supabase:', error);
    }
  }
  // Función para renderizar las categorías en el <select> p-categoria del formulario
  function renderSelectCategorias(categorias) {
  const select = document.getElementById('p-categoria');
  if (!select) return;

  // Si 'categorias' no es un array válido (es undefined), salimos de la función sin tirar error
  if (!categorias || !Array.isArray(categorias)) {
    console.error("renderSelectCategorias no pudo ejecutarse porque no recibió un Array válido.");
    select.innerHTML = '<option value="">Error al cargar categorías</option>';
    return;
  }

  // Si es un array, continúa el flujo normal...
  select.innerHTML = '<option value="">Seleccione una categoría...</option>';
  select.innerHTML += categorias.map(cat => `
    <option value="${cat.id}">${cat.nombre}</option>
  `).join('');
}

  //TREAER ESTADOS DESDE SUPABASE
  async function obtenerEstados() {
    const url = `${SUPABASE_URL}/rest/v1/estado_producto?select=*`;

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

      const estados = await response.json();
      console.log('Estados obtenidos:', estados);
      return estados;
    } catch (error) {
      console.error('Error al conectar con Supabase:', error);
    }
  }
  // Función para renderizar los estados en el <select> p-estado del formulario
    function renderSelectEstados(estados) {
    const select = document.getElementById('p-estado');
    if (!select) return;

    // Si 'estados' no es un array válido (es undefined), salimos de la función sin tirar error
    if (!estados || !Array.isArray(estados)) {
        console.error("renderSelectEstados no pudo ejecutarse porque no recibió un Array válido.");
        select.innerHTML = '<option value="">Error al cargar estados</option>';
        return;
    }

    // Si es un array, continúa el flujo normal...
    select.innerHTML = '<option value="">Seleccione un estado...</option>';
    select.innerHTML += estados.map(estado => `
        <option value="${estado.id}">${estado.nombre}</option>
    `).join('');
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

  let editandoId = null;

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
    const q   = document.getElementById('buscador').value.toLowerCase();
    const cat = document.getElementById('filtro-categoria').value;
    const est = document.getElementById('filtro-estado').value;

    const filtrados = productos.filter(p => {
      const matchQ   = p.nombre.toLowerCase().includes(q) || p.categoria.toLowerCase().includes(q);
      const matchCat = !cat || p.categoria === cat;
      const matchEst = !est || p.estado === est;
      return matchQ && matchCat && matchEst;
    });

    renderTabla(filtrados);
}

  /* ─── MODAL ─── */
  function abrirModalAlta() {
    editandoId = null;
    document.getElementById('modal-titulo').textContent = 'Nuevo Producto';
    limpiarForm();
    abrirModal();
  }

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
    
    // Como Supabase devuelve un array, el producto que buscamos es el primer elemento [0]
    const p = datos[0]; 

    if (!p) {
      alert('Producto no encontrado');
      return;
    }

    // 3. Guardamos el ID que estamos editando en tu variable global
    editandoId = id; 
    
    // Extraemos los nombres de las relaciones con el resguardo por si son null
    const nombreCategoria = p.categoria_producto?.nombre || 'Sin categoría';
    const nombreEstado = p.estado_producto?.nombre || 'Inactivo';

    // 4. Rellenamos el formulario del modal con los datos reales de 'p'
    document.getElementById('modal-titulo').textContent = 'Editar Producto';
    document.getElementById('p-nombre').value      = p.nombre;
    document.getElementById('p-precio').value      = p.precio;
    document.getElementById('p-stock').value       = p.stock;
    document.getElementById('p-descripcion').value = p.descripcion || '';
    
    // 💡 NOTA SOBRE LOS SELECTS (Categoría y Estado):
    // Si tus <select> en el HTML usan IDs numéricos como value (ej: <option value="1">Carnes</option>),
    // te conviene asignar el ID directamente en lugar del nombre de texto:
    document.getElementById('p-categoria').value   = p.categoria_id; 
    document.getElementById('p-estado').value      = p.estado_id;

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

  function cerrarModal() {
    document.getElementById('modal-producto').classList.remove('open');
    document.body.style.overflow = '';
  }

  function limpiarForm() {
    ['p-nombre','p-precio','p-stock','p-descripcion'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('p-categoria').value = '';
    document.getElementById('p-estado').value    = 'activo';
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
        descripcion
    };

    // 3. Definimos variables dinámicas según si editamos o creamos
    let url = `${SUPABASE_URL}/rest/v1/producto`;
    let metodo = 'POST'; // Por defecto asumimos que es NUEVO

    // Si 'editandoId' tiene un valor, cambiamos la estrategia a EDICIÓN
    if (editandoId) {
        metodo = 'PATCH';
        url += `?id=eq.${editandoId}`; // Le indicamos a Supabase QUÉ fila actualizar
    }

    try {
        // 4. Ejecutamos la petición HTTP
        const response = await fetch(url, {
        method: metodo,
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation' // Le pide a Supabase que devuelva el registro afectado
        },
        body: JSON.stringify(productoData)
        });

        if (!response.ok) {
        throw new Error(`Error al guardar: ${response.statusText}`);
        }

        // 5. Todo salió bien: Cerramos, limpiamos y refrescamos la interfaz
        alert(editandoId ? '¡Producto actualizado con éxito!' : '¡Producto creado con éxito!');
        
        cerrarModal();               // Tu función para ocultar el modal
        renderTabla(await obtenerProductos()); // Volvemos a traer la lista de Supabase para ver los cambios reflejados
        
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
    renderTabla(await obtenerProductos());
  }       

  /* ─── CERRAR MODAL AL CLICK EN OVERLAY ─── */
  document.getElementById('modal-producto').addEventListener('click', function(e) {
    if (e.target === this) cerrarModal();
  });

 /* ─── INIT ─── */
document.addEventListener('DOMContentLoaded', async () => {

  renderSelectCategorias(await obtenerCategorias());
  renderSelectEstados(await obtenerEstados());
  renderTabla(await obtenerProductos());
 
});