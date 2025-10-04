import { createSupabaseServerClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has approval permissions
    const { data: permissions } = await supabase.rpc('user_has_permission', {
      p_user: user.id,
      p_permission: 'shifts:approve'
    });

    if (!permissions) {
      return NextResponse.json({ requests: [] });
    }

    // Get user's locations
    const { data: userLocations } = await supabase
      .from('user_roles_locations')
      .select('location_id')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (!userLocations || userLocations.length === 0) {
      return NextResponse.json({ requests: [] });
    }

    const locationIds = userLocations.map(ul => ul.location_id);

    // Get pending leave requests for those locations
    const { data: requests, error } = await supabase
      .from('leave_requests')
      .select(`
        id,
        start_at,
        end_at,
        reason,
        created_at,
        user:profiles!leave_requests_user_id_fkey (
          id,
          full_name
        ),
        type:leave_types (
          label,
          color
        )
      `)
      .eq('status', 'pending')
      .in('location_id', locationIds)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching pending requests:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ requests: requests || [] });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
