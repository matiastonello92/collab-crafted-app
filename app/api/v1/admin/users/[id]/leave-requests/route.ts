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

    // Build query - Query 1: Leave requests + leave types (safe)
    let query = supabase
      .from('leave_requests')
      .select(`
        *,
        leave_types (
          id,
          key,
          label,
          color
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    // Apply status filter
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: requests, error: requestsError } = await query

    if (requestsError) {
      console.error('Error fetching leave requests:', requestsError)
      return NextResponse.json({ error: requestsError.message }, { status: 500 })
    }

    // Query 2: Approver profiles (safe with RLS)
    const approverIds = requests
      ?.filter(r => r.approver_id)
      .map(r => r.approver_id)
      .filter((id, idx, self) => self.indexOf(id) === idx) || []

    let approverProfiles: Record<string, { id: string; full_name: string }> = {}

    if (approverIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', approverIds)
      
      if (!profilesError && profiles) {
        approverProfiles = profiles.reduce((acc, p) => {
          acc[p.id] = p
          return acc
        }, {} as Record<string, { id: string; full_name: string }>)
      }
    }

    // Merge data safely
    const enrichedRequests = requests?.map(r => ({
      ...r,
      profiles: r.approver_id ? approverProfiles[r.approver_id] || null : null
    }))

    return NextResponse.json({ requests: enrichedRequests || [] })
  } catch (error) {
    console.error('Unexpected error in user leave requests:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
