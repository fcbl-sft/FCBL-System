
import { createClient } from '@supabase/supabase-js';

/**
 * DYNAMIC SUPABASE CLIENT
 * Prioritizes environment variables from Vercel/Vite config.
 * Falls back to hardcoded defaults only if env vars are missing.
 */

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://zilbigcueizkfvvpuwjp.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_uSaP-URx2fUnvoWgMrL7-g_zEnamxgY';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase configuration is missing. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
