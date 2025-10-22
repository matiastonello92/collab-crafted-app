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

    // 2. Post notifications (mentions, shares, comments)
    const { data: postNotifications } = await supabase
      .from('user_notifications')
      .select(`
        id,
        type,
        related_post_id,
        related_comment_id,
        read,
        metadata,
        created_at,
        profiles:actor_id (
          full_name,
          avatar_url
        )
      `)
      .eq('user_id', user.id)
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(50)

    if (postNotifications && postNotifications.length > 0) {
      // Group by type
      const mentionNotifs = postNotifications.filter((n: any) => n.type === 'mention')
      const shareNotifs = postNotifications.filter((n: any) => n.type === 'share')
      const commentNotifs = postNotifications.filter((n: any) => n.type === 'comment' || n.type === 'reply')

      if (mentionNotifs.length > 0) {
        notifications.push({
          id: 'mentions',
          type: 'mention',
          title: 'Menzioni',
          count: mentionNotifs.length,
          items: mentionNotifs.slice(0, 3).map((n: any) => {
            const profile = Array.isArray(n.profiles) ? n.profiles[0] : n.profiles
            return {
              id: n.id,
              title: profile?.full_name || 'Utente',
              subtitle: 'Ti ha menzionato in un post',
              timestamp: n.created_at,
              color: '#3b82f6',
              avatar: profile?.avatar_url,
              link: `/feed?post=${n.related_post_id}`
            }
          }),
          link: '/feed',
          icon: 'at-sign'
        })
      }

      if (shareNotifs.length > 0) {
        notifications.push({
          id: 'shares',
          type: 'share',
          title: 'Condivisioni',
          count: shareNotifs.length,
          items: shareNotifs.slice(0, 3).map((n: any) => {
            const profile = Array.isArray(n.profiles) ? n.profiles[0] : n.profiles
            return {
              id: n.id,
              title: profile?.full_name || 'Utente',
              subtitle: 'Ha condiviso il tuo post',
              timestamp: n.created_at,
              color: '#10b981',
              avatar: profile?.avatar_url,
              link: `/feed?post=${n.related_post_id}`
            }
          }),
          link: '/feed',
          icon: 'share'
        })
      }

      if (commentNotifs.length > 0) {
        notifications.push({
          id: 'comments',
          type: 'comment',
          title: 'Commenti',
          count: commentNotifs.length,
          items: commentNotifs.slice(0, 3).map((n: any) => {
            const profile = Array.isArray(n.profiles) ? n.profiles[0] : n.profiles
            return {
              id: n.id,
              title: profile?.full_name || 'Utente',
              subtitle: n.type === 'reply' ? 'Ha risposto al tuo commento' : 'Ha commentato il tuo post',
              timestamp: n.created_at,
              color: '#8b5cf6',
              avatar: profile?.avatar_url,
              link: `/feed?post=${n.related_post_id}`
            }
          }),
          link: '/feed',
          icon: 'message-circle'
        })
      }
    }

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
