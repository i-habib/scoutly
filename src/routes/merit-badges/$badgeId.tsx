import { createFileRoute, Link } from '@tanstack/react-router';
import { CheckCircle2, Circle, ChevronLeft, Calendar, BookOpen, Lightbulb } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useUserData } from '../../hooks/useUserData';
import meritBadgesData from '../../data/merit-badges.json';
import * as storage from '../../services/storageService';
import { MeritBadgeIcon } from '../../components/ScoutIcons';

export const Route = createFileRoute('/merit-badges/$badgeId')({
  component: MeritBadgeDetail,
});

function MeritBadgeDetail() {
  const { badgeId } = Route.useParams();
  const { userData } = useUserData();
  const queryClient = useQueryClient();
  
  const badge = meritBadgesData.meritBadges.find((b) => b.id === badgeId);
  
  if (!badge) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center">
        <div className="text-center relative z-10">
          <p className="text-xl text-slate-500">Merit Badge not found</p>
        </div>
      </div>
    );
  }

  const progress = userData?.progress?.[badgeId] || {};
  
  // Smart counting: calculate total based on requiredCount
  const totalCount = badge.requirements.reduce((acc, req) => {
    return acc + (req.requiredCount || 1);
  }, 0);
  
  // Count completed items (main requirements + their completed sub-requirements)
  let completedCount = 0;
  badge.requirements.forEach((req, reqIndex) => {
    const mainReqId = `req_${reqIndex}`;
    
    if (req.sub_requirements && req.sub_requirements.length > 0) {
      // Count completed sub-requirements
      let completedSubReqs = 0;
      req.sub_requirements.forEach((_, subIndex) => {
        const subReqId = `req_${reqIndex}_${subIndex}`;
        if (progress[subReqId]) completedSubReqs++;
      });
      
      // Add minimum of completed or required count
      completedCount += Math.min(completedSubReqs, req.requiredCount || req.sub_requirements.length);
    } else {
      // Simple requirement
      if (progress[mainReqId]) completedCount++;
    }
  });
  
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isFullyCompleted = completionPercentage === 100;

  // Gather all requirement IDs for this badge
  function allRequirementIds(): string[] {
    const ids: string[] = [];
    badge!.requirements.forEach((req: any, ri: number) => {
      const mainId = `req_${ri}`;
      ids.push(mainId);
      if (req.sub_requirements && req.sub_requirements.length > 0) {
        req.sub_requirements.forEach((_: any, si: number) => {
          ids.push(`req_${ri}_${si}`);
        });
      }
    });
    return ids;
  }

  const handleToggleAll = async () => {
    const currentUserData = await storage.fetchUserData();
    if (!currentUserData.progress[badgeId]) {
      currentUserData.progress[badgeId] = {};
    }
    const mark = !isFullyCompleted;
    const dateStr = new Date().toISOString().split('T')[0];
    const ids = allRequirementIds();
    ids.forEach(id => {
      currentUserData.progress[badgeId][id] = mark ? dateStr : null;
    });
    // Ensure parent requirements reflect requiredCount logic when marking all
    if (mark) {
      badge!.requirements.forEach((req: any, ri: number) => {
        const parentId = `req_${ri}`;
        if (req.sub_requirements && req.sub_requirements.length > 0) {
          currentUserData.progress[badgeId][parentId] = dateStr;
        }
      });
    }
    localStorage.setItem('scoutly_user_data', JSON.stringify(currentUserData));
    queryClient.invalidateQueries({ queryKey: ['userData'] });
  };

  const handleToggleRequirement = async (reqId: string, reqIndex?: number, isSubReq?: boolean) => {
    const isCompleted = progress[reqId];
    const newCompletedDate = isCompleted ? null : new Date().toISOString().split('T')[0];
    
    // Get the current user data directly from localStorage to batch updates
    const currentUserData = await storage.fetchUserData();
    
    // Initialize progress for this badge if it doesn't exist
    if (!currentUserData.progress[badgeId]) {
      currentUserData.progress[badgeId] = {};
    }
    
    // Update the clicked requirement
    currentUserData.progress[badgeId][reqId] = newCompletedDate;
    
    // If this is a main requirement with sub-requirements, handle auto-checking children
    if (!isSubReq && reqIndex !== undefined && badge.requirements[reqIndex]) {
      const requirement = badge.requirements[reqIndex];
      const hasSubReqs = requirement.sub_requirements && requirement.sub_requirements.length > 0;
      const reqText = requirement.text.toLowerCase();
      
      // If this requirement doesn't specify a number (ONE, TWO, THREE, etc.), auto-check all
      const hasNumberWord = /\b(one|two|three|four|five)\b/i.test(reqText);
      
      if (hasSubReqs && !hasNumberWord) {
        // Update all sub-requirements
        requirement.sub_requirements.forEach((_, subIndex) => {
          const subReqId = `req_${reqIndex}_${subIndex}`;
          currentUserData.progress[badgeId][subReqId] = newCompletedDate;
        });
      }
    }
    
    // If this is a sub-requirement, check if parent should be auto-checked
    if (isSubReq && reqIndex !== undefined && badge.requirements[reqIndex]) {
      const requirement = badge.requirements[reqIndex];
      const parentReqId = `req_${reqIndex}`;
      const requiredCount = requirement.requiredCount || requirement.sub_requirements.length;
      
      // Count how many sub-requirements will be completed after this update
      let completedSubReqs = 0;
      requirement.sub_requirements.forEach((_, subIndex) => {
        const subReqId = `req_${reqIndex}_${subIndex}`;
        // Check if this sub-requirement will be completed
        if (currentUserData.progress[badgeId][subReqId]) {
          completedSubReqs++;
        }
      });
      
      // Auto-check parent if we've met the required count
      if (completedSubReqs >= requiredCount && newCompletedDate) {
        currentUserData.progress[badgeId][parentReqId] = newCompletedDate;
      } else if (completedSubReqs < requiredCount) {
        // Uncheck parent if we're now below required count
        currentUserData.progress[badgeId][parentReqId] = null;
      }
    }
    
    // Save all updates at once
    localStorage.setItem('scoutly_user_data', JSON.stringify(currentUserData));
    
    // Invalidate the query to refresh the UI
    queryClient.invalidateQueries({ queryKey: ['userData'] });
  };

  return (
    <div className="app-shell">
      <div className="app-shell__grid fixed inset-0" />
      <div className="app-shell__glow app-shell__glow--top fixed" />
      <div className="app-shell__glow app-shell__glow--bottom fixed" />

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-8">
        {/* Back Button */}
        <Link
          to="/merit-badges/"
          className="mb-6 inline-flex items-center gap-2 text-emerald-700 transition-colors hover:text-sky-700"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to Merit Badges
        </Link>

        {/* Badge Header */}
        <div className="app-surface mb-6 rounded-3xl p-8">
          <div className="flex items-start gap-6">
            {/* Badge Image */}
            <div className="shrink-0">
              <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-3xl border-2 border-slate-200 bg-white shadow-sm">
                {'imageUrl' in badge && badge.imageUrl ? (
                  <img 
                    src={badge.imageUrl as string} 
                    alt={badge.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      // Fallback to icon if image fails to load
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <MeritBadgeIcon className="hidden h-16 w-16 text-emerald-600" size={64} />
              </div>
              {badge.eagleRequired && (
                <div className="mt-3 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-center text-xs font-semibold text-amber-700">
                  Eagle Required
                </div>
              )}
            </div>

            {/* Badge Info */}
            <div className="flex-1">
              <h1 className="mb-3 text-4xl font-bold text-slate-950">{badge.name}</h1>
              
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-500">Progress</span>
                  <span className="font-semibold text-emerald-700">{completionPercentage}%</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full bg-linear-to-r from-emerald-500 to-sky-600 transition-all duration-500"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
                <button
                  onClick={handleToggleAll}
                  className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 transition-colors hover:bg-slate-50"
                >
                  {isFullyCompleted ? 'Unmark All' : 'Mark All Complete'}
                </button>
              </div>

              <div className="flex items-center gap-4 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{completedCount} / {totalCount} completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Track your progress</span>
                </div>
              </div>

              {/* Completion Status */}
              {isFullyCompleted && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
                    <CheckCircle2 className="w-4 h-4" />
                    Badge Complete!
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Helpful Tip */}
          {'tip' in badge && badge.tip && (
            <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 p-4">
              <div className="flex items-start gap-3">
                <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
                <div>
                  <h3 className="mb-1 font-semibold text-sky-700">Helpful Tip</h3>
                  <p className="text-sm text-slate-600">{badge.tip as string}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Requirements */}
        <div className="space-y-4">
          <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-slate-950">
            <BookOpen className="w-6 h-6 text-emerald-600" />
            Requirements
          </h2>

          {badge.requirements.map((req, index) => {
            const hasSubReqs = req.sub_requirements && req.sub_requirements.length > 0;
            const requiredCount = req.requiredCount || (hasSubReqs ? req.sub_requirements.length : 1);
            const totalSubReqs = req.sub_requirements?.length || 0;
            
            // Count completed sub-requirements for this requirement
            let completedSubReqCount = 0;
            if (hasSubReqs) {
              req.sub_requirements.forEach((_, subIndex) => {
                if (progress[`req_${index}_${subIndex}`]) completedSubReqCount++;
              });
            }
            
            const showProgress = hasSubReqs && requiredCount < totalSubReqs;
            
            return (
              <div
                key={index}
                className="app-surface rounded-2xl p-6 transition-all hover:border-slate-300"
              >
                <div className="space-y-4">
                  {/* Main Requirement */}
                  <div
                    className="flex items-start gap-4 cursor-pointer group"
                    onClick={() => handleToggleRequirement(`req_${index}`, index)}
                  >
                    <div className="shrink-0 mt-1">
                      {progress[`req_${index}`] ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                      ) : (
                        <Circle className="w-6 h-6 text-slate-300 transition-colors group-hover:text-slate-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="leading-relaxed text-slate-600 transition-colors group-hover:text-slate-900">
                        {req.text}
                      </p>
                      
                      {/* Show "X of Y required" if applicable */}
                      {showProgress && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="font-semibold text-emerald-700">{completedSubReqCount}</span>
                            <span className="text-slate-400">/</span>
                            <span className="text-slate-500">{requiredCount} required</span>
                            {requiredCount < totalSubReqs && (
                              <span className="text-slate-400">({totalSubReqs} total)</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sub Requirements */}
                  {hasSubReqs && (
                    <div className="ml-10 space-y-3 mt-4">
                      {req.sub_requirements.map((subReq, subIndex) => (
                        <div
                          key={subIndex}
                          className="flex items-start gap-3 cursor-pointer group"
                          onClick={() => handleToggleRequirement(`req_${index}_${subIndex}`, index, true)}
                        >
                          <div className="shrink-0 mt-1">
                            {progress[`req_${index}_${subIndex}`] ? (
                              <CheckCircle2 className="w-5 h-5 text-sky-600" />
                            ) : (
                              <Circle className="w-5 h-5 text-slate-300 transition-colors group-hover:text-slate-500" />
                            )}
                          </div>
                          <p className="flex-1 text-sm leading-relaxed text-slate-500 transition-colors group-hover:text-slate-700">
                            {subReq}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Completion Message */}
        {completionPercentage === 100 && (
          <div className="mt-8 rounded-3xl border border-emerald-200 bg-linear-to-r from-emerald-50 to-sky-50 p-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              <div>
                <h3 className="text-xl font-bold text-slate-950">Congratulations!</h3>
                <p className="text-slate-600">You've completed all requirements for {badge.name}. Don't forget to get it signed off!</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
