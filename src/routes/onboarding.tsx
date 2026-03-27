import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CalendarRange,
  CheckCircle2,
  Link2,
  RefreshCw,
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react';
import { useUserData } from '../hooks/useUserData';
import { PageSkeleton } from '../components/SkeletonLoader';
import { ScoutFleurDeLis } from '../components/ScoutIcons';
import { useToast } from '../components/Toast';
import { RANK_ORDER, getRankDisplayName, normalizeRankId } from '../lib/constants';
import { isOnboardingComplete } from '../lib/onboarding';
import {
  type OnboardingErrors,
  type OnboardingFormState,
  validateCalendarUrl,
  validateStepOne,
  validateStepTwo,
} from '../lib/onboardingValidation';
import * as storage from '../services/storageService';

export const Route = createFileRoute('/onboarding')({
  component: OnboardingPage,
});

type OnboardingStep = 1 | 2;

const REQUIRED_FIELD_COUNT = 2;
const OPTIONAL_FIELD_COUNT = 6;

const EMPTY_FORM: OnboardingFormState = {
  name: '',
  currentRank: '',
  targetEagleDate: '',
  meetingsPerMonthOverride: '',
  troopNumber: '',
  meetingDay: '',
  meetingTime: '',
  scoutbookCalendarUrl: '',
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
  scoutbookCalendarUrl?: string | null;
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
    scoutbookCalendarUrl: profile?.scoutbookCalendarUrl || '',
  };
}

