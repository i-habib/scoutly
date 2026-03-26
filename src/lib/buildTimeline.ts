// Pure timeline builder (no React). Keeps route small and logic reusable.
import { RANKS } from '../data/ranks'
import rankReqs from '../data/rank-reqs.json'
import meritBadgesData from '../data/merit-badges.json'
import timeConsumingBadgesData from '../data/time-consuming-badges.json'
import planningGuide from '../data/planning-guide.json'
import { summarizeRankProgress } from './rankProgress'
import type { BuildTimeline, TimelineItem, PhaseKey, BadgePlanItem } from './timelineTypes'

const meritBadges = (meritBadgesData as any).meritBadges
const timeConsumingBadges = (timeConsumingBadgesData as any).timeConsumingBadges

const weekMs = 7 * 24 * 60 * 60 * 1000
const weekToMs = (w: number) => w * weekMs

function safeSpan(phaseStart: Date, phaseEnd: Date, weeks: number) {
  const finish = new Date(phaseEnd)
  const rawStart = new Date(finish.getTime() - weekToMs(weeks))
  const start = rawStart.getTime() < phaseStart.getTime() ? new Date(phaseStart) : rawStart
  return { start, finish }
}

function chooseWave(name: string, weeks: number): 1 | 2 {
  const longThreshold = 8
  const nameBias = name.length > 14 ? 1 : 0
  return (weeks + nameBias) <= longThreshold ? 1 : 2
}

function getBadgeByName(name: string) {
  const b = meritBadges.find((x: any) => x.name.toLowerCase() === name.toLowerCase())
  return b ? { id: b.id, name: b.name } : null
}

