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

    mostrarToast('¡Registro exitoso! Ya podés iniciar sesión.', 'success');
    return data.user;
  } catch (error) {
    mostrarToast(`Error al registrar: ${error.message}`, 'error');
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

    mostrarToast('¡Bienvenido a Prendé el Fueguito!', 'success');
    return data.user;
  } catch (error) {
    mostrarToast(`Error de ingreso: ${error.message}`, 'error');
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

    mostrarToast('Sesión cerrada correctamente', 'success');
    window.location.href = 'index.html';
    //window.location.reload(); // Recargamos para limpiar la UI
  } catch (error) {
    mostrarToast('Error al cerrar sesión', 'error');
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
      redirectTo: 'restablecer_password.html',
    });

    if (error) throw error;

    mostrarToast('¡Enlace enviado! Revisá tu casilla de correo (y la carpeta de spam).', 'success');
    return true;
  } catch (error) {
    mostrarToast(`Error: ${error.message}`, 'error');
    return false;
  }
}

/**
 * 6. RESTABLECER CONTRASEÑA (En restablecer-password.html)
 * Verificar el token de recuperación y permitir al usuario ingresar una nueva contraseña.
 * Este proceso es manejado automáticamente por Supabase Auth, solo necesitamos capturar el nuevo password y enviarlo.  
 */


async function restablecerContrasenia(nuevaPassword) {
  try {
    // 1. Buscamos las credenciales directamente del objeto global que ya tenés en tu proyecto
    // (Asegurate de que estas constantes coincidan con los nombres que usás en supabase-config.js)

    const url = SUPABASE_URL; // o la variable donde guardes tu URL de Supabase
    const key = SUPABASE_ANON_KEY; // o la variable donde guardes tu anon key

    // 2. Creamos una instancia local limpia para asegurarnos de que tenga el método .auth
    const supabaseClient = window.supabase.createClient(url, key);

    // 3. Le pegamos a Supabase con el cliente real
    const { data, error } = await supabaseClient.auth.updateUser({
        password: nuevaPassword
    });

    if (error) {
        mostrarToast(`Error al actualizar: ${error.message}`, 'error');
        return false;
    }

    mostrarToast("¡Contraseña actualizada con éxito!", 'success');
    
    setTimeout(() => {
        window.location.href = 'login.html'; 
    }, 1500);

    return true;

  } catch (error) {
    mostrarToast(`Error inesperado: ${error.message}`, 'error');
    return false;
  }
}


/**
 * 7. PROTEGER RUTAS DE ADMIN
 * Llamar al inicio de panel_admin.html
 * Redirige a index.html si no hay sesión o si el rol no es admin
 */
async function verificarAdmin() {
  const { data: { user } } = await supabaseClient.auth.getUser();

  if (!user || user.user_metadata?.role !== 'admin') {
    window.location.href = 'index.html';
  }
}