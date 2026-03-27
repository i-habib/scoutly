import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, UserRound, Users } from 'lucide-react';
import { useUserData } from '../hooks/useUserData';
import { PageSkeleton } from '../components/SkeletonLoader';
import { ScoutFleurDeLis } from '../components/ScoutIcons';
import { useToast } from '../components/Toast';
import { RANK_ORDER, getRankDisplayName, normalizeRankId } from '../lib/constants';
import { isOnboardingComplete } from '../lib/onboarding';
import {
  type OnboardingErrors,
  type OnboardingFormState,
  validateStepOne,
  validateStepTwo,
} from '../lib/onboardingValidation';
import * as storage from '../services/storageService';

export const Route = createFileRoute('/onboarding')({
  component: OnboardingPage,
});

type OnboardingStep = 1 | 2;

const EMPTY_FORM: OnboardingFormState = {
  name: '',
  currentRank: '',
  targetEagleDate: '',
  meetingsPerMonthOverride: '',
  troopNumber: '',
  meetingDay: '',
  meetingTime: '',
};

const MEETING_DAY_OPTIONS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

function createOnboardingFormState(profile?: {
  name: string | null;
  currentRank: string | null;
  targetEagleDate: string | null;
  meetingsPerMonthOverride?: number | null;
  troopInfo?: {
    troopNumber: string | null;
    meetingDay: string | null;
    meetingTime: string | null;
  };
}): OnboardingFormState {
  return {
    name: profile?.name || '',
    currentRank: profile?.currentRank ? normalizeRankId(profile.currentRank) : '',
    targetEagleDate: profile?.targetEagleDate || '',
    meetingsPerMonthOverride:
      profile?.meetingsPerMonthOverride && profile.meetingsPerMonthOverride > 0
        ? String(profile.meetingsPerMonthOverride)
        : '',
    troopNumber: profile?.troopInfo?.troopNumber || '',
    meetingDay: profile?.troopInfo?.meetingDay || '',
    meetingTime: profile?.troopInfo?.meetingTime || '',
  };
}

function getInputClasses(hasError: boolean) {
  return `w-full rounded-xl border bg-white px-4 py-3 text-slate-900 focus:border-transparent focus:ring-4 ${
    hasError
      ? 'border-rose-300 focus:ring-rose-100'
      : 'border-slate-200 focus:ring-emerald-100'
  }`;
}

