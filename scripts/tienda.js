// scripts/tienda.js — Tienda Prendé el Fueguito

/* ── STATE ───────────────────────────────────────────────── */
const tiendaState = {
  categorias: new Set(),  // Set de categoria_id (integers)
  oferta:     false,
  nuevo:      false,
  precioMin:  null,
  precioMax:  null,
  ordenar:    'precio-asc',
  texto:      '',
};

/* ── HELPERS ─────────────────────────────────────────────── */
const fmt  = n => '$' + Number(n).toLocaleString('es-AR');
const esc  = s => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const attr = s => String(s || '').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

/* ── CATEGORÍAS DINÁMICAS ────────────────────────────────── */
async function cargarCategorias() {
  const { data, error } = await supabaseClient
    .from('categoria_producto')
    .select('id, nombre')
    .order('nombre');

  if (error || !data?.length) return;

  const body = document.querySelector('[data-body="cat"]');
  if (!body) return;

  body.innerHTML = data.map(cat => `
    <label class="filtro-check">
      <span>
        <input type="checkbox" data-filter="cat" data-cat-id="${cat.id}" value="${attr(cat.nombre)}">
        ${esc(cat.nombre)}
      </span>
    </label>
  `).join('');

  body.querySelectorAll('input[data-filter="cat"]').forEach(cb =>
    cb.addEventListener('change', () => { syncState(); buscarProductos(); })
  );
}

/* ── SYNC STATE DESDE UI ─────────────────────────────────── */
function syncState() {
  tiendaState.categorias = new Set(
    [...document.querySelectorAll('input[data-filter="cat"]:checked')]
      .map(cb => parseInt(cb.dataset.catId))
  );

  tiendaState.oferta = !!document.querySelector('input[data-filter="oferta"]:checked');
  tiendaState.nuevo  = !!document.querySelector('input[data-filter="nuevo"]:checked');

  const min = parseInt(document.getElementById('precio-min')?.value, 10);
  const max = parseInt(document.getElementById('precio-max')?.value, 10);
  tiendaState.precioMin = Number.isFinite(min) ? min : null;
  tiendaState.precioMax = Number.isFinite(max) ? max : null;

  tiendaState.ordenar = document.getElementById('ordenar-select')?.value || 'precio-asc';

  const desktop = document.querySelector('.search-input')?.value?.trim() || '';
  const mobile  = document.getElementById('search-bar-mobile-input')?.value?.trim() || '';
  tiendaState.texto = desktop || mobile;
}

/* ── QUERY SUPABASE ──────────────────────────────────────── */
async function buscarProductos() {
  mostrarSkeleton();

  let q = supabaseClient
    .from('producto')
    .select('id, nombre, precio, descripcion, imagen_ppal, caracteristicas, categoria_id, categoria_producto(id, nombre), estado_producto(nombre)');

  if (tiendaState.categorias.size)  q = q.in('categoria_id', [...tiendaState.categorias]);
  if (tiendaState.precioMin != null) q = q.gte('precio', tiendaState.precioMin);
  if (tiendaState.precioMax != null) q = q.lte('precio', tiendaState.precioMax);
  if (tiendaState.oferta)            q = q.contains('caracteristicas', ['oferta']);
  if (tiendaState.nuevo)             q = q.contains('caracteristicas', ['nuevo']);
  if (tiendaState.texto)             q = q.ilike('nombre', `%${tiendaState.texto}%`);

  const ord = tiendaState.ordenar;
  if      (ord === 'precio-asc')  q = q.order('precio', { ascending: true });
  else if (ord === 'precio-desc') q = q.order('precio', { ascending: false });
  else                            q = q.order('nombre',  { ascending: true });

  const { data, error } = await q;

  if (error) {
    console.error('Error al buscar productos:', error);
    renderProductos([]);
    return;
  }

  // Filtramos activos del lado del cliente para evitar joins complejos con PostgREST
  const activos = (data || []).filter(p =>
    (p.estado_producto?.nombre || '').toLowerCase() === 'activo'
  );

  renderProductos(activos);
}