function getInputClasses(hasError: boolean) {
  return `w-full rounded-xl border bg-white px-4 py-3 text-slate-900 shadow-sm transition-all duration-200 focus:border-transparent focus:ring-4 motion-reduce:transition-none ${
    hasError
      ? 'border-rose-300 focus:ring-rose-100'
      : 'border-slate-200 focus:ring-emerald-100 hover:border-slate-300'
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
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  const [calendarSyncSummary, setCalendarSyncSummary] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const rankSelectRef = useRef<HTMLSelectElement>(null);
  const meetingsInputRef = useRef<HTMLInputElement>(null);
  const calendarUrlInputRef = useRef<HTMLInputElement>(null);

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
      return;
    }

    if (field === 'scoutbookCalendarUrl') {
      calendarUrlInputRef.current?.focus();
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
    const calendarUrl = form.scoutbookCalendarUrl.trim();

    const profilePayload = {
      hasCompletedOnboarding: true,
      name: form.name.trim(),
      currentRank: normalizeRankId(form.currentRank),
      targetEagleDate: includeOptionalFields
        ? form.targetEagleDate || null
        : userData?.profile.targetEagleDate || null,
      meetingsPerMonthOverride:
        includeOptionalFields
          ? meetingsOverride
            ? Number(meetingsOverride)
            : null
          : userData?.profile.meetingsPerMonthOverride ?? null,
      scoutbookCalendarUrl: includeOptionalFields
        ? calendarUrl || null
        : userData?.profile.scoutbookCalendarUrl || null,
    };

    const troopPayload = includeOptionalFields
      ? {
          troopNumber: form.troopNumber.trim() || null,
          meetingDay: form.meetingDay || null,
          meetingTime: form.meetingTime || null,
        }
      : {
          troopNumber: userData?.profile.troopInfo?.troopNumber || null,
          meetingDay: userData?.profile.troopInfo?.meetingDay || null,
          meetingTime: userData?.profile.troopInfo?.meetingTime || null,
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

  const handleSyncCalendar = async () => {
    const trimmedUrl = form.scoutbookCalendarUrl.trim();
    const calendarUrlError =
      validateCalendarUrl(trimmedUrl) || (!trimmedUrl ? 'Add a calendar URL before syncing.' : null);

    if (calendarUrlError) {
      setErrors((current) => ({
        ...current,
        scoutbookCalendarUrl: calendarUrlError,
      }));
      focusField('scoutbookCalendarUrl');
      return;
    }

    setIsSyncingCalendar(true);
    setCalendarSyncSummary(null);

    try {
      await storage.updateCalendarUrl(trimmedUrl);
      const syncedUser = await storage.syncScoutbookCalendar();
      const syncedEvents = (syncedUser.events || []).filter((event) => event.source === 'scoutbook');

      await queryClient.invalidateQueries({ queryKey: ['userData'] });
      setCalendarSyncSummary(
        syncedEvents.length > 0
          ? `Synced ${syncedEvents.length} Scoutbook event${syncedEvents.length === 1 ? '' : 's'}.`
          : 'Calendar synced successfully.',
      );
      showToast('success', 'Calendar saved and synced.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Calendar sync failed.';
      setCalendarSyncSummary(null);
      showToast('error', message);
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  const completedRequiredFields = [Boolean(form.name.trim()), Boolean(form.currentRank)].filter(
    Boolean,
  ).length;

  const completedOptionalFields = [
    Boolean(form.targetEagleDate),
    Boolean(form.meetingsPerMonthOverride.trim()),
    Boolean(form.troopNumber.trim()),
    Boolean(form.meetingDay),
    Boolean(form.meetingTime),
    Boolean(form.scoutbookCalendarUrl.trim()),
  ].filter(Boolean).length;

  const completedFields = completedRequiredFields + completedOptionalFields;
  const totalFields = REQUIRED_FIELD_COUNT + OPTIONAL_FIELD_COUNT;
  const completionPercent = Math.round((completedFields / totalFields) * 100);
  const isStepOneComplete = completedRequiredFields === REQUIRED_FIELD_COUNT;

  if (isLoading || (!isLoading && userData && isOnboardingComplete(userData))) {
    return <PageSkeleton />;
  }

  return (
    <div className="app-shell">
      <div className="app-shell__grid fixed inset-0" />
      <div className="app-shell__glow app-shell__glow--top fixed" />
      <div className="app-shell__glow app-shell__glow--bottom fixed" />

      <div className="app-shell__content mx-auto max-w-4xl px-6 py-10">
        <section className="app-surface mb-6 rounded-3xl p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-[#24584b] to-[#1f3448] text-white shadow-[0_12px_24px_rgba(31,52,72,0.26)]">
                  <ScoutFleurDeLis className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-950">Scoutly onboarding</p>
                  <p className="text-sm text-slate-600">
                    Fast setup with optional details you can refine later.
                  </p>
                </div>
              </div>

              <div className="mb-3 h-2 w-full max-w-xl overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-linear-to-r from-emerald-600 to-sky-600 transition-all duration-500 ease-out motion-reduce:transition-none"
                  style={{ width: `${Math.max(completionPercent, 10)}%` }}
                />
              </div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                {completionPercent}% complete
              </p>
            </div>

            <div className="grid w-full max-w-xs gap-2 text-sm sm:grid-cols-2 md:w-auto md:grid-cols-1">
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700">
                Required: {completedRequiredFields}/{REQUIRED_FIELD_COUNT}
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700">
                Optional: {completedOptionalFields}/{OPTIONAL_FIELD_COUNT}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {[1, 2].map((stepValue) => {
              const normalizedStepValue = stepValue as OnboardingStep;
              const isCurrentStep = step === normalizedStepValue;
              const isComplete = step > normalizedStepValue;
              const isEnabled = stepValue === 1 || isStepOneComplete;

              return (
                <button
                  key={stepValue}
                  type="button"
                  onClick={() => {
                    if (!isEnabled || isSubmitting) return;
                    setStep(normalizedStepValue);
                  }}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-all motion-reduce:transition-none ${
                    isCurrentStep
                      ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                      : isComplete
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-white text-slate-600'
                  } ${!isEnabled ? 'cursor-not-allowed opacity-55' : 'hover:border-slate-300'}`}
                  disabled={!isEnabled || isSubmitting}
                >
                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold ${
                      isCurrentStep
                        ? 'bg-white/20 text-white'
                        : isComplete
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {isComplete ? <CheckCircle2 className="h-3 w-3" /> : stepValue}
                  </span>
                  {stepValue === 1 ? 'Basics' : 'Planning details'}
                </button>
              );
            })}
          </div>
        </section>

        <section className="app-surface rounded-3xl p-6 md:p-7">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div key={step} className="animate-fadeIn p-5 md:p-6">
              {step === 1 ? (
                <section>
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                      <UserRound className="h-5 w-5" />
                    </div>
                    <div>
                      <h1 className="text-lg font-semibold text-slate-950">Start with the essentials</h1>
                      <p className="text-sm text-slate-600">
                        Two quick details unlock the full workspace.
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
                <section>
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <h1 className="text-lg font-semibold text-slate-950">
                        Optional planning details
                      </h1>
                      <p className="text-sm text-slate-600">
                        Add what you know now. You can edit everything later in Profile and Events.
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

                    <Field
                      label="Scoutbook calendar URL"
                      hint="Paste the link from Scoutbook Plus Calendar > Copy url."
                      error={errors.scoutbookCalendarUrl}
                    >
                      <div className="relative">
                        <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          ref={calendarUrlInputRef}
                          type="url"
                          value={form.scoutbookCalendarUrl}
                          onChange={(event) =>
                            handleFieldChange('scoutbookCalendarUrl', event.target.value)
                          }
                          className={`${getInputClasses(Boolean(errors.scoutbookCalendarUrl))} pl-9`}
                          placeholder="https://api.scouting.org/advancements/events/calendar/..."
                          spellCheck={false}
                          autoComplete="off"
                        />
                      </div>
                    </Field>
                  </div>

                  <div className="mt-4 rounded-2xl border border-sky-100 bg-linear-to-r from-sky-50 via-white to-emerald-50 px-4 py-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-950">
                          <CalendarRange className="h-4 w-4 text-sky-600" />
                          Pull your troop calendar in right now
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          Save the Scoutbook link and sync events before you finish onboarding.
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          {calendarSyncSummary
                            ? calendarSyncSummary
                            : userData?.profile.lastCalendarSync
                              ? `Last synced ${formatDateTime(userData.profile.lastCalendarSync)}`
                              : 'No Scoutbook sync yet.'}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleSyncCalendar}
                        disabled={isSyncingCalendar || isSubmitting}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-sky-500 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
                      >
                        <RefreshCw className={`h-4 w-4 ${isSyncingCalendar ? 'animate-spin' : ''}`} />
                        {isSyncingCalendar ? 'Syncing...' : 'Save URL + Sync now'}
                      </button>
                    </div>
                  </div>
                </section>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-slate-600">
              {step === 1
                ? 'Step 1 is required to continue.'
                : 'Step 2 is optional. Save what you have now and refine anytime.'}
            </p>

            {step === 1 ? (
              <button
                type="button"
                onClick={handleContinue}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1f3448] px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-[#182b3b] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
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
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => saveOnboarding(false)}
                  disabled={isSubmitting}
                  className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
                >
                  Skip for now
                </button>
                <button
                  type="button"
                  onClick={() => saveOnboarding(true)}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-[#24584b] to-[#1f3448] px-5 py-3 text-sm font-semibold text-white transition-all hover:brightness-105 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
                >
                  {isSubmitting ? 'Saving...' : 'Open dashboard'}
                  {isSubmitting ? <Sparkles className="h-4 w-4 animate-pulse" /> : <ArrowRight className="h-4 w-4" />}
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
