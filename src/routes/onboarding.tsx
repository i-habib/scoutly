import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ArrowRight, Award, CalendarDays, Clock3, UserRound, Users } from 'lucide-react';
import { useUserData } from '../hooks/useUserData';
import { PageSkeleton } from '../components/SkeletonLoader';
import { ScoutFleurDeLis } from '../components/ScoutIcons';
import { useToast } from '../components/Toast';
import { RANK_ORDER, getRankDisplayName, normalizeRankId } from '../lib/constants';
import { isOnboardingComplete } from '../lib/onboarding';
import * as storage from '../services/storageService';

export const Route = createFileRoute('/onboarding')({
  component: OnboardingPage,
});

interface OnboardingFormState {
  name: string;
  currentRank: string;
  targetEagleDate: string;
  meetingsPerMonthOverride: string;
  troopNumber: string;
  meetingDay: string;
  meetingTime: string;
}

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

function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { userData, isLoading, updateProfileAsync } = useUserData();
  const { showToast } = useToast();
  const [form, setForm] = useState<OnboardingFormState>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!userData) return;
    setForm(createOnboardingFormState(userData.profile));
  }, [userData]);

  useEffect(() => {
    if (!isLoading && userData && isOnboardingComplete(userData)) {
      navigate({ to: '/', replace: true });
    }
  }, [isLoading, navigate, userData]);

  const handleFieldChange = (field: keyof OnboardingFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim()) {
      showToast('error', 'Enter the Scout name to continue.');
      return;
    }

    if (!form.currentRank) {
      showToast('error', 'Select the current rank to continue.');
      return;
    }

    if (!form.targetEagleDate) {
      showToast('error', 'Set a target Eagle date to continue.');
      return;
    }

    const meetingsOverride = form.meetingsPerMonthOverride.trim();
    if (meetingsOverride) {
      const meetingsValue = Number(meetingsOverride);
      if (!Number.isInteger(meetingsValue) || meetingsValue < 1 || meetingsValue > 31) {
        showToast('error', 'Meetings per month must be a whole number between 1 and 31.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      await updateProfileAsync({
        hasCompletedOnboarding: true,
        name: form.name.trim(),
        currentRank: normalizeRankId(form.currentRank),
        targetEagleDate: form.targetEagleDate,
        meetingsPerMonthOverride: meetingsOverride ? Number(meetingsOverride) : null,
      });

      await storage.updateTroopInfo({
        troopNumber: form.troopNumber.trim() || null,
        meetingDay: form.meetingDay || null,
        meetingTime: form.meetingTime || null,
      });

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

      <div className="app-shell__content mx-auto max-w-6xl px-6 py-10">
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="app-surface rounded-3xl p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1f3448] text-white">
                <ScoutFleurDeLis className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-950">Initial setup</p>
                <p className="text-sm text-slate-500">Complete this once to configure the workspace.</p>
              </div>
            </div>

            <div className="mb-8">
              <h1 className="text-3xl font-semibold text-slate-950">Set up the Scout profile</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Enter the basic planning details Scoutly needs before opening the dashboard.
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <UserRound className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">Scout information</h2>
                    <p className="text-sm text-slate-600">
                      These fields drive the dashboard, timeline, and advancement planning.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Scout name" required>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(event) => handleFieldChange('name', event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-transparent focus:ring-4 focus:ring-slate-100"
                      placeholder="Scout name"
                    />
                  </Field>

                  <Field label="Current rank" required>
                    <select
                      value={form.currentRank}
                      onChange={(event) => handleFieldChange('currentRank', event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-transparent focus:ring-4 focus:ring-slate-100"
                    >
                      <option value="">Select rank</option>
                      {RANK_ORDER.map((rankId) => (
                        <option key={rankId} value={rankId}>
                          {getRankDisplayName(rankId)}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Target Eagle date" required>
                    <input
                      type="date"
                      value={form.targetEagleDate}
                      onChange={(event) => handleFieldChange('targetEagleDate', event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-transparent focus:ring-4 focus:ring-slate-100"
                    />
                  </Field>

                  <Field label="Meetings per month" hint="Optional if you plan to load a troop calendar later.">
                    <input
                      type="number"
                      min="1"
                      max="31"
                      step="1"
                      value={form.meetingsPerMonthOverride}
                      onChange={(event) =>
                        handleFieldChange('meetingsPerMonthOverride', event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-transparent focus:ring-4 focus:ring-slate-100"
                      placeholder="Auto from events"
                    />
                  </Field>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">Troop details</h2>
                    <p className="text-sm text-slate-600">
                      Optional details that make event planning and reminders more useful.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="Troop number">
                    <input
                      type="text"
                      value={form.troopNumber}
                      onChange={(event) => handleFieldChange('troopNumber', event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-transparent focus:ring-4 focus:ring-slate-100"
                      placeholder="e.g. 412"
                    />
                  </Field>

                  <Field label="Meeting day">
                    <select
                      value={form.meetingDay}
                      onChange={(event) => handleFieldChange('meetingDay', event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-transparent focus:ring-4 focus:ring-slate-100"
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
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-transparent focus:ring-4 focus:ring-slate-100"
                    />
                  </Field>
                </div>
              </section>

              <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-slate-950">Open the dashboard after setup</p>
                  <p className="text-sm text-slate-600">
                    You can edit these settings later from the profile page.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1f3448] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#182b3b] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? 'Saving...' : 'Continue to dashboard'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-6">
            <div className="app-surface rounded-3xl p-6">
              <h2 className="text-lg font-semibold text-slate-950">What this configures</h2>
              <div className="mt-4 space-y-3">
                <SetupItem
                  icon={<Award className="h-5 w-5" />}
                  title="Advancement planning"
                  description="Uses the current rank and target Eagle date to build the timeline and dashboard pacing."
                />
                <SetupItem
                  icon={<CalendarDays className="h-5 w-5" />}
                  title="Scheduling assumptions"
                  description="Uses meetings per month and troop details until a troop calendar is loaded."
                />
                <SetupItem
                  icon={<Clock3 className="h-5 w-5" />}
                  title="One-time entry"
                  description="This setup only appears for first-time use. Ongoing changes happen in Profile Settings."
                />
              </div>
            </div>
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
  required = false,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
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
      {hint ? <p className="mt-2 text-sm text-slate-500">{hint}</p> : null}
    </label>
  );
}

function SetupItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>
    </div>
  );
}
