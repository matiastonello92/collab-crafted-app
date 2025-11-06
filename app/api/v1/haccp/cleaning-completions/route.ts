import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerActionClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerActionClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('location_id');
    const status = searchParams.get('status');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!locationId) {
      return NextResponse.json({ error: 'location_id is required' }, { status: 400 });
    }

    // Permission check
    const { data: hasPermission } = await supabase.rpc('user_has_permission', {
      p_user: user.id,
      p_permission: 'haccp:view'
    });

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let query = supabase
      .from('haccp_cleaning_completions')
      .select(`
        *,
        area:haccp_cleaning_areas(id, name, zone_code, checklist_items)
      `)
      .eq('location_id', locationId)
      .order('scheduled_for', { ascending: false });

    if (status) {
      const statuses = status.split(',').map(s => s.trim());
      query = query.in('status', statuses);
    }

    if (from) {
      query = query.gte('scheduled_for', from);
    }

    if (to) {
      query = query.lte('scheduled_for', to);
    }

    const { data: completions, error } = await query;

    if (error) {
      console.error('Error fetching cleaning completions:', error);
      return NextResponse.json({ error: 'Failed to fetch completions' }, { status: 500 });
    }

    return NextResponse.json({ completions });
  } catch (error) {
    console.error('Error in GET completions:', error);
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
    const { area_id, org_id, location_id, scheduled_for } = body;

    if (!area_id || !org_id || !location_id || !scheduled_for) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Permission check
    const { data: hasPermission } = await supabase.rpc('user_has_permission', {
      p_user: user.id,
      p_permission: 'haccp:check'
    });

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: completion, error } = await supabase
      .from('haccp_cleaning_completions')
      .insert({
        area_id,
        org_id,
        location_id,
        scheduled_for,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating completion:', error);
      return NextResponse.json({ error: 'Failed to create completion' }, { status: 500 });
    }

    return NextResponse.json(completion, { status: 201 });
  } catch (error) {
    console.error('Error in POST completion:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
