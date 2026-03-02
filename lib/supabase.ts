import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * SUPABASE SINGLETON CLIENT
 * Single instance reused across all imports.
 * Configured with auto-refresh and session persistence to prevent stale token issues.
 */

const supabaseUrl = 'https://zilbigcueizkfvvpuwjp.supabase.co';
const supabaseAnonKey = 'sb_publishable_uSaP-URx2fUnvoWgMrL7-g_zEnamxgY';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase configuration is missing.');
}

// Singleton pattern: only one GoTrueClient instance is ever created
let _supabaseInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (_supabaseInstance) return _supabaseInstance;

  _supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,       // Store session in localStorage across tabs/reloads
      autoRefreshToken: true,     // Automatically refresh token before expiry
      detectSessionInUrl: true,   // Handle password-reset/magic-link deep links
      storageKey: 'fcbl-auth',    // Unique key to avoid conflicts with other apps
    },
  });

  return _supabaseInstance;
}

export const supabase = getSupabaseClient();
