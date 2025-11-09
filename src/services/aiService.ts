import type { UserData, Event as ScoutEvent } from '../data/userData';
import meritBadgesData from '../data/merit-badges.json';
import rankRequirementsData from '../data/rank-reqs.json';

const GEMINI_API_KEY = 'AIzaSyD5JWf03RbEs3_w9663ULiK9O1oalNXm64';
const GEMINI_MODEL = 'gemini-2.0-flash-exp';

// Gemini rate limiting (avoid 429s when the user rapidly triggers analysis)
let lastAnalysisTime = 0;
const MIN_TIME_BETWEEN_CALLS = 5000; // 5 seconds

export interface GeminiHistoryMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

export const EVENT_ANALYSIS_SCHEMA_VERSION = 2;

export interface EventAnalysis {
  eventId: string;
  opportunities: string[];
  requirements: string[];
  signoffs: string[];
  meritBadges: string[];
  priority: number;
  priorityReason: string;
  quickSummary: {
    headline: string;
    keyActions: string[];
  };
  rankFocus: {
    scout: string[];
    tenderfoot: string[];
    second_class: string[];
    first_class: string[];
  };
  nextRankOutlook: string[];
  generatedAt: string;
  schemaVersion: number;
}

export const needsEventReanalysis = (analysis?: Partial<EventAnalysis> | null): boolean => {
  if (!analysis) return true;
  if (analysis.schemaVersion !== EVENT_ANALYSIS_SCHEMA_VERSION) return true;
  if (!analysis.generatedAt) return true;
  if (!analysis.quickSummary?.headline?.trim()) return true;
  if (!analysis.quickSummary?.keyActions?.length) return true;
  if (!analysis.opportunities?.length) return true;
  if (!analysis.rankFocus) return true;
  if (!analysis.nextRankOutlook?.length) return true;

  return false;
};

const rankOrder = ['scout', 'tenderfoot', 'second_class', 'first_class', 'star', 'life', 'eagle'] as const;

const getRankInfo = (userData: UserData) => {
  const rawRank = userData.profile.currentRank ?? 'scout';
  const normalizedRank = rawRank.startsWith('rank_') ? rawRank.replace('rank_', '') : rawRank;
  const currentIndex = Math.max(rankOrder.indexOf(normalizedRank as typeof rankOrder[number]), 0);
  const nextIndex = Math.min(currentIndex + 1, rankOrder.length - 1);

  const currentRankId = `rank_${rankOrder[currentIndex]}`;
  const nextRankId = `rank_${rankOrder[nextIndex]}`;

  const currentRankData = rankRequirementsData.find(rank => rank.id === currentRankId);
  const nextRankData = rankRequirementsData.find(rank => rank.id === nextRankId);

  return {
    currentRankId,
    currentRankName: currentRankData?.name ?? 'Scout',
    nextRankId,
    nextRankName: nextRankData?.name ?? rankOrder[nextIndex].replace('_', ' '),
    nextRankRequirements: nextRankData?.requirements ?? [],
  };
};

