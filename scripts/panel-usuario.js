// ── ESTADO ───────────────────────────────────────────
let perfilOriginal = {};

// ── CARGAR PERFIL DESDE SUPABASE ─────────────────────
async function cargarPerfil() {
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
        window.location.href = 'login.html';
        return;
    }

    const { data: perfil } = await supabaseClient
        .from('perfil_usuario')
        .select('*')
        .eq('id', user.id)
        .single();

    const nombre          = perfil?.nombre_completo || user.user_metadata?.full_name || '';
    const email           = user.email;
    const telefono        = perfil?.telefono || '';
    const fechaNacimiento = perfil?.fecha_nacimiento || '';
    const documento       = perfil?.documento || '';

    perfilOriginal = { nombre, email, telefono, fechaNacimiento, documento };

    document.getElementById('nombre').value           = nombre;
    document.getElementById('email').value            = email;
    document.getElementById('telefono').value         = telefono;
    document.getElementById('fecha-nacimiento').value = fechaNacimiento;
    document.getElementById('documento').value        = documento;

    const iniciales = nombre
        ? nombre.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
        : email[0].toUpperCase();

    document.querySelector('.avatar-circle').textContent = iniciales;
    document.querySelector('.avatar-nombre').textContent  = nombre || 'Usuario';
    document.querySelector('.avatar-email').textContent   = email;
}

// ── NAVEGACIÓN ENTRE SECCIONES ──────────────────────
const menuLinks     = document.querySelectorAll('.menu-link');
const panelSections = document.querySelectorAll('.panel-section');

menuLinks.forEach(link => {
    link.addEventListener('click', e => {
        e.preventDefault();
        menuLinks.forEach(l => l.classList.remove('active'));
        panelSections.forEach(s => s.classList.remove('active'));
        link.classList.add('active');
        const section = document.getElementById(link.dataset.section);
        if (section) section.classList.add('active');
    });
});

// ── EDITAR PERFIL ────────────────────────────────────
const editPerfilBtn   = document.getElementById('edit-perfil');
const formPerfil      = document.getElementById('form-perfil');
const formActions     = document.getElementById('form-actions');
const cancelPerfilBtn = document.getElementById('cancel-perfil');
const inputs          = formPerfil.querySelectorAll('input');

function activarEdicion() {
    inputs.forEach(input => {
        // El email no se puede cambiar desde acá
        if (input.type !== 'hidden' && input.id !== 'email') {
            input.removeAttribute('readonly');
            input.classList.add('editable');
        }
    });
    formActions.style.display = 'flex';
    editPerfilBtn.style.display = 'none';
}

function desactivarEdicion() {
    inputs.forEach(input => {
        if (input.type !== 'hidden') {
            input.setAttribute('readonly', 'readonly');
            input.classList.remove('editable');
        }
    });
    formActions.style.display = 'none';
    editPerfilBtn.style.display = 'inline-flex';
}

editPerfilBtn.addEventListener('click', activarEdicion);

cancelPerfilBtn.addEventListener('click', () => {
    document.getElementById('nombre').value           = perfilOriginal.nombre;
    document.getElementById('telefono').value         = perfilOriginal.telefono;
    document.getElementById('fecha-nacimiento').value = perfilOriginal.fechaNacimiento;
    document.getElementById('documento').value        = perfilOriginal.documento;
    desactivarEdicion();
});

formPerfil.addEventListener('submit', async e => {
    e.preventDefault();

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    const nombreNuevo = document.getElementById('nombre').value.trim();
    const telefono    = document.getElementById('telefono').value.trim();
    const fechaNac    = document.getElementById('fecha-nacimiento').value || null;
    const documento   = document.getElementById('documento').value.trim();

    const { error } = await supabaseClient
        .from('perfil_usuario')
        .upsert({ id: user.id, nombre_completo: nombreNuevo, telefono, fecha_nacimiento: fechaNac, documento });

    if (error) {
        mostrarToast('Error al guardar los cambios', 'error');
        return;
    }

    if (nombreNuevo !== perfilOriginal.nombre) {
        await supabaseClient.auth.updateUser({ data: { full_name: nombreNuevo } });

        const iniciales = nombreNuevo
            ? nombreNuevo.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
            : user.email[0].toUpperCase();
        document.querySelector('.avatar-circle').textContent = iniciales;
        document.querySelector('.avatar-nombre').textContent  = nombreNuevo || 'Usuario';
    }

    perfilOriginal = { ...perfilOriginal, nombre: nombreNuevo, telefono, fechaNacimiento: fechaNac || '', documento };

    desactivarEdicion();
    mostrarToast('✓ Cambios guardados correctamente');
});

