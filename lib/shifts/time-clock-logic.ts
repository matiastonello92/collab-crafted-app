// Klyra Shifts - Time Clock Business Logic

import { createSupabaseAdminClient } from '@/lib/supabase/server'
import type { TimeClockEvent } from '@/types/shifts'

/**
 * Validate punch sequence to prevent invalid state transitions
 * Rules:
 * - clock_in: Must not have active session
 * - clock_out: Must have active clock_in
 * - break_start: Must be clocked in and not on break
 * - break_end: Must be on break
 */
export async function validatePunchSequence(
  userId: string,
  locationId: string,
  kind: TimeClockEvent['kind'],
  orgId: string
): Promise<{ valid: boolean; error?: string }> {
  const supabase = createSupabaseAdminClient()

  // Get last event for user at this location today
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const { data: events, error } = await supabase
    .from('time_clock_events')
    .select('kind, occurred_at')
    .eq('user_id', userId)
    .eq('location_id', locationId)
    .eq('org_id', orgId)
    .gte('occurred_at', startOfDay.toISOString())
    .order('occurred_at', { ascending: false })
    .limit(10)

  if (error) {
    console.error('Error fetching clock events:', error)
    throw error
  }

  const lastEvent = events?.[0]

  // No previous events - only clock_in allowed
  if (!lastEvent) {
    if (kind !== 'clock_in') {
      return { valid: false, error: 'Devi prima timbrare l\'ingresso' }
    }
    return { valid: true }
  }

  // State machine validation
  switch (kind) {
    case 'clock_in':
      if (lastEvent.kind === 'clock_in' || lastEvent.kind === 'break_start') {
        return { valid: false, error: 'Hai già timbrato l\'ingresso' }
      }
      break

    case 'clock_out':
      if (lastEvent.kind === 'clock_out') {
        return { valid: false, error: 'Hai già timbrato l\'uscita' }
      }
      if (lastEvent.kind === 'break_start') {
        return { valid: false, error: 'Devi prima terminare la pausa' }
      }
      break

    case 'break_start':
      if (lastEvent.kind !== 'clock_in' && lastEvent.kind !== 'break_end') {
        return { valid: false, error: 'Devi essere in servizio per iniziare una pausa' }
      }
      break

    case 'break_end':
      if (lastEvent.kind !== 'break_start') {
        return { valid: false, error: 'Non sei in pausa' }
      }
      break
  }

  return { valid: true }
}

/**
 * Check for duplicate punch within threshold (anti-double-tap)
 */
export async function checkDoublePunch(
  userId: string,
  locationId: string,
  kind: TimeClockEvent['kind'],
  orgId: string,
  thresholdSeconds: number = 10
): Promise<boolean> {
  const supabase = createSupabaseAdminClient()

  const threshold = new Date(Date.now() - thresholdSeconds * 1000)

  const { data, error } = await supabase
    .from('time_clock_events')
    .select('id')
    .eq('user_id', userId)
    .eq('location_id', locationId)
    .eq('org_id', orgId)
    .eq('kind', kind)
    .gte('occurred_at', threshold.toISOString())
    .limit(1)

  if (error) {
    console.error('Error checking double punch:', error)
    return false
  }

  return (data?.length ?? 0) > 0
}

/**
 * Calculate work session summary for today
 */
export async function getTodaySessionSummary(
  userId: string,
  locationId: string,
  orgId: string
): Promise<{
  totalMinutes: number
  breakMinutes: number
  status: 'not_started' | 'clocked_in' | 'on_break' | 'clocked_out'
  lastEvent?: TimeClockEvent
}> {
  const supabase = createSupabaseAdminClient()

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const { data: events, error } = await supabase
    .from('time_clock_events')
    .select('*')
    .eq('user_id', userId)
    .eq('location_id', locationId)
    .eq('org_id', orgId)
    .gte('occurred_at', startOfDay.toISOString())
    .order('occurred_at', { ascending: true })

  if (error || !events || events.length === 0) {
    return {
      totalMinutes: 0,
      breakMinutes: 0,
      status: 'not_started'
    }
  }

  let totalMinutes = 0
  let breakMinutes = 0
  let currentClockIn: Date | null = null
  let currentBreakStart: Date | null = null
  let status: 'not_started' | 'clocked_in' | 'on_break' | 'clocked_out' = 'not_started'

  for (const event of events) {
    const eventTime = new Date(event.occurred_at)

    switch (event.kind) {
      case 'clock_in':
        currentClockIn = eventTime
        status = 'clocked_in'
        break

      case 'clock_out':
        if (currentClockIn) {
          totalMinutes += (eventTime.getTime() - currentClockIn.getTime()) / 60000
          currentClockIn = null
        }
        status = 'clocked_out'
        break

      case 'break_start':
        currentBreakStart = eventTime
        status = 'on_break'
        break

      case 'break_end':
        if (currentBreakStart) {
          breakMinutes += (eventTime.getTime() - currentBreakStart.getTime()) / 60000
          currentBreakStart = null
        }
        status = 'clocked_in'
        break
    }
  }

  // If still clocked in, add time until now
  if (currentClockIn) {
    totalMinutes += (Date.now() - currentClockIn.getTime()) / 60000
  }

  // If still on break, add break time until now
  if (currentBreakStart) {
    breakMinutes += (Date.now() - currentBreakStart.getTime()) / 60000
  }

  return {
    totalMinutes: Math.round(totalMinutes),
    breakMinutes: Math.round(breakMinutes),
    status,
    lastEvent: events[events.length - 1]
  }
}
