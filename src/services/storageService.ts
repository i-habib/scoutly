import { initialUserData } from '../data/userData';
import type { UserData, Event, ChatMessage } from '../data/userData';
import { RANK_ORDER, normalizeRankId } from '../lib/constants';
import { isOnboardingComplete } from '../lib/onboarding';
import rankRequirementsData from '../data/rank-reqs.json';
import { parseICSContent, inferEventType } from '../lib/icsParser';
import { fetchCalendarICS } from '../server/calendar-functions';

const USER_DATA_KEY = 'scoutly_user_data';

// Mimics fetching the entire user object
export const fetchUserData = async (): Promise<UserData> => {
  const data = localStorage.getItem(USER_DATA_KEY);
  if (data) {
    const parsed = JSON.parse(data) as Partial<UserData>;
    const defaultNotificationPreferences = initialUserData.profile.notificationPreferences || {
      meetingReminders: true,
      eventReminders: true,
      progressUpdates: true,
    };
    const defaultTroopInfo = initialUserData.profile.troopInfo || {
      troopNumber: null,
      meetingDay: null,
      meetingTime: null,
    };
    const parsedNotificationPreferences = parsed.profile?.notificationPreferences;
    const parsedTroopInfo = parsed.profile?.troopInfo;
    const userData: UserData = {
      ...initialUserData,
      ...parsed,
      profile: {
        ...initialUserData.profile,
        ...(parsed.profile || {}),
        badgeChoices: {
          ...initialUserData.profile.badgeChoices,
          ...(parsed.profile?.badgeChoices || {}),
        },
        electiveBadges:
          parsed.profile?.electiveBadges ?? initialUserData.profile.electiveBadges,
        notificationPreferences: {
          meetingReminders:
            parsedNotificationPreferences?.meetingReminders ??
            defaultNotificationPreferences.meetingReminders,
          eventReminders:
            parsedNotificationPreferences?.eventReminders ??
            defaultNotificationPreferences.eventReminders,
          progressUpdates:
            parsedNotificationPreferences?.progressUpdates ??
            defaultNotificationPreferences.progressUpdates,
        },
        troopInfo: {
          troopNumber: parsedTroopInfo?.troopNumber ?? defaultTroopInfo.troopNumber,
          meetingDay: parsedTroopInfo?.meetingDay ?? defaultTroopInfo.meetingDay,
          meetingTime: parsedTroopInfo?.meetingTime ?? defaultTroopInfo.meetingTime,
        },
      },
      progress: parsed.progress ?? initialUserData.progress,
      events: parsed.events ?? initialUserData.events,
      rankProgress: parsed.rankProgress ?? initialUserData.rankProgress,
      aiPlan: parsed.aiPlan ?? initialUserData.aiPlan,
    };

    const onboardingComplete = isOnboardingComplete(userData);
    if (userData.profile.hasCompletedOnboarding !== onboardingComplete) {
      userData.profile.hasCompletedOnboarding = onboardingComplete;
      localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
    }

    return userData;
  }
  // For first-time users, initialize and save
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(initialUserData));
  return initialUserData;
};

// Mimics updating a specific part of the user object
export const updateRequirementProgress = async ({ 
  requirementId, 
  badgeId, 
  completedDate 
}: { 
  requirementId: string; 
  badgeId: string; 
  completedDate: string | null;
}): Promise<UserData> => {
  const user = await fetchUserData();
  if (!user.progress[badgeId]) {
    user.progress[badgeId] = {};
  }
  user.progress[badgeId][requirementId] = completedDate; // e.g., "2025-11-03" or null
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
  return user;
};

