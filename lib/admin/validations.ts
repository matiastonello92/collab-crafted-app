import { z } from 'zod'

// Role Management
export const createRoleSchema = z.object({
  name: z.string().min(1).max(100),
  org_id: z.string().uuid(),
  description: z.string().optional(),
  is_system: z.boolean().default(false),
})

export const updateRoleSchema = createRoleSchema.partial().required({ org_id: true })

// Permission Management
export const assignPermissionSchema = z.object({
  role_id: z.string().uuid(),
  permission_id: z.string().uuid(),
  org_id: z.string().uuid(),
})

// User Management
export const updateUserProfileSchema = z.object({
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  avatar_url: z.string().url().optional(),
})

export const assignUserRoleLocationSchema = z.object({
  user_id: z.string().uuid(),
  role_id: z.string().uuid(),
  location_id: z.string().uuid(),
  org_id: z.string().uuid(),
  is_active: z.boolean().default(true),
})

// Location Management
export const createLocationSchema = z.object({
  name: z.string().min(1).max(200),
  org_id: z.string().uuid(),
  address_line1: z.string().min(1).optional(),
  address_line2: z.string().optional(),
  city: z.string().min(1).optional(),
  postcode: z.string().min(1).optional(),
  country: z.string().default('France'),
  timezone: z.string().default('Europe/Paris'),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  open_days: z.array(z.number().min(0).max(6)).optional(),
  opening_hours: z.record(z.string(), z.unknown()).optional(),
})

export const updateLocationSchema = createLocationSchema.partial().required({ org_id: true })

// Timeclock
export const punchSchema = z.object({
  location_id: z.string().uuid(),
  user_id: z.string().uuid(),
  punch_type: z.enum(['in', 'out', 'break_start', 'break_end']),
  punched_at: z.string().datetime(),
  notes: z.string().max(500).optional(),
})

// Timesheet Management
export const approveTimesheetSchema = z.object({
  timesheet_id: z.string().uuid(),
  approved_by: z.string().uuid(),
  notes: z.string().max(1000).optional(),
})

// Inventory
export const createInventoryHeaderSchema = z.object({
  org_id: z.string().uuid(),
  location_id: z.string().uuid(),
  category: z.enum(['bar', 'kitchen', 'cleaning']),
  template_id: z.string().uuid().optional(),
  notes: z.string().max(1000).optional(),
})

export const bulkUpsertInventoryLinesSchema = z.object({
  header_id: z.string().uuid(),
  lines: z.array(
    z.object({
      catalog_item_id: z.string().uuid(),
      qty: z.number().min(0),
      unit_price_snapshot: z.number().min(0),
    })
  ).min(1),
})

// Leave Types
export const createLeaveTypeSchema = z.object({
  org_id: z.string().uuid(),
  key: z.string().min(1).max(50),
  label: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  requires_approval: z.boolean().default(true),
  is_active: z.boolean().default(true),
})

export const updateLeaveTypeSchema = createLeaveTypeSchema.partial().required({ org_id: true })

// Rota Management
export const updateRotaStatusSchema = z.object({
  status: z.enum(['draft', 'published', 'archived']),
  updated_by: z.string().uuid(),
})

export const publishRotaSchema = z.object({
  rota_id: z.string().uuid(),
  notify_users: z.boolean().default(true),
})

// Shift Assignment
export const assignShiftSchema = z.object({
  shift_id: z.string().uuid(),
  user_id: z.string().uuid(),
  assigned_by: z.string().uuid(),
  status: z.enum(['pending', 'accepted', 'rejected']).default('pending'),
  notes: z.string().max(500).optional(),
})

// Compliance
export const createComplianceRuleSchema = z.object({
  org_id: z.string().uuid(),
  rule_key: z.string().min(1).max(100),
  display_name: z.string().min(1).max(200),
  description: z.string().optional(),
  threshold_value: z.record(z.string(), z.unknown()).optional(),
  is_active: z.boolean().default(true),
})

export const silenceViolationSchema = z.object({
  violation_id: z.string().uuid(),
  silenced_by: z.string().uuid(),
  silence_reason: z.string().min(10).max(500),
})
