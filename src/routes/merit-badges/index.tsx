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
  const workingRankId = userData ? getWorkingRankId(userData.profile.currentRank) : 'rank_tenderfoot';
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
    <div className="app-shell">
      <div className="app-shell__content mx-auto max-w-5xl px-6 py-8">
        <section className="app-surface mb-6 rounded-[1.9rem] p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Merit badges
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
            Merit Badge Tracker
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
            {planningCopy} Keep the list practical and focused on what should move next.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            {userData
              ? getMeritBadgePaceSummary(userData)
              : 'Add profile details to get a better pace read on Eagle-required badges.'}
          </p>

          <div className="mt-8 grid gap-4 border-t border-slate-200 pt-5 sm:grid-cols-3">
            <MetricColumn label="Working rank" value={workingRankLabel} />
            <MetricColumn
              label="Eagle-required complete"
              value={`${badgeFocus.completedRequiredCount}/21`}
            />
            <MetricColumn label="In progress" value={`${badgeFocus.inProgressCount}`} />
          </div>
        </section>

        <section className="app-surface mb-6 rounded-[1.8rem] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Browse badges</h2>
              <p className="mt-1 text-sm text-slate-600">
                Search and filter to the badges that actually need attention.
              </p>
            </div>
            <div className="text-sm font-semibold text-slate-600">{filteredBadges.length} showing</div>
          </div>

          <div className="mt-5 flex flex-col gap-4 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search merit badges"
                className="w-full rounded-[1.45rem] border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] py-3 pl-10 pr-4 text-slate-900 placeholder-slate-400 transition-colors focus:border-slate-400 focus:outline-none"
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
          <section className="app-surface rounded-[1.8rem] px-6 py-12 text-center">
            <MeritBadgeIcon className="mx-auto mb-4 h-14 w-14 text-slate-300" size={56} />
            <p className="text-lg font-semibold text-slate-900">No merit badges found</p>
            <p className="mt-2 text-sm text-slate-500">
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
      className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
        active
          ? 'border-slate-900 bg-slate-900 text-white shadow-[0_8px_16px_rgba(15,23,42,0.2)] hover:shadow-[0_8px_20px_rgba(15,23,42,0.3)] hover:-translate-y-0.5'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
      }`}
    >
      {label}
    </button>
  );
}

function MetricColumn({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-slate-200 pl-4 first:border-l-0 first:pl-0">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div className="mt-2 text-base font-semibold text-slate-950">{value}</div>
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
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : badge.isStarted
      ? 'border-sky-200 bg-sky-50 text-sky-700'
      : 'border-slate-200 bg-slate-50 text-slate-600';

  return (
    <Link
      to="/merit-badges/$badgeId"
      params={{ badgeId: badge.id }}
      className="app-surface block rounded-[1.5rem] px-5 py-5 transition-colors hover:border-slate-300"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[1.45rem] border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
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
            <MeritBadgeIcon className="hidden h-7 w-7 text-emerald-600" size={28} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-slate-950">{badge.name}</h3>
              {badge.eagleRequired ? (
                <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
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
              <div className="text-sm text-slate-600">
                {badge.completedCount} of {badge.totalCount} requirements complete
              </div>
              <div className="text-sm font-semibold text-slate-700">{badge.percentage}%</div>
            </div>

            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-slate-900 transition-all duration-500"
                style={{ width: `${badge.percentage}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          Open badge
          <ArrowUpRight className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}
