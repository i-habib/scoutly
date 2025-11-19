// AI Service - Client-side wrapper for server functions
import type { UserData } from '../data/userData';
import {
  analyzeCalendarEvents as analyzeCalendarEventsServer,
  generateInitialPlan as generateInitialPlanServer,
  generateLongTermPlan as generateLongTermPlanServer,
  generateShortTermPlan as generateShortTermPlanServer,
  sendLongTermChatMessage as sendLongTermChatMessageServer,
  sendShortTermChatMessage as sendShortTermChatMessageServer,
} from '../server/ai-functions'
import { EventAnalysisSchema } from '../lib/aiSchemas'

// All AI calls go through secure server-side functions
// API keys are never exposed to the browser

export interface GeminiHistoryMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

export const EVENT_ANALYSIS_SCHEMA_VERSION = 4;

export interface EventAnalysis {
  eventId: string;
  opportunities: Array<{
    id: string;
    kind: 'rank' | 'meritBadge' | 'meta';
    title: string;
    rankId?: string;
    badgeId?: string;
  }>;
  signoffs: Array<{ id: string; name: string; rankId?: string }>;
  priority: 'high' | 'medium' | 'low';
}

export const needsEventReanalysis = (analysis?: Partial<EventAnalysis> | null): boolean => {
  if (!analysis) return true;
  const hasOpps = Array.isArray(analysis.opportunities) && analysis.opportunities.length > 0;
  const hasSignoffs = Array.isArray((analysis as any).signoffs) && (analysis as any).signoffs!.length > 0;
  if (!hasOpps && !hasSignoffs) return true;
  // Basic structural validation: ensure first opportunity has id & kind
  const first = analysis.opportunities?.[0];
  if (first && (!first.id || !first.kind)) return true;
  return false;
};


export async function analyzeCalendarEvents(
  userData: UserData,
  existingAnalysis: Record<string, EventAnalysis> = {},
  options: { forceAnalyze?: string[], skipCache?: boolean } = {}
): Promise<Record<string, EventAnalysis>> {
  const result = await analyzeCalendarEventsServer({
    data: { userData, existingAnalysis, options },
  })
  const analyses = result.analyses || {}
  // Defensive validation: drop any entries that don't match the schema
  const validated: Record<string, EventAnalysis> = {}
  for (const [key, value] of Object.entries(analyses)) {
    const parsed = EventAnalysisSchema.safeParse(value)
    if (parsed.success) {
      validated[key] = parsed.data
    }
  }
  return validated
}

export const generateInitialPlan = async (userData: UserData): Promise<string> => {
  const result = await generateInitialPlanServer({
    data: { userData },
  })
  return result.plan;
};

export const generateLongTermPlan = async (userData: UserData): Promise<string> => {
  const result = await generateLongTermPlanServer({
    data: { userData },
  })
  return result.plan;
};

export const generateShortTermPlan = async (userData: UserData): Promise<string> => {
  const result = await generateShortTermPlanServer({
    data: { userData },
  })
  return result.plan;
};

export const sendLongTermChatMessage = async (
  userMessage: string,
  userData: UserData,
  history: GeminiHistoryMessage[]
): Promise<{ response: string; updatedPlan?: string }> => {
  const result = await sendLongTermChatMessageServer({
    data: { 
      message: userMessage,
      history,
      userData
    },
  })
  
  return {
    response: typeof result.parts === 'string' ? result.parts : '',
    updatedPlan: undefined,
  };
};

export const sendShortTermChatMessage = async (
  userMessage: string,
  userData: UserData,
  history: GeminiHistoryMessage[]
): Promise<{ response: string; updatedPlan?: string }> => {
  const result = await sendShortTermChatMessageServer({
    data: { 
      message: userMessage,
      history,
      userData
    },
  })
  
  return {
    response: typeof result.parts === 'string' ? result.parts : '',
    updatedPlan: undefined,
  };
};

// Backward compatibility - defaults to short-term chat
export const sendChatMessage = sendShortTermChatMessage;


