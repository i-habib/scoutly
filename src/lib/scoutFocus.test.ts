import { describe, expect, it } from 'vitest';
import { initialUserData, type UserData } from '../data/userData';
import {
  getFocusTrackForRank,
  getUserFocusTrack,
  getWorkingRankId,
} from './scoutFocus';

function makeUserData(currentRank: string): UserData {
  const userData = structuredClone(initialUserData);
  userData.profile.currentRank = currentRank;
  return userData;
}

describe('scout focus helpers', () => {
  it('maps current ranks to the next working rank', () => {
    expect(getWorkingRankId('rank_scout')).toBe('rank_tenderfoot');
    expect(getWorkingRankId('rank_first_class')).toBe('rank_star');
    expect(getWorkingRankId('rank_eagle')).toBe('rank_eagle');
  });

  it('treats tenderfoot through first class as signoff-focused ranks', () => {
    expect(getFocusTrackForRank('rank_tenderfoot')).toBe('signoffs');
    expect(getFocusTrackForRank('rank_first_class')).toBe('signoffs');
  });

  it('treats star through eagle as merit-badge-focused ranks', () => {
    expect(getFocusTrackForRank('rank_star')).toBe('meritBadges');
    expect(getFocusTrackForRank('rank_eagle')).toBe('meritBadges');
  });

  it('uses the in-progress rank to decide the user focus track', () => {
    expect(getUserFocusTrack(makeUserData('rank_second_class'))).toBe('signoffs');
    expect(getUserFocusTrack(makeUserData('rank_first_class'))).toBe('meritBadges');
  });
});
