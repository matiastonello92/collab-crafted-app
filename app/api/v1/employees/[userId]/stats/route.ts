import { createSupabaseServerClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { startOfMonth, endOfMonth, addDays, format } from 'date-fns'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params
  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') || format(new Date(), 'yyyy-MM')
  
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

  // Get user's org and location
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, default_location_id')
    .eq('id', userId)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const monthDate = new Date(month + '-01')
  const startDate = startOfMonth(monthDate)
  const endDate = endOfMonth(monthDate)
  const today = new Date()
  const next7Days = addDays(today, 7)

  // Fetch shifts for the month
  const { data: shifts } = await supabase
    .from('shifts')
    .select(`
      id,
      start_at,
      end_at,
      break_minutes,
      shift_assignments!inner(
        id,
        user_id,
        status
      )
    `)
    .eq('shift_assignments.user_id', userId)
    .gte('start_at', startDate.toISOString())
    .lte('end_at', endDate.toISOString())

  // Calculate stats
  let plannedHours = 0
  let actualHours = 0
  let shiftsCount = shifts?.length || 0

  shifts?.forEach((shift: any) => {
    const duration = (new Date(shift.end_at).getTime() - new Date(shift.start_at).getTime()) / (1000 * 60 * 60)
    const breakHours = (shift.break_minutes || 0) / 60
    const netHours = duration - breakHours
    
    plannedHours += netHours
    // For now, actual = planned (will integrate timeclock later)
    actualHours += netHours
  })

  const variance = actualHours - plannedHours
  const overtimeHours = Math.max(0, actualHours - 160) // Assuming 160h/month standard

  // Fetch leave requests
  const { data: leaveRequests } = await supabase
    .from('leave_requests')
    .select('*, leave_types(*)')
    .eq('user_id', userId)
    .gte('start_at', startDate.toISOString())
    .lte('end_at', endDate.toISOString())

  const leaveDays = leaveRequests?.length || 0
  const approvedLeave = leaveRequests?.filter((l: any) => l.status === 'approved').length || 0
  const pendingLeave = leaveRequests?.filter((l: any) => l.status === 'pending').length || 0

  // Fetch upcoming shifts
  const { data: upcomingShifts } = await supabase
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
        status
      )
    `)
    .eq('shift_assignments.user_id', userId)
    .gte('start_at', today.toISOString())
    .lte('start_at', next7Days.toISOString())
    .order('start_at', { ascending: true })

  // Fetch compliance violations
  const { data: violations } = await supabase
    .from('compliance_violations')
    .select('*, compliance_rules(*)')
    .eq('user_id', userId)
    .gte('violation_date', startDate.toISOString())
    .lte('violation_date', endDate.toISOString())
    .eq('is_silenced', false)

  return NextResponse.json({
    monthlyStats: {
      plannedHours: Math.round(plannedHours * 10) / 10,
      actualHours: Math.round(actualHours * 10) / 10,
      variance: Math.round(variance * 10) / 10,
      overtimeHours: Math.round(overtimeHours * 10) / 10,
      shiftsCount,
      leaveDays,
      approvedLeave,
      pendingLeave
    },
    upcomingShifts: upcomingShifts?.map((s: any) => ({
      id: s.id,
      startAt: s.start_at,
      endAt: s.end_at,
      breakMinutes: s.break_minutes,
      locationName: s.locations?.name,
      status: s.shift_assignments[0]?.status
    })) || [],
    complianceAlerts: violations?.map((v: any) => ({
      id: v.id,
      ruleKey: v.compliance_rules?.rule_key,
      ruleName: v.compliance_rules?.display_name,
      severity: v.severity,
      violationDate: v.violation_date,
      details: v.details
    })) || []
  })
}
