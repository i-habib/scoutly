import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowUpRight, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { MeritBadgeIcon } from '../../components/ScoutIcons';
import meritBadgesData from '../../data/merit-badges.json';
import { useUserData } from '../../hooks/useUserData';
import { getRankDisplayName } from '../../lib/constants';
import { computeBadgeProgressByMeta } from '../../lib/progress';
import {
  getMeritBadgeFocusSummary,
  getMeritBadgePaceSummary,
  getUserFocusTrack,
  getWorkingRankId,
} from '../../lib/scoutFocus';

export const Route = createFileRoute('/merit-badges/')({
  component: MeritBadgesList,
});

type FilterType = 'all' | 'eagle' | 'started' | 'completed';

function MeritBadgesList() {
  const { userData } = useUserData();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');

  const focusTrack = userData ? getUserFocusTrack(userData) : 'signoffs';
  const workingRankId = userData ? getWorkingRankId(userData.profile.currentRank) : 'rank_scout';
  const workingRankLabel = getRankDisplayName(workingRankId);
  const badgeFocus = userData
    ? getMeritBadgeFocusSummary(userData)
    : {
        completedRequiredCount: 0,
        inProgressCount: 0,
        notStartedCount: meritBadgesData.meritBadges.filter((badge) => badge.eagleRequired).length,
        remainingRequirements: 0,
        recommended: [],
      };

  const badgeCards = useMemo(() => {
    return meritBadgesData.meritBadges.map((badge) => {
      const { total, completed, percent } = computeBadgeProgressByMeta(
        badge,
        userData?.progress?.[badge.id],
      );

      return {
        ...badge,
        totalCount: total,
        completedCount: completed,
        percentage: percent,
        isStarted: completed > 0 && completed < total,
        isCompleted: total > 0 && completed === total,
      };
    });
  }, [userData]);

  const filteredBadges = useMemo(() => {
    return badgeCards.filter((badge) => {
      const matchesSearch = badge.name.toLowerCase().includes(searchQuery.toLowerCase());

      let matchesFilter = true;
      if (filterType === 'eagle') matchesFilter = badge.eagleRequired;
      if (filterType === 'started') matchesFilter = badge.isStarted;
      if (filterType === 'completed') matchesFilter = badge.isCompleted;

      return matchesSearch && matchesFilter;
    });
  }, [badgeCards, filterType, searchQuery]);

  const planningCopy =
    focusTrack === 'meritBadges'
      ? `Merit badges are a primary push during ${workingRankLabel}.`
      : `${workingRankLabel} is signoff-heavy right now, so badges should support that pace.`;

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <section className="mb-6 rounded-2xl bg-white border border-stone-200 shadow-sm p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
            Merit badges
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-900">
            Merit Badge Tracker
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-500 md:text-base">
            {planningCopy} Keep the list practical and focused on what should move next.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-500">
            {userData
              ? getMeritBadgePaceSummary(userData)
              : 'Add profile details to get a better pace read on Eagle-required badges.'}
          </p>

          <div className="mt-8 grid gap-4 border-t border-stone-200 pt-5 sm:grid-cols-3">
            <MetricColumn label="Working rank" value={workingRankLabel} />
            <MetricColumn
              label="Eagle-required complete"
              value={`${badgeFocus.completedRequiredCount}/21`}
            />
            <MetricColumn label="In progress" value={`${badgeFocus.inProgressCount}`} />
          </div>
        </section>

        <section className="mb-6 rounded-2xl bg-white border border-stone-200 shadow-sm p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-stone-900">Browse badges</h2>
              <p className="mt-1 text-sm text-stone-500">
                Search and filter to the badges that actually need attention.
              </p>
            </div>
            <div className="text-sm font-semibold text-stone-500">{filteredBadges.length} showing</div>
          </div>

          <div className="mt-5 flex flex-col gap-4 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search merit badges"
                className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 pl-10 text-stone-900 placeholder-stone-400 transition-colors focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-stone-400"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <FilterButton label="All" active={filterType === 'all'} onClick={() => setFilterType('all')} />
              <FilterButton label="Eagle" active={filterType === 'eagle'} onClick={() => setFilterType('eagle')} />
              <FilterButton label="Started" active={filterType === 'started'} onClick={() => setFilterType('started')} />
              <FilterButton label="Completed" active={filterType === 'completed'} onClick={() => setFilterType('completed')} />
            </div>
          </div>
        </section>

        {filteredBadges.length === 0 ? (
          <section className="rounded-2xl bg-white border border-stone-200 shadow-sm px-6 py-12 text-center">
            <MeritBadgeIcon className="mx-auto mb-4 h-14 w-14 text-stone-300" size={56} />
            <p className="text-lg font-semibold text-stone-900">No merit badges found</p>
            <p className="mt-2 text-sm text-stone-500">
              Try changing search text or filters.
            </p>
          </section>
        ) : (
          <div className="space-y-3">
            {filteredBadges.map((badge) => (
              <BadgeRow key={badge.id} badge={badge} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={
        active
          ? 'rounded-xl bg-stone-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-700'
          : 'rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-800 hover:bg-stone-50'
      }
    >
      {label}
    </button>
  );
}

function MetricColumn({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-stone-200 pl-4 first:border-l-0 first:pl-0">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">{label}</div>
      <div className="mt-2 text-base font-semibold text-stone-900">{value}</div>
    </div>
  );
}

function BadgeRow({
  badge,
}: {
  badge: (typeof meritBadgesData.meritBadges)[number] & {
    totalCount: number;
    completedCount: number;
    percentage: number;
    isStarted: boolean;
    isCompleted: boolean;
  };
}) {
  const statusLabel = badge.isCompleted
    ? 'Completed'
    : badge.isStarted
      ? 'In progress'
      : 'Not started';
  const statusClassName = badge.isCompleted
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : badge.isStarted
      ? 'bg-stone-100 text-stone-600 border-stone-200'
      : 'bg-stone-100 text-stone-600 border-stone-200';

  return (
    <Link
      to="/merit-badges/$badgeId"
      params={{ badgeId: badge.id }}
      className="block rounded-2xl bg-white border border-stone-200 shadow-sm px-5 py-5 transition-colors hover:border-stone-300"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-stone-200 bg-white">
            {'imageUrl' in badge && badge.imageUrl ? (
              <img
                src={badge.imageUrl as string}
                alt={badge.name}
                className="h-full w-full object-cover"
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                  event.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <MeritBadgeIcon className="hidden h-7 w-7 text-stone-500" size={28} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-stone-900">{badge.name}</h3>
              {badge.eagleRequired ? (
                <span className="inline-flex items-center rounded-full border border-stone-200 bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700">
                  Eagle required
                </span>
              ) : null}
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClassName}`}
              >
                {statusLabel}
              </span>
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-stone-500">
                {badge.completedCount} of {badge.totalCount} requirements complete
              </div>
              <div className="text-sm font-semibold text-stone-600">{badge.percentage}%</div>
            </div>

            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full bg-stone-800 transition-all duration-500"
                style={{ width: `${badge.percentage}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm font-semibold text-stone-600 hover:text-stone-800">
          Open badge
          <ArrowUpRight className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}
