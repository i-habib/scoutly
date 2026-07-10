import type { UserData } from '../data/userData'
import { getSupabaseClient } from '../lib/supabaseClient'

/** Load the complete account-owned ScoutingIQ record, if one exists. */
export async function loadUserData(): Promise<UserData | null> {
  const supabase = getSupabaseClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError?.name === 'AuthSessionMissingError' || !userData.user) {
    return null
  }
  if (userError) throw userError

  const { data, error } = await supabase
    .from('scout_profiles')
    .select('profile')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  if (error) throw error
  const profile = data?.profile
  return profile && typeof profile === 'object' && 'profile' in profile ? (profile as UserData) : null
}

/** Persist the full ScoutingIQ record under the authenticated account. */
export async function saveUserData(userData: UserData): Promise<void> {
  const supabase = getSupabaseClient()
  const { data: authData, error: userError } = await supabase.auth.getUser()

  if (userError?.name === 'AuthSessionMissingError' || !authData.user) return
  if (userError) throw userError

  const { error } = await supabase.from('scout_profiles').upsert(
    {
      user_id: authData.user.id,
      profile: userData,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )

  if (error) throw error
}