export const buildTimelineState: BuildTimeline = (userData, options) => {
  const hasRankProgress = !!userData?.rankProgress
  console.log('🔄 TIMELINE RECALCULATING - rankProgress present:', hasRankProgress)
  if (!userData) return { ok: false, error: { kind: 'NO_USER', message: 'No user data loaded.' } }

  const now = new Date()
  const currentRank = userData.profile?.currentRank || 'Scout'
  const targetDate = userData.profile?.targetEagleDate ? new Date(userData.profile.targetEagleDate) : null
  if (!targetDate) return { ok: false, error: { kind: 'NO_TARGET_DATE', message: 'Set a target date to see your timeline.' } }

  const daysUntilTarget = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (daysUntilTarget <= 0) return { ok: false, error: { kind: 'TARGET_PAST', message: 'Target date is in the past.' } }

  const WAITING_PERIODS = {
    afterFirstClass: { star: 4, life: 10, eagle: 16 },
  }

  // Normalize rank name
  let normalizedCurrentRank = currentRank
  if (normalizedCurrentRank.startsWith('rank_')) normalizedCurrentRank = normalizedCurrentRank.replace('rank_', '')
  normalizedCurrentRank = normalizedCurrentRank
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')

  const currentRankIndex = RANKS.findIndex((r) => r.name === normalizedCurrentRank)
  if (currentRankIndex === -1) {
    console.warn(`Rank not found: ${currentRank} (normalized: ${normalizedCurrentRank})`)
    return { ok: false, error: { kind: 'UNKNOWN_RANK', message: 'Current rank not recognized.' } }
  }

  const firstClassIndex = RANKS.findIndex((r) => r.name === 'First Class')
  const isAlreadyFirstClass = currentRankIndex >= firstClassIndex
  const hasExplicitCurrentRank = Boolean(userData.profile?.currentRank)
  const nextRankStartIndex = hasExplicitCurrentRank
    ? Math.min(currentRankIndex + 1, RANKS.length)
    : Math.max(currentRankIndex, 0)
  const nextPhaseByCurrentRank: Record<string, string | null> = {
    Scout: 'Tenderfoot',
    Tenderfoot: 'Second Class',
    'Second Class': 'First Class',
    'First Class': 'Star',
    Star: 'Life',
    Life: null,
    Eagle: null,
  }

  // 1) Remaining rank requirements per rank
  const remainingRanks: TimelineItem[] = []
  let preFirstClassReqs = 0
  let starReqs = 0
  let lifeReqs = 0
  let eagleReqs = 0

  const ud = userData

  for (let i = nextRankStartIndex; i < RANKS.length; i++) {
    const rank = RANKS[i]
    if (!rank) continue
    const rankName = rank.name
    const rankDataId = `rank_${rank.id}`
    const rankData = (rankReqs as any[]).find((r: any) => r.id === rankDataId)
    if (rankData?.requirements) {
  const { total, remaining } = summarizeRankProgress(rankData.requirements, ud.rankProgress?.[rankDataId])
      if (i < firstClassIndex || rankName === 'First Class') preFirstClassReqs += remaining
      else if (rankName === 'Star') starReqs += remaining
      else if (rankName === 'Life') lifeReqs += remaining
      else if (rankName === 'Eagle') eagleReqs += remaining
      remainingRanks.push({
        id: rankDataId,
        title: rankName,
        description: `${remaining} of ${total} requirements remaining`,
        estimatedDate: now,
        type: 'rank',
        completed: remaining === 0,
        requirementsRemaining: remaining,
        totalRequirements: total,
      })
    }
  }

  // 2) Remaining Eagle-required badges requirement units
  const timeConsumingSet = new Set(timeConsumingBadges)
  const eagleRequired = meritBadges.filter((mb: any) => mb.eagleRequired)
  const remainingBadges: TimelineItem[] = []
  let totalBadgeReqs = 0

  eagleRequired.forEach((badge: any) => {
    const badgeProgress = userData.progress?.[badge.id] || {}
    let completed = 0
    let total = 0
    badge.requirements?.forEach((req: any, reqIndex: number) => {
      if (req.sub_requirements && req.sub_requirements.length > 0) {
        let completedSubReqs = 0
        req.sub_requirements.forEach((_: any, subIndex: number) => {
          if (badgeProgress[`req_${reqIndex}_${subIndex}`]) completedSubReqs++
        })
        const requiredCount = req.requiredCount || req.sub_requirements.length
        total += requiredCount
        completed += Math.min(completedSubReqs, requiredCount)
      } else {
        total += 1
        if (badgeProgress[`req_${reqIndex}`]) completed += 1
      }
    })
    const remaining = Math.max(total - completed, 0)
    if (remaining > 0) {
      totalBadgeReqs += remaining
      const isTimeConsuming = timeConsumingSet.has(badge.name)
      remainingBadges.push({
        id: badge.id,
        title: badge.name,
        description: `${remaining} of ${total} requirements remaining${isTimeConsuming ? ' ⏰' : ''}`,
        estimatedDate: now,
        type: 'badge',
        completed: false,
        requirementsRemaining: remaining,
        totalRequirements: total,
      })
    }
  })

  const preFirstClassBadgeReqs = isAlreadyFirstClass ? 0 : Math.ceil(totalBadgeReqs * 0.3)
  const totalDaysAvailable = daysUntilTarget

  let firstClassCompletionDate: Date
  let starPromotionDate: Date
  let lifePromotionDate: Date
  const eagleTargetDate = targetDate

  // Helper for meetings frequency
  const calcMeetingsPerMonth = () => {
    // 1) Explicit overrides take precedence
    if (userData.profile?.meetingsPerMonthOverride && userData.profile.meetingsPerMonthOverride > 0) {
      return userData.profile.meetingsPerMonthOverride
    }
    if (options?.meetingsPerMonthOverride && options.meetingsPerMonthOverride > 0) {
      return options.meetingsPerMonthOverride
    }
    // 2) Preferred auto: current calendar month exact title "Troop Meeting"
    const events = userData.events || []
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const troopMeetingCount = events
      .filter((e: any) => e.type === 'meeting' && typeof e.name === 'string' && e.name.trim() === 'Troop Meeting')
      .filter((e: any) => {
        const d = new Date(e.startTime || e.date)
        return d >= currentMonthStart && d <= currentMonthEnd
      }).length
    if (troopMeetingCount > 0) return troopMeetingCount

    // 3) Fallback auto: past ~90 days by averaging counts per distinct calendar month
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    const meetings = events.filter((e: any) => e.type === 'meeting').filter((e: any) => {
      const d = new Date(e.startTime || e.date)
      return d >= ninetyDaysAgo && d <= now
    })
    const byMonth: Record<string, number> = {}
    meetings.forEach((e: any) => {
      const d = new Date(e.startTime || e.date)
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      byMonth[key] = (byMonth[key] || 0) + 1
    })
    const months = Object.keys(byMonth)
    if (months.length > 0) {
      const avg = months.reduce((sum, k) => sum + byMonth[k], 0) / months.length
      return Math.max(1, Math.round(avg))
    }
    // 4) Fallback default
    return 4
  }

  if (isAlreadyFirstClass) {
    // Already First Class or higher
    firstClassCompletionDate = now
    starPromotionDate = new Date(firstClassCompletionDate)
    starPromotionDate.setMonth(starPromotionDate.getMonth() + WAITING_PERIODS.afterFirstClass.star)
    lifePromotionDate = new Date(firstClassCompletionDate)
    lifePromotionDate.setMonth(lifePromotionDate.getMonth() + WAITING_PERIODS.afterFirstClass.life)

    // Old simple distribution branch
    const starBadgeReqsOld = Math.ceil(totalBadgeReqs * 0.1)
    const lifeBadgeReqsOld = Math.ceil(totalBadgeReqs * 0.1)
    const eagleBadgeReqsOld = totalBadgeReqs - preFirstClassBadgeReqs - starBadgeReqsOld - lifeBadgeReqsOld
    const preFirstClassTotalOld = 0
    const starReqsOld = starReqs
    const lifeReqsOld = lifeReqs
    const eagleReqsOld = eagleReqs
    const totalSignoffsNeededOld = preFirstClassTotalOld + (starReqsOld + starBadgeReqsOld) + (lifeReqsOld + lifeBadgeReqsOld) + (eagleReqsOld + eagleBadgeReqsOld)

    const preFirstClassDaysOld = 0
    const starPhaseDaysOld = Math.ceil((starPromotionDate.getTime() - firstClassCompletionDate.getTime()) / (1000 * 60 * 60 * 24))
    const lifePhaseDaysOld = Math.ceil((lifePromotionDate.getTime() - starPromotionDate.getTime()) / (1000 * 60 * 60 * 24))
    const eaglePhaseDaysOld = Math.ceil((eagleTargetDate.getTime() - lifePromotionDate.getTime()) / (1000 * 60 * 60 * 24))

    const meetingsPerMonthOld = calcMeetingsPerMonth()
    const meetingsPerWeekOld = meetingsPerMonthOld / 4.33

    const rankDeadlinesOld: { [key: string]: Date | null } = {
      Scout: null,
      Tenderfoot: null,
      'Second Class': null,
      'First Class': firstClassCompletionDate,
      Star: starPromotionDate,
      Life: lifePromotionDate,
      Eagle: eagleTargetDate,
    }

    const rankPreviousDatesOld: { [key: string]: Date } = {
      Star: firstClassCompletionDate,
      Life: starPromotionDate,
      Eagle: lifePromotionDate,
    }

    // Meeting-based metrics
    const currentRankItemOld = remainingRanks.find((r) => r.requirementsRemaining > 0)
    const currentRankNameOld = currentRankItemOld ? currentRankItemOld.title : 'Eagle'
    const currentRankDeadlineOld = rankDeadlinesOld[currentRankNameOld] || eagleTargetDate
    const daysUntilCurrentRankOld = Math.max(1, Math.ceil((currentRankDeadlineOld!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    const weeksUntilCurrentRankOld = daysUntilCurrentRankOld / 7
    const remainingMeetingsForCurrentRankOld = Math.max(1, Math.round(meetingsPerWeekOld * weeksUntilCurrentRankOld))
    const currentRankReqsOld = currentRankItemOld ? currentRankItemOld.requirementsRemaining : 0
    const reqsPerMeetingOld = currentRankReqsOld > 0 ? currentRankReqsOld / remainingMeetingsForCurrentRankOld : 0

    console.log('Meeting-based pace calculation (already First Class):', {
      meetingsPerMonth: meetingsPerMonthOld,
      meetingsPerWeek: meetingsPerWeekOld.toFixed(2),
      currentRankName: currentRankNameOld,
      currentRankReqs: currentRankReqsOld,
      daysUntilCurrentRank: daysUntilCurrentRankOld,
      weeksUntilCurrentRank: weeksUntilCurrentRankOld.toFixed(1),
      remainingMeetingsForCurrentRank: remainingMeetingsForCurrentRankOld,
      reqsPerMeeting: reqsPerMeetingOld.toFixed(2),
    })

    // Build the post-First-Class merit badge schedule from the planning guide.
    const starStart = firstClassCompletionDate
    const starEnd = starPromotionDate
    const lifeStart = starPromotionDate
    const lifeEnd = lifePromotionDate

    const BADGE_WEEKS: Record<string, number> = (planningGuide as any).badgeWeeks || ({} as any)
    const electiveWeeks = BADGE_WEEKS['Elective Badge'] || 4
    const choices = userData.profile?.badgeChoices || {}
    const aquaticChoice = choices.aquatic || 'Swimming'
    const emergencyChoice = choices.emergency || 'Emergency Preparedness'
    const environmentChoice = choices.environment || 'Environmental Science'
    const electivePicks: string[] = userData.profile?.electiveBadges || []
    const electiveBadgesCatalog = meritBadges.filter((badge: any) => !badge.eagleRequired)
    const electiveById = (id: string) => electiveBadgesCatalog.find((badge: any) => badge.id === id)
    const badgePlanOld: BadgePlanItem[] = []
    const scheduledIdsOld = new Set<string>()

    const postFirstClassStartKey =
      hasExplicitCurrentRank
        ? nextPhaseByCurrentRank[normalizedCurrentRank] ?? null
        : 'Star'
    const POST_FIRST_CLASS_PHASES: Array<{ key: string; start: Date; end: Date; items: any[] }> =
      ((planningGuide as any).phases || [])
        .filter((phase: any) => phase.key === 'Star' || phase.key === 'Life')
        .filter((phase: any) =>
          postFirstClassStartKey
            ? ['Star', 'Life'].indexOf(phase.key) >= ['Star', 'Life'].indexOf(postFirstClassStartKey)
            : false,
        )
        .map((phase: any) => ({
          key: phase.key,
          start: phase.key === 'Star' ? starStart : lifeStart,
          end: phase.key === 'Star' ? starEnd : lifeEnd,
          items: phase.items,
        }))

    let electiveIndexOld = 0

    for (const phase of POST_FIRST_CLASS_PHASES) {
      const phaseDurationMs = phase.end.getTime() - phase.start.getTime()

      for (let itemIndex = 0; itemIndex < phase.items.length; itemIndex++) {
        const raw = phase.items[itemIndex]
        const finishFraction = (itemIndex + 1) / (phase.items.length + 1)
        const finish = new Date(phase.start.getTime() + finishFraction * phaseDurationMs)

        if (typeof raw === 'string') {
          const meta = getBadgeByName(raw)
          if (!meta || scheduledIdsOld.has(meta.id)) continue
          const baseWeeks = BADGE_WEEKS[raw] || 6
          const span = safeSpan(phase.start, finish, baseWeeks)
          badgePlanOld.push({
            id: meta.id,
            name: meta.name,
            phase: phase.key as PhaseKey,
            durationWeeks: baseWeeks,
            accelerated: false,
            wave: null,
            startDate: span.start,
            targetDate: span.finish,
          })
          scheduledIdsOld.add(meta.id)
          continue
        }

        if (typeof raw === 'object' && raw.type === 'Choice') {
          const selected =
            raw.group === 'aquatic'
              ? aquaticChoice
              : raw.group === 'emergency'
                ? emergencyChoice
                : environmentChoice
          const meta = getBadgeByName(selected)
          if (!meta || scheduledIdsOld.has(meta.id)) continue
          const baseWeeks = BADGE_WEEKS[selected] || 6
          const span = safeSpan(phase.start, finish, baseWeeks)
          badgePlanOld.push({
            id: meta.id,
            name: meta.name,
            phase: phase.key as PhaseKey,
            durationWeeks: baseWeeks,
            accelerated: false,
            wave: null,
            startDate: span.start,
            targetDate: span.finish,
            isChoice: true,
            choiceGroup: raw.group,
            options: raw.options,
          })
          scheduledIdsOld.add(meta.id)
          continue
        }

        if (typeof raw === 'object' && raw.type === 'Elective') {
          const electiveId = electivePicks[electiveIndexOld]
          const electiveBadge = electiveId ? electiveById(electiveId) : null
          const span = safeSpan(phase.start, finish, electiveWeeks)

          if (electiveBadge) {
            badgePlanOld.push({
              id: electiveBadge.id,
              name: electiveBadge.name,
              phase: phase.key as PhaseKey,
              durationWeeks: electiveWeeks,
              accelerated: false,
              wave: null,
              startDate: span.start,
              targetDate: span.finish,
              isElective: true,
            })
          } else {
            badgePlanOld.push({
              id: `elective_${phase.key}_${itemIndex}`,
              name: 'Elective (choose)',
              phase: phase.key as PhaseKey,
              durationWeeks: electiveWeeks,
              accelerated: false,
              wave: null,
              startDate: span.start,
              targetDate: span.finish,
              isElective: true,
              placeholder: true,
            })
          }

          electiveIndexOld++
          continue
        }

        if (typeof raw === 'object' && raw.type === 'Long') {
          const meta = getBadgeByName(raw.name)
          if (!meta || scheduledIdsOld.has(meta.id)) continue
          const baseWeeks = BADGE_WEEKS[raw.name] || 12
          const span = safeSpan(phase.start, finish, baseWeeks)
          badgePlanOld.push({
            id: meta.id,
            name: meta.name,
            phase: phase.key as PhaseKey,
            durationWeeks: baseWeeks,
            accelerated: false,
            wave: null,
            startDate: span.start,
            targetDate: span.finish,
            isLong: true,
          })
          scheduledIdsOld.add(meta.id)
        }
      }
    }

    // Campout priority metrics (already First Class branch)
    const threshold = 4
    const excess = Math.max(0, reqsPerMeetingOld - threshold)
    const campoutPriorityScore = Math.max(0, Math.min(1, excess / 2))
    const campoutPriority: 'low' | 'medium' | 'high' =
      campoutPriorityScore < 0.3 ? 'low' : campoutPriorityScore < 0.7 ? 'medium' : 'high'

    // Estimate per-campout signoffs for current rank context (post-First-Class ranks tend to have fewer rank signoffs at campouts)
    const perCampoutSignoffs = ['Star', 'Life', 'Eagle'].includes(currentRankNameOld) ? 1 : 2
    const upcomingCampouts = (userData.events || []).filter((e: any) => {
      if (e.type !== 'campout') return false
      const d = new Date(e.startTime || e.date)
      return d >= now && d <= (currentRankDeadlineOld as Date)
    }).length
    const estimatedCampoutSignoffs = Math.min(currentRankReqsOld, perCampoutSignoffs * upcomingCampouts)
    const remainingAfterCampouts = Math.max(0, currentRankReqsOld - estimatedCampoutSignoffs)
    const adjustedReqsPerMeeting = remainingAfterCampouts > 0 ? remainingAfterCampouts / Math.max(1, remainingMeetingsForCurrentRankOld) : 0

    return {
      totalSignoffsNeeded: totalSignoffsNeededOld,
      meetingsPerMonth: meetingsPerMonthOld,
      meetingsPerWeek: meetingsPerWeekOld,
      reqsPerMeeting: reqsPerMeetingOld,
      signoffsPerMeetingTarget: Math.max(1, Math.round(adjustedReqsPerMeeting)),
      campoutPriority,
      campoutPriorityScore,
      estimatedCampoutSignoffs,
      adjustedReqsPerMeeting,
      currentRankName: currentRankNameOld,
      remainingMeetingsForCurrentRank: remainingMeetingsForCurrentRankOld,
      rankDeadlines: rankDeadlinesOld,
      rankPreviousDates: rankPreviousDatesOld,
      milestones: { now, tenderfoot: null, secondClass: null, firstClass: firstClassCompletionDate, star: starPromotionDate, life: lifePromotionDate, eagle: eagleTargetDate },
      phases: {
        preFirstClass: { signoffs: preFirstClassTotalOld, days: preFirstClassDaysOld, signoffsPerWeek: '0' },
        star: { signoffs: starReqsOld, days: starPhaseDaysOld, signoffsPerWeek: starPhaseDaysOld > 0 ? (starReqsOld / (starPhaseDaysOld / 7)).toFixed(1) : '0', isWaitingPeriod: starReqsOld === 0 },
        life: { signoffs: lifeReqsOld, days: lifePhaseDaysOld, signoffsPerWeek: lifePhaseDaysOld > 0 ? (lifeReqsOld / (lifePhaseDaysOld / 7)).toFixed(1) : '0', isWaitingPeriod: lifeReqsOld === 0 },
        eagle: { signoffs: eagleReqsOld, days: eaglePhaseDaysOld, signoffsPerWeek: eaglePhaseDaysOld > 0 ? (eagleReqsOld / (eaglePhaseDaysOld / 7)).toFixed(1) : '0' },
      },
      isAlreadyFirstClass,
      remainingRanks,
      remainingBadges,
      badgePlan: badgePlanOld,
      prevRankCarryovers: [],
      velocityBasedTimeline: false,
      ok: true,
    }
  }

  // Not yet First Class — continuous weighted requirements model
  const starAndLifeWaitingMonths = WAITING_PERIODS.afterFirstClass.life // 10 months
  const starAndLifeWaitingDays = starAndLifeWaitingMonths * 30
  const remainingDaysAfterWaiting = totalDaysAvailable - starAndLifeWaitingDays
  if (remainingDaysAfterWaiting < 60) {
    console.warn('Not enough time to reach Eagle with current target date')
    return { ok: false, error: { kind: 'NOT_ENOUGH_TIME', message: 'Insufficient flexible days after mandatory waiting periods.' } }
  }

  const baseRatios: { [key: string]: number } = {
    Scout: 0.1,
    Tenderfoot: 0.3,
    'Second Class': 0.5,
    'First Class': 0.4,
  }

  let totalWeightedReqs = 0
  const rankWeightedReqs: { [key: string]: { weighted: number; actual: number; total: number } } = {}

  for (let i = nextRankStartIndex; i <= firstClassIndex; i++) {
    const rank = RANKS[i]
    if (!rank) continue
    const rankName = rank.name
    const rankData = remainingRanks.find((r) => r.title === rankName)
    const ratio = baseRatios[rankName] || 0
    if (rankData) {
      const weighted = rankData.requirementsRemaining * ratio
      totalWeightedReqs += weighted
      rankWeightedReqs[rankName] = { weighted, actual: rankData.requirementsRemaining, total: rankData.totalRequirements }
    }
  }

  const eaglePhaseRemainingReqs = starReqs + lifeReqs + eagleReqs
  const eagleWeightedReqs = eaglePhaseRemainingReqs * 1.0
  totalWeightedReqs += eagleWeightedReqs
  if (totalWeightedReqs <= 0) return { ok: false, error: { kind: 'NO_REQUIREMENTS', message: 'No remaining requirements detected.' } }

  const daysPerWeightedReq = remainingDaysAfterWaiting / totalWeightedReqs
  const rankDays: { [key: string]: number } = {}
  for (let i = nextRankStartIndex; i <= firstClassIndex; i++) {
    const rank = RANKS[i]
    if (!rank) continue
    const rankName = rank.name
    const weightedData = rankWeightedReqs[rankName]
    if (!weightedData) continue
    const daysForRank = weightedData.weighted * daysPerWeightedReq
    rankDays[rankName] = daysForRank
  }
  // const eaglePhaseDays = eagleWeightedReqs * daysPerWeightedReq // not used directly

  // Deadlines & previous dates
  const rankDeadlines: { [key: string]: Date | null } = {}
  const rankPreviousDates: { [key: string]: Date } = {}
  let currentDate = now
  for (let i = currentRankIndex; i <= firstClassIndex; i++) {
    const rank = RANKS[i]
    if (!rank) continue
    const rankName = rank.name
    const daysForRank = rankDays[rankName] || 0
    rankPreviousDates[rankName] = currentDate
    const deadline = new Date(currentDate.getTime() + daysForRank * 24 * 60 * 60 * 1000)
    rankDeadlines[rankName] = deadline
    currentDate = deadline
  }
  firstClassCompletionDate = currentDate
  starPromotionDate = new Date(firstClassCompletionDate)
  starPromotionDate.setMonth(starPromotionDate.getMonth() + WAITING_PERIODS.afterFirstClass.star)
  lifePromotionDate = new Date(firstClassCompletionDate)
  lifePromotionDate.setMonth(lifePromotionDate.getMonth() + WAITING_PERIODS.afterFirstClass.life)
  rankPreviousDates['Star'] = firstClassCompletionDate
  rankDeadlines['Star'] = starPromotionDate
  rankPreviousDates['Life'] = starPromotionDate
  rankDeadlines['Life'] = lifePromotionDate
  rankPreviousDates['Eagle'] = lifePromotionDate
  rankDeadlines['Eagle'] = eagleTargetDate

  const meetingsPerMonth = calcMeetingsPerMonth()
  const meetingsPerWeek = meetingsPerMonth / 4.33

  const getRankReqs = (rankName: string) => {
    const rank = remainingRanks.find((r) => r.title === rankName)
    return rank ? rank.requirementsRemaining : 0
  }
  const scoutReqs = getRankReqs('Scout')
  const tenderfootReqs = getRankReqs('Tenderfoot')
  const secondClassReqs = getRankReqs('Second Class')
  const firstClassReqs = getRankReqs('First Class')

  const phases: any = {}
  if (rankDays['Scout'] !== undefined) phases.scout = { signoffs: scoutReqs, days: Math.ceil(rankDays['Scout']), signoffsPerWeek: rankDays['Scout'] > 0 ? (scoutReqs / (rankDays['Scout'] / 7)).toFixed(1) : '0' }
  if (rankDays['Tenderfoot'] !== undefined) phases.tenderfoot = { signoffs: tenderfootReqs, days: Math.ceil(rankDays['Tenderfoot']), signoffsPerWeek: rankDays['Tenderfoot'] > 0 ? (tenderfootReqs / (rankDays['Tenderfoot'] / 7)).toFixed(1) : '0' }
  if (rankDays['Second Class'] !== undefined) phases.secondClass = { signoffs: secondClassReqs, days: Math.ceil(rankDays['Second Class']), signoffsPerWeek: rankDays['Second Class'] > 0 ? (secondClassReqs / (rankDays['Second Class'] / 7)).toFixed(1) : '0' }
  if (rankDays['First Class'] !== undefined) phases.firstClass = { signoffs: firstClassReqs, days: Math.ceil(rankDays['First Class']), signoffsPerWeek: rankDays['First Class'] > 0 ? (firstClassReqs / (rankDays['First Class'] / 7)).toFixed(1) : '0' }

  const preFirstClassSignoffs = scoutReqs + tenderfootReqs + secondClassReqs + firstClassReqs
  const preFirstClassDays = Math.max(Math.ceil((firstClassCompletionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)), 0)
  phases.preFirstClass = { signoffs: preFirstClassSignoffs, days: preFirstClassDays, signoffsPerWeek: preFirstClassDays > 0 ? (preFirstClassSignoffs / (preFirstClassDays / 7)).toFixed(1) : '0' }

  const starPhaseDays = Math.ceil((starPromotionDate.getTime() - firstClassCompletionDate.getTime()) / (1000 * 60 * 60 * 24))
  const lifePhaseDays = Math.ceil((lifePromotionDate.getTime() - starPromotionDate.getTime()) / (1000 * 60 * 60 * 24))
  const eaglePhaseDaysCalc = Math.ceil((eagleTargetDate.getTime() - lifePromotionDate.getTime()) / (1000 * 60 * 60 * 24))
  phases.star = { signoffs: starReqs, days: starPhaseDays, signoffsPerWeek: starPhaseDays > 0 ? (starReqs / (starPhaseDays / 7)).toFixed(1) : '0', isWaitingPeriod: starReqs === 0 }
  phases.life = { signoffs: lifeReqs, days: lifePhaseDays, signoffsPerWeek: lifePhaseDays > 0 ? (lifeReqs / (lifePhaseDays / 7)).toFixed(1) : '0', isWaitingPeriod: lifeReqs === 0 }
  phases.eagle = { signoffs: eagleReqs, days: eaglePhaseDaysCalc, signoffsPerWeek: eaglePhaseDaysCalc > 0 ? (eagleReqs / (eaglePhaseDaysCalc / 7)).toFixed(1) : '0' }

  // Planning guide windows for badge plan
  const BADGE_WEEKS: Record<string, number> = (planningGuide as any).badgeWeeks || ({} as any)
  const electiveWeeks = BADGE_WEEKS['Elective Badge'] || 4
  const choices = userData.profile?.badgeChoices || {}
  const aquaticChoice = choices.aquatic || 'Swimming'
  const emergencyChoice = choices.emergency || 'Emergency Preparedness'
  const environmentChoice = choices.environment || 'Environmental Science'
  const electivePicks: string[] = userData.profile?.electiveBadges || []
  const electiveBadgesCatalog = meritBadges.filter((b: any) => !b.eagleRequired)
  const electiveById = (id: string) => electiveBadgesCatalog.find((b: any) => b.id === id)

  const tfStart = rankPreviousDates['Tenderfoot'] || now
  const tfEnd = rankDeadlines['Tenderfoot'] || firstClassCompletionDate
  const scStart = rankPreviousDates['Second Class'] || tfEnd
  const scEnd = rankDeadlines['Second Class'] || firstClassCompletionDate
  const fcStart = rankPreviousDates['First Class'] || scEnd
  const fcEnd = firstClassCompletionDate
  const starStart = firstClassCompletionDate
  const starEnd = starPromotionDate
  const lifeStart = starPromotionDate
  const lifeEnd = lifePromotionDate

  const GUIDE_PHASES: Array<{ key: string; items: any[] }> = (planningGuide as any).phases || []
  const PHASES: Array<{ key: string; start: Date; end: Date; items: any[] }> = GUIDE_PHASES.map((gp: any) => {
    let start = now, end = now
    if (gp.key === 'Tenderfoot') { start = tfStart; end = tfEnd }
    else if (gp.key === 'Second Class') { start = scStart; end = scEnd }
    else if (gp.key === 'First Class') { start = fcStart; end = fcEnd }
    else if (gp.key === 'Star') { start = starStart; end = starEnd }
    else if (gp.key === 'Life') { start = lifeStart; end = lifeEnd }
    return { key: gp.key, start, end, items: gp.items }
  })

  const phaseOrderKeys = ['Tenderfoot', 'Second Class', 'First Class', 'Star', 'Life']
  const startPhaseKey = hasExplicitCurrentRank
    ? nextPhaseByCurrentRank[normalizedCurrentRank] ?? null
    : 'Tenderfoot'
  const startPhaseIdx = startPhaseKey ? phaseOrderKeys.indexOf(startPhaseKey) : phaseOrderKeys.length
  const effectivePhases = PHASES.filter((p) => phaseOrderKeys.indexOf(p.key) >= (startPhaseIdx === -1 ? 0 : startPhaseIdx))

  // Overdue carry-over UI was removed; we simply schedule items in upcoming phases
  const badgePlan: BadgePlanItem[] = []
  const weekMsLocal = weekMs
  const availableWeeksTotal = Math.max(1, Math.round((eagleTargetDate.getTime() - now.getTime()) / weekMsLocal))
  const plannedWeeksRaw = (() => {
    let sum = 0
    PHASES.forEach((ph) => {
      ph.items.forEach((it) => {
        if (typeof it === 'string') sum += BADGE_WEEKS[it] || 6
        else if (typeof it === 'object') {
          if (it.type === 'Elective') sum += electiveWeeks
          else if (it.type === 'Choice') sum += Math.max(...it.options.map((o: string) => BADGE_WEEKS[o] || 6))
          else if (it.type === 'Long') sum += BADGE_WEEKS[it.name] || 12
        }
      })
    })
    return sum
  })()
  const workloadMultiplier = plannedWeeksRaw > availableWeeksTotal ? plannedWeeksRaw / availableWeeksTotal : 1
  function scaleWeeks(base: number) { return workloadMultiplier <= 1 ? base : Math.max(2, Math.round(base / workloadMultiplier)) }
  const scheduledIds = new Set<string>()
  let electiveIndex = 0

  // Phase-level pass: resolve items while preventing duplicates
  for (const phase of effectivePhases) {
    const isEarlyPhase = ['Tenderfoot', 'Second Class', 'First Class'].includes(phase.key)
    const phaseDurationMs = phase.end.getTime() - phase.start.getTime()
    for (let itemIndex = 0; itemIndex < phase.items.length; itemIndex++) {
      const raw = phase.items[itemIndex]
      const finishFraction = (itemIndex + 1) / (phase.items.length + 1)
      if (typeof raw === 'string') {
        const meta = getBadgeByName(raw)
        if (!meta || scheduledIds.has(meta.id)) continue
        const baseWeeks = (planningGuide as any).badgeWeeks?.[raw] || 6
        const weeks = scaleWeeks(baseWeeks)
        const wave = isEarlyPhase ? chooseWave(raw, weeks) : null
        const finish = isEarlyPhase ? (wave === 1 ? new Date(phase.start.getTime() + phaseDurationMs / 2) : new Date(phase.end)) : new Date(phase.start.getTime() + finishFraction * phaseDurationMs)
        const span = safeSpan(phase.start, finish, weeks)
        const accelerated = weeks < baseWeeks
        badgePlan.push({ id: meta.id, name: meta.name, phase: phase.key as PhaseKey, durationWeeks: weeks, accelerated, wave, startDate: span.start, targetDate: span.finish })
        scheduledIds.add(meta.id)
        continue
      }
      if (typeof raw === 'object' && raw.type === 'Choice') {
        const sel = raw.group === 'aquatic' ? aquaticChoice : raw.group === 'emergency' ? emergencyChoice : environmentChoice
        const meta = getBadgeByName(sel)
        if (!meta || scheduledIds.has(meta.id)) continue
        const baseWeeks = (planningGuide as any).badgeWeeks?.[sel] || 6
        const weeks = scaleWeeks(baseWeeks)
        const wave = isEarlyPhase ? chooseWave(sel, weeks) : null
        const finish = isEarlyPhase ? (wave === 1 ? new Date(phase.start.getTime() + phaseDurationMs / 2) : new Date(phase.end)) : new Date(phase.start.getTime() + finishFraction * phaseDurationMs)
        const span = safeSpan(phase.start, finish, weeks)
        const accelerated = weeks < baseWeeks
        badgePlan.push({ id: meta.id, name: meta.name, phase: phase.key as PhaseKey, durationWeeks: weeks, accelerated, wave, startDate: span.start, targetDate: span.finish, isChoice: true, choiceGroup: raw.group, options: raw.options })
        scheduledIds.add(meta.id)
        continue
      }
      if (typeof raw === 'object' && raw.type === 'Elective') {
        const electiveId = electivePicks[electiveIndex]
        const electiveBadge = electiveId ? electiveById(electiveId) : null
        const weeks = scaleWeeks(electiveWeeks)
        const wave = isEarlyPhase ? chooseWave(electiveBadge?.name || 'Elective', weeks) : null
        const finish = isEarlyPhase ? (wave === 1 ? new Date(phase.start.getTime() + phaseDurationMs / 2) : new Date(phase.end)) : new Date(phase.start.getTime() + finishFraction * phaseDurationMs)
        const span = safeSpan(phase.start, finish, weeks)
        if (electiveBadge) {
          badgePlan.push({ id: electiveBadge.id, name: electiveBadge.name, phase: phase.key as PhaseKey, durationWeeks: weeks, accelerated: weeks < electiveWeeks, wave, startDate: span.start, targetDate: span.finish, isElective: true })
        } else {
          badgePlan.push({ id: `elective_${phase.key}_${itemIndex}`, name: 'Elective (choose)', phase: phase.key as PhaseKey, durationWeeks: weeks, accelerated: weeks < electiveWeeks, wave, startDate: span.start, targetDate: span.finish, isElective: true, placeholder: true })
        }
        electiveIndex++
        continue
      }
      if (typeof raw === 'object' && raw.type === 'Long') {
        const meta = getBadgeByName(raw.name)
        if (!meta || scheduledIds.has(meta.id)) continue
        const baseWeeks = (planningGuide as any).badgeWeeks?.[raw.name] || 12
        const weeks = scaleWeeks(baseWeeks)
        const finish = new Date(lifeEnd)
        const startCandidate = new Date(Math.max(phase.start.getTime(), finish.getTime() - weekToMs(weeks)))
        badgePlan.push({ id: meta.id, name: meta.name, phase: phase.key as PhaseKey, durationWeeks: weeks, accelerated: weeks < baseWeeks, wave: null, startDate: startCandidate, targetDate: finish, isLong: true, note: `Finishes in Life (started in ${raw.startPhase})` })
        scheduledIds.add(meta.id)
      }
    }
  }

  const totalSignoffsNeeded = preFirstClassReqs + starReqs + lifeReqs + eagleReqs

  // Meeting-based metrics for current rank in progress
  const currentRankItem = remainingRanks.find((r) => r.requirementsRemaining > 0)
  const currentRankName = currentRankItem ? currentRankItem.title : 'Eagle'
  const currentRankDeadline = (rankDeadlines as any)[currentRankName] || eagleTargetDate
  const daysUntilCurrentRank = Math.max(1, Math.ceil((currentRankDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  const weeksUntilCurrentRank = daysUntilCurrentRank / 7
  const remainingMeetingsForCurrentRank = Math.max(1, Math.round(meetingsPerWeek * weeksUntilCurrentRank))
  const currentRankReqs = currentRankItem ? currentRankItem.requirementsRemaining : 0
  const reqsPerMeeting = currentRankReqs > 0 ? currentRankReqs / remainingMeetingsForCurrentRank : 0

  // Campout priority metrics (pre-First-Class branch)
  const threshold = 4
  const excess = Math.max(0, reqsPerMeeting - threshold)
  const campoutPriorityScore = Math.max(0, Math.min(1, excess / 2))
  const campoutPriority: 'low' | 'medium' | 'high' =
    campoutPriorityScore < 0.3 ? 'low' : campoutPriorityScore < 0.7 ? 'medium' : 'high'

  // Estimate per-campout signoffs for current rank context (pre-First-Class can often achieve multiple signoffs per campout)
  const perCampoutSignoffs = ['Scout', 'Tenderfoot', 'Second Class', 'First Class'].includes(currentRankName) ? 3 : 1
  const upcomingCampouts = (userData.events || []).filter((e: any) => {
    if (e.type !== 'campout') return false
    const d = new Date(e.startTime || e.date)
    return d >= now && d <= (currentRankDeadline as Date)
  }).length
  const estimatedCampoutSignoffs = Math.min(currentRankReqs, perCampoutSignoffs * upcomingCampouts)
  const remainingAfterCampouts = Math.max(0, currentRankReqs - estimatedCampoutSignoffs)
  const adjustedReqsPerMeeting = remainingAfterCampouts > 0 ? remainingAfterCampouts / Math.max(1, remainingMeetingsForCurrentRank) : 0

  return {
    totalSignoffsNeeded,
    meetingsPerMonth,
    meetingsPerWeek,
    reqsPerMeeting,
    signoffsPerMeetingTarget: Math.max(1, Math.round(adjustedReqsPerMeeting)),
    campoutPriority,
    campoutPriorityScore,
    estimatedCampoutSignoffs,
    adjustedReqsPerMeeting,
    currentRankName,
    remainingMeetingsForCurrentRank,
    rankDeadlines,
    rankPreviousDates,
    milestones: { now, tenderfoot: rankDeadlines['Tenderfoot'], secondClass: rankDeadlines['Second Class'], firstClass: firstClassCompletionDate, star: starPromotionDate, life: lifePromotionDate, eagle: eagleTargetDate },
    phases,
    isAlreadyFirstClass,
    remainingRanks,
    remainingBadges,
    velocityBasedTimeline: true,
    badgePlan,
    prevRankCarryovers: [],
    ok: true,
  }
}
