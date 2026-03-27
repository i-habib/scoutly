import meritBadgesJSON from '../data/merit-badges.json';
import rankRequirementsData from '../data/rank-reqs.json';
import type { UserData } from '../data/userData';
import { RANK_ORDER, getRankDisplayName, normalizeRankId, type RankOrderId } from './constants';
import { computeBadgeProgressByMeta, countEagleRequiredCompleted, splitEagleRequiredByStatus } from './progress';

export type FocusTrack = 'signoffs' | 'meritBadges';

export interface FocusSignoffItem {
  id: string;
  label: string;
}

export interface FocusBadgeItem {
  id: string;
  name: string;
  percentage: number;
  state: 'inProgress' | 'notStarted';
}

export function getWorkingRankId(currentRankId: string | null | undefined): RankOrderId {
  const normalized = normalizeRankId(currentRankId || 'rank_scout') as RankOrderId;
  const currentIndex = RANK_ORDER.indexOf(normalized);

  if (currentIndex < 0) {
    return 'rank_tenderfoot';
  }

  if (currentIndex >= RANK_ORDER.length - 1) {
    return 'rank_eagle';
  }

  return RANK_ORDER[currentIndex + 1];
}

export function getFocusTrackForRank(rankId: string): FocusTrack {
  const normalized = normalizeRankId(rankId);
  return ['rank_tenderfoot', 'rank_second_class', 'rank_first_class'].includes(normalized)
    ? 'signoffs'
    : 'meritBadges';
}

export function getUserFocusTrack(userData: UserData): FocusTrack {
  return getFocusTrackForRank(getWorkingRankId(userData.profile.currentRank));
}

export function getRankProgressSummary(userData: UserData, rankId: string) {
  const normalized = normalizeRankId(rankId);
  const rankData = rankRequirementsData.find((rank) => rank.id === normalized);

  if (!rankData) {
    return {
      rankId: normalized,
      rankName: getRankDisplayName(normalized),
      total: 0,
      completed: 0,
      progress: 0,
      remaining: [] as FocusSignoffItem[],
    };
  }

  const rankProgress = userData.rankProgress?.[normalized] || {};
  const remaining: FocusSignoffItem[] = [];
  let total = 0;
  let completed = 0;

  rankData.requirements.forEach((requirement, reqIndex) => {
    const mainReqId = `req_${reqIndex}`;
    total += 1;

    if (rankProgress[mainReqId]) {
      completed += 1;
    } else {
      remaining.push({
        id: mainReqId,
        label: `${requirement.id}. ${requirement.text}`,
      });
    }

    if (requirement.sub_requirements && requirement.sub_requirements.length > 0) {
      requirement.sub_requirements.forEach((subRequirement, subIndex) => {
        const subReqId = `req_${reqIndex}_${subIndex}`;
        total += 1;

        if (rankProgress[subReqId]) {
          completed += 1;
        } else {
          remaining.push({
            id: subReqId,
            label: `${subRequirement.id}. ${subRequirement.text}`,
          });
        }
      });
    }
  });

  return {
    rankId: normalized,
    rankName: rankData.name,
    total,
    completed,
    progress: total > 0 ? Math.round((completed / total) * 100) : 0,
    remaining,
  };
}

export function getMeritBadgeFocusSummary(userData: UserData) {
  const { completed, inProgress, notStarted } = splitEagleRequiredByStatus(userData);
  const recommended: FocusBadgeItem[] = [
    ...[...inProgress]
      .sort((left, right) => right.percentage - left.percentage)
      .map((badge) => ({
        id: badge.id,
        name: badge.name,
        percentage: badge.percentage,
        state: 'inProgress' as const,
      })),
    ...notStarted.slice(0, 6).map((badge) => ({
      id: badge.id,
      name: badge.name,
      percentage: badge.percentage,
      state: 'notStarted' as const,
    })),
  ];

  const requiredBadges = meritBadgesJSON.meritBadges.filter((badge) => badge.eagleRequired);
  const remainingRequirements = requiredBadges.reduce((sum, badge) => {
    const { total, completed: completedCount } = computeBadgeProgressByMeta(
      badge,
      userData.progress?.[badge.id],
    );

    return sum + Math.max(0, total - completedCount);
  }, 0);

  return {
    completedRequiredCount: countEagleRequiredCompleted(userData),
    inProgressCount: inProgress.length,
    notStartedCount: notStarted.length,
    remainingRequirements,
    recommended: recommended.slice(0, 4),
  };
}

