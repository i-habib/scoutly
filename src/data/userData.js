export const initialUserData = {
  profile: {
    name: null,
    targetEagleDate: null,
    troopMeetingSchedule: 'weekly_tuesday', // example
  },
  progress: {
    // "mb_camping": { "1a": "2024-05-10", "1b": null, ... }
    // We'll store the completion date as a string, or null if incomplete.
  },
  events: [] // For the MVP, a simple array of custom events.
};