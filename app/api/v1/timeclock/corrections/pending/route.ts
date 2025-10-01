// Klyra Shifts API - Pending Time Corrections (Manager Inbox)

import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has timeclock:manage permission
    const { data: hasPermission } = await supabase.rpc('user_has_permission', {
      p_user: user.id,
      p_permission: 'timeclock:manage'
    })

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden: timeclock:manage permission required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('location_id')

    let query = supabase
      .from('time_correction_requests')
      .select(`
        *,
        requester:profiles!time_correction_requests_user_id_fkey(full_name, avatar_url),
        event:time_clock_events(kind, occurred_at),
        location:locations(name)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (locationId) {
      query = query.eq('location_id', locationId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching pending corrections:', error)
      throw error
    }

    return NextResponse.json({ corrections: data || [] })
  } catch (error) {
    console.error('Error in GET /api/v1/timeclock/corrections/pending:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
