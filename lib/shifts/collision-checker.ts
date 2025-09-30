// Klyra Shifts - Collision Detection Service

import { createSupabaseAdminClient } from '@/lib/supabase/server'

/**
 * Verifica se un utente ha shift sovrapposti nell'intervallo specificato
 * @param userId - ID utente da verificare
 * @param startAt - Inizio intervallo (ISO datetime)
 * @param endAt - Fine intervallo (ISO datetime)
 * @param excludeShiftId - ID shift da escludere dal check (per update)
 * @returns true se c'è collisione, false altrimenti
 */
export async function checkShiftCollision(
  userId: string,
  startAt: string,
  endAt: string,
  excludeShiftId?: string
): Promise<boolean> {
  const supabase = createSupabaseAdminClient()
  
  // Query shift_assignments con join a shifts per verificare overlap temporale
  let query = supabase
    .from('shift_assignments')
    .select(`
      shift_id,
      shifts!inner(id, start_at, end_at)
    `)
    .eq('user_id', userId)
    .in('status', ['assigned', 'accepted']) // Solo shift confermati
  
  if (excludeShiftId) {
    query = query.neq('shift_id', excludeShiftId)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error checking shift collision:', error)
    throw error
  }
  
  if (!data || data.length === 0) return false
  
  // Verifica overlap manualmente (Supabase non supporta tstzrange overlap via API)
  const newStart = new Date(startAt).getTime()
  const newEnd = new Date(endAt).getTime()
  
  for (const assignment of data) {
    const shift = assignment.shifts as any
    const existingStart = new Date(shift.start_at).getTime()
    const existingEnd = new Date(shift.end_at).getTime()
    
    // Check overlap: (newStart < existingEnd) AND (newEnd > existingStart)
    if (newStart < existingEnd && newEnd > existingStart) {
      return true // Collision detected
    }
  }
  
  return false
}

/**
 * Verifica se un utente ha richieste di permesso sovrapposte nell'intervallo
 * @param userId - ID utente da verificare
 * @param startAt - Inizio intervallo (ISO datetime)
 * @param endAt - Fine intervallo (ISO datetime)
 * @param excludeLeaveId - ID leave da escludere (per update)
 * @returns true se c'è collisione, false altrimenti
 */
export async function checkLeaveCollision(
  userId: string,
  startAt: string,
  endAt: string,
  excludeLeaveId?: string
): Promise<boolean> {
  const supabase = createSupabaseAdminClient()
  
  let query = supabase
    .from('leave_requests')
    .select('id, start_at, end_at')
    .eq('user_id', userId)
    .in('status', ['pending', 'approved']) // Solo leave attive
  
  if (excludeLeaveId) {
    query = query.neq('id', excludeLeaveId)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error checking leave collision:', error)
    throw error
  }
  
  if (!data || data.length === 0) return false
  
  const newStart = new Date(startAt).getTime()
  const newEnd = new Date(endAt).getTime()
  
  for (const leave of data) {
    const existingStart = new Date(leave.start_at).getTime()
    const existingEnd = new Date(leave.end_at).getTime()
    
    if (newStart < existingEnd && newEnd > existingStart) {
      return true // Collision detected
    }
  }
  
  return false
}
