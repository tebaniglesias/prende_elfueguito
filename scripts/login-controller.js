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

            const email = document.getElementById('login-email').value.trim(); //.trim borra espacios al inicio y al final por si el usuario los pone sin querer
            const password = document.getElementById('login-password').value;

            // Feedback visual: Cambiamos el texto del botón y lo desactivamos
            const btn = formLogin.querySelector('button[type="submit"]');
            const txtOriginal = btn.textContent;
            btn.textContent = 'Ingresando...'; // .textContent es una propiedad que representa el texto dentro del botón, al asignarle un nuevo valor cambiamos lo que se muestra al usuario.   
            btn.disabled = true; // .disabled es una propiedad de los botones que los desactiva visualmente y también impide que se pueda hacer click en ellos, lo cual es ideal para evitar múltiples envíos del formulario mientras se procesa el login.  

            // Llamamos a la función global alojada en auth.js
            const usuario = await iniciarSesionCliente(email, password);

            // Restauramos el botón
            btn.textContent = txtOriginal;
            btn.disabled = false;

            if (usuario) {
                // Redirigimos al panel de usuario tras un breve delay para que se lea el toast
                setTimeout(() => {
                    window.location.href = 'panel_usuario.html';
                }, 1500);
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
                mostrarToast('La contraseña debe tener al menos 6 caracteres.', 'error');
                return;
            }

            // Feedback visual en el botón de registro
            const btn = formRegistro.querySelector('button[type="submit"]');
            const txtOriginal = btn.textContent;
            btn.textContent = 'Creando cuenta...';
            btn.disabled = true;

            // Registramos en Supabase Auth
            const usuario = await registrarCliente(email, password, nombre);

            btn.textContent = txtOriginal;
            btn.disabled = false;

            if (usuario) {
                formRegistro.reset(); // Limpiamos los inputs
                // Enviamos al usuario al login con un mensaje de éxito
                mostrarToast('Cuenta creada con éxito. Por favor, inicia sesión.', 'success');
                setTimeout(() => { window.location.href = 'login.html'; }, 3000);
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

            // Solicitamos el mail de reajuste a Supabase Auth
            const exito = await enviarEnlaceRecuperacion(email);

            btn.textContent = txtOriginal;
            btn.disabled = false;

            if (exito) {
                formRecuperar.reset(); // Limpiamos el input si se mandó bien
            }
        });
    }
});