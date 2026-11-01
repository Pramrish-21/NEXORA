import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve credentials strictly from Vite environment variables
export const supabaseUrl: string = import.meta.env.VITE_SUPABASE_URL || '';
export const supabaseAnonKey: string = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('your-project') &&
  !supabaseUrl.includes('unconfigured') &&
  supabaseAnonKey !== 'your-anon-key' &&
  supabaseAnonKey !== 'unconfigured-public-key'
);

export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://unconfigured.local',
  supabaseAnonKey || 'unconfigured-public-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