/* ── RENDER PRODUCTOS ────────────────────────────────────── */
function renderProductos(lista) {
  const grid    = document.getElementById('productos-grid');
  const countEl = document.getElementById('cantidad-resultados');
  if (!grid) return;

  if (countEl) countEl.textContent = `${lista.length} producto${lista.length !== 1 ? 's' : ''}`;

  if (!lista.length) {
    grid.innerHTML = `
      <div class="tienda-vacio">
        <i class="fa-solid fa-magnifying-glass"></i>
        <p>No encontramos productos con esos filtros.</p>
        <button class="btn-limpiar-vacio" type="button">Limpiar filtros</button>
      </div>`;
    grid.querySelector('.btn-limpiar-vacio')?.addEventListener('click', limpiarFiltros);
    return;
  }

  grid.innerHTML = lista.map(p => {
    const cat      = p.categoria_producto?.nombre || '';
    const caract   = Array.isArray(p.caracteristicas) ? p.caracteristicas.map(c => c.toLowerCase()) : [];
    const esOferta = caract.includes('oferta');
    const esNuevo  = caract.includes('nuevo');
    const img      = p.imagen_ppal || `img/placeholder_${cat}.png`;

    const flags = [
      esOferta ? '<span class="flag oferta">Oferta</span>' : '',
      esNuevo  ? '<span class="flag nuevo">Nuevo</span>'   : '',
    ].filter(Boolean).join('');

    return `
      <article class="producto-card-tienda"
        data-id="${p.id}"
        data-nombre="${attr(p.nombre)}"
        data-precio="${p.precio}"
        data-unidad="unidad"
        data-imagen="${attr(img)}">
        <div class="producto-media">
          <img class="img" src="${attr(img)}" alt="${attr(p.nombre)}" loading="lazy"
            onerror="this.src='img/fuego.png'">
          <div class="badges">
            ${cat ? `<span class="cat">${esc(cat)}</span>` : ''}
            <div class="flags">${flags}</div>
          </div>
        </div>
        <div class="body">
          <h3>${esc(p.nombre)}</h3>
          <p>${esc(p.descripcion || '')}</p>
          <div class="footer">
            <span class="precio">${fmt(p.precio)}</span>
            <button class="btn-add btn-agregar" type="button">Agregar</button>
          </div>
        </div>
      </article>`;
  }).join('');
}

function mostrarSkeleton() {
  const grid = document.getElementById('productos-grid');
  if (!grid) return;
  grid.innerHTML = Array(6).fill(0).map(() => `
    <div class="skeleton-card">
      <div class="sk-img"></div>
      <div class="sk-body">
        <div class="sk-line sk-title"></div>
        <div class="sk-line sk-desc"></div>
        <div class="sk-footer">
          <div class="sk-price"></div>
          <div class="sk-btn"></div>
        </div>
      </div>
    </div>`).join('');
}

/* ── LIMPIAR FILTROS ─────────────────────────────────────── */
function limpiarFiltros() {
  document.querySelectorAll('aside input[type="checkbox"]').forEach(cb => cb.checked = false);
  const min = document.getElementById('precio-min');
  const max = document.getElementById('precio-max');
  if (min) min.value = '';
  if (max) max.value = '';
  tiendaState.categorias.clear();
  tiendaState.oferta    = false;
  tiendaState.nuevo     = false;
  tiendaState.precioMin = null;
  tiendaState.precioMax = null;
  tiendaState.texto     = '';
  buscarProductos();
}