export function getSignoffPaceSummary(userData: UserData) {
  const workingRankId = getWorkingRankId(userData.profile.currentRank);
  const progress = getRankProgressSummary(userData, workingRankId);
  const remainingCount = Math.max(0, progress.total - progress.completed);
  const targetDate = userData.profile.targetEagleDate
    ? new Date(userData.profile.targetEagleDate)
    : null;

  if (!targetDate) {
    return `You have ${remainingCount} signoff${remainingCount === 1 ? '' : 's'} left for ${progress.rankName}. Add a target Eagle date to estimate pacing.`;
  }

  const today = new Date();
  const daysRemaining = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysRemaining <= 0) {
    return 'Your target date has already passed. Update the goal to rebuild a realistic signoff pace.';
  }

  const meetingsPerMonth = userData.profile.meetingsPerMonthOverride || 4;
  const monthsRemaining = Math.max(daysRemaining / 30, 1);
  const signoffsPerMonth = remainingCount / monthsRemaining;
  const signoffsPerMeeting = remainingCount / Math.max(meetingsPerMonth * monthsRemaining, 1);

  if (signoffsPerMeeting <= 0.5) {
    return `Comfortable pace. ${progress.rankName} needs about ${signoffsPerMonth.toFixed(1)} signoffs per month, roughly ${signoffsPerMeeting.toFixed(1)} per meeting.`;
  }

  if (signoffsPerMeeting <= 1) {
    return `On track. ${progress.rankName} needs about ${signoffsPerMonth.toFixed(1)} signoffs per month, about one per meeting.`;
  }

  if (signoffsPerMeeting <= 2) {
    return `Push a little harder. ${progress.rankName} needs about ${signoffsPerMonth.toFixed(1)} signoffs per month, roughly ${signoffsPerMeeting.toFixed(1)} each meeting.`;
  }

  return `Aggressive pace. ${progress.rankName} needs about ${signoffsPerMonth.toFixed(1)} signoffs per month, around ${signoffsPerMeeting.toFixed(1)} each meeting.`;
}

export function getMeritBadgePaceSummary(userData: UserData) {
  const targetDate = userData.profile.targetEagleDate
    ? new Date(userData.profile.targetEagleDate)
    : null;
  const meritBadgeSummary = getMeritBadgeFocusSummary(userData);
  const badgesRemaining = 21 - meritBadgeSummary.completedRequiredCount;

  if (!targetDate) {
    return `You still need ${badgesRemaining} Eagle-required badges. Add a target Eagle date to estimate the badge pace.`;
  }

  const today = new Date();
  const daysRemaining = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysRemaining <= 0) {
    return 'Your target date has already passed. Update the goal to rebuild a realistic merit badge pace.';
  }

  const monthsRemaining = Math.max(daysRemaining / 30, 1);
  const badgesPerMonth = badgesRemaining / monthsRemaining;
  const requirementsPerWeek = meritBadgeSummary.remainingRequirements / Math.max(daysRemaining / 7, 1);

  if (badgesPerMonth <= 0.5) {
    return `Comfortable pace. You need about ${badgesPerMonth.toFixed(1)} Eagle-required badges per month and ${requirementsPerWeek.toFixed(1)} badge requirements per week.`;
  }

  if (badgesPerMonth <= 1) {
    return `On track. You need about one Eagle-required badge per month and ${requirementsPerWeek.toFixed(1)} badge requirements per week.`;
  }

  if (badgesPerMonth <= 2) {
    return `Fast pace. You need about ${badgesPerMonth.toFixed(1)} Eagle-required badges per month and ${requirementsPerWeek.toFixed(1)} badge requirements per week.`;
  }

  return `Very aggressive pace. You need about ${badgesPerMonth.toFixed(1)} Eagle-required badges per month and ${requirementsPerWeek.toFixed(1)} badge requirements per week.`;
}
