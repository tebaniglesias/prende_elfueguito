// Tus credenciales de Supabase (las encontrás en Project Settings -> API)
const SUPABASE_URL = "https://oxqimolkkiyejgzdvljr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_EypcguefbhzcF-hZRRBi_w_nzyimLxF";

// Inicializar el cliente de Supabase
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
