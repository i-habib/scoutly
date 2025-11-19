// Server functions for AI operations - TanStack Start native pattern
import { createServerFn } from '@tanstack/react-start'
import { GoogleGenAI } from '@google/genai'
import type { UserData } from '../data/userData'
import meritBadgesJSON from '../data/merit-badges.json'
import rankRequirementsJSON from '../data/rank-reqs.json'
import timeConsumingBadgesJSON from '../data/time-consuming-badges.json'
import { writeFileSync } from 'fs'
import { join } from 'path'
import { EventAnalysesArraySchema } from '../lib/aiSchemas'
import { buildTimelineState } from '../lib/buildTimeline'

const meritBadgesData = meritBadgesJSON.meritBadges
const rankRequirementsData = rankRequirementsJSON
const timeConsumingBadgeNames = new Set(timeConsumingBadgesJSON.timeConsumingBadges)

// Helper to get API key at runtime
const getApiKey = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured. Please set it in your environment variables.')
  }
  return apiKey
}

// Helper to get model name at runtime
const getModelName = () => {
  return process.env.GEMINI_MODEL || import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash-latest'
}
console.log('Using Gemini Model:', import.meta.env.VITE_GEMINI_MODEL)

// Initialize Google AI - this will be called at runtime, not at build time
const getAI = () => {
  return new GoogleGenAI({
    apiKey: getApiKey(),
  })
}
// ============= RATE LIMITING =============
const rateLimitMap = new Map<string, number>()
const RATE_LIMIT_MS = 30000 // 30 seconds

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
  opportunities: Array<{
    id: string
    kind: 'rank' | 'meritBadge' | 'meta'
    title: string
    rankId?: string
    badgeId?: string
  }>
  priority: 'high' | 'medium' | 'low'
}

interface GeminiHistoryMessage {
  role: 'user' | 'model'
  parts: Array<{ text: string }>
}

