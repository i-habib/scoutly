export interface ApiProfile {
  user_id: string
  name: string | null
  target_eagle_date: string | null
  troop_meeting_schedule: string | null
  current_rank: string | null
  notification_preferences: unknown | null
  troop_info: unknown | null
  created_at: string
  updated_at: string
}

export interface ApiMeritBadgeProgressRow {
  id: string
  user_id: string
  badge_id: string
  requirement_id: string
  completed_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers)
  if (init.method && init.method !== 'GET' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(input, {
    ...init,
    headers,
    credentials: 'include',
  })

  return response
}

export async function fetchProfile(): Promise<ApiProfile | null> {
  const res = await apiFetch('/api/profile', { method: 'GET' })
  if (res.status === 401) {
    return null
  }
  if (!res.ok) {
    throw new Error(`Failed to fetch profile (${res.status})`)
  }
  const data = await res.json()
  return data?.profile ?? null
}

interface UpsertProfilePayload {
  name?: string | null
  targetEagleDate?: string | null
  troopMeetingSchedule?: string | null
  currentRank?: string | null
  notificationPreferences?: unknown
  troopInfo?: unknown
}

export async function upsertProfile(payload: UpsertProfilePayload): Promise<ApiProfile> {
  const body = {
    name: payload.name ?? null,
    target_eagle_date: payload.targetEagleDate ?? null,
    troop_meeting_schedule: payload.troopMeetingSchedule ?? null,
    current_rank: payload.currentRank ?? null,
    notification_preferences: payload.notificationPreferences ?? null,
    troop_info: payload.troopInfo ?? null,
  }

  const res = await apiFetch('/api/profile', {
    method: 'PUT',
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to update profile (${res.status}): ${text}`)
  }

  const data = await res.json()
  return data.profile as ApiProfile
}

export async function fetchMeritBadgeProgress(): Promise<ApiMeritBadgeProgressRow[]> {
  const res = await apiFetch('/api/progress-merit-badge', { method: 'GET' })
  if (res.status === 401) {
    return []
  }
  if (!res.ok) {
    throw new Error(`Failed to fetch merit badge progress (${res.status})`)
  }
  const data = await res.json()
  return (data?.progress ?? []) as ApiMeritBadgeProgressRow[]
}

interface UpsertBadgeProgressPayload {
  badgeId: string
  requirementId: string
  completedAt: string | null
  notes?: string | null
}

export async function upsertMeritBadgeProgress(payload: UpsertBadgeProgressPayload): Promise<ApiMeritBadgeProgressRow> {
  const res = await apiFetch('/api/progress-merit-badge', {
    method: 'POST',
    body: JSON.stringify({
      badge_id: payload.badgeId,
      requirement_id: payload.requirementId,
      completed_at: payload.completedAt,
      notes: payload.notes ?? null,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to upsert progress (${res.status}): ${text}`)
  }

  const data = await res.json()
  return data.item as ApiMeritBadgeProgressRow
}