// Server functions for AI operations - TanStack Start native pattern
import { createServerFn } from '@tanstack/react-start'
import type { UserData } from '../data/userData'
import meritBadgesJSON from '../data/merit-badges.json'

const meritBadgesData = meritBadgesJSON.meritBadges

// ============= RATE LIMITING =============
const rateLimitMap = new Map<string, number>()
const RATE_LIMIT_MS = 10000 // 10 seconds

function checkRateLimit(key: string): void {
  const now = Date.now()
  const lastCall = rateLimitMap.get(key)
  
  if (lastCall && now - lastCall < RATE_LIMIT_MS) {
    const waitTime = Math.ceil((RATE_LIMIT_MS - (now - lastCall)) / 1000)
    throw new Error(`Rate limit: Please wait ${waitTime} seconds before analyzing again`)
  }
  
  rateLimitMap.set(key, now)
}

// ============= TYPES =============

interface EventAnalysis {
  eventId: string
  opportunities: string[]
  requirements: Array<{
    id: string
    name: string
    type: 'merit_badge' | 'rank'
    requirement: string
  }>
  signoffs: Array<{
    id: string
    name: string
  }>
  priority: 'high' | 'medium' | 'low'
}

interface GeminiHistoryMessage {
  role: 'user' | 'model'
  parts: string
}

// ============= HELPERS =============
async function callGemini(
  prompt: string,
  temperature: number = 0.5,
  schema?: any
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash'

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured on server')
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const generationConfig: any = {
    temperature,
    maxOutputTokens: 4000,
  }

  // If schema provided, use JSON schema mode for strict JSON
  if (schema) {
    generationConfig.responseMimeType = 'application/json'
    generationConfig.responseSchema = schema
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Gemini API error: ${response.status} - ${text}`)
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

function buildPlanContext(userData: UserData): string {
  const completed: string[] = []
  const incomplete: string[] = []

  const requiredMBs = meritBadgesData.filter(
    (mb: any) => mb.eagleRequired
  )

  requiredMBs.forEach((mb: any) => {
    const mbProgress = userData.progress?.[mb.id] || {}
    const totalReqs = mb.requirements?.length || 0
    
    // Count completed requirements (handles both string dates and objects with completedAt)
    const completedReqs = Object.values(mbProgress).filter((val) => {
      if (typeof val === 'string') return true
      if (val && typeof val === 'object' && 'completedAt' in val) return true
      return false
    }).length

    if (completedReqs === totalReqs && totalReqs > 0) {
      completed.push(mb.name)
    } else {
      incomplete.push(`${mb.name} (${completedReqs}/${totalReqs})`)
    }
  })

  return `Completed: ${completed.join(', ') || 'None'}\nIncomplete: ${incomplete.join(', ')}`
}

// ============= SERVER FUNCTIONS =============

export const analyzeCalendarEvents = createServerFn({
  method: 'POST',
})
  .inputValidator((data: {
    userData: UserData
    existingAnalysis?: Record<string, EventAnalysis>
    options?: {
      forceAnalyze?: string[]
      skipCache?: boolean
    }
  }) => data)
  .handler(async ({ data }) => {
    const { userData, existingAnalysis = {}, options = {} } = data

  // Rate limit check
  checkRateLimit('analyzeEvents')

  if (!userData?.events?.length) {
    return { analyses: {}, cached: [] }
  }

  const eventsNeedingAnalysis = userData.events.filter((event: any) => {
    if (options.forceAnalyze?.includes(event.id)) return true
    if (options.skipCache) return true
    return !existingAnalysis[event.id]
  })

  if (eventsNeedingAnalysis.length === 0) {
    return { analyses: existingAnalysis, cached: Object.keys(existingAnalysis) }
  }

  const requiredBadges = meritBadgesData
    .filter((mb: any) => mb.eagleRequired)
    .map((mb: any) => mb.name)

  // Define strict JSON schema for Gemini
  const responseSchema = {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        eventId: { type: 'string' },
        opportunities: {
          type: 'array',
          items: { type: 'string' }
        },
        requirements: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              type: { type: 'string', enum: ['merit_badge', 'rank'] },
              requirement: { type: 'string' }
            },
            required: ['id', 'name', 'type', 'requirement']
          }
        },
        signoffs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' }
            },
            required: ['id', 'name']
          }
        },
        priority: { type: 'string', enum: ['high', 'medium', 'low'] }
      },
      required: ['eventId', 'opportunities', 'requirements', 'signoffs', 'priority']
    }
  }

  const prompt = `Analyze these Scout events and identify Eagle advancement opportunities.

EVENTS:
${eventsNeedingAnalysis.map((e: any) => `- ID: ${e.id}, Name: ${e.name}, Date: ${e.startTime || e.start}`).join('\n')}

EAGLE-REQUIRED BADGES: ${requiredBadges.slice(0, 10).join(', ')}...

For each event, identify:
1. Advancement opportunities (skills, leadership, service)
2. Specific requirements that can be completed
3. Which merit badges/ranks can be signed off
4. Priority level (high/medium/low)

Return analysis for each event.`

  try {
    const response = await callGemini(prompt, 0.3, responseSchema)
    const analyses = JSON.parse(response) as EventAnalysis[]
    
    const result: Record<string, EventAnalysis> = { ...existingAnalysis }

    analyses.forEach((analysis) => {
      if (analysis.eventId) {
        result[analysis.eventId] = analysis
      }
    })

    return {
      analyses: result,
      cached: Object.keys(existingAnalysis).filter((id) => !options.forceAnalyze?.includes(id)),
    }
  } catch (error) {
    console.error('Failed to parse AI response:', error)
    throw new Error(`AI analysis failed: ${error instanceof Error ? error.message : 'Invalid JSON response'}`)
  }
})

export const generateInitialPlan = createServerFn({
  method: 'POST',
})
  .inputValidator((data: { userData: UserData }) => data)
  .handler(async ({ data }) => {
    const { userData } = data
  
  // Rate limit check
  checkRateLimit('generatePlan')
  
  const context = buildPlanContext(userData)

  const prompt = `You are an Eagle Scout advancement coach. Create a 4-week action plan.

SCOUT PROFILE:
- Target Eagle Date: ${userData.profile.targetEagleDate || 'Not set'}
- Current Progress: ${context}

Create a markdown plan with:
## Week 1: [Title]
- Specific tasks
- Merit badge work
- Deadlines

(Continue for 4 weeks)

Be specific, actionable, and realistic.`

  const plan = await callGemini(prompt, 0.35)
  return { plan }
})

export const sendChatMessage = createServerFn({
  method: 'POST',
})
  .inputValidator((data: {
    message: string
    history: GeminiHistoryMessage[]
    userData: UserData
  }) => data)
  .handler(async ({ data }) => {
    const { message, history, userData } = data
  
  // Rate limit check (more lenient for chat)
  checkRateLimit(`chat-${userData.profile.name || 'anonymous'}`)
  
  const context = buildPlanContext(userData)

  const systemPrompt = `You are an Eagle Scout advancement coach. Current progress: ${context}`

  const fullPrompt = history.length > 0
    ? `${systemPrompt}\n\nConversation:\n${history.map((h: any) => `${h.role}: ${h.parts}`).join('\n')}\nuser: ${message}`
    : `${systemPrompt}\n\nuser: ${message}`

  const response = await callGemini(fullPrompt, 0.7)
  
  return {
    role: 'model' as const,
    parts: response,
  }
})
