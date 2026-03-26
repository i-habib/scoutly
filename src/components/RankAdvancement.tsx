import { Link } from '@tanstack/react-router';
import { Award, CheckCircle2, Target } from 'lucide-react';
import type { UserData } from '../data/userData';
import rankRequirementsData from '../data/rank-reqs.json';

const RANK_PROGRESSION = [
  'rank_scout',
  'rank_tenderfoot',
  'rank_second_class',
  'rank_first_class',
  'rank_star',
  'rank_life',
  'rank_eagle',
] as const;

const RANK_REQUIREMENTS = rankRequirementsData;

interface RankAdvancementProps {
  userData: UserData;
}

export function RankAdvancement({ userData }: RankAdvancementProps) {
  let currentRankId = userData.profile.currentRank || 'scout';
  if (!currentRankId.startsWith('rank_')) {
    currentRankId = `rank_${currentRankId}`;
  }

  const currentRankIndex = RANK_PROGRESSION.indexOf(currentRankId as typeof RANK_PROGRESSION[number]);
  const nextRankIndex = currentRankIndex + 1;

  if (currentRankIndex === RANK_PROGRESSION.length - 1) {
    return (
      <div className="app-surface rounded-[1.75rem] p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-slate-950">Eagle Scout achieved</h3>
            <p className="text-sm text-slate-600">Your advancement journey has reached the final rank.</p>
          </div>
        </div>
        <p className="text-sm leading-7 text-slate-600">
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

  return (
    <div className="app-surface rounded-[1.75rem] p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-slate-950">Next rank focus</h3>
            <p className="text-sm font-medium text-[#24584b]">{nextRank.name}</p>
          </div>
        </div>
        <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-700">
          {Math.round(progressPercent)}%
        </div>
      </div>

      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.16em] text-slate-500">
          <span>Requirements complete</span>
          <span>{completedReqs}/{totalReqs}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full bg-linear-to-r from-[#1f3448] via-[#24584b] to-[#c89b52] transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="max-h-[320px] space-y-2 overflow-y-auto pr-2">
        {allRequirements.map((req) => {
          const isCompleted = rankProgress[req.id];
          const hasSubRequirements = 'sub_requirements' in req && Array.isArray((req as any).sub_requirements);
          const isSubRequirement = req.id.length > 1 && req.id.includes('a');

          return (
            <label
              key={req.id}
              className={`group flex cursor-pointer items-start gap-3 rounded-2xl border border-transparent bg-white/78 p-3 transition-all hover:border-slate-200 hover:bg-white ${
                isSubRequirement ? 'ml-6' : ''
              }`}
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

                    const updatedUserData = {
                      ...userData,
                      rankProgress: {
                        ...userData.rankProgress,
                        [nextRank.id]: newProgress,
                      },
                    };
                    localStorage.setItem('scoutly_user_data', JSON.stringify(updatedUserData));
                    window.dispatchEvent(new Event('storage'));
                  }}
                  className="peer sr-only"
                />
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all ${
                    hasSubRequirements
                      ? 'cursor-not-allowed border-slate-200 bg-slate-50'
                      : isCompleted
                        ? 'border-[#24584b] bg-[#24584b]'
                        : 'border-slate-300 bg-white group-hover:border-[#24584b]'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="h-3.5 w-3.5 text-white" /> : null}
                </div>
              </div>
              <span
                className={`text-sm leading-relaxed ${
                  isCompleted
                    ? 'text-slate-400 line-through'
                    : hasSubRequirements
                      ? 'font-medium text-slate-900'
                      : 'text-slate-600 group-hover:text-slate-900'
                }`}
              >
                <span className={`font-semibold ${isCompleted ? 'text-slate-400' : 'text-[#1f3448]'}`}>{req.id}.</span>{' '}
                <span>{req.text}</span>
                {hasSubRequirements ? (
                  <span className="mt-1 block text-xs uppercase tracking-[0.12em] text-slate-400">Choose one option below</span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>

      <div className="mt-5 border-t border-slate-200 pt-4">
        <Link
          to="/advancement"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#1f3448] transition-colors hover:text-[#24584b]"
        >
          View full advancement tracker
        </Link>
      </div>
    </div>
  );
}
