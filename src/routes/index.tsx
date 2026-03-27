import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { lazy, Suspense, useEffect } from 'react';
import {
  ArrowUpRight,
  Award,
  CalendarRange,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Link2,
  Sparkles,
  ShieldCheck,
  Target,
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
  const nextEvent = upcomingEvents[0] || null;
  const hasCalendarConnection = Boolean(userData.profile.scoutbookCalendarUrl);

  const requiredProfileGaps = [
    !userData.profile.name ? 'Scout name' : null,
    !userData.profile.currentRank ? 'Current rank' : null,
  ].filter(Boolean) as string[];
  const profileSignals = [
    Boolean(userData.profile.name),
    Boolean(userData.profile.currentRank),
    Boolean(userData.profile.targetEagleDate),
    Boolean(userData.profile.troopInfo?.troopNumber),
    hasCalendarConnection,
  ];
  const profileReadiness = profileSignals.filter(Boolean).length;

  return (
    <div className="app-shell">
      <div className="app-shell__grid fixed inset-0" />
      <div className="app-shell__glow app-shell__glow--top fixed" />
      <div className="app-shell__glow app-shell__glow--bottom fixed" />

      <div className="app-shell__content mx-auto max-w-7xl px-6 py-8">
        <section className="app-surface relative mb-6 overflow-hidden rounded-[2rem] p-6 md:p-8">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-16 top-0 h-48 w-48 rounded-full bg-emerald-200/30 blur-3xl" />
            <div className="absolute right-0 top-10 h-56 w-56 rounded-full bg-sky-200/30 blur-3xl" />
            <div className="absolute inset-y-0 right-[34%] w-px bg-linear-to-b from-transparent via-slate-200/70 to-transparent" />
          </div>

          <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.9fr)]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                Scout dashboard
              </div>

              <div className="mt-5 flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.4rem] border border-white/60 bg-linear-to-br from-[#285746] via-[#1f3448] to-[#12212f] text-white shadow-[0_18px_40px_rgba(18,33,47,0.24)] ring-1 ring-slate-200/70">
                  <ScoutFleurDeLis className="h-8 w-8" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-500">Scouting workspace</p>
                  <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
                    {userName}
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
                    Keep advancement, merit badges, and troop plans aligned in one clean place,
                    with the next best move always close by.
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <HeroPill label="Current rank" value={currentRankLabel} />
                <HeroPill label="Next rank" value={nextRankLabel} />
                <HeroPill label="Target date" value={targetDateLabel} />
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <SummaryTile
                  label="Profile readiness"
                  value={`${profileReadiness}/5`}
                  detail="Core planning signals connected"
                />
                <SummaryTile
                  label="Next troop event"
                  value={nextEvent ? formatShortDate(nextEvent.startTime) : 'None yet'}
                  detail={nextEvent ? nextEvent.name : 'Connect or add events to populate'}
                />
                <SummaryTile
                  label="Calendar status"
                  value={hasCalendarConnection ? 'Connected' : 'Needs setup'}
                  detail={
                    hasCalendarConnection
                      ? 'Scoutbook link is attached to this account'
                      : 'Add a Scoutbook link for smarter planning'
                  }
                />
              </div>
            </div>

            <div className="rounded-[1.8rem] border border-white/70 bg-white/85 p-5 shadow-[0_20px_40px_rgba(24,35,47,0.08)] backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-[0_10px_18px_rgba(24,35,47,0.18)]">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-950">Focus now</p>
                  <p className="text-sm text-slate-500">Best next step based on your current data.</p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-linear-to-br from-slate-50 to-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {nextEvent ? 'Upcoming event' : 'Calendar'}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-950">
                      {nextEvent ? nextEvent.name : hasCalendarConnection ? 'Ready to sync' : 'Connect Scoutbook'}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                    {hasCalendarConnection ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Link2 className="h-3.5 w-3.5 text-sky-600" />}
                    {hasCalendarConnection ? 'Attached' : 'Open setup'}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {nextEvent
                    ? `${formatDateTime(nextEvent.startTime)}${nextEvent.location ? ` • ${nextEvent.location}` : ''}`
                    : hasCalendarConnection
                      ? 'Your calendar link is saved. Open Events to refresh and manage imported troop dates.'
                      : 'Attach a Scoutbook calendar to pull meetings, campouts, and service events into your plan.'}
                </p>
              </div>

              <div className="mt-4 grid gap-3">
                <Link
                  to={hasCalendarConnection ? '/events' : '/events'}
                  className="inline-flex items-center justify-between rounded-2xl bg-linear-to-r from-sky-600 via-cyan-500 to-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(14,165,233,0.22)] transition-all hover:-translate-y-0.5 hover:brightness-105"
                >
                  {hasCalendarConnection ? 'Open event sync' : 'Connect calendar'}
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/advancement"
                  className="inline-flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-950"
                >
                  Review advancement
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {requiredProfileGaps.length > 0 && (
          <section className="mb-6 rounded-[1.6rem] border border-amber-200 bg-linear-to-r from-amber-50 to-orange-50 px-5 py-4 shadow-[0_14px_28px_rgba(180,83,9,0.06)]">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-base font-semibold text-amber-900">Profile setup needed</h2>
                <p className="mt-1 text-sm text-amber-800">
                  Missing: {requiredProfileGaps.join(', ')}.
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
            tone="emerald"
          />
          <StatCard
            icon={<ShieldCheck className="h-5 w-5" />}
            label="Not started"
            value={`${stats.notStarted.length}`}
            detail="Eagle-required badges not yet started"
            tone="slate"
          />
          <StatCard
            icon={<CalendarRange className="h-5 w-5" />}
            label="Upcoming events"
            value={`${upcomingEvents.length}`}
            detail="Next troop items on the calendar"
            tone="sky"
          />
          <StatCard
            icon={<Clock3 className="h-5 w-5" />}
            label="Days to goal"
            value={daysToGoal}
            detail="Based on your target Eagle date"
            tone="amber"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-3">
            <Suspense
              fallback={
                <div className="app-surface rounded-[1.8rem] p-6">
                  <p className="text-sm text-slate-500">Loading rank advancement...</p>
                </div>
              }
            >
              <RankAdvancement userData={userData} />
            </Suspense>

            <section className="app-surface rounded-[1.8rem] p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-sky-600 to-cyan-500 text-white shadow-[0_12px_24px_rgba(14,165,233,0.22)]">
                  <CalendarRange className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">Upcoming events</h2>
                  <p className="text-sm text-slate-600">Next scheduled items from your troop calendar.</p>
                </div>
              </div>

              {upcomingEvents.length === 0 ? (
                <div className="rounded-[1.4rem] border border-dashed border-slate-300 bg-linear-to-br from-slate-50 to-white px-5 py-6 text-sm text-slate-600">
                  No upcoming events yet. Add events or connect a calendar in the Events section.
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="space-y-6 lg:col-span-2">
            <section className="app-surface rounded-[1.8rem] p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-[#285746] to-[#1f3448] text-white shadow-[0_12px_24px_rgba(31,52,72,0.18)]">
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
                className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:-translate-y-0.5 hover:bg-slate-100"
              >
                Manage profile settings
                <ChevronRight className="h-4 w-4" />
              </Link>
            </section>

            <section className="app-surface rounded-[1.8rem] p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-600 to-emerald-500 text-white shadow-[0_12px_24px_rgba(16,185,129,0.2)]">
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

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
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
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[1.35rem] border border-white/80 bg-white/80 px-4 py-4 shadow-[0_14px_30px_rgba(24,35,47,0.06)] backdrop-blur">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div className="mt-2 text-lg font-semibold text-slate-950">{value}</div>
      <div className="mt-1 text-sm leading-6 text-slate-600">{detail}</div>
    </div>
  );
}

function HeroPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-3 py-2 text-sm text-slate-700 shadow-sm">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <span className="font-semibold text-slate-950">{value}</span>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  tone: 'emerald' | 'sky' | 'slate' | 'amber';
}) {
  const styles = {
    emerald: {
      shell: 'from-emerald-50 via-white to-white',
      icon: 'bg-emerald-600 text-white shadow-[0_12px_24px_rgba(16,185,129,0.22)]',
    },
    sky: {
      shell: 'from-sky-50 via-white to-white',
      icon: 'bg-sky-600 text-white shadow-[0_12px_24px_rgba(14,165,233,0.22)]',
    },
    slate: {
      shell: 'from-slate-100 via-white to-white',
      icon: 'bg-slate-900 text-white shadow-[0_12px_24px_rgba(24,35,47,0.18)]',
    },
    amber: {
      shell: 'from-amber-50 via-white to-white',
      icon: 'bg-amber-600 text-white shadow-[0_12px_24px_rgba(217,119,6,0.18)]',
    },
  };

  return (
    <div className={`app-surface rounded-[1.5rem] bg-linear-to-br p-5 ${styles[tone].shell}`}>
      <div className="mb-4 flex items-center justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${styles[tone].icon}`}>
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
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
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

function EventCard({
  event,
}: {
  event: {
    id: string;
    name: string;
    startTime: string;
    location?: string;
    type: string;
  };
}) {
  const typeStyles = {
    meeting: 'border-sky-200 bg-sky-50 text-sky-700',
    campout: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    service: 'border-amber-200 bg-amber-50 text-amber-700',
    other: 'border-slate-200 bg-slate-100 text-slate-700',
  };

  const style = typeStyles[event.type as keyof typeof typeStyles] || typeStyles.other;

  return (
    <div className="flex flex-col gap-4 rounded-[1.45rem] border border-slate-200 bg-white px-4 py-4 shadow-[0_10px_24px_rgba(24,35,47,0.04)] md:flex-row md:items-center md:justify-between">
      <div className="flex items-start gap-4">
        <div className="min-w-[4.5rem] rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            {new Date(event.startTime).toLocaleDateString('en-US', { month: 'short' })}
          </div>
          <div className="mt-1 text-2xl font-semibold text-slate-950">
            {new Date(event.startTime).toLocaleDateString('en-US', { day: 'numeric' })}
          </div>
        </div>
        <div>
          <p className="text-base font-semibold text-slate-950">{event.name}</p>
          <p className="mt-1 text-sm text-slate-600">{formatDateTime(event.startTime)}</p>
          {event.location ? <p className="mt-1 text-sm text-slate-500">{event.location}</p> : null}
        </div>
      </div>
      <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${style}`}>
        {event.type}
      </span>
    </div>
  );
}