// ============= HELPERS =============
async function callGemini(
  prompt: string,
  temperature: number = 0.5,
  schema?: any,
  seed?: number
): Promise<string> {
  try {
    console.log('=== CALL GEMINI START ===')
    console.log('Model:', getModelName())
    console.log('Temperature:', temperature)
    console.log('Has schema:', !!schema)
    console.log('Prompt length:', prompt.length)
    
    const ai = getAI() // Get AI instance at runtime
    const config: any = {
      model: getModelName(),
      contents: prompt,
      config: {
        temperature,
        maxOutputTokens: 8000, // Reduced from 25000 - we want concise responses
      }
    }
    if (typeof seed === 'number') {
      config.config.seed = seed
    }
    
    // Add schema if provided for JSON mode
    if (schema) {
      console.log('Using JSON mode with schema')
      config.config.responseMimeType = 'application/json'
      config.config.responseSchema = schema
    }
    
    const response = await ai.models.generateContent(config)
    
    console.log('=== CALL GEMINI RESPONSE ===')
    console.log('Response received, type:', typeof response.text)
    console.log('Response length:', response.text?.length || 0)
    
    return response.text || ''
  } catch (error) {
    console.error('=== CALL GEMINI ERROR ===')
    console.error('Error:', error)
    
    if (error instanceof Error) {
      throw new Error(`Gemini API error: ${error.message}`)
    }
    throw new Error('Gemini API error: Unknown error occurred')
  }
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

  // Filter to only future events
  const now = new Date()
  const futureEvents = userData.events
    .filter((event: any) => {
      const eventDate = new Date(event.startTime || event.start)
      return eventDate > now
    })
    // Only analyze 'Troop Meeting' by exact title, or events tagged as 'service' or 'campout'
    .filter((event: any) => {
      const isTroopMeeting = event.type === 'meeting' && typeof event.name === 'string' && event.name.trim() === 'Troop Meeting'
      const isService = event.type === 'service'
      const isCampout = event.type === 'campout'
      return isTroopMeeting || isService || isCampout
    })

  if (futureEvents.length === 0) {
    return { analyses: existingAnalysis, cached: [] }
  }

  // Limit to 50 events max and filter those needing analysis
  const eventsNeedingAnalysis = futureEvents
    .filter((event: any) => {
      if (options.forceAnalyze?.includes(event.id)) return true
      if (options.skipCache) return true
      return !existingAnalysis[event.id]
    })
    .slice(0, 50) // Max 50 events

  if (eventsNeedingAnalysis.length === 0) {
    return { analyses: existingAnalysis, cached: Object.keys(existingAnalysis) }
  }

  // Get Scout's current rank
  const currentRank = userData.profile?.currentRank || 'rank_scout'
  const currentRankName = currentRank.replace('rank_', '').replace('_', ' ')
  // Estimate meetings/month from events and honor user override if present
  const estimateMeetingsPerMonth = () => {
    const evts = userData.events || []
    const nowLocal = new Date()
    // Prefer last calendar month exact title 'Troop Meeting'
    const lastMonthEnd = new Date(nowLocal.getFullYear(), nowLocal.getMonth(), 0)
    const lastMonthStart = new Date(lastMonthEnd.getFullYear(), lastMonthEnd.getMonth(), 1)
    const troopMeetingCount = evts
      .filter((e: any) => e.type === 'meeting' && typeof e.name === 'string' && e.name.trim() === 'Troop Meeting')
      .filter((e: any) => {
        const d = new Date(e.startTime || e.start)
        return d >= lastMonthStart && d <= lastMonthEnd
      }).length
    if (troopMeetingCount > 0) return troopMeetingCount

    // Fallback: 90-day month-average of meetings
    const ninetyDaysAgo = new Date(nowLocal.getTime() - 90 * 24 * 60 * 60 * 1000)
    const meetings = evts.filter((e: any) => e.type === 'meeting').filter((e: any) => {
      const d = new Date(e.startTime || e.start)
      return d >= ninetyDaysAgo && d <= nowLocal
    })
    const byMonth: Record<string, number> = {}
    meetings.forEach((e: any) => {
      const d = new Date(e.startTime || e.start)
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      byMonth[key] = (byMonth[key] || 0) + 1
    })
    const months = Object.keys(byMonth)
    if (months.length > 0) {
      const avg = months.reduce((sum, k) => sum + byMonth[k], 0) / months.length
      return Math.max(1, Math.round(avg))
    }
    return 4
  }
  const meetingsPerMonthAI = estimateMeetingsPerMonth()
  const meetingsPerMonthOverride = userData.profile?.meetingsPerMonthOverride || meetingsPerMonthAI
  // Build pacing metrics via timeline builder with explicit meetings/month override
  const timeline = buildTimelineState(userData, { meetingsPerMonthOverride })
  const pacing = timeline.ok ? {
    reqsPerMeeting: timeline.reqsPerMeeting,
    adjustedReqsPerMeeting: timeline.adjustedReqsPerMeeting,
    remainingMeetings: timeline.remainingMeetingsForCurrentRank,
    currentRankName: timeline.currentRankName,
    campoutPriority: timeline.campoutPriority,
    estimatedCampoutSignoffs: timeline.estimatedCampoutSignoffs,
    signoffsPerMeetingTarget: (timeline as any).signoffsPerMeetingTarget || 1,
  } : {
    reqsPerMeeting: 0,
    adjustedReqsPerMeeting: 0,
    remainingMeetings: 0,
    currentRankName: currentRankName,
    campoutPriority: 'low' as const,
    estimatedCampoutSignoffs: 0,
    signoffsPerMeetingTarget: 1,
  }
  
  // Determine if Scout should focus on rank advancement or merit badges
  const rankOrder = ['rank_scout', 'rank_tenderfoot', 'rank_second_class', 'rank_first_class', 'rank_star', 'rank_life', 'rank_eagle']
  const currentRankIndex = rankOrder.indexOf(currentRank)
  const isFirstClassOrAbove = currentRankIndex >= 3 // First Class, Star, Life, Eagle
  
  // Get NEXT rank requirements (what they're working toward)
  const nextRankIndex = currentRankIndex + 1
  const nextRank = nextRankIndex < rankOrder.length ? rankOrder[nextRankIndex] : null
  const nextRankData = nextRank ? rankRequirementsData.find((r: any) => r.id === nextRank) : null
  
  const nextRankRequirements: string[] = []
  if (nextRankData && nextRank) {
    nextRankData.requirements.forEach((req: any) => {
      const progress = userData.rankProgress?.[nextRank]?.[req.id]
      const isComplete = typeof progress === 'string' || (progress && typeof progress === 'object' && 'completedAt' in progress)
      if (!isComplete) {
        nextRankRequirements.push(`${nextRankData.name} ${req.id}: ${req.text}`)
      }
    })
  }
  
  // Get in-progress and incomplete merit badges
  const inProgressMeritBadges: string[] = []
  const incompleteMeritBadges: string[] = []
  const timeConsumingInProgress: string[] = []
  
  meritBadgesData.forEach((mb: any) => {
    const mbProgress = userData.progress?.[mb.id] || {}
    const totalReqs = mb.requirements?.length || 0
    const completedReqs = Object.values(mbProgress).filter((val) => {
      if (typeof val === 'string') return true
      if (val && typeof val === 'object' && 'completedAt' in val) return true
      return false
    }).length
    
    const isTimeConsuming = timeConsumingBadgeNames.has(mb.name)
    const badgeMarker = isTimeConsuming ? ' ⏰TIME-CONSUMING' : ''
    
    if (completedReqs > 0 && completedReqs < totalReqs) {
      const badgeInfo = `${mb.name} (${completedReqs}/${totalReqs} complete)${mb.eagleRequired ? ' [EAGLE REQUIRED]' : ''}${badgeMarker}`
      inProgressMeritBadges.push(badgeInfo)
      if (isTimeConsuming) {
        timeConsumingInProgress.push(mb.name)
      }
    } else if (completedReqs === 0 && mb.eagleRequired) {
      incompleteMeritBadges.push(mb.name + badgeMarker)
    }
  })
  
  // Get all merit badge names for reference
  const allMeritBadges = meritBadgesData.map((mb: any) => mb.name).join(', ')

  // Define strict JSON schema for Gemini (Schema v3)
  const responseSchema = {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        eventId: { type: 'string', description: 'Unique event ID' },
        opportunities: {
          type: 'array',
          description: 'Actionable advancement opportunities only',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Requirement or badge requirement ID' },
              kind: { type: 'string', enum: ['rank', 'meritBadge', 'meta'] },
              title: { type: 'string', description: 'Actionable short description' },
              rankId: { type: 'string' },
              badgeId: { type: 'string' }
            },
            required: ['id', 'kind', 'title']
          }
        },
        signoffs: {
          type: 'array',
          description: 'Exact rank requirements to complete at this event',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              rankId: { type: 'string' }
            },
            required: ['id', 'name']
          }
        },
        priority: { type: 'string', enum: ['high', 'medium', 'low'] }
      },
      required: ['eventId', 'opportunities', 'signoffs', 'priority']
    }
  }

  // ==== Rank progress full context (completed vs total per rank) ====
  const rankProgressLines: string[] = []
  rankOrder.forEach(rId => {
    const rankData = rankRequirementsData.find((r: any) => r.id === rId)
    if (!rankData) return
    const reqs = rankData.requirements || []
    let total = reqs.length
    let completed = 0
    reqs.forEach((req: any) => {
      const progress = userData.rankProgress?.[rId]?.[req.id]
      const done = typeof progress === 'string' || (progress && typeof progress === 'object' && 'completedAt' in progress)
      if (done) completed++
    })
    const rankNameFull = rankData.name
    rankProgressLines.push(`${rankNameFull}: ${completed}/${total} complete`)
  })

  const prompt = `Analyze ${eventsNeedingAnalysis.length} Scout events for advancement opportunities. Return JSON array ONLY.

=== SCOUT PROFILE ===
Current Rank: ${currentRankName}
Next Rank: ${nextRankData ? nextRankData.name : 'Completed all ranks'}
Rank Progress Summary:
${rankProgressLines.join('\n')}
Advancement Focus: ${isFirstClassOrAbove ? 'MERIT BADGES (rank advancement complete through First Class)' : 'RANK SIGNOFFS (priority for advancement)'}

=== PACING & CAMPOUT SIGNALS ===
Meetings per month (estimated/override): ${meetingsPerMonthOverride}
Reqs per meeting (raw): ${pacing.reqsPerMeeting.toFixed ? pacing.reqsPerMeeting.toFixed(2) : pacing.reqsPerMeeting}
Reqs per meeting (adjusted for campouts): ${pacing.adjustedReqsPerMeeting.toFixed ? pacing.adjustedReqsPerMeeting.toFixed(2) : pacing.adjustedReqsPerMeeting}
Target signoffs per meeting: ${pacing.signoffsPerMeetingTarget}
Remaining meetings for current rank (${pacing.currentRankName}): ${pacing.remainingMeetings}
Estimated rank signoffs at upcoming campouts: ${pacing.estimatedCampoutSignoffs}
Campout Priority: ${pacing.campoutPriority.toUpperCase()}

=== NEXT RANK REMAINING REQUIREMENTS (${nextRankData?.name || 'N/A'}) ===
${nextRankRequirements.length > 0 ? nextRankRequirements.map(r => r).slice(0, 30).join('\n') : 'All requirements complete!'}
${nextRankRequirements.length > 30 ? `\n... and ${nextRankRequirements.length - 30} more requirements` : ''}

=== MERIT BADGE PROGRESS ===
In Progress (${inProgressMeritBadges.length}):
${inProgressMeritBadges.slice(0, 10).join('\n') || 'None started'}
${inProgressMeritBadges.length > 10 ? `\n... and ${inProgressMeritBadges.length - 10} more in progress` : ''}

Not Started Eagle-Required (${incompleteMeritBadges.length}):
${incompleteMeritBadges.slice(0, 15).join(', ') || 'All Eagle badges complete!'}
${incompleteMeritBadges.length > 15 ? `... and ${incompleteMeritBadges.length - 15} more` : ''}

⏰ TIME-CONSUMING BADGES NOTE:
Badges marked with ⏰ take 3+ weeks due to time requirements (e.g., Personal Fitness: 12 weeks, Camping: multiple campouts).
${timeConsumingInProgress.length > 0 ? `Currently in progress: ${timeConsumingInProgress.join(', ')}` : 'Start these early!'}
Time-consuming Eagle badges: Personal Fitness, Personal Management, Family Life, Camping, Hiking/Cycling/Swimming, Environmental Science/Sustainability

=== ALL AVAILABLE MERIT BADGES ===
${allMeritBadges}

=== EVENTS TO ANALYZE ===
${eventsNeedingAnalysis.map((e: any) => `${e.id}|${e.name}|${e.type || 'meeting'}`).join('\n')}

=== INSTRUCTIONS ===
For EACH event, return an object:
{
  "eventId": "exact_id",
  "opportunities": [
    {"id": "req_identifier", "kind": "rank", "title": "Start Second Class 2b - Demonstrate ...", "rankId": "rank_second_class"},
    {"id": "mb_camping:9a", "kind": "meritBadge", "title": "Camping 9a - Plan trail meals", "badgeId": "mb_camping"}
  ],
  "signoffs": [
    {"id": "req_2b", "name": "Second Class 2b — Demonstrate ...", "rankId": "rank_second_class"}
  ],
  "priority": "high|medium|low"
}

**MEETINGS (type="meeting")**:
${isFirstClassOrAbove ? `
- Focus: Merit badge work & leadership
- opportunities: 3-6 MERIT BADGE or leadership items ONLY (use kind=meritBadge or kind=meta)
- priority: 'medium' generally unless exceptionally strategic (then 'high')
- Pacing target: ~${pacing.adjustedReqsPerMeeting.toFixed ? pacing.adjustedReqsPerMeeting.toFixed(2) : pacing.adjustedReqsPerMeeting} reqs/meeting equivalent
` : `
- Focus: RANK ADVANCEMENT ONLY (critical for ${currentRankName} → ${nextRankData?.name})
- ⚠️ Do NOT list meritBadge opportunities unless time-consuming badge kickoff (kind=meritBadge allowed for Personal Fitness / Management)
- opportunities: 4-8 rank items (kind=rank) referencing NEXT RANK REMAINING REQUIREMENTS
- signoffs: You MUST list EXACTLY ${pacing.signoffsPerMeetingTarget} rank requirements to complete at this meeting (full text in name, correct id). Choose the highest-impact ones.
- priority: 'high' if enough solid rank opportunities and signoffs, else 'medium'/'low'
- Use full rank names in titles.
`}

**CAMPOUTS/HIKES (type="campout" or "hike")**:
${isFirstClassOrAbove ? `
- Focus: Merit badge progress acceleration (kind=meritBadge)
- opportunities: 6-12 merit badge requirements (in-progress first, Eagle-required next)
- Include camp-specific actions (e.g., outdoor cooking, nature observation) with correct requirement IDs
- priority: 'high' if 5+ Eagle-required badge actions, 'medium' if 2-4, 'low' otherwise
- Campout Priority Signal: ${pacing.campoutPriority.toUpperCase()} influences number of opportunities (HIGH -> add more)
` : `
- Focus: Rank requirements (kind=rank) FIRST then optional meritBadge items
- opportunities: 6-12 total, majority rank (>=60%)
- signoffs: List up to ${pacing.signoffsPerMeetingTarget} rank signoffs if outdoor skills applicable at this campout
- If campoutPriority HIGH, emphasize outdoor skills requirements
- priority: 'high' if 3+ rank opportunities, 'medium' if 1-2, 'low' if none
`}

**SERVICE/OTHER (all other types)**:
- opportunities: Use kind=meta for 1-3 service planning actions (e.g., "Log 3 service hours - photograph work")
- priority: High (>=3 hrs), Medium (1-2 hrs), Low (<1 hr or unclear)

CRITICAL:
- Use full rank names in titles (e.g., "Second Class 2b - Discuss ...")
- Titles MUST start with imperative verb (Plan / Practice / Complete / Review / Record / Start / Finish)
- Each opportunity MUST include correct id & kind.

Return ONLY valid JSON array. No markdown, no explanations.`

  try {
  const response = await callGemini(prompt, 0.25, responseSchema, 4242)
    
    console.log('=== GEMINI API RESPONSE ===')
    console.log('Response type:', typeof response)
    console.log('Response length:', response?.length)
    console.log('First 500 chars:', response?.substring(0, 500))
    console.log('Last 200 chars:', response?.substring(Math.max(0, response?.length - 200)))
    console.log('Full response:', response)
    console.log('=== END RESPONSE ===')
    
    // DEBUG: Save raw response to file
   
    
    // Clean the response - remove markdown code blocks and extra text
    let cleanedResponse = response.trim()
    
    // Remove markdown code blocks if present
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/i, '').replace(/```\s*$/, '')
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/```\s*$/, '')
    }
    
    // Try to find JSON array boundaries if response has extra text
    const arrayStart = cleanedResponse.indexOf('[')
    const arrayEnd = cleanedResponse.lastIndexOf(']')
    
    if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
      cleanedResponse = cleanedResponse.substring(arrayStart, arrayEnd + 1)
    }
    
    console.log('=== CLEANED RESPONSE ===')
    console.log('Cleaned length:', cleanedResponse.length)
    console.log('Cleaned response:', cleanedResponse)
    
    // Check if JSON is incomplete (doesn't end with ] or })
    const lastChar = cleanedResponse.trim().slice(-1)
    if (lastChar !== ']' && lastChar !== '}') {
      console.warn('⚠️ WARNING: Response appears incomplete! Last char:', lastChar)
      console.log('Attempting to fix incomplete JSON...')
      
      // Try to complete the JSON by finding the last complete object
      // Count opening/closing brackets to determine what's missing
      const openBrackets = (cleanedResponse.match(/\[/g) || []).length
      const closeBrackets = (cleanedResponse.match(/\]/g) || []).length
      const openBraces = (cleanedResponse.match(/\{/g) || []).length
      const closeBraces = (cleanedResponse.match(/\}/g) || []).length
      
      console.log('Open [:', openBrackets, 'Close ]:', closeBrackets)
      console.log('Open {:', openBraces, 'Close }:', closeBraces)
      
      // Add missing closing brackets/braces
      let fixed = cleanedResponse
      
      // Close incomplete strings if needed
      const quotes = (fixed.match(/"/g) || []).length
      if (quotes % 2 !== 0) {
        console.log('Closing incomplete string')
        fixed += '"'
      }
      
      // Close objects
      for (let i = 0; i < openBraces - closeBraces; i++) {
        fixed += '}'
      }
      
      // Close arrays
      for (let i = 0; i < openBrackets - closeBrackets; i++) {
        fixed += ']'
      }
      
      cleanedResponse = fixed
      console.log('Fixed response:', cleanedResponse)
    }
    
    console.log('=== END CLEANED ===')
    
    // DEBUG: Save cleaned response to file
   
    
    const parsed = JSON.parse(cleanedResponse)
    const validation = EventAnalysesArraySchema.safeParse(parsed)
    if (!validation.success) {
      console.error('Zod validation errors:', validation.error.flatten())
      throw new Error('AI response validation failed')
    }
  let analyses = validation.data as EventAnalysis[]
    
    console.log('=== PARSED ANALYSES ===')
    console.log('Number of analyses:', analyses?.length)
    console.log('Analyses:', JSON.stringify(analyses, null, 2))
    console.log('=== END PARSED ===')
    
    // Enforce exact signoffs count for meeting events when focusing on rank advancement
    try {
      const targetSignoffs = (pacing as any).signoffsPerMeetingTarget || 1
      analyses = analyses.map((a) => {
        const ev = (userData.events || []).find((e: any) => e.id === a.eventId)
        if (!ev) return a
        if (ev.type === 'meeting' && !isFirstClassOrAbove) {
          if (Array.isArray((a as any).signoffs)) {
            const trimmed = (a as any).signoffs.slice(0, Math.max(1, targetSignoffs))
            return { ...a, signoffs: trimmed }
          } else {
            return { ...a, signoffs: [] }
          }
        }
        if (ev.type === 'campout' && Array.isArray((a as any).signoffs)) {
          const trimmed = (a as any).signoffs.slice(0, Math.max(1, targetSignoffs))
          return { ...a, signoffs: trimmed }
        }
        return a
      })
    } catch {}

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
    console.error('=== ERROR PARSING AI RESPONSE ===')
    console.error('Error:', error)
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error')
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

  const prompt = `You are an experienced Eagle Scout advisor creating a personalized 4-week advancement plan.

SCOUT PROFILE:
- Target Eagle Date: ${userData.profile.targetEagleDate || 'Not set'}
- Current Progress: ${context}

Create a DETAILED, actionable 4-week plan in markdown format. For each week:

## Week [Number]: [Compelling Title]

### Weekly Goal Summary
- **Total Requirements to Complete:** [NUMBER] specific requirements
- **Sign-offs Needed:** [NUMBER] leader/counselor signatures
- **Time Commitment:** [HOURS] hours estimated for the week

### Priority Goals
- List 2-3 main objectives for the week with specific completion criteria

### Merit Badge Work
- Name each badge being worked on
- List SPECIFIC requirements to complete with exact numbers (e.g., "Camping 9a - Plan and cook 3 trail meals")
- **Count format:** "Complete 3 requirements: Camping 9a, First Aid 5b, Swimming 6c"
- Include materials needed and who to contact for sign-offs
- Estimate time required for each task

### Rank Advancement
- Specific position of responsibility hours to complete
- Leadership opportunities to pursue  
- Service hours and project ideas
- **Count format:** "Complete 2 rank requirements: Star 4 (leadership), Star 5 (service hours)"

### Sign-Off Tracking
- List all sign-offs needed this week with specific people to contact
- Example: "Get 4 sign-offs: Camping 9a (Mr. Smith), First Aid 5b (Troop Leader), Star leadership (Scoutmaster), Star service (Project coordinator)"

### Action Items with Deadlines
- Break down each goal into concrete steps
- Assign realistic dates within the week
- Include preparation tasks (e.g., "Tuesday: Email merit badge counselor", "Thursday: Gather camping gear")

### Success Checklist
- 4-5 checkboxes for the week's must-complete items

IMPORTANT: At the start of EACH week, include the "Weekly Goal Summary" section with specific counts of:
1. How many total requirements to complete (number)
2. How many sign-offs needed (number)
3. Estimated time commitment in hours

Be EXTREMELY specific. Instead of "Work on First Aid", say "Complete First Aid requirements 5a-5c by practicing CPR on training dummy at troop meeting, get leader sign-off". Include practical tips, common pitfalls to avoid, and pro tips from experienced Scouts.

Make the plan inspiring yet achievable!`

  const plan = await callGemini(prompt, 0.35)
  return { plan }
})

