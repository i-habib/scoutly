export interface OnboardingFormState {
  name: string;
  currentRank: string;
  targetEagleDate: string;
  meetingsPerMonthOverride: string;
  troopNumber: string;
  meetingDay: string;
  meetingTime: string;
  scoutbookCalendarUrl: string;
}

export type OnboardingErrors = Partial<Record<keyof OnboardingFormState, string>>;

export function validateCalendarUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return 'Calendar URL must start with http:// or https://.';
  }

  return null;
}

export function validateStepOne(form: OnboardingFormState): OnboardingErrors {
  const errors: OnboardingErrors = {};

  if (!form.name.trim()) {
    errors.name = 'Enter the Scout name to continue.';
  }

  if (!form.currentRank) {
    errors.currentRank = 'Select the current rank to continue.';
  }

  return errors;
}

export function validateStepTwo(form: OnboardingFormState): OnboardingErrors {
  const errors: OnboardingErrors = {};
  const meetingsOverride = form.meetingsPerMonthOverride.trim();
  const calendarUrlError = validateCalendarUrl(form.scoutbookCalendarUrl);

  if (meetingsOverride) {
    const meetingsValue = Number(meetingsOverride);
    if (!Number.isInteger(meetingsValue) || meetingsValue < 1 || meetingsValue > 31) {
      errors.meetingsPerMonthOverride =
        'Meetings per month must be a whole number between 1 and 31.';
    }
  }

  if (calendarUrlError) {
    errors.scoutbookCalendarUrl = calendarUrlError;
  }

  return errors;
}
