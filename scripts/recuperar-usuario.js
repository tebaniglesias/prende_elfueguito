// 1. Escuchamos el envío del formulario (Afuera, se ejecuta al cargar la página)
const formActualizar = document.getElementById('form-actualizar-page');

if (formActualizar) { // Buena práctica para evitar errores si el elemento no existe en la página actual
    formActualizar.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const newPassword = document.getElementById('new-password').value.trim();
        const confirmPassword = document.getElementById('confirm-password').value.trim();

        // Validaciones locales básicas
        if (newPassword !== confirmPassword) {
            mostrarToast("Las contraseñas no coinciden. Por favor, verifica.", "error");
            return;
        }

        if (newPassword.length < 6) {
            mostrarToast("La contraseña debe tener al menos 6 caracteres.", "error");
            return;
        }

        // Llamamos a la función que habla con Supabase pasándole la contraseña limpia
        await restablecerContrasenia(newPassword);
    });
}