import { NextResponse } from 'next/server'
import { createSupabaseServerActionClient } from '@/utils/supabase/server'

export async function GET() {
  try {
    const supabase = await createSupabaseServerActionClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const notifications: any[] = []

    // Get user's org and profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (!profile?.org_id) {
      return NextResponse.json({ count: 0, notifications: [] })
    }

    // 1. Check if user can manage leaves
    const { data: canManageLeaves } = await supabase.rpc('user_has_permission', {
      p_user: user.id,
      p_permission: 'leave:manage'
    })

    if (canManageLeaves) {
      // Fetch pending leave requests that require approval
      const { data: leaveRequests } = await supabase
        .from('leave_requests')
        .select(`
          id,
          start_at,
          end_at,
          created_at,
          profiles!leave_requests_user_id_fkey(full_name, avatar_url),
          leave_types!leave_requests_type_id_fkey(label, color, requires_approval)
        `)
        .eq('org_id', profile.org_id)
        .eq('status', 'pending')
        .eq('leave_types.requires_approval', true)
        .order('created_at', { ascending: false })
        .limit(10)

      if (leaveRequests && leaveRequests.length > 0) {
        notifications.push({
          id: 'leave_approvals',
          type: 'leave_approval',
          title: 'Richieste Permesso',
          count: leaveRequests.length,
          items: leaveRequests.map(req => {
            const profile = Array.isArray(req.profiles) ? req.profiles[0] : req.profiles
            const leaveType = Array.isArray(req.leave_types) ? req.leave_types[0] : req.leave_types
            return {
              id: req.id,
              title: `${profile?.full_name || 'Utente'} - ${leaveType?.label || 'Permesso'}`,
              subtitle: new Date(req.start_at).toLocaleDateString('it-IT'),
              timestamp: req.created_at,
              color: leaveType?.color || '#3b82f6',
              avatar: profile?.avatar_url,
              link: '/admin/leave/inbox'
            }
          }),
          link: '/admin/leave/inbox',
          icon: 'calendar'
        })
      }
    }

    // 2. Future: Add other notification sources here
    // Example: Shift assignments, messages, etc.

    // Calculate total unread count
    const totalCount = notifications.reduce((sum, n) => sum + n.count, 0)

    return NextResponse.json({
      count: totalCount,
      notifications
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
