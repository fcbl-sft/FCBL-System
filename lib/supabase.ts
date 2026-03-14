import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * SUPABASE SINGLETON CLIENT
 * Single instance reused across all imports.
 * Configured with auto-refresh and session persistence to prevent stale token issues.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase configuration is missing. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file.');
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
