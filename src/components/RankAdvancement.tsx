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
  // Handle both formats: 'scout' and 'rank_scout'
  let currentRankId = userData.profile.currentRank || 'scout';
  if (!currentRankId.startsWith('rank_')) {
    currentRankId = `rank_${currentRankId}`;
  }
  
  const currentRankIndex = RANK_PROGRESSION.indexOf(currentRankId as typeof RANK_PROGRESSION[number]);
  const nextRankIndex = currentRankIndex + 1;

  // If already Eagle, show celebration
  if (currentRankIndex === RANK_PROGRESSION.length - 1) {
    return (
      <div className="app-surface rounded-3xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-amber-400 to-yellow-500 shadow-lg">
            <span className="text-2xl">🦅</span>
          </div>
          <h3 className="text-lg font-bold text-slate-950">Eagle Scout!</h3>
        </div>
        <p className="text-sm leading-relaxed text-slate-600">
          Congratulations on reaching the pinnacle of Scouting! Continue your journey with lifelong service and leadership.
        </p>
      </div>
    );
  }

  const nextRank = RANK_REQUIREMENTS[nextRankIndex];
  if (!nextRank) return null;

  // Get progress for next rank
  const rankProgress: Record<string, string | null> = userData.rankProgress?.[nextRank.id] || {};
  
  // Flatten requirements to include sub-requirements
  const allRequirements = nextRank.requirements.flatMap(req => {
    if ('sub_requirements' in req && req.sub_requirements) {
      // For choice-based requirements, show parent + all sub-options
      return [req, ...req.sub_requirements];
    }
    return [req];
  });
  
  const completedReqs = Object.values(rankProgress).filter(Boolean).length;
  const totalReqs = allRequirements.length;
  const progressPercent = (completedReqs / totalReqs) * 100;

  return (
    <div className="app-surface rounded-3xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-emerald-500 to-sky-600 shadow-lg shadow-sky-100">
            <span className="text-xl">🎯</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-950">Next Rank</h3>
            <p className="text-sm font-semibold text-sky-700">{nextRank.name}</p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-500">Progress</span>
          <span className="text-xs font-medium text-slate-700">
            {completedReqs}/{totalReqs}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full bg-linear-to-r from-emerald-500 to-sky-600 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Requirements List - Scrollable */}
      <div className="max-h-[300px] space-y-2 overflow-y-auto pr-2">
        {allRequirements.map((req) => {
          const isCompleted = rankProgress[req.id];
          const hasSubRequirements = 'sub_requirements' in req && Array.isArray((req as any).sub_requirements);
          const isSubRequirement = req.id.length > 1 && req.id.includes('a');
          
          return (
            <label
              key={req.id}
              className={`group flex cursor-pointer items-start gap-3 rounded-xl p-2 transition-colors hover:bg-slate-50 ${
                isSubRequirement ? 'ml-6' : ''
              }`}
            >
              <div className="relative flex-shrink-0 mt-0.5">
                <input
                  type="checkbox"
                  checked={!!isCompleted}
                  disabled={!!hasSubRequirements}
                  onChange={() => {
                    if (hasSubRequirements) return; // Parent items can't be checked
                    
                    // Toggle requirement completion
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
                <div className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all ${
                  hasSubRequirements 
                    ? 'cursor-not-allowed border-slate-200 bg-slate-50' 
                    : isCompleted
                    ? 'border-emerald-500 bg-emerald-500 shadow-lg shadow-emerald-100'
                    : 'border-slate-300 bg-white group-hover:border-emerald-400 group-hover:bg-emerald-50'
                }`}>
                  {isCompleted && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <span
                className={`text-xs leading-relaxed transition-colors ${
                  isCompleted
                    ? 'text-slate-400 line-through'
                    : hasSubRequirements
                    ? 'font-medium text-slate-900'
                    : 'text-slate-600 group-hover:text-slate-900'
                }`}
              >
                <span className={`font-semibold ${isCompleted ? 'text-slate-400' : 'text-sky-700'}`}>{req.id}.</span>{' '}
                <span className={isCompleted ? 'text-slate-400' : 'text-slate-600 group-hover:text-slate-900'}>{req.text}</span>
                {hasSubRequirements ? <span className="mt-1 block text-xs text-slate-400">(Choose one option below)</span> : null}
              </span>
            </label>
          );
        })}
      </div>

      {/* Footer Action */}
      <div className="mt-4 border-t border-slate-200 pt-4">
        <button
          onClick={() => {
            // Future: Navigate to profile when route exists
            console.log('Navigate to profile');
          }}
          className="flex items-center gap-1 text-xs font-medium text-sky-700 transition-colors hover:text-sky-600"
        >
          <span>View all ranks</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
