// Shared types for the Timeline feature
import type { UserData } from '../data/userData'

export interface TimelineItem {
  id: string
  title: string
  description: string
  estimatedDate: Date
  type: 'rank' | 'badge' | 'milestone'
  completed: boolean
  requirementsRemaining: number
  totalRequirements: number
}

export type PhaseKey = 'Tenderfoot' | 'Second Class' | 'First Class' | 'Star' | 'Life'

export interface BadgePlanItem {
  id: string
  name: string
  phase: PhaseKey
  durationWeeks: number
  accelerated?: boolean
  wave?: 1 | 2 | null
  startDate: Date
  targetDate: Date
  isChoice?: boolean
  choiceGroup?: string
  options?: string[]
  isElective?: boolean
  placeholder?: boolean
  isLong?: boolean
  note?: string
}

export interface TimelineOkState {
  ok: true
  totalSignoffsNeeded: number
  meetingsPerMonth: number
  meetingsPerWeek: number
  reqsPerMeeting: number
  // Target signoffs per meeting (rounded, adjusted for campouts)
  signoffsPerMeetingTarget?: number
  // Campout-driven pacing signals
  campoutPriority: 'low' | 'medium' | 'high'
  campoutPriorityScore: number // 0..1
  estimatedCampoutSignoffs: number
  adjustedReqsPerMeeting: number
  currentRankName: string
  remainingMeetingsForCurrentRank: number
  rankDeadlines: Record<string, Date | null>
  rankPreviousDates: Record<string, Date>
  milestones: Record<string, Date | null>
  phases: Record<string, any>
  isAlreadyFirstClass: boolean
  remainingRanks: TimelineItem[]
  remainingBadges: TimelineItem[]
  velocityBasedTimeline?: boolean
  badgePlan: BadgePlanItem[]
  prevRankCarryovers: Array<{ rankId: string; rankName: string; missing: number; total: number; missingIds: string[] }>
}

export interface TimelineErrorState { ok: false; error: { kind: string; message: string } }
export type TimelineState = TimelineOkState | TimelineErrorState

export type BuildTimeline = (
  userData: UserData | null | undefined,
  options?: {
    meetingsPerMonthOverride?: number
  }
) => TimelineState
