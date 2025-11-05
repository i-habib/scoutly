// Initial user data structure
export interface UserProfile {
  name: string | null;
  targetEagleDate: string | null;
  troopMeetingSchedule: string | null;
  currentRank: string | null;
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

export interface Event {
  id: string;
  name: string;
  startTime: string;
  endTime?: string;
  location?: string;
  type: 'meeting' | 'campout' | 'service' | 'other';
  createdAt: string;
}

export interface UserData {
  profile: UserProfile;
  progress: UserProgress;
  events: Event[];
}

export const initialUserData: UserData = {
  profile: {
    name: null,
    targetEagleDate: null,
    troopMeetingSchedule: 'weekly_tuesday',
    currentRank: null,
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
};
