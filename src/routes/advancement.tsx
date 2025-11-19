import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { CheckCircle2, Circle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useUserData } from '../hooks/useUserData';
import rankRequirementsData from '../data/rank-reqs.json';
import * as storage from '../services/storageService';
import { EagleIcon, MeritBadgeIcon, CompassIcon } from '../components/ScoutIcons';

export const Route = createFileRoute('/advancement')({
  component: AdvancementPage,
});

const RANK_ORDER = [
  'rank_scout',
  'rank_tenderfoot',
  'rank_second_class',
  'rank_first_class',
  'rank_star',
  'rank_life',
  'rank_eagle'
];

const RANK_COLORS: Record<string, string> = {
  rank_scout: 'from-yellow-500 to-amber-600',
  rank_tenderfoot: 'from-green-500 to-emerald-600',
  rank_second_class: 'from-blue-500 to-cyan-600',
  rank_first_class: 'from-red-500 to-rose-600',
  rank_star: 'from-purple-500 to-violet-600',
  rank_life: 'from-pink-500 to-fuchsia-600',
  rank_eagle: 'from-amber-500 to-yellow-600',
};

// Determine the highest rank for which ALL requirements are complete.
// This represents the Scout's *current* rank; they are always working toward the NEXT rank.
const determineActiveRank = (rankProgress: Record<string, Record<string, string | null>> | undefined) => {
  for (const rankId of RANK_ORDER) {
    const rankData = rankRequirementsData.find((rank) => rank.id === rankId);
    if (!rankData) continue;

    const progressForRank = rankProgress?.[rankId] || {};
    const isRankComplete = rankData.requirements.every((req, reqIndex) => {
      const mainReqId = `req_${reqIndex}`;
      const mainComplete = Boolean(progressForRank[mainReqId]);

      if (req.sub_requirements && req.sub_requirements.length > 0) {
        const subComplete = req.sub_requirements.every((_, subIndex) => {
          const subReqId = `req_${reqIndex}_${subIndex}`;
          return Boolean(progressForRank[subReqId]);
        });

        return mainComplete && subComplete;
      }

      return mainComplete;
    });

    if (!isRankComplete) {
      // As soon as we find an incomplete rank, the current rank is the previous one
      const currentIndex = RANK_ORDER.indexOf(rankId);
      const previousRankId = currentIndex > 0 ? RANK_ORDER[currentIndex - 1] : 'rank_scout';
      return previousRankId;
    }
  }
  // If all ranks are complete, the Scout is Eagle
  return 'rank_eagle';
};

