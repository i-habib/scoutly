import { createFileRoute, Link } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useEffect, useState } from 'react';
import meritBadgesData from '../data/merit-badges.json';
import rankRequirementsData from '../data/rank-reqs.json';
import { useUserData } from '../hooks/useUserData';
import { ScoutFleurDeLis, EagleIcon, MeritBadgeIcon } from '../components/ScoutIcons';
import {
  Award,
  Bell,
  CalendarDays,
  CheckCircle2,
  Edit2,
  Gauge,
  Save,
  Target,
  Users,
  X,
} from 'lucide-react';
import { splitEagleRequiredByStatus } from '../lib/progress';
import { RANK_ORDER, getRankDisplayName, normalizeRankId } from '../lib/constants';
import {
  getMeritBadgePaceSummary,
  getSignoffPaceSummary,
  getUserFocusTrack,
  getWorkingRankId,
} from '../lib/scoutFocus';
import { useToast } from '../components/Toast';
import * as storage from '../services/storageService';

export const Route = createFileRoute('/profile')({ component: Profile });

type NotificationField = 'meetingReminders' | 'eventReminders' | 'progressUpdates';

interface ProfileFormState {
  name: string;
  targetEagleDate: string;
  currentRank: string;
  meetingsPerMonthOverride: string;
  troopNumber: string;
  meetingDay: string;
  meetingTime: string;
  meetingReminders: boolean;
  eventReminders: boolean;
  progressUpdates: boolean;
}

