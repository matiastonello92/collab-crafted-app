import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerActionClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createSupabaseServerActionClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { item_id, action } = body;

    // Get completion to check org_id and location_id
    const { data: completion, error: completionError } = await supabase
      .from('haccp_cleaning_completions')
      .select('org_id, location_id, status')
      .eq('id', id)
      .single();

    if (completionError || !completion) {
      return NextResponse.json({ error: 'Completion not found' }, { status: 404 });
    }

    if (completion.status === 'completed') {
      return NextResponse.json({ error: 'Cannot modify completed task' }, { status: 400 });
    }

    // Permission check
    const { data: hasPermission } = await supabase.rpc('user_has_permission', {
      p_user: user.id,
      p_permission: 'haccp:check'
    });

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (action === 'toggle') {
      // Check if item is already completed by this user
      const { data: existing } = await supabase
        .from('haccp_cleaning_item_completions')
        .select('id')
        .eq('completion_id', id)
        .eq('item_id', item_id)
        .eq('completed_by', user.id)
        .maybeSingle();

      if (existing) {
        // Remove completion
        const { error: deleteError } = await supabase
          .from('haccp_cleaning_item_completions')
          .delete()
          .eq('id', existing.id);

        if (deleteError) throw deleteError;
      } else {
        // Add completion
        const { error: insertError } = await supabase
          .from('haccp_cleaning_item_completions')
          .insert({
            completion_id: id,
            item_id,
            completed_by: user.id,
            org_id: completion.org_id,
            location_id: completion.location_id,
          });

        if (insertError) throw insertError;
      }
    }

    // Fetch updated item completions
    const { data: itemCompletions, error: fetchError } = await supabase
      .from('haccp_cleaning_item_completions')
      .select(`
        id,
        item_id,
        completed_by,
        completed_at,
        profiles:completed_by (
          full_name,
          email
        )
      `)
      .eq('completion_id', id);

    if (fetchError) throw fetchError;

    return NextResponse.json({ item_completions: itemCompletions || [] });
  } catch (error) {
    console.error('Error in POST items:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    const { data: itemCompletions, error } = await supabase
      .from('haccp_cleaning_item_completions')
      .select(`
        id,
        item_id,
        completed_by,
        completed_at,
        profiles:completed_by (
          full_name,
          email
        )
      `)
      .eq('completion_id', id);

    if (error) throw error;

    return NextResponse.json({ item_completions: itemCompletions || [] });
  } catch (error) {
    console.error('Error in GET items:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
