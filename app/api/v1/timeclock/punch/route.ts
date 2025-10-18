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
  
  const startOfDay = new Date(clockInTime)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(clockInTime)
  endOfDay.setHours(23, 59, 59, 999)
  
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
    .gte('shifts.start_at', startOfDay.toISOString())
    .lte('shifts.start_at', endOfDay.toISOString())
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
  
  // ❌ NON impostare end_at - il turno rimane aperto fino al clock-out
  const { data: newShift, error: shiftError } = await supabase
    .from('shifts')
    .insert({
      org_id: orgId,
      location_id: locationId,
      rota_id: rota.id,
      start_at: occurredAt,
      break_minutes: 0,
      source: 'actual',
      notes: `Turno non pianificato - Clock-in: ${clockInTime.toLocaleTimeString('it-IT')}`
    })
    .select('id, org_id, location_id')
    .single()

  if (shiftError) {
    console.error('❌ [Kiosk] Failed to create shift:', shiftError)
  } else {
    console.log('✅ [Kiosk] Shift created:', newShift?.id)
  }
  
  if (newShift) {
    const { error: assignError } = await supabase
      .from('shift_assignments')
      .insert({
        shift_id: newShift.id,
        user_id: userId,
        org_id: orgId,
        status: 'assigned',
        assigned_at: occurredAt,
        assigned_by: userId
      })

    if (assignError) {
      console.error('❌ [Kiosk] Failed to assign shift:', {
        code: assignError.code,
        message: assignError.message,
        details: assignError.details,
        hint: assignError.hint,
        shift_id: newShift.id,
        user_id: userId,
        org_id: orgId
      })
    } else {
      console.log('✅ [Kiosk] Shift assigned successfully to user:', userId)
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
  
  const { data: activeAssignments } = await supabase
    .from('shift_assignments')
    .select(`
      shift_id,
      shifts!inner(id, start_at, end_at, source)
    `)
    .eq('user_id', userId)
    .eq('shifts.location_id', locationId)
    .eq('shifts.source', 'actual')
    .gte('shifts.start_at', startOfDay.toISOString())
    .order('shifts(start_at)', { ascending: false })
    .limit(1)
  
  if (activeAssignments && activeAssignments.length > 0) {
    const shift = activeAssignments[0].shifts as any
    console.log(`🔴 Clock-out: Updating shift ${shift.id}`)
    
    await supabase
      .from('shifts')
      .update({ end_at: occurredAt })
      .eq('id', shift.id)
  }
}

async function handleBreakEnd(
  supabase: any,
  userId: string,
  locationId: string,
  occurredAt: string
) {
  const { data: breakStart } = await supabase
    .from('time_clock_events')
    .select('occurred_at')
    .eq('user_id', userId)
    .eq('location_id', locationId)
    .eq('kind', 'break_start')
    .order('occurred_at', { ascending: false })
    .limit(1)
    .single()
  
  if (!breakStart) return
  
  const breakDuration = Math.floor(
    (new Date(occurredAt).getTime() - new Date(breakStart.occurred_at).getTime()) / 60000
  )
  
  const startOfDay = new Date(occurredAt)
  startOfDay.setHours(0, 0, 0, 0)
  
  const { data: activeAssignments } = await supabase
    .from('shift_assignments')
    .select(`
      shift_id,
      shifts!inner(id, break_minutes)
    `)
    .eq('user_id', userId)
    .eq('shifts.source', 'actual')
    .gte('shifts.start_at', startOfDay.toISOString())
    .order('shifts(start_at)', { ascending: false })
    .limit(1)
  
  if (activeAssignments && activeAssignments.length > 0) {
    const shift = activeAssignments[0].shifts as any
    await supabase
      .from('shifts')
      .update({
        break_minutes: (shift.break_minutes || 0) + breakDuration
      })
      .eq('id', shift.id)
  }
}
