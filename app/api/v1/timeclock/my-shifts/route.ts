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

    console.log(`[Kiosk API] Query params:`, {
      userId,
      locationId,
      timeWindow: `${now.toISOString()} → ${twoHoursLater.toISOString()}`,
      hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    })

    const { data: shifts, error } = await supabase
      .from('shifts')
      .select(`
        id,
        start_at,
        end_at,
        status,
        job_tag_id,
        job_tags (
          label_it
        ),
        shift_assignments!inner (
          user_id,
          status
        )
      `)
      .eq('location_id', locationId)
      .eq('shift_assignments.user_id', userId)
      .eq('shift_assignments.status', 'assigned')
      .gte('start_at', now.toISOString())
      .lte('start_at', twoHoursLater.toISOString())
      .order('start_at', { ascending: true })
      .limit(1)

    if (error) {
      console.error('[Kiosk API] Error fetching shifts:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`[Kiosk API] Query result:`, {
      found: shifts?.length || 0,
      shifts: shifts,
      error: error
    })

    return NextResponse.json({ shifts: shifts || [] })
  } catch (error: any) {
    console.error('[Kiosk API] Error in my-shifts:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
