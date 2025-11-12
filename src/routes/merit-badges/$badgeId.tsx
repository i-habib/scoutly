import { createFileRoute } from '@tanstack/react-router';
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
        <div className="fixed -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-green-500/10 rounded-full blur-[150px] animate-pulse [animation-delay:2s] pointer-events-none" />
        
        <div className="text-center relative z-10">
          <p className="text-slate-400 text-xl">Merit Badge not found</p>
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
      const hasNumberWord = /\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/i.test(reqText);
      
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

  const handleMarkAllComplete = async () => {
    const currentUserData = await storage.fetchUserData();
    
    if (!currentUserData.progress[badgeId]) {
      currentUserData.progress[badgeId] = {};
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    // Mark all main requirements and sub-requirements as complete
    badge.requirements.forEach((req, reqIndex) => {
      const mainReqId = `req_${reqIndex}`;
      currentUserData.progress[badgeId][mainReqId] = today;
      
      if (req.sub_requirements && req.sub_requirements.length > 0) {
        req.sub_requirements.forEach((_, subIndex) => {
          const subReqId = `req_${reqIndex}_${subIndex}`;
          currentUserData.progress[badgeId][subReqId] = today;
        });
      }
    });
    
    localStorage.setItem('scoutly_user_data', JSON.stringify(currentUserData));
    queryClient.invalidateQueries({ queryKey: ['userData'] });
  };

  const handleClearAllProgress = async () => {
    if (!confirm('Are you sure you want to clear all progress for this merit badge?')) return;
    
    const currentUserData = await storage.fetchUserData();
    currentUserData.progress[badgeId] = {};
    
    localStorage.setItem('scoutly_user_data', JSON.stringify(currentUserData));
    queryClient.invalidateQueries({ queryKey: ['userData'] });
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
        {/* Back Button */}
        <a
          href="/merit-badges"
          className="inline-flex items-center gap-2 text-green-400 hover:text-cyan-300 mb-6 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to Merit Badges
        </a>

        {/* Badge Header */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 mb-6">
          <div className="flex items-start gap-6">
            {/* Badge Image */}
            <div className="shrink-0">
              <div className="w-32 h-32 bg-white/10 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden border-2 border-white/10">
                {'imageUrl' in badge && badge.imageUrl ? (
                  <img 
                    src={badge.imageUrl as string} 
                    alt={badge.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to icon if image fails to load
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <MeritBadgeIcon className="w-16 h-16 text-green-400 hidden" size={64} />
              </div>
              {badge.eagleRequired && (
                <div className="mt-3 px-3 py-1 bg-amber-500/20 border border-amber-500/50 rounded-full text-amber-400 text-xs font-semibold text-center">
                  Eagle Required
                </div>
              )}
            </div>

            {/* Badge Info */}
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-white mb-3">{badge.name}</h1>
              
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Progress</span>
                  <span className="text-green-400 font-semibold">{completionPercentage}%</span>
                </div>
                <div className="w-full h-3 bg-slate-900/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-cyan-500 to-blue-600 transition-all duration-500"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span>{completedCount} / {totalCount} completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Track your progress</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-4">
                {!isFullyCompleted ? (
                  <button
                    onClick={handleMarkAllComplete}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-white text-sm font-medium transition-all flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Mark All Complete
                  </button>
                ) : (
                  <div className="px-4 py-2 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 text-sm font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Badge Complete!
                  </div>
                )}
                {completedCount > 0 && (
                  <button
                    onClick={handleClearAllProgress}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 text-sm font-medium transition-all"
                  >
                    Clear Progress
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Helpful Tip */}
          {'tip' in badge && badge.tip && (
            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-blue-400 font-semibold mb-1">Helpful Tip</h3>
                  <p className="text-gray-300 text-sm">{badge.tip as string}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Requirements */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-green-400" />
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
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:border-slate-600 transition-all"
              >
                <div className="space-y-4">
                  {/* Main Requirement */}
                  <div
                    className="flex items-start gap-4 cursor-pointer group"
                    onClick={() => handleToggleRequirement(`req_${index}`, index)}
                  >
                    <div className="shrink-0 mt-1">
                      {progress[`req_${index}`] ? (
                        <CheckCircle2 className="w-6 h-6 text-green-400" />
                      ) : (
                        <Circle className="w-6 h-6 text-slate-600 group-hover:text-slate-500 transition-colors" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-300 leading-relaxed group-hover:text-white transition-colors">
                        {req.text}
                      </p>
                      
                      {/* Show "X of Y required" if applicable */}
                      {showProgress && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-green-400 font-semibold">{completedSubReqCount}</span>
                            <span className="text-gray-500">/</span>
                            <span className="text-gray-400">{requiredCount} required</span>
                            {requiredCount < totalSubReqs && (
                              <span className="text-gray-500">({totalSubReqs} total)</span>
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
                              <CheckCircle2 className="w-5 h-5 text-blue-400" />
                            ) : (
                              <Circle className="w-5 h-5 text-slate-600 group-hover:text-slate-500 transition-colors" />
                            )}
                          </div>
                          <p className="text-gray-400 text-sm flex-1 leading-relaxed group-hover:text-gray-300 transition-colors">
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
          <div className="mt-8 p-6 bg-linear-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/50 rounded-xl">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
              <div>
                <h3 className="text-xl font-bold text-white">Congratulations!</h3>
                <p className="text-gray-300">You've completed all requirements for {badge.name}. Don't forget to get it signed off!</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
