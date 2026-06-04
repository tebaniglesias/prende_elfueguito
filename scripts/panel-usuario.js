    // ── NAVEGACIÓN ENTRE SECCIONES ──────────────────────
    const menuLinks    = document.querySelectorAll('.menu-link');
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

    // ── EDITAR PERFIL ───────────────────────────────────
    const editPerfilBtn  = document.getElementById('edit-perfil');
    const formPerfil     = document.getElementById('form-perfil');
    const formActions    = document.getElementById('form-actions');
    const cancelPerfilBtn = document.getElementById('cancel-perfil');
    const inputs         = formPerfil.querySelectorAll('input');

    function activarEdicion() {
        inputs.forEach(input => {
            if (input.type !== 'hidden') {
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
    cancelPerfilBtn.addEventListener('click', desactivarEdicion);

    formPerfil.addEventListener('submit', e => {
        e.preventDefault();
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

    // ── AGREGAR DIRECCIÓN ────────────────────────────────
    document.getElementById('add-direccion').addEventListener('click', () => {
        mostrarToast('Funcionalidad en desarrollo');
    });