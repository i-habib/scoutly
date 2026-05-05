import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { lazy, Suspense, useEffect } from 'react';
import { ArrowUpRight, CalendarRange, ChevronRight } from 'lucide-react';
import { useUserData } from '../hooks/useUserData';
import { countEagleRequiredCompleted } from '../lib/progress';
import { PageSkeleton } from '../components/SkeletonLoader';
import { RANKS } from '../data/ranks';
import { needsOnboarding } from '../lib/onboarding';
import { RANK_COLORS } from '../lib/constants';
import { getWorkingRankId } from '../lib/scoutFocus';

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
  const hasCurrentRank = Boolean(userData.profile.currentRank);
  const currentRankId = hasCurrentRank ? normalizeRankId(userData.profile.currentRank) : null;
  const currentRankLabel = hasCurrentRank ? getRankLabel(currentRankId) : 'No rank yet';
  const nextRankLabel = hasCurrentRank ? getNextRankLabel(currentRankId) : 'Scout';
  const workingRankId = getWorkingRankId(userData.profile.currentRank);
  const heroAccentClass = RANK_COLORS[workingRankId] || 'bg-stone-300';
  const completedRequired = countEagleRequiredCompleted(userData);
  const upcomingEvents = [...(userData.events || [])]
    .filter((event) => new Date(event.startTime).getTime() >= Date.now())
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 5);
  const nextEvent = upcomingEvents[0] || null;
  const hasCalendarConnection = Boolean(userData.profile.scoutbookCalendarUrl);
  const requiredProfileGaps = [
    !userData.profile.name ? 'Scout name' : null,
  ].filter(Boolean) as string[];

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <section className="relative overflow-hidden bg-white border border-stone-200 shadow-sm mb-6 rounded-2xl p-6 md:p-8">
          <div className={`absolute inset-x-0 top-0 h-1 ${heroAccentClass}`} />
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
            Dashboard
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-900 md:text-4xl">
            {userName}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-500 md:text-base">
            Keep advancement and upcoming troop activity in one clean place.
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-stone-500">
            {nextEvent
              ? `Next up: ${nextEvent.name} on ${formatDateTime(nextEvent.startTime)}${nextEvent.location ? ` • ${nextEvent.location}` : ''}`
              : hasCalendarConnection
                ? 'Your calendar is connected, but there are no upcoming troop events on it right now.'
                : 'Your calendar is not connected yet. Add Scoutbook in Events to keep meetings and campouts here.'}
          </p>

          <div className="mt-8 grid gap-6 border-t border-stone-200 pt-5 sm:grid-cols-3">
            <MetricColumn label="Current rank" value={currentRankLabel} />
            <MetricColumn label="Next rank" value={nextRankLabel} />
            <MetricColumn label="Eagle-required complete" value={`${completedRequired}/21`} />
          </div>

          <div className="mt-6 flex flex-wrap gap-4">
            <Link
              to="/timeline"
              className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-5 py-3 text-sm font-medium text-stone-800 shadow-sm transition-colors hover:bg-stone-50"
            >
              Review timeline
              <ChevronRight className="h-4 w-4" />
            </Link>
            <Link
              to="/events"
              className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white shadow-sm px-5 py-3 text-sm font-medium text-stone-800 transition-colors hover:bg-stone-50"
            >
              {hasCalendarConnection ? 'Open events' : 'Connect calendar'}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {requiredProfileGaps.length > 0 && (
          <section className="mb-6 rounded-2xl border border-stone-200 bg-white px-6 py-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-base font-semibold text-stone-800">Profile setup needed</h2>
                <p className="mt-1 text-sm text-stone-600">
                  Missing: {requiredProfileGaps.join(', ')}.
                </p>
              </div>
              <Link
                to="/profile"
                className="inline-flex items-center justify-center rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-800 transition-colors hover:bg-stone-50"
              >
                Complete profile
              </Link>
            </div>
          </section>
        )}

        <div className="space-y-6">
          <Suspense
            fallback={
              <div className="bg-white border border-stone-200 shadow-sm rounded-2xl p-6">
                <p className="text-sm text-stone-400">Loading rank advancement...</p>
              </div>
            }
          >
            <RankAdvancement userData={userData} />
          </Suspense>

          <section className="bg-white border border-stone-200 shadow-sm rounded-2xl p-8">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                <CalendarRange className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-stone-900">Upcoming events</h2>
                <p className="text-sm text-stone-500">Just the next troop events that matter.</p>
              </div>
            </div>

            {upcomingEvents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-5 py-6 text-sm text-stone-500">
                {hasCalendarConnection
                  ? 'No upcoming troop events are on the calendar yet.'
                  : 'No upcoming events yet. Add events or connect a calendar in the Events section.'}
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingEvents.map((event) => (
                  <EventRow key={event.id} event={event} />
                ))}
              </div>
            )}
          </section>
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

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function MetricColumn({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-stone-200 pl-5 first:border-l-0 first:pl-0">
      <div className="text-xs font-medium uppercase tracking-[0.12em] text-stone-400">{label}</div>
      <div className="mt-2 text-base font-semibold text-stone-800">{value}</div>
    </div>
  );
}

function EventRow({
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
    service: 'border-violet-200 bg-violet-50 text-violet-700',
    other: 'border-stone-200 bg-stone-100 text-stone-700',
  };
  const style = typeStyles[event.type as keyof typeof typeStyles] || typeStyles.other;

  return (
    <Link to="/events" className="block rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition-colors hover:bg-stone-50">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <div className="min-w-[3.75rem] pt-0.5 text-center">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">
              {new Date(event.startTime).toLocaleDateString('en-US', { month: 'short' })}
            </div>
            <div className="mt-1 text-2xl font-semibold text-stone-900">
              {new Date(event.startTime).toLocaleDateString('en-US', { day: 'numeric' })}
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold text-stone-900">{event.name}</p>
            <p className="mt-1 text-sm text-stone-500">{formatDateTime(event.startTime)}</p>
            {event.location ? <p className="mt-1 text-sm text-stone-400">{event.location}</p> : null}
          </div>
        </div>

        <span
          className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${style}`}
        >
          {event.type}
        </span>
      </div>
    </Link>
  );
}
