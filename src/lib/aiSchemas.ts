import { z } from 'zod'

// Schema version 3 (rev.2): Bring back signoffs and keep structured opportunities for UI linking
export const OpportunitySchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['rank', 'meritBadge', 'meta']),
  title: z.string().min(1),
  rankId: z.string().optional(),
  badgeId: z.string().optional(),
})

export const SignoffSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  rankId: z.string().optional(),
})

export const EventAnalysisSchema = z.object({
  eventId: z.string().min(1),
  opportunities: z.array(OpportunitySchema).default([]),
  signoffs: z.array(SignoffSchema).default([]),
  priority: z.enum(['high', 'medium', 'low']),
})

export const EventAnalysesArraySchema = z.array(EventAnalysisSchema)

export type EventAnalysis = z.infer<typeof EventAnalysisSchema>
export type Opportunity = z.infer<typeof OpportunitySchema>

export const GeminiHistoryMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  parts: z.array(z.object({ text: z.string() })),
})