function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { userData, isLoading, updateProfileAsync } = useUserData();
  const { showToast } = useToast();

  const [form, setForm] = useState<OnboardingFormState>(EMPTY_FORM);
  const [step, setStep] = useState<OnboardingStep>(1);
  const [errors, setErrors] = useState<OnboardingErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const rankSelectRef = useRef<HTMLSelectElement>(null);
  const meetingsInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!userData) return;
    const nextForm = createOnboardingFormState(userData.profile);
    setForm(nextForm);
    if (nextForm.name.trim() && nextForm.currentRank) {
      setStep(2);
    }
  }, [userData]);

  useEffect(() => {
    if (!isLoading && userData && isOnboardingComplete(userData)) {
      navigate({ to: '/', replace: true });
    }
  }, [isLoading, navigate, userData]);

  const focusField = (field: keyof OnboardingFormState) => {
    if (field === 'name') {
      nameInputRef.current?.focus();
      return;
    }

    if (field === 'currentRank') {
      rankSelectRef.current?.focus();
      return;
    }

    if (field === 'meetingsPerMonthOverride') {
      meetingsInputRef.current?.focus();
    }
  };

  const handleFieldChange = (field: keyof OnboardingFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const handleContinue = () => {
    const validationErrors = validateStepOne(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const firstInvalidField = Object.keys(validationErrors)[0] as keyof OnboardingFormState;
      focusField(firstInvalidField);
      return;
    }

    setErrors({});
    setStep(2);
  };

  const saveOnboarding = async (includeOptionalFields: boolean) => {
    const stepOneErrors = validateStepOne(form);
    if (Object.keys(stepOneErrors).length > 0) {
      setErrors(stepOneErrors);
      setStep(1);
      const firstInvalidField = Object.keys(stepOneErrors)[0] as keyof OnboardingFormState;
      focusField(firstInvalidField);
      return;
    }

    const stepTwoErrors = includeOptionalFields ? validateStepTwo(form) : {};
    if (Object.keys(stepTwoErrors).length > 0) {
      setErrors(stepTwoErrors);
      const firstInvalidField = Object.keys(stepTwoErrors)[0] as keyof OnboardingFormState;
      focusField(firstInvalidField);
      return;
    }

    const meetingsOverride = form.meetingsPerMonthOverride.trim();
    const profilePayload = {
      hasCompletedOnboarding: true,
      name: form.name.trim(),
      currentRank: normalizeRankId(form.currentRank),
      targetEagleDate: includeOptionalFields ? form.targetEagleDate || null : null,
      meetingsPerMonthOverride:
        includeOptionalFields && meetingsOverride ? Number(meetingsOverride) : null,
    };

    const troopPayload = includeOptionalFields
      ? {
          troopNumber: form.troopNumber.trim() || null,
          meetingDay: form.meetingDay || null,
          meetingTime: form.meetingTime || null,
        }
      : {
          troopNumber: null,
          meetingDay: null,
          meetingTime: null,
        };

    setIsSubmitting(true);

    try {
      await updateProfileAsync(profilePayload);
      await storage.updateTroopInfo(troopPayload);
      await queryClient.invalidateQueries({ queryKey: ['userData'] });
      navigate({ to: '/', replace: true });
    } catch {
      showToast('error', 'Unable to complete setup right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || (!isLoading && userData && isOnboardingComplete(userData))) {
    return <PageSkeleton />;
  }

  return (
    <div className="app-shell">
      <div className="app-shell__grid fixed inset-0" />
      <div className="app-shell__glow app-shell__glow--top fixed" />
      <div className="app-shell__glow app-shell__glow--bottom fixed" />

      <div className="app-shell__content mx-auto max-w-3xl px-6 py-10">
        <div className="mb-6 flex items-center justify-center gap-4">
          {[1, 2].map((stepValue) => {
            const isCurrentStep = step === stepValue;
            const isComplete = step > stepValue;
            return (
              <div key={stepValue} className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-all ${
                    isComplete
                      ? 'bg-emerald-600 text-white'
                      : isCurrentStep
                        ? 'bg-[#1f3448] text-white'
                        : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isComplete ? <CheckCircle2 className="h-4 w-4" /> : stepValue}
                </div>
                <span
                  className={`text-sm font-medium ${
                    isCurrentStep ? 'text-slate-900' : 'text-slate-500'
                  }`}
                >
                  {stepValue === 1 ? 'Basics' : 'Optional details'}
                </span>
                {stepValue === 1 ? <div className="h-px w-8 bg-slate-300" /> : null}
              </div>
            );
          })}
        </div>

        <section className="app-surface rounded-3xl p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1f3448] text-white">
              <ScoutFleurDeLis className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-950">Initial setup</p>
              <p className="text-sm text-slate-500">A quick 2-step setup before the dashboard.</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl">
            <div
              className="transition-all duration-300"
              key={step}
            >
              {step === 1 ? (
                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                      <UserRound className="h-5 w-5" />
                    </div>
                    <div>
                      <h1 className="text-lg font-semibold text-slate-950">Start with the basics</h1>
                      <p className="text-sm text-slate-600">
                        This unlocks the workspace. You can tune the rest in under a minute next.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Scout name" required error={errors.name}>
                      <input
                        ref={nameInputRef}
                        type="text"
                        value={form.name}
                        onChange={(event) => handleFieldChange('name', event.target.value)}
                        className={getInputClasses(Boolean(errors.name))}
                        placeholder="Scout name"
                      />
                    </Field>

                    <Field label="Current rank" required error={errors.currentRank}>
                      <select
                        ref={rankSelectRef}
                        value={form.currentRank}
                        onChange={(event) => handleFieldChange('currentRank', event.target.value)}
                        className={getInputClasses(Boolean(errors.currentRank))}
                      >
                        <option value="">Select rank</option>
                        {RANK_ORDER.map((rankId) => (
                          <option key={rankId} value={rankId}>
                            {getRankDisplayName(rankId)}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </section>
              ) : (
                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <h1 className="text-lg font-semibold text-slate-950">Optional planning details</h1>
                      <p className="text-sm text-slate-600">
                        Add what you know now. You can skip this and edit everything later in Profile.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Target Eagle date">
                      <input
                        type="date"
                        value={form.targetEagleDate}
                        onChange={(event) => handleFieldChange('targetEagleDate', event.target.value)}
                        className={getInputClasses(Boolean(errors.targetEagleDate))}
                      />
                    </Field>

                    <Field
                      label="Meetings per month"
                      hint="Leave blank to estimate from your event activity."
                      error={errors.meetingsPerMonthOverride}
                    >
                      <input
                        ref={meetingsInputRef}
                        type="number"
                        min="1"
                        max="31"
                        step="1"
                        value={form.meetingsPerMonthOverride}
                        onChange={(event) =>
                          handleFieldChange('meetingsPerMonthOverride', event.target.value)
                        }
                        className={getInputClasses(Boolean(errors.meetingsPerMonthOverride))}
                        placeholder="Auto from events"
                      />
                    </Field>

                    <Field label="Troop number">
                      <input
                        type="text"
                        value={form.troopNumber}
                        onChange={(event) => handleFieldChange('troopNumber', event.target.value)}
                        className={getInputClasses(Boolean(errors.troopNumber))}
                        placeholder="e.g. 412"
                      />
                    </Field>

                    <Field label="Meeting day">
                      <select
                        value={form.meetingDay}
                        onChange={(event) => handleFieldChange('meetingDay', event.target.value)}
                        className={getInputClasses(Boolean(errors.meetingDay))}
                      >
                        <option value="">Select day</option>
                        {MEETING_DAY_OPTIONS.map((day) => (
                          <option key={day} value={day}>
                            {day}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Meeting time">
                      <input
                        type="time"
                        value={form.meetingTime}
                        onChange={(event) => handleFieldChange('meetingTime', event.target.value)}
                        className={getInputClasses(Boolean(errors.meetingTime))}
                      />
                    </Field>
                  </div>

                  <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Calendar connections and sync options are managed in the Events page.
                  </p>
                </section>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
            <p className="text-sm text-slate-600">
              {step === 1
                ? 'Step 1 is required to continue.'
                : 'Step 2 is optional. You can finish now and refine details later.'}
            </p>

            {step === 1 ? (
              <button
                type="button"
                onClick={handleContinue}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1f3448] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#182b3b] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => saveOnboarding(false)}
                  disabled={isSubmitting}
                  className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Skip for now
                </button>
                <button
                  type="button"
                  onClick={() => saveOnboarding(true)}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1f3448] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#182b3b] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? 'Saving...' : 'Open dashboard'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  hint,
  error,
  required = false,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-800">{label}</span>
        {required ? (
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
            Required
          </span>
        ) : null}
      </div>
      {children}
      {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
      {!error && hint ? <p className="mt-2 text-sm text-slate-500">{hint}</p> : null}
    </label>
  );
}
