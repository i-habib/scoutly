import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { lazy, Suspense, useEffect } from 'react';
import {
  Award,
  CalendarRange,
  ChevronRight,
  Clock3,
  LayoutDashboard,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useUserData } from '../hooks/useUserData';
import { countEagleRequiredCompleted, splitEagleRequiredByStatus } from '../lib/progress';
import { ScoutFleurDeLis } from '../components/ScoutIcons';
import { PageSkeleton } from '../components/SkeletonLoader';
import { RANKS } from '../data/ranks';
import { needsOnboarding } from '../lib/onboarding';

const RankAdvancement = lazy(() =>
  import('../components/RankAdvancement').then((module) => ({
    default: module.RankAdvancement,
  })),
);

export const Route = createFileRoute('/')({ component: Dashboard });

function Dashboard() {
  const { userData, isLoading } = useUserData();
  const navigate = useNavigate();

  const onboardingRequired = needsOnboarding(userData);

  useEffect(() => {
    if (!isLoading && userData && onboardingRequired) {
      navigate({ to: '/onboarding', replace: true });
    }
  }, [isLoading, navigate, onboardingRequired, userData]);

  if (isLoading || !userData || onboardingRequired) {
    return <PageSkeleton />;
  }

  const userName = userData.profile.name || 'Scout';
  const currentRankId = normalizeRankId(userData.profile.currentRank);
  const currentRankLabel = getRankLabel(currentRankId);
  const nextRankLabel = getNextRankLabel(currentRankId);
  const targetDateLabel = formatDate(userData.profile.targetEagleDate);
  const daysToGoal = getDaysToGoal(userData.profile.targetEagleDate);
  const stats = splitEagleRequiredByStatus(userData);
  const completedRequired = countEagleRequiredCompleted(userData);
  const upcomingEvents = [...(userData.events || [])]
    .filter((event) => new Date(event.startTime).getTime() >= Date.now())
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 5);

  const missingSetupItems = [
    !userData.profile.name ? 'Scout name' : null,
    !userData.profile.currentRank ? 'Current rank' : null,
    !userData.profile.targetEagleDate ? 'Target Eagle date' : null,
  ].filter(Boolean) as string[];

  const recommendedActions = [
    {
      title: upcomingEvents.length === 0 ? 'Upload troop calendar' : 'Review troop calendar',
      description:
        upcomingEvents.length === 0
          ? 'Import an ICS calendar first so Scoutly can prioritize meetings, campouts, and service opportunities.'
          : 'Keep your upcoming meetings, campouts, and service events current for better recommendations.',
      to: '/events',
    },
    {
      title: 'Review advancement progress',
      description: 'Check rank requirements and mark completed sign-offs.',
      to: '/advancement',
    },
    {
      title: stats.inProgress.length === 0 ? 'Start an Eagle-required merit badge' : 'Continue merit badge progress',
      description:
        stats.inProgress.length === 0
          ? 'Choose a badge and begin logging requirement work.'
          : 'Update in-progress badges to keep momentum between meetings.',
      to: '/merit-badges/',
    },
    !userData.profile.meetingsPerMonthOverride && upcomingEvents.length === 0
          ? {
              title: 'Set meeting cadence',
              description: 'Add meetings per month in your profile until your troop calendar is loaded.',
              to: '/profile',
            }
      : null,
    missingSetupItems.length > 0
      ? {
          title: 'Finish profile setup',
          description: 'Add your name, current rank, and Eagle target date.',
          to: '/profile',
        }
      : null,
  ].filter(Boolean) as Array<{ title: string; description: string; to: string }>;

  return (
    <div className="app-shell">
      <div className="app-shell__grid fixed inset-0" />
      <div className="app-shell__glow app-shell__glow--top fixed" />
      <div className="app-shell__glow app-shell__glow--bottom fixed" />

      <div className="app-shell__content mx-auto max-w-7xl px-6 py-8">
        <section className="app-surface mb-6 rounded-2xl p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1f3448] text-white">
                  <ScoutFleurDeLis className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Dashboard</p>
                  <p className="text-sm text-slate-500">Scouting workspace</p>
                </div>
              </div>
              <h1 className="text-3xl font-semibold text-slate-950">{userName}</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Use this dashboard to manage profile setup, badge progress, events, and rank advancement from one place.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[30rem]">
              <SummaryTile label="Current rank" value={currentRankLabel} />
              <SummaryTile label="Next rank" value={nextRankLabel} />
              <SummaryTile label="Target date" value={targetDateLabel} />
            </div>
          </div>
        </section>

        {missingSetupItems.length > 0 && (
          <section className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-base font-semibold text-amber-900">Profile setup needed</h2>
                <p className="mt-1 text-sm text-amber-800">
                  Missing: {missingSetupItems.join(', ')}.
                </p>
              </div>
              <Link
                to="/profile"
                className="inline-flex items-center justify-center rounded-lg bg-amber-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-950"
              >
                Complete profile
              </Link>
            </div>
          </section>
        )}

        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={<Award className="h-5 w-5" />}
            label="Eagle-required complete"
            value={`${completedRequired}/21`}
            detail={`${stats.inProgress.length} in progress`}
          />
          <StatCard
            icon={<ShieldCheck className="h-5 w-5" />}
            label="Not started"
            value={`${stats.notStarted.length}`}
            detail="Eagle-required badges not yet started"
          />
          <StatCard
            icon={<CalendarRange className="h-5 w-5" />}
            label="Upcoming events"
            value={`${upcomingEvents.length}`}
            detail="Next troop items on the calendar"
          />
          <StatCard
            icon={<Clock3 className="h-5 w-5" />}
            label="Days to goal"
            value={daysToGoal}
            detail="Based on your target Eagle date"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-3">
            <section className="app-surface rounded-2xl p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  <LayoutDashboard className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">Action center</h2>
                  <p className="text-sm text-slate-600">Recommended next steps based on your current data.</p>
                </div>
              </div>

              <div className="space-y-3">
                {recommendedActions.map((action) => (
                  <Link
                    key={`${action.to}-${action.title}`}
                    to={action.to}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 transition-colors hover:border-slate-300 hover:bg-slate-50"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{action.title}</p>
                      <p className="text-sm text-slate-600">{action.description}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </Link>
                ))}
              </div>
            </section>

            <section className="app-surface rounded-2xl p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  <CalendarRange className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">Upcoming events</h2>
                  <p className="text-sm text-slate-600">Next scheduled items from your troop calendar.</p>
                </div>
              </div>

              {upcomingEvents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                  No upcoming events yet. Add events or import an ICS calendar in the Events section.
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{event.name}</p>
                        <p className="text-sm text-slate-600">
                          {formatDateTime(event.startTime)}
                          {event.location ? ` • ${event.location}` : ''}
                        </p>
                      </div>
                      <span className="inline-flex w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">
                        {event.type}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="space-y-6 lg:col-span-2">
            <section className="app-surface rounded-2xl p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  <UserRound className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">Account summary</h2>
                  <p className="text-sm text-slate-600">Key profile information used across the app.</p>
                </div>
              </div>

              <div className="space-y-3">
                <DetailRow label="Scout name" value={userData.profile.name || 'Not set'} />
                <DetailRow label="Current rank" value={currentRankLabel} />
                <DetailRow label="Target Eagle date" value={targetDateLabel} />
                <DetailRow
                  label="Meetings per month"
                  value={
                    userData.profile.meetingsPerMonthOverride
                      ? String(userData.profile.meetingsPerMonthOverride)
                      : upcomingEvents.length > 0
                        ? 'Auto from calendar'
                        : 'Set in profile'
                  }
                />
                <DetailRow
                  label="Troop details"
                  value={
                    userData.profile.troopInfo?.troopNumber
                      ? `Troop ${userData.profile.troopInfo.troopNumber}`
                      : 'Not set'
                  }
                />
              </div>

              <Link
                to="/profile"
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
              >
                Manage profile settings
                <ChevronRight className="h-4 w-4" />
              </Link>
            </section>

            <section className="app-surface rounded-2xl p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">Badge status</h2>
                  <p className="text-sm text-slate-600">Eagle-required merit badge progress at a glance.</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <StatusCard label="Completed" value={`${stats.completed.length}`} tone="emerald" />
                <StatusCard label="In progress" value={`${stats.inProgress.length}`} tone="sky" />
                <StatusCard label="Not started" value={`${stats.notStarted.length}`} tone="slate" />
              </div>
            </section>

            <Suspense
              fallback={
                <div className="app-surface rounded-2xl p-6">
                  <p className="text-sm text-slate-500">Loading rank advancement...</p>
                </div>
              }
            >
              <RankAdvancement userData={userData} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}

function normalizeRankId(rank: string | null) {
  if (!rank) return 'scout';

  const normalized = rank
    .trim()
    .toLowerCase()
    .replace(/^rank_/, '')
    .replace(/\s+/g, '_');

  return RANKS.some((candidate) => candidate.id === normalized) ? normalized : 'scout';
}

function getRankLabel(rankId: string) {
  const normalizedRankId = normalizeRankId(rankId);
  return RANKS.find((rank) => rank.id === normalizedRankId)?.name || 'Scout';
}

function getNextRankLabel(rankId: string) {
  const normalizedRankId = normalizeRankId(rankId);
  const rankIndex = RANKS.findIndex((rank) => rank.id === normalizedRankId);
  if (rankIndex < 0 || rankIndex >= RANKS.length - 1) return 'Complete';
  return RANKS[rankIndex + 1]?.name || 'Complete';
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not set';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getDaysToGoal(value: string | null | undefined) {
  if (!value) return 'Not set';

  const targetDate = new Date(value);
  const today = new Date();
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? String(diffDays) : 'Past';
}

function SummaryTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div className="mt-1 text-base font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="app-surface rounded-xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
          {icon}
        </div>
        <div className="text-3xl font-semibold text-slate-950">{value}</div>
      </div>
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm text-slate-600">{detail}</div>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-sm font-semibold text-slate-950 text-right">{value}</span>
    </div>
  );
}

function StatusCard({
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
