
import { createClient } from '@supabase/supabase-js';

/**
 * DIRECT SUPABASE CLIENT
 * Reverted to direct connection to fix 404 File Not Found errors on /api/projects.
 * Using the provided project credentials.
 */

const supabaseUrl = 'https://zilbigcueizkfvvpuwjp.supabase.co';
const supabaseAnonKey = 'sb_publishable_uSaP-URx2fUnvoWgMrL7-g_zEnamxgY';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase configuration is missing.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
