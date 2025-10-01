// Klyra Shifts API - User Lookup (PIN/QR for Kiosk)

import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { userLookupSchema } from '@/lib/shifts/timeclock-validations'
import { ZodError } from 'zod'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validated = userLookupSchema.parse(body)

    const supabase = createSupabaseAdminClient()

    // Lookup user by PIN code
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, org_id')
      .eq('pin_code', validated.pin)
      .single()

    if (error || !profile) {
      return NextResponse.json(
        { error: 'PIN non valido' },
        { status: 404 }
      )
    }

    // Verify location belongs to user's organization
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
        { error: 'Unauthorized: location mismatch' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      user_id: profile.id,
      full_name: profile.full_name || 'Utente',
      avatar_url: profile.avatar_url
    })
  } catch (error) {
    console.error('Error in POST /api/v1/timeclock/lookup:', error)

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
