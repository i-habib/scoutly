import { describe, expect, it } from 'vitest';
import { initialUserData, type UserData } from '../data/userData';
import { isOnboardingComplete, needsOnboarding } from './onboarding';

function makeUserData(): UserData {
  return structuredClone(initialUserData);
}

describe('onboarding completion', () => {
  it('keeps a brand-new user incomplete', () => {
    const userData = makeUserData();
    userData.profile.hasCompletedOnboarding = false;

    expect(isOnboardingComplete(userData)).toBe(false);
    expect(needsOnboarding(userData)).toBe(true);
  });

  it('treats explicit onboarding completion as complete even without target date', () => {
    const userData = makeUserData();
    userData.profile.hasCompletedOnboarding = true;
    userData.profile.name = 'Scout Carter';
    userData.profile.currentRank = 'rank_scout';
    userData.profile.targetEagleDate = null;

    expect(isOnboardingComplete(userData)).toBe(true);
    expect(needsOnboarding(userData)).toBe(false);
  });

  it('keeps legacy users with prior activity complete even if completion flag is false', () => {
    const userData = makeUserData();
    userData.profile.hasCompletedOnboarding = false;
    userData.events = [
      {
        id: 'event-1',
        name: 'Troop Meeting',
        startTime: '2026-04-01T19:00:00',
        type: 'meeting',
        createdAt: '2026-03-25T18:00:00.000Z',
      },
    ];

    expect(isOnboardingComplete(userData)).toBe(true);
    expect(needsOnboarding(userData)).toBe(false);
  });
});
