import type { UserData, UserProgress } from '../data/userData'
import meritBadgesJSON from '../data/merit-badges.json'

type MeritBadge = (typeof meritBadgesJSON.meritBadges)[number]

// Compute total and completed requirement units for a badge, respecting requiredCount on sub-requirements
export function computeBadgeProgressByMeta(
  badge: MeritBadge,
  progressMap: Record<string, any> | undefined,
) {
  let total = 0
  let completed = 0
  const progress = progressMap || {}

  for (let reqIndex = 0; reqIndex < (badge.requirements?.length || 0); reqIndex++) {
    const req: any = badge.requirements[reqIndex]
    if (req?.sub_requirements && req.sub_requirements.length > 0) {
      let completedSubs = 0
      for (let subIndex = 0; subIndex < req.sub_requirements.length; subIndex++) {
        if (progress[`req_${reqIndex}_${subIndex}`]) completedSubs++
      }
      const requiredCount = req.requiredCount || req.sub_requirements.length
      total += requiredCount
      completed += Math.min(completedSubs, requiredCount)
    } else {
      total += 1
      if (progress[`req_${reqIndex}`]) completed += 1
    }
  }

  const percent = total > 0 ? Math.round((completed / total) * 100) : 0
  return { total, completed, percent }
}

export function computeBadgeProgress(
  badgeId: string,
  userProgress: UserProgress | Record<string, any>,
) {
  const badge = meritBadgesJSON.meritBadges.find((b) => b.id === badgeId)
  if (!badge) return { total: 0, completed: 0, percent: 0 }
  const progress = (userProgress as any)[badgeId]
  return computeBadgeProgressByMeta(badge, progress)
}

export function isBadgeComplete(
  badgeId: string,
  userProgress: UserProgress | Record<string, any>,
) {
  const { percent } = computeBadgeProgress(badgeId, userProgress)
  return percent >= 100
}

export function countEagleRequiredCompleted(userData: UserData) {
  const required = meritBadgesJSON.meritBadges.filter((b) => b.eagleRequired)
  let count = 0
  for (const mb of required) {
    const { percent } = computeBadgeProgressByMeta(mb, userData.progress?.[mb.id])
    if (percent >= 100) count++
  }
  return count
}

export function splitEagleRequiredByStatus(userData: UserData) {
  const completed: Array<MeritBadge & { percentage: number }> = []
  const inProgress: Array<MeritBadge & { percentage: number }> = []
  const notStarted: Array<MeritBadge & { percentage: number }> = []

  for (const mb of meritBadgesJSON.meritBadges.filter((b) => b.eagleRequired)) {
    const { percent } = computeBadgeProgressByMeta(mb, userData.progress?.[mb.id])
    if (percent === 100) completed.push({ ...mb, percentage: percent })
    else if (percent > 0) inProgress.push({ ...mb, percentage: percent })
    else notStarted.push({ ...mb, percentage: percent })
  }

  return { completed, inProgress, notStarted }
}
