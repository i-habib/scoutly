import type { Event, UserData } from '../data/userData';
import meritBadgesJSON from '../data/merit-badges.json';
import rankReqsJSON from '../data/rank-reqs.json';
import type { EventAnalysis } from '../services/aiService';
import { buildTimelineState } from './buildTimeline';
import { getUserFocusTrack, getWorkingRankId } from './scoutFocus';

type RequirementContext = 'troopMeeting' | 'campout' | 'service' | 'independent';

interface RequirementCandidate {
  storageId: string;
  requirementId: string;
  text: string;
  rankId: string;
  rankName: string;
  title: string;
  contexts: RequirementContext[];
  order: number;
}

interface MeritBadgeCandidate {
  id: string;
  name: string;
  progressCount: number;
}

interface PlanningCapacities {
  troopMeeting: number;
  campout: number;
  service: number;
}

interface CalendarPlan {
  analysis: Record<string, EventAnalysis>;
  futureEvents: Event[];
}

const rankData = rankReqsJSON as Array<{
  id: string;
  name: string;
  requirements: Array<{
    id: string;
    text: string;
    sub_requirements?: Array<{ id: string; text: string }>;
  }>;
}>;

const meritBadgesData = (meritBadgesJSON as any).meritBadges as Array<{
  id: string;
  name: string;
}>;

export function isTroopMeetingEvent(event: Event) {
  return (
    event.type === 'meeting' &&
    event.name.trim().toLowerCase().includes('troop meeting')
  );
}

export function isNonTroopMeetingEvent(event: Event) {
  return !isTroopMeetingEvent(event) && (event.type === 'campout' || event.type === 'service');
}

export function getEventSignoffHeading(event: Event) {
  if (isTroopMeetingEvent(event)) return 'Troop Meeting Signoffs';
  if (event.type === 'campout') return 'Campout Signoffs';
  if (event.type === 'service') return 'Service Signoffs';
  return 'Signoffs To Get';
}

export function getCalendarActionSummary(userData: UserData, events: Event[]) {
  const plan = buildSequentialCalendarPlan(userData, events);
  const nextTroopMeeting = plan.futureEvents.find((event) => isTroopMeetingEvent(event)) || null;
  const nextNonTroopMeetingEvent =
    plan.futureEvents.find((event) => isNonTroopMeetingEvent(event)) || null;
  const nextActionEvent =
    plan.futureEvents.find((event) => {
      const analysis = plan.analysis[event.id];
      return Boolean(
        analysis &&
          ((analysis.signoffs && analysis.signoffs.length > 0) ||
            (analysis.opportunities && analysis.opportunities.length > 0)),
      );
    }) || null;
  const nextActionAnalysis = nextActionEvent ? plan.analysis[nextActionEvent.id] || null : null;

  return {
    analysis: plan.analysis,
    nextTroopMeeting,
    nextTroopMeetingAnalysis: nextTroopMeeting ? plan.analysis[nextTroopMeeting.id] || null : null,
    nextNonTroopMeetingEvent,
    nextNonTroopMeetingAnalysis: nextNonTroopMeetingEvent
      ? plan.analysis[nextNonTroopMeetingEvent.id] || null
      : null,
    nextActionEvent,
    nextActionAnalysis,
  };
}

export function generateEventRecommendations(
  userData: UserData,
  events: Event[],
): Record<string, EventAnalysis> {
  return buildSequentialCalendarPlan(userData, events).analysis;
}

