import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// CUIDADO: Este cliente tem privilégios de administrador.
// NUNCA use ou exponha este cliente no lado do cliente (browser).
// Ele deve ser usado APENAS em ambientes seguros de servidor (Server Actions, API Routes).

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    'Supabase URL ou Service Role Key não estão definidos nas variáveis de ambiente.'
  );
}

// Cria um cliente Supabase com a chave de serviço para operações de admin.
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceRoleKey);