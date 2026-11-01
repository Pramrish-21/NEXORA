import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve from environment or saved localStorage configuration
const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const storedUrl = typeof window !== 'undefined' ? localStorage.getItem('nexora_supabase_url') : null;
const storedKey = typeof window !== 'undefined' ? localStorage.getItem('nexora_supabase_key') : null;

export const supabaseUrl = envUrl || storedUrl || '';
export const supabaseAnonKey = envAnonKey || storedKey || '';

export const isConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://placeholder.supabase.co' && 
  supabaseAnonKey !== 'placeholder'
);

if (!isConfigured && typeof window !== 'undefined') {
  console.info(
    'NEXORA: Running in interactive Instant Preview mode with local persistence. You can connect your live Supabase project anytime in Settings.'
  );
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

export function saveCustomSupabaseConfig(url: string, key: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('nexora_supabase_url', url.trim());
    localStorage.setItem('nexora_supabase_key', key.trim());
    window.location.reload();
  }
}

export function clearCustomSupabaseConfig() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('nexora_supabase_url');
    localStorage.removeItem('nexora_supabase_key');
    window.location.reload();
  }
}
