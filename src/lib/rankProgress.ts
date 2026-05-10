import rankRequirementsData from '../data/rank-reqs.json';
import { RANK_ORDER } from './constants';

// Normalized rank progress summarization
// Handles both new-style generated IDs (req_X, req_X_Y) and legacy IDs embedded in JSON (req.id)
export interface RankRequirement {
  id?: string;
  sub_requirements?: any[];
  requiredCount?: number; // future-proof if ranks adopt requiredCount semantics
}

export interface RankProgressSummary {
  total: number;
  completed: number;
  remaining: number;
  missingIds: string[];
}

/** Highest earned rank id, or null if nothing completed yet; `rank_eagle` when all ranks complete. */
export function determineActiveRank(
  rankProgress: Record<string, Record<string, string | null>> | undefined,
): string | null {
  if (!rankProgress) {
    return null;
  }

  for (const rankId of RANK_ORDER) {
    const rankData = rankRequirementsData.find((rank) => rank.id === rankId);
    if (!rankData) continue;

    const progressForRank = rankProgress[rankId] || {};
    const isRankComplete = rankData.requirements.every((req, reqIndex) => {
      const mainDone =
        Boolean(req.id && progressForRank[req.id]) ||
        Boolean(progressForRank[`req_${reqIndex}`]);

      if (req.sub_requirements && req.sub_requirements.length > 0) {
        const subsDone = req.sub_requirements.every(
          (subReq: { id: string }, subIndex: number) =>
            Boolean(subReq.id && progressForRank[subReq.id]) ||
            Boolean(progressForRank[`req_${reqIndex}_${subIndex}`]),
        );
        return mainDone && subsDone;
      }

      return mainDone;
    });

    if (!isRankComplete) {
      const currentIndex = RANK_ORDER.indexOf(rankId as (typeof RANK_ORDER)[number]);
      return currentIndex > 0 ? RANK_ORDER[currentIndex - 1]! : null;
    }
  }

  return 'rank_eagle';
}

export function summarizeRankProgress(
  requirements: RankRequirement[] | undefined,
  rankProgressRaw: Record<string, any> | undefined,
): RankProgressSummary {
  if (!requirements || requirements.length === 0) {
    return { total: 0, completed: 0, remaining: 0, missingIds: [] };
  }
  const rankProgress = rankProgressRaw || {};
  let total = 0;
  let completed = 0;
  const missingIds: string[] = [];

  requirements.forEach((req, reqIndex) => {
    const mainReqId = `req_${reqIndex}`;
    const legacyId = req.id;
    total++;
    const mainDone = !!(rankProgress[mainReqId] || (legacyId && rankProgress[legacyId]));
    if (mainDone) {
      completed++;
    } else {
      missingIds.push(legacyId || mainReqId);
    }
    if (req.sub_requirements && req.sub_requirements.length > 0) {
      req.sub_requirements.forEach((subReq: { id?: string }, subIndex: number) => {
        total++;
        const subLegacyKey = `req_${reqIndex}_${subIndex}`;
        const subDone = !!(
          rankProgress[subLegacyKey] ||
          (subReq.id && rankProgress[subReq.id])
        );
        if (subDone) {
          completed++;
        } else {
          missingIds.push(subReq.id || subLegacyKey);
        }
      });
    }
  });

  const remaining = Math.max(total - completed, 0);
  return { total, completed, remaining, missingIds };
}
