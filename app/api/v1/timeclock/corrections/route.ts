// Klyra Shifts API - Time Correction Requests (Employee Create)

import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { createCorrectionSchema } from '@/lib/shifts/timeclock-validations'
import { ZodError } from 'zod'

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // pending, approved, rejected

    let query = supabase
      .from('time_correction_requests')
      .select(`
        *,
        event:time_clock_events(kind, occurred_at),
        reviewer:profiles!time_correction_requests_reviewed_by_fkey(full_name)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching correction requests:', error)
      throw error
    }

    return NextResponse.json({ requests: data || [] })
  } catch (error) {
    console.error('Error in GET /api/v1/timeclock/corrections:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = createCorrectionSchema.parse(body)

    // Get user's org_id and verify event if provided
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

    let locationId: string | undefined

    // If event_id provided, verify it belongs to user and get location
    if (validated.event_id) {
      const { data: event, error: eventError } = await supabase
        .from('time_clock_events')
        .select('user_id, location_id, occurred_at')
        .eq('id', validated.event_id)
        .single()

      if (eventError || !event || event.user_id !== user.id) {
        return NextResponse.json(
          { error: 'Time clock event not found or unauthorized' },
          { status: 404 }
        )
      }

      locationId = event.location_id
    } else {
      // If no event_id, we need location_id from somewhere - for now use default
      const { data: defaultLoc } = await supabase
        .from('profiles')
        .select('default_location_id')
        .eq('id', user.id)
        .single()

      locationId = defaultLoc?.default_location_id || undefined
    }

    if (!locationId) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 400 }
      )
    }

    // Create correction request
    const { data: correction, error } = await supabase
      .from('time_correction_requests')
      .insert({
        org_id: profile.org_id,
        location_id: locationId,
        user_id: user.id,
        event_id: validated.event_id,
        original_time: validated.original_time,
        requested_time: validated.requested_time,
        reason: validated.reason,
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating correction request:', error)
      throw error
    }

    return NextResponse.json({ correction }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/v1/timeclock/corrections:', error)

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
