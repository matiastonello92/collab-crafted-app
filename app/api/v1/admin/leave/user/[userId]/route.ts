import { NextResponse } from 'next/server'
import { createSupabaseServerActionClient } from '@/utils/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const supabase = await createSupabaseServerActionClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check leave:manage permission
    const { data: hasPermission } = await supabase
      .rpc('user_has_permission', { 
        p_user: user.id, 
        p_permission: 'leave:manage'
      })

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabase
      .from('leave_requests')
      .select(`
        id, org_id, location_id, user_id, type_id,
        start_at, end_at, reason, status,
        approver_id, approved_at, notes,
        converted_to_leave_id, created_at, updated_at,
        leave_types!leave_requests_type_id_fkey(
          id, key, label, color, requires_approval
        ),
        approver:profiles!leave_requests_approver_id_fkey(full_name)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: requests, error } = await query

    if (error) {
      console.error('Error fetching user leave requests:', error)
      throw error
    }

    return NextResponse.json({ requests: requests || [] })
  } catch (error) {
    console.error('Error in GET /api/v1/admin/leave/user/[userId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
