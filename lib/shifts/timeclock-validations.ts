// Klyra Shifts - Time Clock Zod Validations

import { z } from 'zod'

export const userLookupSchema = z.object({
  pin: z.string().length(4, 'PIN must be 4 digits').regex(/^\d{4}$/, 'PIN must be numeric'),
  location_id: z.string().uuid('Invalid location_id')
})

export const createCorrectionSchema = z.object({
  event_id: z.string().uuid('Invalid event_id').optional(),
  original_time: z.string().datetime('original_time must be ISO datetime').optional(),
  requested_time: z.string().datetime('requested_time must be ISO datetime'),
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(500, 'Reason too long')
})

export const decideCorrectionSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  notes: z.string().max(500, 'Notes too long').optional()
})