// Update user profile information
export const updateProfile = async (profileData: Partial<UserData['profile']>): Promise<UserData> => {
  const user = await fetchUserData();
  
  // Auto-complete rank requirements if currentRank changes
  if (profileData.currentRank && profileData.currentRank !== user.profile.currentRank) {
    const newRankId = normalizeRankId(profileData.currentRank);
    const newRankIndex = RANK_ORDER.indexOf(newRankId as (typeof RANK_ORDER)[number]);
    
    if (newRankIndex >= 0) {
      if (!user.rankProgress) user.rankProgress = {};
      const today = new Date().toISOString().split('T')[0];

      // Mark all requirements up to and including the new current rank as completed
      for (let i = 0; i <= newRankIndex; i++) {
        const rankId = RANK_ORDER[i];
        if (!user.rankProgress[rankId]) user.rankProgress[rankId] = {};
        
        const rankData = rankRequirementsData.find(r => r.id === rankId);
        if (rankData) {
          rankData.requirements.forEach(req => {
            // Check off main requirement
            if (!user.rankProgress![rankId][req.id]) {
              user.rankProgress![rankId][req.id] = today;
            }
            // Check off sub-requirements
            if ('sub_requirements' in req && (req as any).sub_requirements) {
              (req as any).sub_requirements.forEach((subReq: any) => {
                if (!user.rankProgress![rankId][subReq.id]) {
                  user.rankProgress![rankId][subReq.id] = today;
                }
              });
            }
          });
        }
      }
    }
  }

  user.profile = { ...user.profile, ...profileData };
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
  return user;
};

// Add a new event
export const addEvent = async (event: Omit<Event, 'id' | 'createdAt'>): Promise<UserData> => {
  const user = await fetchUserData();
  const newEvent = {
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    ...event,
  };
  user.events = [...user.events, newEvent];
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
  return user;
};

// Update an existing event
export const updateEvent = async (eventId: string, eventData: Partial<Event>): Promise<UserData> => {
  const user = await fetchUserData();
  user.events = user.events.map((event) =>
    event.id === eventId ? { ...event, ...eventData } : event
  );
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
  return user;
};

// Delete an event
export const deleteEvent = async (eventId: string): Promise<UserData> => {
  const user = await fetchUserData();
  user.events = user.events.filter((event) => event.id !== eventId);
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
  return user;
};

// Get all events
export const fetchEvents = async (): Promise<Event[]> => {
  const user = await fetchUserData();
  return user.events || [];
};

// Update notification preferences
export const updateNotificationPreferences = async (
  preferences: Partial<NonNullable<UserData['profile']['notificationPreferences']>>
): Promise<UserData> => {
  const user = await fetchUserData();
  const defaults = {
    meetingReminders: true,
    eventReminders: true,
    progressUpdates: true,
  };
  user.profile.notificationPreferences = {
    ...defaults,
    ...user.profile.notificationPreferences,
    ...preferences,
  };
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
  return user;
};

// Update troop information
export const updateTroopInfo = async (
  troopData: Partial<NonNullable<UserData['profile']['troopInfo']>>
): Promise<UserData> => {
  const user = await fetchUserData();
  const defaults = {
    troopNumber: null,
    meetingDay: null,
    meetingTime: null,
  };
  user.profile.troopInfo = { ...defaults, ...user.profile.troopInfo, ...troopData };
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
  return user;
};

// Add a note to a requirement
export const addRequirementNote = async ({ 
  badgeId, 
  requirementId, 
  note 
}: { 
  badgeId: string; 
  requirementId: string; 
  note: string;
}): Promise<UserData> => {
  const user = await fetchUserData();
  if (!user.progress[badgeId]) {
    user.progress[badgeId] = {};
  }
  if (!user.progress[badgeId][requirementId]) {
    user.progress[badgeId][requirementId] = {
      completedAt: '',
      notes: note,
    };
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
    return user;
  }
  
  // Store both completion date and notes
  if (typeof user.progress[badgeId][requirementId] === 'string') {
    // Convert from simple string to object
    user.progress[badgeId][requirementId] = {
      completedAt: user.progress[badgeId][requirementId],
      notes: note,
    };
  } else {
    user.progress[badgeId][requirementId] = {
      completedAt: user.progress[badgeId][requirementId].completedAt || '',
      notes: note,
    };
  }
  
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
  return user;
};

// Reset all user data (useful for testing or starting over)
export const resetUserData = async (): Promise<UserData> => {
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(initialUserData));
  return initialUserData;
};

// Export user data (for backup or migration)
export const exportUserData = async (): Promise<string> => {
  const user = await fetchUserData();
  return JSON.stringify(user, null, 2);
};

