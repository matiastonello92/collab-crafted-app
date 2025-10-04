import { createSupabaseServerClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '5');

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: shifts, error } = await supabase
      .from('shift_assignments')
      .select(`
        *,
        shift:shifts (
          id,
          start_at,
          end_at,
          location:locations (
            id,
            name
          )
        )
      `)
      .eq('user_id', user.id)
      .gte('shift.start_at', new Date().toISOString())
      .order('shift.start_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching shifts:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formattedShifts = shifts?.map(assignment => ({
      id: assignment.shift.id,
      start_at: assignment.shift.start_at,
      end_at: assignment.shift.end_at,
      location_name: assignment.shift.location?.name,
      location_id: assignment.shift.location?.id,
      role_name: assignment.role_name,
    })) || [];

    return NextResponse.json({ shifts: formattedShifts });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