const describeAnalyzedEvent = (
  event: ScoutEvent,
  analysis: EventAnalysis,
  now: Date
) => {
  const start = new Date(event.startTime);
  const dateLabel = start.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const daysUntil = Math.max(0, Math.round((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  return {
    eventId: event.id,
    name: event.name,
    type: event.type,
    startTime: event.startTime,
    dateLabel,
    daysUntil,
    location: event.location ?? 'No location provided',
    priority: analysis.priority,
    priorityReason: analysis.priorityReason,
    quickHeadline: analysis.quickSummary.headline,
    keyActions: analysis.quickSummary.keyActions,
    opportunities: analysis.opportunities,
    requirements: analysis.requirements,
    signoffs: analysis.signoffs,
    meritBadges: analysis.meritBadges,
  };
};

export const summarizeUpcomingEvents = async (
  userData: UserData,
  analyses: Record<string, EventAnalysis>
): Promise<string> => {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() + 35);

  const analyzedEvents = userData.events
    .filter(event => {
      const analysis = analyses[event.id];
      if (!analysis) return false;
      const start = new Date(event.startTime);
      return start >= now && start <= cutoff;
    })
    .map(event => describeAnalyzedEvent(event, analyses[event.id], now))
    .sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      const aTime = new Date(a.startTime).getTime();
      const bTime = new Date(b.startTime).getTime();
      return aTime - bTime;
    })
    .slice(0, 8);

  if (analyzedEvents.length === 0) {
    throw new Error('No analyzed events available in the next month.');
  }

  const rankInfo = getRankInfo(userData);

  const payload = {
    scoutName: userData.profile.name ?? 'Unknown Scout',
    targetEagleDate: userData.profile.targetEagleDate ?? 'Not set',
    currentRank: rankInfo.currentRankName,
    nextRank: rankInfo.nextRankName,
    events: analyzedEvents,
  };

  const prompt = `You are Scoutly's planning assistant. Using the JSON data below, write a concise monthly briefing focused on concrete actions and signoffs.

Guidelines (prioritize practicality over motivation):
- Start with one bold line stating the primary advancement objective for the month (e.g., specific rank or key badge tasks).
- Provide a bullet list of the top 3-5 events. For each include: name, date, priority (🔥 9-10, ⚡ 7-8, ✅ 5-6), and the exact requirement(s)/signoff(s) to target at that event.
- Add a "Prep Checklist" with 3-4 items: specific gear, forms, counselor coordination, or prerequisite work to unlock the signoffs.
- Add one short "Signoff Strategy" sentence that explains how these events combine to move the scout toward ${rankInfo.nextRankName}.
- Keep it under 170 words. Use Markdown headings (##, ###) and bullets.

JSON:
${JSON.stringify(payload, null, 2)}`;

  const raw = await callGemini(prompt, { temperature: 0.45, maxOutputTokens: 1024 });
  return cleanModelResponse(raw);
};

export const generateNextRankSprintPlan = async (
  userData: UserData,
  analyses: Record<string, EventAnalysis>
): Promise<string> => {
  const rankInfo = getRankInfo(userData);
  const rankProgress = userData.rankProgress ?? {};
  const progressForNextRank = rankProgress[rankInfo.nextRankId] ?? {};

  const incompleteRequirements = rankInfo.nextRankRequirements
    .map(req => ({
      id: req.id,
      text: req.text,
      completedAt: progressForNextRank[req.id] ?? null,
    }))
    .filter(req => !req.completedAt)
    .slice(0, 15);

  if (incompleteRequirements.length === 0) {
    throw new Error(`All requirements for ${rankInfo.nextRankName} appear complete — nothing to plan!`);
  }

  const now = new Date();
  const supportEvents = userData.events
    .filter(event => analyses[event.id])
    .map(event => describeAnalyzedEvent(event, analyses[event.id], now))
    .slice(0, 8);

  const payload = {
    scoutName: userData.profile.name ?? 'Unknown Scout',
    targetEagleDate: userData.profile.targetEagleDate ?? 'Not set',
    currentRank: rankInfo.currentRankName,
    nextRank: rankInfo.nextRankName,
    incompleteRequirements,
    supportingEvents: supportEvents,
  };

  const prompt = `You are Scoutly's advancement planner. Build a four-week "Next Rank Sprint" laser-focused on completing ${rankInfo.nextRankName} requirements and getting signoffs.

Must follow (be pragmatic, minimal fluff):
- Use Markdown with headings. Title: "## ${rankInfo.nextRankName} Sprint".
- Provide four Week sections. Each week has 3–4 checkbox tasks (- [ ] ...), balanced across weeks.
- Every task must reference exact requirement IDs (e.g., "Req 3b") or explicit signoffs, plus any short prep needed (gear, forms, counselor).
- Tie tasks to supporting events by name when it unlocks an in-person signoff.
- Add a "### Load Balancer" (2 bullets) describing how the schedule avoids crunch and spreads signoffs.
- Add a "### Quick Wins" (2 bullets) with fast signoffs or prerequisites to clear early.
- Keep under 220 words. Tone: direct and actionable.

JSON:
${JSON.stringify(payload, null, 2)}`;

  const raw = await callGemini(prompt, { temperature: 0.35, maxOutputTokens: 1400 });
  return cleanModelResponse(raw);
};
interface GeminiGenerationConfig {
  temperature?: number;
  maxOutputTokens?: number;
}

