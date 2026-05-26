// scripts/login-controller.js

document.addEventListener('DOMContentLoaded', () => {
    // Capturamos los 3 posibles formularios de las distintas páginas
    const formLogin = document.getElementById('form-login');
    const formRegistro = document.getElementById('form-registro-page');
    const formRecuperar = document.getElementById('form-recuperar-page');

    // ══════════════════════════════════════════════
    // 1. CONTROLADOR DE INICIO DE SESIÓN (login.html)
    // ══════════════════════════════════════════════
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault(); // Evita que la página se recargue

            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;

            // Feedback visual: Cambiamos el texto del botón y lo desactivamos
            const btn = formLogin.querySelector('button[type="submit"]');
            const txtOriginal = btn.textContent;
            btn.textContent = 'Ingresando...';
            btn.disabled = true;

            try {
                // Llamamos a la función global alojada en auth.js
                const usuario = await iniciarSesionCliente(email, password);

                if (usuario) {
                    // Redirigimos al panel de usuario tras un breve delay para que se lea el toast
                    setTimeout(() => {
                        window.location.href = 'panel_usuario.html';
                    }, 1500);
                }
            } catch (error) {
                console.error("Error en el inicio de sesión:", error);
                if (typeof mostrarToast === 'function') {
                    mostrarToast('Ocurrió un error inesperado al intentar ingresar.', 'error');
                }
            } finally {
                // Restauramos el botón siempre, funcione o falle la petición
                btn.textContent = txtOriginal;
                btn.disabled = false;
            }
        });
    }

    // ══════════════════════════════════════════════
    // 2. CONTROLADOR DE REGISTRO (registro.html)
    // ══════════════════════════════════════════════
    if (formRegistro) {
        formRegistro.addEventListener('submit', async (e) => {
            e.preventDefault();

            const nombre = document.getElementById('reg-nombre').value.trim();
            const email = document.getElementById('reg-email').value.trim();
            const password = document.getElementById('reg-password').value;

            // Validación rápida local para cumplir con los mínimos de seguridad de Supabase
            if (password.length < 6) {
                if (typeof mostrarToast === 'function') {
                    mostrarToast('La contraseña debe tener al menos 6 caracteres.', 'error');
                }
                return;
            }

            // Feedback visual en el botón de registro
            const btn = formRegistro.querySelector('button[type="submit"]');
            const txtOriginal = btn.textContent;
            btn.textContent = 'Creando cuenta...';
            btn.disabled = true;

            try {
                // Registramos en Supabase Auth
                const usuario = await registrarCliente(email, password, nombre);

                if (usuario) {
                    formRegistro.reset(); // Limpiamos los inputs
                    // Opcional: Si querés mandarlo al login directo tras registrarse, descomentá abajo:
                    // setTimeout(() => { window.location.href = 'login.html'; }, 2000);
                }
            } catch (error) {
                console.error("Error en el registro:", error);
                if (typeof mostrarToast === 'function') {
                    mostrarToast('No se pudo crear la cuenta. Inténtalo de nuevo.', 'error');
                }
            } finally {
                btn.textContent = txtOriginal;
                btn.disabled = false;
            }
        });
    }

    // ══════════════════════════════════════════════
    // 3. CONTROLADOR DE RECUPERACIÓN (recuperar.html)
    // ══════════════════════════════════════════════
    if (formRecuperar) {
        formRecuperar.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('recovery-email').value.trim();

            // Feedback visual en el botón de recuperación
            const btn = formRecuperar.querySelector('button[type="submit"]');
            const txtOriginal = btn.textContent;
            btn.textContent = 'Enviando enlace...';
            btn.disabled = true;

            try {
                // Solicitamos el mail de reajuste a Supabase Auth
                const exito = await enviarEnlaceRecuperacion(email);

                if (exito) {
                    formRecuperar.reset(); // Limpiamos el input si se mandó bien
                }
            } catch (error) {
                console.error("Error en recuperación:", error);
                if (typeof mostrarToast === 'function') {
                    mostrarToast('Error al enviar el enlace de recuperación.', 'error');
                }
            } finally {
                btn.textContent = txtOriginal;
                btn.disabled = false;
            }
        });
    }
});