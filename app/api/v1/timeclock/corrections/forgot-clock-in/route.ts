import { NextResponse } from 'next/server'
import { createSupabaseServerActionClient } from '@/utils/supabase/server'
import { z } from 'zod'

const forgotClockInSchema = z.object({
  shift_id: z.string().uuid(),
  requested_time: z.string(),
  reason: z.string().min(1)
})

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerActionClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = forgotClockInSchema.parse(body)

    const { data: shift, error: shiftError } = await supabase
      .from('shifts')
      .select('id, org_id, location_id, start_at, actual_start_at')
      .eq('id', validated.shift_id)
      .maybeSingle()

    if (shiftError || !shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    const { data: assignment } = await supabase
      .from('shift_assignments')
      .select('user_id')
      .eq('shift_id', shift.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!assignment) {
      return NextResponse.json({ error: 'Not your shift' }, { status: 403 })
    }

    const { data: correction, error: correctionError } = await supabase
      .from('time_correction_requests')
      .insert({
        org_id: shift.org_id,
        location_id: shift.location_id,
        user_id: user.id,
        shift_id: shift.id,
        original_time: shift.actual_start_at,
        requested_time: validated.requested_time,
        reason: validated.reason,
        status: 'pending'
      })
      .select()
      .single()

    if (correctionError) {
      console.error('Error creating correction:', correctionError)
      return NextResponse.json({ error: 'Failed to create correction' }, { status: 500 })
    }

    return NextResponse.json({ correction }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /forgot-clock-in:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