const enforceRateLimit = async () => {
  const now = Date.now();
  const timeSinceLastCall = now - lastAnalysisTime;
  if (timeSinceLastCall < MIN_TIME_BETWEEN_CALLS) {
    const waitTime = MIN_TIME_BETWEEN_CALLS - timeSinceLastCall;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  lastAnalysisTime = Date.now();
};

const callGemini = async (prompt: string, config: GeminiGenerationConfig = {}) => {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key is not configured.');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: config.temperature ?? 0.6,
          maxOutputTokens: config.maxOutputTokens ?? 2048,
        },
      }),
    }
  );

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please wait a few seconds and try again.');
    }
    throw new Error(`Gemini request failed (${response.status}): ${response.statusText}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text || typeof text !== 'string') {
    throw new Error('Gemini response did not include text.');
  }

  return text;
};

const cleanModelResponse = (raw: string) =>
  raw
    .replace(/```json\s*/gi, '')
    .replace(/```/g, '')
    .trim();

const parseJsonResponse = (cleaned: string) => {
  try {
    return JSON.parse(cleaned);
  } catch (error) {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw error;
  }
};

const cleanStringArray = (value: unknown, opts: { maxItems: number; maxLength: number }) => {
  if (!Array.isArray(value)) return [];
  const results: string[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== 'string') continue;
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const shortened = trimmed.length > opts.maxLength ? trimmed.slice(0, opts.maxLength) : trimmed;
    if (seen.has(shortened)) continue;
    seen.add(shortened);
    results.push(shortened);
    if (results.length >= opts.maxItems) break;
  }
  return results;
};

const getBadgeSummaries = (userData: UserData, maxBadges = 6) => {
  const summaries: string[] = [];
  for (const badge of meritBadgesData.meritBadges) {
    const progress = userData.progress[badge.id] || {};
    const incomplete: string[] = [];
    badge.requirements.forEach((req, index) => {
      const baseKey = `req_${index}`;
      if (req.sub_requirements && req.sub_requirements.length > 0) {
        let completed = 0;
        req.sub_requirements.forEach((_, subIdx) => {
          if (progress[`${baseKey}_${subIdx}`]) {
            completed += 1;
          }
        });
        if (completed < (req.requiredCount ?? req.sub_requirements.length)) {
          incomplete.push(`${index + 1}: ${req.text.slice(0, 80)}`);
        }
      } else if (!progress[baseKey]) {
        incomplete.push(`${index + 1}: ${req.text.slice(0, 80)}`);
      }
    });
    if (incomplete.length === 0) continue;
    summaries.push(`${badge.name}${badge.eagleRequired ? ' (Eagle)' : ''}: ${incomplete.slice(0, 3).join(' | ')}`);
    if (summaries.length >= maxBadges) break;
  }
  return summaries;
};

const formatRankSnapshot = (userData: UserData, maxRanks = 4) => {
  const snapshots: string[] = [];
  const rankProgress = userData.rankProgress ?? {};
  for (const rank of rankRequirementsData.slice(0, maxRanks)) {
    const progress = rankProgress[rank.id] || {};
    const items = rank.requirements
      .map(req => `${progress[req.id] ? '✅' : '⬜'} ${req.id}: ${req.text.slice(0, 70)}`)
      .join(' | ');
    snapshots.push(`${rank.name}: ${items}`);
  }
  return snapshots;
};

const describeEvent = (event: ScoutEvent, now: Date) => {
  const start = new Date(event.startTime);
  const daysUntil = Math.round((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const when = start.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  return `ID:${event.id} | ${event.name} | ${event.type} | ${when} | ${daysUntil} days | ${event.location || 'no location'}`;
};

const buildCalendarPrompt = (userData: UserData, events: ScoutEvent[]) => {
  const now = new Date();
  const profile = userData.profile;
  const currentRank = profile.currentRank ? profile.currentRank.replace('rank_', '') : 'scout';
  const badgeSummaries = getBadgeSummaries(userData);
  const rankSnapshot = formatRankSnapshot(userData);

  const eventLines = events.map(event => describeEvent(event, now)).join('\n');

  return `You are Scoutly's planning assistant. Analyze each scouting event below and return a JSON object keyed by event ID with a focus on practical actions and signoffs.

Scout: ${profile.name ?? 'Unknown scout'}
Current rank: ${currentRank}
Target Eagle date: ${profile.targetEagleDate ?? 'unspecified'}

Top incomplete badges:
${badgeSummaries.length ? badgeSummaries.join('\n') : 'None listed'}

Rank snapshots:
${rankSnapshot.join('\n')}

Events to analyze (one output entry per event):
${eventLines}

Return JSON shaped like this:
{
  "eventId": {
    "eventId": "same as input",
    "quickSummary": { "headline": "<=80 chars", "keyActions": ["<=60 chars"] },
    "rankFocus": {
      "scout": ["tip"],
      "tenderfoot": ["tip"],
      "second_class": ["tip"],
      "first_class": ["tip"]
    },
    "nextRankOutlook": ["follow-up"],
    "opportunities": ["prep or on-site action"],
    "requirements": ["badge + requirement number"],
    "signoffs": ["rank requirement"],
    "meritBadges": ["badge name"],
    "priority": 1-10,
    "priorityReason": "<=150 chars"
  }
}

Rules (prioritize practicality):
- Provide 3–8 entries for opportunities, requirements, signoffs, and meritBadges; use exact requirement numbers when possible.
- Provide 2–5 keyActions and 2–4 nextRankOutlook items.
- Tailor to event type and season; call out in-person signoff opportunities.
- Make arrays unique (no duplicates), omit empty strings, avoid generic motivation.
- Keep tone direct and task-oriented.
- Output must be valid JSON with double quotes and no trailing commas.
`;
};

const sanitizeAnalyses = (raw: Record<string, unknown>, requestedEvents: ScoutEvent[]): Record<string, EventAnalysis> => {
  const allowedIds = new Set(requestedEvents.map(event => event.id));
  const timestamp = new Date().toISOString();
  const sanitized: Record<string, EventAnalysis> = {};

  for (const [eventId, value] of Object.entries(raw)) {
    if (!allowedIds.has(eventId)) continue;
    if (!value || typeof value !== 'object') continue;
    const analysis = value as Record<string, unknown>;

    const quickSummaryObj = analysis.quickSummary as Record<string, unknown> | undefined;
    const quickHeadline = typeof quickSummaryObj?.headline === 'string'
      ? quickSummaryObj.headline.slice(0, 80)
      : 'Target clear signoffs and specific requirements at this event';
    const quickActions = cleanStringArray(quickSummaryObj?.keyActions, { maxItems: 4, maxLength: 60 });

    const rankFocusSource = analysis.rankFocus as Record<string, unknown> | undefined;
    const buildRankArray = (key: 'scout' | 'tenderfoot' | 'second_class' | 'first_class') =>
      cleanStringArray(rankFocusSource?.[key], { maxItems: 3, maxLength: 70 });

    sanitized[eventId] = {
      eventId,
      opportunities: cleanStringArray(analysis.opportunities, { maxItems: 8, maxLength: 80 }),
      requirements: cleanStringArray(analysis.requirements, { maxItems: 8, maxLength: 80 }),
      signoffs: cleanStringArray(analysis.signoffs, { maxItems: 8, maxLength: 80 }),
      meritBadges: cleanStringArray(analysis.meritBadges, { maxItems: 12, maxLength: 60 }),
      priority: typeof analysis.priority === 'number' ? Math.max(1, Math.min(10, analysis.priority)) : 5,
      priorityReason: typeof analysis.priorityReason === 'string'
        ? analysis.priorityReason.slice(0, 150)
        : 'Practical advancement opportunity (signoffs, requirement work)',
      quickSummary: {
        headline: quickHeadline,
        keyActions: quickActions.length ? quickActions : ['Prep gear for requirement work'],
      },
      rankFocus: {
        scout: buildRankArray('scout'),
        tenderfoot: buildRankArray('tenderfoot'),
        second_class: buildRankArray('second_class'),
        first_class: buildRankArray('first_class'),
      },
      nextRankOutlook: cleanStringArray(analysis.nextRankOutlook, { maxItems: 5, maxLength: 70 }),
      generatedAt: timestamp,
      schemaVersion: EVENT_ANALYSIS_SCHEMA_VERSION,
    };
  }

  return sanitized;
};

export async function analyzeCalendarEvents(
  userData: UserData,
  existingAnalysis: Record<string, EventAnalysis> = {},
  options: { force?: boolean } = {}
): Promise<Record<string, EventAnalysis>> {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() + 45);

  const eventsToAnalyze = userData.events
    .filter(event => {
      const eventDate = new Date(event.startTime);
      return eventDate >= now && eventDate <= cutoff;
    })
    .filter(event => options.force || needsEventReanalysis(existingAnalysis[event.id]))
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  if (eventsToAnalyze.length === 0) {
    return {};
  }

  await enforceRateLimit();

  const prompt = buildCalendarPrompt(userData, eventsToAnalyze);
  const rawResponse = await callGemini(prompt, { temperature: 0.55, maxOutputTokens: 4096 });
  const cleaned = cleanModelResponse(rawResponse);
  const parsed = parseJsonResponse(cleaned);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Calendar analysis response was not valid JSON.');
  }
  return sanitizeAnalyses(parsed as Record<string, unknown>, eventsToAnalyze);
}

const buildPlanContext = (userData: UserData) => {
  const profile = userData.profile;
  const events = userData.events
    .slice()
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 6)
    .map(event => {
      const start = new Date(event.startTime);
      return `${event.name} (${event.type}) on ${start.toLocaleDateString('en-US')}`;
    });

  const upcoming = events.length ? events.join('\n- ') : 'No upcoming events logged';
  const badges = getBadgeSummaries(userData, 8).join('\n- ');

  return `Scout profile:
- Name: ${profile.name ?? 'Unknown'}
- Current rank: ${profile.currentRank ?? 'Not set'}
- Target Eagle date: ${profile.targetEagleDate ?? 'Not set'}

Upcoming events:
- ${upcoming}

Key unfinished badges:
- ${badges || 'Not enough data recorded yet'}`;
};

export const generateInitialPlan = async (userData: UserData): Promise<string> => {
  const context = buildPlanContext(userData);
  const prompt = `You are Scoutly's advancement planner. Create a concise 4-week action plan in markdown focused on concrete requirements and signoffs.

${context}

Requirements:
- Organize by week with headings (Week 1, Week 2, ...).
- 3–5 checkbox bullets per week (- [ ] ...), each referencing exact requirement IDs or explicit signoffs. Note needed prep (gear, forms, counselor) in-line.
- Tie tasks to any upcoming events that enable in-person signoffs.
- Tone: direct and practical (minimal motivation).
- End with a short "Signoff Targets" section listing the expected signoffs by week.
`;

  const raw = await callGemini(prompt, { temperature: 0.35, maxOutputTokens: 1536 });
  return raw.trim();
};

export const sendChatMessage = async (
  userMessage: string,
  userData: UserData,
  history: GeminiHistoryMessage[]
): Promise<{ response: string; updatedPlan?: string }> => {
  const context = buildPlanContext(userData);

  const promptHistory = [
    ...history,
    {
      role: 'user' as const,
      parts: [{ text: `Scout context:\n${context}\n\nUser question: ${userMessage}` }],
    },
  ];

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: promptHistory,
        generationConfig: {
          temperature: 0.45,
          maxOutputTokens: 2048,
        },
      }),
    }
  );

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please wait a few seconds and try again.');
    }
    throw new Error(`Gemini chat request failed (${response.status}): ${response.statusText}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text || typeof text !== 'string') {
    throw new Error('Gemini chat response missing text.');
  }

  const cleaned = cleanModelResponse(text);
  try {
    const parsed = parseJsonResponse(cleaned) as { reply?: string; updatedPlan?: string };
    if (!parsed.reply) {
      throw new Error('Chat response JSON missing "reply" field.');
    }
    return {
      response: parsed.reply.trim(),
      updatedPlan: parsed.updatedPlan?.trim() || undefined,
    };
  } catch (error) {
    // If the model did not send JSON, fall back to raw text.
    return { response: cleaned.trim() };
  }
};