const EMPTY_FORM: ProfileFormState = {
  name: '',
  targetEagleDate: '',
  currentRank: '',
  meetingsPerMonthOverride: '',
  troopNumber: '',
  meetingDay: '',
  meetingTime: '',
  meetingReminders: true,
  eventReminders: true,
  progressUpdates: true,
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

const NOTIFICATION_OPTIONS: Array<{
  field: NotificationField;
  title: string;
  description: string;
}> = [
  {
    field: 'meetingReminders',
    title: 'Meeting reminders',
    description: 'Use for weekly troop meetings and scheduled scouting activities.',
  },
  {
    field: 'eventReminders',
    title: 'Event reminders',
    description: 'Use for campouts, service projects, and calendar events.',
  },
  {
    field: 'progressUpdates',
    title: 'Progress updates',
    description: 'Use for badge and advancement milestone reminders.',
  },
];

function createProfileFormState(profile?: {
  name: string | null;
  targetEagleDate: string | null;
  currentRank: string | null;
  meetingsPerMonthOverride?: number | null;
  notificationPreferences?: {
    meetingReminders: boolean;
    eventReminders: boolean;
    progressUpdates: boolean;
  };
  troopInfo?: {
    troopNumber: string | null;
    meetingDay: string | null;
    meetingTime: string | null;
  };
}): ProfileFormState {
  return {
    name: profile?.name || '',
    targetEagleDate: profile?.targetEagleDate || '',
    currentRank: profile?.currentRank ? normalizeRankId(profile.currentRank) : '',
    meetingsPerMonthOverride:
      profile?.meetingsPerMonthOverride && profile.meetingsPerMonthOverride > 0
        ? String(profile.meetingsPerMonthOverride)
        : '',
    troopNumber: profile?.troopInfo?.troopNumber || '',
    meetingDay: profile?.troopInfo?.meetingDay || '',
    meetingTime: profile?.troopInfo?.meetingTime || '',
    meetingReminders: profile?.notificationPreferences?.meetingReminders ?? true,
    eventReminders: profile?.notificationPreferences?.eventReminders ?? true,
    progressUpdates: profile?.notificationPreferences?.progressUpdates ?? true,
  };
}

function calculatePaceAssessment(userData: NonNullable<ReturnType<typeof useUserData>['userData']>) {
  return getUserFocusTrack(userData) === 'signoffs'
    ? getSignoffPaceSummary(userData)
    : getMeritBadgePaceSummary(userData);
}

function formatLongDate(value: string | null | undefined) {
  if (!value) return 'Not set';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function getMeetingsPerMonthSummary(value: number | null | undefined) {
  if (!value || value <= 0) return 'Auto from events';
  return `${value} per month`;
}

function getTroopSummary(profile: NonNullable<ReturnType<typeof useUserData>['userData']>['profile']) {
  const troopNumber = profile.troopInfo?.troopNumber;
  const meetingDay = profile.troopInfo?.meetingDay;
  const meetingTime = profile.troopInfo?.meetingTime;

  const parts = [
    troopNumber ? `Troop ${troopNumber}` : null,
    meetingDay || null,
    meetingTime || null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(' • ') : 'Not set';
}

function getRankInfo(userData: NonNullable<ReturnType<typeof useUserData>['userData']>) {
  const currentRankId = normalizeRankId(userData.profile.currentRank || 'rank_scout');
  const currentRankIndex = RANK_ORDER.indexOf(currentRankId as (typeof RANK_ORDER)[number]);
  const safeRankIndex = currentRankIndex >= 0 ? currentRankIndex : 0;
  const nextRankIndex =
    safeRankIndex < RANK_ORDER.length - 1 ? safeRankIndex + 1 : safeRankIndex;

  const currentRankDisplay = getRankDisplayName(RANK_ORDER[safeRankIndex]);
  const nextRankDisplay = getRankDisplayName(RANK_ORDER[nextRankIndex]);
  const nextRankId = RANK_ORDER[nextRankIndex];
  const nextRankData = rankRequirementsData.find((rank) => rank.id === nextRankId);

  if (!nextRankData) {
    return {
      currentRankDisplay,
      nextRankDisplay,
      progress: 0,
      completed: 0,
      total: 0,
    };
  }

  const rankProgress = userData.rankProgress?.[nextRankId] || {};
  const allRequirements = nextRankData.requirements.flatMap((requirement) => {
    if ('sub_requirements' in requirement && (requirement as any).sub_requirements) {
      return [requirement, ...(requirement as any).sub_requirements];
    }
    return [requirement];
  });

  const completed = Object.keys(rankProgress).filter((key) => rankProgress[key]).length;
  const total = allRequirements.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    currentRankDisplay,
    nextRankDisplay,
    progress,
    completed,
    total,
  };
}

function Profile() {
  const queryClient = useQueryClient();
  const { userData, isLoading, updateProfileAsync } = useUserData();
  const { showToast } = useToast();

  const [paceAssessment, setPaceAssessment] = useState('Calculating...');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<ProfileFormState>(EMPTY_FORM);

  useEffect(() => {
    if (!userData) return;

    setPaceAssessment(calculatePaceAssessment(userData));
    if (!isEditing) {
      setForm(createProfileFormState(userData.profile));
    }
  }, [userData, isEditing]);

  const handleFieldChange = (field: keyof ProfileFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleNotificationToggle = (field: NotificationField, checked: boolean) => {
    setForm((current) => ({ ...current, [field]: checked }));
  };

  const handleStartEdit = () => {
    if (userData) {
      setForm(createProfileFormState(userData.profile));
    }
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (userData) {
      setForm(createProfileFormState(userData.profile));
    }
    setIsEditing(false);
  };

  const handleSaveProfile = async () => {
    const meetingsOverride = form.meetingsPerMonthOverride.trim();

    if (meetingsOverride) {
      const meetingsValue = Number(meetingsOverride);
      if (!Number.isInteger(meetingsValue) || meetingsValue < 1 || meetingsValue > 31) {
        showToast('error', 'Meetings per month must be a whole number between 1 and 31.');
        return;
      }
    }

    setIsSaving(true);

    try {
      await updateProfileAsync({
        name: form.name.trim() || null,
        targetEagleDate: form.targetEagleDate || null,
        currentRank: form.currentRank || null,
        meetingsPerMonthOverride: meetingsOverride ? Number(meetingsOverride) : null,
      });

      await storage.updateTroopInfo({
        troopNumber: form.troopNumber.trim() || null,
        meetingDay: form.meetingDay || null,
        meetingTime: form.meetingTime || null,
      });

      await storage.updateNotificationPreferences({
        meetingReminders: form.meetingReminders,
        eventReminders: form.eventReminders,
        progressUpdates: form.progressUpdates,
      });

      await queryClient.invalidateQueries({ queryKey: ['userData'] });
      setIsEditing(false);
      showToast('success', 'Profile settings updated.');
    } catch {
      showToast('error', 'Unable to save profile changes right now.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !userData) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center">
        <div className="text-center relative z-10">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
          <p className="text-slate-500">Loading profile...</p>
        </div>
      </div>
    );
  }

  const rankInfo = getRankInfo(userData);
  const { completed, inProgress, notStarted } = splitEagleRequiredByStatus(userData);
  const focusTrack = getUserFocusTrack(userData);
  const workingRankId = getWorkingRankId(userData.profile.currentRank);
  const workingRankLabel = getRankDisplayName(workingRankId);
  const planningQuestion =
    focusTrack === 'signoffs'
      ? `Is your plan realistic for ${workingRankLabel} signoffs?`
      : `Is your plan realistic for ${workingRankLabel} merit badge work?`;
  const planningLensLabel =
    focusTrack === 'signoffs' ? 'Signoff-first planning' : 'Merit-badge-first planning';

  return (
    <div className="app-shell">
      <div className="app-shell__grid fixed inset-0" />
      <div className="app-shell__glow app-shell__glow--top fixed" />
      <div className="app-shell__glow app-shell__glow--bottom fixed" />

      <div className="relative z-10 mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6">
          <div className="app-surface rounded-3xl p-6">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-500 to-sky-600 text-white shadow-[0_14px_30px_rgba(14,165,233,0.22)]">
                  <ScoutFleurDeLis className="text-white" size={28} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-950">Profile Settings</h1>
                  <p className="text-slate-600">
                    Source of truth for the plan behind your dashboard, events, and timeline.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {!isEditing ? (
                  <button
                    onClick={handleStartEdit}
                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-emerald-700 transition-colors hover:bg-emerald-100"
                  >
                    <Edit2 size={18} />
                    Edit Settings
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(17rem,0.7fr)]">
              <div className="rounded-3xl border border-slate-200 bg-linear-to-r from-[#f2f6f3] via-white to-[#eef7fb] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                    <Gauge className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {planningLensLabel}
                    </p>
                    <h2 className="text-xl font-bold text-slate-950">{planningQuestion}</h2>
                  </div>
                </div>
                <p className="text-lg font-semibold text-slate-900">{paceAssessment}</p>
                <p className="mt-2 text-sm text-slate-600">
                  This page exists to keep your plan realistic, not just store account settings.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_10px_24px_rgba(24,35,47,0.05)]">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Current planning lens
                </div>
                <div className="mt-2 text-lg font-semibold text-slate-950">{workingRankLabel}</div>
                <div className="mt-1 text-sm leading-6 text-slate-600">
                  {focusTrack === 'signoffs'
                    ? 'Scoutly is prioritizing rank signoffs and next-rank requirements right now.'
                    : 'Scoutly is prioritizing Eagle-required merit badge momentum right now.'}
                </div>
              </div>
            </div>

            {isEditing ? (
              <div className="space-y-6">
                <div className="grid gap-6 xl:grid-cols-2">
                  <section className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                        <Award className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-slate-950">Account and planning</h2>
                        <p className="text-sm text-slate-600">
                          Core settings used to calculate rank and Eagle pacing.
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Scout name">
                        <input
                          type="text"
                          value={form.name}
                          onChange={(event) => handleFieldChange('name', event.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-transparent focus:ring-4 focus:ring-emerald-100"
                          placeholder="Scout name"
                        />
                      </Field>

                      <Field label="Current rank">
                        <select
                          value={form.currentRank}
                          onChange={(event) => handleFieldChange('currentRank', event.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-transparent focus:ring-4 focus:ring-emerald-100"
                        >
                          <option value="">Select rank</option>
                          {RANK_ORDER.map((rankId) => (
                            <option key={rankId} value={rankId}>
                              {getRankDisplayName(rankId)}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Target Eagle date">
                        <input
                          type="date"
                          value={form.targetEagleDate}
                          onChange={(event) =>
                            handleFieldChange('targetEagleDate', event.target.value)
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-transparent focus:ring-4 focus:ring-emerald-100"
                        />
                      </Field>

                      <Field
                        label="Meetings per month"
                        hint="Leave blank to estimate from your troop events."
                      >
                        <input
                          type="number"
                          min="1"
                          max="31"
                          step="1"
                          value={form.meetingsPerMonthOverride}
                          onChange={(event) =>
                            handleFieldChange('meetingsPerMonthOverride', event.target.value)
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-transparent focus:ring-4 focus:ring-emerald-100"
                          placeholder="Auto from events"
                        />
                      </Field>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-slate-950">Troop details</h2>
                        <p className="text-sm text-slate-600">
                          Keep your troop information consistent across the app.
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <Field label="Troop number">
                        <input
                          type="text"
                          value={form.troopNumber}
                          onChange={(event) => handleFieldChange('troopNumber', event.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-transparent focus:ring-4 focus:ring-emerald-100"
                          placeholder="e.g. 412"
                        />
                      </Field>

                      <Field label="Meeting day">
                        <select
                          value={form.meetingDay}
                          onChange={(event) => handleFieldChange('meetingDay', event.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-transparent focus:ring-4 focus:ring-emerald-100"
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
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-transparent focus:ring-4 focus:ring-emerald-100"
                        />
                      </Field>
                    </div>
                  </section>
                </div>

                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                      <Bell className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-950">Notifications</h2>
                      <p className="text-sm text-slate-600">
                        Control the reminders saved with your profile.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    {NOTIFICATION_OPTIONS.map((option) => (
                      <label
                        key={option.field}
                        className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <input
                          type="checkbox"
                          checked={form[option.field]}
                          onChange={(event) =>
                            handleNotificationToggle(option.field, event.target.checked)
                          }
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                          <div className="text-sm font-semibold text-slate-950">{option.title}</div>
                          <div className="mt-1 text-sm text-slate-600">{option.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </section>

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-emerald-600 to-sky-600 px-4 py-2 font-semibold text-white transition-all hover:from-emerald-500 hover:to-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Save size={18} />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-700 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <X size={18} />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <SummaryCard label="Scout name" value={userData.profile.name || 'Not set'} />
                <SummaryCard
                  label="Current rank"
                  value={
                    userData.profile.currentRank
                      ? getRankDisplayName(userData.profile.currentRank)
                      : 'Not set'
                  }
                />
                <SummaryCard
                  label="Target Eagle date"
                  value={formatLongDate(userData.profile.targetEagleDate)}
                />
                <SummaryCard
                  label="Meetings per month"
                  value={getMeetingsPerMonthSummary(userData.profile.meetingsPerMonthOverride)}
                />
                <SummaryCard label="Troop details" value={getTroopSummary(userData.profile)} />
                <SummaryCard
                  label="Notifications"
                  value={
                    [
                      userData.profile.notificationPreferences?.meetingReminders
                        ? 'Meetings'
                        : null,
                      userData.profile.notificationPreferences?.eventReminders ? 'Events' : null,
                      userData.profile.notificationPreferences?.progressUpdates
                        ? 'Progress'
                        : null,
                    ]
                      .filter(Boolean)
                      .join(', ') || 'None enabled'
                  }
                />
                <SummaryCard label="Current rank goal" value={rankInfo.nextRankDisplay} />
                <SummaryCard
                  label="Planning tools"
                  value="Used by dashboard, timeline, and events"
                />
                <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 md:col-span-2">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-sky-700">
                    Calendar sync
                  </div>
                  {userData.profile.scoutbookCalendarUrl ? (
                    <div className="flex flex-col gap-2">
                      <div>
                        <div className="text-sm font-semibold text-slate-900 break-all">
                          {userData.profile.scoutbookCalendarUrl.length > 60
                            ? `${userData.profile.scoutbookCalendarUrl.slice(0, 60)}…`
                            : userData.profile.scoutbookCalendarUrl}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500">
                          {userData.profile.lastCalendarSync
                            ? `Last synced ${new Date(userData.profile.lastCalendarSync).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`
                            : 'Not yet synced'}
                        </div>
                      </div>
                      <Link
                        to="/events"
                        className="inline-flex w-fit items-center gap-1.5 rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm font-semibold text-sky-700 transition-all hover:bg-sky-100"
                      >
                        Manage in Events
                      </Link>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500">
                      No calendar source connected yet. Open{' '}
                      <Link
                        to="/events"
                        className="font-semibold text-sky-700 underline hover:text-sky-900"
                      >
                        Events
                      </Link>{' '}
                      to connect Scoutbook or import a calendar file.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="app-surface mb-6 rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <EagleIcon className="text-emerald-600" size={28} />
            <h2 className="text-xl font-bold text-slate-950">Current Rank Progress</h2>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <Award className="h-5 w-5" />
              </div>
              <div className="mb-1 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                Current Rank
              </div>
              <div className="text-xl font-bold text-slate-950">{rankInfo.currentRankDisplay}</div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <Target className="h-5 w-5" />
                </span>
                <span className="text-2xl font-bold text-slate-950">{rankInfo.progress}%</span>
              </div>
              <div className="mb-2 text-sm font-semibold text-[#1f3448]">
                Progress to {rankInfo.nextRankDisplay}
              </div>
              <div className="mb-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-linear-to-r from-emerald-500 to-sky-600 transition-all duration-500"
                  style={{ width: `${rankInfo.progress}%` }}
                />
              </div>
              <div className="text-xs text-slate-500">
                {rankInfo.completed}/{rankInfo.total} requirements completed
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div className="mb-1 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                Eagle Target
              </div>
              <div className="text-xl font-bold text-slate-950">
                {userData.profile.targetEagleDate
                  ? new Date(userData.profile.targetEagleDate).toLocaleDateString('en-US', {
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'Not set'}
              </div>
            </div>
          </div>
        </div>

        {completed.length > 0 && (
          <div className="app-surface mb-6 rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              <h2 className="text-xl font-bold text-slate-950">
                Completed Eagle-Required Badges ({completed.length}/21)
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {completed.map((badge) => (
                <Link
                  key={badge.id}
                  to="/merit-badges/$badgeId"
                  params={{ badgeId: badge.id }}
                  className="group"
                >
                  <div className="cursor-pointer rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-center transition-all hover:scale-105 hover:border-emerald-300">
                    {badge.imageUrl ? (
                      <img
                        src={badge.imageUrl}
                        alt={badge.name}
                        className="mx-auto mb-2 h-16 w-16 object-contain"
                      />
                    ) : (
                      <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-white">
                        <MeritBadgeIcon className="h-8 w-8 text-emerald-700" />
                      </div>
                    )}
                    <div className="mb-1 min-h-8 line-clamp-2 text-xs font-semibold text-slate-900">
                      {badge.name}
                    </div>
                    <div className="text-sm font-bold text-emerald-700">100%</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {inProgress.length > 0 && (
          <div className="app-surface mb-6 rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Target className="h-6 w-6 text-sky-600" />
              <h2 className="text-xl font-bold text-slate-950">In Progress ({inProgress.length})</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {inProgress.map((badge) => (
                <Link
                  key={badge.id}
                  to="/merit-badges/$badgeId"
                  params={{ badgeId: badge.id }}
                  className="group"
                >
                  <div className="cursor-pointer rounded-2xl border border-sky-200 bg-sky-50 p-3 text-center transition-all hover:scale-105 hover:border-sky-300">
                    {badge.imageUrl ? (
                      <img
                        src={badge.imageUrl}
                        alt={badge.name}
                        className="mx-auto mb-2 h-16 w-16 object-contain"
                      />
                    ) : (
                      <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-white">
                        <MeritBadgeIcon className="h-8 w-8 text-sky-700" />
                      </div>
                    )}
                    <div className="mb-2 min-h-8 line-clamp-2 text-xs font-semibold text-slate-900">
                      {badge.name}
                    </div>
                    <div className="mb-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full bg-linear-to-r from-emerald-500 to-sky-600"
                        style={{ width: `${badge.percentage}%` }}
                      />
                    </div>
                    <div className="text-sm font-bold text-sky-700">{badge.percentage}%</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {notStarted.length > 0 && (
          <div className="app-surface rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <MeritBadgeIcon className="h-6 w-6 text-slate-500" />
              <h2 className="text-xl font-bold text-slate-950">Not Started ({notStarted.length})</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {notStarted.map((badge) => (
                <Link
                  key={badge.id}
                  to="/merit-badges/$badgeId"
                  params={{ badgeId: badge.id }}
                  className="group"
                >
                  <div className="cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center transition-all hover:scale-105 hover:border-slate-300">
                    {badge.imageUrl ? (
                      <img
                        src={badge.imageUrl}
                        alt={badge.name}
                        className="mx-auto mb-2 h-16 w-16 object-contain opacity-60 transition-opacity group-hover:opacity-80"
                      />
                    ) : (
                      <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white opacity-70 transition-opacity group-hover:opacity-100">
                        <MeritBadgeIcon className="h-6 w-6 text-slate-500" />
                      </div>
                    )}
                    <div className="mb-1 min-h-8 line-clamp-2 text-xs font-semibold text-slate-700">
                      {badge.name}
                    </div>
                    <div className="text-sm font-bold text-slate-400">0%</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
      {children}
      {hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-1 text-sm text-slate-500">{label}</div>
      <div className="text-base font-semibold text-slate-950">{value}</div>
    </div>
  );
}
