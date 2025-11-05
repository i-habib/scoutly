// src/services/storageService.ts
import { initialUserData } from '../data/userData';
import type { UserData, Event } from '../data/userData';

const USER_DATA_KEY = 'scoutly_user_data';

// Mimics fetching the entire user object
export const fetchUserData = async (): Promise<UserData> => {
  const data = localStorage.getItem(USER_DATA_KEY);
  if (data) {
    return JSON.parse(data);
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
  user.profile.notificationPreferences = {
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
  user.profile.troopInfo = { ...user.profile.troopInfo, ...troopData };
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
    user.progress[badgeId][requirementId] = {};
  }
  
  // Store both completion date and notes
  if (typeof user.progress[badgeId][requirementId] === 'string') {
    // Convert from simple string to object
    user.progress[badgeId][requirementId] = {
      completedAt: user.progress[badgeId][requirementId],
      notes: note,
    };
  } else {
    user.progress[badgeId][requirementId].notes = note;
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