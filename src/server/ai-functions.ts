// Server functions for AI operations - TanStack Start native pattern
import { createServerFn } from '@tanstack/react-start'
import { GoogleGenAI } from '@google/genai'
import type { UserData } from '../data/userData'
import meritBadgesJSON from '../data/merit-badges.json'
import rankRequirementsJSON from '../data/rank-reqs.json'
import timeConsumingBadgesJSON from '../data/time-consuming-badges.json'
import { writeFileSync } from 'fs'
import { join } from 'path'

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
  opportunities: string[]
  signoffs: Array<{
    id: string
    name: string
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
  schema?: any
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
  const futureEvents = userData.events.filter((event: any) => {
    const eventDate = new Date(event.startTime || event.start)
    return eventDate > now
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

  // Define strict JSON schema for Gemini
  const responseSchema = {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        eventId: { 
          type: 'string',
          description: 'The unique ID of the event'
        },
        opportunities: {
          type: 'array',
          items: { type: 'string' },
          description: 'Short list of what can be done at this event'
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
          },
          description: 'List of requirements that can be signed off'
        },
        priority: { 
          type: 'string',
          enum: ['high', 'medium', 'low'],
          description: 'Priority level based on advancement opportunities'
        }
      },
      required: ['eventId', 'opportunities', 'signoffs', 'priority']
    }
  }

  const prompt = `Analyze ${eventsNeedingAnalysis.length} Scout events for advancement opportunities. Return JSON array ONLY.

=== SCOUT PROFILE ===
Current Rank: ${currentRankName}
Next Rank: ${nextRankData ? nextRankData.name : 'Eagle (completed ranks)'}
Advancement Focus: ${isFirstClassOrAbove ? 'MERIT BADGES (rank advancement complete through First Class)' : 'RANK SIGNOFFS (priority for advancement)'}

=== NEXT RANK REQUIREMENTS (${nextRankData?.name || 'N/A'}) ===
${nextRankRequirements.length > 0 ? nextRankRequirements.slice(0, 20).join('\n') : 'All requirements complete!'}
${nextRankRequirements.length > 20 ? `\n... and ${nextRankRequirements.length - 20} more requirements` : ''}

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
For EACH event, return:
{
  "eventId": "exact_id",
  "opportunities": ["Detailed opportunity 1", "Detailed opportunity 2", ...],
  "signoffs": [{"id": "requirement_id", "name": "Full requirement description"}, ...],
  "priority": "high|medium|low"
}

**MEETINGS (type="meeting")**:
${isFirstClassOrAbove ? `
- Focus: Merit badge work and leadership
- opportunities: 3-5 items mentioning merit badge work or leadership positions
- signoffs: Merit badge requirements if applicable, otherwise leadership/service hour tracking
- priority: 'medium' (meetings less critical after First Class)
` : `
- Focus: RANK ADVANCEMENT (critical for ${currentRankName} → ${nextRankData?.name})
- opportunities: 3-5 SPECIFIC rank requirements from the list above that can be completed/demonstrated
- signoffs: 3-10 rank requirements with full descriptions from the "NEXT RANK REQUIREMENTS" list
- priority: 'high' if 5+ rank signoffs, 'medium' if 3-4, 'low' if 1-2
`}

**CAMPOUTS/HIKES (type="campout" or "hike")**:
${isFirstClassOrAbove ? `
- Focus: MERIT BADGES (main advancement path after First Class)
- opportunities: 5-10 DETAILED merit badge activities, prioritizing:
  1. In-progress badges (help complete started badges)
  2. Eagle-required badges not started
  3. Other merit badges relevant to campout activities
