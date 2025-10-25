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
    const equipmentId = searchParams.get('equipment_id');
    const outOfRange = searchParams.get('out_of_range');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    let query = supabase
      .from('haccp_temperature_logs')
      .select('*, equipment:haccp_equipment(name, type), recorded_by_user:profiles!recorded_by(full_name)')
      .order('recorded_at', { ascending: false })
      .limit(limit);

    if (locationId) query = query.eq('location_id', locationId);
    if (equipmentId) query = query.eq('equipment_id', equipmentId);
    if (outOfRange === 'true') query = query.eq('is_within_range', false);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching temperature logs:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ logs: data });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerActionClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: hasPermission } = await supabase.rpc('user_has_permission', {
      p_user: user.id,
      p_permission: 'haccp:check'
    });

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      org_id,
      location_id,
      equipment_id,
      task_id,
      temperature,
      unit,
      notes
    } = body;

    if (!org_id || !location_id || !equipment_id || temperature === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get equipment thresholds
    const { data: equipment } = await supabase
      .from('haccp_equipment')
      .select('min_temp, max_temp')
      .eq('id', equipment_id)
      .single();

    let isWithinRange = true;
    if (equipment && equipment.min_temp !== null && temperature < equipment.min_temp) {
      isWithinRange = false;
    }
    if (equipment && equipment.max_temp !== null && temperature > equipment.max_temp) {
      isWithinRange = false;
    }

    const { data, error } = await supabase
      .from('haccp_temperature_logs')
      .insert({
        org_id,
        location_id,
        equipment_id,
        task_id,
        temperature,
        unit: unit || 'celsius',
        is_within_range: isWithinRange,
        min_threshold: equipment?.min_temp,
        max_threshold: equipment?.max_temp,
        notes,
        recorded_by: user.id,
        recorded_at: new Date().toISOString(),
        source: 'manual'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating temperature log:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ log: data }, { status: 201 });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
