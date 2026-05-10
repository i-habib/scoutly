import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { CheckCircle2, Circle, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useUserData } from '../hooks/useUserData';
import rankRequirementsData from '../data/rank-reqs.json';
import * as storage from '../services/storageService';
import { MeritBadgeIcon } from '../components/ScoutIcons';
import { RANK_ORDER, getRankDisplayName, normalizeRankId, RANK_COLORS, RANK_ACCENT_COLORS, RANK_RING_COLORS, RANK_TEXT_COLORS } from '../lib/constants';
import { getMeritBadgePaceSummary, getUserFocusTrack, getWorkingRankId } from '../lib/scoutFocus';
import { determineActiveRank } from '../lib/rankProgress';
import { useToast } from '../components/Toast';

export const Route = createFileRoute('/advancement')({
  component: AdvancementPage,
});

// RANK_ORDER, RANK_COLORS, and display helpers imported from lib/constants.ts

function AdvancementPage() {
  const { userData } = useUserData();
  const queryClient = useQueryClient();
  const { confirm } = useToast();
  
  // Allow "no rank yet": treat Scout as in-progress when current rank is null.
  const hasCurrentRank = Boolean(userData?.profile?.currentRank);
  const currentRankId = hasCurrentRank
    ? normalizeRankId(userData?.profile?.currentRank || 'rank_scout')
    : null;
  
  // Find current rank index; -1 means no rank yet.
  const currentRankIndex = currentRankId
    ? RANK_ORDER.indexOf(currentRankId as typeof RANK_ORDER[number])
    : -1;
  const startIndex = currentRankIndex >= 0 ? currentRankIndex : -1;
  const inProgressIndex =
    currentRankIndex >= 0
      ? Math.min(currentRankIndex + 1, RANK_ORDER.length - 1)
      : 0;
  
  const [selectedRankIndex, setSelectedRankIndex] = useState(inProgressIndex);
  const focusTrack = userData ? getUserFocusTrack(userData) : 'signoffs';
  const workingRankId = userData ? getWorkingRankId(userData.profile.currentRank) : 'rank_scout';
  const workingRankLabel = getRankDisplayName(workingRankId);
  
   // In-progress rank is always the next rank after the current completed rank
   const inProgressRankId = currentRankIndex >= 0 && currentRankIndex < RANK_ORDER.length - 1
     ? RANK_ORDER[currentRankIndex + 1]
     : currentRankIndex < 0
       ? 'rank_scout'
       : null;
   const normalizedCurrentRankLabel = currentRankId ? getRankDisplayName(currentRankId) : 'None yet';
   const inProgressRankLabel = inProgressRankId
     ? getRankDisplayName(inProgressRankId)
     : null;

  const selectedRankId = RANK_ORDER[selectedRankIndex];
  const rankData = rankRequirementsData.find(r => r.id === selectedRankId);
  
  if (!rankData) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center">
        <div className="text-center relative z-10">
          <p className="text-xl text-stone-400">Rank not found</p>
        </div>
      </div>
    );
  }

  const rankProgress = userData?.rankProgress?.[selectedRankId] || {};
  
  // Calculate progress - count completed requirements (including sub-requirements)
  let totalReqs = 0;
  let completedReqs = 0;
  
  rankData.requirements.forEach((req) => {
    const mainReqId = req.id;
    
    if (req.sub_requirements && req.sub_requirements.length > 0) {
      // For requirements with sub-requirements, count the main requirement
      totalReqs++;
      if (rankProgress[mainReqId]) completedReqs++;
      
      // Also count each sub-requirement
      req.sub_requirements.forEach((subReq) => {
        totalReqs++;
        const subReqId = subReq.id;
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
    // Immediately update React Query cache so all pages see the change
    queryClient.setQueryData(['userData'], currentUserData);
    queryClient.refetchQueries({ queryKey: ['userData'] });
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
    
    // Use the same requirement ids as the checklist (JSON id strings), not req_0-style keys
    rankData.requirements.forEach((req) => {
      rankProgressMap[selectedRankId][req.id] = today;

      if (req.sub_requirements && req.sub_requirements.length > 0) {
        req.sub_requirements.forEach((subReq) => {
          rankProgressMap[selectedRankId][subReq.id] = today;
        });
      }
    });

    const activeRank = determineActiveRank(rankProgressMap);
    currentUserData.profile.currentRank = activeRank;

    localStorage.setItem('scoutly_user_data', JSON.stringify(currentUserData));
    queryClient.setQueryData(['userData'], currentUserData);
    queryClient.refetchQueries({ queryKey: ['userData'] });
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
    <div className="app-shell bg-stone-50">
      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-stone-900">Rank Advancement</h1>
              <p className="mt-3 text-stone-400">
                Current rank: <span className="font-semibold capitalize text-stone-800">{normalizedCurrentRankLabel}</span>
                {inProgressRankLabel && (
                  <>
                    {' '}• In progress: <span className="font-semibold capitalize text-stone-500">{inProgressRankLabel}</span>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {focusTrack === 'meritBadges' && (
          <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white border border-stone-200 text-stone-800 shadow-sm">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-stone-900">
                    Merit badges are the real focus for {workingRankLabel}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-stone-500">
                    {getMeritBadgePaceSummary(userData)}
                  </p>
                </div>
              </div>
              <div className="lg:ml-auto">
                <Link
                  to="/merit-badges/"
                  className="inline-flex items-center justify-center rounded-xl border border-black bg-white px-4 py-2.5 text-sm font-medium text-black hover:bg-stone-50"
                >
                  Open Merit Badges
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Rank Navigation */}
        <div className={`app-surface mb-6 rounded-2xl border border-stone-200 bg-white p-6`}>
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={goToPreviousRank}
              disabled={selectedRankIndex === 0}
              className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-800 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Previous</span>
            </button>

            <div className="flex-1 mx-4 text-center">
              <div className={`inline-flex items-center justify-center w-20 h-20 ${RANK_COLORS[selectedRankId] || 'bg-stone-500'} text-white rounded-2xl mb-3`}>
                <MeritBadgeIcon className="w-10 h-10 text-white" size={40} />
              </div>
              <h2 className="mb-1 text-2xl font-semibold text-black">{rankData.name}</h2>
              {isCurrentRank && (
                <div className={`inline-block rounded-full px-3 py-1 ${RANK_ACCENT_COLORS[selectedRankId] || 'border-stone-300 bg-stone-100 text-stone-800'}`}>
                  <span className="text-sm font-semibold text-black">Current Rank</span>
                </div>
              )}
            </div>

            <button
              onClick={goToNextRank}
              disabled={selectedRankIndex === RANK_ORDER.length - 1}
              className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-800 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-stone-400">Progress</span>
              <span className={`font-semibold ${RANK_TEXT_COLORS[selectedRankId] || 'text-stone-700'}`}>{completionPercentage}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-white">
              <div
                className={`h-full ${RANK_COLORS[selectedRankId] || 'bg-stone-500'} transition-all duration-500`}
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-stone-400">
              <MeritBadgeIcon className={`w-4 h-4 ${RANK_TEXT_COLORS[selectedRankId] || 'text-stone-700'}`} size={16} />
              <span>{completedReqs} / {totalReqs} completed</span>
            </div>

            <div className="flex gap-2">
              {!isFullyCompleted ? (
                <button
                  onClick={handleMarkAllComplete}
                  className="flex items-center gap-2 rounded-xl bg-stone-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-700"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Mark All
                </button>
              ) : (
                <div className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium ${RANK_ACCENT_COLORS[selectedRankId] || 'border-stone-300 bg-stone-100 text-stone-800'}`}>
                  <CheckCircle2 className={`w-4 h-4 ${RANK_TEXT_COLORS[selectedRankId] || 'text-stone-700'}`} />
                  Rank Complete!
                </div>
              )}
              {completedReqs > 0 && (
                <button
                  onClick={handleClearAllProgress}
                  className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-800 hover:bg-stone-50"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Rank Progress Bar for All Ranks */}
        <div className={`app-surface mb-6 rounded-2xl border border-stone-200 bg-stone-50 p-5`}>
          <h3 className="mb-3 text-sm font-semibold text-black">Your Journey to Eagle</h3>
          <div className="flex items-center gap-4">
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
                      ? `${RANK_COLORS[rankId] || 'bg-stone-500'} scale-y-150 ring-2 ring-offset-1 ${RANK_RING_COLORS[rankId] || 'ring-stone-500'}`
                      : isPast || isCurrent
                      ? RANK_COLORS[rankId] || 'bg-stone-500'
                      : RANK_ACCENT_COLORS[rankId] || 'border-stone-300 bg-stone-100 text-stone-800'
                  }`}
                  title={rank?.name}
                />
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-stone-400">
            <span>Scout</span>
            <span>Eagle</span>
          </div>
        </div>

        {/* Requirements List */}
        <div className="space-y-4">
          <h3 className="mb-4 text-xl font-semibold text-black">
            {focusTrack === 'signoffs' ? 'Requirements to sign off' : 'Rank requirements sidecar'}
          </h3>

          {rankData.requirements.map((req, index) => {
            const hasSubReqs = req.sub_requirements && req.sub_requirements.length > 0;
            const mainReqId = req.id;
            const isMainCompleted = rankProgress[mainReqId];
            
            return (
<div
  key={index}
  id={`${selectedRankId}-${req.id}`}
  className={`app-surface rounded-2xl border border-stone-200 bg-white p-6 transition-all hover:border-stone-300`}
>
                <div className="space-y-4">
                  {/* Main Requirement */}
                  <div
                    className="flex items-start gap-4 cursor-pointer group"
                    onClick={() => handleToggleRequirement(mainReqId)}
                  >
                    <div className="shrink-0 mt-1">
                      {isMainCompleted ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-700" />
                      ) : (
                        <Circle className="w-6 h-6 text-stone-300 transition-colors group-hover:text-stone-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start gap-2">
                        <span className="shrink-0 font-semibold text-stone-800">{req.id}.</span>
                        <p className="leading-relaxed text-stone-500 transition-colors group-hover:text-stone-800">
                          {req.text}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Sub Requirements */}
                  {hasSubReqs && (
                    <div className="ml-10 space-y-3 mt-4">
                      {req.sub_requirements.map((subReq, subIndex) => {
                        const subReqId = subReq.id;
                        const isSubCompleted = rankProgress[subReqId];
                        
                        return (
                          <div
                            key={subIndex}
                            id={`${selectedRankId}-${req.id}-${subReq.id}`}
                            className="flex items-start gap-4 cursor-pointer group"
                            onClick={() => handleToggleRequirement(subReqId)}
                          >
                            <div className="shrink-0 mt-1">
                              {isSubCompleted ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                              ) : (
                                <Circle className="w-5 h-5 text-stone-300 transition-colors group-hover:text-stone-400" />
                              )}
                            </div>
                            <div className="flex-1 flex items-start gap-2">
                              <span className="shrink-0 text-sm font-semibold text-stone-800">{subReq.id}.</span>
                              <p className="text-sm leading-relaxed text-stone-400 transition-colors group-hover:text-stone-600">
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
          <div className={`mt-8 rounded-2xl border border-stone-200 bg-white p-6`}>
            <div className="flex items-center gap-4">
              <CheckCircle2 className={`w-8 h-8 ${RANK_TEXT_COLORS[selectedRankId] || 'text-stone-700'}`} />
              <div>
                <h3 className={`text-xl font-semibold ${RANK_TEXT_COLORS[selectedRankId] || 'text-stone-700'}`}>Congratulations!</h3>
                <p className="text-stone-500">
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
        <div className="mt-6 text-center text-sm text-stone-400">
          <p>Use the Previous/Next buttons to view other ranks and track your progress</p>
        </div>
      </div>
    </div>
  );
}
