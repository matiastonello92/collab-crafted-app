// Klyra Shifts API - Time Clock Punch (Kiosk/Mobile)

import { NextResponse } from 'next/server'
import { createSupabaseServerActionClient } from '@/utils/supabase/server'
import { punchClockSchema } from '@/lib/shifts/validations'
import { validatePunchSequence, checkDoublePunch } from '@/lib/shifts/time-clock-logic'
import { verifyKioskToken } from '@/lib/kiosk/token'
import { ZodError } from 'zod'

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerActionClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = punchClockSchema.parse(body)

    // Verify kiosk token (anti-spoofing)
    const kioskToken = body.kiosk_token
    if (kioskToken) {
      const tokenVerification = verifyKioskToken(kioskToken)
      if (!tokenVerification.valid) {
        return NextResponse.json(
          { error: 'Invalid kiosk token' },
          { status: 403 }
        )
      }
      if (tokenVerification.locationId !== validated.location_id) {
        return NextResponse.json(
          { error: 'Kiosk token location mismatch' },
          { status: 403 }
        )
      }
    }

    // Get user's org_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (!profile?.org_id) {
      return NextResponse.json(
        { error: 'User organization not found' },
        { status: 400 }
      )
    }

    // Verify location exists and user has access
    const { data: location, error: locationError } = await supabase
      .from('locations')
      .select('org_id')
      .eq('id', validated.location_id)
      .single()

    if (locationError || !location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    if (location.org_id !== profile.org_id) {
      return NextResponse.json(
        { error: 'Forbidden: location not in user organization' },
        { status: 403 }
      )
    }

    // Check for double-punch (anti-double-tap)
    const isDoublePunch = await checkDoublePunch(
      user.id,
      validated.location_id,
      validated.kind,
      profile.org_id
    )

    if (isDoublePunch) {
      return NextResponse.json(
        { error: 'Duplicate punch detected - please wait a few seconds' },
        { status: 429 }
      )
    }

    // Validate punch sequence
    const sequenceValidation = await validatePunchSequence(
      user.id,
      validated.location_id,
      validated.kind,
      profile.org_id
    )

    if (!sequenceValidation.valid) {
      return NextResponse.json(
        { error: sequenceValidation.error },
        { status: 400 }
      )
    }

    // Create time clock event
    const occurredAt = validated.occurred_at || new Date().toISOString()

    const { data: clockEvent, error } = await supabase
      .from('time_clock_events')
      .insert({
        org_id: profile.org_id,
        location_id: validated.location_id,
        user_id: user.id,
        kind: validated.kind,
        occurred_at: occurredAt,
        source: validated.source,
        kiosk_token: kioskToken || null
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating time clock event:', error)
      throw error
    }

    // ========================================
    // SMART SHIFT MANAGEMENT
    // ========================================

    if (validated.kind === 'clock_in') {
      await handleClockIn(supabase, user.id, validated.location_id, profile.org_id, occurredAt)
    }

    if (validated.kind === 'clock_out') {
      await handleClockOut(supabase, user.id, validated.location_id, occurredAt)
    }

    if (validated.kind === 'break_end') {
      await handleBreakEnd(supabase, user.id, validated.location_id, occurredAt)
    }

    return NextResponse.json({ clock_event: clockEvent }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/v1/timeclock/punch:', error)
    
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ========================================
// HELPER FUNCTIONS
// ========================================

function getWeekStart(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday
  const monday = new Date(d.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().split('T')[0]
}

async function handleClockIn(
  supabase: any,
  userId: string,
  locationId: string,
  orgId: string,
  occurredAt: string
) {
  const clockInTime = new Date(occurredAt)
  const twoHoursFromNow = new Date(clockInTime.getTime() + 2 * 60 * 60 * 1000)
  
  const dayStart = new Date(clockInTime)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(clockInTime)
  dayEnd.setHours(23, 59, 59, 999)
  
  // 1. SEARCH FOR PLANNED SHIFT WITHIN 2 HOURS
  const { data: plannedAssignments } = await supabase
    .from('shift_assignments')
    .select(`
      shift_id,
      shifts!inner(
        id, 
        start_at, 
        end_at, 
        source,
        rota_id,
        break_minutes,
        job_tag_id,
        notes
      )
    `)
    .eq('user_id', userId)
    .eq('shifts.location_id', locationId)
    .eq('shifts.source', 'planned')
    .gte('shifts.start_at', dayStart.toISOString())
    .lte('shifts.start_at', dayEnd.toISOString())
    .order('shifts(start_at)', { ascending: true })
  
  const nearbyShift = plannedAssignments?.find((a: any) => {
    const shift = a.shifts as any
    const shiftStart = new Date(shift.start_at)
    return shiftStart >= clockInTime && shiftStart <= twoHoursFromNow
  })
  
  if (nearbyShift) {
    // USE EXISTING PLANNED SHIFT
    const shift = nearbyShift.shifts as any
    console.log(`🟢 Clock-in: Using planned shift ${shift.id}`)
    
    await supabase
      .from('shifts')
      .update({
        start_at: occurredAt,
        source: 'actual',
        notes: shift.notes 
          ? `${shift.notes}\n[Clock-in: ${clockInTime.toLocaleTimeString('it-IT')}]`
          : `Clock-in: ${clockInTime.toLocaleTimeString('it-IT')}`
      })
      .eq('id', shift.id)
    
    return
  }
  
  // 2. NO NEARBY SHIFT - CREATE NEW ACTUAL SHIFT
  console.log(`🔵 Clock-in: Creating new actual shift`)
  
  const weekStart = getWeekStart(clockInTime)
  let { data: rota } = await supabase
    .from('rotas')
    .select('id')
    .eq('location_id', locationId)
    .eq('week_start_date', weekStart)
    .single()
  
  if (!rota) {
    const { data: newRota } = await supabase
      .from('rotas')
      .insert({
        org_id: orgId,
        location_id: locationId,
        week_start_date: weekStart,
        status: 'draft'
      })
      .select('id')
      .single()
    rota = newRota
  }
  
  // ✅ Clock-in unificato: cercare turno pianificato o crearne uno nuovo
  const todayStart = new Date(clockInTime)
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(clockInTime)
  todayEnd.setHours(23, 59, 59, 999)

  // Cercare turno pianificato per oggi
  const { data: assignments } = await supabase
    .from('shift_assignments')
    .select('shift_id, shifts!inner(id, planned_start_at, planned_end_at, status)')
    .eq('user_id', userId)
    .eq('shifts.location_id', locationId)
    .eq('shifts.status', 'assigned')
    .gte('shifts.planned_start_at', todayStart.toISOString())
    .lte('shifts.planned_start_at', todayEnd.toISOString())
    .limit(1)

  const plannedShift = assignments?.[0]?.shifts as any

  if (plannedShift) {
    // Aggiorna turno pianificato esistente con orario effettivo
    const { error: updateError } = await supabase
      .from('shifts')
      .update({ 
        actual_start_at: occurredAt,
        status: 'in_progress'
      })
      .eq('id', plannedShift.id)

    if (updateError) {
      console.error('❌ [Kiosk] Failed to update planned shift:', updateError)
    } else {
      console.log('✅ [Kiosk] Updated planned shift to in_progress:', plannedShift.id)
    }
  } else {
    // Crea nuovo turno "on the fly" (stima 4 ore)
    const estimatedEnd = new Date(clockInTime.getTime() + 4 * 60 * 60 * 1000)
    
    const { data: newShift, error: shiftError } = await supabase
      .from('shifts')
      .insert({
        org_id: orgId,
        location_id: locationId,
        rota_id: rota.id,
        start_at: occurredAt,
        end_at: estimatedEnd.toISOString(),
        break_minutes: 0,
        actual_start_at: occurredAt,
        planned_start_at: occurredAt,
        planned_end_at: estimatedEnd.toISOString(),
        planned_break_minutes: 0,
        actual_break_minutes: 0,
        status: 'in_progress',
        source: 'kiosk',
        notes: `Clock-in: ${clockInTime.toLocaleTimeString('it-IT')} (fine prevista: ${estimatedEnd.toLocaleTimeString('it-IT')})`
      })
      .select('id')
      .single()

    if (shiftError) {
      console.error('❌ [Kiosk] Failed to create shift:', shiftError)
      throw shiftError
    }
    
    // Assegna turno all'utente
    if (newShift) {
      const { error: assignError } = await supabase
        .from('shift_assignments')
        .insert({
          shift_id: newShift.id,
          user_id: userId,
          org_id: orgId,
          location_id: locationId,
          status: 'assigned',
          assigned_at: occurredAt,
          assigned_by: userId
        })

      if (assignError) {
        console.error('❌ [Kiosk] Failed to assign shift:', assignError)
      } else {
        console.log('✅ [Kiosk] Created and assigned new shift:', newShift.id)
      }
    }
  }
}

async function handleClockOut(
  supabase: any,
  userId: string,
  locationId: string,
  occurredAt: string
) {
  const clockOutTime = new Date(occurredAt)
  const startOfDay = new Date(clockOutTime)
  startOfDay.setHours(0, 0, 0, 0)
  
  // ✅ Trova turno in corso (status = 'in_progress')
  const { data: activeAssignments } = await supabase
    .from('shift_assignments')
    .select(`
      shift_id,
      shifts!inner(id, actual_start_at, actual_break_minutes, status)
    `)
    .eq('user_id', userId)
    .eq('shifts.location_id', locationId)
    .eq('shifts.status', 'in_progress')
    .not('shifts.actual_start_at', 'is', null)
    .order('shifts(actual_start_at)', { ascending: false })
    .limit(1)
  
  if (activeAssignments && activeAssignments.length > 0) {
    const shift = activeAssignments[0].shifts as any
    console.log(`✅ [Kiosk] Clock-out: Updating shift ${shift.id}`)
    
    await supabase
      .from('shifts')
      .update({ 
        actual_end_at: occurredAt,
        end_at: occurredAt,
        status: 'completed'
      })
      .eq('id', shift.id)
  } else {
    console.log('❌ No active shift found for clock-out')
  }
}

async function handleBreakEnd(
  supabase: any,
  userId: string,
  locationId: string,
  occurredAt: string
) {
  // ✅ Calcola durata pausa da ultimo break_start
  const { data: breakStart } = await supabase
    .from('time_clock_events')
    .select('occurred_at')
    .eq('user_id', userId)
    .eq('location_id', locationId)
    .eq('kind', 'break_start')
    .order('occurred_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  
  if (!breakStart) {
    console.log('❌ No break_start event found')
    return
  }
  
  const breakDuration = Math.round(
    (new Date(occurredAt).getTime() - new Date(breakStart.occurred_at).getTime()) / 60000
  )
  
  const startOfDay = new Date(occurredAt)
  startOfDay.setHours(0, 0, 0, 0)
  
  // ✅ Trova turno in corso e aggiorna actual_break_minutes
  const { data: activeAssignments } = await supabase
    .from('shift_assignments')
    .select(`
      shift_id,
      shifts!inner(id, actual_break_minutes, status)
    `)
    .eq('user_id', userId)
    .eq('shifts.location_id', locationId)
    .eq('shifts.status', 'in_progress')
    .not('shifts.actual_start_at', 'is', null)
    .order('shifts(actual_start_at)', { ascending: false })
    .limit(1)
  
  if (activeAssignments && activeAssignments.length > 0) {
    const shift = activeAssignments[0].shifts as any
    const newBreakMinutes = (shift.actual_break_minutes || 0) + breakDuration
    
    await supabase
      .from('shifts')
      .update({
        actual_break_minutes: newBreakMinutes,
        break_minutes: newBreakMinutes
      })
      .eq('id', shift.id)
    
    console.log(`✅ [Kiosk] Updated break minutes: +${breakDuration}min (total: ${newBreakMinutes}min)`)
  }
}