function AdvancementPage() {
  const { userData } = useUserData();
  const queryClient = useQueryClient();
  
  // Get current rank from user profile, normalize format
  let currentRankId = userData?.profile?.currentRank || 'rank_scout';
  if (!currentRankId.startsWith('rank_')) {
    currentRankId = `rank_${currentRankId}`;
  }
  
  // Find the current rank index, default to Scout if not found
  const currentRankIndex = RANK_ORDER.indexOf(currentRankId);
  const startIndex = currentRankIndex >= 0 ? currentRankIndex : 0;
  
  const [selectedRankIndex, setSelectedRankIndex] = useState(startIndex);
  
   // In-progress rank is always the next rank after the current completed rank
   const inProgressRankId = currentRankIndex >= 0 && currentRankIndex < RANK_ORDER.length - 1
     ? RANK_ORDER[currentRankIndex + 1]
     : null;
   const normalizedCurrentRankLabel = currentRankId.replace('rank_', '').replace(/_/g, ' ');
   const inProgressRankLabel = inProgressRankId
     ? inProgressRankId.replace('rank_', '').replace(/_/g, ' ')
     : null;

  const selectedRankId = RANK_ORDER[selectedRankIndex];
  const rankData = rankRequirementsData.find(r => r.id === selectedRankId);
  
  if (!rankData) {
    return (
      <div 
        className="min-h-screen bg-black flex items-center justify-center"
        style={{
          backgroundImage: 'radial-gradient(#0b3b12 1px, transparent 1px)',
          backgroundSize: '14px 14px',
          backgroundPosition: '0 0, 14px 14px',
        }}
      >
        {/* Gradient glows */}
        <div className="fixed top-0 left-0 w-1/2 h-1/2 bg-green-500/10 rounded-full blur-[150px] animate-pulse pointer-events-none" />
        <div className="fixed -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-cyan-500/10 rounded-full blur-[150px] animate-pulse [animation-delay:2s] pointer-events-none" />
        
        <div className="text-center relative z-10">
          <p className="text-slate-400 text-xl">Rank not found</p>
        </div>
      </div>
    );
  }

  const rankProgress = userData?.rankProgress?.[selectedRankId] || {};
  
  // Calculate progress - count completed requirements (including sub-requirements)
  let totalReqs = 0;
  let completedReqs = 0;
  
  rankData.requirements.forEach((req, reqIndex) => {
    const mainReqId = `req_${reqIndex}`;
    
    if (req.sub_requirements && req.sub_requirements.length > 0) {
      // For requirements with sub-requirements, count the main requirement
      totalReqs++;
      if (rankProgress[mainReqId]) completedReqs++;
      
      // Also count each sub-requirement
      req.sub_requirements.forEach((_, subIndex) => {
        totalReqs++;
        const subReqId = `req_${reqIndex}_${subIndex}`;
        if (rankProgress[subReqId]) completedReqs++;
      });
    } else {
      // Simple requirement
      totalReqs++;
      if (rankProgress[mainReqId]) completedReqs++;
    }
  });
  
  const completionPercentage = totalReqs > 0 ? Math.round((completedReqs / totalReqs) * 100) : 0;
  const isFullyCompleted = completionPercentage === 100;
  const isCurrentRank = selectedRankIndex === startIndex;

  const handleToggleRequirement = async (reqId: string) => {
    const isCompleted = rankProgress[reqId];
    const newCompletedDate = isCompleted ? null : new Date().toISOString().split('T')[0];
    
    const currentUserData = await storage.fetchUserData();
    
    if (!currentUserData.rankProgress) {
      currentUserData.rankProgress = {};
    }

    const rankProgressMap = currentUserData.rankProgress;

    if (!rankProgressMap[selectedRankId]) {
      rankProgressMap[selectedRankId] = {};
    }
    
    rankProgressMap[selectedRankId][reqId] = newCompletedDate;

    const activeRank = determineActiveRank(rankProgressMap);
    currentUserData.profile.currentRank = activeRank;
    
    localStorage.setItem('scoutly_user_data', JSON.stringify(currentUserData));
    queryClient.invalidateQueries({ queryKey: ['userData'] });
  };

  const handleMarkAllComplete = async () => {
    const currentUserData = await storage.fetchUserData();
    
    if (!currentUserData.rankProgress) {
      currentUserData.rankProgress = {};
    }

    const rankProgressMap = currentUserData.rankProgress;

    if (!rankProgressMap[selectedRankId]) {
      rankProgressMap[selectedRankId] = {};
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    // Mark all main requirements and sub-requirements as complete
    rankData.requirements.forEach((req, reqIndex) => {
      const mainReqId = `req_${reqIndex}`;
      rankProgressMap[selectedRankId][mainReqId] = today;
      
      if (req.sub_requirements && req.sub_requirements.length > 0) {
        req.sub_requirements.forEach((_, subIndex) => {
          const subReqId = `req_${reqIndex}_${subIndex}`;
          rankProgressMap[selectedRankId][subReqId] = today;
        });
      }
    });

    const activeRank = determineActiveRank(rankProgressMap);
    currentUserData.profile.currentRank = activeRank;
    
    localStorage.setItem('scoutly_user_data', JSON.stringify(currentUserData));
    queryClient.invalidateQueries({ queryKey: ['userData'] });
  };

  const handleClearAllProgress = async () => {
    if (!confirm(`Are you sure you want to clear all progress for ${rankData.name}?`)) return;
    
    const currentUserData = await storage.fetchUserData();
    
    if (!currentUserData.rankProgress) {
      currentUserData.rankProgress = {};
    }

    const rankProgressMap = currentUserData.rankProgress;
    rankProgressMap[selectedRankId] = {};
    
    const activeRank = determineActiveRank(rankProgressMap);
  currentUserData.profile.currentRank = activeRank;
    
    localStorage.setItem('scoutly_user_data', JSON.stringify(currentUserData));
    queryClient.invalidateQueries({ queryKey: ['userData'] });
  };

  const goToPreviousRank = () => {
    if (selectedRankIndex > 0) {
      setSelectedRankIndex(selectedRankIndex - 1);
    }
  };

  const goToNextRank = () => {
    if (selectedRankIndex < RANK_ORDER.length - 1) {
      setSelectedRankIndex(selectedRankIndex + 1);
    }
  };

  return (
    <div 
      className="min-h-screen bg-black"
      style={{
        backgroundImage: 'radial-gradient(#0b3b12 1px, transparent 1px)',
        backgroundSize: '14px 14px',
        backgroundPosition: '0 0, 14px 14px',
      }}
    >
      {/* Gradient glows */}
      <div className="fixed top-0 left-0 w-1/2 h-1/2 bg-green-500/10 rounded-full blur-[150px] animate-pulse pointer-events-none" />
      <div className="fixed -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-cyan-500/10 rounded-full blur-[150px] animate-pulse [animation-delay:2s] pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-linear-to-br from-green-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30">
              <EagleIcon className="w-6 h-6 text-white" size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Rank Advancement</h1>
              <p className="text-slate-400">
                Current rank: <span className="text-green-300 font-semibold capitalize">{normalizedCurrentRankLabel}</span>
                {inProgressRankLabel && (
                  <>
                    {' '}• In progress: <span className="text-cyan-300 font-semibold capitalize">{inProgressRankLabel}</span>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Rank Navigation */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={goToPreviousRank}
              disabled={selectedRankIndex === 0}
              className="p-3 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl text-white transition-all flex items-center gap-2"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Previous</span>
            </button>

            <div className="flex-1 mx-4 text-center">
              <div className={`inline-flex items-center justify-center w-20 h-20 bg-linear-to-br ${RANK_COLORS[selectedRankId]} rounded-2xl shadow-lg mb-3`}>
                <MeritBadgeIcon className="w-10 h-10 text-white" size={40} />
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">{rankData.name}</h2>
              {isCurrentRank && (
                <div className="inline-block px-3 py-1 bg-green-500/20 border border-green-500/50 rounded-full">
                  <span className="text-green-400 text-sm font-semibold">Current Rank</span>
                </div>
              )}
            </div>

            <button
              onClick={goToNextRank}
              disabled={selectedRankIndex === RANK_ORDER.length - 1}
              className="p-3 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl text-white transition-all flex items-center gap-2"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Progress</span>
              <span className="text-green-400 font-semibold">{completionPercentage}%</span>
            </div>
            <div className="w-full h-3 bg-black/50 rounded-full overflow-hidden">
              <div
                className={`h-full bg-linear-to-r ${RANK_COLORS[selectedRankId]} transition-all duration-500`}
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-slate-400">
              <CompassIcon className="w-4 h-4 text-green-400" size={16} />
              <span>{completedReqs} / {totalReqs} completed</span>
            </div>

            <div className="flex gap-2">
              {!isFullyCompleted ? (
                <button
                  onClick={handleMarkAllComplete}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-black font-bold text-sm transition-all flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Mark All
                </button>
              ) : (
                <div className="px-4 py-2 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Rank Complete!
                </div>
              )}
              {completedReqs > 0 && (
                <button
                  onClick={handleClearAllProgress}
                  className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 text-sm font-medium transition-all"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Rank Progress Bar for All Ranks */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 mb-6">
          <h3 className="text-sm font-semibold text-slate-400 mb-3">Your Journey to Eagle</h3>
          <div className="flex items-center gap-2">
            {RANK_ORDER.map((rankId, index) => {
              const rank = rankRequirementsData.find(r => r.id === rankId);
              const isActive = index === selectedRankIndex;
              const isPast = index < startIndex;
              const isCurrent = index === startIndex;
              
              return (
                <button
                  key={rankId}
                  onClick={() => setSelectedRankIndex(index)}
                  className={`flex-1 h-2 rounded-full transition-all ${
                    isActive
                      ? `bg-linear-to-r ${RANK_COLORS[rankId]} scale-y-150`
                      : isPast
                      ? 'bg-green-500/50'
                      : isCurrent
                      ? 'bg-green-500/30'
                      : 'bg-white/10'
                  }`}
                  title={rank?.name}
                />
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
            <span>Scout</span>
            <span>Eagle</span>
          </div>
        </div>

        {/* Requirements List */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white mb-4">Requirements</h3>

          {rankData.requirements.map((req, index) => {
            const hasSubReqs = req.sub_requirements && req.sub_requirements.length > 0;
            const mainReqId = `req_${index}`;
            const isMainCompleted = rankProgress[mainReqId];
            
            return (
              <div
                key={index}
                id={`${selectedRankId}-${req.id}`}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:border-white/20 transition-all"
              >
                <div className="space-y-4">
                  {/* Main Requirement */}
                  <div
                    className="flex items-start gap-4 cursor-pointer group"
                    onClick={() => handleToggleRequirement(mainReqId)}
                  >
                    <div className="shrink-0 mt-1">
                      {isMainCompleted ? (
                        <CheckCircle2 className="w-6 h-6 text-green-400" />
                      ) : (
                        <Circle className="w-6 h-6 text-white/20 group-hover:text-white/40 transition-colors" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start gap-2">
                        <span className="text-green-400 font-semibold shrink-0">{req.id}.</span>
                        <p className="text-slate-300 leading-relaxed group-hover:text-white transition-colors">
                          {req.text}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Sub Requirements */}
                  {hasSubReqs && (
                    <div className="ml-10 space-y-3 mt-4">
                      {req.sub_requirements.map((subReq, subIndex) => {
                        const subReqId = `req_${index}_${subIndex}`;
                        const isSubCompleted = rankProgress[subReqId];
                        
                        return (
                          <div
                            key={subIndex}
                            id={`${selectedRankId}-${req.id}-${subReq.id}`}
                            className="flex items-start gap-3 cursor-pointer group"
                            onClick={() => handleToggleRequirement(subReqId)}
                          >
                            <div className="shrink-0 mt-1">
                              {isSubCompleted ? (
                                <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                              ) : (
                                <Circle className="w-5 h-5 text-white/20 group-hover:text-white/40 transition-colors" />
                              )}
                            </div>
                            <div className="flex-1 flex items-start gap-2">
                              <span className="text-cyan-400 font-semibold text-sm shrink-0">{subReq.id}.</span>
                              <p className="text-slate-400 text-sm leading-relaxed group-hover:text-slate-300 transition-colors">
                                {subReq.text}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Completion Message */}
        {isFullyCompleted && (
          <div className="mt-8 p-6 bg-linear-to-r from-green-500/20 to-emerald-500/20 border border-green-500/50 rounded-xl">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
              <div>
                <h3 className="text-xl font-bold text-white">Congratulations!</h3>
                <p className="text-slate-300">
                  You've completed all requirements for {rankData.name}. 
                  {selectedRankIndex < RANK_ORDER.length - 1 
                    ? " Don't forget to schedule your board of review and start working on your next rank!"
                    : " You've reached the highest rank in Scouting - congratulations, Eagle Scout!"
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Hint */}
        <div className="mt-6 text-center text-sm text-slate-500">
          <p>Use the Previous/Next buttons to view other ranks and track your progress</p>
        </div>
      </div>
    </div>
  );
}
