// scripts/auth.js

/**
 * 1. REGISTRAR UN NUEVO CLIENTE
 */
async function registrarCliente(email, password, nombreCompleto) {
  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: nombreCompleto // Guardamos el nombre en los metadatos de Supabase
        }
      }
    });

    if (error) throw error;

    toast('¡Registro exitoso! Ya podés iniciar sesión.', 'success');
    return data.user;
  } catch (error) {
    toast(`Error al registrar: ${error.message}`, 'error');
    return null;
  }
}

/**
 * 2. INICIAR SESIÓN
 */
async function iniciarSesionCliente(email, password) {
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) throw error;

    toast('¡Bienvenido a Prendé el Fueguito!', 'success');
    return data.user;
  } catch (error) {
    toast(`Error de ingreso: ${error.message}`, 'error');
    return null;
  }
}

/**
 * 3. CERRAR SESIÓN
 */
async function cerrarSesionCliente() {
  try {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;

    toast('Sesión cerrada correctamente', 'success');
    window.location.reload(); // Recargamos para limpiar la UI
  } catch (error) {
    toast('Error al cerrar sesión', 'error');
  }
}

/**
 * 4. OBTENER EL USUARIO ACTUAL (Para proteger rutas o cambiar la botonera)
 */
async function obtenerUsuarioActual() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  return user; // Devuelve el objeto del usuario o null si no hay sesión
}

/**
 * 5. ENVIAR EMAIL DE RECOVERY (Restablecimiento de contraseña)
 */
async function enviarEnlaceRecuperacion(email) {
  try {
    const { data, error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      // Indicamos a dónde debe regresar el cliente cuando haga clic en el correo
      // GitHub Pages maneja las rutas de esta forma:
      redirectTo: 'https://tebaniglesias.github.io/prende_elfueguito/restablecer-password.html',
    });

    if (error) throw error;

    toast('¡Enlace enviado! Revisá tu casilla de correo (y la carpeta de spam).', 'success');
    return true;
  } catch (error) {
    toast(`Error: ${error.message}`, 'error');
    return false;
  }
}