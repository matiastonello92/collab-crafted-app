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
      .from('shifts')
      .select(`
        id,
        start_at,
        end_at,
        location:locations (
          id,
          name
        ),
        assignments:shift_assignments!inner (
          role_name
        )
      `)
      .eq('assignments.user_id', user.id)
      .gte('start_at', new Date().toISOString())
      .order('start_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching shifts:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formattedShifts = shifts?.map(shift => ({
      id: shift.id,
      start_at: shift.start_at,
      end_at: shift.end_at,
      location_name: (shift.location as any)?.name,
      location_id: (shift.location as any)?.id,
      role_name: shift.assignments?.[0]?.role_name,
    })) || [];

    return NextResponse.json({ shifts: formattedShifts });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
