// Klyra Shifts - Timesheet Validation Schemas

import { z } from 'zod'

export const generateTimesheetSchema = z.object({
  user_id: z.string().uuid(),
  location_id: z.string().uuid(),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  force: z.boolean().optional().default(false)
})

export const approveTimesheetSchema = z.object({
  notes: z.string().optional()
})

export const exportTimesheetsSchema = z.object({
  location_id: z.string().uuid().optional(),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['draft', 'approved', 'locked']).optional(),
  fields: z.array(z.string()).optional().default([
    'user_email',
    'period',
    'regular_hours',
    'overtime_hours',
    'total_hours',
    'variance_hours',
    'status'
  ])
})

export type GenerateTimesheetRequest = z.infer<typeof generateTimesheetSchema>
export type ApproveTimesheetRequest = z.infer<typeof approveTimesheetSchema>
export type ExportTimesheetsRequest = z.infer<typeof exportTimesheetsSchema>
