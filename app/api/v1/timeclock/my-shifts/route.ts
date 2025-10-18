// Klyra Shifts API - Get User Shifts (Kiosk)
// Uses admin client to bypass RLS for PIN-based authentication

import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const locationId = searchParams.get('locationId')

    if (!userId || !locationId) {
      return NextResponse.json(
        { error: 'userId and locationId required' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdminClient()
    
    // Search for shifts in the next 2 hours
    const now = new Date()
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000)

    console.log(`[Kiosk API] Fetching shifts for user ${userId} between ${now.toISOString()} and ${twoHoursLater.toISOString()}`)

    const { data: assignments, error } = await supabase
      .from('shift_assignments')
      .select(`
        shift_id,
        shifts!inner (
          id,
          start_at,
          end_at,
          status,
          job_tag_id,
          job_tags (
            label_it
          )
        )
      `)
      .eq('user_id', userId)
      .eq('shifts.location_id', locationId)
      .eq('status', 'assigned')
      .gte('shifts.start_at', now.toISOString())
      .lte('shifts.start_at', twoHoursLater.toISOString())
      .order('shifts.start_at', { ascending: true })
      .limit(1)

    if (error) {
      console.error('[Kiosk API] Error fetching shifts:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`[Kiosk API] Found ${assignments?.length || 0} shifts`)

    return NextResponse.json({ shifts: assignments || [] })
  } catch (error: any) {
    console.error('[Kiosk API] Error in my-shifts:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
