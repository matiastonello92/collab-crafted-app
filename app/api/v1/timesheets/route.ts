// GET /api/v1/timesheets - List timesheets
// POST /api/v1/timesheets - Generate/update timesheet

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateTimesheetSchema } from '@/lib/shifts/timesheet-validations'
import {
  calculateWorkedHoursFromClockEvents,
  calculatePlannedHoursFromShifts,
  generateTimesheetTotals
} from '@/lib/shifts/timesheet-calculator'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const location_id = searchParams.get('location_id')
    const user_id = searchParams.get('user_id')
    const status = searchParams.get('status')
    const period_start = searchParams.get('period_start')
    const period_end = searchParams.get('period_end')

    let query = supabase
      .from('timesheets')
      .select(`
        *,
        user:user_id (
          email,
          raw_user_meta_data
        )
      `)
      .order('period_start', { ascending: false })

    if (location_id) query = query.eq('location_id', location_id)
    if (user_id) query = query.eq('user_id', user_id)
    if (status) query = query.eq('status', status)
    if (period_start) query = query.gte('period_start', period_start)
    if (period_end) query = query.lte('period_end', period_end)

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ timesheets: data })
  } catch (err: any) {
    console.error('GET /api/v1/timesheets error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const payload = generateTimesheetSchema.parse(body)

    const { user_id, location_id, period_start, period_end, force } = payload

    // Check if timesheet already exists
    const { data: existing } = await supabase
      .from('timesheets')
      .select('id, status, approved_at')
      .eq('user_id', user_id)
      .eq('location_id', location_id)
      .eq('period_start', period_start)
      .eq('period_end', period_end)
      .maybeSingle()

    // If approved/locked and not force, block
    if (existing && existing.approved_at && !force) {
      return NextResponse.json(
        { error: 'Timesheet già approvato. Usa force=true per rigenerare.' },
        { status: 409 }
      )
    }

    // Fetch time_clock_events for period
    const { data: events } = await supabase
      .from('time_clock_events')
      .select('*')
      .eq('user_id', user_id)
      .eq('location_id', location_id)
      .gte('occurred_at', period_start)
      .lte('occurred_at', period_end)
      .order('occurred_at', { ascending: true })

    // Fetch assigned shifts for period
    const { data: assignments } = await supabase
      .from('shift_assignments')
      .select('shift_id, shifts!inner(*)')
      .eq('user_id', user_id)
      .eq('status', 'assigned')

    const shifts = assignments
      ?.map((a: any) => a.shifts)
      .filter((s: any) => {
        const start = new Date(s.start_at)
        return start >= new Date(period_start) && start <= new Date(period_end)
      }) || []

    // Calculate hours
    const worked = calculateWorkedHoursFromClockEvents(events || [], period_start, period_end)
    const planned = calculatePlannedHoursFromShifts(shifts, period_start, period_end)
    const totals = generateTimesheetTotals(worked, planned)

    // Upsert timesheet
    const timesheetData = {
      user_id,
      location_id,
      org_id: (await supabase.from('locations').select('org_id').eq('id', location_id).single()).data?.org_id,
      period_start,
      period_end,
      totals,
      status: 'draft' as const,
      notes: null
    }

    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('timesheets')
        .update(timesheetData)
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ timesheet: data })
    } else {
      // Insert new
      const { data, error } = await supabase
        .from('timesheets')
        .insert(timesheetData)
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ timesheet: data }, { status: 201 })
    }
  } catch (err: any) {
    console.error('POST /api/v1/timesheets error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
