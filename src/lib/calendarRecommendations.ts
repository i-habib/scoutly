import type { UserData, Event } from '../data/userData';
import { EventAnalysis } from '../services/aiService';
import meritBadgesJSON from '../data/merit-badges.json';
import rankReqsJSON from '../data/rank-reqs.json';

const rankData = rankReqsJSON;
const meritBadgesData = (meritBadgesJSON as any).meritBadges;

export function generateEventRecommendations(userData: UserData, events: Event[]): Record<string, EventAnalysis> {
  const analysis: Record<string, EventAnalysis> = {};
  
  if (!userData || !events) return analysis;

  const currentRank = userData.profile?.currentRank || 'rank_scout';
  const rankOrder = ['rank_scout', 'rank_tenderfoot', 'rank_second_class', 'rank_first_class', 'rank_star', 'rank_life', 'rank_eagle'];
  const currentRankIndex = rankOrder.indexOf(currentRank);
  const isFirstClassOrAbove = currentRankIndex >= 3;
  const nextRank = currentRankIndex + 1 < rankOrder.length ? rankOrder[currentRankIndex + 1] : null;

  // Find some next rank requirements that are incomplete
  const nextRankReqsUncompleted: any[] = [];
  if (nextRank) {
    const rankObj = rankData.find((r: any) => r.id === nextRank);
    if (rankObj && rankObj.requirements) {
      rankObj.requirements.forEach((req: any) => {
        const progress = userData.rankProgress?.[nextRank]?.[req.id];
        const isComplete = typeof progress === 'string' || (progress && typeof progress === 'object' && 'completedAt' in progress);
        if (!isComplete) {
          nextRankReqsUncompleted.push({ ...req, rankId: nextRank, rankName: rankObj.name });
        }
      });
    }
  }

  // Find some in-progress merit badges
  const inProgressBadges: any[] = [];
  meritBadgesData.forEach((mb: any) => {
    const mbProgress = userData.progress?.[mb.id] || {};
    const totalReqs = mb.requirements?.length || 0;
    const completedReqs = Object.values(mbProgress).filter((val) => val).length;
    if (completedReqs > 0 && completedReqs < totalReqs) {
      inProgressBadges.push(mb);
    }
  });

  const now = new Date();

  events.forEach(event => {
    const eventDate = new Date(event.startTime);
    if (eventDate < now) return; // Only process future events

    const isTroopMeeting = event.type === 'meeting' && event.name.toLowerCase().includes('troop meeting');
    const isService = event.type === 'service';
    const isCampout = event.type === 'campout';

    if (!isTroopMeeting && !isService && !isCampout) return;

    const opportunities: any[] = [];
    const signoffs: any[] = [];
    let priority: 'high' | 'medium' | 'low' = 'low';

    if (isService) {
      opportunities.push({
        id: 'service_hours',
        kind: 'meta',
        title: 'Log service hours for this event',
      });
      priority = 'high';
    } else if (isCampout) {
      opportunities.push({
        id: 'camping_nights',
        kind: 'meta',
        title: 'Record camping nights for Camping MB',
      });
      
      // Look for camping/outdoor related next rank reqs
      if (nextRankReqsUncompleted.length > 0) {
        const outdoorReqs = nextRankReqsUncompleted.filter(r => 
          r.text.toLowerCase().includes('camp') || 
          r.text.toLowerCase().includes('tent') || 
          r.text.toLowerCase().includes('fire') || 
          r.text.toLowerCase().includes('cook') ||
          r.text.toLowerCase().includes('knot') ||
          r.text.toLowerCase().includes('lash')
        );
        
        const reqsToUse = outdoorReqs.length > 0 ? outdoorReqs : nextRankReqsUncompleted;
        reqsToUse.slice(0, 2).forEach(req => {
          opportunities.push({
            id: req.id,
            kind: 'rank',
            title: `${req.rankName} ${req.id} - ${req.text.split('.')[0]}`,
            rankId: req.rankId
          });
          signoffs.push({
            id: req.id,
            name: `${req.rankName} ${req.id} - ${req.text.split('.')[0]}`,
            rankId: req.rankId
          });
        });
      }
      priority = 'high';
    } else if (isTroopMeeting) {
      if (!isFirstClassOrAbove && nextRankReqsUncompleted.length > 0) {
        // Focus on rank
        nextRankReqsUncompleted.slice(0, 2).forEach(req => {
          opportunities.push({
            id: req.id,
            kind: 'rank',
            title: `${req.rankName} ${req.id} - ${req.text.split('.')[0]}`,
            rankId: req.rankId
          });
          signoffs.push({
            id: req.id,
            name: `${req.rankName} ${req.id} - ${req.text.split('.')[0]}`,
            rankId: req.rankId
          });
        });
        priority = 'medium';
      } else {
        // Focus on MBs
        if (inProgressBadges.length > 0) {
          opportunities.push({
            id: 'mb_work',
            kind: 'meritBadge',
            title: `Work on ${inProgressBadges[0].name} Merit Badge`,
            badgeId: inProgressBadges[0].id
          });
          priority = 'medium';
        } else {
          opportunities.push({
            id: 'leadership',
            kind: 'meta',
            title: 'Provide leadership to younger scouts',
          });
          priority = 'low';
        }
      }
    }

    if (opportunities.length > 0) {
      analysis[event.id] = {
        eventId: event.id,
        opportunities,
        signoffs,
        priority
      };
    }
  });

  return analysis;
}
