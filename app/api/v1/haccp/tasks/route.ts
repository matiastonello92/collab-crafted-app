import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerActionClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerActionClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    const { data: hasPermission } = await supabase.rpc('user_has_permission', {
      p_user: user.id,
      p_permission: 'haccp:view'
    });

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const locationId = searchParams.get('location_id');
    const status = searchParams.get('status');
    const area = searchParams.get('area');
    const taskType = searchParams.get('task_type');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = (page - 1) * limit;

    // Build query with RLS enforcement
    let query = supabase
      .from('haccp_tasks')
      .select('*, equipment:haccp_equipment(name, equipment_type), assigned:profiles!assigned_to(full_name)', { count: 'exact' })
      .order('due_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (locationId) query = query.eq('location_id', locationId);
    if (status) query = query.eq('status', status);
    if (area) query = query.eq('area', area);
    if (taskType) query = query.eq('task_type', taskType);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching tasks:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      tasks: data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
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
      due_at,
      execution_window_minutes,
      priority,
      assigned_to,
      equipment_id,
      area,
      template_id
    } = body;

    // Validate required fields
    if (!org_id || !location_id || !name || !task_type || !due_at || !checklist_items) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('haccp_tasks')
      .insert({
        org_id,
        location_id,
        name,
        description,
        task_type,
        checklist_items,
        due_at,
        execution_window_minutes,
        priority: priority || 'medium',
        assigned_to,
        equipment_id,
        area,
        template_id,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating task:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ task: data }, { status: 201 });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
