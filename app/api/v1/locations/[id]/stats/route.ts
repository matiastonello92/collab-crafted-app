import { createSupabaseServerClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerClient();
    const locationId = params.id;

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to this location
    const { data: hasAccess } = await supabase
      .from('user_roles_locations')
      .select('id')
      .eq('user_id', user.id)
      .eq('location_id', locationId)
      .eq('is_active', true)
      .single();

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get active users count
    const { count: activeUsers } = await supabase
      .from('user_roles_locations')
      .select('*', { count: 'exact', head: true })
      .eq('location_id', locationId)
      .eq('is_active', true);

    // Get shifts this week
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const { count: shiftsThisWeek } = await supabase
      .from('shifts')
      .select('*', { count: 'exact', head: true })
      .eq('location_id', locationId)
      .gte('start_at', weekStart.toISOString())
      .lt('start_at', weekEnd.toISOString());

    // Get pending inventories
    const { count: inventoriesOpen } = await supabase
      .from('inventory_headers')
      .select('*', { count: 'exact', head: true })
      .eq('location_id', locationId)
      .in('status', ['in_progress', 'completed']);

    return NextResponse.json({
      activeUsers: activeUsers || 0,
      shiftsThisWeek: shiftsThisWeek || 0,
      inventoriesOpen: inventoriesOpen || 0,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
