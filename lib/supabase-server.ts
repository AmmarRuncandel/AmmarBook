import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client using Service Role Key
// This bypasses Row Level Security — only for use in Route Handlers / server code
// NEVER expose SUPABASE_SERVICE_ROLE_KEY to the client side
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseServer = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
