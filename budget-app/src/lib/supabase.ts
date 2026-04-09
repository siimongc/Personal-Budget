import { createClient } from '@supabase/supabase-js';

// Usamos variables de entorno que el usuario proveerá después en un .env.local
// Para la versión inicial y mockeos locales asumiendo que no tiene configurado nada aún
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fake-project.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON || 'fake-anon-key';

export const supabase = createClient(supabaseUrl, supabaseKey);