- signoffs: 5-10 specific merit badge requirements (format: {"id": "camping_9a", "name": "Plan and cook trail meals"})
- priority: 'high' if 5+ Eagle-required badge opportunities, 'medium' if 2-4, 'low' if 0-1
` : `
- Focus: Both rank requirements AND merit badges
- opportunities: 5-10 items mixing rank requirements and relevant merit badge work
- signoffs: Both rank requirements and merit badge requirements (5-10 total)
- priority: 'high' if 3+ rank signoffs OR 3+ Eagle badge opportunities, 'medium' if some of each, 'low' otherwise
`}

**SERVICE/OTHER (all other types)**:
- opportunities: [] (empty array - no detailed analysis needed)
- signoffs: [] (empty array - service hours tracked elsewhere)  
- priority: Based on event name/description, estimate service value:
  * 'high' if likely 3+ service hours (major projects, full day events)
  * 'medium' if likely 1-2 hours (smaller projects, short events)
  * 'low' if minimal service hours (<1 hour) or unclear service value

CRITICAL: Use FULL requirement descriptions from the lists above for signoffs.name. Be specific and detailed.

Return ONLY valid JSON array. No markdown, no explanations.`

  try {
    const response = await callGemini(prompt, 0.3, responseSchema)
    
    console.log('=== GEMINI API RESPONSE ===')
    console.log('Response type:', typeof response)
    console.log('Response length:', response?.length)
    console.log('First 500 chars:', response?.substring(0, 500))
    console.log('Last 200 chars:', response?.substring(Math.max(0, response?.length - 200)))
    console.log('Full response:', response)
    console.log('=== END RESPONSE ===')
    
    // DEBUG: Save raw response to file
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const debugPath = join(process.cwd(), `debug-response-${timestamp}.json`)
      writeFileSync(debugPath, response, 'utf-8')
      console.log('✅ DEBUG: Raw response saved to:', debugPath)
    } catch (fsError) {
      console.error('⚠️ Could not save debug file:', fsError)
    }
    
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
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const debugPath = join(process.cwd(), `debug-cleaned-${timestamp}.json`)
      writeFileSync(debugPath, cleanedResponse, 'utf-8')
      console.log('✅ DEBUG: Cleaned response saved to:', debugPath)
    } catch (fsError) {
      console.error('⚠️ Could not save debug file:', fsError)
    }
    
    const analyses = JSON.parse(cleanedResponse) as EventAnalysis[]
    
    console.log('=== PARSED ANALYSES ===')
    console.log('Number of analyses:', analyses?.length)
    console.log('Analyses:', JSON.stringify(analyses, null, 2))
    console.log('=== END PARSED ===')
    
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

  const systemPrompt = `You are an experienced Eagle Scout advisor and mentor. You provide DETAILED, specific, and actionable advice.

SCOUT'S CURRENT PROGRESS: ${context}

When answering questions:
- Be extremely specific with step-by-step instructions
- Reference exact merit badge requirement numbers when relevant
- Provide practical tips and real-world examples
- Suggest specific resources (BSA handbook pages, YouTube tutorials, local contacts)
- Break down complex tasks into manageable steps
- Include time estimates and difficulty ratings
- Warn about common mistakes and how to avoid them
- Give encouraging, motivational feedback
- Use Scout terminology correctly

If asked about a merit badge, explain the specific requirements, what materials are needed, estimated time to complete, and tips for success.`

  try {
    // Build the full conversation with system prompt
    const fullPrompt = history.length > 0
      ? `${systemPrompt}\n\nConversation:\n${history.map((h) => `${h.role}: ${h.parts[0].text}`).join('\n')}\nuser: ${message}`
      : `${systemPrompt}\n\nuser: ${message}`

    console.log('=== CHAT REQUEST ===')
    console.log('Model:', getModelName())
    console.log('Message:', message)
    console.log('History length:', history.length)
    
    const ai = getAI() // Get AI instance at runtime
    const response = await ai.models.generateContent({
      model: getModelName(),
      contents: fullPrompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 15000, // Increased from 4000 to handle longer responses
      },
    })
    
    console.log('=== CHAT RESPONSE ===')
    console.log('Response type:', typeof response.text)
    console.log('Response length:', response.text?.length)
    console.log('Response preview:', response.text?.substring(0, 200))
    console.log('=== END CHAT ===')
    
    return {
      role: 'model' as const,
      parts: response.text || '',
    }
  } catch (error) {
    console.error('=== CHAT ERROR ===')
    console.error('Error:', error)
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown')
    
    if (error instanceof Error) {
      throw new Error(`Chat error: ${error.message}`)
    }
    throw new Error('Chat error: Unknown error occurred')
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
  const rankOrder = ['rank_scout', 'rank_tenderfoot', 'rank_second_class', 'rank_first_class', 'rank_star', 'rank_life', 'rank_eagle']
  const currentRankIndex = rankOrder.indexOf(currentRank)
  
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
