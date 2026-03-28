import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { lazy, Suspense, useEffect } from 'react';
import { ArrowUpRight, CalendarRange, ChevronRight } from 'lucide-react';
import { useUserData } from '../hooks/useUserData';
import { countEagleRequiredCompleted } from '../lib/progress';
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

  return (
    <div className="app-shell">
      <div className="app-shell__content mx-auto max-w-5xl px-6 py-8">
        <section className="app-surface mb-6 rounded-[1.9rem] p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Dashboard
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
            {userName}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
            Keep advancement and upcoming troop activity in one clean place.
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
            {nextEvent
              ? `Next up: ${nextEvent.name} on ${formatDateTime(nextEvent.startTime)}${nextEvent.location ? ` • ${nextEvent.location}` : ''}`
              : hasCalendarConnection
                ? 'Your calendar is connected, but there are no upcoming troop events on it right now.'
                : 'Your calendar is not connected yet. Add Scoutbook in Events to keep meetings and campouts here.'}
          </p>

          <div className="mt-8 grid gap-4 border-t border-slate-200 pt-5 sm:grid-cols-3">
            <MetricColumn label="Current rank" value={currentRankLabel} />
            <MetricColumn label="Next rank" value={nextRankLabel} />
            <MetricColumn label="Eagle-required complete" value={`${completedRequired}/21`} />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/advancement"
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_16px_rgba(15,23,42,0.2)] hover:shadow-[0_8px_20px_rgba(15,23,42,0.3)] hover:-translate-y-0.5 transition-colors hover:bg-slate-800"
            >
              Review advancement
              <ChevronRight className="h-4 w-4" />
            </Link>
            <Link
              to="/events"
              className="inline-flex items-center gap-2 rounded-[1.45rem] border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-950"
            >
              {hasCalendarConnection ? 'Open events' : 'Connect calendar'}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {requiredProfileGaps.length > 0 && (
          <section className="mb-6 rounded-[1.5rem] border border-amber-200 bg-linear-to-r from-amber-50 to-orange-50 px-5 py-4 shadow-[0_14px_28px_rgba(180,83,9,0.06)]">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-base font-semibold text-amber-900">Profile setup needed</h2>
                <p className="mt-1 text-sm text-amber-800">
                  Missing: {requiredProfileGaps.join(', ')}.
                </p>
              </div>
              <Link
                to="/profile"
                className="inline-flex items-center justify-center rounded-xl bg-amber-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-950"
              >
                Complete profile
              </Link>
            </div>
          </section>
        )}

        <div className="space-y-6">
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
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <CalendarRange className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Upcoming events</h2>
                <p className="text-sm text-slate-600">Just the next troop events that matter.</p>
              </div>
            </div>

            {upcomingEvents.length === 0 ? (
              <div className="rounded-[1.4rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-sm text-slate-600">
                {hasCalendarConnection
                  ? 'No upcoming troop events are on the calendar yet.'
                  : 'No upcoming events yet. Add events or connect a calendar in the Events section.'}
              </div>
            ) : (
              <div className="space-y-3">
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
    <div className="border-l border-slate-200 pl-4 first:border-l-0 first:pl-0">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div className="mt-2 text-base font-semibold text-slate-950">{value}</div>
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
    service: 'border-amber-200 bg-amber-50 text-amber-700',
    other: 'border-slate-200 bg-slate-100 text-slate-700',
  };
  const style = typeStyles[event.type as keyof typeof typeStyles] || typeStyles.other;

  return (
    <div className="rounded-[1.35rem] border border-slate-200 bg-white px-4 py-4 shadow-[0_8px_20px_rgba(24,35,47,0.04)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <div className="min-w-[3.75rem] pt-0.5 text-center">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              {new Date(event.startTime).toLocaleDateString('en-US', { month: 'short' })}
            </div>
            <div className="mt-1 text-2xl font-semibold text-slate-950">
              {new Date(event.startTime).toLocaleDateString('en-US', { day: 'numeric' })}
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold text-slate-950">{event.name}</p>
            <p className="mt-1 text-sm text-slate-600">{formatDateTime(event.startTime)}</p>
            {event.location ? <p className="mt-1 text-sm text-slate-500">{event.location}</p> : null}
          </div>
        </div>

        <span
          className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${style}`}
        >
          {event.type}
        </span>
      </div>
    </div>
  );
}
