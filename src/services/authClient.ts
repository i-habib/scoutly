import { getSupabaseClient } from '../lib/supabaseClient'

export interface AuthUser {
  id: string
  email: string | null
  role?: string
  user_metadata?: Record<string, unknown>
  app_metadata?: Record<string, unknown>
}

export interface SessionResponse {
  user: AuthUser | null
  error?: string
  emailConfirmationRequired?: boolean
}

function toAuthUser(user: {
  id: string
  email?: string
  role?: string
  user_metadata: Record<string, unknown>
  app_metadata: Record<string, unknown>
}): AuthUser {
  return {
    id: user.id,
    email: user.email ?? null,
    role: user.role,
    user_metadata: user.user_metadata,
    app_metadata: user.app_metadata,
  }
}

export async function fetchSession(): Promise<SessionResponse | null> {
  const { data, error } = await getSupabaseClient().auth.getUser()

  if (!data.user && (!error || error.name === 'AuthSessionMissingError')) {
    return null
  }

  if (error) {
    throw error
  }

  return { user: data.user ? toAuthUser(data.user) : null }
}

export async function signIn(email: string, password: string): Promise<SessionResponse> {
  const { data, error } = await getSupabaseClient().auth.signInWithPassword({ email, password })

  if (error) throw error

  return { user: data.user ? toAuthUser(data.user) : null }
}

export async function signUp(email: string, password: string): Promise<SessionResponse> {
  const emailRedirectTo =
    typeof window === 'undefined'
      ? undefined
      : new URL('/onboarding', window.location.origin).toString()

  const { data, error } = await getSupabaseClient().auth.signUp({
    email,
    password,
    options: emailRedirectTo ? { emailRedirectTo } : undefined,
  })

  if (error) throw error

  return {
    user: data.user ? toAuthUser(data.user) : null,
    emailConfirmationRequired: Boolean(data.user && !data.session),
  }
}

export async function signOut(): Promise<void> {
  const { error } = await getSupabaseClient().auth.signOut()
  if (error) throw error
}