export const sendLongTermChatMessage = createServerFn({
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
  checkRateLimit(`longTermChat-${userData.profile.name || 'anonymous'}`)
  
  const currentRank = userData.profile?.currentRank || 'rank_scout'
  const targetEagleDate = userData.profile?.targetEagleDate
  const context = buildPlanContext(userData)

  const systemPrompt = `You are an experienced Eagle Scout advisor focused on LONG-TERM strategic planning (6+ months to Eagle).

SCOUT'S PROFILE:
- Current Rank: ${currentRank.replace('rank_', '')}
- Target Eagle Date: ${targetEagleDate || 'Not set'}
- Current Progress: ${context}

YOUR FOCUS: Big picture strategy, timeline management, major milestones

When answering questions:
- Think in terms of months and years, not weeks
- Focus on rank progression timelines and minimum time requirements
- Emphasize time-consuming badges (Personal Fitness: 12 weeks, Personal Management: 13 weeks, Family Life: 3 months)
- Discuss which badges to START EARLY (even if First Class isn't reached yet)
- Help plan around school year, summer camps, major life events
- Provide deadline-driven milestone planning
- Warn about timing bottlenecks (waiting for rank tenure, project approval)
- Keep responses strategic and high-level

CRITICAL: Be concise (300-500 words max). Scouts have short attention spans. Use bullet points.`

  try {
    // Build the full conversation with system prompt
    const fullPrompt = history.length > 0
      ? `${systemPrompt}\n\nConversation:\n${history.map((h) => `${h.role}: ${h.parts[0].text}`).join('\n')}\nuser: ${message}`
      : `${systemPrompt}\n\nuser: ${message}`

    console.log('=== LONG-TERM CHAT REQUEST ===')
    console.log('Model:', getModelName())
    console.log('Message:', message)
    console.log('History length:', history.length)
    
    const ai = getAI()
    const response = await ai.models.generateContent({
      model: getModelName(),
      contents: fullPrompt,
      config: {
        temperature: 0.6,
        maxOutputTokens: 2000, // Shorter for concise responses
      },
    })
    
    console.log('=== LONG-TERM CHAT RESPONSE ===')
    console.log('Response length:', response.text?.length)
    
    return {
      role: 'model' as const,
      parts: response.text || '',
    }
  } catch (error) {
    console.error('=== LONG-TERM CHAT ERROR ===', error)
    if (error instanceof Error) {
      throw new Error(`Long-term chat error: ${error.message}`)
    }
    throw new Error('Long-term chat error: Unknown error occurred')
  }
})

