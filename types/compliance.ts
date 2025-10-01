// Klyra Shifts - Compliance Types (FR labor law soft warnings)

export interface ComplianceRule {
  id: string
  org_id: string
  rule_key: 'daily_rest_11h' | 'max_hours_per_day_10h' | 'max_hours_per_week_48h'
  display_name: string
  description?: string
  threshold_value: {
    hours: number
  }
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ComplianceViolation {
  id: string
  org_id: string
  location_id: string
  user_id: string
  rule_id: string
  violation_date: string // ISO date (YYYY-MM-DD)
  severity: 'warning' | 'critical'
  details: {
    hours_worked?: number
    rest_hours?: number
    threshold?: number
    shift_ids?: string[]
  }
  is_silenced: boolean
  silenced_by?: string
  silenced_at?: string
  silence_reason?: string
  created_at: string
}

export interface ViolationWithUser extends ComplianceViolation {
  user?: {
    id: string
    email?: string
    full_name?: string
  }
  rule?: ComplianceRule
}

// API Request/Response Types

export interface CheckComplianceRequest {
  user_id: string
  location_id: string
  period_start: string // ISO date
  period_end: string // ISO date
}

export interface SilenceViolationRequest {
  reason: string
}

export interface UpdateRuleRequest {
  threshold_value?: {
    hours: number
  }
  is_active?: boolean
}
