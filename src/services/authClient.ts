import { getSupabaseClient } from '../lib/supabaseClient'

const LOCAL_ONLY = import.meta.env.VITE_LOCAL_ONLY === 'true'

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

function createLocalUser(email: string | null = null): AuthUser {
  return {
    id: 'local-user',
    email,
    role: 'authenticated',
  }
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
  if (LOCAL_ONLY) {
    return { user: createLocalUser() }
  }

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
  if (LOCAL_ONLY) {
    return { user: createLocalUser(email) }
  }

  const { data, error } = await getSupabaseClient().auth.signInWithPassword({ email, password })

  if (error) throw error

  return { user: data.user ? toAuthUser(data.user) : null }
}

export async function signUp(email: string, password: string): Promise<SessionResponse> {
  if (LOCAL_ONLY) {
    return { user: createLocalUser(email) }
  }

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
  if (LOCAL_ONLY) return

  const { error } = await getSupabaseClient().auth.signOut()
  if (error) throw error
}