function buildSequentialCalendarPlan(userData: UserData, events: Event[]): CalendarPlan {
  const futureEvents = [...events]
    .filter((event) => new Date(event.startTime).getTime() >= Date.now())
    .sort((left, right) => new Date(left.startTime).getTime() - new Date(right.startTime).getTime());

  if (!userData || futureEvents.length === 0) {
    return {
      analysis: {},
      futureEvents,
    };
  }

  const focusTrack = getUserFocusTrack(userData);
  const capacities = getPlanningCapacities(userData);
  const meritBadges = getInProgressMeritBadges(userData);
  const remainingRequirements = getIncompleteWorkingRankRequirements(userData);
  const analysis: Record<string, EventAnalysis> = {};

  for (const event of futureEvents) {
    const assignedRequirements = assignRequirementsForEvent(
      event,
      remainingRequirements,
      capacities,
    );
    const opportunities = buildOpportunitiesForEvent(
      event,
      focusTrack,
      assignedRequirements,
      remainingRequirements,
      meritBadges,
    );

    if (assignedRequirements.length === 0 && opportunities.length === 0) {
      continue;
    }

    analysis[event.id] = {
      eventId: event.id,
      opportunities,
      signoffs: assignedRequirements.map((requirement) => ({
        id: requirement.requirementId,
        name: requirement.title,
        rankId: requirement.rankId,
      })),
      priority: getEventPriority(event, focusTrack, assignedRequirements, opportunities),
    };

    if (assignedRequirements.length > 0) {
      const assignedIds = new Set(assignedRequirements.map((requirement) => requirement.storageId));
      for (let index = remainingRequirements.length - 1; index >= 0; index -= 1) {
        if (assignedIds.has(remainingRequirements[index].storageId)) {
          remainingRequirements.splice(index, 1);
        }
      }
    }
  }

  return {
    analysis,
    futureEvents,
  };
}

function getPlanningCapacities(userData: UserData): PlanningCapacities {
  const timeline = buildTimelineState(userData);
  const workingRankId = getWorkingRankId(userData.profile.currentRank);
  const signoffFocusedRank = ['rank_tenderfoot', 'rank_second_class', 'rank_first_class'].includes(
    workingRankId,
  );

  return {
    troopMeeting:
      timeline.ok && timeline.signoffsPerMeetingTarget
        ? Math.max(1, timeline.signoffsPerMeetingTarget)
        : 1,
    campout: signoffFocusedRank ? 3 : 1,
    service: 1,
  };
}

