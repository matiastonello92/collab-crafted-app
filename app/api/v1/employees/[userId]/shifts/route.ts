import { createSupabaseServerClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params
  const { searchParams } = new URL(request.url)
  const start = searchParams.get('start')
  const end = searchParams.get('end')
  
  if (!start || !end) {
    return NextResponse.json({ error: 'start and end dates required' }, { status: 400 })
  }
  
  const supabase = await createSupabaseServerClient()
  
  // Check auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check permission
  const { data: hasPermission } = await supabase.rpc('user_has_permission', {
    p_user_id: user.id,
    p_permission: 'shifts:manage'
  })
  
  const isOwnProfile = user.id === userId
  
  if (!hasPermission && !isOwnProfile) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch shifts with assignments and timeclock events
  const { data: shifts, error } = await supabase
    .from('shifts')
    .select(`
      id,
      start_at,
      end_at,
      break_minutes,
      location_id,
      locations(name),
      shift_assignments!inner(
        id,
        user_id,
        status,
        assigned_at,
        assigned_by
      )
    `)
    .eq('shift_assignments.user_id', userId)
    .gte('start_at', start)
    .lte('end_at', end)
    .order('start_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Fetch leave requests for the period
  const { data: leaves } = await supabase
    .from('leave_requests')
    .select('*, leave_types(*)')
    .eq('user_id', userId)
    .gte('start_at', start)
    .lte('end_at', end)

  return NextResponse.json({
    shifts: shifts?.map((s: any) => ({
      id: s.id,
      startAt: s.start_at,
      endAt: s.end_at,
      breakMinutes: s.break_minutes,
      locationId: s.location_id,
      locationName: s.locations?.name,
      assignmentId: s.shift_assignments[0]?.id,
      status: s.shift_assignments[0]?.status,
      assignedAt: s.shift_assignments[0]?.assigned_at,
      assignedBy: s.shift_assignments[0]?.assigned_by
    })) || [],
    leaves: leaves?.map((l: any) => ({
      id: l.id,
      startAt: l.start_at,
      endAt: l.end_at,
      status: l.status,
      type: {
        key: l.leave_types.key,
        label: l.leave_types.label,
        color: l.leave_types.color
      }
    })) || []
  })
}
