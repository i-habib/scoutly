import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMemo } from 'react';
import { ArrowLeft, Calendar, Target, Award, Clock, Loader2, TrendingUp } from 'lucide-react';
import { useUserData } from '../hooks/useUserData';
import { RANKS } from '../data/ranks';
import rankReqs from '../data/rank-reqs.json';
import meritBadgesData from '../data/merit-badges.json';
import timeConsumingBadgesData from '../data/time-consuming-badges.json';

const meritBadges = meritBadgesData.meritBadges;
const timeConsumingBadges = timeConsumingBadgesData.timeConsumingBadges;

export const Route = createFileRoute('/timeline')({
  component: TimelinePage,
});

interface TimelineItem {
  id: string;
  title: string;
  description: string;
  estimatedDate: Date;
  type: 'rank' | 'badge' | 'milestone';
  completed: boolean;
  requirementsRemaining: number;
  totalRequirements: number;
}

function TimelinePage() {
  const navigate = useNavigate();
  const { userData } = useUserData();

  // Calculate timeline based on remaining requirements and mandatory waiting periods
  const timeline = useMemo(() => {
    if (!userData) return null;

    const currentRank = userData.profile?.currentRank || 'Scout';
    const targetDate = userData.profile?.targetEagleDate
      ? new Date(userData.profile.targetEagleDate)
      : null;

    if (!targetDate) return null;

    const now = new Date();
    const daysUntilTarget = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilTarget <= 0) return null;

    // Mandatory waiting periods (in months)
    const WAITING_PERIODS = {
      afterFirstClass: {
        star: 4,      // 4 months minimum
        life: 10,     // 6 more months after Star (10 total)
        eagle: 16,    // 6 more months after Life (16 total)
      }
    };

    // Get current rank index - normalize the rank name
    let normalizedCurrentRank = currentRank;
    if (normalizedCurrentRank.startsWith('rank_')) {
      normalizedCurrentRank = normalizedCurrentRank.replace('rank_', '');
    }
    normalizedCurrentRank = normalizedCurrentRank
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    const currentRankIndex = RANKS.findIndex(r => r.name === normalizedCurrentRank);
    
    if (currentRankIndex === -1) {
      console.warn(`Rank not found: ${currentRank} (normalized: ${normalizedCurrentRank}), defaulting to Scout`);
      return null;
    }

    // Calculate First Class index for later use
    const firstClassIndex = RANKS.findIndex(r => r.name === 'First Class');
    const isAlreadyFirstClass = currentRankIndex >= firstClassIndex;
    
    // FIRST: Calculate remaining rank requirements for each phase
    const remainingRanks: TimelineItem[] = [];
    let preFirstClassReqs = 0;
    let starReqs = 0;
    let lifeReqs = 0;
    let eagleReqs = 0;
    
    for (let i = currentRankIndex; i < RANKS.length && RANKS[i].name !== 'Eagle'; i++) {
      const rank = RANKS[i];
      if (!rank) continue;
      
      const rankName = rank.name;
      const rankDataId = `rank_${rank.id}`;
      const rankData = (rankReqs as any[]).find((r: any) => r.id === rankDataId);
      
      if (rankData?.requirements) {
        const requirements = rankData.requirements;
        const rankProgress = userData.rankProgress?.[rankDataId] || {};
        
        let completed = 0;
        requirements.forEach((req: any, reqIndex: number) => {
          const mainReqId = `req_${reqIndex}`;
          const oldMainReqId = req.id;
          
          if (req.sub_requirements && req.sub_requirements.length > 0) {
            const mainCompleted = rankProgress[mainReqId] || rankProgress[oldMainReqId];
            if (mainCompleted) {
              let completedSubReqs = 0;
              req.sub_requirements.forEach((_: any, subIndex: number) => {
                const subReqId = `req_${reqIndex}_${subIndex}`;
                if (rankProgress[subReqId]) {
                  completedSubReqs++;
                }
              });
              
              const requiredCount = req.requiredCount || req.sub_requirements.length;
              if (completedSubReqs >= requiredCount) {
                completed++;
              }
            }
          } else {
            if (rankProgress[mainReqId] || rankProgress[oldMainReqId]) {
              completed++;
            }
          }
        });
        
        const total = requirements.length;
        const remaining = total - completed;
        
        if (remaining > 0) {
          // Categorize requirements by rank
          if (i < firstClassIndex) {
            preFirstClassReqs += remaining;
          } else if (rankName === 'First Class') {
            preFirstClassReqs += remaining;
          } else if (rankName === 'Star') {
            starReqs += remaining;
          } else if (rankName === 'Life') {
            lifeReqs += remaining;
          }
          
          remainingRanks.push({
            id: rankDataId,
            title: rankName,
            description: `${remaining} of ${total} requirements remaining`,
            estimatedDate: now,
            type: 'rank',
            completed: false,
            requirementsRemaining: remaining,
            totalRequirements: total,
          });
        }
        
        console.log(`${rankName}: ${completed}/${total} complete, ${remaining} remaining`);
      }
    }

    // SECOND: Calculate remaining Eagle-required merit badges
    const timeConsumingSet = new Set(timeConsumingBadges);
    const eagleRequired = meritBadges.filter((mb: any) => mb.eagleRequired);
    const remainingBadges: TimelineItem[] = [];
    let totalBadgeReqs = 0;

    eagleRequired.forEach((badge: any) => {
      const badgeProgress = userData.progress?.[badge.id] || {};
      
      let completed = 0;
      const total = badge.requirements?.length || 0;
      
      badge.requirements?.forEach((req: any, reqIndex: number) => {
        if (req.sub_requirements && req.sub_requirements.length > 0) {
          let completedSubReqs = 0;
          req.sub_requirements.forEach((_: any, subIndex: number) => {
            if (badgeProgress[`req_${reqIndex}_${subIndex}`]) {
              completedSubReqs++;
            }
          });
          
          const requiredCount = req.requiredCount || req.sub_requirements.length;
          if (completedSubReqs >= requiredCount) {
            completed++;
          }
        } else {
          if (badgeProgress[`req_${reqIndex}`]) {
            completed++;
          }
        }
      });
      
      const remaining = total - completed;

      if (remaining > 0) {
        totalBadgeReqs += remaining;
        const isTimeConsuming = timeConsumingSet.has(badge.name);
        
        remainingBadges.push({
          id: badge.id,
          title: badge.name,
          description: `${remaining} of ${total} requirements remaining${isTimeConsuming ? ' ⏰' : ''}`,
          estimatedDate: now,
          type: 'badge',
          completed: false,
          requirementsRemaining: remaining,
          totalRequirements: total,
        });
      }
    });

    // Distribute merit badges across phases - used by both branches
    const preFirstClassBadgeReqs = isAlreadyFirstClass ? 0 : Math.ceil(totalBadgeReqs * 0.3);

    // NOW: Calculate milestone dates based on whether already First Class
    let firstClassCompletionDate: Date;
    
    // Calculate total time available (in months)
    const totalMonthsAvailable = daysUntilTarget / 30;
    
    // Key milestone dates
    let starPromotionDate: Date;
    let lifePromotionDate: Date;
    let eagleTargetDate = targetDate;
    
    if (isAlreadyFirstClass) {
      // Already First Class or higher
      firstClassCompletionDate = now;
      
      // Calculate mandatory promotion dates
      starPromotionDate = new Date(firstClassCompletionDate);
      starPromotionDate.setMonth(starPromotionDate.getMonth() + WAITING_PERIODS.afterFirstClass.star);
      
      lifePromotionDate = new Date(firstClassCompletionDate);
      lifePromotionDate.setMonth(lifePromotionDate.getMonth() + WAITING_PERIODS.afterFirstClass.life);
      
      // Eagle must be 16 months after First Class (minimum)
      const earliestEagleDate = new Date(firstClassCompletionDate);
      earliestEagleDate.setMonth(earliestEagleDate.getMonth() + WAITING_PERIODS.afterFirstClass.eagle);
      
      if (targetDate < earliestEagleDate) {
        // Target date is too soon - not enough time for mandatory waiting periods
        console.warn('Target Eagle date is before minimum waiting period (16 months after First Class)');
      }
    } else {
      // Not yet First Class - need to calculate when to achieve First Class
      // Strategy: Find a consistent signoff velocity where:
      // Time for Second Class → First Class = Time for Life → Eagle
      
      // First, let's count requirements for each pre-FC rank
      const tenderfootIndex = RANKS.findIndex(r => r.name === 'Tenderfoot');
      const secondClassIndex = RANKS.findIndex(r => r.name === 'Second Class');
      
      // Get requirements remaining for Second Class and First Class specifically
      let secondClassRemaining = 0;
      let firstClassRemaining = 0;
      
      const secondClassRank = remainingRanks.find(r => r.title === 'Second Class');
      const firstClassRank = remainingRanks.find(r => r.title === 'First Class');
      
      if (secondClassRank) secondClassRemaining = secondClassRank.requirementsRemaining;
      if (firstClassRank) firstClassRemaining = firstClassRank.requirementsRemaining;
      
      const secondToFirstClassReqs = secondClassRemaining + firstClassRemaining;
      
      // Reserve 10 months for Star + Life mandatory waiting
      const starAndLifeWaitingMonths = WAITING_PERIODS.afterFirstClass.life; // 10 months
      const remainingMonthsAfterWaiting = totalMonthsAvailable - starAndLifeWaitingMonths;
      
      if (remainingMonthsAfterWaiting < 2) {
        console.warn('Not enough time to reach Eagle with current target date');
        return null;
      }
      
      // Calculate requirements before Second Class (Scout + Tenderfoot + any remaining from current rank)
      let preSecondClassReqs = 0;
      if (currentRankIndex <= tenderfootIndex) {
        // We need to count all reqs from current rank up to (but not including) Second Class
        for (let i = currentRankIndex; i < secondClassIndex; i++) {
          const rank = remainingRanks.find(r => r.id === `rank_${RANKS[i].id}`);
          if (rank) preSecondClassReqs += rank.requirementsRemaining;
        }
      }
      
      // Now solve for T (the equal time period for Second→First and Life→Eagle)
      // Assuming constant velocity V (reqs/month):
      // preSecondClassReqs / V + secondToFirstClassReqs / V + 10 + lifeToEagleReqs / V = totalMonthsAvailable
      // But we want: secondToFirstClassReqs / V = lifeToEagleReqs / V = T
      // This means: secondToFirstClassReqs = lifeToEagleReqs (for equal time)
      
      // Since we can't change the requirements, we adjust the time split
      // Let velocity V = reqs/month
      // Time for pre-Second = preSecondClassReqs / V
      // Time for Second→First = T
      // Time for Life→Eagle = T
      // So: preSecondClassReqs / V + 2T = remainingMonthsAfterWaiting
      
      // For Second→First: T = secondToFirstClassReqs / V
      // So: V = secondToFirstClassReqs / T
      // Substituting: preSecondClassReqs / (secondToFirstClassReqs / T) + 2T = remainingMonthsAfterWaiting
      // Simplifying: (preSecondClassReqs * T) / secondToFirstClassReqs + 2T = remainingMonthsAfterWaiting
      // Factor out T: T * (preSecondClassReqs / secondToFirstClassReqs + 2) = remainingMonthsAfterWaiting
      // Solve for T: T = remainingMonthsAfterWaiting / (preSecondClassReqs / secondToFirstClassReqs + 2)
      
      const equalPhaseDuration = secondToFirstClassReqs > 0 
        ? remainingMonthsAfterWaiting / ((preSecondClassReqs / secondToFirstClassReqs) + 2)
        : remainingMonthsAfterWaiting / 2;
      
      const preSecondClassDuration = secondToFirstClassReqs > 0
        ? (preSecondClassReqs / secondToFirstClassReqs) * equalPhaseDuration
        : remainingMonthsAfterWaiting / 2;
      
    // Calculate milestone dates
      const secondClassDate = new Date(now);
      secondClassDate.setMonth(secondClassDate.getMonth() + preSecondClassDuration);
      
      firstClassCompletionDate = new Date(secondClassDate);
      firstClassCompletionDate.setMonth(firstClassCompletionDate.getMonth() + equalPhaseDuration);
      
      // Calculate mandatory promotion dates from First Class
      starPromotionDate = new Date(firstClassCompletionDate);
      starPromotionDate.setMonth(starPromotionDate.getMonth() + WAITING_PERIODS.afterFirstClass.star);
      
      lifePromotionDate = new Date(firstClassCompletionDate);
      lifePromotionDate.setMonth(lifePromotionDate.getMonth() + WAITING_PERIODS.afterFirstClass.life);
      
      // Store Second Class date for display
      const shouldShowSecondClass = currentRankIndex < secondClassIndex;
      
      // Verify the math
      console.log('Timeline calculation:', {
        totalMonths: totalMonthsAvailable.toFixed(1),
        remainingAfterWaiting: remainingMonthsAfterWaiting.toFixed(1),
        preSecondClassReqs,
        secondToFirstClassReqs,
        preSecondClassDuration: preSecondClassDuration.toFixed(1),
        equalPhaseDuration: equalPhaseDuration.toFixed(1),
        secondClassDate: shouldShowSecondClass ? secondClassDate.toLocaleDateString() : 'N/A',
        firstClassDate: firstClassCompletionDate.toLocaleDateString(),
        starDate: starPromotionDate.toLocaleDateString(),
        lifeDate: lifePromotionDate.toLocaleDateString(),
        targetDate: targetDate.toLocaleDateString(),
      });
      
      // Calculate meetings per month (use events data)
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const recentMeetings = (userData.events || []).filter((event: any) => {
        const eventDate = new Date(event.startTime || event.date);
        return eventDate >= thirtyDaysAgo && eventDate <= now && event.type === 'meeting';
      });
      const meetingsPerMonth = recentMeetings.length > 0 ? recentMeetings.length : 4;
      
      // Calculate total signoffs needed
      const totalSignoffsNeeded = preSecondClassReqs + secondToFirstClassReqs + starReqs + lifeReqs + eagleReqs;
      
      // Calculate individual rank deadlines with velocity-based progression
      const rankDeadlines: { [key: string]: Date | null } = {};
      let cumulativeTime = 0; // in months
      let cumulativeReqs = 0;
      
      // Calculate velocity (reqs/month) based on our phase calculations
      const velocity = preSecondClassDuration > 0 ? preSecondClassReqs / preSecondClassDuration : 0;
      
      // For each rank before First Class, calculate when it should be completed
      for (let i = currentRankIndex; i <= firstClassIndex; i++) {
        const rank = RANKS[i];
        if (!rank) continue;
        
        const rankName = rank.name;
        const rankData = remainingRanks.find(r => r.title === rankName);
        
        if (rankData && rankData.requirementsRemaining > 0) {
          cumulativeReqs += rankData.requirementsRemaining;
          
          // Calculate time needed for this rank based on velocity
          let timeNeeded = 0;
          if (i < secondClassIndex) {
            // Pre-Second Class phase uses preSecondClassDuration velocity
            timeNeeded = velocity > 0 ? rankData.requirementsRemaining / velocity : 0;
          } else {
            // Second Class to First Class uses equalPhaseDuration velocity
            const secondToFirstVelocity = equalPhaseDuration > 0 ? secondToFirstClassReqs / equalPhaseDuration : 0;
            timeNeeded = secondToFirstVelocity > 0 ? rankData.requirementsRemaining / secondToFirstVelocity : 0;
          }
          
          cumulativeTime += timeNeeded;
          
          const deadline = new Date(now);
          deadline.setMonth(deadline.getMonth() + cumulativeTime);
          rankDeadlines[rankName] = deadline;
        } else if (i >= currentRankIndex) {
          // Already completed this rank or no requirements
          rankDeadlines[rankName] = null;
        }
      }
      
      // Add post-First Class ranks (Star, Life, Eagle)
      rankDeadlines['Star'] = starPromotionDate;
      rankDeadlines['Life'] = lifePromotionDate;
      rankDeadlines['Eagle'] = eagleTargetDate;
      
      // Calculate phase days
      const starPhaseDays = Math.ceil((starPromotionDate.getTime() - firstClassCompletionDate.getTime()) / (1000 * 60 * 60 * 24));
      const lifePhaseDays = Math.ceil((lifePromotionDate.getTime() - starPromotionDate.getTime()) / (1000 * 60 * 60 * 24));
      const eaglePhaseDays = Math.ceil((eagleTargetDate.getTime() - lifePromotionDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Calculate badge distribution for Star/Life/Eagle phases
      const starBadgeReqsPhase = Math.ceil(totalBadgeReqs * 0.1);
      const lifeBadgeReqsPhase = Math.ceil(totalBadgeReqs * 0.1);
      const eagleBadgeReqsPhase = totalBadgeReqs - starBadgeReqsPhase - lifeBadgeReqsPhase;
      
      const starTotal = starReqs + starBadgeReqsPhase;
      const lifeTotal = lifeReqs + lifeBadgeReqsPhase;
      const eagleTotal = eagleReqs + eagleBadgeReqsPhase;
      
      // Return milestone data including Second Class
      return {
        totalSignoffsNeeded,
        meetingsPerMonth,
        rankDeadlines,
        milestones: {
          now: now,
          secondClass: shouldShowSecondClass ? secondClassDate : null,
          firstClass: firstClassCompletionDate,
          star: starPromotionDate,
          life: lifePromotionDate,
          eagle: eagleTargetDate,
        },
        phases: {
          preSecondClass: shouldShowSecondClass ? {
            signoffs: preSecondClassReqs,
            days: Math.ceil((secondClassDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
            signoffsPerMonth: (preSecondClassReqs / preSecondClassDuration).toFixed(1),
          } : null,
          secondToFirst: {
            signoffs: secondToFirstClassReqs,
            days: Math.ceil((firstClassCompletionDate.getTime() - secondClassDate.getTime()) / (1000 * 60 * 60 * 24)),
            signoffsPerMonth: (secondToFirstClassReqs / equalPhaseDuration).toFixed(1),
          },
          star: {
            signoffs: starTotal,
            days: starPhaseDays,
            signoffsPerMonth: (starTotal / (starPhaseDays / 30)).toFixed(1),
            isWaitingPeriod: starTotal === 0,
          },
          life: {
            signoffs: lifeTotal,
            days: lifePhaseDays,
            signoffsPerMonth: (lifeTotal / (lifePhaseDays / 30)).toFixed(1),
            isWaitingPeriod: lifeTotal === 0,
          },
          eagle: {
            signoffs: eagleTotal,
            days: eaglePhaseDays,
            signoffsPerMonth: (eagleTotal / (eaglePhaseDays / 30)).toFixed(1),
          },
        },
        isAlreadyFirstClass,
        remainingRanks,
        remainingBadges,
        velocityBasedTimeline: true,
      };
    }
    
    // FOR ALREADY FIRST CLASS: Use old simple distribution logic
    // Distribute merit badges across phases (majority in Eagle phase since that's the longest wait)
    const starBadgeReqsOld = Math.ceil(totalBadgeReqs * 0.1);
    const lifeBadgeReqsOld = Math.ceil(totalBadgeReqs * 0.1);
    const eagleBadgeReqsOld = totalBadgeReqs - preFirstClassBadgeReqs - starBadgeReqsOld - lifeBadgeReqsOld;

    // Calculate total signoffs for each phase
    const preFirstClassTotalOld = preFirstClassReqs + preFirstClassBadgeReqs;
    const starTotalOld = starReqs + starBadgeReqsOld;
    const lifeTotalOld = lifeReqs + lifeBadgeReqsOld;
    const eagleTotalOld = eagleReqs + eagleBadgeReqsOld;
    
    const totalSignoffsNeededOld = preFirstClassTotalOld + starTotalOld + lifeTotalOld + eagleTotalOld;

    // Calculate time periods for each phase
    const preFirstClassDaysOld = isAlreadyFirstClass ? 0 : Math.ceil((firstClassCompletionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const starPhaseDaysOld = Math.ceil((starPromotionDate.getTime() - firstClassCompletionDate.getTime()) / (1000 * 60 * 60 * 24));
    const lifePhaseDaysOld = Math.ceil((lifePromotionDate.getTime() - starPromotionDate.getTime()) / (1000 * 60 * 60 * 24));
    const eaglePhaseDaysOld = Math.ceil((eagleTargetDate.getTime() - lifePromotionDate.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate meetings per month (use events data)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentMeetings = (userData.events || []).filter((event: any) => {
      const eventDate = new Date(event.startTime || event.date);
      return eventDate >= thirtyDaysAgo && eventDate <= now && event.type === 'meeting';
    });
    const meetingsPerMonthOld = recentMeetings.length > 0 ? recentMeetings.length : 4;

    // Calculate rank deadlines for already First Class (simple)
    const rankDeadlinesOld: { [key: string]: Date | null } = {
      'Scout': null,
      'Tenderfoot': null,
      'Second Class': null,
      'First Class': firstClassCompletionDate,
      'Star': starPromotionDate,
      'Life': lifePromotionDate,
      'Eagle': eagleTargetDate,
    };

    // Return key milestone data (old logic for already First Class)
    return {
      totalSignoffsNeeded: totalSignoffsNeededOld,
      meetingsPerMonth: meetingsPerMonthOld,
      rankDeadlines: rankDeadlinesOld,
      milestones: {
        now: now,
        firstClass: firstClassCompletionDate,
        star: starPromotionDate,
        life: lifePromotionDate,
        eagle: eagleTargetDate,
      },
      phases: {
        preFirstClass: {
          signoffs: preFirstClassTotalOld,
          days: preFirstClassDaysOld,
          signoffsPerMonth: preFirstClassDaysOld > 0 ? (preFirstClassTotalOld / (preFirstClassDaysOld / 30)).toFixed(1) : '0',
        },
        star: {
          signoffs: starTotalOld,
          days: starPhaseDaysOld,
          signoffsPerMonth: (starTotalOld / (starPhaseDaysOld / 30)).toFixed(1),
          isWaitingPeriod: starTotalOld === 0,
        },
        life: {
          signoffs: lifeTotalOld,
          days: lifePhaseDaysOld,
          signoffsPerMonth: (lifeTotalOld / (lifePhaseDaysOld / 30)).toFixed(1),
          isWaitingPeriod: lifeTotalOld === 0,
        },
        eagle: {
          signoffs: eagleTotalOld,
          days: eaglePhaseDaysOld,
          signoffsPerMonth: (eagleTotalOld / (eaglePhaseDaysOld / 30)).toFixed(1),
        },
      },
      isAlreadyFirstClass,
      remainingRanks,
      remainingBadges,
    };
  }, [userData]);

  if (!userData) {
    return (
      <div className="bg-black min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  const targetDate = userData.profile?.targetEagleDate
    ? new Date(userData.profile.targetEagleDate)
    : null;

  const daysUntilEagle = targetDate
    ? Math.ceil((targetDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  if (!targetDate) {
    return (
      <div className="bg-black min-h-screen">
        <div
          className="fixed inset-0 z-0"
          style={{
            backgroundImage: 'radial-gradient(#0b3b12 1px, transparent 1px)',
            backgroundSize: '14px 14px',
          }}
        />
        <div className="relative z-10 max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate({ to: '/' })}
              className="flex items-center gap-2 text-green-400 hover:text-green-300 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </button>
          </div>
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-12 text-center">
            <Target className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Set Your Eagle Target Date</h2>
            <p className="text-slate-400 mb-6">
              Go to your profile to set a target Eagle Scout date to see your personalized timeline.
            </p>
            <button
              onClick={() => navigate({ to: '/profile' })}
              className="px-6 py-3 bg-linear-to-r from-green-500 to-cyan-600 text-black font-bold rounded-xl hover:shadow-lg transition-all"
            >
              Go to Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black text-white min-h-screen">
      {/* Dotted Background */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: 'radial-gradient(#0b3b12 1px, transparent 1px)',
          backgroundSize: '14px 14px',
        }}
      />
      {/* Gradient Glow */}
      <div className="fixed -top-1/4 -left-1/4 w-1/2 h-1/2 bg-green-500/10 rounded-full blur-[150px] animate-pulse pointer-events-none" />
      <div className="fixed -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-cyan-500/10 rounded-full blur-[150px] animate-pulse [animation-delay:2s] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate({ to: '/' })}
            className="flex items-center gap-2 text-green-400 hover:text-green-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
        </div>

        {/* Hero Section */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-8 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-linear-to-br from-green-500 to-cyan-600 rounded-xl">
              <TrendingUp className="w-8 h-8 text-black" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Eagle Scout Timeline</h1>
              <p className="text-green-300">Your personalized path to achievement</p>
            </div>
          </div>

          {targetDate && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-black/30 rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-5 h-5 text-green-400" />
                  <span className="text-sm text-slate-400">Target Date</span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>

              <div className="bg-black/30 rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-cyan-400" />
                  <span className="text-sm text-slate-400">Days Remaining</span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {daysUntilEagle && daysUntilEagle > 0 ? daysUntilEagle : '—'}
                </p>
              </div>

              <div className="bg-black/30 rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-5 h-5 text-yellow-400" />
                  <span className="text-sm text-slate-400">Current Rank</span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {userData.profile?.currentRank || 'Scout'}
                </p>
              </div>

              <div className="bg-black/30 rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                  <span className="text-sm text-slate-400">Signoffs Needed</span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {timeline?.totalSignoffsNeeded || '—'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Timeline Stats */}
        {timeline && (
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-green-500" />
              Key Milestone Dates
            </h2>
            
            {/* Milestone Timeline */}
            <div className="space-y-3 mb-6">
              {!timeline.isAlreadyFirstClass && (
                <div className="flex items-center justify-between p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div>
                    <p className="text-sm text-blue-300 font-semibold">First Class Promotion</p>
                    <p className="text-xs text-slate-400">Complete all pre-First Class requirements</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-blue-400">
                      {timeline.milestones.firstClass.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <p className="text-xs text-slate-400">
                      {(timeline.phases.preFirstClass as any)?.signoffs || 0} signoffs needed
                    </p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <div>
                  <p className="text-sm text-purple-300 font-semibold">⭐ Star Rank Promotion</p>
                  <p className="text-xs text-slate-400">Minimum 4 months after First Class</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-purple-400">
                    {timeline.milestones.star.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-slate-400">
                    {timeline.phases.star.signoffs} signoffs during this phase
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                <div>
                  <p className="text-sm text-cyan-300 font-semibold">❤️ Life Rank Promotion</p>
                  <p className="text-xs text-slate-400">Minimum 6 months after Star (10 total)</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-cyan-400">
                    {timeline.milestones.life.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-slate-400">
                    {timeline.phases.life.signoffs} signoffs during this phase
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <div>
                  <p className="text-sm text-yellow-300 font-semibold">🦅 Eagle Scout</p>
                  <p className="text-xs text-slate-400">Minimum 6 months after Life (16 total)</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-yellow-400">
                    {timeline.milestones.eagle.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-slate-400">
                    {timeline.phases.eagle.signoffs} signoffs during this phase
                  </p>
                </div>
              </div>
            </div>

            {/* All Rank Deadlines */}
            <div className="border-t border-white/10 pt-6 mt-6">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <Award className="w-5 h-5 text-green-500" />
                All Rank Progression Deadlines
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {Object.entries(timeline.rankDeadlines).map(([rankName, deadline]) => {
                  if (!deadline) return null;
                  
                  const rankColors: { [key: string]: string } = {
                    'Scout': 'text-gray-400 border-gray-500/30 bg-gray-500/10',
                    'Tenderfoot': 'text-green-400 border-green-500/30 bg-green-500/10',
                    'Second Class': 'text-blue-400 border-blue-500/30 bg-blue-500/10',
                    'First Class': 'text-blue-500 border-blue-600/30 bg-blue-600/10',
                    'Star': 'text-purple-400 border-purple-500/30 bg-purple-500/10',
                    'Life': 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
                    'Eagle': 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
                  };
                  
                  const colorClass = rankColors[rankName] || 'text-white border-white/30 bg-white/10';
                  
                  return (
                    <div key={rankName} className={`rounded-lg p-3 border ${colorClass}`}>
                      <p className="text-xs text-slate-300 mb-1">{rankName}</p>
                      <p className="text-sm font-bold">
                        {deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {Math.ceil((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Phase Breakdown */}
            <div className="border-t border-white/10 pt-4">
              <h3 className="text-lg font-semibold text-white mb-3">Pace Per Phase</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {!timeline.isAlreadyFirstClass && timeline.phases.preFirstClass && (
                  <div className="bg-black/30 rounded-lg p-3 border border-white/10">
                    <p className="text-xs text-slate-400 mb-1">Pre-First Class</p>
                    <p className="text-2xl font-bold text-blue-400">{(timeline.phases.preFirstClass as any).signoffsPerMonth}</p>
                    <p className="text-xs text-slate-500">signoffs/month</p>
                  </div>
                )}
                <div className="bg-black/30 rounded-lg p-3 border border-white/10">
                  <p className="text-xs text-slate-400 mb-1">Star Phase</p>
                  <p className="text-2xl font-bold text-purple-400">{timeline.phases.star.signoffsPerMonth}</p>
                  <p className="text-xs text-slate-500">signoffs/month</p>
                </div>
                <div className="bg-black/30 rounded-lg p-3 border border-white/10">
                  <p className="text-xs text-slate-400 mb-1">Life Phase</p>
                  <p className="text-2xl font-bold text-cyan-400">{timeline.phases.life.signoffsPerMonth}</p>
                  <p className="text-xs text-slate-500">signoffs/month</p>
                </div>
                <div className="bg-black/30 rounded-lg p-3 border border-white/10">
                  <p className="text-xs text-slate-400 mb-1">Eagle Phase</p>
                  <p className="text-2xl font-bold text-yellow-400">{timeline.phases.eagle.signoffsPerMonth}</p>
                  <p className="text-xs text-slate-500">signoffs/month</p>
                </div>
              </div>
            </div>

            <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-sm text-green-300">
                🎯 <strong>Strategic Timeline:</strong> This plan accounts for mandatory waiting periods.
                {!timeline.isAlreadyFirstClass && ` Reach First Class by ${timeline.milestones.firstClass.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}, then`}
                {' '}complete Star and Life requirements during their waiting periods to reach Eagle on schedule.
              </p>
            </div>
          </div>
        )}

        {/* Requirements Summary */}
        {timeline && (timeline.remainingRanks.length > 0 || timeline.remainingBadges.length > 0) && (
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <TrendingUp className="w-7 h-7 text-green-500" />
              Requirements Breakdown
            </h2>

            {/* Remaining Ranks */}
            {timeline.remainingRanks.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">Rank Requirements</h3>
                <div className="space-y-2">
                  {timeline.remainingRanks.map((rank) => (
                    <div
                      key={rank.id}
                      className="flex items-center justify-between p-4 bg-black/40 border border-white/10 rounded-lg hover:border-yellow-500/50 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <Award className="w-5 h-5 text-yellow-400" />
                        <div>
                          <p className="text-white font-medium">{rank.title}</p>
                          <p className="text-sm text-slate-400">{rank.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-yellow-400">{rank.requirementsRemaining}</p>
                        <p className="text-xs text-slate-500">remaining</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Remaining Merit Badges */}
            {timeline.remainingBadges.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Eagle-Required Merit Badges</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {timeline.remainingBadges.map((badge) => (
                    <div
                      key={badge.id}
                      className="flex items-center justify-between p-3 bg-black/40 border border-white/10 rounded-lg hover:border-blue-500/50 transition-all"
                    >
                      <div>
                        <p className="text-white font-medium text-sm">{badge.title}</p>
                        <p className="text-xs text-slate-400">{badge.description}</p>
                      </div>
                      <div className="text-right ml-3">
                        <p className="text-lg font-bold text-blue-400">{badge.requirementsRemaining}</p>
                        <p className="text-[10px] text-slate-500">reqs</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
