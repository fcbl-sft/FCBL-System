import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * SUPABASE SINGLETON CLIENT
 * Single instance reused across all imports.
 * Configured with auto-refresh and session persistence to prevent stale token issues.
 */

// Prefer env vars (set in Vercel dashboard or .env locally).
// Fallback values ensure the app works even if env vars are not configured.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zilbigcueizkfvvpuwjp.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppbGJpZ2N1ZWl6a2Z2dnB1d2pwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwODEwODEsImV4cCI6MjA4MjY1NzA4MX0.LJZCuh-qh81XXHISpjfq8_LHfz6HiLlUgK8Y95djnp8';

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
