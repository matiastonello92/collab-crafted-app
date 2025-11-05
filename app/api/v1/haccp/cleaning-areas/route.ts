import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerActionClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerActionClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get location_id from query params
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('location_id');

    if (!locationId) {
      return NextResponse.json({ error: 'location_id is required' }, { status: 400 });
    }

    // Permission check
    const { data: hasPermission } = await supabase.rpc('user_has_permission', {
      p_user: user.id,
      p_permission: 'haccp:view'
    });

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden: haccp:view permission required' }, { status: 403 });
    }

    // Fetch cleaning areas
    const { data: areas, error } = await supabase
      .from('haccp_cleaning_areas')
      .select('*')
      .eq('location_id', locationId)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching cleaning areas:', error);
      return NextResponse.json({ error: 'Failed to fetch cleaning areas' }, { status: 500 });
    }

    return NextResponse.json(areas);
  } catch (error) {
    console.error('Unexpected error in GET /api/v1/haccp/cleaning-areas:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerActionClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { org_id, location_id, name, description, zone_code, cleaning_frequency, frequency_times, checklist_items, assigned_role } = body;

    // Validation
    if (!org_id || !location_id || !name || !cleaning_frequency) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['daily', 'weekly', 'monthly'].includes(cleaning_frequency)) {
      return NextResponse.json({ error: 'Invalid cleaning_frequency' }, { status: 400 });
    }

    // Permission check
    const { data: hasPermission } = await supabase.rpc('user_has_permission', {
      p_user: user.id,
      p_permission: 'haccp:manage'
    });

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden: haccp:manage permission required' }, { status: 403 });
    }

    // Insert cleaning area
    const { data: area, error } = await supabase
      .from('haccp_cleaning_areas')
      .insert({
        org_id,
        location_id,
        name,
        description: description || null,
        zone_code: zone_code || null,
        cleaning_frequency,
        frequency_times: frequency_times || [],
        checklist_items: checklist_items || [],
        assigned_role: assigned_role || null,
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating cleaning area:', error);
      return NextResponse.json({ error: 'Failed to create cleaning area', details: error.message }, { status: 500 });
    }

    return NextResponse.json(area, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/v1/haccp/cleaning-areas:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
