import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowUpRight, Search, ShieldCheck, Sparkles, Target } from 'lucide-react';
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

  const eagleRequiredCount = meritBadgesData.meritBadges.filter((badge) => badge.eagleRequired).length;
  const primaryQuestion =
    focusTrack === 'meritBadges'
      ? 'Which Eagle-required badges should move next?'
      : 'Which merit badges should stay in motion while signoffs lead?';
  const planningCopy =
    focusTrack === 'meritBadges'
      ? `For ${workingRankLabel}, merit badges are the main advancement engine.`
      : `${workingRankLabel} is still a signoff-heavy phase, so keep badges organized without letting them distract from rank requirements.`;

  return (
    <div className="app-shell">
      <div className="app-shell__grid fixed inset-0" />
      <div className="app-shell__glow app-shell__glow--top fixed" />
      <div className="app-shell__glow app-shell__glow--bottom fixed" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-8">
        <section className="app-surface mb-8 overflow-hidden rounded-[2rem] p-6 md:p-8">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-16 top-0 h-48 w-48 rounded-full bg-emerald-200/30 blur-3xl" />
            <div className="absolute right-0 top-10 h-56 w-56 rounded-full bg-sky-200/30 blur-3xl" />
          </div>

          <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                Merit badge planner
              </div>

              <div className="mt-5 flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.4rem] bg-linear-to-br from-emerald-500 via-sky-600 to-[#1f3448] text-white shadow-[0_18px_40px_rgba(18,33,47,0.2)]">
                  <MeritBadgeIcon className="h-8 w-8" size={32} />
                </div>
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
                    Merit Badges
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
                    {primaryQuestion} Scoutly keeps the Eagle-required badge picture visible so
                    you can decide what to push, what to park, and what to start next.
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <HeroPill label="Working rank" value={workingRankLabel} />
                <HeroPill
                  label="Eagle-required complete"
                  value={`${badgeFocus.completedRequiredCount}/21`}
                />
                <HeroPill label="In progress" value={`${badgeFocus.inProgressCount}`} />
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <SummaryTile
                  label="Eagle-required badges"
                  value={`${eagleRequiredCount}`}
                  detail="Required toward Eagle Scout"
                />
                <SummaryTile
                  label="Not started"
                  value={`${badgeFocus.notStartedCount}`}
                  detail="Still untouched in the Eagle-required set"
                />
                <SummaryTile
                  label="Remaining requirements"
                  value={`${badgeFocus.remainingRequirements}`}
                  detail="Across all Eagle-required badges"
                />
              </div>
            </div>

            <div className="rounded-[1.8rem] border border-white/70 bg-white/85 p-5 shadow-[0_20px_40px_rgba(24,35,47,0.08)] backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-[0_10px_18px_rgba(24,35,47,0.18)]">
                  {focusTrack === 'meritBadges' ? (
                    <ShieldCheck className="h-5 w-5" />
                  ) : (
                    <Target className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-950">Planning lens</p>
                  <p className="text-sm text-slate-500">{planningCopy}</p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-linear-to-br from-slate-50 to-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Pace check
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {userData
                    ? getMeritBadgePaceSummary(userData)
                    : 'Add profile data to estimate how quickly Eagle-required badges need to move.'}
                </p>
              </div>

              <div className="mt-4 space-y-3">
                {badgeFocus.recommended.length > 0 ? (
                  badgeFocus.recommended.map((badge) => (
                    <Link
                      key={badge.id}
                      to="/merit-badges/$badgeId"
                      params={{ badgeId: badge.id }}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-slate-300"
                    >
                      <div>
                        <p className="text-base font-semibold text-slate-950">{badge.name}</p>
                        <p className="mt-1 text-sm text-slate-600">
                          {badge.state === 'inProgress'
                            ? `Already moving at ${badge.percentage}%. Keep this one warm.`
                            : 'Clean next start if you want another Eagle-required badge in motion.'}
                        </p>
                      </div>
                      <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-700">
                        {badge.state === 'inProgress' ? `${badge.percentage}%` : 'Start'}
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                    No badge momentum yet. Start with one Eagle-required badge so Scoutly has something real to pace.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="app-surface mb-8 rounded-[1.8rem] p-6">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Find the right badge to move</h2>
              <p className="mt-1 text-sm text-slate-600">
                Use search and filters to tighten the list down to the badges that matter right now.
              </p>
            </div>
            <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-700">
              {filteredBadges.length} showing
            </div>
          </div>

          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search merit badges..."
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pr-4 pl-10 text-slate-900 placeholder-slate-400 transition-all focus:border-transparent focus:outline-none focus:ring-4 focus:ring-emerald-100"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <FilterButton
                label="All"
                active={filterType === 'all'}
                onClick={() => setFilterType('all')}
                activeClassName="bg-slate-900 text-white"
              />
              <FilterButton
                label="Eagle"
                active={filterType === 'eagle'}
                onClick={() => setFilterType('eagle')}
                activeClassName="bg-amber-500 text-white"
              />
              <FilterButton
                label="Started"
                active={filterType === 'started'}
                onClick={() => setFilterType('started')}
                activeClassName="bg-sky-600 text-white"
              />
              <FilterButton
                label="Completed"
                active={filterType === 'completed'}
                onClick={() => setFilterType('completed')}
                activeClassName="bg-emerald-600 text-white"
              />
            </div>
          </div>
        </section>

        {filteredBadges.length === 0 ? (
          <div className="app-surface rounded-[1.8rem] px-6 py-12 text-center">
            <MeritBadgeIcon className="mx-auto mb-4 h-16 w-16 text-slate-300" size={64} />
            <p className="text-lg font-semibold text-slate-900">No merit badges found</p>
            <p className="mt-2 text-sm text-slate-500">
              Try adjusting your search or filters to bring badges back into view.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredBadges.map((badge) => {
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
                  key={badge.id}
                  to="/merit-badges/$badgeId"
                  params={{ badgeId: badge.id }}
                  className="app-surface group rounded-[1.8rem] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200"
                >
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all group-hover:border-emerald-200">
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
                        <MeritBadgeIcon className="hidden h-8 w-8 text-emerald-600" size={32} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-950 transition-colors group-hover:text-emerald-700">
                          {badge.name}
                        </h3>
                        <div className="mt-2 flex flex-wrap gap-2">
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
                      </div>
                    </div>

                    <ArrowUpRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-slate-700" />
                  </div>

                  <div className="mb-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm text-slate-500">Progress</span>
                      <span className="text-sm font-semibold text-emerald-700">
                        {badge.percentage}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full bg-linear-to-r from-emerald-500 to-sky-600 transition-all duration-500"
                        style={{ width: `${badge.percentage}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>
                      {badge.completedCount} / {badge.totalCount} requirements completed
                    </span>
                    <span className="font-medium text-slate-700">Open badge</span>
                  </div>
                </Link>
              );
            })}
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
  activeClassName,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  activeClassName: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-4 py-3 text-sm font-medium transition-all ${
        active
          ? activeClassName
          : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      {label}
    </button>
  );
}

function HeroPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-slate-200 bg-white/85 px-3 py-2 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-slate-950">{value}</div>
    </div>
  );
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
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-950">{value}</div>
      <div className="mt-1 text-sm leading-6 text-slate-600">{detail}</div>
    </div>
  );
}
