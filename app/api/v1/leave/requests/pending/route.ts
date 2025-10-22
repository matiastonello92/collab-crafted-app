// Klyra Shifts API - Manager: Fetch Pending Leave Requests

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerActionClient } from '@/utils/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerActionClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission: leave:manage (Manager)
    const { data: hasPerm } = await supabase.rpc('user_has_permission', {
      p_user: user.id,
      p_permission: 'leave:manage'
    })
    
    if (!hasPerm) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get location_id from query params (optional for managers with multiple locations)
    const { searchParams } = new URL(req.url)
    const locationId = searchParams.get('location_id')

    // Get user's profile to determine org_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (!profile?.org_id) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Build query with location filter if provided
    // Only fetch pending requests that actually require approval
    let query = supabase
      .from('leave_requests')
      .select(`
        id,
        user_id,
        type_id,
        start_at,
        end_at,
        reason,
        status,
        created_at,
        updated_at,
        location_id,
        profiles!leave_requests_user_id_fkey(id, full_name, avatar_url),
        leave_types!leave_requests_type_id_fkey(id, key, label, color, requires_approval)
      `)
      .eq('org_id', profile.org_id)
      .eq('status', 'pending')
      .eq('leave_types.requires_approval', true)

    if (locationId) {
      query = query.eq('location_id', locationId)
    }

    const { data: requests, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching pending leave requests:', error)
      throw error
    }

    return NextResponse.json({ requests: requests || [] })
  } catch (error) {
    console.error('Error in GET /api/v1/leave/requests/pending:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