export const sendShortTermChatMessage = createServerFn({
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
  checkRateLimit(`shortTermChat-${userData.profile.name || 'anonymous'}`)
  
  const currentRank = userData.profile?.currentRank || 'rank_scout'
  const context = buildPlanContext(userData)

  const systemPrompt = `You are an experienced Eagle Scout advisor focused on SHORT-TERM tactical execution (next 2-4 weeks).

SCOUT'S PROFILE:
- Current Rank: ${currentRank.replace('rank_', '')}
- Current Progress: ${context}

YOUR FOCUS: Immediate actionable steps, this week's signoffs, upcoming meetings/campouts

When answering questions:
- Think in terms of days and weeks, not months
- Be EXTREMELY specific with step-by-step instructions
- Reference exact merit badge requirement numbers (e.g., "Camping 9a")
- Focus on what can be done THIS WEEK at the next meeting or campout
- Provide practical tips and real-world examples
- Suggest specific resources (BSA handbook pages, YouTube tutorials)
- Include materials needed and who to contact for sign-offs
- Break down complex tasks into manageable daily/weekly steps
- Give time estimates for each task
- Warn about common mistakes and how to avoid them
- Use encouraging, motivational feedback
- Use proper Scout terminology

DETAILED and ACTIONABLE. Include checklists, preparation steps, and follow-up actions.`

  try {
    // Build the full conversation with system prompt
    const fullPrompt = history.length > 0
      ? `${systemPrompt}\n\nConversation:\n${history.map((h) => `${h.role}: ${h.parts[0].text}`).join('\n')}\nuser: ${message}`
      : `${systemPrompt}\n\nuser: ${message}`

    console.log('=== SHORT-TERM CHAT REQUEST ===')
    console.log('Model:', getModelName())
    console.log('Message:', message)
    console.log('History length:', history.length)
    
    const ai = getAI()
    const response = await ai.models.generateContent({
      model: getModelName(),
      contents: fullPrompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 3000, // Longer for detailed instructions
      },
    })
    
    console.log('=== SHORT-TERM CHAT RESPONSE ===')
    console.log('Response length:', response.text?.length)
    
    return {
      role: 'model' as const,
      parts: response.text || '',
    }
  } catch (error) {
    console.error('=== SHORT-TERM CHAT ERROR ===', error)
    if (error instanceof Error) {
      throw new Error(`Short-term chat error: ${error.message}`)
    }
    throw new Error('Short-term chat error: Unknown error occurred')
  }
})

