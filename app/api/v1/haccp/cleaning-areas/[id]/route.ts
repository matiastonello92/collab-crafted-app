import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerActionClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createSupabaseServerActionClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Permission check
    const { data: hasPermission } = await supabase.rpc('user_has_permission', {
      p_user: user.id,
      p_permission: 'haccp:view'
    });

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: area, error } = await supabase
      .from('haccp_cleaning_areas')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Area not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch area' }, { status: 500 });
    }

    return NextResponse.json(area);
  } catch (error) {
    console.error('Error in GET cleaning area:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createSupabaseServerActionClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { name, description, zone_code, cleaning_frequency, frequency_times, checklist_items, assigned_role, is_active } = body;

    // Permission check
    const { data: hasPermission } = await supabase.rpc('user_has_permission', {
      p_user: user.id,
      p_permission: 'haccp:manage'
    });

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updateData: any = { updated_by: user.id };
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (zone_code !== undefined) updateData.zone_code = zone_code;
    if (cleaning_frequency !== undefined) updateData.cleaning_frequency = cleaning_frequency;
    if (frequency_times !== undefined) updateData.frequency_times = frequency_times;
    if (checklist_items !== undefined) updateData.checklist_items = checklist_items;
    if (assigned_role !== undefined) updateData.assigned_role = assigned_role;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: area, error } = await supabase
      .from('haccp_cleaning_areas')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating cleaning area:', error);
      return NextResponse.json({ error: 'Failed to update area' }, { status: 500 });
    }

    return NextResponse.json(area);
  } catch (error) {
    console.error('Error in PUT cleaning area:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createSupabaseServerActionClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Permission check
    const { data: hasPermission } = await supabase.rpc('user_has_permission', {
      p_user: user.id,
      p_permission: 'haccp:manage'
    });

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Soft delete
    const { error } = await supabase
      .from('haccp_cleaning_areas')
      .update({ is_active: false, updated_by: user.id })
      .eq('id', id);

    if (error) {
      console.error('Error deleting cleaning area:', error);
      return NextResponse.json({ error: 'Failed to delete area' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE cleaning area:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