/* ── HEADER: BUSCADOR + MENÚ MOBILE ─────────────────────── */
function initHeader() {
  const btnBuscar     = document.getElementById('btn-buscar');
  const searchCont    = document.querySelector('.search-container');
  const searchInput   = searchCont?.querySelector('.search-input');
  const menuToggle    = document.getElementById('menu-toggle');
  const mobileNav     = document.getElementById('mobile-nav');
  const sbMobile      = document.getElementById('search-bar-mobile');
  const sbMobileInput = document.getElementById('search-bar-mobile-input');

  const isMobile = () => window.matchMedia('(max-width: 768px)').matches;

  const openMobileSearch = () => {
    sbMobile?.classList.add('active');
    sbMobile?.setAttribute('aria-hidden', 'false');
    mobileNav?.classList.remove('active');
    menuToggle?.querySelector('i')?.classList.replace('fa-xmark', 'fa-bars');
    setTimeout(() => sbMobileInput?.focus(), 0);
  };

  const closeMobileSearch = () => {
    sbMobile?.classList.remove('active');
    sbMobile?.setAttribute('aria-hidden', 'true');
  };

  btnBuscar?.addEventListener('click', e => {
    if (isMobile()) {
      e.preventDefault();
      sbMobile?.classList.contains('active') ? closeMobileSearch() : openMobileSearch();
      return;
    }
    if (!searchCont.classList.contains('active')) {
      e.preventDefault();
      searchCont.classList.add('active');
      searchInput?.focus();
    } else if (!(searchInput?.value || '').trim()) {
      searchCont.classList.remove('active');
    }
  });

  menuToggle?.addEventListener('click', () => {
    mobileNav.classList.toggle('active');
    const icon = menuToggle.querySelector('i');
    icon.classList.contains('fa-bars')
      ? icon.classList.replace('fa-bars', 'fa-xmark')
      : icon.classList.replace('fa-xmark', 'fa-bars');
  });

  document.addEventListener('mousedown', e => {
    if (isMobile() && sbMobile?.classList.contains('active')) {
      if (!sbMobile.contains(e.target) && !btnBuscar?.contains(e.target) && !searchCont?.contains(e.target)) {
        closeMobileSearch();
      }
      return;
    }
    if (searchCont?.classList.contains('active') && !searchCont.contains(e.target)) {
      searchCont.classList.remove('active');
    }
  });

  // Búsqueda en tiempo real con debounce
  let debounceTimer;
  const onSearch = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => { syncState(); buscarProductos(); }, 400);
  };
  searchInput?.addEventListener('input', onSearch);
  sbMobileInput?.addEventListener('input', onSearch);
}

/* ── FILTROS: SIDEBAR ────────────────────────────────────── */
function initFiltros() {
  // Bloques colapsables
  document.querySelectorAll('.filtro-bloque-header').forEach(h => {
    h.addEventListener('click', () => {
      const body = document.querySelector(`[data-body="${h.dataset.bloque}"]`);
      if (body) body.style.display = body.style.display === 'none' ? '' : 'none';
    });
  });

  // Oferta / Nuevo
  document.querySelectorAll('input[data-filter="oferta"], input[data-filter="nuevo"]').forEach(cb =>
    cb.addEventListener('change', () => { syncState(); buscarProductos(); })
  );

  // Precio: aplicar al click del botón
  document.getElementById('btn-aplicar-precio')?.addEventListener('click', () => {
    syncState();
    buscarProductos();
  });

  // Precio: también aplicar al presionar Enter en los inputs
  ['precio-min', 'precio-max'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { syncState(); buscarProductos(); }
    });
  });

  // Limpiar filtros
  document.getElementById('btn-limpiar')?.addEventListener('click', limpiarFiltros);

  // Ordenar
  document.getElementById('ordenar-select')?.addEventListener('change', e => {
    tiendaState.ordenar = e.target.value;
    buscarProductos();
  });

  // Mobile: abrir/cerrar aside
  document.getElementById('btn-filtros-mobile')?.addEventListener('click', () => {
    document.getElementById('aside-filtros')?.classList.add('active');
    document.getElementById('overlay-filtros').style.display = 'block';
  });
  document.getElementById('overlay-filtros')?.addEventListener('click', () => {
    document.getElementById('aside-filtros')?.classList.remove('active');
    document.getElementById('overlay-filtros').style.display = 'none';
  });
}

/* ── INIT ────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  initHeader();
  initFiltros();
  syncState();
  await cargarCategorias();
  await buscarProductos();
});