// ============= LONG-TERM DEADLINE PLANNER =============
export const generateLongTermPlan = createServerFn({
  method: 'POST',
})
  .inputValidator((data: { userData: UserData }) => data)
  .handler(async ({ data }) => {
    const { userData } = data
  
  // Rate limit check
  checkRateLimit('generateLongTermPlan')
  
  const currentRank = userData.profile?.currentRank || 'rank_scout'
  const targetEagleDate = userData.profile?.targetEagleDate
  
  const prompt = `Create a CONCISE long-term Eagle Scout timeline (< 300 words). Work backwards from the target date.

SCOUT INFO:
- Current Rank: ${currentRank.replace('rank_', '')}
- Target Eagle Date: ${targetEagleDate || 'Not set'}
- Today: ${new Date().toISOString().split('T')[0]}

MINIMUM TIME REQUIREMENTS:
- Tenderfoot to Second Class: 1 month
- Second Class to First Class: 2 months
- First Class to Star: 4 months
- Star to Life: 6 months
- Life to Eagle: 6 months
- Eagle Project: 3-4 months planning + execution

Create a deadline-driven timeline with:
1. **Critical Deadlines** - When each rank MUST be achieved (work backwards)
2. **Red Flags** - Any timing conflicts or impossible deadlines
3. **Buffer Time** - Recommended earlier completion dates
4. **Key Milestones** - Major merit badge completions needed

Format:
## Eagle Timeline

**Target: [Date]**

### Rank Deadlines (Minimum Requirements)
- Eagle: [Date] (need 6 months at Life)
- Life: [Date] (need 6 months at Star)
- Star: [Date] (need 4 months at First Class)
- [Continue for all ranks]

### ⚠️ Timing Analysis
[Any red flags or concerns]

### 📅 Recommended Accelerated Dates
[Suggest earlier dates with buffer time]

Keep it SHORT and ACTIONABLE. Focus on dates and deadlines only.`

  const plan = await callGemini(prompt, 0.4)
  return { plan }
})