// ── NOTIFICACIONES ───────────────────────────────────
document.getElementById('form-notificaciones').addEventListener('submit', e => {
    e.preventDefault();
    mostrarToast('✓ Preferencias guardadas');
});

// ── SEGURIDAD ────────────────────────────────────────
const formSeguridad = document.getElementById('form-seguridad');
if (formSeguridad) {
    formSeguridad.addEventListener('submit', e => {
        e.preventDefault();
        const nueva     = document.getElementById('password-nueva').value;
        const confirmar = document.getElementById('password-confirmar').value;
        if (nueva !== confirmar) {
            mostrarToast('Las contraseñas no coinciden', 'error');
            return;
        }
        if (nueva.length < 8) {
            mostrarToast('La contraseña debe tener al menos 8 caracteres', 'error');
            return;
        }
        formSeguridad.reset();
        mostrarToast('✓ Contraseña actualizada');
    });
}

// ── DIRECCIONES ──────────────────────────────────────
let domicilios = [];
let editandoDomicilioId = null;

async function cargarDomicilios() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    const { data, error } = await supabaseClient
        .from('domicilio_usuario')
        .select('*')
        .eq('usuario_id', user.id)
        .order('es_principal', { ascending: false })
        .order('created_at', { ascending: true });

    if (error) { console.error(error); return; }
    domicilios = data || [];
    renderDomicilios();
}

