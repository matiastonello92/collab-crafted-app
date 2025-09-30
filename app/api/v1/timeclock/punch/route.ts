// Klyra Shifts API - Time Clock Punch (Kiosk/Mobile)

import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { punchClockSchema } from '@/lib/shifts/validations'
import { ZodError } from 'zod'

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = punchClockSchema.parse(body)

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

    // Business logic: validate punch sequence (e.g., can't clock_out without clock_in)
    // For MVP, we skip this validation - can be added later

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
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating time clock event:', error)
      throw error
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