// ============= SHORT-TERM TACTICAL PLANNER (2-4 months) =============
export const generateShortTermPlan = createServerFn({
  method: 'POST',
})
  .inputValidator((data: { userData: UserData }) => data)
  .handler(async ({ data }) => {
    const { userData } = data
  
  // Rate limit check
  checkRateLimit('generateShortTermPlan')
  
  const currentRank = userData.profile?.currentRank || 'rank_scout'
  
  // Get time-consuming badge context
  const inProgressTimeConsuming: string[] = []
  const notStartedTimeConsuming: string[] = []
  
  meritBadgesData.forEach((mb: any) => {
    if (!timeConsumingBadgeNames.has(mb.name)) return
    
    const mbProgress = userData.progress?.[mb.id] || {}
    const totalReqs = mb.requirements?.length || 0
    const completedReqs = Object.values(mbProgress).filter((val) => {
      if (typeof val === 'string') return true
      if (val && typeof val === 'object' && 'completedAt' in val) return true
      return false
    }).length
    
    if (completedReqs > 0 && completedReqs < totalReqs) {
      inProgressTimeConsuming.push(`${mb.name} (${completedReqs}/${totalReqs})`)
    } else if (completedReqs === 0 && mb.eagleRequired) {
      notStartedTimeConsuming.push(mb.name)
    }
  })
  
  const context = buildPlanContext(userData)

  const prompt = `Create a TACTICAL 2-4 month advancement plan focusing on time-consuming badges and weekly signoffs.

SCOUT INFO:
- Current Rank: ${currentRank.replace('rank_', '')}
- Current Progress: ${context}

⏰ TIME-CONSUMING BADGES:
In Progress: ${inProgressTimeConsuming.join(', ') || 'None'}
Not Started (Eagle-Required): ${notStartedTimeConsuming.join(', ') || 'None'}

TIME-CONSUMING BADGES REQUIRE:
- Personal Fitness: 12 weeks (daily logs)
- Personal Management: 13 weeks (budget tracking)
- Family Life: 3 months (family activities)
- Camping: Multiple campouts over months
- Hiking/Cycling/Swimming: Multiple sessions
- Citizenship badges: Several weeks of meetings/research

Create a plan with:

## Priority 1: Start Time-Consuming Badges NOW
[List which badges to start this week and WHY]

## Weekly Signoff Goals (Next 8-12 weeks)
Week 1-2: [X signoffs - specific requirements]
Week 3-4: [X signoffs - specific requirements]
Week 5-8: [X signoffs - specific requirements]
Week 9-12: [X signoffs - specific requirements]

## Quick-Win Badges (Can finish in 1-2 weeks)
[List badges that can be knocked out quickly between slow ones]

## Monthly Checkpoints
Month 1: [What should be complete]
Month 2: [What should be complete]
Month 3: [What should be complete]

Focus on PARALLEL PROGRESS - work on time-consuming badges while completing quick ones. Be specific about which requirements to target each week.`

  const plan = await callGemini(prompt, 0.4)
  return { plan }
})
