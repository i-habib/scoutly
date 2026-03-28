import { createFileRoute } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { ArrowUpRight, CheckCircle2, Circle, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useUserData } from '../hooks/useUserData';
import rankRequirementsData from '../data/rank-reqs.json';
import * as storage from '../services/storageService';
import { EagleIcon, MeritBadgeIcon, CompassIcon } from '../components/ScoutIcons';
import { RANK_ORDER, RANK_COLORS, getRankDisplayName, normalizeRankId } from '../lib/constants';
import { getMeritBadgePaceSummary, getUserFocusTrack, getWorkingRankId } from '../lib/scoutFocus';
import { useToast } from '../components/Toast';

export const Route = createFileRoute('/advancement')({
  component: AdvancementPage,
});

// RANK_ORDER, RANK_COLORS, and display helpers imported from lib/constants.ts

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
  const { confirm } = useToast();
  
  // Get current rank from user profile, normalize format
  const currentRankId = normalizeRankId(userData?.profile?.currentRank || 'rank_scout');
  
  // Find the current rank index, default to Scout if not found
  const currentRankIndex = RANK_ORDER.indexOf(currentRankId as typeof RANK_ORDER[number]);
  const startIndex = currentRankIndex >= 0 ? currentRankIndex : 0;
  
  const [selectedRankIndex, setSelectedRankIndex] = useState(startIndex);
  const focusTrack = userData ? getUserFocusTrack(userData) : 'signoffs';
  const workingRankId = userData ? getWorkingRankId(userData.profile.currentRank) : 'rank_tenderfoot';
  const workingRankLabel = getRankDisplayName(workingRankId);
  
   // In-progress rank is always the next rank after the current completed rank
   const inProgressRankId = currentRankIndex >= 0 && currentRankIndex < RANK_ORDER.length - 1
     ? RANK_ORDER[currentRankIndex + 1]
     : null;
   const normalizedCurrentRankLabel = getRankDisplayName(currentRankId);
   const inProgressRankLabel = inProgressRankId
     ? getRankDisplayName(inProgressRankId)
     : null;

  const selectedRankId = RANK_ORDER[selectedRankIndex];
  const rankData = rankRequirementsData.find(r => r.id === selectedRankId);
  
  if (!rankData) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center">
        <div className="text-center relative z-10">
          <p className="text-xl text-slate-500">Rank not found</p>
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
    const confirmed = await confirm({ title: 'Clear Progress', message: `Are you sure you want to clear all progress for ${rankData.name}?`, destructive: true, confirmLabel: 'Clear All' });
    if (!confirmed) return;
    
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
    <div className="app-shell">
      <div className="app-shell__grid fixed inset-0" />
      <div className="app-shell__glow app-shell__glow--top fixed" />
      <div className="app-shell__glow app-shell__glow--bottom fixed" />

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-500 to-sky-600 shadow-[0_14px_30px_rgba(14,165,233,0.22)]">
              <EagleIcon className="w-6 h-6 text-white" size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-950">Rank Advancement</h1>
              <p className="text-slate-600">
                {focusTrack === 'signoffs'
                  ? 'Which signoffs are still open for your next rank?'
                  : 'Rank requirements matter, but merit badges are the main priority now.'}
              </p>
              <p className="text-slate-500">
                Current rank: <span className="font-semibold capitalize text-emerald-700">{normalizedCurrentRankLabel}</span>
                {inProgressRankLabel && (
                  <>
                    {' '}• In progress: <span className="font-semibold capitalize text-sky-700">{inProgressRankLabel}</span>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {focusTrack === 'meritBadges' && (
          <div className="mb-6 rounded-3xl border border-sky-100 bg-linear-to-r from-sky-50 via-white to-emerald-50 p-5 shadow-[0_18px_40px_rgba(14,165,233,0.08)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-950">
                    Merit badges are the real focus for {workingRankLabel}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {getMeritBadgePaceSummary(userData)}
                  </p>
                </div>
              </div>

              <Link
                to="/merit-badges/"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-sky-600 to-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(14,165,233,0.18)] transition-all hover:-translate-y-0.5 hover:brightness-105"
              >
                Open merit badges
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}

        {/* Rank Navigation */}
        <div className="app-surface mb-6 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={goToPreviousRank}
              disabled={selectedRankIndex === 0}
              className="flex items-center gap-2 rounded-[1.25rem] border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-3 text-slate-700 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Previous</span>
            </button>

            <div className="flex-1 mx-4 text-center">
              <div className={`inline-flex items-center justify-center w-20 h-20 bg-linear-to-br ${RANK_COLORS[selectedRankId]} rounded-2xl shadow-lg mb-3`}>
                <MeritBadgeIcon className="w-10 h-10 text-white" size={40} />
              </div>
              <h2 className="mb-1 text-2xl font-bold text-slate-950">{rankData.name}</h2>
              {isCurrentRank && (
                <div className="inline-block rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1">
                  <span className="text-sm font-semibold text-emerald-700">Current Rank</span>
                </div>
              )}
            </div>

            <button
              onClick={goToNextRank}
              disabled={selectedRankIndex === RANK_ORDER.length - 1}
              className="flex items-center gap-2 rounded-[1.25rem] border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-3 text-slate-700 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500">Progress</span>
              <span className="font-semibold text-emerald-700">{completionPercentage}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full bg-linear-to-r ${RANK_COLORS[selectedRankId]} transition-all duration-500`}
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <CompassIcon className="w-4 h-4 text-emerald-600" size={16} />
              <span>{completedReqs} / {totalReqs} completed</span>
            </div>

            <div className="flex gap-2">
              {!isFullyCompleted ? (
                <button
                  onClick={handleMarkAllComplete}
                  className="flex items-center gap-2 rounded-xl bg-linear-to-r from-emerald-600 to-sky-600 px-4 py-2 text-sm font-bold text-white shadow-[0_8px_16px_rgba(16,185,129,0.2)] hover:shadow-[0_12px_24px_rgba(16,185,129,0.3)] hover:-translate-y-0.5 transition-all hover:from-emerald-500 hover:to-sky-500"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Mark All
                </button>
              ) : (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" />
                  Rank Complete!
                </div>
              )}
              {completedReqs > 0 && (
                <button
                  onClick={handleClearAllProgress}
                  className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition-all hover:bg-rose-100"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Rank Progress Bar for All Ranks */}
        <div className="app-surface mb-6 rounded-2xl p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-500">Your Journey to Eagle</h3>
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
                      ? 'bg-emerald-300'
                      : isCurrent
                      ? 'bg-emerald-200'
                      : 'bg-slate-200'
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
          <h3 className="mb-4 text-xl font-bold text-slate-950">
            {focusTrack === 'signoffs' ? 'Requirements to sign off' : 'Rank requirements sidecar'}
          </h3>

          {rankData.requirements.map((req, index) => {
            const hasSubReqs = req.sub_requirements && req.sub_requirements.length > 0;
            const mainReqId = `req_${index}`;
            const isMainCompleted = rankProgress[mainReqId];
            
            return (
              <div
                key={index}
                id={`${selectedRankId}-${req.id}`}
                className="app-surface rounded-2xl p-6 transition-all hover:border-slate-300"
              >
                <div className="space-y-4">
                  {/* Main Requirement */}
                  <div
                    className="flex items-start gap-4 cursor-pointer group"
                    onClick={() => handleToggleRequirement(mainReqId)}
                  >
                    <div className="shrink-0 mt-1">
                      {isMainCompleted ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                      ) : (
                        <Circle className="w-6 h-6 text-slate-300 transition-colors group-hover:text-slate-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start gap-2">
                        <span className="shrink-0 font-semibold text-emerald-700">{req.id}.</span>
                        <p className="leading-relaxed text-slate-600 transition-colors group-hover:text-slate-900">
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
                                <CheckCircle2 className="w-5 h-5 text-sky-600" />
                              ) : (
                                <Circle className="w-5 h-5 text-slate-300 transition-colors group-hover:text-slate-500" />
                              )}
                            </div>
                            <div className="flex-1 flex items-start gap-2">
                              <span className="shrink-0 text-sm font-semibold text-sky-700">{subReq.id}.</span>
                              <p className="text-sm leading-relaxed text-slate-500 transition-colors group-hover:text-slate-700">
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
          <div className="mt-8 rounded-3xl border border-emerald-200 bg-linear-to-r from-emerald-50 to-sky-50 p-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              <div>
                <h3 className="text-xl font-bold text-slate-950">Congratulations!</h3>
                <p className="text-slate-600">
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