function iconoAlias(alias) {
    const a = (alias || '').toLowerCase();
    if (a.includes('casa') || a.includes('hogar')) return 'fa-house';
    if (a.includes('trabajo') || a.includes('oficina') || a.includes('laburo')) return 'fa-briefcase';
    return 'fa-map-location-dot';
}

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function renderDomicilios() {
    const grid = document.getElementById('direcciones-grid');
    if (!domicilios.length) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i class="fa-solid fa-map-location-dot"></i>
                <p>No tenés domicilios guardados.<br>Agregá uno para agilizar tus compras.</p>
            </div>`;
        return;
    }
    grid.innerHTML = domicilios.map(d => `
        <div class="direccion-card" data-id="${escapeHtml(d.id)}">
            <div class="direccion-header">
                <div class="direccion-icono"><i class="fa-solid ${iconoAlias(d.alias)}"></i></div>
                <div>
                    <h3>${escapeHtml(d.alias)}</h3>
                    ${d.es_principal ? '<span class="badge-principal">Principal</span>' : ''}
                </div>
            </div>
            <p class="direccion-text">${escapeHtml(d.calle)} ${escapeHtml(d.numero || '')}${d.piso_depto ? ', ' + escapeHtml(d.piso_depto) : ''}</p>
            <p class="direccion-info">${escapeHtml(d.localidad)}, ${escapeHtml(d.provincia)}, ${escapeHtml(d.pais)}</p>
            <div class="direccion-actions">
                <button class="btn-small btn-primary" onclick="abrirModalEditar('${escapeHtml(d.id)}')">Editar</button>
                ${!d.es_principal
                    ? `<button class="btn-small btn-ghost" onclick="setPrincipal('${escapeHtml(d.id)}')">Marcar principal</button>`
                    : ''}
                <button class="btn-small btn-ghost" onclick="eliminarDomicilio('${escapeHtml(d.id)}')">Eliminar</button>
            </div>
        </div>
    `).join('');
}

function abrirModalAgregar() {
    editandoDomicilioId = null;
    document.getElementById('modal-domicilio-titulo').textContent = 'Agregar domicilio';
    document.getElementById('form-domicilio').reset();
    document.getElementById('domicilio-id').value    = '';
    document.getElementById('domicilio-pais').value  = 'Argentina';
    document.getElementById('domicilio-principal').checked = domicilios.length === 0;
    document.getElementById('modal-domicilio').classList.add('open');
}

function abrirModalEditar(id) {
    const d = domicilios.find(x => x.id === id);
    if (!d) return;
    editandoDomicilioId = id;
    document.getElementById('modal-domicilio-titulo').textContent  = 'Editar domicilio';
    document.getElementById('domicilio-id').value        = d.id;
    document.getElementById('domicilio-alias').value     = d.alias;
    document.getElementById('domicilio-calle').value     = d.calle;
    document.getElementById('domicilio-numero').value    = d.numero || '';
    document.getElementById('domicilio-piso').value      = d.piso_depto || '';
    document.getElementById('domicilio-cp').value        = d.codigo_postal || '';
    document.getElementById('domicilio-localidad').value = d.localidad;
    document.getElementById('domicilio-provincia').value = d.provincia;
    document.getElementById('domicilio-pais').value      = d.pais || 'Argentina';
    document.getElementById('domicilio-principal').checked = d.es_principal;
    document.getElementById('modal-domicilio').classList.add('open');
}

function cerrarModalDomicilio() {
    document.getElementById('modal-domicilio').classList.remove('open');
}

document.getElementById('add-direccion').addEventListener('click', abrirModalAgregar);
document.getElementById('modal-domicilio-close').addEventListener('click', cerrarModalDomicilio);
document.getElementById('modal-domicilio-cancel').addEventListener('click', cerrarModalDomicilio);
document.getElementById('modal-domicilio').addEventListener('click', e => {
    if (e.target.id === 'modal-domicilio') cerrarModalDomicilio();
});

document.getElementById('form-domicilio').addEventListener('submit', async e => {
    e.preventDefault();
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    const esPrincipal = document.getElementById('domicilio-principal').checked;
    const payload = {
        usuario_id:    user.id,
        alias:         document.getElementById('domicilio-alias').value.trim(),
        calle:         document.getElementById('domicilio-calle').value.trim(),
        numero:        document.getElementById('domicilio-numero').value.trim() || null,
        piso_depto:    document.getElementById('domicilio-piso').value.trim()   || null,
        codigo_postal: document.getElementById('domicilio-cp').value.trim()     || null,
        localidad:     document.getElementById('domicilio-localidad').value.trim(),
        provincia:     document.getElementById('domicilio-provincia').value.trim(),
        pais:          document.getElementById('domicilio-pais').value.trim()   || 'Argentina',
        es_principal:  esPrincipal,
    };

    const submitBtn = document.getElementById('modal-domicilio-submit');
    submitBtn.disabled = true;

    let error;

    if (editandoDomicilioId) {
        if (esPrincipal) {
            await supabaseClient.from('domicilio_usuario')
                .update({ es_principal: false })
                .eq('usuario_id', user.id)
                .neq('id', editandoDomicilioId);
        }
        ({ error } = await supabaseClient.from('domicilio_usuario')
            .update(payload)
            .eq('id', editandoDomicilioId)
            .eq('usuario_id', user.id));
    } else {
        if (esPrincipal) {
            await supabaseClient.from('domicilio_usuario')
                .update({ es_principal: false })
                .eq('usuario_id', user.id);
        }
        ({ error } = await supabaseClient.from('domicilio_usuario').insert(payload));
    }

    submitBtn.disabled = false;

    if (error) {
        mostrarToast('Error al guardar el domicilio', 'error');
        console.error(error);
        return;
    }

    cerrarModalDomicilio();
    await cargarDomicilios();
    mostrarToast(editandoDomicilioId ? '✓ Domicilio actualizado' : '✓ Domicilio agregado');
});

async function setPrincipal(id) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;
    await supabaseClient.from('domicilio_usuario').update({ es_principal: false }).eq('usuario_id', user.id);
    const { error } = await supabaseClient.from('domicilio_usuario')
        .update({ es_principal: true })
        .eq('id', id)
        .eq('usuario_id', user.id);
    if (error) { mostrarToast('Error al actualizar', 'error'); return; }
    await cargarDomicilios();
    mostrarToast('✓ Dirección principal actualizada');
}

async function eliminarDomicilio(id) {
    if (!confirm('¿Estás seguro de que querés eliminar este domicilio?')) return;
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;
    const { error } = await supabaseClient.from('domicilio_usuario')
        .delete()
        .eq('id', id)
        .eq('usuario_id', user.id);
    if (error) { mostrarToast('Error al eliminar el domicilio', 'error'); return; }
    await cargarDomicilios();
    mostrarToast('✓ Domicilio eliminado');
}

// ── CERRAR SESIÓN ────────────────────────────────────
document.getElementById('btn-cerrarsesion').addEventListener('click', e => {
    e.preventDefault();
    cerrarSesionCliente();
});

// ── INIT ─────────────────────────────────────────────
cargarPerfil();
cargarDomicilios();
