// Klyra Shifts - Compliance Validation Schemas (Zod)

import { z } from 'zod'

export const checkComplianceSchema = z.object({
  user_id: z.string().uuid(),
  location_id: z.string().uuid(),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
})

export const silenceViolationSchema = z.object({
  reason: z.string().min(10, 'Motivazione deve essere almeno 10 caratteri').max(500)
})

export const updateRuleSchema = z.object({
  threshold_value: z.object({
    hours: z.number().min(1).max(24)
  }).optional(),
  is_active: z.boolean().optional()
})
