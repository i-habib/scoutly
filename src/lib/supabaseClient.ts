import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let supabaseClient: SupabaseClient | undefined

function getRequiredEnv(name: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_PUBLISHABLE_KEY'): string {
  const value = import.meta.env[name]

  if (!value) {
    throw new Error(`Missing ${name}. Add it to .env.local before using Supabase.`)
  }

  return value
}

/**
 * Returns the browser Supabase client used for authentication and future data
 * access. It is initialized lazily so builds do not require local env values.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClient(
      getRequiredEnv('VITE_SUPABASE_URL'),
      getRequiredEnv('VITE_SUPABASE_PUBLISHABLE_KEY'),
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      },
    )
  }

  return supabaseClient
}
