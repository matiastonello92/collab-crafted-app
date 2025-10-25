import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerActionClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerActionClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: hasPermission } = await supabase.rpc('user_has_permission', {
      p_user: user.id,
      p_permission: 'haccp:view'
    });

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const locationId = searchParams.get('location_id');

    if (!locationId) {
      return NextResponse.json({ error: 'location_id required' }, { status: 400 });
    }

    // Get tasks summary
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [tasksDueToday, tasksOverdue, tasksCompleted, tasksPending, temperatureAlerts] = await Promise.all([
      supabase
        .from('haccp_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('location_id', locationId)
        .gte('due_at', today.toISOString())
        .lt('due_at', tomorrow.toISOString())
        .eq('status', 'pending'),

      supabase
        .from('haccp_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('location_id', locationId)
        .eq('status', 'pending')
        .lt('due_at', today.toISOString()),

      supabase
        .from('haccp_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('location_id', locationId)
        .eq('status', 'completed')
        .gte('completed_at', today.toISOString()),

      supabase
        .from('haccp_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('location_id', locationId)
        .eq('status', 'pending'),

      supabase
        .from('haccp_temperature_logs')
        .select('*, equipment:haccp_equipment(name)')
        .eq('location_id', locationId)
        .eq('is_within_range', false)
        .order('recorded_at', { ascending: false })
        .limit(5)
    ]);

    // Calculate compliance rate
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [totalTasksLast7Days, completedTasksLast7Days] = await Promise.all([
      supabase
        .from('haccp_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('location_id', locationId)
        .gte('due_at', sevenDaysAgo.toISOString()),

      supabase
        .from('haccp_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('location_id', locationId)
        .eq('status', 'completed')
        .gte('due_at', sevenDaysAgo.toISOString())
    ]);

    const complianceRate = totalTasksLast7Days.count
      ? Math.round((completedTasksLast7Days.count! / totalTasksLast7Days.count!) * 100)
      : 0;

    return NextResponse.json({
      stats: {
        tasksDueToday: tasksDueToday.count || 0,
        tasksOverdue: tasksOverdue.count || 0,
        tasksCompleted: tasksCompleted.count || 0,
        tasksPending: tasksPending.count || 0,
        complianceRate
      },
      temperatureAlerts: temperatureAlerts.data || []
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
