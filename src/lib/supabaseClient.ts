import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let supabaseClient: SupabaseClient | undefined

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/**
 * Returns the browser Supabase client used for authentication and future data
 * access. It is initialized lazily so builds do not require local env values.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    if (!supabaseUrl) {
      throw new Error('Missing VITE_SUPABASE_URL. Add it to .env.local before using Supabase.')
    }

    if (!supabasePublishableKey) {
      throw new Error('Missing VITE_SUPABASE_PUBLISHABLE_KEY. Add it to .env.local before using Supabase.')
    }

    supabaseClient = createClient(
      supabaseUrl,
      supabasePublishableKey,
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