// Import user data (from backup)
export const importUserData = async (jsonData: string): Promise<UserData> => {
  try {
    const userData = JSON.parse(jsonData);
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
    return userData;
  } catch (error) {
    throw new Error('Invalid user data format');
  }
};

// Get progress statistics
export const getProgressStats = async (): Promise<{
  totalRequirements: number;
  completedRequirements: number;
  completionPercentage: number;
}> => {
  const user = await fetchUserData();
  const progress = user.progress || {};
  
  let totalRequirements = 0;
  let completedRequirements = 0;
  
  Object.keys(progress).forEach((badgeId) => {
    const badgeProgress = progress[badgeId];
    Object.keys(badgeProgress).forEach((requirementId) => {
      totalRequirements++;
      const requirement = badgeProgress[requirementId];
      // Check if completed (either a date string or an object with completedAt)
      if (requirement && (typeof requirement === 'string' || requirement.completedAt)) {
        completedRequirements++;
      }
    });
  });
  
  return {
    totalRequirements,
    completedRequirements,
    completionPercentage: totalRequirements > 0 
      ? Math.round((completedRequirements / totalRequirements) * 100) 
      : 0,
  };
};

// AI Plan Management
export const updateAIPlan = async (plan: string, chatHistory: ChatMessage[]): Promise<UserData> => {
  const user = await fetchUserData();
  user.aiPlan = {
    plan,
    lastUpdated: new Date().toISOString(),
    chatHistory,
  };
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
  return user;
};

export const addChatMessage = async (message: ChatMessage): Promise<UserData> => {
  const user = await fetchUserData();
  if (!user.aiPlan) {
    user.aiPlan = {
      plan: '',
      lastUpdated: new Date().toISOString(),
      chatHistory: [],
    };
  }
  user.aiPlan.chatHistory.push(message);
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
  return user;
};

export const clearChatHistory = async (): Promise<UserData> => {
  const user = await fetchUserData();
  if (user.aiPlan) {
    user.aiPlan.chatHistory = [];
  }
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
  return user;
};

// ─── Scoutbook Calendar Sync ─────────────────────────────────────────────────

/** Save (or clear) the Scoutbook Plus ICS calendar URL in the user profile. */
export const updateCalendarUrl = async (url: string | null): Promise<UserData> => {
  const user = await fetchUserData();
  user.profile.scoutbookCalendarUrl = url || null;
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
  return user;
};

/**
 * Fetch the saved Scoutbook ICS URL, parse it, and merge the resulting
 * events into local storage. Events previously imported from Scoutbook
 * (source === 'scoutbook') are replaced wholesale; manually added events
 * and file-imported events are left untouched.
 *
 * Returns the updated UserData or throws an Error with a user-friendly message.
 */
export const syncScoutbookCalendar = async (): Promise<UserData> => {
  const user = await fetchUserData();
  const url = user.profile.scoutbookCalendarUrl;

  if (!url) {
    throw new Error('No Scoutbook calendar URL saved. Add it in Profile settings.');
  }

  let icsText: string;
  try {
    const result = await fetchCalendarICS({ data: { url } });
    icsText = result.icsText;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Could not fetch calendar: ${msg}. Check the URL and try again.`);
  }

  const parsed = parseICSContent(icsText);

  if (parsed.length === 0) {
    throw new Error('The calendar URL returned no events. Make sure the link is correct.');
  }

  // Build the fresh Scoutbook events with proper typing and source tag
  const now = new Date().toISOString();
  const freshEvents: Event[] = parsed.map((ev) => ({
    id: `scoutbook_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    name: ev.name,
    startTime: ev.startTime,
    endTime: ev.endTime,
    location: ev.location,
    // Prefer parser-inferred type, fall back to name-based inference
    type: ev.type !== 'other' ? ev.type : inferEventType(ev.name),
    source: 'scoutbook' as const,
  }));

  // Remove stale Scoutbook events, keep everything else
  const keptEvents = (user.events || []).filter((e) => e.source !== 'scoutbook');
  user.events = [...keptEvents, ...freshEvents];
  user.profile.lastCalendarSync = now;

  localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
  return user;
};
