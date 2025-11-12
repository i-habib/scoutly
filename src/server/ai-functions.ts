// Server functions for AI operations - TanStack Start native pattern
import { createServerFn } from '@tanstack/react-start'
import { GoogleGenAI } from '@google/genai'
import type { UserData } from '../data/userData'
import meritBadgesJSON from '../data/merit-badges.json'

const meritBadgesData = meritBadgesJSON.meritBadges

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
  return process.env.GEMINI_MODEL || process.env.VITE_GEMINI_MODEL || 'gemini-1.5-flash-latest'
}

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
    const ai = getAI() // Get AI instance at runtime
    const config: any = {
      model: getModelName(),
      contents: prompt,
      config: {
        temperature,
        maxOutputTokens: 4000,
      }
    }
    
    // Add schema if provided for JSON mode
    if (schema) {
      config.config.responseMimeType = 'application/json'
      config.config.responseSchema = schema
    }
    
    const response = await ai.models.generateContent(config)
    return response.text || ''
  } catch (error) {
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
        eventId: { 
          type: 'string',
          description: 'The unique ID of the event'
        },
        opportunities: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of specific actionable opportunities at this event'
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

  const prompt = `You are an experienced Eagle Scout advisor helping a Scout maximize their advancement at upcoming events.

EVENTS TO ANALYZE:
${eventsNeedingAnalysis.map((e: any) => `- ID: ${e.id}, Name: ${e.name}, Type: ${e.type || 'other'}, Date: ${e.startTime || e.start}, Location: ${e.location || 'TBD'}`).join('\n')}

EAGLE-REQUIRED MERIT BADGES: ${requiredBadges.slice(0, 10).join(', ')}... and ${requiredBadges.length - 10} more

For EACH event, provide:

1. **opportunities** (array of strings): 5-8 EXTREMELY DETAILED, actionable opportunities. Each should be a complete sentence explaining:
   - Exactly what the Scout can do at this event
   - Which specific merit badge requirement or rank advancement it fulfills
   - Practical tips for success
   - What to bring or prepare
   
   Examples:
   - "Complete Camping merit badge requirement 9a by demonstrating proper meal planning - bring your menu plan showing breakfast, lunch, dinner with serving sizes and have your patrol leader review it"
   - "Work on Leadership position for Star rank by leading a patrol activity during the campout - coordinate with your SPL to plan and execute a 30-minute team-building game"
   - "Knock out First Aid merit badge requirement 5b by showing proper treatment for a second-degree burn - have a leader observe and sign off, bring your blue card"

2. **signoffs** (array): List ALL merit badge requirements and rank requirements that can be signed off at this event. Include:
   - id: badge/rank id (e.g., "camping_9a", "star_leadership")
   - name: Human-readable name (e.g., "Camping 9a - Meal Planning", "Star Rank - Leadership Position")

3. **priority**: 
   - 'high' if the event offers 3+ Eagle-required merit badge opportunities OR critical rank advancement
   - 'medium' if 1-2 opportunities
   - 'low' otherwise

Be SPECIFIC and DETAILED. Don't say "work on First Aid" - say exactly which requirement and how to complete it.

Return valid JSON only.`

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

    const ai = getAI() // Get AI instance at runtime
    const response = await ai.models.generateContent({
      model: getModelName(),
      contents: fullPrompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 4000,
      },
    })
    
    return {
      role: 'model' as const,
      parts: response.text || '',
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Chat error: ${error.message}`)
    }
    throw new Error('Chat error: Unknown error occurred')
  }
})
