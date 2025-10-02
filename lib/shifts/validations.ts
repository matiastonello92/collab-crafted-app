// Klyra Shifts - Zod Validation Schemas

import { z } from 'zod'

// Rotas
export const createRotaSchema = z.object({
  location_id: z.string().uuid('Invalid location_id'),
  week_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'week_start_date must be YYYY-MM-DD'),
  labor_budget_eur: z.number().positive().optional(),
})

export const updateRotaStatusSchema = z.object({
  status: z.enum(['draft', 'published', 'locked']),
})

// Shifts
export const createShiftSchema = z.object({
  rota_id: z.string().uuid('Invalid rota_id'),
  job_tag_id: z.string().uuid('Invalid job_tag_id').optional(),
  start_at: z.string().datetime({ offset: true, message: 'start_at must be ISO datetime' }),
  end_at: z.string().datetime({ offset: true, message: 'end_at must be ISO datetime' }),
  break_minutes: z.number().int().min(0).default(0),
  notes: z.string().optional(),
  quantity: z.number().int().min(1).max(20).optional().default(1),
})
.refine(data => new Date(data.end_at) > new Date(data.start_at), {
  message: "end_at must be after start_at"
})

export const updateShiftSchema = z.object({
  start_at: z.string().datetime({ offset: true, message: 'start_at must be ISO datetime' }).optional(),
  end_at: z.string().datetime({ offset: true, message: 'end_at must be ISO datetime' }).optional(),
  break_minutes: z.number().int().min(0).optional(),
  job_tag_id: z.string().uuid('Invalid job_tag_id').optional().nullable(),
  notes: z.string().optional().nullable(),
})
.refine(data => {
  if (data.start_at && data.end_at) {
    return new Date(data.end_at) > new Date(data.start_at)
  }
  return true
}, {
  message: "end_at must be after start_at"
})

export const assignShiftSchema = z.object({
  user_id: z.string().uuid('Invalid user_id'),
  status: z.enum(['proposed', 'assigned']).default('assigned'),
})

export const acceptAssignmentSchema = z.object({
  accept: z.boolean(),
})

// Availability
export const createAvailabilitySchema = z.object({
  location_id: z.string().uuid('Invalid location_id'),
  weekday: z.number().int().min(0).max(6, 'weekday must be 0-6 (Sunday-Saturday)'),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, 'start_time must be HH:mm'),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, 'end_time must be HH:mm'),
  preference: z.enum(['preferred', 'ok', 'unavailable']),
})
.refine(data => data.end_time > data.start_time, {
  message: "end_time must be after start_time"
})

// Leave Requests
export const createLeaveRequestSchema = z.object({
  location_id: z.string().uuid('Invalid location_id'),
  type_id: z.string().uuid('Invalid type_id'),
  start_at: z.string().datetime({ offset: true, message: 'start_at must be ISO datetime' }),
  end_at: z.string().datetime({ offset: true, message: 'end_at must be ISO datetime' }),
  reason: z.string().optional(),
})
.refine(data => new Date(data.end_at) > new Date(data.start_at), {
  message: "end_at must be after start_at"
})

export const decideLeaveRequestSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  notes: z.string().optional(),
})

// Time Clock
export const punchClockSchema = z.object({
  location_id: z.string().uuid('Invalid location_id'),
  kind: z.enum(['clock_in', 'clock_out', 'break_start', 'break_end']),
  occurred_at: z.string().datetime({ offset: true, message: 'occurred_at must be ISO datetime' }).optional(),
  source: z.enum(['kiosk', 'mobile']).default('kiosk'),
})
