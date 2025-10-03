// Klyra Shifts - Core TypeScript Types

export interface Rota {
  id: string
  org_id: string
  location_id: string
  week_start_date: string // ISO date (YYYY-MM-DD)
  status: 'draft' | 'published' | 'locked'
  labor_budget_eur?: number | null
  notes?: string | null
  created_by?: string | null
  updated_by?: string | null
  created_at: string
  updated_at: string
}

export interface Shift {
  id: string
  org_id: string
  location_id: string
  rota_id: string
  job_tag_id?: string | null
  start_at: string // ISO datetime (timestamptz)
  end_at: string
  break_minutes: number
  notes?: string | null
  created_by?: string | null
  updated_by?: string | null
  created_at: string
  updated_at: string
}

export interface ShiftAssignment {
  id: string
  shift_id: string
  user_id: string
  status: 'proposed' | 'assigned' | 'accepted' | 'declined'
  proposed_at?: string | null
  assigned_at?: string | null
  responded_at?: string | null
  created_at: string
}

export interface Availability {
  id: string
  org_id: string
  user_id: string
  weekday: number // 0=Sunday, 6=Saturday
  time_range: string // tstzrange format
  preference: 'preferred' | 'ok' | 'unavailable'
  created_at: string
  updated_at: string
}

export interface LeaveType {
  id: string
  org_id: string
  key: string
  label: string
  color?: string | null
  is_active: boolean
  requires_approval: boolean
  created_at: string
  updated_at: string
}

export interface LeaveRequest {
  id: string
  org_id: string
  user_id: string
  type_id: string
  start_at: string
  end_at: string
  reason?: string | null
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  approver_id?: string | null
  approved_at?: string | null
  notes?: string | null
  converted_to_leave_id?: string | null // Tracks conversion to definitive leave
  created_at: string
  updated_at: string
}

export interface Leave {
  id: string
  org_id: string
  location_id: string
  user_id: string
  type_id: string
  start_at: string
  end_at: string
  reason?: string | null
  notes?: string | null
  created_by: string // Manager or system (approval)
  created_from_request_id?: string | null // Link to original request if converted
  created_at: string
  updated_at: string
}

export interface TimeClockEvent {
  id: string
  org_id: string
  location_id: string
  user_id: string
  kind: 'clock_in' | 'clock_out' | 'break_start' | 'break_end'
  occurred_at: string
  source: 'kiosk' | 'mobile' | 'manual'
  notes?: string | null
  created_at: string
}

export interface Timesheet {
  id: string
  org_id: string
  location_id: string
  user_id: string
  period_start: string // ISO date
  period_end: string // ISO date
  totals: {
    regular_minutes: number
    overtime_minutes: number
    break_minutes: number
    planned_minutes: number
    variance_minutes: number
    days_worked: number
  }
  status: 'draft' | 'approved' | 'locked'
  approved_by?: string | null
  approved_at?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}

// API Request/Response Types

export interface CreateRotaRequest {
  location_id: string
  week_start_date: string
  labor_budget_eur?: number
}

export interface UpdateRotaStatusRequest {
  status: 'draft' | 'published' | 'locked'
}

export interface CreateShiftRequest {
  rota_id: string
  job_tag_id?: string
  start_at: string
  end_at: string
  break_minutes?: number
  notes?: string
}

export interface UpdateShiftRequest {
  start_at?: string
  end_at?: string
  break_minutes?: number
  job_tag_id?: string
  notes?: string
}

export interface AssignShiftRequest {
  user_id: string
  status?: 'proposed' | 'assigned'
}

export interface AcceptAssignmentRequest {
  accept: boolean // true=accept, false=decline
}

export interface CreateAvailabilityRequest {
  weekday: number
  start_time: string // HH:mm format
  end_time: string // HH:mm format
  preference: 'preferred' | 'ok' | 'unavailable'
}

export interface CreateLeaveRequest {
  type_id: string
  start_at: string
  end_at: string
  reason?: string
}

export interface DecideLeaveRequest {
  decision: 'approve' | 'reject'
  notes?: string
}

export interface PunchClockRequest {
  location_id: string
  kind: 'clock_in' | 'clock_out' | 'break_start' | 'break_end'
  occurred_at?: string // Optional, defaults to now()
  source?: 'kiosk' | 'mobile'
}

// API Error Response
export interface ApiError {
  error: string
  message?: string
  details?: any
}

// Planner UI Types

export interface WeekView {
  weekStart: string // ISO date (lunedì)
  weekEnd: string // domenica
  days: DayColumn[]
}

export interface DayColumn {
  date: string // ISO date
  dayName: string // 'Lun', 'Mar', etc.
  shifts: ShiftWithAssignments[]
  leaves: LeaveRequest[]
  availability: Availability[]
}

export interface ShiftWithAssignments extends Shift {
  assignments?: (ShiftAssignment & { user?: UserProfile })[]
  job_tag?: JobTag
  rota?: Rota
}

export interface UserProfile {
  id: string
  full_name: string | null
  avatar_url?: string | null
  email?: string
}

export interface JobTag {
  id: string
  key: string
  label_it: string
  color?: string | null
  categoria?: string | null
}

export interface Location {
  id: string
  org_id: string
  name: string
  status: string
}

// Planner View Modes & Filters
export type PlannerViewMode = 'day' | 'employee'

export interface PlannerFilters {
  jobTagIds?: string[]
  userIds?: string[]
  showUnassigned?: boolean
  showViolations?: boolean
}

export interface ShiftEditFormData {
  startDate: string
  startTime: string
  endTime: string
  breakMinutes: number
  jobTagId: string
  notes: string
  assignedUserId: string
}
