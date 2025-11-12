export interface AuthUser {
  id: string
  email: string | null
  role?: string
  user_metadata?: Record<string, unknown>
  app_metadata?: Record<string, unknown>
}

interface SessionResponse {
  user: AuthUser | null
  error?: string
  emailConfirmationRequired?: boolean
}

async function request<T>(input: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    credentials: 'include',
  })

  const text = await response.text()
  const data = text ? (JSON.parse(text) as T) : ({} as T)

  if (!response.ok) {
    const message = (data as any)?.error ?? response.statusText
    throw new Error(typeof message === 'string' ? message : 'Request failed')
  }

  return data
}

export async function fetchSession(): Promise<SessionResponse | null> {
  const response = await fetch('/api/auth/session', {
    method: 'GET',
    credentials: 'include',
  })

  if (response.status === 401) {
    return null
  }

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || 'Failed to fetch session')
  }

  return (await response.json()) as SessionResponse
}

export async function signIn(email: string, password: string): Promise<SessionResponse> {
  return request<SessionResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function signUp(email: string, password: string): Promise<SessionResponse> {
  return request<SessionResponse>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function signOut(): Promise<void> {
  await request('/api/auth/logout', {
    method: 'POST',
  })
}
