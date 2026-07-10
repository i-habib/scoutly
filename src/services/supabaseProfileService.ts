import type { UserProfile } from '../data/userData'
import { getSupabaseClient } from '../lib/supabaseClient'

/** Save the onboarding profile under the authenticated Scoutly account. */
export async function saveOnboardingProfile(profile: UserProfile): Promise<void> {
  const supabase = getSupabaseClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) throw userError
  if (!userData.user) {
    throw new Error('Create or sign in to an account before saving your plan.')
  }

  const { error } = await supabase.from('scout_profiles').upsert(
    {
      user_id: userData.user.id,
      profile,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )

  if (error) throw error
}
