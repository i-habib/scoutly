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
      req.sub_requirements.forEach((_, subIndex) => {
        total++;
        const subId = `req_${reqIndex}_${subIndex}`;
        const subDone = !!rankProgress[subId];
        if (subDone) {
          completed++;
        } else {
          missingIds.push(subId);
        }
      });
    }
  });

  const remaining = Math.max(total - completed, 0);
  return { total, completed, remaining, missingIds };
}
