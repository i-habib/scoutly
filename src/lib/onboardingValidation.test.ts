import { describe, expect, it } from 'vitest';
import {
  validateStepOne,
  validateStepTwo,
  type OnboardingFormState,
} from './onboardingValidation';

function makeForm(overrides: Partial<OnboardingFormState> = {}): OnboardingFormState {
  return {
    name: 'Scout Alex',
    currentRank: 'rank_scout',
    targetEagleDate: '',
    meetingsPerMonthOverride: '',
    troopNumber: '',
    meetingDay: '',
    meetingTime: '',
    scoutbookCalendarUrl: '',
    ...overrides,
  };
}

describe('onboarding validation helpers', () => {
  it('requires name and rank for step one', () => {
    const errors = validateStepOne(
      makeForm({
        name: '   ',
        currentRank: '',
      }),
    );

    expect(errors.name).toBeDefined();
    expect(errors.currentRank).toBeDefined();
  });

  it('accepts valid step one data', () => {
    const errors = validateStepOne(makeForm());
    expect(errors).toEqual({});
  });

  it('allows blank optional values on step two', () => {
    const errors = validateStepTwo(makeForm({ meetingsPerMonthOverride: '' }));
    expect(errors).toEqual({});
  });

  it('rejects invalid meetings-per-month values on step two', () => {
    const errors = validateStepTwo(makeForm({ meetingsPerMonthOverride: '0' }));
    expect(errors.meetingsPerMonthOverride).toBeDefined();
  });

  it('rejects invalid calendar urls on step two', () => {
    const errors = validateStepTwo(makeForm({ scoutbookCalendarUrl: 'calendar.local/feed.ics' }));
    expect(errors.scoutbookCalendarUrl).toBeDefined();
  });

  it('accepts valid calendar urls on step two', () => {
    const errors = validateStepTwo(
      makeForm({ scoutbookCalendarUrl: 'https://api.scouting.org/feed.ics' }),
    );
    expect(errors.scoutbookCalendarUrl).toBeUndefined();
  });
});
