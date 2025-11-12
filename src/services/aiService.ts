// AI Service - Client-side wrapper for server functions
import type { UserData } from '../data/userData';
import {
  analyzeCalendarEvents as analyzeCalendarEventsServer,
  generateInitialPlan as generateInitialPlanServer,
  sendChatMessage as sendChatMessageServer,
} from '../server/ai-functions'

// All AI calls go through secure server-side functions
// API keys are never exposed to the browser

export interface GeminiHistoryMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

export const EVENT_ANALYSIS_SCHEMA_VERSION = 2;

export interface EventAnalysis {
  eventId: string;
  opportunities: string[];
  signoffs: Array<{
    id: string
    name: string
  }>;
  priority: 'high' | 'medium' | 'low';
}

export const needsEventReanalysis = (analysis?: Partial<EventAnalysis> | null): boolean => {
  if (!analysis) return true;
  if (!analysis.opportunities?.length) return true;
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
  return result.analyses || {};
}

export const generateInitialPlan = async (userData: UserData): Promise<string> => {
  const result = await generateInitialPlanServer({
    data: { userData },
  })
  return result.plan;
};

export const sendChatMessage = async (
  userMessage: string,
  userData: UserData,
  history: GeminiHistoryMessage[]
): Promise<{ response: string; updatedPlan?: string }> => {
  const result = await sendChatMessageServer({
    data: { 
      message: userMessage,
      history,
      userData
    },
  })
  
  return {
    response: result.parts || '',
    updatedPlan: undefined, // No plan updates in chat for now
  };
};


