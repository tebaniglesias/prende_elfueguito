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