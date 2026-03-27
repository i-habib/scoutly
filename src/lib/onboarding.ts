import type { UserData } from '../data/userData';

function hasProfileValue(value: string | null | undefined) {
  return Boolean(value && value.trim().length > 0);
}

function hasReturningUserActivity(userData: UserData) {
  const badgeChoices = userData.profile.badgeChoices || {};
  const troopInfo = userData.profile.troopInfo || {
    troopNumber: null,
    meetingDay: null,
    meetingTime: null,
  };

  return (
    Object.keys(userData.progress || {}).length > 0 ||
    Object.keys(userData.rankProgress || {}).length > 0 ||
    (userData.events || []).length > 0 ||
    (userData.profile.electiveBadges || []).length > 0 ||
    Object.values(badgeChoices).some(Boolean) ||
    hasProfileValue(userData.profile.name) ||
    hasProfileValue(troopInfo.troopNumber) ||
    hasProfileValue(troopInfo.meetingDay) ||
    hasProfileValue(troopInfo.meetingTime) ||
    hasProfileValue(userData.profile.scoutbookCalendarUrl)
  );
}

export function isOnboardingComplete(userData: UserData | null | undefined) {
  if (!userData) return false;

  // Explicit opt-in from the new onboarding flow.
  if (userData.profile.hasCompletedOnboarding === true) {
    return true;
  }

  const hasCorePlanningFields =
    hasProfileValue(userData.profile.name) &&
    hasProfileValue(userData.profile.currentRank) &&
    hasProfileValue(userData.profile.targetEagleDate);

  return hasCorePlanningFields || hasReturningUserActivity(userData);
}

export function needsOnboarding(userData: UserData | null | undefined) {
  if (!userData) return false;
  return !isOnboardingComplete(userData);
}
