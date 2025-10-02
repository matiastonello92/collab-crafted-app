// Klyra Shifts API - Availability (Self-Service)

import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { createAvailabilitySchema } from '@/lib/shifts/validations'
import { ZodError } from 'zod'

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get location_id from query params (optional, defaults to user's default location)
    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('location_id')

    let query = supabase
      .from('availability')
      .select('*')
      .eq('user_id', user.id)

    if (locationId) {
      query = query.eq('location_id', locationId)
    }

    const { data, error } = await query.order('weekday', { ascending: true })

    if (error) {
      console.error('Error fetching availability:', error)
      throw error
    }

    return NextResponse.json({ availability: data || [] })
  } catch (error) {
    console.error('Error in GET /api/v1/availability:', error)
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
    const validated = createAvailabilitySchema.parse(body)

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

    // Convert HH:mm to tstzrange format (assuming Europe/Paris)
    // Note: This is simplified - production should use proper timezone handling
    const timeRange = `[${validated.start_time},${validated.end_time})`

    // Create availability entry
    const { data: availability, error } = await supabase
      .from('availability')
      .insert({
        org_id: profile.org_id,
        location_id: validated.location_id,
        user_id: user.id,
        weekday: validated.weekday,
        time_range: timeRange,
        preference: validated.preference,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating availability:', error)
      throw error
    }

    return NextResponse.json({ availability }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/v1/availability:', error)
    
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
