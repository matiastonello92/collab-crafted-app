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
    const active = searchParams.get('active');

    let query = supabase
      .from('haccp_templates')
      .select('*, equipment:haccp_equipment(name, type)')
      .order('name', { ascending: true });

    if (locationId) {
      query = query.or(`location_id.eq.${locationId},location_id.is.null`);
    }
    if (active !== null) {
      query = query.eq('active', active === 'true');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching templates:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ templates: data });
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
      p_permission: 'haccp:manage'
    });

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      org_id,
      location_id,
      name,
      description,
      task_type,
      checklist_items,
      recurrence_type,
      recurrence_interval,
      execution_window_minutes,
      priority,
      requires_signature,
      requires_photo,
      equipment_id,
      area,
      assigned_role,
      active
    } = body;

    if (!org_id || !name || !task_type || !checklist_items) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('haccp_templates')
      .insert({
        org_id,
        location_id,
        name,
        description,
        task_type,
        checklist_items,
        recurrence_type,
        recurrence_interval: recurrence_interval || 1,
        execution_window_minutes,
        priority: priority || 'medium',
        requires_signature: requires_signature || false,
        requires_photo: requires_photo || false,
        equipment_id,
        area,
        assigned_role,
        active: active !== false,
        created_by: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating template:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ template: data }, { status: 201 });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
