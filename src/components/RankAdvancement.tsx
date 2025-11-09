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
      <div className="rounded-2xl bg-linear-to-br from-purple-500/10 via-blue-500/10 to-cyan-500/10 backdrop-blur-xl border border-white/20 p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg">
            <span className="text-2xl">🦅</span>
          </div>
          <h3 className="text-lg font-bold text-white">Eagle Scout!</h3>
        </div>
        <p className="text-sm text-white/80 leading-relaxed">
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
    <div className="rounded-2xl bg-linear-to-br from-purple-500/10 via-blue-500/10 to-cyan-500/10 backdrop-blur-xl border border-white/20 p-6 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg">
            <span className="text-xl">🎯</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Next Rank</h3>
            <p className="text-sm text-cyan-400 font-semibold">{nextRank.name}</p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-white/60">Progress</span>
          <span className="text-xs text-white/80 font-medium">
            {completedReqs}/{totalReqs}
          </span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-linear-to-r from-cyan-400 to-blue-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Requirements List - Scrollable */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
        {allRequirements.map((req) => {
          const isCompleted = rankProgress[req.id];
          const hasSubRequirements = 'sub_requirements' in req && Array.isArray((req as any).sub_requirements);
          const isSubRequirement = req.id.length > 1 && req.id.includes('a');
          
          return (
            <label
              key={req.id}
              className={`flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group ${
                isSubRequirement ? 'ml-6' : ''
              }`}
            >
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
                className={`mt-0.5 w-4 h-4 rounded border-2 border-white/30 bg-white/10 checked:bg-linear-to-br checked:from-cyan-400 checked:to-blue-500 checked:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all ${
                  hasSubRequirements ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
                }`}
              />
              <span
                className={`text-xs leading-relaxed transition-colors ${
                  isCompleted
                    ? 'text-white/50 line-through'
                    : hasSubRequirements
                    ? 'text-white font-medium'
                    : 'text-white/80 group-hover:text-white'
                }`}
              >
                <span className="font-semibold text-cyan-400">{req.id}.</span> {req.text}
                {hasSubRequirements ? <span className="text-white/50 text-xs block mt-1">(Choose one option below)</span> : null}
              </span>
            </label>
          );
        })}
      </div>

      {/* Footer Action */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <button
          onClick={() => {
            // Future: Navigate to profile when route exists
            console.log('Navigate to profile');
          }}
          className="text-xs text-cyan-400 hover:text-cyan-300 font-medium transition-colors flex items-center gap-1"
        >
          <span>View all ranks</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
