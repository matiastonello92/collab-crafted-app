// Klyra Shifts API - Manager: Fetch Pending Leave Requests

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
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

    // Fetch pending leave requests with user details and leave type
    const { data: requests, error } = await supabase
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
        profiles!leave_requests_user_id_fkey(id, full_name, avatar_url),
        leave_types!leave_requests_type_id_fkey(id, key, label, color)
      `)
      .eq('org_id', profile.org_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

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
