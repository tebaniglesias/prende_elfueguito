// scripts/supabase-config.js

// 1. Tus credenciales reales de Prendé el Fueguito
const SUPABASE_URL = "https://oxqimolkkiyejgzdvljr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_EypcguefbhzcF-hZRRBi_w_nzyimLxF";

// 2. Validación de seguridad para comprobar el CDN
if (typeof supabase === 'undefined') {
    console.error("❌ Error de orden: La librería externa de Supabase no se cargó en el HTML antes que este script.");
}

// 3. Inicializar el cliente con el nombre global correcto
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log("⚡ Conexión con Supabase vinculada de forma exitosa.");