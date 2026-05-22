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

// scripts/scripts.js (o tu archivo JS externo real)

// Usamos el evento 'load' global para asegurarnos de que TODO el HTML
// y los scripts de Supabase ya existan en la memoria del navegador.
window.addEventListener('load', () => {
    const botonMiCuenta = document.getElementById('btn-mi-cuenta');

    if (botonMiCuenta) {
        console.log("🎯 Botón 'Mi cuenta' vinculado con éxito desde el JS externo.");

        botonMiCuenta.addEventListener('click', async (e) => {
            // Frenamos el redireccionamiento por defecto del '#'
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
            // Frenamos el redireccionamiento por defecto del '#'
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
