import { createFileRoute, Link } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Award,
  Bell,
  CalendarDays,
  CheckCircle2,
  Edit2,
  Save,
  Target,
  Users,
  X,
} from 'lucide-react';
import rankRequirementsData from '../data/rank-reqs.json';
import { useUserData } from '../hooks/useUserData';
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
    description: 'Weekly troop meetings and routine activities.',
  },
  {
    field: 'eventReminders',
    title: 'Event reminders',
    description: 'Campouts, service projects, and calendar events.',
  },
  {
    field: 'progressUpdates',
    title: 'Progress updates',
    description: 'Advancement and merit badge milestone reminders.',
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

  const rankProgress: Record<string, string | null> = userData.rankProgress?.[nextRankId] || {};
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
    if (userData) setForm(createProfileFormState(userData.profile));
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (userData) setForm(createProfileFormState(userData.profile));
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
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-300 border-t-slate-700" />
          <p className="text-slate-500">Loading profile...</p>
        </div>
      </div>
    );
  }

  const rankInfo = getRankInfo(userData);
  const { completed, inProgress, notStarted } = splitEagleRequiredByStatus(userData);
  const focusTrack = getUserFocusTrack(userData);
  const workingRankLabel = getRankDisplayName(getWorkingRankId(userData.profile.currentRank));

  return (
    <div className="app-shell">
      <div className="app-shell__content mx-auto max-w-5xl px-6 py-8">
        <section className="app-surface mb-6 rounded-[1.9rem] p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Profile
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
                Settings and planning inputs
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                {focusTrack === 'signoffs'
                  ? `${workingRankLabel} is currently signoff-first.`
                  : `${workingRankLabel} is currently merit-badge-first.`}{' '}
                {paceAssessment}
              </p>
            </div>

            {!isEditing ? (
              <button
                onClick={handleStartEdit}
                className="inline-flex items-center gap-2 rounded-[1.25rem] border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] px-4 py-2 text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Edit2 size={18} />
                Edit settings
              </button>
            ) : null}
          </div>

          {isEditing ? (
            <div className="mt-6 space-y-6 border-t border-slate-200 pt-6">
              <div className="grid gap-6 xl:grid-cols-2">
                <section className="rounded-[1.45rem] border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <Award className="h-5 w-5 text-slate-700" />
                    <h2 className="text-lg font-semibold text-slate-950">Account and planning</h2>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Scout name">
                      <input
                        type="text"
                        value={form.name}
                        onChange={(event) => handleFieldChange('name', event.target.value)}
                        className="w-full rounded-[1.25rem] border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] px-4 py-3 text-slate-900 focus:border-slate-400 focus:outline-none"
                        placeholder="Scout name"
                      />
                    </Field>

                    <Field label="Current rank">
                      <select
                        value={form.currentRank}
                        onChange={(event) => handleFieldChange('currentRank', event.target.value)}
                        className="w-full rounded-[1.25rem] border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] px-4 py-3 text-slate-900 focus:border-slate-400 focus:outline-none"
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
                        onChange={(event) => handleFieldChange('targetEagleDate', event.target.value)}
                        className="w-full rounded-[1.25rem] border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] px-4 py-3 text-slate-900 focus:border-slate-400 focus:outline-none"
                      />
                    </Field>

                    <Field
                      label="Meetings per month"
                      hint="Leave blank to estimate from events."
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
                        className="w-full rounded-[1.25rem] border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] px-4 py-3 text-slate-900 focus:border-slate-400 focus:outline-none"
                        placeholder="Auto from events"
                      />
                    </Field>
                  </div>
                </section>

                <section className="rounded-[1.45rem] border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <Users className="h-5 w-5 text-slate-700" />
                    <h2 className="text-lg font-semibold text-slate-950">Troop details</h2>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Field label="Troop number">
                      <input
                        type="text"
                        value={form.troopNumber}
                        onChange={(event) => handleFieldChange('troopNumber', event.target.value)}
                        className="w-full rounded-[1.25rem] border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] px-4 py-3 text-slate-900 focus:border-slate-400 focus:outline-none"
                        placeholder="e.g. 412"
                      />
                    </Field>

                    <Field label="Meeting day">
                      <select
                        value={form.meetingDay}
                        onChange={(event) => handleFieldChange('meetingDay', event.target.value)}
                        className="w-full rounded-[1.25rem] border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] px-4 py-3 text-slate-900 focus:border-slate-400 focus:outline-none"
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
                        className="w-full rounded-[1.25rem] border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] px-4 py-3 text-slate-900 focus:border-slate-400 focus:outline-none"
                      />
                    </Field>
                  </div>
                </section>
              </div>

              <section className="rounded-[1.45rem] border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5">
                <div className="mb-4 flex items-center gap-3">
                  <Bell className="h-5 w-5 text-slate-700" />
                  <h2 className="text-lg font-semibold text-slate-950">Notifications</h2>
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
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                      />
                      <div>
                        <div className="text-sm font-semibold text-slate-950">{option.title}</div>
                        <div className="mt-1 text-sm text-slate-600">{option.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </section>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white shadow-[0_8px_16px_rgba(15,23,42,0.2)] hover:shadow-[0_8px_20px_rgba(15,23,42,0.3)] hover:-translate-y-0.5 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save size={18} />
                  {isSaving ? 'Saving...' : 'Save changes'}
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-[1.25rem] border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] px-4 py-2 text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <X size={18} />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 border-t border-slate-200 pt-6 md:grid-cols-2">
              <SummaryRow label="Scout name" value={userData.profile.name || 'Not set'} />
              <SummaryRow
                label="Current rank"
                value={
                  userData.profile.currentRank
                    ? getRankDisplayName(userData.profile.currentRank)
                    : 'Not set'
                }
              />
              <SummaryRow
                label="Target Eagle date"
                value={formatLongDate(userData.profile.targetEagleDate)}
              />
              <SummaryRow
                label="Meetings per month"
                value={getMeetingsPerMonthSummary(userData.profile.meetingsPerMonthOverride)}
              />
              <SummaryRow label="Troop details" value={getTroopSummary(userData.profile)} />
              <SummaryRow
                label="Notifications"
                value={
                  [
                    userData.profile.notificationPreferences?.meetingReminders ? 'Meetings' : null,
                    userData.profile.notificationPreferences?.eventReminders ? 'Events' : null,
                    userData.profile.notificationPreferences?.progressUpdates ? 'Progress' : null,
                  ]
                    .filter(Boolean)
                    .join(', ') || 'None enabled'
                }
              />
            </div>
          )}
        </section>

        <section className="app-surface mb-6 rounded-[1.8rem] p-6">
          <div className="mb-4 flex items-center gap-3">
            <Award className="h-5 w-5 text-slate-700" />
            <h2 className="text-xl font-semibold text-slate-950">Rank progress</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <MiniStat label="Current rank" value={rankInfo.currentRankDisplay} />
            <MiniStat label="Next rank" value={rankInfo.nextRankDisplay} />
            <MiniStat
              label="Target date"
              value={
                userData.profile.targetEagleDate
                  ? new Date(userData.profile.targetEagleDate).toLocaleDateString('en-US', {
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'Not set'
              }
              icon={<CalendarDays className="h-4 w-4 text-slate-500" />}
            />
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
              <span>{rankInfo.completed}/{rankInfo.total} requirements completed</span>
              <span className="font-semibold text-slate-900">{rankInfo.progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-slate-900 transition-all duration-500"
                style={{ width: `${rankInfo.progress}%` }}
              />
            </div>
          </div>
        </section>

        <section className="app-surface rounded-[1.8rem] p-6">
          <div className="mb-4 flex items-center gap-3">
            <Target className="h-5 w-5 text-slate-700" />
            <h2 className="text-xl font-semibold text-slate-950">Eagle-required badges</h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <BadgeCount label="Completed" value={`${completed.length}`} tone="emerald" />
            <BadgeCount label="In progress" value={`${inProgress.length}`} tone="sky" />
            <BadgeCount label="Not started" value={`${notStarted.length}`} tone="slate" />
          </div>

          <div className="mt-6 space-y-4">
            <BadgeStrip title="In progress" badges={inProgress.slice(0, 8)} />
            <BadgeStrip title="Not started" badges={notStarted.slice(0, 8)} />
            <div className="pt-1">
              <Link
                to="/merit-badges/"
                className="inline-flex items-center gap-2 rounded-[1.25rem] border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Open merit badge tracker
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] px-4 py-3">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-[1.25rem] border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] px-4 py-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-2 text-lg font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function BadgeCount({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'emerald' | 'sky' | 'slate';
}) {
  const styles = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    sky: 'border-sky-200 bg-sky-50 text-sky-900',
    slate: 'border-slate-200 bg-slate-50 text-slate-900',
  };

  return (
    <div className={`rounded-xl border px-4 py-3 ${styles[tone]}`}>
      <div className="text-xs font-semibold uppercase tracking-[0.12em]">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function BadgeStrip({
  title,
  badges,
}: {
  title: string;
  badges: Array<{ id: string; name: string; percentage: number }>;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      {badges.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {badges.map((badge) => (
            <Link
              key={badge.id}
              to="/merit-badges/$badgeId"
              params={{ badgeId: badge.id }}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-50"
            >
              <span className="font-medium">{badge.name}</span>
              <span className="text-slate-500">{badge.percentage}%</span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">None right now.</p>
      )}
    </div>
  );
}
