export interface OnboardingFormState {
  name: string;
  currentRank: string;
  targetEagleDate: string;
  meetingsPerMonthOverride: string;
  troopNumber: string;
  meetingDay: string;
  meetingTime: string;
}

export type OnboardingErrors = Partial<Record<keyof OnboardingFormState, string>>;

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

  if (meetingsOverride) {
    const meetingsValue = Number(meetingsOverride);
    if (!Number.isInteger(meetingsValue) || meetingsValue < 1 || meetingsValue > 31) {
      errors.meetingsPerMonthOverride =
        'Meetings per month must be a whole number between 1 and 31.';
    }
  }

  return errors;
}
