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
  const endOfDay = new Date()
  endOfDay.setHours(23, 59, 59, 999)

  // ✅ Leggi turni effettivi da shifts (single source of truth)
  const { data: todayShifts } = await supabase
    .from('shifts')
    .select('id, actual_start_at, actual_end_at, actual_break_minutes, status')
    .eq('location_id', locationId)
    .eq('org_id', orgId)
    .not('actual_start_at', 'is', null)
    .gte('actual_start_at', startOfDay.toISOString())
    .lte('actual_start_at', endOfDay.toISOString())
    .neq('status', 'cancelled')
    .in('id', (await supabase
      .from('shift_assignments')
      .select('shift_id')
      .eq('user_id', userId)
      .then(res => res.data?.map(a => a.shift_id) || [])
    ))
    .order('actual_start_at', { ascending: true })

  // Calcola ore totali dai turni
  let totalMinutes = 0
  let breakMinutes = 0
  let status: 'not_started' | 'clocked_in' | 'on_break' | 'clocked_out' = 'not_started'

  if (todayShifts && todayShifts.length > 0) {
    for (const shift of todayShifts) {
      if (shift.actual_end_at) {
        // Turno completato
        const duration = (new Date(shift.actual_end_at).getTime() - new Date(shift.actual_start_at).getTime()) / 60000
        totalMinutes += duration
        breakMinutes += shift.actual_break_minutes || 0
      } else if (shift.status === 'in_progress') {
        // Turno in corso
        const duration = (Date.now() - new Date(shift.actual_start_at).getTime()) / 60000
        totalMinutes += duration
        breakMinutes += shift.actual_break_minutes || 0
      }
    }

    const lastShift = todayShifts[todayShifts.length - 1]
    if (lastShift.status === 'in_progress') {
      // Verificare se in pausa controllando ultimo evento
      const { data: lastEvent } = await supabase
        .from('time_clock_events')
        .select('kind, occurred_at')
        .eq('user_id', userId)
        .eq('location_id', locationId)
        .eq('org_id', orgId)
        .gte('occurred_at', startOfDay.toISOString())
        .order('occurred_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (lastEvent?.kind === 'break_start') {
        status = 'on_break'
        // Aggiungi tempo pausa corrente
        const breakDuration = (Date.now() - new Date(lastEvent.occurred_at).getTime()) / 60000
        breakMinutes += breakDuration
      } else {
        status = 'clocked_in'
      }
    } else {
      status = 'clocked_out'
    }
  }

  // Dettaglio ultimo evento per UI
  const { data: lastEventData } = await supabase
    .from('time_clock_events')
    .select('*')
    .eq('user_id', userId)
    .eq('location_id', locationId)
    .eq('org_id', orgId)
    .gte('occurred_at', startOfDay.toISOString())
    .order('occurred_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    totalMinutes: Math.round(totalMinutes),
    breakMinutes: Math.round(breakMinutes),
    status,
    lastEvent: lastEventData || undefined
  }
}