function assignRequirementsForEvent(
  event: Event,
  remainingRequirements: RequirementCandidate[],
  capacities: PlanningCapacities,
) {
  const limit = getEventCapacity(event, capacities);
  if (limit <= 0) return [];

  return remainingRequirements
    .map((requirement) => ({
      requirement,
      score: scoreRequirementForEvent(requirement, event),
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.requirement.order - right.requirement.order;
    })
    .slice(0, limit)
    .map((item) => item.requirement);
}

function getEventCapacity(event: Event, capacities: PlanningCapacities) {
  if (isTroopMeetingEvent(event)) return capacities.troopMeeting;
  if (event.type === 'campout') return capacities.campout;
  if (event.type === 'service') return capacities.service;
  return 0;
}

function getIncompleteWorkingRankRequirements(userData: UserData): RequirementCandidate[] {
  const workingRankId = getWorkingRankId(userData.profile.currentRank);
  const workingRank = rankData.find((rank) => rank.id === workingRankId);

  if (!workingRank) return [];

  const progressMap = userData.rankProgress?.[workingRankId] || {};
  const candidates: RequirementCandidate[] = [];

  workingRank.requirements.forEach((requirement, reqIndex) => {
    const mainStorageId = `req_${reqIndex}`;
    const mainDone =
      Boolean(progressMap[requirement.id]) || Boolean(progressMap[mainStorageId]);
    if (!mainDone) {
      candidates.push(
        buildRequirementCandidate(
          workingRankId,
          workingRank.name,
          requirement.id,
          requirement.text,
          requirement.id,
          reqIndex * 10,
        ),
      );
    }

    if (requirement.sub_requirements && requirement.sub_requirements.length > 0) {
      requirement.sub_requirements.forEach((subRequirement, subIndex) => {
        const subStorageId = `req_${reqIndex}_${subIndex}`;
        const subDone =
          Boolean(progressMap[subRequirement.id]) || Boolean(progressMap[subStorageId]);
        if (!subDone) {
          candidates.push(
            buildRequirementCandidate(
              workingRankId,
              workingRank.name,
              subRequirement.id,
              subRequirement.text,
              subRequirement.id,
              reqIndex * 10 + subIndex + 1,
            ),
          );
        }
      });
    }
  });

  return candidates;
}

function buildRequirementCandidate(
  rankId: string,
  rankName: string,
  requirementId: string,
  text: string,
  storageId: string,
  order: number,
): RequirementCandidate {
  return {
    storageId,
    requirementId,
    text,
    rankId,
    rankName,
    title: `${rankName} ${requirementId} - ${summarizeRequirement(text)}`,
    contexts: classifyRequirementContexts(text),
    order,
  };
}

function classifyRequirementContexts(text: string): RequirementContext[] {
  const lower = text.toLowerCase();
  const contexts = new Set<RequirementContext>();

  if (
    hasAny(lower, [
      'troop meeting',
      'patrol leader',
      'senior patrol leader',
      'scoutmaster conference',
      'board of review',
      'repeat from memory',
      'describe',
      'explain',
      'discuss',
      'teach',
      'tell how',
      'tell what',
      'scout spirit',
      'flag',
      'first aid',
      'knot',
      'lash',
      'handshake',
      'salute',
      'outdoor code',
      'demonstrate',
      'show how',
      'show the',
      'show proper',
    ])
  ) {
    contexts.add('troopMeeting');
  }

  if (
    hasAny(lower, [
      'campout',
      'camping',
      'overnight',
      'tent',
      'patrol site',
      'campsite',
      'outing',
      'outdoor',
      'hike',
      'backpack',
      'trail',
      'fire',
      'stove',
      'meal',
      'cook',
      'tinder',
      'kindling',
      'fuel wood',
      'axe',
      'saw',
      'leave no trace',
      'compass',
      'map',
      'navigation',
      'water rescue',
      'swim',
      'boating',
      'paddle',
    ])
  ) {
    contexts.add('campout');
  }

  if (
    hasAny(lower, [
      'service project',
      'service in one or more service projects',
      'service hours',
      'community',
      'volunteer',
      'helpful service',
      'conservation project',
    ])
  ) {
    contexts.add('service');
  }

  if (
    hasAny(lower, [
      '30 days',
      'keep track',
      'record your best',
      'show improvement',
      'at home',
      'parent or guardian',
      'in your neighborhood',
      'everyday life',
      'develop and describe a plan',
      'develop and implement',
      'personally',
    ])
  ) {
    contexts.add('independent');
  }

  if (contexts.size === 0) {
    contexts.add('troopMeeting');
  }

  return Array.from(contexts);
}

function scoreRequirementForEvent(requirement: RequirementCandidate, event: Event) {
  let score = Math.max(10, 180 - requirement.order);
  const lower = requirement.text.toLowerCase();

  if (isTroopMeetingEvent(event)) {
    if (!requirement.contexts.includes('troopMeeting')) return -100;

    score += 90;
    if (requirement.contexts.includes('independent')) score -= 20;
    if (
      hasAny(lower, [
        'on the campout',
        'while on a campout',
        'overnight',
        'service project',
        'campout',
        'outing',
        'hike',
        'these activities do not include troop or patrol meetings',
      ])
    ) {
      score -= 100;
    }
    if (lower.includes('troop meeting')) score += 35;
    if (lower.includes('outdoor code')) score += 25;
    if (hasAny(lower, ['explain', 'describe', 'discuss', 'repeat from memory', 'teach'])) {
      score += 20;
    }
    return score;
  }

  if (event.type === 'campout') {
    if (!requirement.contexts.includes('campout')) return -100;

    score += 100;
    if (hasAny(lower, ['campout', 'camping', 'tent', 'fire', 'cook', 'stove', 'hike'])) {
      score += 25;
    }
    if (requirement.contexts.includes('service')) score -= 20;
    return score;
  }

  if (event.type === 'service') {
    if (!requirement.contexts.includes('service')) return -100;

    score += 120;
    return score;
  }

  return -100;
}

function buildOpportunitiesForEvent(
  event: Event,
  focusTrack: 'signoffs' | 'meritBadges',
  assignedRequirements: RequirementCandidate[],
  remainingRequirements: RequirementCandidate[],
  meritBadges: MeritBadgeCandidate[],
): EventAnalysis['opportunities'] {
  const opportunities: EventAnalysis['opportunities'] = [];

  if (event.type === 'campout') {
    opportunities.push({
      id: 'camping_nights',
      kind: 'meta',
      title: 'Log camping nights and note any outdoor skills right after the trip.',
    });
  }

  if (event.type === 'service') {
    opportunities.push({
      id: 'service_hours',
      kind: 'meta',
      title: 'Log service hours and tie them back to advancement or leadership records.',
    });
  }

  if (focusTrack === 'signoffs') {
    if (isTroopMeetingEvent(event) && assignedRequirements.length === 0) {
      const nextFieldRequirement = remainingRequirements.find(
        (requirement) =>
          requirement.contexts.includes('campout') || requirement.contexts.includes('service'),
      );

      if (nextFieldRequirement) {
        opportunities.push({
          id: 'prep-next-field-signoff',
          kind: 'meta',
          title: `Use this meeting to prep ${nextFieldRequirement.rankName} ${nextFieldRequirement.requirementId} for your next outing.`,
        });
      }
    }

    if (!isTroopMeetingEvent(event) && assignedRequirements.length === 0) {
      opportunities.push({
        id: 'prep-follow-up',
        kind: 'meta',
        title: 'Use this event to collect notes, proof, and follow-up items for your next signoff.',
      });
    }

    if (assignedRequirements.length > 0) {
      opportunities.push({
        id: `handbook-ready-${event.id}`,
        kind: 'meta',
        title: 'Bring your handbook ready so the signoffs can be recorded immediately.',
      });
    }

    return dedupeOpportunities(opportunities);
  }

  const leadBadge = meritBadges[0];
  if (leadBadge) {
    opportunities.push({
      id: leadBadge.id,
      kind: 'meritBadge',
      title: isTroopMeetingEvent(event)
        ? `Use this meeting to move ${leadBadge.name} forward with one concrete requirement or counselor follow-up.`
        : `Use this event while it is fresh to move ${leadBadge.name} forward.`,
      badgeId: leadBadge.id,
    });
  }

  if (!isTroopMeetingEvent(event) && assignedRequirements.length > 0) {
    opportunities.push({
      id: `sidecar-rank-${event.id}`,
      kind: 'meta',
      title: 'Treat any rank signoffs here as sidecar wins while merit badges stay the main focus.',
    });
  }

  if (opportunities.length === 0) {
    opportunities.push({
      id: `leadership-${event.id}`,
      kind: 'meta',
      title: 'Use this event to build momentum, stay visible, and line up the next advancement move.',
    });
  }

  return dedupeOpportunities(opportunities);
}

function dedupeOpportunities(opportunities: EventAnalysis['opportunities']) {
  const seen = new Set<string>();

  return opportunities.filter((opportunity) => {
    const key = `${opportunity.kind}:${opportunity.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getEventPriority(
  event: Event,
  focusTrack: 'signoffs' | 'meritBadges',
  assignedRequirements: RequirementCandidate[],
  opportunities: EventAnalysis['opportunities'],
): 'high' | 'medium' | 'low' {
  if (assignedRequirements.length > 0) {
    if (event.type === 'campout' || event.type === 'service') return 'high';
    return isTroopMeetingEvent(event) ? 'high' : 'medium';
  }

  if (focusTrack === 'meritBadges' && opportunities.length > 0) {
    return isTroopMeetingEvent(event) ? 'medium' : 'high';
  }

  return opportunities.length > 0 ? 'medium' : 'low';
}

function getInProgressMeritBadges(userData: UserData): MeritBadgeCandidate[] {
  return meritBadgesData
    .map((badge) => {
      const progressMap = userData.progress?.[badge.id] || {};
      return {
        id: badge.id,
        name: badge.name,
        progressCount: Object.values(progressMap).filter(Boolean).length,
      };
    })
    .filter((badge) => badge.progressCount > 0)
    .sort((left, right) => right.progressCount - left.progressCount);
}

function summarizeRequirement(text: string) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= 96) return normalized;

  const firstSentence = normalized.match(/^(.{1,96}[.!?])\s/u)?.[1];
  if (firstSentence) return firstSentence.trim();

  return `${normalized.slice(0, 93).trim()}...`;
}

function hasAny(text: string, patterns: string[]) {
  return patterns.some((pattern) => text.includes(pattern));
}
