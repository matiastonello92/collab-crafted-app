import { createSupabaseServerClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params
    const supabase = await createSupabaseServerClient()
    
    // Authenticate user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions (users:manage or leave:manage)
    const { data: hasPermission } = await supabase.rpc('user_has_permission', {
      p_user: user.id,
      p_permission: 'users:manage'
    })
    
    const { data: hasLeavePermission } = await supabase.rpc('user_has_permission', {
      p_user: user.id,
      p_permission: 'leave:manage'
    })

    if (!hasPermission && !hasLeavePermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get query params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // pending, approved, rejected, all

    // Build query
    let query = supabase
      .from('leave_requests')
      .select(`
        *,
        leave_types (
          id,
          key,
          label,
          color
        ),
        profiles!leave_requests_approver_id_fkey (
          id,
          full_name
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    // Apply status filter
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: requests, error } = await query

    if (error) {
      console.error('Error fetching user leave requests:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ requests: requests || [] })
  } catch (error) {
    console.error('Unexpected error in user leave requests:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
