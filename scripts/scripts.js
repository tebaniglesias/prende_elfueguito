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

    // ── NOTIFICACIONES ───────────────────────────────────
    document.getElementById('form-notificaciones').addEventListener('submit', e => {
        e.preventDefault();
        mostrarToast('✓ Preferencias guardadas');
    });

