import { Link } from '@tanstack/react-router';
import { Award, CheckCircle2, ShieldCheck, Target } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { RANK_COLORS, RANK_ORDER as RANK_PROGRESSION, normalizeRankId } from '../lib/constants';
import type { UserData } from '../data/userData';
import rankRequirementsData from '../data/rank-reqs.json';
import {
  getMeritBadgeFocusSummary,
  getMeritBadgePaceSummary,
  getRankProgressSummary,
  getSignoffPaceSummary,
  getUserFocusTrack,
  getWorkingRankId,
} from '../lib/scoutFocus';
import { determineActiveRank } from '../lib/rankProgress';

const RANK_REQUIREMENTS = rankRequirementsData;

interface RankAdvancementProps {
  userData: UserData;
}

export function RankAdvancement({ userData }: RankAdvancementProps) {
  const queryClient = useQueryClient();
  const currentRankId = userData.profile.currentRank || null;
  const workingRankId = getWorkingRankId(currentRankId);
  const focusTrack = getUserFocusTrack(userData);
  const workingRankProgress = getRankProgressSummary(userData, workingRankId);
  const meritBadgeFocus = getMeritBadgeFocusSummary(userData);

  const normalizedCurrentRankId = currentRankId ? normalizeRankId(currentRankId) : 'rank_scout';
  let currentRankIndex = RANK_PROGRESSION.indexOf(normalizedCurrentRankId as typeof RANK_PROGRESSION[number]);
  // If no rank yet, start from -1 so nextRankIndex is 0 (Scout)
  if (!currentRankId) {
    currentRankIndex = -1;
  }
  const nextRankIndex = currentRankIndex + 1;

  if (currentRankIndex === RANK_PROGRESSION.length - 1) {
    return (
      <div className="app-surface rounded-2xl p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${RANK_COLORS['rank_eagle']} text-white`}>
            <Award className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-stone-950">Eagle Scout achieved</h3>
            <p className="text-sm text-stone-600">Your advancement journey has reached the final rank.</p>
          </div>
        </div>
        <p className="text-sm leading-7 text-stone-600">
          Congratulations on reaching the highest rank in Scouting. Keep using Scoutly to track service, leadership, and long-term goals.
        </p>
      </div>
    );
  }

  const nextRank = RANK_REQUIREMENTS[nextRankIndex];
  if (!nextRank) return null;

  const rankProgress: Record<string, string | null> = userData.rankProgress?.[nextRank.id] || {};

  const allRequirements = nextRank.requirements.flatMap((req) => {
    if ('sub_requirements' in req && req.sub_requirements) {
      return [req, ...req.sub_requirements];
    }
    return [req];
  });

  const completedReqs = Object.values(rankProgress).filter(Boolean).length;
  const totalReqs = allRequirements.length;
  const progressPercent = (completedReqs / totalReqs) * 100;

  if (focusTrack === 'meritBadges') {
    return (
      <div className="app-surface rounded-2xl p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${RANK_COLORS[workingRankId]} text-white`}>
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-stone-950">Merit badge focus</h3>
            <p className="text-sm font-medium text-stone-700">
              Primary push for {workingRankProgress.rankName}
            </p>
          </div>
        </div>

        <Link
          to="/merit-badges"
          className="block rounded-2xl border border-stone-200 bg-stone-50 p-4 transition-colors hover:bg-stone-100"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
              Eagle-required progress
            </p>
            <p className="mt-1 text-lg font-semibold text-stone-950">
              {meritBadgeFocus.inProgressCount} in progress, {meritBadgeFocus.notStartedCount} not started
            </p>
          </div>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            {getMeritBadgePaceSummary(userData)}
          </p>
        </Link>

        <div className="mt-5 space-y-3">
          {meritBadgeFocus.recommended.map((badge) => (
            <Link
              key={badge.id}
              to="/merit-badges/$badgeId"
              params={{ badgeId: badge.id }}
              className="flex items-center justify-between rounded-2xl border border-stone-100 bg-white shadow-sm p-4 transition-all hover:border-stone-300"
            >
              <div>
                <p className="text-base font-semibold text-stone-950">{badge.name}</p>
                <p className="mt-1 text-sm text-stone-600">
                  {badge.state === 'inProgress'
                    ? `Already moving. Keep momentum and close the next requirement.`
                    : 'Not started yet. Good candidate to begin next.'}
                </p>
              </div>
              <div className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-sm font-semibold text-stone-700">
                {badge.state === 'inProgress' ? `${badge.percentage}%` : 'Start'}
              </div>
            </Link>
          ))}
        </div>

      </div>
    );
  }

  return (
    <div className="app-surface rounded-2xl p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${RANK_COLORS[workingRankId]} text-white`}>
            <Target className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-stone-950">Signoff focus</h3>
            <p className="text-sm font-medium text-stone-700">{nextRank.name}</p>
          </div>
        </div>
        <div className="rounded-full border border-stone-200 bg-white px-3 py-1 text-sm font-semibold text-stone-700">
          {Math.round(progressPercent)}%
        </div>
      </div>

      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.16em] text-stone-500">
          <span>Requirements complete</span>
          <span>{completedReqs}/{totalReqs}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-stone-100">
          <div
            className={`h-full ${RANK_COLORS[workingRankId]} transition-all duration-500`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="mb-5 rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
          Scout through First Class
        </p>
        <p className="mt-1 text-sm leading-6 text-stone-600">{getSignoffPaceSummary(userData)}</p>
      </div>

      <div className="max-h-[320px] space-y-2 overflow-y-auto pr-2">
        {allRequirements.map((req) => {
          const isCompleted = rankProgress[req.id];
          const hasSubRequirements = 'sub_requirements' in req && Array.isArray(req.sub_requirements);

          return (
            <label
              key={req.id}
              className="group flex cursor-pointer items-start gap-3 rounded-2xl border border-transparent bg-white p-3 transition-all hover:border-stone-200 hover:bg-white"
            >
              <div className="relative mt-0.5 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={!!isCompleted}
                  disabled={!!hasSubRequirements}
                  onChange={() => {
                    if (hasSubRequirements) return;

                    const newProgress = { ...rankProgress };
                    if (isCompleted) {
                      delete newProgress[req.id];
                    } else {
                      newProgress[req.id] = new Date().toISOString().split('T')[0];
                    }

                    const mergedRankProgress = {
                      ...userData.rankProgress,
                      [nextRank.id]: newProgress,
                    };
                    const updatedUserData = {
                      ...userData,
                      profile: {
                        ...userData.profile,
                        currentRank: determineActiveRank(mergedRankProgress),
                      },
                      rankProgress: mergedRankProgress,
                    };
                    localStorage.setItem('scoutly_user_data', JSON.stringify(updatedUserData));
                    // Immediately update React Query cache so all pages see the change
                    queryClient.setQueryData(['userData'], updatedUserData);
                    queryClient.refetchQueries({ queryKey: ['userData'] });
                  }}
                  className="peer sr-only"
                />
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all ${
                    hasSubRequirements
                      ? 'cursor-not-allowed border-stone-200 bg-stone-50'
                      : isCompleted
                        ? `border-transparent ${RANK_COLORS[workingRankId]}`
                        : 'border-stone-300 bg-white group-hover:border-stone-900'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="h-3.5 w-3.5 text-white" /> : null}
                </div>
              </div>
              <span
                className={`text-sm leading-relaxed ${
                  isCompleted
                    ? 'text-stone-400 line-through'
                    : hasSubRequirements
                      ? 'font-medium text-stone-900'
                      : 'text-stone-600 group-hover:text-stone-900'
                }`}
              >
                <span className={`font-semibold ${isCompleted ? 'text-stone-400' : 'text-stone-900'}`}>{req.id}.</span>{' '}
                <span>{req.text}</span>
                {hasSubRequirements ? (
                  <span className="mt-1 block text-xs uppercase tracking-[0.12em] text-stone-400">Choose one option below</span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>

      <div className="mt-5 border-t border-stone-200 pt-4">
        <Link
          to="/advancement"
          className="inline-flex items-center gap-2 text-sm font-semibold text-stone-900 transition-colors hover:text-stone-700"
        >
          View full advancement tracker
        </Link>
      </div>
    </div>
  );
}
