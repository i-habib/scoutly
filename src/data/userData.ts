// Initial user data structure
export interface UserProfile {
  name: string | null;
  targetEagleDate: string | null;
  troopMeetingSchedule: string | null;
  currentRank: string | null;
  // Optional manual override for meetings per month used by timeline & AI pacing
  meetingsPerMonthOverride?: number | null;
  badgeChoices?: {
    aquatic?: 'Swimming' | 'Hiking' | 'Cycling';
    emergency?: 'Emergency Preparedness' | 'Lifesaving';
    environment?: 'Environmental Science' | 'Sustainability';
  };
  electiveBadges?: string[]; // list of elective badge IDs selected by the user
  notificationPreferences?: {
    meetingReminders: boolean;
    eventReminders: boolean;
    progressUpdates: boolean;
  };
  troopInfo?: {
    troopNumber: string | null;
    meetingDay: string | null;
    meetingTime: string | null;
  };
}

export interface UserProgress {
  [badgeId: string]: {
    [requirementId: string]: string | null | {
      completedAt: string;
      notes?: string;
    };
  };
}

// Separate interface for rank progress
export interface RankProgress {
  [rankId: string]: {
    [requirementId: string]: string | null;
  };
}

export interface Event {
  id: string;
  name: string;
  startTime: string;
  endTime?: string;
  location?: string;
  type: 'meeting' | 'campout' | 'service' | 'other';
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface AIPlan {
  plan: string;
  lastUpdated: string;
  chatHistory: ChatMessage[];
}

export interface UserData {
  profile: UserProfile;
  progress: UserProgress;
  rankProgress?: RankProgress;
  events: Event[];
  aiPlan?: AIPlan;
}

export const initialUserData: UserData = {
  profile: {
    name: null,
    targetEagleDate: null,
    troopMeetingSchedule: 'weekly_tuesday',
    currentRank: null,
    meetingsPerMonthOverride: null,
    badgeChoices: {},
    electiveBadges: [],
    notificationPreferences: {
      meetingReminders: true,
      eventReminders: true,
      progressUpdates: true,
    },
    troopInfo: {
      troopNumber: null,
      meetingDay: null,
      meetingTime: null,
    },
  },
  progress: {},
  events: [],
  aiPlan: undefined,
};
