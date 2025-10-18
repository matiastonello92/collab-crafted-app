// Klyra Shifts - Time Clock Types

export interface TimeCorrectionRequest {
  id: string
  org_id: string
  location_id: string
  user_id: string
  event_id?: string | null
  shift_id?: string | null
  original_time?: string | null
  requested_time: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  reviewed_by?: string | null
  reviewed_at?: string | null
  reviewer_notes?: string | null
  created_at: string
  updated_at: string
}

export interface CreateCorrectionRequest {
  event_id?: string
  original_time?: string
  requested_time: string
  reason: string
}

export interface DecideCorrectionRequest {
  decision: 'approve' | 'reject'
  notes?: string
}

export interface UserLookupResponse {
  user_id: string
  full_name: string
  avatar_url?: string | null
}

export interface KioskSession {
  location_id: string
  kiosk_token: string
  expires_at: number
}
